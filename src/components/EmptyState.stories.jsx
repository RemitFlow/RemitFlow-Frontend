import EmptyState from './EmptyState.jsx'
import Button from './Button.jsx'

export default {
  title: 'Components/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    icon: { control: 'text' },
    title: { control: 'text' },
    message: { control: 'text' }
  }
}

export const Default = {
  args: {
    icon: '📭',
    title: 'No transfers yet',
    message: 'Your transfer history will appear here once you send money.'
  }
}

export const CustomIcon = {
  args: {
    icon: '💸',
    title: 'Start sending money',
    message: 'RemitFlow helps you send money across borders instantly with the Stellar network.'
  }
}

export const WithAction = {
  args: {
    icon: '🔍',
    title: 'No results found',
    message: 'Try adjusting your search or filters.',
    action: <Button variant="primary">Clear filters</Button>
  }
}

export const Minimal = {
  args: {
    icon: '',
    title: 'Nothing here',
    message: ''
  }
}

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <EmptyState
        icon="📭"
        title="No transfers yet"
        message="Your transfer history will appear here once you send money."
      />
      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
      <EmptyState
        icon="🔍"
        title="No results found"
        message="Try adjusting your search or filters."
        action={<Button variant="secondary">Clear filters</Button>}
      />
      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />
      <EmptyState
        icon="💸"
        title="Start sending money"
        message="RemitFlow helps you send money across borders instantly."
        action={<Button variant="primary">Send now</Button>}
      />
    </div>
  )
}
