"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { useGateway } from "@/hooks/use-gateway";
import type { GatewayEvent, Message } from "@teamcord/types";

export default function WorkspacePage() {
  const router = useRouter();
  const {
    token,
    user,
    setUser,
    activeWorkspace,
    setActiveWorkspace,
    activeChannel,
    setActiveChannel,
    messages,
    setMessages,
    addMessage,
    logout,
  } = useAppStore();

  // Redirect if not authed
  useEffect(() => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    // Load current user
    if (!user && token) {
      api.auth.me(token).then((r) => setUser(r.data)).catch(() => {
        logout();
        router.push("/auth/login");
      });
    }
  }, [token, user, router, setUser, logout]);

  // Handle incoming gateway events
  const handleGatewayEvent = useCallback(
    (event: GatewayEvent) => {
      if (event.type === "message:create" && event.channelId === activeChannel?.id) {
        addMessage(event.payload as Message);
      }
    },
    [activeChannel, addMessage]
  );

  const { subscribe, unsubscribe, sendTyping } = useGateway(token, handleGatewayEvent);

  // Load messages when channel changes
  useEffect(() => {
    if (!activeChannel || !token) return;
    subscribe(activeChannel.id);
    api.messages
      .list(token, activeChannel.id)
      .then((r) => setMessages(r.data))
      .catch(console.error);
    return () => unsubscribe(activeChannel.id);
  }, [activeChannel, token, subscribe, unsubscribe, setMessages]);

  if (!token || !user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="workspace-layout">
      {/* Workspace sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">TC</span>
          <span>{activeWorkspace?.name ?? "TeamCord"}</span>
        </div>

        {activeWorkspace && (
          <nav className="channel-list">
            <p className="section-label">CHANNELS</p>
            {/* Channel list rendered here */}
          </nav>
        )}

        <div className="user-bar">
          <div className="user-avatar">{user.displayName[0]?.toUpperCase()}</div>
          <div className="user-info">
            <span className="user-name">{user.displayName}</span>
            <span className="user-tag">@{user.username}</span>
          </div>
          <button onClick={() => { logout(); router.push("/"); }} className="btn-icon" title="Sign out">
            ⎋
          </button>
        </div>
      </aside>

      {/* Channel view */}
      <main className="channel-view">
        {activeChannel ? (
          <>
            <div className="channel-header">
              <span className="channel-hash">#</span>
              <strong>{activeChannel.name}</strong>
              {activeChannel.description && (
                <span className="channel-desc">{activeChannel.description}</span>
              )}
            </div>
            <div className="message-list">
              {messages.map((msg) => (
                <div key={msg.id} className="message">
                  <div className="message-avatar">{msg.authorId[0]?.toUpperCase()}</div>
                  <div className="message-body">
                    <span className="message-author">{msg.authorId}</span>
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                    <p className="message-content">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <MessageInput
              channelId={activeChannel.id}
              workspaceId={activeWorkspace?.id ?? ""}
              token={token}
              onTyping={(typing) =>
                sendTyping(activeChannel.id, activeWorkspace?.id ?? "", typing)
              }
              onSent={(msg) => addMessage(msg)}
            />
          </>
        ) : (
          <div className="empty-state">
            <h2>Welcome to TeamCord</h2>
            <p>Select a channel to start collaborating</p>
          </div>
        )}
      </main>

      <style>{`
        .workspace-layout {
          display: flex;
          height: 100vh;
          background: var(--bg-primary);
        }
        .sidebar {
          width: var(--sidebar-width);
          background: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          border-bottom: 1px solid var(--border);
          font-weight: 700;
          font-size: 0.95rem;
        }
        .logo {
          width: 28px;
          height: 28px;
          background: var(--accent);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          color: white;
        }
        .channel-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }
        .section-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          padding: 0.5rem 0.5rem 0.25rem;
          letter-spacing: 0.05em;
        }
        .user-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-top: 1px solid var(--border);
          background: var(--bg-tertiary);
        }
        .user-avatar {
          width: 32px;
          height: 32px;
          background: var(--accent);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }
        .user-info {
          flex: 1;
          min-width: 0;
        }
        .user-name {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-tag {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .btn-icon {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 1rem;
          padding: 0.25rem;
          border-radius: 4px;
        }
        .btn-icon:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .channel-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .channel-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          border-bottom: 1px solid var(--border);
          background: var(--bg-primary);
        }
        .channel-hash {
          color: var(--text-muted);
          font-size: 1.25rem;
        }
        .channel-desc {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin-left: 0.5rem;
          padding-left: 0.5rem;
          border-left: 1px solid var(--border);
        }
        .message-list {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .message {
          display: flex;
          gap: 0.75rem;
          padding: 0.375rem 0.5rem;
          border-radius: 6px;
        }
        .message:hover {
          background: var(--bg-hover);
        }
        .message-avatar {
          width: 36px;
          height: 36px;
          background: var(--accent);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
        }
        .message-body {
          flex: 1;
          min-width: 0;
        }
        .message-author {
          font-weight: 600;
          font-size: 0.9rem;
          margin-right: 0.5rem;
        }
        .message-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .message-content {
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--text-primary);
          word-break: break-word;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-secondary);
          gap: 0.5rem;
        }
        .empty-state h2 {
          font-size: 1.25rem;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}

// ─── Message Input Component ──────────────────────────────────────────────────

function MessageInput({
  channelId,
  workspaceId,
  token,
  onTyping,
  onSent,
}: {
  channelId: string;
  workspaceId: string;
  token: string;
  onTyping: (typing: boolean) => void;
  onSent: (msg: Message) => void;
}) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    try {
      const result = await api.messages.send(token, channelId, {
        content: content.trim(),
      });
      onSent(result.data);
      setContent("");
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  return (
    <form onSubmit={handleSend} className="message-input-form">
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          onTyping(e.target.value.length > 0);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => onTyping(false)}
        placeholder="Message the channel… (Enter to send, Shift+Enter for newline)"
        rows={1}
        className="message-input"
        disabled={sending}
      />
      <button type="submit" disabled={!content.trim() || sending} className="send-btn">
        ➤
      </button>
      <style>{`
        .message-input-form {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--border);
          background: var(--bg-primary);
        }
        .message-input {
          flex: 1;
          padding: 0.625rem 0.875rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.9rem;
          resize: none;
          outline: none;
          max-height: 160px;
          overflow-y: auto;
          line-height: 1.5;
          transition: border-color 0.15s;
        }
        .message-input:focus {
          border-color: var(--accent);
        }
        .send-btn {
          padding: 0.625rem 0.875rem;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .send-btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .send-btn:disabled {
          opacity: 0.4;
        }
      `}</style>
    </form>
  );
}

// Import useState for the MessageInput component
import { useState } from "react";
