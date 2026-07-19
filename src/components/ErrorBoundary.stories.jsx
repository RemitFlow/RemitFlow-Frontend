import React from 'react'
import ErrorBoundary from './ErrorBoundary.jsx'

export default {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Catches render-time errors in its subtree and displays a friendly fallback UI with a reload button.'
      }
    }
  }
}

/**
 * A component that intentionally throws an error to demonstrate the ErrorBoundary.
 */
function BuggyCounter() {
  const [count, setCount] = React.useState(0)
  if (count >= 1) {
    throw new Error('Simulated render error!')
  }
  return (
    <div>
      <p>Count: {count} (will crash on next click)</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  )
}

export const Default = {
  render: () => (
    <ErrorBoundary>
      <BuggyCounter />
    </ErrorBoundary>
  )
}

export const WithHealthyChildren = {
  render: () => (
    <ErrorBoundary>
      <p style={{ padding: '1rem', background: '#f0fdf4', borderRadius: 8 }}>
        This content renders normally. No errors here!
      </p>
    </ErrorBoundary>
  )
}

export const AllExamples = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h4 style={{ marginBottom: '0.5rem' }}>Healthy content</h4>
        <ErrorBoundary>
          <p style={{ padding: '1rem', background: '#f0fdf4', borderRadius: 8 }}>
            Everything is working fine ✅
          </p>
        </ErrorBoundary>
      </div>
      <div>
        <h4 style={{ marginBottom: '0.5rem' }}>Error demo (click to trigger)</h4>
        <ErrorBoundary>
          <BuggyCounter />
        </ErrorBoundary>
      </div>
    </div>
  )
}
