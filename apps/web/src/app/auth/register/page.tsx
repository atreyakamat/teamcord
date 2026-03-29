"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export default function RegisterPage() {
  const router = useRouter();
  const { setToken, setUser } = useAppStore();

  const [form, setForm] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const result = await api.auth.register(form);
        setToken(result.data.token);
        setUser(result.data.user);
        router.push("/workspace");
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Registration failed. Please try again."
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
          <h1>Create an account</h1>
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
            <label className="dc-label" htmlFor="displayName">
              DISPLAY NAME <span className="required">*</span>
            </label>
            <input
              id="displayName"
              type="text"
              className="dc-input"
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
              required
              maxLength={64}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="dc-label" htmlFor="username">
              USERNAME <span className="required">*</span>
            </label>
            <input
              id="username"
              type="text"
              className="dc-input"
              value={form.username}
              onChange={(e) =>
                setForm({ ...form, username: e.target.value.toLowerCase() })
              }
              required
              pattern="^[a-z0-9_-]+$"
              minLength={3}
              maxLength={32}
              autoComplete="username"
              placeholder="lowercase letters, numbers, - _"
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
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="dc-button dc-button-primary submit-btn"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Continue"}
          </button>

          <p className="terms">
            By registering, you agree to TeamCord's{" "}
            <a href="/terms">Terms of Service</a> and{" "}
            <a href="/privacy">Privacy Policy</a>.
          </p>

          <p className="switch-auth">
            Already have an account?{" "}
            <Link href="/auth/login">Log In</Link>
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
          margin-bottom: 16px;
          background: rgba(237, 66, 69, 0.1);
          border: 1px solid var(--dc-red);
          border-radius: 4px;
          color: var(--dc-red);
          font-size: 14px;
        }
        .submit-btn {
          width: 100%;
          height: 44px;
          margin-top: 8px;
        }
        .terms {
          font-size: 12px;
          color: var(--dc-text-muted);
          text-align: center;
        }
        .terms a {
          color: var(--dc-text-link);
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
