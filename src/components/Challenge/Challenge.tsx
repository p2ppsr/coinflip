// Dependencies
import Tokenator from '@babbage/tokenator'
import { Button, CircularProgress } from '@mui/material'
import { IdentitySearchField } from 'metanet-identity-react'
import { useState } from 'react'

// Utils
import { objectHasEmptyValues } from '../../utils/utils'

// Styles
import { theme } from '../../main'
import './Challenge.scss'

// Stores
import { toast } from 'react-toastify'
import useAsyncEffect from 'use-async-effect'
import { useChallengeStore } from '../../stores/stores'

// Assets
import { FaBell } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

export const Challenge = () => {
  const navigate = useNavigate()

  const tokenator = new Tokenator({
    peerServHost: 'https://staging-peerserv.babbage.systems' // TODO: use .env to set this dynamically
  })

  // State ============================================================

  const [challengeValues, setChallengeValues] = useChallengeStore((state: any) => [
    state.challengeValues,
    state.setChallengeValues
  ])

  const [isChallenging, setIsChallenging] = useState(false)

  const [challenges, setChallenges] = useChallengeStore((state: any) => [
    state.challenges,
    state.setChallenges
  ])

  const checkChallenges = async () => {
    const challenges = await tokenator.listMessages({
      messageBox: 'coinflip_inbox'
    })

    setChallenges(challenges)
  }

  // Lifecycle ======================================================

  const challengePollTime = 4000 // poll challenges every 4s
  useAsyncEffect(async () => {
    // Check challenges on load
    checkChallenges()

    // Poll for new challenges
    const interval = setInterval(async () => {
      try {
        checkChallenges()
      } catch (e) {
        console.log('no tokenator messages found')
      }
    }, challengePollTime)

    return () => {
      clearInterval(interval)
    }
  }, [])

  // Handlers =========================================================

  const handleChallenge = async () => {
    setIsChallenging(true)

    try {
      await tokenator.sendMessage({
        recipient: challengeValues.identity.identityKey,
        messageBox: 'coinflip_inbox',
        body: {
          message: `You have a new coinflip challenge from ${challengeValues.identity.name}`,
          headsOrTails: challengeValues.headsOrTails,
          amount: challengeValues.amount,
          identityKey: challengeValues.identity.identityKey,
          sender: challengeValues.identity.name
        }
      })
      // navigate('/coinflip')
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
    const isEqualToPrevValue = challengeValues.headsOrTails === value
    setChallengeValues({ ...challengeValues, headsOrTails: isEqualToPrevValue ? null : value })
  }

  // TODO: Dev purposes only
  const clearTokenatorMessages = async () => {
    try {
      const messages = await tokenator.listMessages({
        messageBox: 'coinflip_inbox'
      })

      await tokenator.acknowledgeMessage({
        messageIds: messages.map((x: any) => x.messageId)
      })

      console.log('tokenator inbox cleared')
    } catch (e) {
      console.log('no tokenator messages to clear')
    }
  }

  return (
    <div>
      {challenges.length !== 0 && (
        <>
          <Button
            variant="outlined"
            id="myChallengesButton"
            onClick={() => {
              navigate('/my_challenges')
            }}
          >
            <FaBell style={{ marginRight: '.5rem' }} />
            My Challenges
          </Button>
        </>
      )}

      {/* TODO: Manually clear tokenator messages; dev purposes only */}
      <button className="button" onClick={clearTokenatorMessages}>
        Clear Tokenator Messages
      </button>

      <div>
        <p>Enter a user to challenge:</p>
        <IdentitySearchField
          onIdentitySelected={identity => {
            setChallengeValues({ ...challengeValues, identity: identity })
            console.log(identity)
          }}
          theme={theme}
        />
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
            variant={challengeValues.headsOrTails === 0 ? 'contained' : 'outlined'}
            onClick={() => handleHeadsOrTailsSelection(0)}
            disableRipple
          >
            Heads
          </Button>
          <Button
            className="headsOrTailsButton"
            variant={challengeValues.headsOrTails === 1 ? 'contained' : 'outlined'}
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
