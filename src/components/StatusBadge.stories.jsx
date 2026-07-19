import StatusBadge from './StatusBadge.jsx'

export default {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['pending', 'completed', 'failed']
    }
  }
}

export const Pending = {
  args: {
    status: 'pending'
  }
}

export const Completed = {
  args: {
    status: 'completed'
  }
}

export const Failed = {
  args: {
    status: 'failed'
  }
}

export const AllStatuses = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <StatusBadge status="pending" />
      <StatusBadge status="completed" />
      <StatusBadge status="failed" />
    </div>
  )
}
