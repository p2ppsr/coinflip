import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

import { ThemeProvider, createTheme } from '@mui/material'

export let theme = createTheme({
  palette: {
    primary: {
      main: '#fff'
    },
    info: {
      main: '#000'
    },
    success: {
      main: '#21D170'
    },
    error: {
      main: '#DD4A4A'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { minWidth: 0 }
      }
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <App />
  </ThemeProvider>
)
