import { ArrowRight, LogIn, UserPlus } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

type AuthMode = 'login' | 'register'

export default function AuthScreen() {
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)
  const isLoading = useAuthStore((state) => state.isLoading)

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const success =
      mode === 'login'
        ? await login(email.trim(), password)
        : await register(email.trim(), username.trim(), password)

    if (!success) {
      setError(
        mode === 'login'
          ? 'We could not sign you in with those credentials.'
          : 'We could not create that TeamCord account yet.'
      )
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
            <button
              type="button"
              onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
              className="rounded-full border border-[rgba(246,239,229,0.22)] px-4 py-2 text-sm text-[#d7e4df] transition hover:border-[rgba(246,239,229,0.4)] hover:text-white"
            >
              {mode === 'login' ? 'Create account' : 'I have an account'}
            </button>
          </div>

          <div className="max-w-2xl py-12">
            <div className="badge !bg-[rgba(255,255,255,0.08)] !text-[#dcebe8]">
              Launch the workspace without leaving the browser
            </div>
            <h1 className="font-display mt-8 text-5xl leading-[0.95] text-white sm:text-6xl">
              Team chat, threads, voice, and DMs in one self-hosted workspace.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#bed2ce]">
              TeamCord now boots straight into a real account flow, creates a default workspace on
              sign-up, and gives your team text channels, voice rooms, reactions, and direct
              messages out of the box.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <FeatureCard
                title="Instant workspace"
                body="New accounts get a starter workspace with team channels ready to use."
              />
              <FeatureCard
                title="Private DMs"
                body="Open direct conversations from the member list without leaving the app shell."
              />
              <FeatureCard
                title="Voice included"
                body="Jump into voice rooms, switch on camera, or share your screen."
              />
            </div>
          </div>

          <p className="text-sm text-[#8fb0ab]">
            Keep the public landing page at `/` and the live workspace at `/app`.
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-md rounded-[2rem] border border-[rgba(246,239,229,0.14)] bg-[rgba(8,22,25,0.82)] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8fb0ab]">
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </p>
                <h2 className="font-display mt-2 text-3xl text-white">
                  {mode === 'login' ? 'Sign in to TeamCord' : 'Start your workspace'}
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(255,122,24,0.16)] text-[#ff9a52]">
                {mode === 'login' ? <LogIn size={22} /> : <UserPlus size={22} />}
              </div>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#d7e4df]">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-[rgba(246,239,229,0.12)] bg-[rgba(246,239,229,0.06)] px-4 py-3 text-[#f6efe5] outline-none transition focus:border-[#ff7a18]"
                  placeholder="you@teamcord.app"
                />
              </label>

              {mode === 'register' && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#d7e4df]">Username</span>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full rounded-2xl border border-[rgba(246,239,229,0.12)] bg-[rgba(246,239,229,0.06)] px-4 py-3 text-[#f6efe5] outline-none transition focus:border-[#ff7a18]"
                    placeholder="atrey"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#d7e4df]">Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-[rgba(246,239,229,0.12)] bg-[rgba(246,239,229,0.06)] px-4 py-3 text-[#f6efe5] outline-none transition focus:border-[#ff7a18]"
                  placeholder="At least 8 characters"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-[rgba(255,122,24,0.3)] bg-[rgba(255,122,24,0.1)] px-4 py-3 text-sm text-[#ffd5b4]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a18] px-4 py-3 text-sm font-semibold text-[#10292f] transition hover:bg-[#e86e10] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? 'Working...' : mode === 'login' ? 'Open workspace' : 'Create TeamCord account'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[rgba(246,239,229,0.12)] bg-[rgba(255,255,255,0.05)] p-4">
      <h3 className="font-display text-xl text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-[#b9cdc9]">{body}</p>
    </div>
  )
}
