import ScrollToTopButton from './ScrollToTopButton.jsx'

export default {
  title: 'Components/ScrollToTopButton',
  component: ScrollToTopButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Floating button that appears once the page is scrolled past a ' +
          'threshold and smoothly returns to the top. Scroll the preview to ' +
          'reveal it.'
      }
    }
  },
  argTypes: {
    threshold: { control: { type: 'number', min: 0, step: 50 } },
    label: { control: 'text' }
  }
}

// The button only shows past the scroll threshold, so give stories room to scroll.
function ScrollCanvas({ children }) {
  return (
    <div style={{ height: '200vh', paddingTop: '1rem' }}>
      <p style={{ color: 'var(--color-muted)' }}>
        Scroll down to reveal the floating button in the bottom-right corner.
      </p>
      {children}
    </div>
  )
}

export const Default = {
  args: { threshold: 300, label: 'Scroll to top' },
  render: (args) => (
    <ScrollCanvas>
      <ScrollToTopButton {...args} />
    </ScrollCanvas>
  )
}

export const AlwaysVisible = {
  name: 'Low threshold (shows immediately)',
  args: { threshold: 0, label: 'Back to top' },
  render: (args) => (
    <ScrollCanvas>
      <ScrollToTopButton {...args} />
    </ScrollCanvas>
  )
}

export const CustomLabel = {
  args: { threshold: 150, label: 'Return to top of page' },
  render: (args) => (
    <ScrollCanvas>
      <ScrollToTopButton {...args} />
    </ScrollCanvas>
  )
}
