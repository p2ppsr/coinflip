import { MessageBoxClient } from '@bsv/p2p'
import { WalletClient } from '@bsv/sdk'

const walletClient = new WalletClient()

interface Constants {
  boxURL: string
  walletClient: WalletClient
  messageBoxClient: MessageBoxClient
}

let constants: Constants

if (
  window.location.host.startsWith('localhost') ||
  window.location.host.startsWith('staging')
) {
  // local (same as prod for now)
  constants = {
    walletClient,
    boxURL: 'https://messagebox.babbage.systems',
    messageBoxClient: new MessageBoxClient({
      host: 'https://messagebox.babbage.systems',
      walletClient
    })
  }
} else {
  // production
  constants = {
    walletClient,
    boxURL: 'https://messagebox.babbage.systems',
    messageBoxClient: new MessageBoxClient({
      host: 'https://messagebox.babbage.systems',
      walletClient
    })
  }
}

export default constants
