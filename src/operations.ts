import Tokenator from '@babbage/tokenator'
import { CreateActionResult, getPublicKey, createSignature, createAction, listActions } from '@babbage/sdk-ts'
import { toByteString, int2ByteString, hash256, PubKey, Sig, bsv } from 'scrypt-ts'
import CoinflipContract from './contracts/CoinflipContract.ts'
import coinflipContractJson from '../artifacts/CoinflipContract.json'
CoinflipContract.loadArtifact(coinflipContractJson)

const tokenator = new Tokenator({
    peerServHost: process.env.REACT_APP_PEERSERV_HOST
})

/**
 * Verify a variable is not null or undefined.
 * If the variable is null or undefined, this function will throw an error.
 *
 * @param {T | null | undefined} v - Variable to be verified
 * @returns {T} - Returns the variable if it is neither null nor undefined.
 * @throws {Error} - Throws an error if the truthy value could not be verified.
 */
const verifyTruthy = <T>(v: T | null | undefined): T => {
    if (v == null) {
        throw new Error('A bad thing has happened.')
    }
    return v
}

export const createChallenge = async (bob: string, amount: number, choice: 'heads' | 'tails'): Promise<'rejected' | 'expired' | 'you-win' | 'they-win'> => {
    const aliceNonce = toByteString(
        Array.from(window.crypto.getRandomValues(
            new Uint8Array(32)
        )).map(i => ('0' + i.toString(16)).slice(-2)).join(''),
        false
    )
    const aliceRandomValueZeroOrOne = BigInt(Math.round(Math.random()))
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
    const timeout = BigInt(Math.round(Date.now() / 1000) + 60) // 1-minute timeout
    const coinflipInstance = new CoinflipContract(alice, bobPK, aliceHash, timeout)
    const offerScript = coinflipInstance.lockingScript.toHex()

    const offerTX = await createAction({
        description: 'Flip a coin',
        outputs: [
            {
                script: offerScript,
                satoshis: amount,
                basket: 'coinflip'
            },
        ],
        acceptDelayedBroadcast: false
    })

    await tokenator.sendMessage({
        recipient: bob,
        messageBox: 'coinflip_inbox',
        body: { choice, offerTX }
    })
    let rejectionReason: 'rejected' | 'expired' = 'expired'

    // Wait for Bob to accept
    for (let i = 0; i < 30; i += 5) {
        console.log('Waiting for Bob for 5 seconds')
        await new Promise(resolve => setTimeout(resolve, 5000))
        const messages = await tokenator.listMessages({
            messageBox: 'coinflip_responses'
        })
        const bobsMessages = messages.filter(x => x.sender === bob)
        if (bobsMessages.length < 1) continue
        const bobResponse = JSON.parse(bobsMessages[0].body)
        // If Bob accepts reveal the number else fall through to rejection
        if (bobResponse.action === 'accept') {
            console.log('Alice got acceptance back!', bobResponse)
        } else {
            rejectionReason = 'rejected'
            break
        }
    }

    console.log(`Bob fell through: ${rejectionReason}`)

    // At this point we have either timed out or Bob has rejected
    // Either way, we need to cancel the contract.
    const unlockingScript = await coinflipInstance.getUnlockingScript(async (self: CoinflipContract) => {
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
        const signature = bsv.crypto.Signature.fromString(
            Buffer.from(SDKSignature).toString('hex')
        )
        signature.nhashtype = hashType

        self.to = { tx: bsvtx, inputIndex: 0 }
        self.cancelOffer(
            Sig(toByteString(signature.toTxFormat().toString('hex')))
        )
    })
    await createAction({
        inputs: {
            [offerTX.txid]: {
                ...verifyTruthy(offerTX),
                outputsToRedeem: [{
                    index: 0,
                    unlockingScript: unlockingScript.toHex()
                }]
            }
        },
        description: `Cancel ${rejectionReason} coin flip`,
        acceptDelayedBroadcast: false
    })
    console.log('Recovered coins after rejection.')

    return rejectionReason
}

interface IncomingChallenge {
    id: string
    from: string
    amount: number
    tx: CreateActionResult
    theirChoice: 'heads' | 'tails'
    expires: number
}

export const checkForChallenges = async (): Array<IncomingChallenge> => {
    const challenges = await tokenator.listMessages({
        messageBox: 'coinflip_inbox'
    })
    return challenges.map((chal): IncomingChallenge => {
        const body = JSON.parse(chal.body)
        console.log(body)
        const parsedTX = new bsv.Transaction(body.offerTX.rawTx)
        const instance: CoinflipContract = CoinflipContract.fromLockingScript(parsedTX.outputs[0].script.toHex())
        return {
            id: chal.messageId,
            from: chal.sender,
            amount: parsedTX.outputs[0].satoshis,
            tx: body.offerTX,
            theirChoice: body.choice,
            expires: Number(instance.timeout)
        }
    })
}

window.l = checkForChallenges

export const acceptChallenge = async (challenge: IncomingChallenge): Promise<'you-win' | 'they-win'> => {
    const parsedOfferTX = new bsv.Transaction(challenge.tx.rawTx)
    const offerScript = parsedOfferTX.outputs[0].script
    const coinflipInstance = CoinflipContract.fromLockingScript(
        parsedOfferTX.outputs[0].script.toHex()
    )
    const bobRandomOneOrZero = BigInt(Math.round(Math.random()))
    // Create an unlocking script
    const mockInstance: CoinflipContract = CoinflipContract.fromLockingScript(
        parsedOfferTX.outputs[0].script.toHex()
    )
    mockInstance.contractState = 1n
    mockInstance.bobNumber = bobRandomOneOrZero
    const stateOutput = mockInstance.buildStateOutput(BigInt(challenge.amount * 2))
    console.log(stateOutput)
    console.log(stateOutput.slice(8))
    const outputScript = bsv.Script.fromString(stateOutput.slice(8))
    console.log(outputScript)
    const unlockingScript = await coinflipInstance.getUnlockingScript(async (self: CoinflipContract) => {
        const bsvtx = new bsv.Transaction()
        bsvtx.from({
            txId: challenge.tx.txid,
            outputIndex: 0,
            script: offerScript.toHex(),
            satoshis: challenge.amount
        })
        bsvtx.addOutput(new bsv.Transaction.Output({
            script: outputScript,
            satoshis: challenge.amount * 2
        }))
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
                new bsv.crypto.BN(parseInt(String(challenge.amount)))
            )
        )
        const SDKSignature = await createSignature({
            protocolID: [0, 'coinflip'],
            keyID: '1',
            counterparty: challenge.from,
            data: hashbuf
        })
        const signature = bsv.crypto.Signature.fromString(
            Buffer.from(SDKSignature).toString('hex')
        )
        signature.nhashtype = hashType
        self.to = { tx: bsvtx, inputIndex: 0 }
        self.acceptOffer(
            Sig(toByteString(signature.toTxFormat().toString('hex'))),
            bobRandomOneOrZero
        )
    })
    // Create the action
    const acceptTX = await createAction({
        inputs: {
            [challenge.tx.txid]: {
                ...verifyTruthy(challenge.tx),
                outputsToRedeem: [{
                    index: 0,
                    unlockingScript: unlockingScript.toHex()
                }]
            }
        },
        outputs: [{
            script: outputScript.toHex(),
            satoshis: challenge.amount * 2,
            basket: 'coinflip'
        }],
        description: `Accept a coin flip bet`,
        acceptDelayedBroadcast: false
    })
    console.log(acceptTX)

    // Send the message
    await tokenator.acknowledgeMessage({
        messageIds: [challenge.id]
    })
    await tokenator.sendMessage({
        recipient: challenge.from,
        messageBox: 'coinflip_responses',
        body: {
            action: 'accept',
            acceptTX
        }
    })

    // Wait for Alice to respond
    while (true) {
        console.log('Waiting for Alice for 5 seconds')
        await new Promise(resolve => setTimeout(resolve, 5000))
        const time = Math.round(Date.now() / 1000)
        if (time > challenge.expires + 5) break
        const messages = await tokenator.listMessages({
            messageBox: 'coinflip_winnings'
        })
        const aliceMessages = messages.filter(x => x.sender === challenge.from)
        if (aliceMessages.length < 1) continue
        const aliceMessage = JSON.parse(aliceMessages[0].body)
        console.log('Got back from Alice', aliceMessage)
        return 'you-win' // todo
    }

    // If there is no response, claim the winnings
    console.log('Alice did not respond, Bob is claiming the winnings.')
    const reclaimScript = await coinflipInstance.getUnlockingScript(async (self: CoinflipContract) => {
        const bsvtx = new bsv.Transaction()
        bsvtx.from({
            txId: acceptTX.txid,
            outputIndex: 0,
            script: outputScript.toHex(),
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
                bsv.Script.fromBuffer(Buffer.from(outputScript.toHex(), 'hex')),
                new bsv.crypto.BN(parseInt(String(challenge.amount * 2)))
            )
        )
        const SDKSignature = await createSignature({
            protocolID: [0, 'coinflip'],
            keyID: '1',
            counterparty: challenge.from,
            data: hashbuf
        })
        const signature = bsv.crypto.Signature.fromString(
            Buffer.from(SDKSignature).toString('hex')
        )
        signature.nhashtype = hashType

        self.to = { tx: bsvtx, inputIndex: 0 }
        self.bobWinsAutomaticallyAfterDelay(
            Sig(toByteString(signature.toTxFormat().toString('hex')))
        )
    })
    await createAction({
        inputs: {
            [acceptTX.txid]: {
                ...verifyTruthy(acceptTX),
                outputsToRedeem: [{
                    index: 0,
                    unlockingScript: reclaimScript.toHex()
                }]
            }
        },
        description: `You win a coin flip`,
        acceptDelayedBroadcast: false
    })
    console.log('Recovered coins after non-responsive opponent.')
    return 'you-win'
}

window.a = acceptChallenge

export const rejectChallenge = async (challenge: IncomingChallenge) => {
    await tokenator.acknowledgeMessage({
        messageIds: [challenge.id]
    })
    await tokenator.sendMessage({
        recipient: challenge.from,
        messageBox: 'coinflip_responses',
        body: {
            action: 'reject',
            offerTXID: challenge.tx.txid
        }
    })
}

window.r = rejectChallenge

window.rlm = async () => {
    const li = await checkForChallenges()
    await rejectChallenge(li[li.length - 1])
}

window.alm = async () => {
    const li = await checkForChallenges()
    await acceptChallenge(li[li.length - 1])
}