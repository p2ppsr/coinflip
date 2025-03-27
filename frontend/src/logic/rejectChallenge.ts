import constants from '../utils/constants'
import IncomingChallenge from './IncomingChallenge'

export default async (challenge: IncomingChallenge): Promise<void> => {
  await constants.tokenator.acknowledgeMessage({
    messageIds: [challenge.id]
  })
  await constants.tokenator.sendMessage({
    recipient: challenge.from,
    messageBox: 'coinflip_responses',
    body: {
      action: 'reject',
      offerTXID: challenge.tx.txid
    }
  })
}
