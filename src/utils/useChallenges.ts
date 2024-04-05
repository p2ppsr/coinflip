import Tokenator from '@babbage/tokenator'
import { useChallengeStore } from '../stores/stores'
import constants from './constants'

// Custom hook for accessing tokenator, its methods, global challenges state, and checking challenges
const useChallenges = () => {
  // Initialize Tokenator with configuration
  const tokenator = new Tokenator({
    peerServHost: constants.peerservURL
  })

  // Use Zustand store for challenges state management
  const [challenges, setChallenges] = useChallengeStore((state: any) => [
    state.challenges,
    state.setChallenges
  ])

  // Function to fetch and update challenges from Tokenator
  const checkChallenges = async () => {
    const challenges = await tokenator.listMessages({
      messageBox: 'coinflip_inbox'
    })

    setChallenges(challenges)
  }

  // Function to clear all messages from Tokenator for a specific message box
  const clearAllChallenges = async () => {
    try {
      setChallenges([])

      const messages = await tokenator.listMessages({
        messageBox: 'coinflip_inbox'
      })

      await tokenator.acknowledgeMessage({
        messageIds: messages.map((x: any) => x.messageId)
      })

      console.log('Tokenator inbox cleared')
    } catch (e) {
      console.log('Error clearing tokenator messages: ', e)
    }
  }

  // Function to clear a specific message from Tokenator by message ID
  // and remove it from the global challenges state
  const clearChallenge = async (messageId: number) => {
    try {
      // Remove the challenge from the global state
      setChallenges(challenges.filter((challenge: any) => challenge.messageId !== messageId))

      await tokenator.acknowledgeMessage({
        messageIds: [messageId] // acknowledgeMessage expects an array of message IDs
      })

      console.log(`Message with ID ${messageId} cleared`)
    } catch (error) {
      console.error(`Error clearing message with ID ${messageId}: ${error}`)
    }
  }

  // Return the functionalities from the hook
  return {
    tokenator,
    challenges,
    checkChallenges,
    clearAllTokenatorMessages: clearAllChallenges,
    clearChallenge
  }
}

export default useChallenges
