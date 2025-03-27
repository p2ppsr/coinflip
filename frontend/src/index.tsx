import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider, createTheme } from '@mui/material'
import { ToastContainer, Bounce } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export const theme = createTheme({
  palette: {
    mode: 'dark',
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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ThemeProvider theme={theme}>
    <ToastContainer
      position='top-center'
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme='light'
      transition={Bounce}
    />
    <App />
  </ThemeProvider>
)
