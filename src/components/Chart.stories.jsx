import Chart from './Chart.jsx';
import { formatAmount } from '../utils/format.js';

export default {
  title: 'Components/Chart',
  component: Chart,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
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

export const WithFormattedValues = {
  args: {
    title: 'Recent Transfer Amounts',
    data: sampleData,
    formatValue: (d) => formatAmount(d.value, d.currency),
  },
};

export const SingleBar = {
  args: {
    title: 'Single Transfer',
    data: [{ value: 250, label: 'juan@example.com', currency: 'USD' }],
    formatValue: (d) => formatAmount(d.value, d.currency),
  },
};
