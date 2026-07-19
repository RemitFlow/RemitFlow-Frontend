import QuoteCard from './QuoteCard.jsx'

export default {
  title: 'Components/QuoteCard',
  component: QuoteCard,
  tags: ['autodocs'],
  argTypes: {
    quote: { control: 'object' }
  }
}

const sampleQuote = {
  from: 'USD',
  to: 'NGN',
  rate: 1550.25,
  sendAmount: 450,
  fee: 2.35,
  receiveAmount: 694463.7
}

const euroQuote = {
  from: 'EUR',
  to: 'INR',
  rate: 89.5,
  sendAmount: 200,
  fee: 1.1,
  receiveAmount: 17800.8
}

const gbpQuote = {
  from: 'GBP',
  to: 'PHP',
  rate: 71.2,
  sendAmount: 100,
  fee: 0.6,
  receiveAmount: 7077.28
}

export const Default = {
  args: {
    quote: sampleQuote
  }
}

export const EURtoINR = {
  args: {
    quote: euroQuote
  }
}

export const GBPtoPHP = {
  args: {
    quote: gbpQuote
  }
}

export const SmallAmount = {
  args: {
    quote: {
      from: 'USD',
      to: 'MXN',
      rate: 18.05,
      sendAmount: 50,
      fee: 0.25,
      receiveAmount: 898.99
    }
  }
}

export const NullQuote = {
  args: {
    quote: null
  }
}

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 420 }}>
      <QuoteCard quote={sampleQuote} />
      <QuoteCard quote={euroQuote} />
      <QuoteCard quote={gbpQuote} />
      <QuoteCard quote={null} />
    </div>
  )
}
