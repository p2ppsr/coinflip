import { Autocomplete, Button, CircularProgress, TextField } from '@mui/material'
import { useEffect, useState } from 'react'
import useAsyncEffect from 'use-async-effect'
import { sleep } from '../../utils'
import './Challenge.scss'
import { useNavigate } from 'react-router-dom'
import { Identity, IdentitySearchField } from 'metanet-identity-react'
import { theme } from '../../main'

export interface User {
  name: string | null
  id: string | null
}

interface InputValues {
  user: User
  amount: number | null
}

export const exampleUsers = [
  { name: 'Dan', id: '1' },
  { name: 'Ty', id: '2' },
  { name: 'Brayden', id: '3' },
  { name: 'Mike', id: '4' },
  { name: 'Tone', id: '5' },
  { name: 'Bob', id: '6' },
  { name: 'Scott', id: '7' }
]

export const Challenge = () => {
  const navigate = useNavigate()

  // State ============================================================
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<User[]>([])
  const [inputValues, setInputValues] = useState<InputValues>({
    user: { name: null, id: null },
    amount: null
  })
  const usersLoading = open && options.length === 0

  const [isChallenging, setIsChallenging] = useState(false)

  const [selection, setSelection] = useState<0 | 1 | null>(null)

  const [selectedIdentity, setSelectedIdentity] = useState<Identity | null>(null)

  // Lifecycle ========================================================

  useAsyncEffect(async () => {
    let active = true

    if (!usersLoading) return undefined

    await sleep(1000)

    if (active) {
      setOptions(
        exampleUsers.filter(
          user => user.name?.toLowerCase() === inputValues.user.name?.toLowerCase()
        )
      )
    }

    return () => {
      active = false
    }
  }, [usersLoading, inputValues.user.name])

  useEffect(() => {
    if (!open) {
      setOptions([])
    }
  }, [open, inputValues.user.name])

  // Handlers =========================================================

  const handleChallenge = async () => {
    setIsChallenging(true)
    await sleep(2000)
    navigate('/coinflip')
  }

  const handleSelection = (choice: 0 | 1) => {
    setSelection(choice)
  }

  return (
    <div>
      <div>
        <p>Enter a user to challenge:</p>
        <Autocomplete
          className="userInput"
          open={open && options.length > 0}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          getOptionLabel={option => option.name || ''}
          options={options}
          loading={usersLoading}
          inputValue={inputValues.user.name || ''}
          onInputChange={(event, newInputValue) => {
            setInputValues({ ...inputValues, user: { ...inputValues.user, name: newInputValue } })
          }}
          // onChange={(event, newValue) => {
          //   setInputValues({ ...inputValues, user: newValue || { name: null, id: null } })
          // }}
          renderInput={params => (
            <TextField
              {...params}
              label="User"
              InputProps={{
                ...params.InputProps
              }}
            />
          )}
        />
        <div>
          <IdentitySearchField
            onIdentitySelected={identity => {
              setSelectedIdentity(identity)
            }}
            theme={theme}
          />
          {selectedIdentity && (
            <div>
              <h2>Selected Identity</h2>
              <p>Name: {selectedIdentity.name}</p>
              <p>Identity Key: {selectedIdentity.identityKey}</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <p>Enter an amount to bet:</p>
        <TextField
          id="outlined-basic"
          label="Amount"
          variant="outlined"
          className="userInput"
          type="number"
          value={inputValues.amount || ''}
          onChange={e =>
            setInputValues({
              ...inputValues,
              amount: e.target.value ? parseInt(e.target.value, 10) : null
            })
          }
        />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <p>Heads or tails?</p>
        <div className="flex" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            className="button"
            variant={selection === 0 ? 'contained' : 'outlined'}
            onClick={() => handleSelection(0)}
            style={{ flex: 1, marginRight: '0.5rem' }} // Ensure the button takes full width and add margin
          >
            Heads
          </Button>
          <Button
            className="button"
            variant={selection === 1 ? 'contained' : 'outlined'}
            onClick={() => handleSelection(1)}
            style={{ flex: 1 }} // Ensure the button takes full width
          >
            Tails
          </Button>
        </div>
      </div>

      <Button
        variant="contained"
        id="inviteButton"
        disabled={inputValues.user.name === null || inputValues.amount === null}
        onClick={handleChallenge}
      >
        {isChallenging ? (
          <CircularProgress className="loadingSpinner" color="secondary" />
        ) : (
          'Invite'
        )}
      </Button>
    </div>
  )
}

export default Challenge
