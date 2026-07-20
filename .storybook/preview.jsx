import { MemoryRouter } from 'react-router-dom'
import '../src/index.css'

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a2e' },
        { name: 'high-contrast', value: '#03050f' }
      ]
    }
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <div style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
          <Story />
        </div>
      </MemoryRouter>
    )
  ]
}

export default preview
