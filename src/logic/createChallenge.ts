import { CreateActionResult, getPublicKey, createSignature, createAction } from '@babbage/sdk-ts'
import { toByteString, int2ByteString, hash256, PubKey, Sig, bsv } from 'scrypt-ts'
import CoinflipContract from '../contracts/CoinflipContract.ts'
import coinflipContractJson from '../../artifacts/CoinflipContract.json'
import constants from '../utils/constants.ts'
import { sleep, verifyTruthy } from '../utils/utils.ts'
CoinflipContract.loadArtifact(coinflipContractJson)

export default async (
  bob: string, // the recipient of the challenge
  amount: number, // the amount, in satoshis to be put on the line, equally, by both parties
  choice: 'heads' | 'tails' // the choices
): Promise<'rejected' | 'expired' | 'you-win' | 'they-win'> => {
  const aliceNonce = toByteString(
    Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
      .map(i => ('0' + i.toString(16)).slice(-2))
      .join(''),
    false
  )
  const aliceRandomValueZeroOrOne = BigInt(Math.round(Math.random())) // alice generates a 0 or 1
  const aliceChoice = int2ByteString(aliceRandomValueZeroOrOne, 1n)
  const aliceHash = hash256(aliceNonce + aliceChoice)
  const aliceHex = await getPublicKey({
    protocolID: [0, 'coinflip'],
    keyID: '1',
    counterparty: bob,
    forSelf: true
  })

  const bobHex = await getPublicKey({
    protocolID: [0, 'coinflip'],
    keyID: '1',
    counterparty: bob
  })

  const alice = PubKey(bsv.PublicKey.fromString(aliceHex).toByteString())
  const bobPK = PubKey(bsv.PublicKey.fromString(bobHex).toByteString())
  const timeout = BigInt(Math.round(Date.now() / 1000) + 300) // 5-minute timeout
  const coinflipInstance = new CoinflipContract(alice, bobPK, aliceHash, timeout, 0n, -1n)
  const offerScript = coinflipInstance.lockingScript.toHex()

  const offerTX = await createAction({
    description: 'Flip a coin',
    outputs: [
      {
        script: offerScript,
        satoshis: amount,
        basket: 'coinflip'
      }
    ],
    acceptDelayedBroadcast: false
  })

  await constants.tokenator.sendMessage({
    recipient: bob,
    messageBox: 'coinflip_inbox',
    body: { choice, offerTX }
  })
  let rejectionReason: 'rejected' | 'expired' = 'expired'

  // Wait for Bob to accept
  for (let i = 0; i < 180; i++) {
    console.log('Waiting for Bob to accept...')
    await sleep(1000)
    const messages = await constants.tokenator.listMessages({
      messageBox: 'coinflip_responses'
    })
    const bobsMessages = messages.filter(x => {
      try {
        const body = JSON.parse(x.body)
        return x.sender === bob && body.offerTXID === offerTX.txid
      } catch (e) {
        return false
      }
    })
    if (bobsMessages.length < 1) continue
    // Assuming the first message
    const bobResponse = JSON.parse(bobsMessages[0].body)
    // If Bob accepts reveal the number else fall through to rejection
    if (bobResponse.action === 'accept') {
      console.log('Alice got acceptance back!', bobResponse)
      const acceptTX: CreateActionResult = bobResponse.acceptTX
      const parsedAcceptTX = new bsv.Transaction(acceptTX.rawTx)
      const acceptScript = parsedAcceptTX.outputs[0].script
      // Assuming the acceptance is in the first output
      const revelationInstance: CoinflipContract = CoinflipContract.fromLockingScript(
        acceptScript.toHex()
      ) as CoinflipContract
      let outcome: 'you-win' | 'they-win'
      if (revelationInstance.bobNumber === aliceRandomValueZeroOrOne) {
        outcome = 'you-win'
        // Alice wins, takes the coins
        const winScript = await revelationInstance.getUnlockingScript(
          async (self: CoinflipContract) => {
            const bsvtx = new bsv.Transaction()
            bsvtx.from({
              txId: acceptTX.txid,
              outputIndex: 0,
              script: acceptScript.toHex(),
              satoshis: amount * 2
            })
            const hashType =
                            bsv.crypto.Signature.SIGHASH_NONE |
                            bsv.crypto.Signature.SIGHASH_ANYONECANPAY |
                            bsv.crypto.Signature.SIGHASH_FORKID
            const hashbuf = bsv.crypto.Hash.sha256(
              bsv.Transaction.Sighash.sighashPreimage(
                bsvtx,
                hashType,
                0,
                bsv.Script.fromBuffer(Buffer.from(acceptScript.toHex(), 'hex')),
                new bsv.crypto.BN(amount * 2)
              )
            )
            const SDKSignature = await createSignature({
              protocolID: [0, 'coinflip'],
              keyID: '1',
              counterparty: bob,
              data: hashbuf
            })
            const signature = bsv.crypto.Signature.fromString(
              Buffer.from(SDKSignature).toString('hex')
            )
            signature.nhashtype = hashType

            self.to = { tx: bsvtx, inputIndex: 0 }
            self.aliceRevealsWinner(
              Sig(toByteString(signature.toTxFormat().toString('hex'))),
              aliceNonce,
              aliceRandomValueZeroOrOne
            )
          }
        )
        await createAction({
          inputs: {
            [acceptTX.txid]: {
              ...verifyTruthy(acceptTX),
              outputsToRedeem: [
                {
                  index: 0,
                  unlockingScript: winScript.toHex()
                }
              ]
            }
          },
          description: 'You win a coin flip',
          acceptDelayedBroadcast: false
        })
      } else {
        outcome = 'they-win'
      }
      // Alice sends message to Bob
      await constants.tokenator.sendMessage({
        recipient: bob,
        messageBox: 'coinflip_winnings',
        body: {
          offerTXID: offerTX.txid,
          nonce: aliceNonce,
          number: aliceRandomValueZeroOrOne
        }
      })
      console.log('Alice sent revelation back to Bob')
      return outcome
    } else {
      rejectionReason = 'rejected'
    }
    await constants.tokenator.acknowledgeMessage({
      messageIds: [bobsMessages[0].messageId]
    })
    if (rejectionReason === 'rejected') {
      break
    }
  }

  console.log(`Bob fell through: ${rejectionReason}`)

  // At this point we have either timed out or Bob has rejected
  // Either way, we need to cancel the contract.
  const unlockingScript = await coinflipInstance.getUnlockingScript(
    async (self: CoinflipContract) => {
      const bsvtx = new bsv.Transaction()
      bsvtx.from({
        txId: offerTX.txid,
        outputIndex: 0,
        script: offerScript,
        satoshis: amount
      })
      const hashType =
                bsv.crypto.Signature.SIGHASH_NONE |
                bsv.crypto.Signature.SIGHASH_ANYONECANPAY |
                bsv.crypto.Signature.SIGHASH_FORKID
      const hashbuf = bsv.crypto.Hash.sha256(
        bsv.Transaction.Sighash.sighashPreimage(
          bsvtx,
          hashType,
          0,
          bsv.Script.fromBuffer(Buffer.from(offerScript, 'hex')),
          new bsv.crypto.BN(parseInt(String(amount)))
        )
      )
      const SDKSignature = await createSignature({
        protocolID: [0, 'coinflip'],
        keyID: '1',
        counterparty: bob,
        data: hashbuf
      })
      const signature = bsv.crypto.Signature.fromString(Buffer.from(SDKSignature).toString('hex'))
      signature.nhashtype = hashType

      self.to = { tx: bsvtx, inputIndex: 0 }
      self.cancelOffer(Sig(toByteString(signature.toTxFormat().toString('hex'))))
    }
  )
  await createAction({
    inputs: {
      [offerTX.txid]: {
        ...verifyTruthy(offerTX),
        outputsToRedeem: [
          {
            index: 0,
            unlockingScript: unlockingScript.toHex()
          }
        ]
      }
    },
    description: `Cancel ${rejectionReason} coin flip`,
    acceptDelayedBroadcast: false
  })
  console.log('Recovered coins after rejection.')

  return rejectionReason
}
