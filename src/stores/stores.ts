import { Identity } from 'metanet-identity-react'
import { create } from 'zustand'
import { ChallengeValues } from '../types/interfaces'

export const useAuthStore = create(set => ({
  profilePictureUrl: '',
  setProfilePictureUrl: (newState: string) => set(() => ({ profilePictureUrl: newState }))
}))

export const useChallengeStore = create(set => ({
  // Values for the input form in challenge page
  challengeValues: {
    identity: null,
    sender: null,
    amount: null,
    senderCoinChoice: null
  } as ChallengeValues,

  setChallengeValues: (newState: string) => set(() => ({ challengeValues: newState })),

  challenges: [],
  setChallenges: (newState: any[]) => set(() => ({ challenges: newState })),

  flipResult: null,
  setFlipResult: (newState: string) => set(() => ({ flipResult: newState }))
}))
