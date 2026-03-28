import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "640px" }}>
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 800,
            marginBottom: "1rem",
            background: "linear-gradient(135deg, #5b7cfa, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          TeamCord
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            color: "var(--text-secondary)",
            marginBottom: "0.5rem",
          }}
        >
          Discord is where your gaming friends hang out.
        </p>
        <p
          style={{
            fontSize: "1.25rem",
            color: "var(--text-primary)",
            fontWeight: 600,
            marginBottom: "2rem",
          }}
        >
          This is where your team gets work done.
        </p>

        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginBottom: "2.5rem",
            textAlign: "left",
          }}
        >
          {[
            "🔍 Search that actually works — find any message, file, or decision instantly",
            "📋 Decision Log — so knowledge doesn't die in chat threads",
            "🔐 Client Portal — let clients see relevant channels without accessing everything",
            "🤖 Built-in AI Agent — self-hosted with Ollama, no API keys needed",
            "🏠 Self-hosted — your data, your infrastructure, forever free (community edition)",
          ].map((feature) => (
            <li
              key={feature}
              style={{
                padding: "0.75rem 1rem",
                background: "var(--bg-secondary)",
                borderRadius: "8px",
                fontSize: "0.95rem",
                border: "1px solid var(--border)",
              }}
            >
              {feature}
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link
            href="/auth/register"
            style={{
              padding: "0.875rem 2rem",
              background: "var(--accent)",
              color: "white",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "1rem",
              display: "inline-block",
            }}
          >
            Get Started Free
          </Link>
          <Link
            href="/auth/login"
            style={{
              padding: "0.875rem 2rem",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "1rem",
              border: "1px solid var(--border)",
              display: "inline-block",
            }}
          >
            Sign In
          </Link>
        </div>

        <p
          style={{
            marginTop: "2rem",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
          }}
        >
          Open source · Self-hosted · Community edition is free forever
        </p>
      </div>
    </main>
  );
}
