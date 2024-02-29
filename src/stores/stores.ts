import { Identity } from 'metanet-identity-react'
import { create } from 'zustand'

export const useAuthStore = create(set => ({
  profilePictureUrl: '',
  setProfilePictureUrl: (newState: string) => set(() => ({ profilePictureUrl: newState }))
}))

interface ChallengeValues {
  identity: Identity | null
  amount: number | null
  headsOrTails: number | null
}
export const useChallengeStore = create(set => ({
  challengeValues: {
    identity: null,
    amount: null,
    headsOrTails: null
  } as ChallengeValues,

  setChallengeValues: (newState: string) => set(() => ({ challengeValues: newState }))
}))
