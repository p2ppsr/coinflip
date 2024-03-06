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

      await tokenator.sendMessage({
        recipient: challengeValues.identity.identityKey,
        messageBox: 'coinflip_inbox',
        body: {
          message: `You have a new coinflip challenge from ${challengeValues.identity.name}`,
          senderCoinChoice: challengeValues.senderCoinChoice,
          amount: challengeValues.amount,
          identityKey: challengeValues.identity.identityKey,
          sender: challengeValues.identity.name
        }
      })
      toast.success(`Your challenge has been sent to ${challengeValues.identity.name}`)
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
