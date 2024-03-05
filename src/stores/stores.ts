import { Identity } from 'metanet-identity-react'
import { create } from 'zustand'

export const useAuthStore = create(set => ({
  profilePictureUrl: '',
  setProfilePictureUrl: (newState: string) => set(() => ({ profilePictureUrl: newState }))
}))

export interface ChallengeValues {
  identity: Identity | null
  sender: string | null
  amount: number | null
  senderCoinChoice: number | null
}

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
  setChallenges: (newState: any) => set(() => ({ challenges: newState }))
}))
