import Tooltip from './Tooltip.jsx'

export default {
  title: 'Components/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    children: { control: false }
  }
}

export const Default = {
  args: {
    text: 'This rate is locked for 2 minutes.',
    children: <span style={{ cursor: 'help', borderBottom: '1px dotted currentColor' }}>Exchange rate</span>
  }
}

export const ShortText = {
  args: {
    text: 'Copied!',
    children: <button type="button">Copy</button>
  }
}

export const LongText = {
  args: {
    text: 'Fees include a 0.5% service charge plus a flat network fee of 0.10 USD.',
    children: <span style={{ cursor: 'help', borderBottom: '1px dotted currentColor' }}>Fee breakdown</span>
  }
}

export const OnButton = {
  args: {
    text: 'Click to view your transfer history.',
    children: <button type="button" style={{ padding: '0.5rem 1rem' }}>Transfers</button>
  }
}

export const OnIcon = {
  args: {
    text: 'Your identity is verified.',
    children: (
      <span style={{ fontSize: '1.5rem', cursor: 'help' }} aria-label="Verification status">
        ✅
      </span>
    )
  }
}

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', padding: '3rem 1rem' }}>
      <Tooltip text="View available exchange rates">
        <button type="button">Rates</button>
      </Tooltip>
      <Tooltip text="Amount after fees and conversion">
        <span style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
          Recipient gets
        </span>
      </Tooltip>
      <Tooltip text="Verified ✓">
        <span style={{ fontSize: '1.5rem', cursor: 'help' }}>🛡️</span>
      </Tooltip>
    </div>
  )
}
