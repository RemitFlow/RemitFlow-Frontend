import WalletButton from './WalletButton.jsx'
import { AppProvider } from '../context/AppContext.jsx'

export default {
  title: 'Components/WalletButton',
  component: WalletButton,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AppProvider>
        <Story />
      </AppProvider>
    )
  ]
}

export const Disconnected = {
  render: () => <WalletButton />
}

export const WithMockedContext = {
  render: () => (
    <div>
      <p style={{ marginBottom: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
        Use the button below to simulate wallet connection.
      </p>
      <WalletButton />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The WalletButton starts in a disconnected state. Click "Connect Wallet" to simulate a connection via the AppProvider context.'
      }
    }
  }
}
