import Navbar from './Navbar.jsx'
import { AppProvider } from '../context/AppContext.jsx'

export default {
  title: 'Components/Navbar',
  component: Navbar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AppProvider>
        <Story />
      </AppProvider>
    )
  ]
}

export const Default = {
  render: () => <Navbar />
}