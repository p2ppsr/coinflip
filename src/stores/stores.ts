import { Identity } from 'metanet-identity-react'
import { create } from 'zustand'

export const useAuthStore = create(set => ({
  profilePictureUrl: '',
  setProfilePictureUrl: (newState: string) => set(() => ({ profilePictureUrl: newState }))
}))

export interface ChallengeValues {
  identity: Identity | null
  amount: number | null
  headsOrTails: number | null
}

export const useChallengeStore = create(set => ({
  
  // Values for the input form in challenge page
  challengeValues: {
    identity: null,
    amount: null,
    headsOrTails: null
  } as ChallengeValues,

  setChallengeValues: (newState: string) => set(() => ({ challengeValues: newState })),

  hasChallenges: false,
  setHasChallenges: (newState: boolean) => set(() => ({ hasChallenges: newState }))

  
}))
