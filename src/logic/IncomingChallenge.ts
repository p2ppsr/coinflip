import { CreateActionResult } from '@babbage/sdk-ts'

export default interface IncomingChallenge {
  id: string
  from: string
  amount: number
  tx: CreateActionResult
  theirChoice: 'heads' | 'tails'
  expires: number
}
