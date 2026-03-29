/**
 * TeamCord/Nexus - Part 2: App Pages Generator
 * Run this after generate-sources.js
 */

const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'apps', 'web', 'src');

const files = {
  // ─── Updated Layout ───────────────────────────────────────────────────────────
  'app/layout.tsx': `
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamCord — Team Communication That Actually Works",
  description:
    "Discord for professional teams. Superior search, client portals, decision logs, and a built-in AI agent.",
  manifest: "/manifest.json",
  themeColor: "#5865F2",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
`,

  // ─── Auth Login Page ──────────────────────────────────────────────────────────
  'app/auth/login/page.tsx': `
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../auth.module.css";
import api from "@/services/api";
import { useAppStore } from "@/stores/useAppStore";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);
  const setToken = useAppStore((s) => s.setToken);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { user, token } = await api.login(email, password);
      setUser(user);
      setToken(token);
      router.push("/app");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1>Welcome back!</h1>
          <p>We're so excited to see you again!</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label className="dc-label" htmlFor="email">
              EMAIL <span className={styles.required}>*</span>
            </label>
            <input
              id="email"
              type="email"
              className="dc-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label className="dc-label" htmlFor="password">
              PASSWORD <span className={styles.required}>*</span>
            </label>
            <input
              id="password"
              type="password"
              className="dc-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Link href="/auth/forgot-password" className={styles.forgotLink}>
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            className={\`dc-button dc-button-primary \${styles.submitButton}\`}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          <p className={styles.switchAuth}>
            Need an account?{" "}
            <Link href="/auth/register">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
`,

  // ─── Auth Register Page ───────────────────────────────────────────────────────
  'app/auth/register/page.tsx': `
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../auth.module.css";
import api from "@/services/api";
import { useAppStore } from "@/stores/useAppStore";

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);
  const setToken = useAppStore((s) => s.setToken);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { user, token } = await api.register(email, password, displayName);
      setUser(user);
      setToken(token);
      router.push("/app");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1>Create an account</h1>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label className="dc-label" htmlFor="email">
              EMAIL <span className={styles.required}>*</span>
            </label>
            <input
              id="email"
              type="email"
              className="dc-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label className="dc-label" htmlFor="displayName">
              DISPLAY NAME <span className={styles.required}>*</span>
            </label>
            <input
              id="displayName"
              type="text"
              className="dc-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className="dc-label" htmlFor="password">
              PASSWORD <span className={styles.required}>*</span>
            </label>
            <input
              id="password"
              type="password"
              className="dc-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className={\`dc-button dc-button-primary \${styles.submitButton}\`}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Continue"}
          </button>

          <p className={styles.terms}>
            By registering, you agree to TeamCord's{" "}
            <a href="/terms">Terms of Service</a> and{" "}
            <a href="/privacy">Privacy Policy</a>.
          </p>

          <p className={styles.switchAuth}>
            Already have an account?{" "}
            <Link href="/auth/login">Log In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
`,

  // ─── Auth Styles ──────────────────────────────────────────────────────────────
  'app/auth/auth.module.css': `
.authContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: var(--dc-bg-primary);
}

.authCard {
  width: 100%;
  max-width: 480px;
  padding: 32px;
  background: var(--dc-bg-secondary);
  border-radius: 8px;
  box-shadow: var(--dc-elevation-high);
}

.authHeader {
  text-align: center;
  margin-bottom: 24px;
}

.authHeader h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--dc-text-normal);
  margin-bottom: 8px;
}

.authHeader p {
  font-size: 16px;
  color: var(--dc-text-muted);
}

.authForm {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.formGroup {
  display: flex;
  flex-direction: column;
}

.required {
  color: var(--dc-red);
}

.error {
  padding: 10px;
  background: rgba(237, 66, 69, 0.1);
  border: 1px solid var(--dc-red);
  border-radius: 4px;
  color: var(--dc-red);
  font-size: 14px;
}

.forgotLink {
  margin-top: 4px;
  font-size: 14px;
  color: var(--dc-text-link);
}

.forgotLink:hover {
  text-decoration: underline;
}

.submitButton {
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

.switchAuth {
  font-size: 14px;
  color: var(--dc-text-muted);
  text-align: center;
}

.switchAuth a {
  color: var(--dc-text-link);
}
`,

  // ─── Main App Page ────────────────────────────────────────────────────────────
  'app/app/page.tsx': `
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./app.module.css";
import { ServerRail } from "@/components/layout/ServerRail";
import { ChannelSidebar } from "@/components/layout/ChannelSidebar";
import { MemberList } from "@/components/layout/MemberList";
import { ChatArea } from "@/components/chat/ChatArea";
import { useAppStore } from "@/stores/useAppStore";
import api from "@/services/api";
import gateway from "@/services/gateway";

export default function AppPage() {
  const router = useRouter();
  const {
    user,
    token,
    workspaces,
    currentWorkspaceId,
    channels,
    currentChannelId,
    messages,
    showMemberList,
    setUser,
    setWorkspaces,
    setCurrentWorkspace,
    setChannels,
    setCurrentChannel,
    setMessages,
    addMessage,
    toggleMemberList,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        router.push("/auth/login");
        return;
      }

      try {
        api.setToken(storedToken);
        const { data: userData } = await api.getMe();
        setUser(userData);
        
        // Connect to gateway
        gateway.connect(storedToken);
        
        // Load workspaces
        const { data: workspaceData } = await api.getWorkspaces();
        setWorkspaces(workspaceData);
        
        if (workspaceData.length > 0) {
          setCurrentWorkspace(workspaceData[0].id);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/auth/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    return () => {
      gateway.disconnect();
    };
  }, [router, setUser, setWorkspaces, setCurrentWorkspace]);

  // Load channels when workspace changes
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const loadChannels = async () => {
      try {
        const { data: channelData } = await api.getChannels(currentWorkspaceId);
        setChannels(channelData);
        
        if (channelData.length > 0 && !currentChannelId) {
          setCurrentChannel(channelData[0].id);
        }
      } catch (err) {
        console.error("Failed to load channels:", err);
      }
    };

    loadChannels();
  }, [currentWorkspaceId, currentChannelId, setChannels, setCurrentChannel]);

  // Load messages when channel changes
  useEffect(() => {
    if (!currentChannelId) return;

    const loadMessages = async () => {
      try {
        const { data: messageData } = await api.getMessages(currentChannelId);
        setMessages(currentChannelId, messageData);
        
        // Subscribe to channel updates
        gateway.subscribeChannel(currentChannelId);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    };

    loadMessages();

    return () => {
      if (currentChannelId) {
        gateway.unsubscribeChannel(currentChannelId);
      }
    };
  }, [currentChannelId, setMessages]);

  // Handle gateway events
  useEffect(() => {
    const unsubscribe = gateway.on("*", (event) => {
      switch (event.type) {
        case "message:create":
          if (event.channelId) {
            addMessage(event.channelId, event.payload as any);
          }
          break;
        case "typing:start":
          if (event.payload && typeof event.payload === "object" && "userId" in event.payload) {
            const userId = (event.payload as { userId: string }).userId;
            setTypingUsers((prev) => 
              prev.includes(userId) ? prev : [...prev, userId]
            );
            // Clear after 3 seconds
            setTimeout(() => {
              setTypingUsers((prev) => prev.filter((id) => id !== userId));
            }, 3000);
          }
          break;
        case "typing:stop":
          if (event.payload && typeof event.payload === "object" && "userId" in event.payload) {
            const userId = (event.payload as { userId: string }).userId;
            setTypingUsers((prev) => prev.filter((id) => id !== userId));
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [addMessage]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentChannelId) return;
    
    try {
      await api.sendMessage(currentChannelId, content);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }, [currentChannelId]);

  const handleEditMessage = useCallback(async (messageId: string, content: string) => {
    if (!currentChannelId) return;
    
    try {
      await api.editMessage(currentChannelId, messageId, content);
    } catch (err) {
      console.error("Failed to edit message:", err);
    }
  }, [currentChannelId]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!currentChannelId) return;
    
    try {
      await api.deleteMessage(currentChannelId, messageId);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  }, [currentChannelId]);

  const handleCreateWorkspace = useCallback(async () => {
    const name = prompt("Enter workspace name:");
    if (!name) return;
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    
    try {
      const { data: workspace } = await api.createWorkspace(name, slug);
      setWorkspaces([...workspaces, workspace]);
      setCurrentWorkspace(workspace.id);
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  }, [workspaces, setWorkspaces, setCurrentWorkspace]);

  const handleCreateChannel = useCallback(async () => {
    if (!currentWorkspaceId) return;
    
    const name = prompt("Enter channel name:");
    if (!name) return;
    
    try {
      const { data: channel } = await api.createChannel(currentWorkspaceId, name);
      setChannels([...channels, channel]);
      setCurrentChannel(channel.id);
    } catch (err) {
      console.error("Failed to create channel:", err);
    }
  }, [currentWorkspaceId, channels, setChannels, setCurrentChannel]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="dc-spinner" />
        <p>Loading TeamCord...</p>
      </div>
    );
  }

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);
  const currentChannel = channels.find((c) => c.id === currentChannelId);
  const currentMessages = currentChannelId ? messages[currentChannelId] || [] : [];

  return (
    <div className={styles.appLayout}>
      <ServerRail
        workspaces={workspaces}
        activeWorkspaceId={currentWorkspaceId}
        onWorkspaceSelect={setCurrentWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onHomeClick={() => setCurrentWorkspace(null)}
      />

      {currentWorkspace && (
        <ChannelSidebar
          workspaceName={currentWorkspace.name}
          channels={channels}
          activeChannelId={currentChannelId}
          onChannelSelect={setCurrentChannel}
          onCreateChannel={handleCreateChannel}
          currentUser={{
            displayName: user?.displayName || "User",
            status: "online",
            avatarUrl: user?.avatarUrl,
          }}
          onSettingsClick={() => {}}
        />
      )}

      {currentChannel ? (
        <>
          <ChatArea
            channelName={currentChannel.name}
            channelTopic={currentChannel.topic}
            messages={currentMessages}
            currentUserId={user?.id || ""}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onAddReaction={() => {}}
            typingUsers={typingUsers}
            onToggleMemberList={toggleMemberList}
            onSearch={() => {}}
          />
          {showMemberList && (
            <MemberList
              members={members.length > 0 ? members : [
                { id: user?.id || "1", displayName: user?.displayName || "You", status: "online", role: "owner" },
              ]}
            />
          )}
        </>
      ) : (
        <div className={styles.noChannel}>
          <h2>Welcome to TeamCord!</h2>
          <p>Select a channel to start chatting</p>
        </div>
      )}
    </div>
  );
}
`,

  // ─── App Styles ───────────────────────────────────────────────────────────────
  'app/app/app.module.css': `
.loadingContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
  background: var(--dc-bg-tertiary);
}

.loadingContainer p {
  font-size: 16px;
  color: var(--dc-text-muted);
}

.appLayout {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.noChannel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--dc-bg-primary);
  color: var(--dc-text-muted);
}

.noChannel h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--dc-text-normal);
  margin-bottom: 8px;
}
`,

  // ─── PWA Manifest ─────────────────────────────────────────────────────────────
  '../public/manifest.json': `{
  "name": "TeamCord",
  "short_name": "TeamCord",
  "description": "Team Communication That Actually Works",
  "start_url": "/app",
  "display": "standalone",
  "background_color": "#1E1F22",
  "theme_color": "#5865F2",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
`,

  // ─── Environment Example ──────────────────────────────────────────────────────
  '../.env.example': `# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3002

# App Configuration
NEXT_PUBLIC_APP_NAME=TeamCord
`,

  // ─── Next.js Config ───────────────────────────────────────────────────────────
  '../next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@teamcord/db", "@teamcord/types"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
`,

  // ─── TypeScript Path Aliases ──────────────────────────────────────────────────
  '../tsconfig.json': `{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`,

  // ─── Onboarding Page ──────────────────────────────────────────────────────────
  'app/onboarding/page.tsx': `
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./onboarding.module.css";
import api from "@/services/api";
import { useAppStore } from "@/stores/useAppStore";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setWorkspaces, setCurrentWorkspace } = useAppStore();
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (name: string) => {
    setWorkspaceName(name);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 32);
    setWorkspaceSlug(slug);
  };

  const createWorkspace = async () => {
    if (!workspaceName.trim() || !workspaceSlug.trim()) {
      setError("Please enter a workspace name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: workspace } = await api.createWorkspace(workspaceName.trim(), workspaceSlug.trim());
      await api.createChannel(workspace.id, "general", "text");
      setWorkspaces([workspace]);
      setCurrentWorkspace(workspace.id);
      router.push("/app");
    } catch (err: any) {
      setError(err.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {step === 1 && (
          <>
            <h1>Welcome to TeamCord! 👋</h1>
            <p>Hi <strong>{user?.displayName || "there"}</strong>! Let's set up your first workspace.</p>
            <button className="dc-button dc-button-primary" onClick={() => setStep(2)}>
              Create Your Workspace
            </button>
          </>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); createWorkspace(); }}>
            <h1>Create Your Workspace</h1>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.formGroup}>
              <label className="dc-label">WORKSPACE NAME</label>
              <input className="dc-input" value={workspaceName} onChange={(e) => handleNameChange(e.target.value)} placeholder="Acme Corp" autoFocus />
            </div>
            <div className={styles.formGroup}>
              <label className="dc-label">WORKSPACE URL</label>
              <input className="dc-input" value={workspaceSlug} onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
            </div>
            <div className={styles.actions}>
              <button type="button" className="dc-button dc-button-secondary" onClick={() => setStep(1)}>Back</button>
              <button type="submit" className="dc-button dc-button-primary" disabled={loading}>{loading ? "Creating..." : "Create"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
`,

  'app/onboarding/onboarding.module.css': `
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--dc-bg-primary);
}

.content {
  max-width: 480px;
  padding: 32px;
  background: var(--dc-bg-secondary);
  border-radius: 8px;
  text-align: center;
}

.content h1 {
  font-size: 24px;
  margin-bottom: 16px;
  color: var(--dc-text-normal);
}

.content p {
  color: var(--dc-text-muted);
  margin-bottom: 24px;
}

.formGroup {
  margin-bottom: 16px;
  text-align: left;
}

.error {
  padding: 10px;
  margin-bottom: 16px;
  background: rgba(237, 66, 69, 0.1);
  border: 1px solid var(--dc-red);
  border-radius: 4px;
  color: var(--dc-red);
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}
`,
};

// Create directories and write files
let fileCount = 0;
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(basePath, filePath);
  const dir = path.dirname(fullPath);
  
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n');
  fileCount++;
  console.log(\`✓ Created: \${filePath}\`);
});

console.log(\`\\n✅ Generated \${fileCount} additional files!\`);
