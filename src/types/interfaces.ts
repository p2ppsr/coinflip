// export interface Challenge {
//   body: string
//   created_at: string,
//   messageId: number,
//   sender: string,
//   updated_at: string,
// }

export interface Identity {
  identityKey: string;
  name: string;
}

export interface ChallengeValues {
  identity: Identity | null
  sender: string | null
  amount: number | null
  senderCoinChoice: number | null
}