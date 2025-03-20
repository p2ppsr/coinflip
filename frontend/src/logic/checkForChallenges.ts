import IncomingChallenge from './IncomingChallenge'
import { bsv } from 'scrypt-ts'
import { Coinflip, CoinflipArtifact } from '@bsv/backend'
import constants from '../utils/constants.js'
Coinflip.loadArtifact(CoinflipArtifact)

export default async (): Promise<IncomingChallenge[]> => {
  const challenges = await constants.tokenator.listMessages({
    messageBox: 'coinflip_inbox'
  })

  return challenges.map(
    (chal): IncomingChallenge => {
      const body = JSON.parse(chal.body)
      //   console.log(body)
      const parsedTX = new bsv.Transaction(body.offerTX.rawTx)
      const instance: Coinflip = Coinflip.fromLockingScript(
        parsedTX.outputs[0].script.toHex()
      )
      return {
        id: chal.messageId,
        from: chal.sender,
        amount: parsedTX.outputs[0].satoshis,
        tx: body.offerTX,
        theirChoice: body.choice,
        expires: Number(instance.timeout)
      }
    }
  )
}
