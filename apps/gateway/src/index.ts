import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import { Redis } from "ioredis";
import type { GatewayEvent } from "@teamcord/types";

const PORT = Number(process.env["GATEWAY_PORT"] ?? 3002);
const JWT_SECRET = process.env["JWT_SECRET"] ?? "change-me-in-production";
const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthenticatedClient {
  ws: WebSocket;
  userId: string;
  workspaceIds: Set<string>;
  subscribedChannels: Set<string>;
}

// ─── State ────────────────────────────────────────────────────────────────────

/** userId → set of connected clients (multi-tab support) */
const clients = new Map<string, Set<AuthenticatedClient>>();

/** channelId → set of clients subscribed */
const channelSubscribers = new Map<string, Set<AuthenticatedClient>>();

// ─── Redis ────────────────────────────────────────────────────────────────────

const publisher = new Redis(REDIS_URL);
const subscriber = new Redis(REDIS_URL);

subscriber.psubscribe("channel:*", "workspace:*");

subscriber.on("pmessage", (_pattern: string, channel: string, message: string) => {
  try {
    const event = JSON.parse(message) as GatewayEvent;
    broadcastToChannel(channel.replace("channel:", ""), event);
  } catch {
    // ignore malformed messages
  }
});

// ─── WebSocket Server ─────────────────────────────────────────────────────────

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws, req) => {
  // Extract token from ?token=... query parameter
  const url = new URL(req.url ?? "", `http://localhost:${PORT}`);
  const token = url.searchParams.get("token");

  if (!token) {
    ws.close(4001, "Missing authentication token");
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    userId = payload.sub;
  } catch {
    ws.close(4003, "Invalid or expired token");
    return;
  }

  const client: AuthenticatedClient = {
    ws,
    userId,
    workspaceIds: new Set(),
    subscribedChannels: new Set(),
  };

  // Register client
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(client);

  console.log(`[gateway] client connected: ${userId}`);

  ws.on("message", (data) => handleClientMessage(client, data.toString()));

  ws.on("close", () => {
    cleanup(client);
    console.log(`[gateway] client disconnected: ${userId}`);
  });

  ws.on("error", () => cleanup(client));

  // Send connection acknowledgment
  sendToClient(client, {
    type: "presence:update",
    payload: { userId, status: "online" },
    workspaceId: "",
    timestamp: new Date().toISOString(),
  });
});

// ─── Message handling ─────────────────────────────────────────────────────────

function handleClientMessage(client: AuthenticatedClient, raw: string) {
  let msg: { type: string; channelId?: string; workspaceId?: string };
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  switch (msg.type) {
    case "subscribe:channel": {
      if (!msg.channelId) return;
      client.subscribedChannels.add(msg.channelId);
      if (!channelSubscribers.has(msg.channelId)) {
        channelSubscribers.set(msg.channelId, new Set());
      }
      channelSubscribers.get(msg.channelId)!.add(client);
      break;
    }
    case "unsubscribe:channel": {
      if (!msg.channelId) return;
      client.subscribedChannels.delete(msg.channelId);
      channelSubscribers.get(msg.channelId)?.delete(client);
      break;
    }
    case "typing:start":
    case "typing:stop": {
      if (!msg.channelId) return;
      // Broadcast typing events to all channel subscribers except sender
      const event: GatewayEvent = {
        type: msg.type,
        payload: { userId: client.userId },
        workspaceId: msg.workspaceId ?? "",
        channelId: msg.channelId,
        timestamp: new Date().toISOString(),
      };
      broadcastToChannelExcept(msg.channelId, event, client);
      break;
    }
    case "ping": {
      sendToClient(client, {
        type: "presence:update",
        payload: { pong: true },
        workspaceId: "",
        timestamp: new Date().toISOString(),
      });
      break;
    }
  }
}

// ─── Broadcast helpers ────────────────────────────────────────────────────────

function broadcastToChannel(channelId: string, event: GatewayEvent) {
  const subscribers = channelSubscribers.get(channelId);
  if (!subscribers) return;
  const payload = JSON.stringify(event);
  for (const client of subscribers) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
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
  const payload = JSON.stringify(event);
  for (const client of subscribers) {
    if (client !== exclude && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function sendToClient(client: AuthenticatedClient, event: GatewayEvent) {
  if (client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(event));
  }
}

function cleanup(client: AuthenticatedClient) {
  clients.get(client.userId)?.delete(client);
  if (clients.get(client.userId)?.size === 0) {
    clients.delete(client.userId);
  }
  for (const channelId of client.subscribedChannels) {
    channelSubscribers.get(channelId)?.delete(client);
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
