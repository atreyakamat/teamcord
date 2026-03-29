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
        <div className="auth-header">
          <h1>Welcome back!</h1>
          <p>We're so excited to see you again!</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="dc-label" htmlFor="email">
              EMAIL <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="dc-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="dc-label" htmlFor="password">
              PASSWORD <span className="required">*</span>
            </label>
            <input
              id="password"
              type="password"
              className="dc-input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />
            <Link href="/auth/forgot-password" className="forgot-link">
              Forgot your password?
            </Link>
          </div>
          <button
            type="submit"
            className="dc-button dc-button-primary submit-btn"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
          <p className="switch-auth">
            Need an account? <Link href="/auth/register">Register</Link>
          </p>
        </form>
      </div>

      <style>{`
        .auth-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
          background: var(--dc-bg-primary);
        }
        .auth-card {
          width: 100%;
          max-width: 480px;
          padding: 32px;
          background: var(--dc-bg-secondary);
          border-radius: 8px;
          box-shadow: var(--dc-elevation-high);
        }
        .auth-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .auth-header h1 {
          font-size: 24px;
          font-weight: 600;
          color: var(--dc-text-normal);
          margin-bottom: 8px;
        }
        .auth-header p {
          font-size: 16px;
          color: var(--dc-text-muted);
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        .required {
          color: var(--dc-red);
        }
        .auth-error {
          padding: 10px;
          background: rgba(237, 66, 69, 0.1);
          border: 1px solid var(--dc-red);
          border-radius: 4px;
          color: var(--dc-red);
          font-size: 14px;
        }
        .forgot-link {
          margin-top: 4px;
          font-size: 14px;
          color: var(--dc-text-link);
        }
        .forgot-link:hover {
          text-decoration: underline;
        }
        .submit-btn {
          width: 100%;
          height: 44px;
          margin-top: 8px;
        }
        .switch-auth {
          font-size: 14px;
          color: var(--dc-text-muted);
          text-align: center;
        }
        .switch-auth a {
          color: var(--dc-text-link);
        }
      `}</style>
    </div>
  );
}
