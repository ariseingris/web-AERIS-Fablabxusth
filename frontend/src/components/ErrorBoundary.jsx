import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40, textAlign: 'center',
          color: '#f87171', fontFamily: 'Inter, sans-serif',
          minHeight: '100vh', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#0a1a12',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: '#f0fdf4', marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #065f46, #10b981)',
              color: 'white', cursor: 'pointer', fontSize: 14,
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
