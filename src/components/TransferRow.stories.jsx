import TransferRow from './TransferRow.jsx'

export default {
  title: 'Components/TransferRow',
  component: TransferRow,
  tags: ['autodocs'],
  argTypes: {
    transfer: { control: 'object' }
  }
}

const sampleTransfer = {
  recipient: 'GAVP2TO4N5HK4HXCI7EXR6AZCYGNFYZJGWOFHWX2GRMZZZ3EFGH',
  from: 'USD',
  to: 'NGN',
  sendAmount: 450,
  receiveAmount: 694463.7,
  status: 'completed',
  createdAt: '2026-07-15T10:30:00Z'
}

const pendingTransfer = {
  recipient: 'GDJ7X2F3N5HK4HXCI7EXR6AZCYGNFYZJGWOFHWX2GRMZZZ3ABCD',
  from: 'EUR',
  to: 'INR',
  sendAmount: 200,
  receiveAmount: 17800.8,
  status: 'pending',
  createdAt: '2026-07-18T08:15:00Z'
}

const failedTransfer = {
  recipient: 'GCB5P3M8N5HK4HXCI7EXR6AZCYGNFYZJGWOFHWX2GRMZZZ3WXYZ',
  from: 'USD',
  to: 'PHP',
  sendAmount: 150,
  receiveAmount: 8302.5,
  status: 'failed',
  createdAt: '2026-07-17T14:20:00Z'
}

export const Completed = {
  args: {
    transfer: sampleTransfer
  }
}

export const Pending = {
  args: {
    transfer: pendingTransfer
  }
}

export const Failed = {
  args: {
    transfer: failedTransfer
  }
}

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 780 }}>
      <TransferRow transfer={sampleTransfer} />
      <TransferRow transfer={pendingTransfer} />
      <TransferRow transfer={failedTransfer} />
    </div>
  )
}
