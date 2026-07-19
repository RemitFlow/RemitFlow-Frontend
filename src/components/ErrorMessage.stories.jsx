import ErrorMessage from './ErrorMessage.jsx'

export default {
  title: 'Components/ErrorMessage',
  component: ErrorMessage,
  tags: ['autodocs'],
  argTypes: {
    message: { control: 'text' },
    onRetry: { action: 'retried' }
  }
}

export const Default = {
  args: {
    message: 'Unable to fetch exchange rates. Please check your connection.'
  }
}

export const WithRetry = {
  args: {
    message: 'Your transfer could not be completed. The network is busy.',
    onRetry: () => alert('Retrying…')
  }
}

export const ShortMessage = {
  args: {
    message: 'Invalid amount.'
  }
}

export const LongMessage = {
  args: {
    message: 'We were unable to process your transfer due to a temporary issue with the Stellar network. Your funds have not been deducted. Please wait a few moments and try again.',
    onRetry: () => alert('Retrying…')
  }
}

export const EmptyMessage = {
  args: {
    message: ''
  }
}

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480 }}>
      <ErrorMessage message="Unable to fetch exchange rates. Please check your connection." />
      <ErrorMessage
        message="Your transfer could not be completed."
        onRetry={() => alert('Retrying…')}
      />
      <ErrorMessage
        message="The Stellar network is experiencing congestion. Your transfer is queued but may be delayed."
        onRetry={() => alert('Retrying…')}
      />
      <ErrorMessage message="" />
    </div>
  )
}
