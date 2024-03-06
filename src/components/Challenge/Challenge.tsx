// Dependencies
import Tokenator from '@babbage/tokenator'
import { Button, CircularProgress } from '@mui/material'
import { IdentitySearchField } from 'metanet-identity-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAsyncEffect from 'use-async-effect'

// Utils
import { objectHasEmptyValues } from '../../utils/utils'

// Styles
import { theme } from '../../main'
import './Challenge.scss'

// Stores
import { toast } from 'react-toastify'
import { useChallengeStore } from '../../stores/stores'

// Assets
import { FaBell } from 'react-icons/fa'
import useChallenges from '../../utils/useChallenges'

// contract
import { toByteString, int2ByteString, hash256, PubKey, bsv } from 'scrypt-ts'
import { getPublicKey } from '@babbage/sdk-ts'
import { deployContract } from 'babbage-scrypt-helpers'
import CoinflipContract from '../../contracts/CoinflipContract.ts'
import coinflipContractJson from '../../../artifacts/CoinflipContract.json'
CoinflipContract.loadArtifact(coinflipContractJson)

export const Challenge = () => {
  const navigate = useNavigate()

  const { tokenator, challenges } = useChallenges()

  // State ============================================================

  const [challengeValues, setChallengeValues] = useChallengeStore((state: any) => [
    state.challengeValues,
    state.setChallengeValues
  ])

  const [isChallenging, setIsChallenging] = useState(false)

  // Handlers =========================================================

  const handleChallenge = async () => {
    setIsChallenging(true)

    try {
      const aliceNonce = toByteString(
        Array.from(window.crypto.getRandomValues(
          new Uint8Array(32)
        )).map(i => ('0' + i.toString(16)).slice(-2)).join(''),
        false
      )
      const aliceChoice = int2ByteString(challengeValues.senderCoinChoice, 1n)
      const aliceHash = hash256(aliceNonce + aliceChoice)
      const aliceHex = await getPublicKey({
        protocolID: [0, 'coinflip'],
        keyID: '1',
        counterparty: challengeValues.identity.identityKey,
        forSelf: true
      })
      const bobHex = await getPublicKey({
        protocolID: [0, 'coinflip'],
        keyID: '1',
        counterparty: challengeValues.identity.identityKey
      })
      const alice = PubKey(bsv.PublicKey.fromString(aliceHex).toByteString())
      const bob = PubKey(bsv.PublicKey.fromString(bobHex).toByteString())
      const timeout = BigInt(Math.round(Date.now() / 1000) + 60) // 1-minute timeout
      const coinflipInstance = new CoinflipContract(alice, bob, aliceHash, timeout)

      const offerTX = await deployContract(
        coinflipInstance,
        challengeValues.amount,
        'Offer to flip a coin',
        'coinflip'
      )

      await tokenator.sendMessage({
        recipient: challengeValues.identity.identityKey,
        messageBox: 'coinflip_inbox',
        body: {
          message: `You have a new coinflip challenge from ${challengeValues.identity.name}`,
          senderCoinChoice: challengeValues.senderCoinChoice,
          amount: challengeValues.amount,
          identityKey: challengeValues.identity.identityKey,
          sender: challengeValues.identity.name,
          offerTX
        }
      })
      toast.success(`Your challenge has been sent to ${challengeValues.identity.name}`)

      // Wait for Bob to accept

      // If Bob accepts reveal the number

      // If Bob does not accept after 50 seconds cancel the offer

    } catch (e) {
      console.log(e)
      toast.error(`There was an error submitting your challenge: ${e}`)
    } finally {
      setIsChallenging(false)
    }
  }

  const handleHeadsOrTailsSelection = (value: 0 | 1) => {
    // Set equal to null if same selection is clicked again, or switch to other value
    const isEqualToPrevValue = challengeValues.senderCoinChoice === value
    setChallengeValues({ ...challengeValues, senderCoinChoice: isEqualToPrevValue ? null : value })
  }

  return (
    <div>
      {challenges.length !== 0 && (
        <>
          <Button
            variant="outlined"
            id="myChallengesButton"
            onClick={() => {
              navigate('/myChallenges')
            }}
          >
            <FaBell style={{ marginRight: '.5rem' }} />
            My Challenges
          </Button>
        </>
      )}

      {/* TODO: Manually clear tokenator messages; dev purposes only */}
      {/* <button className="button" onClick={clearAllTokenatorMessages}>
        Clear Tokenator Messages
      </button> */}

      <div>
        <p>Enter a user to challenge:</p>

        <div style={{ borderRadius: '.25rem', overflow: 'hidden' }}> {/* clip child element for border radius */}
          <IdentitySearchField
            onIdentitySelected={identity => {
              setChallengeValues({ ...challengeValues, identity: identity, sender: identity.name })
              console.log(identity)
            }}
            theme={theme}
          />
        </div>
      </div>

      <div className="fieldContainer">
        <p>Enter an amount to bet:</p>
        <input
          className="userInput"
          type="number"
          onChange={e => {
            setChallengeValues({
              ...challengeValues,
              amount: e.target.value ? parseInt(e.target.value, 10) : null
            })
          }}
        />
      </div>

      <div className="fieldContainer">
        <p>Heads or tails?</p>
        <div className="flex" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            className="headsOrTailsButton"
            variant={challengeValues.senderCoinChoice === 0 ? 'contained' : 'outlined'}
            onClick={() => handleHeadsOrTailsSelection(0)}
            disableRipple
          >
            Heads
          </Button>
          <Button
            className="headsOrTailsButton"
            variant={challengeValues.senderCoinChoice === 1 ? 'contained' : 'outlined'}
            onClick={() => handleHeadsOrTailsSelection(1)}
            disableRipple
          >
            Tails
          </Button>
        </div>
      </div>

      <Button
        variant="contained"
        className="actionButton"
        disabled={objectHasEmptyValues(challengeValues)}
        onClick={handleChallenge}
      >
        {isChallenging ? <CircularProgress className="loadingSpinner" color="info" /> : 'Invite'}
      </Button>
    </div>
  )
}

export default Challenge
