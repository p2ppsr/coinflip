import React, { useState, useEffect, useCallback } from 'react'
import { createChallenge, checkForChallenges, acceptChallenge, rejectChallenge, IncomingChallenge } from './logic/index'
import { Typography, TextField, Button, IconButton, CircularProgress, InputAdornment } from '@mui/material'
import { makeStyles } from '@mui/styles'
import babbageLogo from './assets/babbageLogo.png'
import coinFlipLogo from './assets/coinflipLogo.svg'
import headsIcon from './assets/heads.png'
import tailsIcon from './assets/tails.png'
import { toast } from 'react-toastify'
import { IdentitySearchField, IdentityCard, Identity } from '@bsv/identity-react'
import { theme } from '.'
import constants from './utils/constants'
import Flip from './components/Flip'
import useAsyncEffect from 'use-async-effect'

const useStyles = makeStyles({
  '@global body': {
    backgroundColor: '#222'
  },
  content_wrap: {
    maxWidth: '720px',
    margin: 'auto',
    paddingTop: '1em',
  },
  logo_grid: {
    display: 'grid',
    gridTemplateRows: 'auto auto',
    gridGap: '0.5em',
    placeItems: 'center'
  },
  heads_tails_grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    maxWidth: '20em'
  },
  coin_icon: {
    width: '4em',
    transition: 'all 0.5s',
    '& :hover': {
      width: '5em'
    }
  },
  challenges_grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, auto)',
    gridGap: '0.5em',
    placeItems: 'center'
  },
  call_icon: {
    width: '4em'
  },
  no_challenges: {
    marginTop: '3em'
  }
})

const App = () => {
  const [amount, setAmount] = useState<string | number | undefined>(undefined)
  const [incomingChallenges, setIncomingChallenges] = useState<IncomingChallenge[]>([])
  const [counterparty, setCounterparty] = useState<{ identityKey?: string, name?: string, iconURL?: string }>({})
  const [state, setState] = useState<'start' | 'waiting' | 'you-win' | 'they-win' | 'flipping' | 'rejected' | 'expired'>('start')
  const [loading, setLoading] = useState(false)
  const classes = useStyles()
  const [amountInSats, setAmountInSats] = useState<number | undefined>(undefined)

  const handleChallenge = (side: 'heads' | 'tails') => async () => {
    if (typeof amountInSats === 'undefined') {
      return toast.error('Enter an amount for the challenge!')
    }
    if (!counterparty.identityKey) {
      return toast.error('Search for someone to play with!')
    }
    if (Number(amountInSats) < 500) {
      return toast.error('Use at least 500 satoshis in your challenge to cover fees.')
    }
    try {
      setState('waiting')
      const result = await createChallenge(counterparty.identityKey as string, Number(amountInSats), side)
      setState(result)
      if (result === 'you-win') {
        toast.success('🎉 You won! 🎉')
      } else if (result === 'they-win') {
        toast.info('💩 You lose! 💩')
      } else if (result === 'expired') {
        toast.info('⏰ Challenge has expired. ⏰')
      } else if (result === 'rejected') {
        toast.info('❌ Challenge was rejected. ❌')
      }
    } catch (e) {
      console.error('OPERATIONS ERROR FOLLOWS:')
      console.error(e)
      toast.error('🤯 Something went wrong! 🤯')
      setState('start')
    }
  }

  const handleAccept = async (chal: IncomingChallenge) => {
    try {
      setState('flipping')
      setAmountInSats(chal.amount)
      const result = await acceptChallenge(chal)
      setState(result)
      if (result === 'you-win') {
        toast.success('🎉 You won! 🎉')
      } else {
        toast.info('💩 You lose! 💩')
      }
      setAmountInSats(undefined)
      setAmount(undefined)
    } catch (e) {
      console.error('OPERATIONS ERROR FOLLOWS:')
      console.error(e)
      toast.error('🤯 Something went wrong! 🤯')
      setState('start')
    }
  }

  const handleReject = async (chal: IncomingChallenge) => {
    try {
      setLoading(true)
      await rejectChallenge(chal)
      toast.info('❌ Challenge rejected. ❌')
    } catch (e) {
      console.error('OPERATIONS ERROR FOLLOWS:')
      console.error(e)
      toast.error('🤯 Something went wrong! 🤯')
    } finally {
      setLoading(false)
      setState('start')
    }
  }

  useEffect(() => {
    if (state === 'start' || state === 'waiting') {
      let interval = setInterval(async () => {
        try {
          const results = await checkForChallenges()
          setIncomingChallenges(results)
        } catch (e) {
          console.error('OPERATIONS ERROR FOLLOWS:')
          console.error(e)
        }
      }, 1000)
      return () => {
        clearInterval(interval)
      }
    }
    if (state === 'flipping' || state === 'you-win' || state === 'they-win') {
      setIncomingChallenges([])
    }
  }, [state])

  const handleAmountChange = useCallback(async (event: any) => {
    const input = event.target.value.replace(/[^0-9.]/g, '')
    setAmount(input)
    if (input !== amount) {
      try {
        const satoshis = (Number(input))
        setAmountInSats(satoshis || 1000)
      } catch (error) {
        console.error('Error converting currency:', error)
      }
    }
  }, [])

  const incomingChallengesGrid = <div className={classes.challenges_grid}>
    <Typography color='primary' variant='h6'><b>Opponent</b></Typography>
    <Typography color='primary' variant='h6'><b>Amount</b></Typography>
    <Typography color='primary' variant='h6'><b>Their Call</b></Typography>
    <Typography color='primary' variant='h6'><b>Accept</b></Typography>
    <Typography color='primary' variant='h6'><b>Reject</b></Typography>
    {incomingChallenges.map((challenge, index) => <React.Fragment key={index}>
      <div>
        <IdentityCard identityKey={challenge.from} themeMode='dark' />
      </div>
      <Typography color={'white'}>
        {challenge.amount}
      </Typography>
      {challenge.theirChoice === 'heads'
        ? <img className={classes.call_icon} src={headsIcon} alt='heads' />
        : <img className={classes.call_icon} src={tailsIcon} alt='tails' />}
      <Button color='primary' onClick={() => handleAccept(challenge)} disabled={loading}>Flip it!</Button>
      <Button color='secondary' onClick={() => handleReject(challenge)} disabled={loading}>Reject</Button>
    </React.Fragment>)}
  </div>

  let stateUI = null
  if (state === 'start') {
    stateUI = <div>
      <TextField
        variant='filled'
        label='Amount'
        type='number'
        value={amount}
        InputProps={{
          startAdornment: <InputAdornment position="start">SATS</InputAdornment>
        }}
        onChange={handleAmountChange}
      />
      <br />
      <br />
      <div style={{ textAlign: 'left', margin: 'auto' }}>
        <IdentitySearchField
          onIdentitySelected={(identity: Identity) => {
            setCounterparty({
              identityKey: identity.identityKey,
              name: identity.name,
              iconURL: identity.avatarURL
            })
          }}
          theme={theme}
        />
      </div>
      <br />
      <br />
      <Typography align='center' variant='h5' color='primary' paragraph>
        Heads or Tails?
      </Typography>
      <div className={classes.heads_tails_grid}>
        <IconButton onClick={handleChallenge('heads')}>
          <img src={headsIcon} className={classes.coin_icon} />
        </IconButton>
        <IconButton onClick={handleChallenge('tails')}>
          <img src={tailsIcon} className={classes.coin_icon} />
        </IconButton>
      </div>
      <br />
      <br />
      <br />
      <Typography align='center' variant='h4' color='primary' paragraph>
        Incoming Challenges
      </Typography>
      {incomingChallenges.length === 0 ? (
        <div className={classes.no_challenges}>
          <CircularProgress />
          <Typography align='center' color='textSecondary' paragraph>
            Waiting for an incoming challenge...
          </Typography>
        </div>
      ) : incomingChallengesGrid}
    </div>
  } else if (state === 'waiting') {
    stateUI = <div>
      <Typography color='primary' variant='h4' paragraph>Waiting for {counterparty.name || 'opponent'}...</Typography>
      {/* <Button onClick={() => setState('start')}>
        Cancel Challenge
      </Button> */}
      <br />
      <br />
      {incomingChallenges.length > 0 && incomingChallengesGrid}
    </div>
  } else if (state === 'flipping') {
    stateUI = <Flip />
  } else if (state === 'expired') {
    stateUI = <div>
      <Typography color='primary' variant='h4' paragraph>Your challenge has expired!</Typography>
      <br />
      <br />
      <Button onClick={() => setState('start')} variant='contained' size='large'>
        Main Menu
      </Button>
      <br />
      <br />
      {incomingChallenges.length > 0 && incomingChallengesGrid}
    </div>
  } else if (state === 'rejected') {
    stateUI = <div>
      <Typography color='primary' variant='h4' paragraph>{counterparty.name || 'Your opponent'} has rejected your challenge!</Typography>
      <br />
      <br />
      <Button onClick={() => setState('start')} variant='contained' size='large'>
        Main Menu
      </Button>
      <br />
      <br />
      {incomingChallenges.length > 0 && incomingChallengesGrid}
    </div>
  } else if (state === 'you-win') {
    stateUI = <div>
      <Typography color='primary' variant='h3' paragraph>You won!</Typography>
      <Typography color='secondary' paragraph>Your money has been doubled and {counterparty.name || 'your opponent'} has paid you</Typography>
      <Typography color={'white'} variant='h4'>
        {amountInSats}
      </Typography>
      <br />
      <br />
      <Button onClick={() => setState('start')}>
        Main Menu
      </Button>
    </div>
  } else if (state === 'they-win') {
    stateUI = <div>
      <Typography color='primary' variant='h3' paragraph>You lost!</Typography>
      <Typography color='secondary' paragraph>Your money has been taken by {counterparty.name || 'your opponent'}!</Typography>
      <Button onClick={() => setState('start')} variant='contained' size='large'>
        Main Menu
      </Button>
      <br />
      <br />
      {incomingChallenges.length > 0 && incomingChallengesGrid}
    </div>
  }

  return (
    <center className={classes.content_wrap}>
      <div className={classes.logo_grid}>
        <img src={babbageLogo} width='150' />
        <img
          src={coinFlipLogo}
          width='200'
          style={{ borderBottom: '1px solid rgba(255,255,255,0.2', paddingBottom: '1rem', marginBottom: '2em' }}
        />
      </div>
      {stateUI}
    </center>
  )
}

export default App