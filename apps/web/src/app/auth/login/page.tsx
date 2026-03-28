"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setUser } = useAppStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const result = await api.auth.login(form);
        setToken(result.data.token);
        setUser(result.data.user);
        router.push("/workspace");
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Login failed. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [form, router, setToken, setUser]
  );

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to your TeamCord account</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register">Create one</Link>
        </p>
      </div>

      <style>{`
        .auth-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: var(--bg-tertiary);
          padding: 1rem;
        }
        .auth-card {
          width: 100%;
          max-width: 400px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 2rem;
        }
        .auth-card h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        .auth-subtitle {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }
        .auth-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--danger);
          color: var(--danger);
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 0.375rem;
          color: var(--text-secondary);
        }
        .form-group input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .form-group input:focus {
          border-color: var(--accent);
        }
        .btn-primary {
          width: 100%;
          padding: 0.75rem;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          margin-top: 0.5rem;
          transition: background 0.15s;
        }
        .btn-primary:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .btn-primary:disabled {
          opacity: 0.7;
        }
        .auth-footer {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
