import { BrowserRouter, Route, Routes } from 'react-router-dom'

// Components
import Challenge from './components/Challenge/Challenge'

// Styles
import './App.scss'

// Assets
import babbageLogo from './assets/babbageLogo.png'
import Coinflip from "./components/Coinflip/Coinflip"

function App() {
  return (
    <BrowserRouter>
      <div className="container">
        <img src={babbageLogo} width="300" />

        <Routes>
          <Route path="/" element={<Challenge />} />
          <Route path="/coinflip" element={<Coinflip />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
