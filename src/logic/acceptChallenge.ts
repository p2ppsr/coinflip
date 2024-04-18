import { createSignature, createAction } from '@babbage/sdk-ts'
import { toByteString, int2ByteString, hash256, Sig, bsv } from 'scrypt-ts'
import CoinflipContract from '../contracts/CoinflipContract.ts'
import coinflipContractJson from '../../artifacts/CoinflipContract.json'
import constants from '../utils/constants.ts'
import { sleep, verifyTruthy } from '../utils/utils.ts'
import IncomingChallenge from './IncomingChallenge.ts'
CoinflipContract.loadArtifact(coinflipContractJson)

export default async (
  challenge: IncomingChallenge
): Promise<'you-win' | 'they-win'> => {
  const parsedOfferTX = new bsv.Transaction(challenge.tx.rawTx)
  const offerScript = parsedOfferTX.outputs[0].script
  const coinflipInstance: CoinflipContract = CoinflipContract.fromLockingScript(
    offerScript.toHex()
  ) as CoinflipContract
  const coinflipMockInstance: CoinflipContract = CoinflipContract.fromLockingScript(
    offerScript.toHex()
  ) as CoinflipContract
  const bobRandomOneOrZero = BigInt(Math.round(Math.random()))
  coinflipMockInstance.transitionState(bobRandomOneOrZero)
  const nextOutputScript = coinflipMockInstance.lockingScript
  const unlockingScript = await coinflipInstance.getUnlockingScript(
    async (self: CoinflipContract) => {
      const bsvtx = new bsv.Transaction()
      bsvtx.from({
        txId: challenge.tx.txid,
        outputIndex: 0,
        script: offerScript.toHex(),
        satoshis: challenge.amount
      })
      bsvtx.addOutput(
        new bsv.Transaction.Output({
          script: nextOutputScript,
          satoshis: challenge.amount * 2
        })
      )
      const hashType =
                bsv.crypto.Signature.SIGHASH_SINGLE |
                bsv.crypto.Signature.SIGHASH_ANYONECANPAY |
                bsv.crypto.Signature.SIGHASH_FORKID
      const hashbuf = bsv.crypto.Hash.sha256(
        bsv.Transaction.Sighash.sighashPreimage(
          bsvtx,
          hashType,
          0,
          bsv.Script.fromBuffer(Buffer.from(offerScript.toHex(), 'hex')),
          new bsv.crypto.BN(challenge.amount)
        )
      )
      const SDKSignature = await createSignature({
        protocolID: [0, 'coinflip'],
        keyID: '1',
        counterparty: challenge.from,
        data: hashbuf
      })
      const signature = bsv.crypto.Signature.fromString(Buffer.from(SDKSignature).toString('hex'))
      signature.nhashtype = hashType
      self.to = { tx: bsvtx, inputIndex: 0 }
      self.from = { tx: parsedOfferTX, outputIndex: 0 }
      console.log('before accept')
      self.acceptOffer(
        Sig(toByteString(signature.toTxFormat().toString('hex'))),
        bobRandomOneOrZero
      )
      console.log('after accept')
    }
  )
  console.log('unlocking script', unlockingScript)
  // Create the action
  const acceptTX = await createAction({
    inputs: {
      [challenge.tx.txid]: {
        ...verifyTruthy(challenge.tx),
        outputsToRedeem: [
          {
            index: 0,
            unlockingScript: unlockingScript.toHex()
          }
        ]
      }
    },
    outputs: [
      {
        script: nextOutputScript.toHex(),
        satoshis: challenge.amount * 2,
        basket: 'coinflip'
      }
    ],
    description: 'Accept a coin flip bet',
    acceptDelayedBroadcast: false
  })
  console.log(acceptTX)

  // Send the message
  await constants.tokenator.acknowledgeMessage({
    messageIds: [challenge.id]
  })
  await constants.tokenator.sendMessage({
    recipient: challenge.from,
    messageBox: 'coinflip_responses',
    body: {
      action: 'accept',
      acceptTX,
      offerTXID: challenge.tx.txid
    }
  })

  // Wait for Alice to respond
  while (true) {
    console.log('Waiting for Alice...')
    await sleep(1000)
    const time = Math.round(Date.now() / 1000)
    if (time > challenge.expires + 3) break
    const messages = await constants.tokenator.listMessages({
      messageBox: 'coinflip_winnings'
    })
    const aliceMessages = messages.filter(x => {
      try {
        const body = JSON.parse(x.body)
        return x.sender === challenge.from && body.offerTXID === challenge.tx.txid
      } catch (e) {
        return false
      }
    })
    if (aliceMessages.length < 1) continue
    await constants.tokenator.acknowledgeMessage({
      messageIds: [aliceMessages[0].messageId]
    })
    const aliceMessage = JSON.parse(aliceMessages[0].body)
    console.log('Got back from Alice!', aliceMessage)
    const revelationInstance: CoinflipContract = CoinflipContract.fromLockingScript(
      nextOutputScript.toHex()
    ) as CoinflipContract
    const hashForVerification = hash256(
      toByteString(aliceMessage.nonce) + int2ByteString(aliceMessage.number, 1n)
    )
    // Alice's number and nonce need to be verified before we know the result is authentic
    if (hashForVerification !== revelationInstance.aliceHash) {
      continue
    }
    if (bobRandomOneOrZero === aliceMessage.number) {
      return 'they-win'
    }

    // Bob can claim his winnings
    const winScript = await revelationInstance.getUnlockingScript(
      async (self: CoinflipContract) => {
        const bsvtx = new bsv.Transaction()
        bsvtx.from({
          txId: acceptTX.txid,
          outputIndex: 0,
          script: nextOutputScript.toHex(),
          satoshis: challenge.amount * 2
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
            bsv.Script.fromBuffer(Buffer.from(nextOutputScript.toHex(), 'hex')),
            new bsv.crypto.BN(challenge.amount * 2)
          )
        )
        const SDKSignature = await createSignature({
          protocolID: [0, 'coinflip'],
          keyID: '1',
          counterparty: challenge.from,
          data: hashbuf
        })
        const signature = bsv.crypto.Signature.fromString(Buffer.from(SDKSignature).toString('hex'))
        signature.nhashtype = hashType

        self.to = { tx: bsvtx, inputIndex: 0 }
        self.aliceRevealsWinner(
          Sig(toByteString(signature.toTxFormat().toString('hex'))),
          toByteString(aliceMessage.nonce),
          BigInt(aliceMessage.number)
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
    return 'you-win'
  }

  // If there is no response, claim the winnings
  console.log('Alice did not respond, Bob is claiming the winnings.')
  const reclaimInstance: CoinflipContract = CoinflipContract.fromLockingScript(
    nextOutputScript.toHex()
  ) as CoinflipContract
  const reclaimScript = await reclaimInstance.getUnlockingScript(async (self: CoinflipContract) => {
    const bsvtx = new bsv.Transaction()
    bsvtx.from({
      txId: acceptTX.txid,
      outputIndex: 0,
      script: nextOutputScript.toHex(),
      satoshis: challenge.amount * 2
    })
    bsvtx.inputs[0].sequenceNumber = 0xfffffffe
    bsvtx.nLockTime = challenge.expires + 5
    const hashType =
            bsv.crypto.Signature.SIGHASH_NONE |
            bsv.crypto.Signature.SIGHASH_ANYONECANPAY |
            bsv.crypto.Signature.SIGHASH_FORKID
    const hashbuf = bsv.crypto.Hash.sha256(
      bsv.Transaction.Sighash.sighashPreimage(
        bsvtx,
        hashType,
        0,
        bsv.Script.fromBuffer(Buffer.from(nextOutputScript.toHex(), 'hex')),
        new bsv.crypto.BN(challenge.amount * 2)
      )
    )
    const SDKSignature = await createSignature({
      protocolID: [0, 'coinflip'],
      keyID: '1',
      counterparty: challenge.from,
      data: hashbuf
    })
    const signature = bsv.crypto.Signature.fromString(Buffer.from(SDKSignature).toString('hex'))
    signature.nhashtype = hashType

    self.to = { tx: bsvtx, inputIndex: 0 }
    self.bobWinsAutomaticallyAfterDelay(Sig(toByteString(signature.toTxFormat().toString('hex'))))
  })
  await createAction({
    inputs: {
      [acceptTX.txid]: {
        ...verifyTruthy(acceptTX),
        outputsToRedeem: [
          {
            index: 0,
            unlockingScript: reclaimScript.toHex(),
            sequenceNumber: 0xfffffffe
          }
        ]
      }
    },
    lockTime: challenge.expires + 5,
    description: 'You win a coin flip',
    acceptDelayedBroadcast: false
  })
  console.log('Recovered coins after non-responsive opponent.')
  return 'you-win'
}
