import { BrowserRouter, Route, Routes } from 'react-router-dom'

// Components
import Challenge from './components/Challenge/Challenge'
import Coinflip from './components/Coinflip/Coinflip'

// Styles
import 'react-toastify/dist/ReactToastify.css'
import './App.scss'

// Assets
import { Bounce, ToastContainer } from 'react-toastify'
import useAsyncEffect from 'use-async-effect'
import babbageLogo from './assets/babbageLogo.png'
import coinFlipLogo from './assets/coinflipLogo.svg'
import Invitations from './components/MyChallenges/MyChallenges'
import useChallenges from './utils/useChallenges'

const App = () => {
  // const navigate = useNavigate()
  // State ============================================================

  const { checkChallenges } = useChallenges()

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
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />

      <div className="container" style={{ marginTop: '7vh' }}>
        <img src={babbageLogo} width="150" />
        <img
          src={coinFlipLogo}
          width="200"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.2', paddingBottom: '1rem' }}
        />

        <Routes>
          <Route path="/" element={<Challenge />} />
          <Route path="/coinflip" element={<Coinflip />} />
          <Route path="/myChallenges" element={<Invitations />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
