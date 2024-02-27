import { create } from 'zustand'

export const useAuthStore = create(set => ({

  profilePictureUrl: '',
  setProfilePictureUrl: (newState: string) => set(() => ({ profilePictureUrl: newState }))
}))