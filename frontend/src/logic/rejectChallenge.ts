import { Transaction } from '@bsv/sdk'
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
      offerTXID: Transaction.fromAtomicBEEF(challenge.tx).id('hex')
    }
  })
}
