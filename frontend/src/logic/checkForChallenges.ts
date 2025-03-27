import IncomingChallenge from './IncomingChallenge'
import { bsv } from 'scrypt-ts'
import { Coinflip, CoinflipArtifact } from '@bsv/backend'
import constants from '../utils/constants'
import { Transaction, Utils } from '@bsv/sdk'
Coinflip.loadArtifact(CoinflipArtifact)

export default async (): Promise<IncomingChallenge[]> => {
  const challenges = await constants.messageBoxClient.listMessages({
    messageBox: 'coinflip_inbox'
  })

  const transformed = await Promise.all(challenges.map(
    async (chal): Promise<IncomingChallenge | undefined> => {
      try {
        const body = JSON.parse(chal.body)
        const parsedTX = Transaction.fromAtomicBEEF(Utils.toArray(body.offerTX, 'base64'))
        const instance: Coinflip = Coinflip.fromLockingScript(
          parsedTX.outputs[0].lockingScript.toHex()
        ) as unknown as Coinflip
        return {
          id: String(chal.messageId),
          from: chal.sender,
          amount: parsedTX.outputs[0].satoshis!,
          tx: body.offerTX,
          theirChoice: body.choice,
          expires: Number(instance.timeout)
        }
      } catch (e) {
        console.error('BOB UNABLE TO PARSE INCOMING CHALLENGE', e)
        await constants.messageBoxClient.acknowledgeMessage({ messageIds: [String(chal.messageId)] })
      }
    }
  ))

  return transformed.filter(x => typeof x !== 'undefined')
}
