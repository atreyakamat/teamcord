import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dc-bg-tertiary via-dc-bg-secondary to-dc-bg-primary text-dc-text-normal">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dc-bg-tertiary/80 backdrop-blur-lg border-b border-dc-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-dc-blurple to-dc-fuchsia flex items-center justify-center font-bold text-xl">
              TC
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-dc-blurple to-dc-fuchsia bg-clip-text text-transparent">
              TeamCord
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/features" className="text-dc-text-muted hover:text-dc-text-normal transition-colors">
              Features
            </Link>
            <Link href="/docs" className="text-dc-text-muted hover:text-dc-text-normal transition-colors">
              Docs
            </Link>
            <Link href="/pricing" className="text-dc-text-muted hover:text-dc-text-normal transition-colors">
              Pricing
            </Link>
            <Link href="/auth/login" className="text-dc-text-muted hover:text-dc-text-normal transition-colors">
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-6 py-2.5 bg-dc-blurple hover:bg-dc-blurple-dark rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8">
              <div className="inline-block px-4 py-2 bg-dc-blurple/20 rounded-full text-sm text-dc-blurple font-semibold">
                ✨ Open Source • Self-Hosted • AI-Native
              </div>

              <h1 className="text-6xl lg:text-7xl font-extrabold leading-tight">
                Discord is where your{' '}
                <span className="bg-gradient-to-r from-dc-green to-dc-yellow bg-clip-text text-transparent">
                  gaming friends
                </span>{' '}
                hang out.
              </h1>

              <h2 className="text-5xl lg:text-6xl font-extrabold leading-tight">
                This is where your{' '}
                <span className="bg-gradient-to-r from-dc-blurple to-dc-fuchsia bg-clip-text text-transparent">
                  team gets work done.
                </span>
              </h2>

              <p className="text-xl text-dc-text-muted leading-relaxed">
                A self-hosted, open-source team communication platform built for professional teams
                and agencies. All the power of Discord, none of the privacy concerns.
              </p>

              <div className="flex items-center space-x-4">
                <Link
                  href="/auth/register"
                  className="px-8 py-4 bg-dc-blurple hover:bg-dc-blurple-dark rounded-lg font-bold text-lg transition-all shadow-2xl hover:shadow-dc-blurple/50 hover:-translate-y-0.5"
                >
                  Start Free Today
                </Link>
                <Link
                  href="/docs"
                  className="px-8 py-4 bg-dc-bg-input hover:bg-dc-bg-hover rounded-lg font-semibold text-lg transition-colors"
                >
                  View Docs
                </Link>
              </div>

              <div className="flex items-center space-x-8 text-sm text-dc-text-muted">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-dc-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-dc-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>5 minute setup</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-dc-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>MIT Licensed</span>
                </div>
              </div>
            </div>

            {/* Right Column - Screenshot Placeholder */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-dc-blurple/20 to-dc-fuchsia/20 blur-3xl rounded-full"></div>
              <div className="relative bg-dc-bg-tertiary rounded-2xl p-1 shadow-2xl border border-dc-border">
                <div className="bg-dc-bg-primary rounded-xl overflow-hidden">
                  {/* Mock TeamCord Interface */}
                  <div className="flex">
                    {/* Server Rail */}
                    <div className="w-18 bg-dc-bg-tertiary border-r border-dc-border p-3 space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-dc-blurple flex items-center justify-center font-bold text-sm">TC</div>
                      <div className="w-12 h-12 rounded-full bg-dc-bg-input hover:rounded-2xl transition-all cursor-pointer"></div>
                      <div className="w-12 h-12 rounded-full bg-dc-bg-input hover:rounded-2xl transition-all cursor-pointer"></div>
                    </div>

                    {/* Channel Sidebar */}
                    <div className="w-60 bg-dc-bg-secondary border-r border-dc-border">
                      <div className="p-4 border-b border-dc-border font-bold">My Workspace</div>
                      <div className="p-2 space-y-1">
                        <div className="px-2 py-1.5 text-xs font-semibold text-dc-text-muted uppercase">Text Channels</div>
                        <div className="px-2 py-1.5 rounded hover:bg-dc-bg-hover cursor-pointer text-dc-text-muted"># general</div>
                        <div className="px-2 py-1.5 rounded bg-dc-bg-selected cursor-pointer"># team-chat</div>
                        <div className="px-2 py-1.5 rounded hover:bg-dc-bg-hover cursor-pointer text-dc-text-muted"># announcements</div>
                      </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 bg-dc-bg-primary">
                      <div className="h-12 border-b border-dc-border flex items-center px-4 font-semibold"># team-chat</div>
                      <div className="p-4 space-y-4">
                        <div className="flex space-x-3">
                          <div className="w-10 h-10 rounded-full bg-dc-blurple"></div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold">John Doe <span className="text-xs text-dc-text-muted">10:34 AM</span></div>
                            <div className="text-dc-text-muted text-sm">Hey team, check out TeamCord!</div>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <div className="w-10 h-10 rounded-full bg-dc-green"></div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold">AI Agent <span className="text-xs text-dc-text-muted">10:35 AM</span></div>
                            <div className="text-sm bg-dc-bg-input px-3 py-2 rounded inline-block">
                              <div className="text-dc-fuchsia mb-1">✨ AI Summary</div>
                              The team is discussing the new TeamCord platform...
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why TeamCord vs Discord */}
      <section className="py-20 px-6 bg-dc-bg-tertiary/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">Why Discord Fails Teams</h2>
            <p className="text-xl text-dc-text-muted">TeamCord fixes every pain point professional teams face with Discord</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                problem: 'Information is Lost',
                discord: 'No search, no wiki, decisions buried in chat',
                teamcord: 'PostgreSQL full-text search + AI-powered decision log',
                icon: '🔍',
                color: 'text-dc-red'
              },
              {
                problem: 'Privacy Nightmare',
                discord: 'Tracks all apps, shares data with government',
                teamcord: 'Self-hosted, zero telemetry, your data stays yours',
                icon: '🔒',
                color: 'text-dc-yellow'
              },
              {
                problem: 'No Client Access',
                discord: 'Give clients full server access or nothing',
                teamcord: 'Client Portals with scoped channel access',
                icon: '👥',
                color: 'text-dc-green'
              },
              {
                problem: 'No AI Assistant',
                discord: 'Pay for bots, manage API keys',
                teamcord: 'Built-in AI agent (Ollama local, free, private)',
                icon: '🤖',
                color: 'text-dc-fuchsia'
              },
              {
                problem: 'Performance Issues',
                discord: 'Electron = 300MB+ RAM, tanks FPS',
                teamcord: 'Lightweight PWA, <150MB RAM',
                icon: '⚡',
                color: 'text-dc-blurple'
              },
              {
                problem: 'Zero Support',
                discord: 'Tickets auto-closed, no human review',
                teamcord: 'Real email support with SLA',
                icon: '💬',
                color: 'text-dc-green'
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-dc-bg-secondary rounded-xl p-6 border border-dc-border hover:border-dc-blurple/50 transition-all">
                <div className={`text-4xl mb-4 ${item.color}`}>{item.icon}</div>
                <h3 className="text-xl font-bold mb-3">{item.problem}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <span className="text-dc-red mt-0.5">❌</span>
                    <div>
                      <div className="font-semibold text-dc-text-muted">Discord:</div>
                      <div className="text-dc-text-muted">{item.discord}</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-dc-green mt-0.5">✅</span>
                    <div>
                      <div className="font-semibold text-dc-blurple">TeamCord:</div>
                      <div>{item.teamcord}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-dc-text-muted">All Discord features + everything Discord should have built</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {[
              {
                title: '💬 Real-Time Messaging',
                description: 'Channels, threads, DMs with full markdown, code blocks, and emoji reactions',
                features: ['WebSocket updates', 'Message history', 'Rich formatting', 'File attachments']
              },
              {
                title: '🎥 Voice & Video',
                description: 'WebRTC-powered calls with screen sharing and HD video',
                features: ['Always-on voice channels', 'Up to 500 participants', '1080p HD video', 'Screen sharing']
              },
              {
                title: '🤖 AI Agent',
                description: 'Built-in AI assistant powered by Ollama (local, free, private)',
                features: ['/summarise threads', '/decide to log decisions', '/search the web', '/run code snippets']
              },
              {
                title: '🔍 Superior Search',
                description: 'PostgreSQL full-text search - find anything, instantly',
                features: ['Cross-workspace search', 'Filter by channel/author', 'Semantic search', 'Instant results']
              },
              {
                title: '📋 Decision Log',
                description: 'First-class log of every important decision',
                features: ['AI-powered extraction', 'Searchable archive', 'Thread to decision', 'Export options']
              },
              {
                title: '🏠 Self-Hostable',
                description: 'Run on your own infrastructure with Docker',
                features: ['5-minute setup', 'Full data control', 'Zero vendor lock-in', 'MIT licensed']
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-dc-bg-secondary rounded-xl p-8 border border-dc-border hover:shadow-xl hover:shadow-dc-blurple/10 transition-all">
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-dc-text-muted mb-6">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((item, i) => (
                    <li key={i} className="flex items-center space-x-2 text-sm">
                      <svg className="w-5 h-5 text-dc-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-dc-bg-tertiary/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-dc-text-muted">Start free, scale when you need to</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: 'Community',
                price: 'Free',
                period: 'Forever',
                description: 'Self-hosted, unlimited users, core features',
                features: [
                  'Unlimited members',
                  'Real-time messaging',
                  'Voice & video (25/call)',
                  'AI agent (Ollama local)',
                  'Full-text search',
                  'Self-managed storage',
                  'Community support',
                  'MIT licensed'
                ],
                cta: 'Download',
                highlight: false
              },
              {
                name: 'Plus',
                price: '$8',
                period: '/user/month',
                description: 'AI agent, client portals, priority support',
                features: [
                  'Everything in Community',
                  'Cloud hosted',
                  '20GB storage',
                  'AI agent (Claude API)',
                  'Voice & video (100/call)',
                  'AI semantic search',
                  'Client portals',
                  'Email support (48hr SLA)'
                ],
                cta: 'Start Free Trial',
                highlight: true
              },
              {
                name: 'Pro',
                price: '$25',
                period: '/user/month',
                description: 'SSO, advanced analytics, SLA',
                features: [
                  'Everything in Plus',
                  '100GB storage',
                  'Voice & video (500/call)',
                  'White-label branding',
                  'SSO / SAML',
                  'Advanced analytics',
                  'SIEM export',
                  'Named contact (4hr SLA)'
                ],
                cta: 'Contact Sales',
                highlight: false
              }
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`bg-dc-bg-secondary rounded-xl p-8 border ${
                  plan.highlight ? 'border-dc-blurple ring-2 ring-dc-blurple/50' : 'border-dc-border'
                } hover:shadow-xl transition-all relative`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-dc-blurple rounded-full text-sm font-bold">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center space-x-1 mb-2">
                    <span className="text-5xl font-extrabold">{plan.price}</span>
                    <span className="text-dc-text-muted">{plan.period}</span>
                  </div>
                  <p className="text-sm text-dc-text-muted">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start space-x-2 text-sm">
                      <svg className="w-5 h-5 text-dc-green flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button className={`w-full py-3 rounded-lg font-bold transition-all ${
                  plan.highlight
                    ? 'bg-dc-blurple hover:bg-dc-blurple-dark shadow-lg hover:shadow-xl'
                    : 'bg-dc-bg-input hover:bg-dc-bg-hover'
                }`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl lg:text-6xl font-bold mb-6">
            Ready to upgrade from Discord?
          </h2>
          <p className="text-xl text-dc-text-muted mb-10">
            Join professional teams who chose TeamCord for better communication
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link
              href="/auth/register"
              className="px-10 py-5 bg-dc-blurple hover:bg-dc-blurple-dark rounded-xl font-bold text-xl transition-all shadow-2xl hover:shadow-dc-blurple/50 hover:-translate-y-1"
            >
              Get Started Free
            </Link>
            <Link
              href="/docs/install"
              className="px-10 py-5 bg-dc-bg-input hover:bg-dc-bg-hover rounded-xl font-bold text-xl transition-colors"
            >
              Self-Host in 5 Minutes
            </Link>
          </div>
          <p className="mt-6 text-sm text-dc-text-muted">
            No credit card required • 14-day trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-dc-bg-tertiary border-t border-dc-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-dc-blurple to-dc-fuchsia flex items-center justify-center font-bold text-sm">
                  TC
                </div>
                <span className="text-xl font-bold">TeamCord</span>
              </div>
              <p className="text-sm text-dc-text-muted">
                Built for teams, not for gamers.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-dc-text-muted">
                <li><Link href="/features" className="hover:text-dc-text-normal transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-dc-text-normal transition-colors">Pricing</Link></li>
                <li><Link href="/docs" className="hover:text-dc-text-normal transition-colors">Documentation</Link></li>
                <li><Link href="/changelog" className="hover:text-dc-text-normal transition-colors">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-dc-text-muted">
                <li><Link href="/docs/install" className="hover:text-dc-text-normal transition-colors">Installation</Link></li>
                <li><Link href="/docs/api" className="hover:text-dc-text-normal transition-colors">API Reference</Link></li>
                <li><Link href="/community" className="hover:text-dc-text-normal transition-colors">Community</Link></li>
                <li><Link href="https://github.com/atreyakamat/teamcord" className="hover:text-dc-text-normal transition-colors">GitHub</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-dc-text-muted">
                <li><Link href="/about" className="hover:text-dc-text-normal transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-dc-text-normal transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-dc-text-normal transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-dc-text-normal transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-dc-border flex flex-col md:flex-row items-center justify-between text-sm text-dc-text-muted">
            <p>© 2026 TeamCord. Open source under MIT License.</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <Link href="https://github.com/atreyakamat/teamcord" className="hover:text-dc-text-normal transition-colors">
                GitHub
              </Link>
              <Link href="https://twitter.com/teamcord" className="hover:text-dc-text-normal transition-colors">
                Twitter
              </Link>
              <Link href="https://discord.gg/teamcord" className="hover:text-dc-text-normal transition-colors">
                Discord (ironic, we know)
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
