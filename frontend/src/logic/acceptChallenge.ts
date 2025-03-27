import { toByteString, int2ByteString, hash256, Sig, bsv } from 'scrypt-ts'
import { Coinflip, CoinflipArtifact } from '@bsv/backend'
import constants from '../utils/constants'
import { sleep, verifyTruthy } from '../utils/utils'
import IncomingChallenge from './IncomingChallenge'
Coinflip.loadArtifact(CoinflipArtifact)

export default async (
  challenge: IncomingChallenge
): Promise<'you-win' | 'they-win'> => {
  const parsedOfferTX = new bsv.Transaction(challenge.tx.rawTx)
  const offerScript = parsedOfferTX.outputs[0].script
  const coinflipInstance: Coinflip = Coinflip.fromLockingScript(
    offerScript.toHex()
  ) as Coinflip
  const coinflipMockInstance: Coinflip = Coinflip.fromLockingScript(
    offerScript.toHex()
  ) as Coinflip
  const bobRandomOneOrZero = BigInt(Math.round(Math.random()))
  coinflipMockInstance.transitionState(bobRandomOneOrZero)
  const nextOutputScript = coinflipMockInstance.lockingScript
  const unlockingScript = await coinflipInstance.getUnlockingScript(
    async (self: Coinflip) => {
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
  await constants.messageBoxClient.acknowledgeMessage({
    messageIds: [challenge.id]
  })
  await constants.messageBoxClient.sendMessage({
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
    const messages = await constants.messageBoxClient.listMessages({
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
    await constants.messageBoxClient.acknowledgeMessage({
      messageIds: [aliceMessages[0].messageId]
    })
    const aliceMessage = JSON.parse(aliceMessages[0].body)
    console.log('Got back from Alice!', aliceMessage)
    const revelationInstance: Coinflip = Coinflip.fromLockingScript(
      nextOutputScript.toHex()
    ) as Coinflip
    const hashForVerification = hash256(
      toByteString(aliceMessage.nonce) + int2ByteString(aliceMessage.number, 1n)
    )
    // Alice's number and nonce need to be verified before we know the result is authentic
    if (hashForVerification !== revelationInstance.aliceHash) {
      continue
    }
    if (bobRandomOneOrZero === BigInt(aliceMessage.number)) {
      return 'they-win'
    }

    // Bob can claim his winnings
    const winScript = await revelationInstance.getUnlockingScript(
      async (self: Coinflip) => {
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
  const reclaimInstance: Coinflip = Coinflip.fromLockingScript(
    nextOutputScript.toHex()
  ) as Coinflip
  const reclaimScript = await reclaimInstance.getUnlockingScript(async (self: Coinflip) => {
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
