import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-page">
      <div className="landing-content">
        <h1 className="landing-title">TeamCord</h1>
        <p className="landing-subtitle">
          Discord is where your gaming friends hang out.
        </p>
        <p className="landing-tagline">
          This is where your team gets work done.
        </p>

        <ul className="feature-list">
          {[
            "🔍 Search that actually works — find any message, file, or decision instantly",
            "📋 Decision Log — so knowledge doesn't die in chat threads",
            "🔐 Client Portal — let clients see relevant channels without accessing everything",
            "🤖 Built-in AI Agent — self-hosted with Ollama, no API keys needed",
            "🏠 Self-hosted — your data, your infrastructure, forever free",
          ].map((feature) => (
            <li key={feature} className="feature-item">
              {feature}
            </li>
          ))}
        </ul>

        <div className="button-group">
          <Link href="/auth/register" className="dc-button dc-button-primary btn-lg">
            Get Started Free
          </Link>
          <Link href="/auth/login" className="dc-button dc-button-secondary btn-lg">
            Sign In
          </Link>
        </div>

        <p className="landing-footer">
          Open source · Self-hosted · Community edition is free forever
        </p>
      </div>

      <style>{`
        .landing-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem;
          background: var(--dc-bg-primary);
          color: var(--dc-text-normal);
        }
        .landing-content {
          text-align: center;
          max-width: 640px;
        }
        .landing-title {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, var(--dc-blurple), #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .landing-subtitle {
          font-size: 1.25rem;
          color: var(--dc-text-muted);
          margin-bottom: 0.5rem;
        }
        .landing-tagline {
          font-size: 1.25rem;
          color: var(--dc-text-normal);
          font-weight: 600;
          margin-bottom: 2rem;
        }
        .feature-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 2.5rem;
          text-align: left;
        }
        .feature-item {
          padding: 0.75rem 1rem;
          background: var(--dc-bg-secondary);
          border-radius: 8px;
          font-size: 0.95rem;
          border: 1px solid var(--dc-border);
        }
        .button-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .btn-lg {
          padding: 0.875rem 2rem !important;
          min-width: 160px !important;
          font-size: 1rem !important;
        }
        .landing-footer {
          margin-top: 2rem;
          font-size: 0.8rem;
          color: var(--dc-text-muted);
        }
      `}</style>
    </main>
  );
}
