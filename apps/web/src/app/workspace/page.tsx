"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { useGateway } from "@/hooks/use-gateway";
import type { GatewayEvent, Message, Channel, Workspace } from "@teamcord/types";

// ─── Discord-like Full App Layout ─────────────────────────────────────────────

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

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showMemberList, setShowMemberList] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authed
  useEffect(() => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    
    const initApp = async () => {
      try {
        // Load current user
        if (!user) {
          const userResult = await api.auth.me(token);
          setUser(userResult.data);
        }
        
        // Load workspaces
        const wsResult = await api.workspaces.list(token);
        setWorkspaces(wsResult.data);
        
        // Set first workspace as active if none selected
        if (wsResult.data.length > 0 && !activeWorkspace) {
          setActiveWorkspace(wsResult.data[0]);
        }
      } catch (err) {
        console.error("Init failed:", err);
        logout();
        router.push("/auth/login");
      } finally {
        setIsLoading(false);
      }
    };
    
    initApp();
  }, [token, user, activeWorkspace, router, setUser, setActiveWorkspace, logout]);

  // Load channels when workspace changes
  useEffect(() => {
    if (!activeWorkspace || !token) return;
    
    api.channels.list(token, activeWorkspace.id)
      .then((r) => {
        setChannels(r.data);
        // Auto-select first channel
        if (r.data.length > 0 && !activeChannel) {
          setActiveChannel(r.data[0]);
        }
      })
      .catch(console.error);
  }, [activeWorkspace, token, activeChannel, setActiveChannel]);

  // Handle incoming gateway events
  const handleGatewayEvent = useCallback(
    (event: GatewayEvent) => {
      if (event.type === "message:create" && event.channelId === activeChannel?.id) {
        addMessage(event.payload as Message);
      }
      if (event.type === "typing:start" && event.channelId === activeChannel?.id) {
        const userId = (event.payload as { userId: string }).userId;
        setTypingUsers((prev) => prev.includes(userId) ? prev : [...prev, userId]);
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== userId));
        }, 3000);
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

  if (isLoading || !token || !user) {
    return (
      <div className="loading-container">
        <div className="dc-spinner" />
        <p>Loading TeamCord...</p>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            gap: 16px;
            background: var(--dc-bg-tertiary);
          }
          .loading-container p {
            font-size: 16px;
            color: var(--dc-text-muted);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Server Rail - Workspace Icons */}
      <ServerRail
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspace?.id || null}
        onWorkspaceSelect={(ws) => setActiveWorkspace(ws)}
        onCreateWorkspace={() => {
          const name = prompt("Enter workspace name:");
          if (name) {
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            api.workspaces.create(token, { name, slug })
              .then((r) => {
                setWorkspaces([...workspaces, r.data]);
                setActiveWorkspace(r.data);
              })
              .catch(console.error);
          }
        }}
        onHomeClick={() => setActiveWorkspace(null)}
      />

      {/* Channel Sidebar */}
      {activeWorkspace && (
        <ChannelSidebar
          workspaceName={activeWorkspace.name}
          channels={channels}
          activeChannelId={activeChannel?.id || null}
          onChannelSelect={(ch) => setActiveChannel(ch)}
          onCreateChannel={() => {
            const name = prompt("Enter channel name:");
            if (name) {
              api.channels.create(token, {
                workspaceId: activeWorkspace.id,
                name,
                type: "text",
              })
                .then((r) => {
                  setChannels([...channels, r.data]);
                  setActiveChannel(r.data);
                })
                .catch(console.error);
            }
          }}
          currentUser={{
            displayName: user.displayName,
            status: "online",
            avatarUrl: user.avatarUrl,
          }}
          onSettingsClick={() => {}}
          onLogout={() => { logout(); router.push("/"); }}
        />
      )}

      {/* Main Chat Area */}
      {activeChannel ? (
        <>
          <ChatArea
            channelName={activeChannel.name}
            channelTopic={activeChannel.description}
            messages={messages}
            currentUserId={user.id}
            onSendMessage={(content) => {
              api.messages.send(token, activeChannel.id, { content })
                .then((r) => addMessage(r.data))
                .catch(console.error);
            }}
            typingUsers={typingUsers}
            onToggleMemberList={() => setShowMemberList(!showMemberList)}
            onTyping={(typing) => sendTyping(activeChannel.id, activeWorkspace?.id || "", typing)}
          />
          {showMemberList && (
            <MemberList
              members={[
                { id: user.id, displayName: user.displayName, status: "online", role: "owner", avatarUrl: user.avatarUrl },
              ]}
            />
          )}
        </>
      ) : (
        <div className="no-channel">
          <h2>Welcome to TeamCord!</h2>
          <p>Select a workspace and channel to start chatting</p>
        </div>
      )}

      <style>{`
        .app-layout {
          display: flex;
          width: 100%;
          height: 100vh;
          overflow: hidden;
        }
        .no-channel {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--dc-bg-primary);
          color: var(--dc-text-muted);
        }
        .no-channel h2 {
          font-size: 24px;
          font-weight: 600;
          color: var(--dc-text-normal);
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER RAIL COMPONENT - Workspace icons on the left
// ═══════════════════════════════════════════════════════════════════════════════

interface ServerRailProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onWorkspaceSelect: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
  onHomeClick: () => void;
}

function ServerRail({
  workspaces,
  activeWorkspaceId,
  onWorkspaceSelect,
  onCreateWorkspace,
  onHomeClick,
}: ServerRailProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <nav className="server-rail" aria-label="Workspaces">
      {/* Home / DMs Button */}
      <div className="sr-section">
        <button
          className={`sr-button sr-home ${activeWorkspaceId === null ? "sr-active" : ""}`}
          onClick={onHomeClick}
          onMouseEnter={() => setHoveredId("home")}
          onMouseLeave={() => setHoveredId(null)}
          aria-label="Direct Messages"
        >
          <svg width="28" height="20" viewBox="0 0 28 20" fill="currentColor">
            <path d="M23.0212 1.67671C21.3107 0.879656 19.5079 0.318797 17.6584 0C17.4062 0.461742 17.1749 0.934541 16.9708 1.4184C15.003 1.12145 12.9974 1.12145 11.0283 1.4184C10.8233 0.934541 10.592 0.461742 10.3389 0C8.48994 0.317742 6.68659 0.878138 4.97617 1.67529C1.42065 6.77862 0.351166 11.7557 0.886097 16.654C3.18014 18.3893 5.89287 19.5958 8.75439 20.089C9.33337 19.3173 9.84921 18.4969 10.2962 17.635C9.47714 17.3253 8.68929 16.9477 7.93871 16.5086C8.13605 16.3696 8.32939 16.2255 8.51702 16.0814C12.7505 18.0493 17.3049 18.0493 21.4846 16.0814C21.6731 16.2255 21.8664 16.3696 22.0629 16.5086C21.3131 16.9477 20.5252 17.3253 19.7062 17.635C20.1524 18.4969 20.6682 19.3173 21.2472 20.089C24.1087 19.5958 26.8214 18.3893 29.1155 16.654C29.7509 10.9372 28.1 6.01014 23.0212 1.67671Z" />
          </svg>
        </button>
        <div className="sr-separator" />
      </div>

      {/* Workspace List */}
      <div className="sr-workspace-list">
        {workspaces.map((workspace) => (
          <div key={workspace.id} className="sr-item">
            {activeWorkspaceId === workspace.id && <div className="sr-active-pill" />}
            {hoveredId === workspace.id && activeWorkspaceId !== workspace.id && (
              <div className="sr-hover-pill" />
            )}
            <button
              className={`sr-button ${activeWorkspaceId === workspace.id ? "sr-active" : ""}`}
              onClick={() => onWorkspaceSelect(workspace)}
              onMouseEnter={() => setHoveredId(workspace.id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-label={workspace.name}
              title={workspace.name}
            >
              {workspace.icon ? (
                <img src={workspace.icon} alt={workspace.name} className="sr-icon" />
              ) : (
                <span className="sr-initial">{workspace.name.charAt(0).toUpperCase()}</span>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Add Server Button */}
      <div className="sr-section">
        <div className="sr-separator" />
        <button
          className="sr-button sr-add"
          onClick={onCreateWorkspace}
          onMouseEnter={() => setHoveredId("add")}
          onMouseLeave={() => setHoveredId(null)}
          aria-label="Create Workspace"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 5h-2v6H5v2h6v6h2v-6h6v-2h-6V5z" />
          </svg>
        </button>
      </div>

      <style>{`
        .server-rail {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: var(--server-rail-width);
          height: 100%;
          padding: 12px 0;
          background: var(--dc-bg-tertiary);
          overflow-y: auto;
          overflow-x: hidden;
        }
        .sr-section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sr-separator {
          width: 32px;
          height: 2px;
          margin: 8px 0;
          background: var(--dc-border);
          border-radius: 1px;
        }
        .sr-workspace-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          overflow-y: auto;
        }
        .sr-item {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .sr-active-pill, .sr-hover-pill {
          position: absolute;
          left: 0;
          width: 8px;
          background: var(--dc-text-normal);
          border-radius: 0 4px 4px 0;
          transition: height 200ms ease;
        }
        .sr-active-pill { height: 40px; }
        .sr-hover-pill { height: 20px; }
        .sr-button {
          width: 48px;
          height: 48px;
          border-radius: 24px;
          background: var(--dc-bg-primary);
          color: var(--dc-status-online);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-radius 100ms ease, background 100ms ease;
          cursor: pointer;
          border: none;
          overflow: hidden;
        }
        .sr-button:hover {
          border-radius: 16px;
          background: var(--dc-blurple);
          color: white;
        }
        .sr-button.sr-active {
          border-radius: 16px;
        }
        .sr-home {
          color: var(--dc-text-normal);
        }
        .sr-home.sr-active {
          background: var(--dc-blurple);
          color: white;
        }
        .sr-add {
          color: var(--dc-status-online);
        }
        .sr-add:hover {
          background: var(--dc-status-online);
          color: white;
        }
        .sr-icon {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .sr-initial {
          font-size: 18px;
          font-weight: 500;
          color: inherit;
        }
      `}</style>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ChannelSidebarProps {
  workspaceName: string;
  channels: Channel[];
  activeChannelId: string | null;
  onChannelSelect: (channel: Channel) => void;
  onCreateChannel: () => void;
  currentUser: {
    displayName: string;
    status: "online" | "idle" | "dnd" | "offline";
    avatarUrl?: string | null;
  };
  onSettingsClick: () => void;
  onLogout: () => void;
}

function ChannelSidebar({
  workspaceName,
  channels,
  activeChannelId,
  onChannelSelect,
  onCreateChannel,
  currentUser,
  onSettingsClick,
  onLogout,
}: ChannelSidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const textChannels = channels.filter((c) => c.type === "text" || c.type === "announcement");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  const ChannelIcon = ({ type }: { type: string }) => {
    if (type === "voice") {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 8.00004H3C2.45 8.00004 2 8.45004 2 9.00004V15C2 15.55 2.45 16 3 16H6L10.293 20.704C10.579 20.99 11.009 21.075 11.383 20.921C11.757 20.767 12 20.404 12 20V4.00004C12 3.59604 11.757 3.23304 11.383 3.07904Z"/>
        </svg>
      );
    }
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41001 9L8.35001 15H14.35L15.41 9H9.41001Z"/>
      </svg>
    );
  };

  const StatusDot = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      online: "var(--dc-status-online)",
      idle: "var(--dc-status-idle)",
      dnd: "var(--dc-status-dnd)",
      offline: "var(--dc-status-offline)",
    };
    return (
      <div className="cs-status-dot" style={{ background: colors[status] || colors.offline }} />
    );
  };

  return (
    <div className="channel-sidebar">
      {/* Workspace Header */}
      <div className="cs-workspace-header">
        <h2 className="cs-workspace-name">{workspaceName}</h2>
        <button className="cs-dropdown-button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
        </button>
      </div>

      {/* Channel List */}
      <div className="cs-channel-list">
        {/* Text Channels */}
        <div className="cs-category">
          <button
            className="cs-category-header"
            onClick={() => setCollapsed((c) => ({ ...c, text: !c.text }))}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ transform: collapsed.text ? "rotate(-90deg)" : "none" }}
            >
              <path d="M7 10l5 5 5-5H7z" />
            </svg>
            <span>TEXT CHANNELS</span>
            <button
              className="cs-add-channel-btn"
              onClick={(e) => {
                e.stopPropagation();
                onCreateChannel();
              }}
              title="Create Channel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 5h-2v6H5v2h6v6h2v-6h6v-2h-6V5z" />
              </svg>
            </button>
          </button>
          {!collapsed.text && (
            <div className="cs-channel-items">
              {textChannels.map((channel) => (
                <button
                  key={channel.id}
                  className={`cs-channel-item ${activeChannelId === channel.id ? "cs-active" : ""}`}
                  onClick={() => onChannelSelect(channel)}
                >
                  <ChannelIcon type={channel.type} />
                  <span className="cs-channel-name">{channel.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Voice Channels */}
        {voiceChannels.length > 0 && (
          <div className="cs-category">
            <button
              className="cs-category-header"
              onClick={() => setCollapsed((c) => ({ ...c, voice: !c.voice }))}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ transform: collapsed.voice ? "rotate(-90deg)" : "none" }}
              >
                <path d="M7 10l5 5 5-5H7z" />
              </svg>
              <span>VOICE CHANNELS</span>
            </button>
            {!collapsed.voice && (
              <div className="cs-channel-items">
                {voiceChannels.map((channel) => (
                  <button
                    key={channel.id}
                    className={`cs-channel-item ${activeChannelId === channel.id ? "cs-active" : ""}`}
                    onClick={() => onChannelSelect(channel)}
                  >
                    <ChannelIcon type={channel.type} />
                    <span className="cs-channel-name">{channel.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Panel */}
      <div className="cs-user-panel">
        <div className="cs-user-info">
          <div className="cs-avatar-wrapper">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="cs-avatar" />
            ) : (
              <div className="cs-avatar-fallback">
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <StatusDot status={currentUser.status} />
          </div>
          <div className="cs-user-text">
            <div className="cs-user-name">{currentUser.displayName}</div>
            <div className="cs-user-status">{currentUser.status}</div>
          </div>
        </div>
        <div className="cs-user-actions">
          <button className="cs-icon-button" title="Mute">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
              <path d="M19 10v1a7 7 0 0 1-14 0v-1H3v1a9 9 0 0 0 8 8.94V22h2v-2.06A9 9 0 0 0 21 11v-1h-2z"/>
            </svg>
          </button>
          <button className="cs-icon-button" title="Settings" onClick={onSettingsClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
          <button className="cs-icon-button" title="Log Out" onClick={onLogout}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z"/>
              <path d="M20 3H9c-1.1 0-2 .9-2 2v4h2V5h11v14H9v-4H7v4c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .channel-sidebar {
          display: flex;
          flex-direction: column;
          width: var(--channel-sidebar-width);
          height: 100%;
          background: var(--dc-bg-secondary);
        }
        .cs-workspace-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: var(--header-height);
          padding: 0 16px;
          border-bottom: 1px solid var(--dc-bg-tertiary);
          cursor: pointer;
          transition: background 100ms ease;
        }
        .cs-workspace-header:hover {
          background: var(--dc-bg-hover);
        }
        .cs-workspace-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--dc-text-normal);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cs-dropdown-button {
          color: var(--dc-text-normal);
          padding: 4px;
          background: none;
          border: none;
          cursor: pointer;
        }
        .cs-channel-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 8px;
        }
        .cs-category {
          margin-top: 16px;
        }
        .cs-category-header {
          display: flex;
          align-items: center;
          gap: 4px;
          width: 100%;
          padding: 0 8px;
          color: var(--dc-text-muted);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          cursor: pointer;
          background: none;
          border: none;
        }
        .cs-category-header:hover {
          color: var(--dc-text-normal);
        }
        .cs-category-header svg {
          transition: transform 100ms ease;
        }
        .cs-category-header span {
          flex: 1;
          text-align: left;
        }
        .cs-add-channel-btn {
          padding: 2px;
          color: var(--dc-text-muted);
          opacity: 0;
          transition: opacity 100ms ease;
          background: none;
          border: none;
          cursor: pointer;
        }
        .cs-category-header:hover .cs-add-channel-btn {
          opacity: 1;
        }
        .cs-add-channel-btn:hover {
          color: var(--dc-text-normal);
        }
        .cs-channel-items {
          margin-top: 4px;
        }
        .cs-channel-item {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding: 6px 8px;
          border-radius: 4px;
          color: var(--dc-channel-icon);
          font-size: 16px;
          cursor: pointer;
          transition: background 100ms ease, color 100ms ease;
          background: none;
          border: none;
          text-align: left;
        }
        .cs-channel-item:hover {
          background: var(--dc-bg-hover);
          color: var(--dc-interactive-hover);
        }
        .cs-channel-item.cs-active {
          background: var(--dc-bg-selected);
          color: var(--dc-interactive-active);
        }
        .cs-channel-item svg {
          flex-shrink: 0;
          color: inherit;
        }
        .cs-channel-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cs-user-panel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: var(--user-panel-height);
          padding: 0 8px;
          background: var(--dc-bg-floating);
        }
        .cs-user-info {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .cs-avatar-wrapper {
          position: relative;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }
        .cs-avatar, .cs-avatar-fallback {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }
        .cs-avatar {
          object-fit: cover;
        }
        .cs-avatar-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--dc-blurple);
          color: white;
          font-size: 14px;
          font-weight: 500;
        }
        .cs-status-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 3px solid var(--dc-bg-floating);
        }
        .cs-user-text {
          min-width: 0;
        }
        .cs-user-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--dc-text-normal);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cs-user-status {
          font-size: 12px;
          color: var(--dc-text-muted);
          text-transform: capitalize;
        }
        .cs-user-actions {
          display: flex;
          gap: 4px;
        }
        .cs-icon-button {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          color: var(--dc-interactive-normal);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 100ms ease, color 100ms ease;
          background: none;
          border: none;
          cursor: pointer;
        }
        .cs-icon-button:hover {
          background: var(--dc-bg-hover);
          color: var(--dc-interactive-hover);
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT AREA COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ChatAreaProps {
  channelName: string;
  channelTopic?: string | null;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  typingUsers?: string[];
  onToggleMemberList: () => void;
  onTyping: (typing: boolean) => void;
}

function ChatArea({
  channelName,
  channelTopic,
  messages,
  currentUserId,
  onSendMessage,
  typingUsers = [],
  onToggleMemberList,
  onTyping,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (trimmed) {
      onSendMessage(trimmed);
      setContent("");
      onTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${timeStr}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${timeStr}`;
    } else {
      return `${date.toLocaleDateString()} ${timeStr}`;
    }
  };

  // Group messages by author and time
  const groupedMessages = messages.reduce<Message[][]>((groups, message, index) => {
    const prevMessage = messages[index - 1];
    const timeDiff = prevMessage
      ? new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()
      : Infinity;
    const sameAuthor = prevMessage?.authorId === message.authorId;
    const withinTimeThreshold = timeDiff < 5 * 60 * 1000;

    if (sameAuthor && withinTimeThreshold && groups.length > 0) {
      groups[groups.length - 1].push(message);
    } else {
      groups.push([message]);
    }
    return groups;
  }, []);

  return (
    <div className="chat-area">
      {/* Header */}
      <header className="ca-header">
        <div className="ca-header-left">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="ca-hash-icon">
            <path d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41001 9L8.35001 15H14.35L15.41 9H9.41001Z"/>
          </svg>
          <h1 className="ca-channel-name">{channelName}</h1>
          {channelTopic && (
            <>
              <div className="ca-divider" />
              <p className="ca-channel-topic">{channelTopic}</p>
            </>
          )}
        </div>
        <div className="ca-header-actions">
          <button className="ca-header-button" title="Members" onClick={onToggleMemberList}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 8.00598C14 10.211 12.206 12.006 10 12.006C7.795 12.006 6 10.211 6 8.00598C6 5.80098 7.794 4.00598 10 4.00598C12.206 4.00598 14 5.80098 14 8.00598ZM2 19.006C2 15.473 5.29 13.006 10 13.006C14.711 13.006 18 15.473 18 19.006V20.006H2V19.006Z"/>
              <path d="M18 17.006V20.006H22V18.006C22 15.579 19.791 13.806 16.8 13.267C17.561 14.343 18 15.619 18 17.006Z"/>
              <path d="M18 5.00598C19.657 5.00598 21 6.34898 21 8.00598C21 9.66298 19.657 11.006 18 11.006C17.6 11.006 17.218 10.935 16.861 10.809C17.568 9.97698 18 8.93998 18 7.80598C18 6.67198 17.568 5.63498 16.861 4.80298C17.218 4.67698 17.6 4.60598 18 4.60598V5.00598Z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="ca-messages-container">
        <div className="ca-welcome-message">
          <div className="ca-welcome-icon">
            <svg width="68" height="68" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41001 9L8.35001 15H14.35L15.41 9H9.41001Z"/>
            </svg>
          </div>
          <h2>Welcome to #{channelName}!</h2>
          <p>This is the start of the #{channelName} channel.</p>
        </div>

        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex} className="ca-message-group">
            {group.map((message, messageIndex) => (
              <div
                key={message.id}
                className={`ca-message ${messageIndex === 0 ? "ca-first-in-group" : ""}`}
              >
                {messageIndex === 0 ? (
                  <>
                    <div className="ca-avatar">
                      <div className="ca-avatar-fallback">
                        {message.authorId.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="ca-message-content">
                      <div className="ca-message-header">
                        <span className="ca-author-name">{message.authorId}</span>
                        <span className="ca-timestamp">{formatTime(message.createdAt)}</span>
                      </div>
                      <div className="ca-message-text">{message.content}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="ca-compact-timestamp">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="ca-message-content">
                      <div className="ca-message-text">{message.content}</div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="ca-typing-indicator">
          <div className="ca-typing-dots">
            <span className="dc-typing-dot" />
            <span className="dc-typing-dot" />
            <span className="dc-typing-dot" />
          </div>
          <span>
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.length} people are typing...`}
          </span>
        </div>
      )}

      {/* Input */}
      <div className="ca-input-container">
        <div className="ca-input-wrapper">
          <button className="ca-attach-button" title="Upload a file">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a1 1 0 0 1 1 1v8h8a1 1 0 1 1 0 2h-8v8a1 1 0 1 1-2 0v-8H3a1 1 0 1 1 0-2h8V3a1 1 0 0 1 1-1z" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            className="ca-textarea"
            placeholder={`Message #${channelName}`}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              onTyping(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <div className="ca-action-buttons">
            <button className="ca-action-button" title="Select emoji">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-5.523 0-10-4.477-10-10S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-3.5-8c.828 0 1.5-.672 1.5-1.5S9.328 11 8.5 11 7 11.672 7 12.5 7.672 14 8.5 14zm7 0c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm-3.5 4c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .chat-area {
          display: flex;
          flex-direction: column;
          flex: 1;
          height: 100%;
          background: var(--dc-bg-primary);
          min-width: 0;
        }
        .ca-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: var(--header-height);
          padding: 0 16px;
          border-bottom: 1px solid var(--dc-bg-tertiary);
          flex-shrink: 0;
        }
        .ca-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .ca-hash-icon {
          color: var(--dc-channel-icon);
          flex-shrink: 0;
        }
        .ca-channel-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--dc-text-normal);
        }
        .ca-divider {
          width: 1px;
          height: 24px;
          background: var(--dc-border);
          margin: 0 8px;
        }
        .ca-channel-topic {
          font-size: 14px;
          color: var(--dc-text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ca-header-actions {
          display: flex;
          gap: 4px;
        }
        .ca-header-button {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          color: var(--dc-interactive-normal);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 100ms ease;
          background: none;
          border: none;
          cursor: pointer;
        }
        .ca-header-button:hover {
          color: var(--dc-interactive-hover);
        }
        .ca-messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px 0;
        }
        .ca-welcome-message {
          padding: 16px 16px 24px;
          margin-bottom: 16px;
        }
        .ca-welcome-icon {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: var(--dc-bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          color: var(--dc-text-normal);
        }
        .ca-welcome-message h2 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          color: var(--dc-text-normal);
        }
        .ca-welcome-message p {
          font-size: 16px;
          color: var(--dc-text-muted);
        }
        .ca-message-group {
          margin-top: 16px;
        }
        .ca-message-group:first-child {
          margin-top: 0;
        }
        .ca-message {
          position: relative;
          display: flex;
          padding: 2px 16px 2px 72px;
          min-height: 22px;
        }
        .ca-message:hover {
          background: var(--dc-bg-message-hover);
        }
        .ca-first-in-group {
          padding-top: 16px;
          margin-top: 16px;
        }
        .ca-avatar {
          position: absolute;
          left: 16px;
          top: 16px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          cursor: pointer;
        }
        .ca-avatar-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--dc-blurple);
          color: white;
          font-size: 16px;
          font-weight: 500;
        }
        .ca-message-content {
          flex: 1;
          min-width: 0;
        }
        .ca-message-header {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 2px;
        }
        .ca-author-name {
          font-size: 16px;
          font-weight: 500;
          color: var(--dc-text-normal);
          cursor: pointer;
        }
        .ca-author-name:hover {
          text-decoration: underline;
        }
        .ca-timestamp {
          font-size: 12px;
          color: var(--dc-text-muted);
        }
        .ca-compact-timestamp {
          position: absolute;
          left: 16px;
          width: 48px;
          font-size: 11px;
          color: transparent;
          text-align: right;
        }
        .ca-message:hover .ca-compact-timestamp {
          color: var(--dc-text-muted);
        }
        .ca-message-text {
          font-size: 16px;
          line-height: 1.375;
          color: var(--dc-text-normal);
          word-wrap: break-word;
          white-space: pre-wrap;
        }
        .ca-typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 16px;
          height: 24px;
          font-size: 14px;
          color: var(--dc-text-muted);
        }
        .ca-typing-dots {
          display: flex;
          gap: 4px;
        }
        .ca-input-container {
          padding: 0 16px 24px;
          flex-shrink: 0;
        }
        .ca-input-wrapper {
          display: flex;
          align-items: flex-end;
          padding: 0 16px;
          background: var(--dc-bg-input);
          border-radius: 8px;
        }
        .ca-attach-button {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: -10px;
          color: var(--dc-interactive-normal);
          transition: color 100ms ease;
          background: none;
          border: none;
          cursor: pointer;
        }
        .ca-attach-button:hover {
          color: var(--dc-interactive-hover);
        }
        .ca-textarea {
          flex: 1;
          max-height: 200px;
          padding: 11px 0;
          background: transparent;
          border: none;
          color: var(--dc-text-normal);
          font-size: 16px;
          line-height: 1.375;
          resize: none;
          overflow-y: auto;
          font-family: inherit;
        }
        .ca-textarea::placeholder {
          color: var(--dc-text-muted);
        }
        .ca-action-buttons {
          display: flex;
          align-items: center;
          margin-right: -10px;
        }
        .ca-action-button {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--dc-interactive-normal);
          transition: color 100ms ease;
          background: none;
          border: none;
          cursor: pointer;
        }
        .ca-action-button:hover {
          color: var(--dc-interactive-hover);
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBER LIST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Member {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  status: "online" | "idle" | "dnd" | "offline";
  role: "admin" | "member" | "owner";
}

interface MemberListProps {
  members: Member[];
}

function MemberList({ members }: MemberListProps) {
  const onlineMembers = members.filter((m) => m.status !== "offline");
  const offlineMembers = members.filter((m) => m.status === "offline");

  const StatusDot = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      online: "var(--dc-status-online)",
      idle: "var(--dc-status-idle)",
      dnd: "var(--dc-status-dnd)",
      offline: "var(--dc-status-offline)",
    };
    return <div className="ml-status-dot" style={{ background: colors[status] || colors.offline }} />;
  };

  const MemberItem = ({ member }: { member: Member }) => (
    <div className="ml-member">
      <div className="ml-avatar-wrapper">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className="ml-avatar" />
        ) : (
          <div className="ml-avatar-fallback">{member.displayName.charAt(0).toUpperCase()}</div>
        )}
        <StatusDot status={member.status} />
      </div>
      <span className={`ml-member-name ${member.status === "offline" ? "ml-offline" : ""}`}>
        {member.displayName}
      </span>
      {member.role === "owner" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--dc-yellow)" className="ml-crown">
          <path d="M5 18h14v2H5v-2zm7-14l5 6-2.5 1.5L12 8l-2.5 3.5L7 10l5-6z" />
        </svg>
      )}
    </div>
  );

  return (
    <aside className="member-list">
      {onlineMembers.length > 0 && (
        <div className="ml-section">
          <h3 className="ml-section-title">ONLINE — {onlineMembers.length}</h3>
          {onlineMembers.map((member) => (
            <MemberItem key={member.id} member={member} />
          ))}
        </div>
      )}

      {offlineMembers.length > 0 && (
        <div className="ml-section">
          <h3 className="ml-section-title">OFFLINE — {offlineMembers.length}</h3>
          {offlineMembers.map((member) => (
            <MemberItem key={member.id} member={member} />
          ))}
        </div>
      )}

      <style>{`
        .member-list {
          width: var(--member-list-width);
          height: 100%;
          background: var(--dc-bg-secondary);
          padding: 24px 8px 0;
          overflow-y: auto;
        }
        .ml-section {
          margin-bottom: 20px;
        }
        .ml-section-title {
          padding: 0 8px;
          margin-bottom: 4px;
          font-size: 12px;
          font-weight: 600;
          color: var(--dc-text-muted);
          letter-spacing: 0.02em;
        }
        .ml-member {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 100ms ease;
        }
        .ml-member:hover {
          background: var(--dc-bg-hover);
        }
        .ml-avatar-wrapper {
          position: relative;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }
        .ml-avatar, .ml-avatar-fallback {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }
        .ml-avatar {
          object-fit: cover;
        }
        .ml-avatar-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--dc-blurple);
          color: white;
          font-size: 13px;
          font-weight: 500;
        }
        .ml-status-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 3px solid var(--dc-bg-secondary);
        }
        .ml-member-name {
          flex: 1;
          font-size: 16px;
          font-weight: 500;
          color: var(--dc-text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ml-member:hover .ml-member-name {
          color: var(--dc-interactive-hover);
        }
        .ml-member-name.ml-offline {
          color: var(--dc-interactive-muted);
        }
        .ml-crown {
          flex-shrink: 0;
        }
      `}</style>
    </aside>
  );
}
