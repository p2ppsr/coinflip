// import Tokenator from '@babbage/tokenator'
// import { useChallengeStore } from "../stores/stores"

// export const tokenator = new Tokenator({
//   peerServHost: process.env.REACT_APP_PEERSERV_HOST
// })

// export const checkChallenges = async () => {
//   const challenges = await tokenator.listMessages({
//     messageBox: 'coinflip_inbox'
//   })

//   setChallenges(challenges)
// }

// export const clearAllTokenatorMessages = async () => {
//   try {
//     const messages = await tokenator.listMessages({
//       messageBox: 'coinflip_inbox'
//     })

//     await tokenator.acknowledgeMessage({
//       messageIds: messages.map((x: any) => x.messageId)
//     })

//     console.log('Tokenator inbox cleared')
//   } catch (e) {
//     console.log('Error clearing tokenator messages: ', e)
//   }
// }

// export const clearTokenatorMessage = async (messageId: number) => {
//   try {
//     // Acknowledge the message with the given ID to clear it
//     await tokenator.acknowledgeMessage({
//       messageIds: [messageId] // Note: acknowledgeMessage expects an array of message IDs
//     })

//     console.log(`Message with ID ${messageId} cleared`)
//   } catch (error) {
//     console.error(`Error clearing message with ID ${messageId}: ${error}`)
//   }
// }