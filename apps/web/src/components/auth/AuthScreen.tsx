import { ArrowRight, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

export default function AuthScreen() {
  const login = useAuthStore((state) => state.login)
  const isLoading = useAuthStore((state) => state.isLoading)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    const ok = await login()
    if (!ok) {
      setError('We could not start the Keycloak login flow.')
    }
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#1d4f56_0%,#10292f_44%,#0b1c20_100%)] text-[#f6efe5]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,122,24,0.14),transparent_40%,rgba(78,159,149,0.12)_100%)]" />

      <div className="relative z-10 grid min-h-screen w-full lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between px-8 py-10 sm:px-12 lg:px-16">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#dcebe8]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff7a18] font-display text-lg text-[#10292f]">
                TC
              </span>
              TeamCord
            </Link>
          </div>

          <div className="max-w-2xl py-12">
            <div className="badge !bg-[rgba(255,255,255,0.08)] !text-[#dcebe8]">
              Secure sign-in powered by Keycloak OIDC
            </div>
            <h1 className="font-display mt-8 text-5xl leading-[0.95] text-white sm:text-6xl">
              Sign in once, then jump straight into your workspace.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#bed2ce]">
              TeamCord now uses Keycloak for authentication and session management, including OAuth callback handling and token refresh.
            </p>
          </div>

          <p className="text-sm text-[#8fb0ab]">Keep the public landing page at `/` and the live workspace at `/app`.</p>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-md rounded-[2rem] border border-[rgba(246,239,229,0.14)] bg-[rgba(8,22,25,0.82)] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8fb0ab]">Welcome back</p>
                <h2 className="font-display mt-2 text-3xl text-white">Continue with Keycloak</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(255,122,24,0.16)] text-[#ff9a52]">
                <LogIn size={22} />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a18] px-4 py-3 text-sm font-semibold text-[#10292f] transition hover:bg-[#e86e10] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? 'Redirecting...' : 'Sign in with Keycloak'}
                <ArrowRight size={16} />
              </button>

              {error && (
                <div className="rounded-2xl border border-[rgba(255,122,24,0.3)] bg-[rgba(255,122,24,0.1)] px-4 py-3 text-sm text-[#ffd5b4]">
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
