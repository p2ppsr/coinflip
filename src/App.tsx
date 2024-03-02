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

const App = () => {
  // const navigate = useNavigate()

  const [hasChallenges, setHasChallenges] = useChallengeStore((state: any) => [
    state.hasChallenges,
    state.setHasChallenges
  ])

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
      {hasChallenges && (
        <>
          <Button
            variant="contained"
            id="invitationsButton"
            onClick={() => {
              window.location.href = '/my_challenges'
            }}
            color="primary"
          >
            My Challenges
          </Button>
        </>
      )}
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
