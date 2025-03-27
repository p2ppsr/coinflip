import { toByteString, int2ByteString, hash256, PubKey, Sig, bsv } from 'scrypt-ts'
import { Coinflip, CoinflipArtifact } from '@bsv/backend'
import constants from '../utils/constants'
import { sleep, verifyTruthy } from '../utils/utils'
import { AtomicBEEF, Transaction, Utils } from '@bsv/sdk'
Coinflip.loadArtifact(CoinflipArtifact)

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
  const { publicKey: aliceHex } = await constants.walletClient.getPublicKey({
    protocolID: [0, 'coinflip'],
    keyID: '1',
    counterparty: bob,
    forSelf: true
  })

  const { publicKey: bobHex } = await constants.walletClient.getPublicKey({
    protocolID: [0, 'coinflip'],
    keyID: '1',
    counterparty: bob
  })

  const alice = PubKey(bsv.PublicKey.fromString(aliceHex).toByteString())
  const bobPK = PubKey(bsv.PublicKey.fromString(bobHex).toByteString())
  const timeout = BigInt(Math.round(Date.now() / 1000) + 300) // 5-minute timeout
  const coinflipInstance = new Coinflip(alice, bobPK, aliceHash, timeout, 0n, -1n)
  const offerScript = coinflipInstance.lockingScript.toHex()

  const { tx: offerTX, txid: offerTXID } = await constants.walletClient.createAction({
    description: 'Flip a coin',
    outputs: [
      {
        lockingScript: offerScript,
        satoshis: amount,
        basket: 'coinflip',
        outputDescription: 'Coin flip token'
      }
    ],
    options: {
      acceptDelayedBroadcast: true,
      randomizeOutputs: false
    }
  })

  await constants.messageBoxClient.sendMessage({
    recipient: bob,
    messageBox: 'coinflip_inbox',
    body: { choice, offerTX: Utils.toBase64(offerTX!) }
  })
  let rejectionReason: 'rejected' | 'expired' = 'expired'

  // Wait for Bob to accept
  for (let i = 0; i < 180; i++) {
    console.log('Waiting for Bob to accept...')
    await sleep(1000)
    const messages = await constants.messageBoxClient.listMessages({
      messageBox: 'coinflip_responses'
    })
    const bobsMessages = messages.filter(x => {
      try {
        const body = JSON.parse(x.body)
        return x.sender === bob && body.offerTXID === offerTXID
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
      const acceptTX: AtomicBEEF = Utils.toArray(bobResponse.acceptTX, 'base64')
      const parsedAcceptTX = new bsv.Transaction(
        Transaction.fromAtomicBEEF(acceptTX).toHex()
      )
      const acceptScript = parsedAcceptTX.outputs[0].script
      // Assuming the acceptance is in the first output
      const revelationInstance: Coinflip = Coinflip.fromLockingScript(
        acceptScript.toHex()
      ) as Coinflip
      let outcome: 'you-win' | 'they-win'
      if (revelationInstance.bobNumber === aliceRandomValueZeroOrOne) {
        outcome = 'you-win'
        // Alice wins, takes the coins
        const winScript = await revelationInstance.getUnlockingScript(
          async (self: Coinflip) => {
            const bsvtx = new bsv.Transaction()
            bsvtx.from({
              txId: parsedAcceptTX.id,
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
            const { signature: SDKSignature } = await constants.walletClient.createSignature({
              protocolID: [0, 'coinflip'],
              keyID: '1',
              counterparty: bob,
              data: Array.from(hashbuf)
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
        await constants.walletClient.createAction({
          inputBEEF: Utils.toArray(acceptTX, 'base64'),
          inputs: [{
            outpoint: `${parsedAcceptTX.id}.0`,
            unlockingScript: winScript.toHex(),
            inputDescription: 'Claim coin flip winnings'
          }],
          description: 'You win a coin flip',
          options: {
            acceptDelayedBroadcast: true
          }
        })
      } else {
        outcome = 'they-win'
      }
      // Alice sends message to Bob
      await constants.messageBoxClient.sendMessage({
        recipient: bob,
        messageBox: 'coinflip_winnings',
        body: {
          offerTXID: offerTXID,
          nonce: aliceNonce,
          number: aliceRandomValueZeroOrOne
        }
      })
      console.log('Alice sent revelation back to Bob')
      return outcome
    } else {
      rejectionReason = 'rejected'
    }
    await constants.messageBoxClient.acknowledgeMessage({
      messageIds: [String(bobsMessages[0].messageId)]
    })
    if (rejectionReason === 'rejected') {
      break
    }
  }

  console.log(`Bob fell through: ${rejectionReason}`)

  // At this point we have either timed out or Bob has rejected
  // Either way, we need to cancel the contract.
  const unlockingScript = await coinflipInstance.getUnlockingScript(
    async (self: Coinflip) => {
      const bsvtx = new bsv.Transaction()
      bsvtx.from({
        txId: offerTXID!,
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
      const { signature: SDKSignature } = await constants.walletClient.createSignature({
        protocolID: [0, 'coinflip'],
        keyID: '1',
        counterparty: bob,
        data: Array.from(hashbuf)
      })
      const signature = bsv.crypto.Signature.fromString(Buffer.from(SDKSignature).toString('hex'))
      signature.nhashtype = hashType

      self.to = { tx: bsvtx, inputIndex: 0 }
      self.cancelOffer(Sig(toByteString(signature.toTxFormat().toString('hex'))))
    }
  )
  await constants.walletClient.createAction({
    inputBEEF: Utils.toArray(offerTX, 'base64'),
    inputs: [{
      outpoint: `${offerTXID}.0`,
      unlockingScript: unlockingScript.toHex(),
      inputDescription: 'Return canceled flip back to balance'
    }],
    description: `Cancel ${rejectionReason} coin flip`,
    options: {
      acceptDelayedBroadcast: true
    }
  })
  console.log('Recovered coins after rejection.')

  return rejectionReason
}
