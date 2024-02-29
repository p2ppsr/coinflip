// Dependencies
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CircularProgress } from '@mui/material'
import { Identity, IdentitySearchField } from 'metanet-identity-react'

// Utils
import { objectHasEmptyValues, sleep } from '../../utils/utils'

// Styles
import { theme } from '../../main'
import './Challenge.scss'

// Stores
import { useChallengeStore } from '../../stores/stores'

export const Challenge = () => {
  const navigate = useNavigate()

  // State ============================================================

  // const [formValues, setFormValues] = useState<InputValues>({
  //   identity: null,
  //   amount: null,
  //   headsOrTails: null
  // })

  const [challengeValues, setChallengeValues] = useChallengeStore((state: any) => [
    state.challengeValues,
    state.setChallengeValues
  ])

  const [isChallenging, setIsChallenging] = useState(false)

  // Handlers =========================================================

  const handleChallenge = async () => {
    setIsChallenging(true)
    // TODO: send invitation here
    await sleep(2000)
    navigate('/coinflip')
  }

  const handleHeadsOrTailsSelection = (value: 0 | 1) => {
    if (challengeValues.headsOrTails === value) {
      setChallengeValues({ ...challengeValues, headsOrTails: null })
    } else {
      setChallengeValues({ ...challengeValues, headsOrTails: value })
    }
  }

  return (
    <div>
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
