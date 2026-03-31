import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import { Redis } from "ioredis";
import type { GatewayEvent } from "@teamcord/types";

const PORT = Number(process.env["GATEWAY_PORT"] ?? 3002);
const JWT_SECRET = process.env["JWT_SECRET"] ?? "change-me-in-production";
const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";
const HEARTBEAT_INTERVAL = 41250; // Discord uses 41.25s

// ─── Discord-compatible Opcodes ───────────────────────────────────────────────

const GatewayOp = {
  DISPATCH: 0,         // Server → Client: Events (messages, typing, etc.)
  HEARTBEAT: 1,        // Client → Server: Keep connection alive
  IDENTIFY: 2,         // Client → Server: Initial authentication
  PRESENCE_UPDATE: 3,  // Client → Server: Update presence status
  VOICE_STATE_UPDATE: 4, // Both: Voice channel state
  RESUME: 6,           // Client → Server: Resume after disconnect
  RECONNECT: 7,        // Server → Client: Request reconnect
  REQUEST_MEMBERS: 8,  // Client → Server: Request member list
  INVALID_SESSION: 9,  // Server → Client: Session invalidated
  HELLO: 10,           // Server → Client: Initial hello with heartbeat interval
  HEARTBEAT_ACK: 11,   // Server → Client: Heartbeat acknowledged
  // TeamCord extensions (100+)
  SUBSCRIBE: 100,      // Client → Server: Subscribe to channel
  UNSUBSCRIBE: 101,    // Client → Server: Unsubscribe from channel
  TYPING: 102,         // Both: Typing indicator
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthenticatedClient {
  ws: WebSocket;
  userId: string;
  sessionId: string;
  workspaceIds: Set<string>;
  subscribedChannels: Set<string>;
  lastHeartbeat: number;
  heartbeatTimer?: NodeJS.Timeout;
  sequence: number;
  identified: boolean;
}

interface GatewayPayload {
  op: number;
  d?: unknown;
  s?: number;  // Sequence number (for DISPATCH)
  t?: string;  // Event name (for DISPATCH)
}

// ─── State ────────────────────────────────────────────────────────────────────

/** userId → set of connected clients (multi-tab support) */
const clients = new Map<string, Set<AuthenticatedClient>>();

/** sessionId → client */
const sessions = new Map<string, AuthenticatedClient>();

/** channelId → set of clients subscribed */
const channelSubscribers = new Map<string, Set<AuthenticatedClient>>();

/** Global sequence counter for events */
let globalSequence = 0;

// ─── Redis ────────────────────────────────────────────────────────────────────

const publisher = new Redis(REDIS_URL);
const subscriber = new Redis(REDIS_URL);

subscriber.psubscribe("channel:*", "workspace:*", "presence:*");

subscriber.on("pmessage", (_pattern: string, channel: string, message: string) => {
  try {
    const event = JSON.parse(message) as GatewayEvent;
    
    // Handle presence updates globally
    if (channel.startsWith("presence:")) {
      const userId = channel.replace("presence:", "");
      broadcastPresenceUpdate(userId, event);
      return;
    }
    
    // Route to appropriate channel
    const channelId = channel.replace("channel:", "").replace("workspace:", "");
    broadcastToChannel(channelId, event);
  } catch {
    // ignore malformed messages
  }
});

function broadcastPresenceUpdate(userId: string, event: GatewayEvent) {
  // Broadcast to all clients in workspaces the user belongs to
  const userClients = clients.get(userId);
  if (!userClients) return;
  
  const workspaceIds = new Set<string>();
  for (const client of userClients) {
    for (const wsId of client.workspaceIds) {
      workspaceIds.add(wsId);
    }
  }
  
  // Broadcast to all clients in those workspaces
  for (const [, clientSet] of clients) {
    for (const client of clientSet) {
      for (const wsId of client.workspaceIds) {
        if (workspaceIds.has(wsId)) {
          sendDispatch(client, "PRESENCE_UPDATE", event.payload);
          break;
        }
      }
    }
  }
}

// ─── WebSocket Server ─────────────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "healthy",
      connections: Array.from(clients.values()).reduce((sum, set) => sum + set.size, 0),
      channels: channelSubscribers.size,
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "", `http://localhost:${PORT}`);
  const token = url.searchParams.get("token");
  const sessionId = generateSessionId();

  // Create client (not yet authenticated)
  const client: AuthenticatedClient = {
    ws,
    userId: "",
    sessionId,
    workspaceIds: new Set(),
    subscribedChannels: new Set(),
    lastHeartbeat: Date.now(),
    sequence: 0,
    identified: false,
  };

  sessions.set(sessionId, client);

  // Send HELLO with heartbeat interval
  sendPayload(client, {
    op: GatewayOp.HELLO,
    d: {
      heartbeat_interval: HEARTBEAT_INTERVAL,
    },
  });

  // If token provided in query, auto-identify
  if (token) {
    handleIdentify(client, { token });
  }

  ws.on("message", (data) => {
    try {
      const payload = JSON.parse(data.toString()) as GatewayPayload;
      handleGatewayMessage(client, payload);
    } catch (e) {
      console.error("[gateway] malformed message:", e);
    }
  });

  ws.on("close", () => {
    cleanup(client);
    console.log(`[gateway] client disconnected: ${client.userId || "anonymous"} (${sessionId})`);
  });

  ws.on("error", () => cleanup(client));

  console.log(`[gateway] new connection: ${sessionId}`);
});

function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

// ─── Gateway Message Handling ─────────────────────────────────────────────────

function handleGatewayMessage(client: AuthenticatedClient, payload: GatewayPayload) {
  switch (payload.op) {
    case GatewayOp.HEARTBEAT:
      handleHeartbeat(client, payload.d as number | null);
      break;

    case GatewayOp.IDENTIFY:
      handleIdentify(client, payload.d as { token: string; properties?: Record<string, unknown> });
      break;

    case GatewayOp.PRESENCE_UPDATE:
      handlePresenceUpdate(client, payload.d as { status?: string; activities?: unknown[] });
      break;

    case GatewayOp.VOICE_STATE_UPDATE:
      handleVoiceStateUpdate(client, payload.d as { channel_id?: string; self_mute?: boolean; self_deaf?: boolean });
      break;

    case GatewayOp.RESUME:
      handleResume(client, payload.d as { token: string; session_id: string; seq: number });
      break;

    case GatewayOp.REQUEST_MEMBERS:
      handleRequestMembers(client, payload.d as { workspace_id: string; query?: string; limit?: number });
      break;

    // TeamCord extensions
    case GatewayOp.SUBSCRIBE:
      handleSubscribe(client, payload.d as { channel_id: string });
      break;

    case GatewayOp.UNSUBSCRIBE:
      handleUnsubscribe(client, payload.d as { channel_id: string });
      break;

    case GatewayOp.TYPING:
      handleTyping(client, payload.d as { channel_id: string });
      break;

    default:
      console.warn(`[gateway] unknown opcode: ${payload.op}`);
  }
}

function handleHeartbeat(client: AuthenticatedClient, seq: number | null) {
  client.lastHeartbeat = Date.now();
  sendPayload(client, { op: GatewayOp.HEARTBEAT_ACK });
}

function handleIdentify(client: AuthenticatedClient, data: { token: string; properties?: Record<string, unknown> }) {
  if (!data?.token) {
    sendPayload(client, { op: GatewayOp.INVALID_SESSION, d: false });
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(data.token, JWT_SECRET) as { sub: string; workspaces?: string[] };
    userId = payload.sub;
    
    // Store workspace IDs if present in token
    if (payload.workspaces) {
      for (const wsId of payload.workspaces) {
        client.workspaceIds.add(wsId);
      }
    }
  } catch {
    sendPayload(client, { op: GatewayOp.INVALID_SESSION, d: false });
    client.ws.close(4003, "Invalid or expired token");
    return;
  }

  client.userId = userId;
  client.identified = true;

  // Register in clients map
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(client);

  // Start heartbeat monitoring
  client.heartbeatTimer = setInterval(() => {
    if (Date.now() - client.lastHeartbeat > HEARTBEAT_INTERVAL * 1.5) {
      console.log(`[gateway] client ${userId} missed heartbeat, disconnecting`);
      client.ws.close(4009, "Session timed out");
    }
  }, HEARTBEAT_INTERVAL);

  console.log(`[gateway] client identified: ${userId}`);

  // Send READY event with initial state
  sendReady(client);
}

async function sendReady(client: AuthenticatedClient) {
  // Fetch user data and workspaces from API (simplified for now)
  const readyData = {
    v: 1,
    user: {
      id: client.userId,
      username: "User", // Would fetch from DB
      discriminator: "0001",
      avatar: null,
    },
    workspaces: [], // Would fetch user's workspaces
    session_id: client.sessionId,
    resume_gateway_url: `ws://localhost:${PORT}`,
    relationships: [],
    private_channels: [],
  };

  sendDispatch(client, "READY", readyData);
}

function handlePresenceUpdate(client: AuthenticatedClient, data: { status?: string; activities?: unknown[] }) {
  if (!client.identified) return;

  const presenceEvent = {
    user_id: client.userId,
    status: data.status || "online",
    activities: data.activities || [],
    client_status: { web: data.status || "online" },
  };

  // Publish to Redis for other gateway instances
  publisher.publish(`presence:${client.userId}`, JSON.stringify({
    type: "presence:update",
    payload: presenceEvent,
    timestamp: new Date().toISOString(),
  }));
}

function handleVoiceStateUpdate(client: AuthenticatedClient, data: { channel_id?: string; self_mute?: boolean; self_deaf?: boolean }) {
  if (!client.identified) return;

  // Publish voice state change
  publisher.publish(`voice:${data.channel_id || "leave"}`, JSON.stringify({
    type: "voice:state_update",
    payload: {
      user_id: client.userId,
      channel_id: data.channel_id || null,
      self_mute: data.self_mute ?? false,
      self_deaf: data.self_deaf ?? false,
    },
    timestamp: new Date().toISOString(),
  }));
}

function handleResume(client: AuthenticatedClient, data: { token: string; session_id: string; seq: number }) {
  // Attempt to resume session - simplified implementation
  const oldSession = sessions.get(data.session_id);
  if (oldSession && oldSession.userId) {
    // Migrate state from old session
    client.userId = oldSession.userId;
    client.workspaceIds = oldSession.workspaceIds;
    client.subscribedChannels = oldSession.subscribedChannels;
    client.identified = true;

    // Re-register
    if (!clients.has(client.userId)) clients.set(client.userId, new Set());
    clients.get(client.userId)!.add(client);

    // Re-subscribe to channels
    for (const channelId of client.subscribedChannels) {
      if (!channelSubscribers.has(channelId)) {
        channelSubscribers.set(channelId, new Set());
      }
      channelSubscribers.get(channelId)!.add(client);
    }

    sendDispatch(client, "RESUMED", {});
    console.log(`[gateway] session resumed: ${client.userId}`);
  } else {
    sendPayload(client, { op: GatewayOp.INVALID_SESSION, d: true }); // d: true means reconnect is required
  }
}

async function handleRequestMembers(client: AuthenticatedClient, data: { workspace_id: string; query?: string; limit?: number }) {
  if (!client.identified) return;

  // This would fetch from the API - simplified placeholder
  const members: unknown[] = [];

  sendDispatch(client, "WORKSPACE_MEMBERS_CHUNK", {
    workspace_id: data.workspace_id,
    members,
    chunk_index: 0,
    chunk_count: 1,
  });
}

function handleSubscribe(client: AuthenticatedClient, data: { channel_id: string }) {
  if (!client.identified || !data?.channel_id) return;

  const channelId = data.channel_id;
  client.subscribedChannels.add(channelId);

  if (!channelSubscribers.has(channelId)) {
    channelSubscribers.set(channelId, new Set());
  }
  channelSubscribers.get(channelId)!.add(client);

  console.log(`[gateway] ${client.userId} subscribed to ${channelId}`);
}

function handleUnsubscribe(client: AuthenticatedClient, data: { channel_id: string }) {
  if (!data?.channel_id) return;

  const channelId = data.channel_id;
  client.subscribedChannels.delete(channelId);
  channelSubscribers.get(channelId)?.delete(client);

  console.log(`[gateway] ${client.userId} unsubscribed from ${channelId}`);
}

function handleTyping(client: AuthenticatedClient, data: { channel_id: string }) {
  if (!client.identified || !data?.channel_id) return;

  // Broadcast typing to channel except sender
  const event: GatewayEvent = {
    type: "typing:start",
    payload: {
      user_id: client.userId,
      channel_id: data.channel_id,
      timestamp: Date.now(),
    },
    workspaceId: "",
    channelId: data.channel_id,
    timestamp: new Date().toISOString(),
  };

  broadcastToChannelExcept(data.channel_id, event, client);
}

// ─── Broadcast helpers ────────────────────────────────────────────────────────

function sendPayload(client: AuthenticatedClient, payload: GatewayPayload) {
  if (client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(payload));
  }
}

function sendDispatch(client: AuthenticatedClient, eventName: string, data: unknown) {
  const seq = ++globalSequence;
  client.sequence = seq;

  sendPayload(client, {
    op: GatewayOp.DISPATCH,
    s: seq,
    t: eventName,
    d: data,
  });
}

function broadcastToChannel(channelId: string, event: GatewayEvent) {
  const subscribers = channelSubscribers.get(channelId);
  if (!subscribers) return;

  // Convert GatewayEvent to dispatch payload
  const eventName = eventTypeToName(event.type);
  
  for (const client of subscribers) {
    if (client.ws.readyState === WebSocket.OPEN) {
      sendDispatch(client, eventName, event.payload);
    }
  }
}

function broadcastToChannelExcept(
  channelId: string,
  event: GatewayEvent,
  exclude: AuthenticatedClient
) {
  const subscribers = channelSubscribers.get(channelId);
  if (!subscribers) return;

  const eventName = eventTypeToName(event.type);

  for (const client of subscribers) {
    if (client !== exclude && client.ws.readyState === WebSocket.OPEN) {
      sendDispatch(client, eventName, event.payload);
    }
  }
}

function eventTypeToName(type: string): string {
  // Convert event type to Discord-style event name
  const mapping: Record<string, string> = {
    "message:create": "MESSAGE_CREATE",
    "message:update": "MESSAGE_UPDATE",
    "message:delete": "MESSAGE_DELETE",
    "reaction:add": "MESSAGE_REACTION_ADD",
    "reaction:remove": "MESSAGE_REACTION_REMOVE",
    "typing:start": "TYPING_START",
    "channel:create": "CHANNEL_CREATE",
    "channel:update": "CHANNEL_UPDATE",
    "channel:delete": "CHANNEL_DELETE",
    "presence:update": "PRESENCE_UPDATE",
    "voice:state_update": "VOICE_STATE_UPDATE",
    "thread:create": "THREAD_CREATE",
    "thread:update": "THREAD_UPDATE",
    "message:pin": "CHANNEL_PINS_UPDATE",
    "message:unpin": "CHANNEL_PINS_UPDATE",
  };

  return mapping[type] || type.toUpperCase().replace(/[:.]/g, "_");
}

function sendToClient(client: AuthenticatedClient, event: GatewayEvent) {
  if (client.ws.readyState === WebSocket.OPEN) {
    sendDispatch(client, eventTypeToName(event.type), event.payload);
  }
}

function cleanup(client: AuthenticatedClient) {
  // Clear heartbeat timer
  if (client.heartbeatTimer) {
    clearInterval(client.heartbeatTimer);
  }

  // Remove from clients map
  clients.get(client.userId)?.delete(client);
  if (clients.get(client.userId)?.size === 0) {
    clients.delete(client.userId);
  }

  // Remove from channel subscriptions
  for (const channelId of client.subscribedChannels) {
    channelSubscribers.get(channelId)?.delete(client);
  }

  // Remove session
  sessions.delete(client.sessionId);

  // Publish offline presence if this was the last connection
  if (client.userId && !clients.has(client.userId)) {
    publisher.publish(`presence:${client.userId}`, JSON.stringify({
      type: "presence:update",
      payload: {
        user_id: client.userId,
        status: "offline",
        activities: [],
      },
      timestamp: new Date().toISOString(),
    }));
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[gateway] WebSocket server listening on ws://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  wss.close();
  httpServer.close();
  publisher.quit();
  subscriber.quit();
  process.exit(0);
});
