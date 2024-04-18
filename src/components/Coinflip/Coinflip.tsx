import React, { useEffect, useState } from 'react'
import { Button } from '@mui/material'
import Lottie from 'react-lottie'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { useChallengeStore } from '../../stores/stores'
import { sleep } from '../../utils/utils'

// Assets
import coinflipAnimaion from '../../assets/coinflipAnimation.json'
import headsImage from '../../assets/heads.png'
import tailsImage from '../../assets/tails.png'

// Styles
import './Coinflip.scss'

// Contract helpers and artifacts
import { deployContract, redeemContract } from 'babbage-scrypt-helpers'
import CoinflipContract from '../../contracts/CoinflipContract'
import coinflipContractJson from '../../../artifacts/CoinflipContract.json'

CoinflipContract.loadArtifact(coinflipContractJson)
console.log(CoinflipContract.loadArtifact(coinflipContractJson))

const Coinflip = () => {
  const navigate = useNavigate()

  // Global state from the store
  const [
    challengeValues,
    setChallengeValues,
    flipResult,
    setFlipResult
  ] = useChallengeStore((state: any) => [
    state.challengeValues,
    state.setChallengeValues,
    state.flipResult,
    state.setFlipResult
  ])

  // Local state
  const [coinIsFlipping, setCoinIsFlipping] = useState(false)
  const [coinflipResultImage, setCoinflipResultImage] = useState<string | undefined>()

  // Lottie animation configuration
  const coinFlipAnimationOptions = {
    loop: true,
    autoplay: true,
    animationData: coinflipAnimaion,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  }

  useEffect(() => {
    // Logic for determining the coinflip result image
    const isSenderWin =
      (flipResult === 'they-win' && challengeValues.senderCoinChoice === 0) ||
      (flipResult === 'you-win' && challengeValues.senderCoinChoice !== 0)
    setCoinflipResultImage(isSenderWin ? headsImage : tailsImage)
  }, [flipResult, challengeValues.senderCoinChoice])

  return (
    <>
      <div className='coinflipContainer'>
        {coinIsFlipping ? (
          <Lottie options={coinFlipAnimationOptions} width={400} />
        ) : (
          flipResult !== null && (
            <div>
              <img src={coinflipResultImage} id='coinflipResultImage' alt='Coin Flip Result' />
              <h1 id='resultText'>
                {flipResult === 'you-win'
                  ? `You win! You have been awarded ${challengeValues.amount * 2} Satoshis.`
                  : `You lose! ${challengeValues.sender} has been awarded ${challengeValues.amount *
                      2} Satoshis.`}
              </h1>
              <Button
                variant='contained'
                className='actionButton'
                onClick={() => {
                  // Reset the flip result
                  setFlipResult(null)
                  // Navigate back to Challenge.tsx
                  navigate('/')
                }}
              >
                Home
              </Button>
            </div>
          )
        )}
      </div>
    </>
  )
}

export default Coinflip
