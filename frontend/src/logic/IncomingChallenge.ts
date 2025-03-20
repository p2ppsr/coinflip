import { AtomicBEEF } from '@bsv/sdk'

export default interface IncomingChallenge {
  id: string
  from: string
  amount: number
  tx: AtomicBEEF
  theirChoice: 'heads' | 'tails'
  expires: number
}
