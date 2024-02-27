import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

import BabbagePrompt from '@babbage/react-prompt'
import { ThemeProvider } from '@emotion/react'
import { createTheme } from '@mui/material'

export let theme = createTheme({
  palette: {
    primary: {
      main: '#7494ea',
    },
    secondary: {
      main: '#7494ea',
    },
    info: {
      main: '#000'
    }
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BabbagePrompt
      customPrompt
      appName="Coinflip"
      author="Project Babbage"
      authorUrl="https://projectbabbage.com"
      description="A coin flip demonstration of Project Babbage's micropayment capabilities"
      // appIcon="/tempoIcon.png"
      // appImages={["/tempoBG.png"]}
      supportedMetaNet={'universal'}
    >
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </BabbagePrompt>
  </React.StrictMode>
)
