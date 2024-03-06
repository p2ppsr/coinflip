import {
    SmartContract,
    method,
    prop,
    assert,
    ByteString,
    PubKey,
    Sig,
    SigHash,
    Utils,
    hash160,
    hash256,
    Sha256,
    int2ByteString,
    len
} from 'scrypt-ts'

// Allows Alice and Bob to achieve a coin flip
// Alice picks a number (zero or one) and hides it with a nonce behind a hash
// Alice constructs the contract with an offer for Bob
// Alice can cancel or Bob can reject and the coins go back to Alice
// Bob can accept by picking a number (zero or one) and revealing it, and doubling the money
// Alice can reveal her original number. If they are the same she wins, if they are different Bob wins
// If Alice does not reveal her secret after Bob accepts then Bob can win after a timeout
export default class CoinflipContract extends SmartContract {

    @prop(true)
    aliceHash: Sha256

    @prop(true)
    timeout: bigint

    @prop(true)
    alice: PubKey

    @prop(true)
    bob: PubKey

    @prop(true)
    bobNumber: bigint

    @prop(true)
    contractState: bigint
    // state 0 = offered
    // state 1 = accepted

    // Alice can make an offer by committing some money to a hash
    constructor(alice: PubKey, bob: PubKey, aliceHash: Sha256, timeout: bigint) {
        super(...arguments)
        this.aliceHash = aliceHash
        this.contractState = 0n
        this.bobNumber = -1n
        this.alice = alice
        this.bob = bob
        this.timeout = timeout
    }

    // Alice can cancel the offer and get her money back
    @method()
    public cancelOffer(sig: Sig) {
        assert(this.contractState === 0n, 'Contract not in offer state')
        assert(this.checkSig(sig, this.alice), 'Alice signature invalid')
    }

    // Bob can reject Alice's offer if he refunds Alice her money
    @method(SigHash.ANYONECANPAY_SINGLE)
    public rejectOffer(sig: Sig) {
        assert(this.contractState === 0n, 'Contract not in offer state')
        assert(this.checkSig(sig, this.bob), 'Bob signature invalid')
        const outputs = Utils.buildPublicKeyHashOutput(hash160(this.alice), this.ctx.utxo.value)
        const outputsHash = hash256(outputs)
        assert(this.ctx.hashOutputs == outputsHash, 'Contract must refund full amount to Alice')
    }

    // Bob can accept the offer by doubling the money in the contract and adding his number
    @method(SigHash.ANYONECANPAY_SINGLE)
    public acceptOffer(sig: Sig, bobNumber: bigint) {
        assert(this.contractState === 0n, 'Contract not in offer state')
        assert(this.checkSig(sig, this.bob), 'Bob signature invalid')

        // Bob's number must be zero or one
        assert(bobNumber === 0n || bobNumber === 1n, 'Bob must pick zero or one')

        // Increment the state to 1 and save Bob's number
        this.contractState = 1n
        this.bobNumber = bobNumber

        const output = this.buildStateOutput(this.ctx.utxo.value * 2n)
        const hashOutputs = hash256(output)
        assert(this.ctx.hashOutputs == hashOutputs, 'Bob must double the money in the contract')
    }

    // Alice reveals her number and the winner gets the money
    @method(SigHash.ANYONECANPAY_SINGLE)
    public aliceRevealsWinner(sig: Sig, aliceNonce: ByteString, aliceNumber: bigint) {
        assert(this.contractState == 1n, 'Bob must have accepted the offer')
        assert(this.checkSig(sig, this.alice), 'Alice signature invalid')
        assert(len(aliceNonce) === 32n, 'Alice nonce must be 32 bytes')

        // Verify Alice's nonce and number against her original commitment
        const hashForVerification = hash256(aliceNonce + int2ByteString(aliceNumber, 1n))
        assert(hashForVerification === this.aliceHash)
        assert(aliceNumber === 0n || aliceNumber === 1n, 'Alice nust have picked zero or one')

        // Now we know this is the number Alice originally picked.
        // If they are the same, Alice wins.
        if (this.bobNumber === aliceNumber) {
            const outputs = Utils.buildPublicKeyHashOutput(hash160(this.alice), this.ctx.utxo.value)
            const outputsHash = hash256(outputs)
            assert(this.ctx.hashOutputs == outputsHash, 'Contract must pay full amount to the Alice')
        } else {
            const outputs = Utils.buildPublicKeyHashOutput(hash160(this.bob), this.ctx.utxo.value)
            const outputsHash = hash256(outputs)
            assert(this.ctx.hashOutputs == outputsHash, 'Contract must pay full amount to the Bob')
        }
    }

    // After a time delay, if Alice has not revealed the number she picked, Bob gets the money
    @method(SigHash.ANYONECANPAY_NONE)
    public bobWinsAutomaticallyAfterDelay(sig: Sig) {
        assert(this.contractState == 1n, 'Bob must have accepted the offer')
        assert(this.checkSig(sig, this.bob), 'Bob signature invalid')
        assert(this.timeLock(this.timeout), 'Contract has not yet expired')
    }
}
