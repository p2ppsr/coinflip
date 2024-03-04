import { BrowserRouter, Route, Routes } from 'react-router-dom'

// Components
import Challenge from './components/Challenge/Challenge'
import Coinflip from './components/Coinflip/Coinflip'

// Styles
import 'react-toastify/dist/ReactToastify.css'
import './App.scss'

// Assets
import { Button } from '@mui/material'
import { Bounce, ToastContainer } from 'react-toastify'
import babbageLogo from './assets/babbageLogo.png'
import coinFlipLogo from './assets/coinflipLogo.svg'
import Invitations from './components/MyChallenges/MyChallenges'
import { useChallengeStore } from './stores/stores'
import useAsyncEffect from 'use-async-effect'
import tokenator from '@babbage/tokenator'

const App = () => {
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

  return (
    <BrowserRouter>
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />

      <div className="container" style={{ marginTop: '4rem' }}>
        <img src={babbageLogo} width="150" />
        <img
          src={coinFlipLogo}
          width="200"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.2', paddingBottom: '1rem' }}
        />

        <Routes>
          <Route path="/" element={<Challenge />} />
          <Route path="/coinflip" element={<Coinflip />} />
          <Route path="/my_challenges" element={<Invitations />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
