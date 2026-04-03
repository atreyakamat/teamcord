import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FolderKanban,
  MessageSquareText,
  Mic,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const launchPillars = [
  {
    title: 'Structured by default',
    description: 'Projects, channels, and threads keep context from collapsing into one endless scroll.',
    icon: Workflow,
  },
  {
    title: 'Self-host without drama',
    description: 'Docker-first deployment, local AI options, and data that stays under your control.',
    icon: ShieldCheck,
  },
  {
    title: 'Searchable team memory',
    description: 'Full-text search, decisions, and AI workflows help important discussions survive.',
    icon: Search,
  },
]

const featureCards = [
  {
    eyebrow: 'Messaging',
    title: 'Channels, threads, reactions, and decision flows built for async teams.',
    body: 'TeamCord keeps the familiar speed of chat while giving teams a cleaner structure for long-running work.',
    icon: MessageSquareText,
  },
  {
    eyebrow: 'AI Native',
    title: 'Summaries, decision capture, and @agent workflows live inside the product.',
    body: 'The AI layer is designed into the workspace model instead of bolted on through a third-party bot.',
    icon: Bot,
  },
  {
    eyebrow: 'Calls',
    title: 'Voice and video rooms are part of the workspace, not a separate toolchain.',
    body: 'Mediasoup and WebRTC keep the stack open, self-hostable, and ready for real-time collaboration.',
    icon: Mic,
  },
  {
    eyebrow: 'Operations',
    title: 'Built for owners who care about privacy, portability, and performance.',
    body: 'Open-source internals, infrastructure you can run yourself, and a roadmap aimed at professional teams.',
    icon: FolderKanban,
  },
]

const roadmap = [
  { phase: 'Now', title: 'Team messaging foundation', detail: 'Channels, threads, voice/video stack, AI workflows, self-hosting base.' },
  { phase: 'Next', title: 'Knowledge surfaces', detail: 'Channel wiki, richer decision log flows, stronger team memory and search.' },
  { phase: 'Later', title: 'Agency-grade expansion', detail: 'Client portals, white-labeling, and managed tiers for service businesses.' },
]

const readinessChecks = [
  'Self-hostable architecture',
  'AI-native collaboration model',
  'Structured workspace hierarchy',
  'Voice and video foundation',
]

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f6efe5_0%,#f0e6d6_48%,#efe5d4_100%)] text-[#132126]">
      <div className="landing-orb landing-orb-left" />
      <div className="landing-orb landing-orb-right" />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-16 pt-6 sm:px-8 lg:px-10">
        <header className="glass-panel sticky top-4 z-20 mb-12 flex items-center justify-between gap-4 rounded-full px-5 py-3">
          <Link to="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-[#113339] uppercase">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#113339] text-sm font-bold text-[#f6efe5]">
              TC
            </span>
            TeamCord
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-[#28444a] md:flex">
            <a href="#why" className="transition hover:text-[#0d262b]">Why</a>
            <a href="#features" className="transition hover:text-[#0d262b]">Features</a>
            <a href="#roadmap" className="transition hover:text-[#0d262b]">Roadmap</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#roadmap"
              className="hidden rounded-full border border-[#d8c7ae] px-4 py-2 text-sm font-medium text-[#16353c] transition hover:border-[#16353c] md:inline-flex"
            >
              Launch Roadmap
            </a>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-full bg-[#12373d] px-4 py-2 text-sm font-semibold text-[#f6efe5] transition hover:bg-[#0d2c31]"
            >
              Open Product Shell
              <ArrowRight size={16} />
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-24">
          <section className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="max-w-3xl">
              <div className="badge mb-6">
                Built for teams, agencies, and self-hosters who have outgrown Discord
              </div>

              <h1 className="font-display max-w-4xl text-5xl leading-[0.95] text-[#10292f] sm:text-6xl lg:text-7xl">
                Team chat that keeps the work, not just the noise.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#304b50] sm:text-xl">
                TeamCord is an AI-native, self-hostable communication platform designed for professional teams.
                It combines fast chat, structured threads, voice/video collaboration, and searchable team memory in one stack.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/app"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff7a18] px-6 py-3 text-sm font-semibold text-[#132126] transition hover:bg-[#e76d10]"
                >
                  Launch The App
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-full border border-[#cdb99d] px-6 py-3 text-sm font-semibold text-[#17363d] transition hover:border-[#17363d]"
                >
                  Explore The Product
                </a>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {readinessChecks.map((item) => (
                  <div key={item} className="glass-panel rounded-3xl p-4">
                    <div className="flex items-start gap-3 text-sm leading-6 text-[#17363d]">
                      <CheckCircle2 size={18} className="mt-1 shrink-0 text-[#ff7a18]" />
                      <span>{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="glass-panel relative overflow-hidden rounded-[2rem] p-6 shadow-[0_30px_120px_rgba(18,55,61,0.18)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff7a18_0%,#f5c76a_35%,#4e9f95_100%)]" />
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#57767b]">Launch Blueprint</p>
                  <h2 className="font-display mt-2 text-3xl text-[#112d33]">What makes TeamCord different</h2>
                </div>
                <Sparkles size={22} className="text-[#ff7a18]" />
              </div>

              <div className="space-y-4">
                {launchPillars.map(({ title, description, icon: Icon }) => (
                  <div key={title} className="rounded-3xl border border-[#dacbb8] bg-[rgba(255,255,255,0.62)] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#16353c] text-[#f8f1e7]">
                        <Icon size={20} />
                      </div>
                      <h3 className="font-display text-2xl text-[#10292f]">{title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#345156]">{description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-3xl bg-[#10292f] p-5 text-[#f6efe5]">
                <p className="text-xs uppercase tracking-[0.28em] text-[#c7d9d4]">Product Positioning</p>
                <p className="mt-3 text-lg leading-8 text-[#f2e8db]">
                  Discord is built for chatter. TeamCord is built for teams that need decisions, context, and ownership to survive after the scroll is gone.
                </p>
              </div>
            </aside>
          </section>

          <section id="why" className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-[2rem] bg-[#10292f] p-8 text-[#f6efe5]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#a9c7c1]">Why Teams Switch</p>
              <h2 className="font-display mt-3 text-4xl leading-tight">Professional work needs memory, privacy, and structure.</h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-[#d7e4df]">
                The PRD is clear about the wedge: Discord keeps teams talking, but it does not help them retain decisions,
                expose knowledge, or run communication on infrastructure they trust.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="glass-panel rounded-[2rem] p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-[#7a6660]">Search</p>
                <h3 className="font-display mt-3 text-2xl text-[#132126]">Find answers fast</h3>
                <p className="mt-3 text-sm leading-7 text-[#466268]">
                  Search, summaries, and structured threads aim at one thing: fewer decisions getting buried.
                </p>
              </div>
              <div className="glass-panel rounded-[2rem] p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-[#7a6660]">Privacy</p>
                <h3 className="font-display mt-3 text-2xl text-[#132126]">Run it on your terms</h3>
                <p className="mt-3 text-sm leading-7 text-[#466268]">
                  Self-hosting and open infrastructure give teams a path away from platform lock-in and opaque policies.
                </p>
              </div>
              <div className="glass-panel rounded-[2rem] p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-[#7a6660]">Async Work</p>
                <h3 className="font-display mt-3 text-2xl text-[#132126]">Built for how teams really work</h3>
                <p className="mt-3 text-sm leading-7 text-[#466268]">
                  Channels alone are not enough. TeamCord leans into projects, threads, and workflows that survive time zones.
                </p>
              </div>
            </div>
          </section>

          <section id="features" className="space-y-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6a5751]">Feature Map</p>
              <h2 className="font-display mt-3 text-4xl text-[#112d33]">A sharper front door for the product vision.</h2>
              <p className="mt-4 text-base leading-8 text-[#3f5b60]">
                This landing page follows the PRD closely while keeping the promise grounded in what the codebase is aiming to ship first.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {featureCards.map(({ eyebrow, title, body, icon: Icon }) => (
                <article key={title} className="glass-panel rounded-[2rem] p-7">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#755f57]">{eyebrow}</p>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#12373d] text-[#f6efe5]">
                      <Icon size={22} />
                    </div>
                  </div>
                  <h3 className="font-display mt-5 text-3xl leading-tight text-[#112d33]">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#466268]">{body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="roadmap" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] bg-[#ff7a18] p-8 text-[#132126]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#4b2b13]">Roadmap</p>
              <h2 className="font-display mt-3 text-4xl leading-tight">Ship the collaboration core first, then grow into the agency moat.</h2>
              <p className="mt-4 text-base leading-8 text-[#4d2d14]">
                The PRD roadmap is one of TeamCord's strengths: focus the launch on communication fundamentals,
                then layer in knowledge management, portals, and premium workflows.
              </p>
            </div>

            <div className="space-y-4">
              {roadmap.map((item) => (
                <div key={item.phase} className="glass-panel rounded-[2rem] p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="badge !bg-[#12373d] !text-[#f6efe5]">{item.phase}</span>
                    <ArrowRight size={18} className="hidden text-[#6d5f55] sm:block" />
                  </div>
                  <h3 className="font-display mt-4 text-2xl text-[#112d33]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#466268]">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2.5rem] bg-[#10292f] px-8 py-10 text-[#f6efe5] sm:px-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#aac8c2]">Ready To Explore</p>
                <h2 className="font-display mt-3 text-4xl leading-tight">TeamCord now has a launch page that matches the story the PRD is trying to tell.</h2>
                <p className="mt-4 text-base leading-8 text-[#d7e4df]">
                  Use the landing page as the public front door, and keep the product shell available at a dedicated app route while the remaining launch blockers are closed.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/app"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f6efe5] px-6 py-3 text-sm font-semibold text-[#10292f] transition hover:bg-[#ece2d4]"
                >
                  Open `/app`
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="#why"
                  className="inline-flex items-center justify-center rounded-full border border-[#8cb0a8] px-6 py-3 text-sm font-semibold text-[#f6efe5] transition hover:border-[#f6efe5]"
                >
                  Review The Positioning
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
