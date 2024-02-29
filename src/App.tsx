import { BrowserRouter, Route, Routes } from 'react-router-dom'

// Components
import Challenge from './components/Challenge/Challenge'
import Coinflip from "./components/Coinflip/Coinflip"

// Styles
import './App.scss'

// Assets
import babbageLogo from './assets/babbageLogo.png'
import coinFlipLogo from './assets/coinflipLogo.svg'

function App() {
  return (
    <BrowserRouter>
      <div className="container">
        <img src={babbageLogo} width="300" />
        <img src={coinFlipLogo} width="200" style={{borderBottom:'1px solid rgba(255,255,255,0.2', paddingBottom:'1rem'}}/>
        {/* <div style={{width:'50%', height:'1px', borderBottom:'1px solid gray'}}/> */}

        <Routes>
          <Route path="/" element={<Challenge />} />
          <Route path="/coinflip" element={<Coinflip />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
