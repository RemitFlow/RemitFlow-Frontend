import Chart from './Chart.jsx';
import { formatAmount } from '../utils/format.js';
import Chart from './Chart.jsx'

export default {
  title: 'Components/Chart',
  component: Chart,
  tags: ['autodocs'],
  argTypes: {
    data: { control: 'object' },
    formatValue: { control: false },
  },
};

const sampleData = [
  { value: 200, label: 'amina@example.com', currency: 'USD' },
  { value: 120, label: 'GBQAZ7Z3X7...', currency: 'USD' },
  { value: 450, label: 'chidi@example.com', currency: 'USD' },
  { value: 80, label: 'devi@example.com', currency: 'USD' },
  { value: 310, label: 'emeka@example.com', currency: 'USD' },
];

export const Default = {
  args: {
    title: 'Recent Transfer Amounts',
    data: [
      { value: 200 },
      { value: 120 },
      { value: 450 },
      { value: 80 },
      { value: 310 },
    ],
  },
};
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
    title: 'Recent Transfer Amounts',
    data: sampleData,
    formatValue: (d) => formatAmount(d.value, d.currency),
  },
};
    data: [],
    title: 'Monthly Transfers'
  }
}

export const CustomEmptyState = {
  args: {
    title: 'Single Transfer',
    data: [{ value: 250, label: 'juan@example.com', currency: 'USD' }],
    formatValue: (d) => formatAmount(d.value, d.currency),
  },
};
    data: [],
    title: 'Monthly Transfers',
    emptyStateIcon: '💸',
    emptyStateTitle: 'No transfers yet',
    emptyStateMessage: 'Your first transfer will appear here.'
  }
}
