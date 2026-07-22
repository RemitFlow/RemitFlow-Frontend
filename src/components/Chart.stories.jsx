import Chart from './Chart.jsx'

export default {
  title: 'Components/Chart',
  component: Chart,
  tags: ['autodocs'],
  argTypes: {
    data: { control: 'object' },
    title: { control: 'text' },
    emptyStateIcon: { control: 'text' },
    emptyStateTitle: { control: 'text' },
    emptyStateMessage: { control: 'text' }
  }
}

export const Default = {
  args: {
    data: [{ value: 10 }, { value: 20 }, { value: 15 }, { value: 30 }],
    title: 'Monthly Transfers'
  }
}

export const Empty = {
  args: {
    data: [],
    title: 'Monthly Transfers'
  }
}

export const CustomEmptyState = {
  args: {
    data: [],
    title: 'Monthly Transfers',
    emptyStateIcon: '💸',
    emptyStateTitle: 'No transfers yet',
    emptyStateMessage: 'Your first transfer will appear here.'
  }
}
