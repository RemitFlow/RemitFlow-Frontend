import CopyButton from './CopyButton.jsx'

export default {
  title: 'Components/CopyButton',
  component: CopyButton,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
    label: { control: 'text' }
  }
}

export const Default = {
  args: {
    value: 'GAVP2...EFGH',
    label: 'Copy address'
  }
}

export const LongValue = {
  args: {
    value: 'GAVP2TO4N5HK4HXCI7EXR6AZCYGNFYZJGWOFHWX2GRMZZZ3EFGHABCD',
    label: 'Copy Stellar address'
  }
}

export const CustomLabel = {
  args: {
    value: 'https://remitflow.app/txn/abc123',
    label: 'Share link'
  }
}

export const NumericValue = {
  args: {
    value: 'NGN-1234567890',
    label: 'Copy reference number'
  }
}

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>Stellar address:</span>
        <CopyButton value="GAVP2TO4N5HK4HXCI7EXR6AZCYGNFYZJGWOFHWX2GRMZZZ3EFGHABCD" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>Transaction link:</span>
        <CopyButton value="https://stellar.expert/explorer/public/tx/abc123" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>Reference number:</span>
        <CopyButton value="REF-2024-7890" />
      </div>
    </div>
  )
}
