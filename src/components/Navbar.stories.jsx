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

export const WithActiveHome = {
  render: () => <Navbar />,
  parameters: {
    docs: {
      description: {
        story:
          'The Navbar uses NavLink from react-router-dom. Active link styling is applied when the route matches. The MemoryRouter decorator in preview.js provides routing context with initial route "/".'
      }
    }
  }
}
