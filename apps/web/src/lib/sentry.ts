import * as Sentry from "@sentry/react"

export const initSentry = () => {
  // Only initialize in production
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    })
    
    console.log('✅ Sentry monitoring initialized')
  } else if (!import.meta.env.PROD) {
    console.log('ℹ️  Sentry disabled in development (set VITE_SENTRY_DSN to enable)')
  }
}

// Re-export commonly used Sentry functions
export { Sentry }
export const captureException = Sentry.captureException
export const captureMessage = Sentry.captureMessage
