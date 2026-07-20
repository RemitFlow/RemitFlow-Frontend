import Sidebar from './Sidebar.jsx'
import { AppProvider } from '../context/AppContext.jsx'
import { MemoryRouter } from 'react-router-dom'

export default {
  title: 'Components/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AppProvider>
        <MemoryRouter initialEntries={['/']}>
          <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
            <Story />
          </div>
        </MemoryRouter>
      </AppProvider>
    )
  ]
}

export const Default = {
  render: () => <Sidebar />
}

export const Collapsed = {
  render: () => <Sidebar />,
  parameters: {
    docs: {
      description: {
        story:
          'The Sidebar collapse state is persisted to localStorage under the key "sidebar-collapsed". To see the collapsed state, toggle it in the Default story — the state will persist across story switches and page reloads.'
      }
    }
  }
}

export const SendActive = {
  render: () => <Sidebar />,
  parameters: {
    docs: {
      description: {
        story:
          'With initial route "/send" the Send Money link shows the active state.'
      }
    }
  },
  decorators: [
    (Story) => (
      <AppProvider>
        <MemoryRouter initialEntries={['/send']}>
          <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
            <Story />
          </div>
        </MemoryRouter>
      </AppProvider>
    )
  ]
}
