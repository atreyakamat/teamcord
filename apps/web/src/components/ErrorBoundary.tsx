import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error)
    console.error('Error info:', errorInfo)
    
    // Optional: Send to error tracking service
    if (typeof window !== 'undefined' && window.__SENTRY__) {
      window.__SENTRY__.captureException(error)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    // Hard refresh the page
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen flex-col items-center justify-center bg-[#10292f] px-6">
            <div className="rounded-[2rem] border border-[rgba(246,239,229,0.14)] bg-[rgba(8,22,25,0.72)] p-8 text-center max-w-md">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,122,24,0.16)]">
                  <AlertTriangle size={32} className="text-[#ff7a18]" />
                </div>
              </div>

              <h1 className="text-4xl font-bold text-[#f6efe5] mb-4">Oops!</h1>
              
              <p className="text-[#bfd3cf] mb-4 text-base leading-7">
                Something went wrong. We've been notified and our team will look into it.
              </p>

              {this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-[#8fb0ab] hover:text-[#dcebe8]">
                    Error details
                  </summary>
                  <pre className="mt-2 bg-[#0b1c20] p-3 rounded text-xs text-[#ff7a18] overflow-auto max-h-40">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a18] px-6 py-3 text-sm font-semibold text-[#10292f] hover:bg-[#e86e10] transition w-full"
              >
                <RefreshCw size={16} />
                Refresh Page
              </button>

              <a
                href="/"
                className="block mt-3 text-sm text-[#8fb0ab] hover:text-[#dcebe8] transition"
              >
                Return to home
              </a>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
