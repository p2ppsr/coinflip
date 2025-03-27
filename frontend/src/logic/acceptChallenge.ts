import { toByteString, int2ByteString, hash256, Sig, bsv } from 'scrypt-ts'
import { Coinflip, CoinflipArtifact } from '@bsv/backend'
import constants from '../utils/constants'
import { sleep, verifyTruthy } from '../utils/utils'
import IncomingChallenge from './IncomingChallenge'
import { Transaction, Utils } from '@bsv/sdk'
Coinflip.loadArtifact(CoinflipArtifact)

export default async (
  challenge: IncomingChallenge
): Promise<'you-win' | 'they-win'> => {
  const parsedOfferTX = Transaction.fromAtomicBEEF(Utils.toArray(challenge.tx, 'base64'))
  const offerScript = parsedOfferTX.outputs[0].lockingScript
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
        txId: Transaction.fromAtomicBEEF(Utils.toArray(challenge.tx, 'base64')).id('hex'),
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
      const { signature: SDKSignature } = await constants.walletClient.createSignature({
        protocolID: [0, 'coinflip'],
        keyID: '1',
        counterparty: challenge.from,
        data: Array.from(hashbuf)
      })
      const signature = bsv.crypto.Signature.fromString(Buffer.from(SDKSignature).toString('hex'))
      signature.nhashtype = hashType
      self.to = { tx: bsvtx, inputIndex: 0 }
      self.from = { tx: new bsv.Transaction(parsedOfferTX.toHex()), outputIndex: 0 }
      self.acceptOffer(
        Sig(toByteString(signature.toTxFormat().toString('hex'))),
        bobRandomOneOrZero
      )
    }
  )
  console.log('unlocking script', unlockingScript)
  // Create the action
  const { tx: acceptTX, txid: acceptTXID } = await constants.walletClient.createAction({
    inputBEEF: Utils.toArray(challenge.tx, 'base64'),
    inputs: [{
      outpoint: `${parsedOfferTX.id('hex')}.0`,
      unlockingScript: unlockingScript.toHex(),
      inputDescription: 'Accept an affer'
    }],
    outputs: [
      {
        lockingScript: nextOutputScript.toHex(),
        satoshis: challenge.amount * 2,
        basket: 'coinflip',
        outputDescription: 'Active coin flip offer token'
      }
    ],
    description: 'Accept a coin flip bet',
    options: {
      acceptDelayedBroadcast: true,
      randomizeOutputs: false
    }
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
      acceptTX: Utils.toBase64(acceptTX!),
      offerTXID: parsedOfferTX.id('hex')
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
        return x.sender === challenge.from && body.offerTXID === parsedOfferTX.id('hex')
      } catch (e) {
        return false
      }
    })
    if (aliceMessages.length < 1) continue
    await constants.messageBoxClient.acknowledgeMessage({
      messageIds: [String(aliceMessages[0].messageId)]
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
          txId: acceptTXID!,
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
        const { signature: SDKSignature } = await constants.walletClient.createSignature({
          protocolID: [0, 'coinflip'],
          keyID: '1',
          counterparty: challenge.from,
          data: Array.from(hashbuf)
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
    await constants.walletClient.createAction({
      inputBEEF: Utils.toArray(acceptTX, 'base64'),
      inputs: [{
        outpoint: `${acceptTXID}.0`,
        unlockingScript: winScript.toHex(),
        inputDescription: 'Win a coin flip'
      }],
      description: 'You win a coin flip',
      options: {
        acceptDelayedBroadcast: true
      }
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
      txId: acceptTXID,
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
    const { signature: SDKSignature } = await constants.walletClient.createSignature({
      protocolID: [0, 'coinflip'],
      keyID: '1',
      counterparty: challenge.from,
      data: Array.from(hashbuf)
    })
    const signature = bsv.crypto.Signature.fromString(Buffer.from(SDKSignature).toString('hex'))
    signature.nhashtype = hashType

    self.to = { tx: bsvtx, inputIndex: 0 }
    self.bobWinsAutomaticallyAfterDelay(Sig(toByteString(signature.toTxFormat().toString('hex'))))
  })
  await constants.walletClient.createAction({
    inputBEEF: Utils.toArray(acceptTX, 'base64'),
    inputs: [{
      outpoint: `${acceptTXID}.0`,
      unlockingScript: reclaimScript.toHex(),
      inputDescription: 'Claiming an aborted coin flip',
      sequenceNumber: 0xfffffffe
    }],
    lockTime: challenge.expires + 5,
    description: 'You win a coin flip',
    options: {
      acceptDelayedBroadcast: true
    }
  })
  console.log('Recovered coins after non-responsive opponent.')
  return 'you-win'
}
