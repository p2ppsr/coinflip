// Dependencies
import React from "react"
import { Button } from '@mui/material'
import { IdentitySearchField } from 'metanet-identity-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createChallenge } from '../../operations'
import Lottie from "react-lottie"
import constants from "../../utils/constants"

// Utils
import { objectHasEmptyValues } from '../../utils/utils'

// Styles
import { theme } from '../../index'
import './Challenge.scss'

// Stores
import { toast } from 'react-toastify'
import { useChallengeStore } from '../../stores/stores'

// Assets
import { FaBell } from 'react-icons/fa'
import coinflipAnimaion from '../../assets/coinflipAnimation.json'
import { Identity } from "../../types/interfaces"


export const Challenge = () => {
  const navigate = useNavigate()

  // State ============================================================

  // Global challenge values
  const [challenges, setChallenges] = useChallengeStore((state: any) => [
    state.challenges,
    state.setChallenges
  ])

  // Form values
  const [challengeValues, setChallengeValues] = useChallengeStore((state: any) => [
    state.challengeValues,
    state.setChallengeValues
  ])

  // Local UI loading state
  const [isChallenging, setIsChallenging] = useState(false)

  // Handlers =========================================================

  const handleChallenge = async () => {
    setIsChallenging(true)

    try {
      const result = await createChallenge(
        challengeValues.identity.identityKey,
        challengeValues.amount,
        challengeValues.senderCoinChoice === 0 ? 'heads' : 'tails'
      )
      toast.success(result)
      // toast.success(`Your challenge has been sent to ${challengeValues.identity.name}`)
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

  const coinFlipAnimationOptions = {
    loop: true,
    autoplay: true,
    animationData: coinflipAnimaion,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
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
              navigate('/myChallenges')
            }}
          >
            <FaBell style={{ marginRight: '.5rem' }} />
            My Challenges
          </Button>
        </>
      )}

      {isChallenging ? (
        <>
          <Lottie options={coinFlipAnimationOptions} width={400} />
        </>
      ) : (
        <>
          <div>
            <p>Enter a user to challenge:</p>

            <div style={{ borderRadius: '.25rem', overflow: 'hidden' }}>
              {' '}
              {/* clip child element for border radius */}
              <IdentitySearchField
                confederacyHost={constants.confederacyURL}
                onIdentitySelected={(identity: Identity) => {
                  setChallengeValues({
                    ...challengeValues,
                    identity: identity,
                    sender: identity.name
                  })
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
            Invite
          </Button>
        </>
      )}
    </div>
  )
}

export default Challenge
