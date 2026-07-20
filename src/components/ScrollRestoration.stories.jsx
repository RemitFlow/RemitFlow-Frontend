import { MemoryRouter } from 'react-router-dom'
import ScrollRestoration from './ScrollRestoration.jsx'
const meta = {
  title: 'Components/ScrollRestoration',
  component: ScrollRestoration,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/test']}>
        <Story />
      </MemoryRouter>
    )
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Invisible component that persists and restores window scroll position across back/forward navigations.'
      }
    }
  },
  tags: ['autodocs']
}

export default meta

export const Default = {
  render: () => (
    <div>
      <ScrollRestoration />
      <p>
        This component has no visual output—it runs in the background. Scroll
        the page and navigate away, then use the browser back button to see
        your scroll position restored.
      </p>
    </div>
  )
}
