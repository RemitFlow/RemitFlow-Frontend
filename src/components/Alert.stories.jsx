import Alert from './Alert.jsx'

export default {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error']
    },
    title: { control: 'text' },
    children: { control: 'text' }
  }
}

export const Info = {
  args: {
    variant: 'info',
    title: 'Heads up',
    children: 'Your transfer has been queued for processing.'
  }
}

export const Success = {
  args: {
    variant: 'success',
    title: 'Transfer complete',
    children: '₦450,000.00 has been sent to Chidi Okonkwo.'
  }
}

export const Warning = {
  args: {
    variant: 'warning',
    title: 'Rate expiring',
    children: 'This quote expires in 2 minutes. Confirm now to lock the rate.'
  }
}

export const Error = {
  args: {
    variant: 'error',
    title: 'Transfer failed',
    children: 'Your bank declined the transaction. Please try a different method.'
  }
}

export const WithoutTitle = {
  args: {
    variant: 'info',
    children: 'A new exchange rate is available for USD → NGN.'
  }
}

export const AllVariants = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <Alert variant="info" title="Information">
        This is an informational message.
      </Alert>
      <Alert variant="success" title="Success">
        Operation completed successfully.
      </Alert>
      <Alert variant="warning" title="Warning">
        Please review before proceeding.
      </Alert>
      <Alert variant="error" title="Error">
        Something went wrong.
      </Alert>
    </div>
  )
}
