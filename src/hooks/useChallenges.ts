// import { useEffect } from 'react'
// import tokenator from '@babbage/tokenator'
// import { useChallengeStore } from '../stores/stores'

// // Assuming tokenator.listMessages returns an array of Challenge objects
// interface Challenge {
//   id: string
//   title: string
//   description: string
//   // Add other properties as needed
// }

// export const useChallenges = () => {
//   const [challenges, setChallenges] = useChallengeStore((state: any) => [
//     state.challenges,
//     state.setChallenges
//   ])

//   const fetchChallenges = async () => {
//     try {
//       const fetchedChallenges: Challenge[] = await tokenator.listMessages({
//         messageBox: 'coinflip_inbox'
//       })

//       setChallenges(fetchedChallenges)
//     } catch (error) {
//       console.error('Failed to fetch challenges:', error)
//       // Handle error appropriately
//     }
//   }

//   // If you want to fetch challenges automatically when the hook is used,
//   // uncomment the following useEffect hook.
//   /*
//   useEffect(() => {
//     fetchChallenges();
//   }, []);
//   */

//   // Return the current challenges and the fetch function
//   // so they can be used by components.
//   return { challenges, setChallenges, fetchChallenges }
// }
