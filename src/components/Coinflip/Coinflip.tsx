import { Button } from '@mui/material'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { sleep } from '../../utils'

import Lottie from 'react-lottie'

// Assets
import coinflipAnimaion from '../../assets/coinflipAnimation.json'
import headsImage from '../../assets/heads.png'
import tailsImage from '../../assets/tails.png'

const Coinflip = () => {
  const [coinIsFlipping, setCoinIsFlipping] = useState(false)
  const [flipResult, setFlipResult] = useState<Number>()
  const coinFlipDelay = 4000

  const flipCoin = async () => {
    setCoinIsFlipping(true)

    const flipResultNumber = Math.round(Math.random())
    await sleep(coinFlipDelay)
    setFlipResult(flipResultNumber)

    setCoinIsFlipping(false)
  }

  const coinFlipAnimationOptions = {
    loop: true,
    autoplay: true,
    animationData: coinflipAnimaion,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  }
  return (
    <>
      <div className="coinflipContainer">
        {coinIsFlipping ? (
          <>
            <Lottie options={coinFlipAnimationOptions} />
          </>
        ) : (
          <div>
            <img src={flipResult === 0 ? headsImage : tailsImage} />
            <p>Result</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {!coinIsFlipping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button variant="contained" onClick={flipCoin} className="flipButton" color="primary">
              Flip Coin
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Coinflip
