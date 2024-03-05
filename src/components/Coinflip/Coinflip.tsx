import { Button } from '@mui/material'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { sleep } from '../../utils/utils'

import Lottie from 'react-lottie'

// Assets
import coinflipAnimaion from '../../assets/coinflipAnimation.json'
import headsImage from '../../assets/heads.png'
import tailsImage from '../../assets/tails.png'

// Styles
import './Coinflip.scss'
import { useChallengeStore } from '../../stores/stores'
import { useNavigate } from 'react-router-dom'

const Coinflip = () => {
  const navigate = useNavigate()
  const coinFlipDelay = 3000

  // State =========================================================================

  const [coinIsFlipping, setCoinIsFlipping] = useState(false)
  const [flipResult, setFlipResult] = useState<Number | null>(null)

  // Global state ==================================================================

  const [challengeValues, setChallengeValues] = useChallengeStore((state: any) => [
    state.challengeValues,
    state.setChallengeValues
  ])

  // Handlers ====================================================================

  const flipCoin = async () => {
    setCoinIsFlipping(true)

    const flipResultNumber = Math.round(Math.random())
    await sleep(coinFlipDelay)
    setFlipResult(flipResultNumber)

    setCoinIsFlipping(false)
  }

  // Lottie animation config =======================================================

  const coinFlipAnimationOptions = {
    loop: true,
    autoplay: true,
    animationData: coinflipAnimaion,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  }

  useEffect(() => {
    flipCoin()
  }, [])

  // Render ======================================================================

  return (
    <>
      <div className="coinflipContainer">
        {coinIsFlipping ? (
          <>
            <Lottie options={coinFlipAnimationOptions} width={400} />
          </>
        ) : (
          <>
            {flipResult !== null && (
              <>
                <div>
                  <img src={flipResult === 0 ? headsImage : tailsImage} id="coinflipResultImage" />
                  <h1 id="resultText">
                    {flipResult !== challengeValues.senderCoinChoice
                      ? `You win! You have been awarded ${challengeValues.amount * 2} Satoshis.`
                      : `You lose! ${
                          challengeValues.sender
                        } has been awarded ${challengeValues.amount * 2} Satoshis.`}
                  </h1>
                  <Button
                    variant="contained"
                    className="actionButton"
                    onClick={() => {
                      navigate('/')
                    }}
                  >
                    Home
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

export default Coinflip
