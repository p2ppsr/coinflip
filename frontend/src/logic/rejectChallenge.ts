import { Transaction, Utils } from '@bsv/sdk'
import constants from '../utils/constants'
import IncomingChallenge from './IncomingChallenge'

export default async (challenge: IncomingChallenge): Promise<void> => {
  await constants.messageBoxClient.acknowledgeMessage({
    messageIds: [challenge.id]
  })
  await constants.messageBoxClient.sendMessage({
    recipient: challenge.from,
    messageBox: 'coinflip_responses',
    body: {
      action: 'reject',
      offerTXID: Transaction.fromAtomicBEEF(Utils.toArray(challenge.tx, 'base64')).id('hex')
    }
  })
}
