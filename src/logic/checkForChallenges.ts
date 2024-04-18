import IncomingChallenge from './IncomingChallenge'
import { bsv } from 'scrypt-ts'
import CoinflipContract from '../contracts/CoinflipContract.ts'
import coinflipContractJson from '../../artifacts/CoinflipContract.json'
import constants from '../utils/constants.ts'
CoinflipContract.loadArtifact(coinflipContractJson)

export default async (): Promise<IncomingChallenge[]> => {
  const challenges = await constants.tokenator.listMessages({
    messageBox: 'coinflip_inbox'
  })

  return challenges.map(
    (chal): IncomingChallenge => {
      const body = JSON.parse(chal.body)
      //   console.log(body)
      const parsedTX = new bsv.Transaction(body.offerTX.rawTx)
      const instance: CoinflipContract = CoinflipContract.fromLockingScript(
        parsedTX.outputs[0].script.toHex()
      )
      return {
        id: chal.messageId,
        from: chal.sender,
        amount: parsedTX.outputs[0].satoshis,
        tx: body.offerTX,
        theirChoice: body.choice,
        expires: Number(instance.timeout)
      }
    }
  )
}
