import { toByteString, int2ByteString, hash256, PubKey, Sig, bsv } from 'scrypt-ts'
import { Coinflip, CoinflipArtifact } from '@bsv/backend'
import constants from '../utils/constants'
import { sleep, verifyTruthy } from '../utils/utils'
import { AtomicBEEF, Transaction, Utils } from '@bsv/sdk'
import { toast } from 'react-toastify'
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

  try {
    await constants.messageBoxClient.sendLiveMessage({
      recipient: bob,
      messageBox: 'coinflip_inbox',
      body: { choice, offerTX: Utils.toBase64(offerTX!) }
    })
  } catch (e) {
    await constants.messageBoxClient.sendMessage({
      recipient: bob,
      messageBox: 'coinflip_inbox',
      body: { choice, offerTX: Utils.toBase64(offerTX!) }
    })
  }
  let rejectionReason: 'rejected' | 'expired' = 'expired'

  // Wait for Bob to accept
  constants.messageBoxClient.sendNotification(bob, JSON.stringify({url: window.location.href, body: "New Challenger!" }))
  // Live wait for Bob's response with backlog and timeout
  await constants.messageBoxClient.initializeConnection()
  const responsesRoom = 'coinflip_responses'
  const result = await new Promise<'rejected' | 'expired' | 'you-win' | 'they-win'>(async (resolve) => {
    let settled = false
    let pollId: any
    const settle = (v: 'rejected' | 'expired' | 'you-win' | 'they-win') => {
      if (settled) return
      settled = true
      if (pollId) clearInterval(pollId)
      resolve(v)
    }

    const processMessage = async (msg: any) => {
      try {
        const raw = (msg as any).body
        const body = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (msg.sender !== bob || body.offerTXID !== offerTXID) return
        await constants.messageBoxClient.acknowledgeMessage({ messageIds: [String(msg.messageId)] })
        if (body.action === 'accept') {
          console.log('Alice got acceptance back!', body)
          const acceptTX: AtomicBEEF = Utils.toArray(body.acceptTX, 'base64')
          const parsedAcceptTX = new bsv.Transaction(
            Transaction.fromAtomicBEEF(acceptTX).toHex()
          )
          const acceptScript = parsedAcceptTX.outputs[0].script
          const revelationInstance: Coinflip = Coinflip.fromLockingScript(
            acceptScript.toHex()
          ) as Coinflip
          let outcome: 'you-win' | 'they-win'
          if (revelationInstance.bobNumber === aliceRandomValueZeroOrOne) {
            outcome = 'you-win'
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
          // Update local UI immediately regardless of network send result
          settle(outcome)
          // Fire-and-forget: attempt to notify Bob of the revelation
          ;(async () => {
            try {
              const winningsMessageId = `winnings:${offerTXID}`
              await constants.messageBoxClient.sendLiveMessage({
                recipient: bob,
                messageBox: 'coinflip_winnings',
                body: {
                  offerTXID: offerTXID,
                  nonce: aliceNonce,
                  number: aliceRandomValueZeroOrOne
                },
                messageId: winningsMessageId
              })
            } catch {
              try {
                const winningsMessageId = `winnings:${offerTXID}`
                await constants.messageBoxClient.sendMessage({
                  recipient: bob,
                  messageBox: 'coinflip_winnings',
                  body: {
                    offerTXID: offerTXID,
                    nonce: aliceNonce,
                    number: aliceRandomValueZeroOrOne
                  },
                  messageId: winningsMessageId
                })
              } catch {
                toast.warn('Could not notify your opponent about the result. They may not see it immediately.', { autoClose: 5000 })
              }
            }
            // Nudge the opponent via notification as a hint
            try { await constants.messageBoxClient.sendNotification(bob, JSON.stringify({ url: window.location.href, body: 'Coin flip result available' })) } catch {}
            console.log('Alice attempted to send revelation back to Bob')
          })()
          
        } else {
          rejectionReason = 'rejected'
          settle('rejected')
        }
      } catch (_) {}
    }

    // Backlog first
    const backlog = await constants.messageBoxClient.listMessages({ messageBox: responsesRoom })
    for (const m of backlog) {
      if (settled) break
      await processMessage(m)
    }
    if (settled) return

    try {
      await constants.messageBoxClient.listenForLiveMessages({
        messageBox: responsesRoom,
        onMessage: processMessage
      })
    } catch (_) {
      try { await constants.messageBoxClient.disconnectWebSocket() } catch {}
    }

    // Guard: periodic HTTP poll even if WS listener attached
    pollId = setInterval(async () => {
      try {
        const msgs = await constants.messageBoxClient.listMessages({ messageBox: responsesRoom })
        for (const m of msgs) {
          if (settled) break
          await processMessage(m)
        }
      } catch {}
    }, 3000)

    const timeoutMs = 180000 // 3 minutes
    setTimeout(() => settle('expired'), timeoutMs)
  })
  // Cleanup room subscription
  try { await constants.messageBoxClient.leaveRoom(responsesRoom) } catch {}

  if (result === 'you-win' || result === 'they-win') {
    return result
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
