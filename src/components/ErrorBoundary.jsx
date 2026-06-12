import { Component } from 'react'
import './ErrorBoundary.css'

/**
 * Catches render-time errors in its subtree and shows a friendly fallback
 * instead of unmounting the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
    this.handleReload = this.handleReload.bind(this)
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // In production this would report to an error-tracking service.
    console.error('Unhandled UI error:', error, info)
  }

  handleReload() {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <h2 className="error-boundary-title">Something went wrong</h2>
          <p className="error-boundary-message">
            An unexpected error occurred. Please reload the page and try again.
          </p>
          <button
            type="button"
            className="error-boundary-button"
            onClick={this.handleReload}
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
