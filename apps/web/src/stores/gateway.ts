import { create } from 'zustand';
import { useAuthStore } from './auth';
import { useMessageStore } from './messages';
import { useChannelStore } from './channels';

interface GatewayState {
  socket: WebSocket | null;
  connected: boolean;
  sessionId: string | null;
  heartbeatInterval: number | null;
  lastHeartbeat: number | null;
  reconnectAttempts: number;
  
  connect: () => void;
  disconnect: () => void;
  sendMessage: (op: number, d: any) => void;
  subscribeChannel: (channelId: string) => void;
  unsubscribeChannel: (channelId: string) => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;

export const useGatewayStore = create<GatewayState>((set, get) => ({
  socket: null,
  connected: false,
  sessionId: null,
  heartbeatInterval: null,
  lastHeartbeat: null,
  reconnectAttempts: 0,
  
  connect: () => {
    const { socket, reconnectAttempts } = get();
    if (socket?.readyState === WebSocket.OPEN) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const wsUrl = import.meta.env.VITE_GATEWAY_URL || 'ws://localhost:3002/gateway';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      set({ connected: true, socket: ws, reconnectAttempts: 0 });
      const token = useAuthStore.getState().token;
      
      // Send Identify Payload (OP 2)
      get().sendMessage(2, {
        token: token || 'guest_token',
        properties: { 
          os: navigator.platform, 
          browser: 'teamcord-web', 
          device: 'desktop' 
        },
        compress: false,
        large_threshold: 250,
      });
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleDispatch(payload, get, set);
      } catch (err) {
        console.error('Failed to parse gateway message:', err);
      }
    };

    ws.onclose = (event) => {
      set({ connected: false, socket: null });
      
      // Stop heartbeat
      const { heartbeatInterval } = get();
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        set({ heartbeatInterval: null });
      }
      
      // Attempt reconnect with exponential backoff
      if (!event.wasClean) {
        const attempts = get().reconnectAttempts + 1;
        set({ reconnectAttempts: attempts });
        const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, attempts), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${attempts})`);
        setTimeout(() => get().connect(), delay);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  },
  
  disconnect: () => {
    const { socket, heartbeatInterval } = get();
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    if (socket) {
      socket.close(1000, 'User disconnect');
    }
    set({ connected: false, socket: null, heartbeatInterval: null, sessionId: null });
  },
  
  sendMessage: (op: number, d: any) => {
    const { socket } = get();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ op, d }));
    }
  },
  
  subscribeChannel: (channelId: string) => {
    get().sendMessage(100, { channel_ids: [channelId] }); // SUBSCRIBE opcode
  },
  
  unsubscribeChannel: (channelId: string) => {
    get().sendMessage(101, { channel_ids: [channelId] }); // UNSUBSCRIBE opcode
  },
}));

function handleDispatch(
  payload: { op: number; t?: string; d?: any; s?: number },
  get: () => GatewayState,
  set: (state: Partial<GatewayState>) => void
) {
  const { op, t, d } = payload;

  switch (op) {
    case 10: // HELLO
      const interval = d.heartbeat_interval || 41250;
      
      // Start heartbeat
      const heartbeatTimer = setInterval(() => {
        get().sendMessage(1, { last_sequence: payload.s || null });
        set({ lastHeartbeat: Date.now() });
      }, interval) as unknown as number;
      
      set({ heartbeatInterval: heartbeatTimer });
      break;
      
    case 11: // HEARTBEAT_ACK
      // Server acknowledged heartbeat
      break;
      
    case 7: // RECONNECT
      console.log('Server requested reconnect');
      get().disconnect();
      setTimeout(() => get().connect(), 1000);
      break;
      
    case 9: // INVALID_SESSION
      console.log('Invalid session, re-identifying');
      const token = useAuthStore.getState().token;
      get().sendMessage(2, {
        token: token || 'guest_token',
        properties: { os: 'web', browser: 'teamcord-web', device: 'desktop' },
      });
      break;
      
    case 0: // DISPATCH
      handleEvent(t!, d);
      break;
  }
}

function handleEvent(type: string, data: any) {
  const messageStore = useMessageStore.getState();
  const channelStore = useChannelStore.getState();
  const authStore = useAuthStore.getState();

  switch (type) {
    case 'READY':
      authStore.setUser(data.user);
      if (data.workspaces) {
        // Could set workspaces here
      }
      if (data.session_id) {
        useGatewayStore.setState({ sessionId: data.session_id });
      }
      break;
      
    case 'MESSAGE_CREATE':
      messageStore.addMessage({
        id: data.id,
        channelId: data.channel_id || data.channelId,
        authorId: data.author_id || data.authorId,
        content: data.content,
        type: data.type || 'text',
        createdAt: data.created_at || data.createdAt,
        attachments: data.attachments || [],
        reactions: data.reactions || [],
        author: data.author,
      });
      break;
      
    case 'MESSAGE_UPDATE':
      messageStore.updateMessage({
        id: data.id,
        channelId: data.channel_id || data.channelId,
        content: data.content,
        editedAt: data.edited_at || data.editedAt,
        edited: true,
      });
      break;
      
    case 'MESSAGE_DELETE':
      messageStore.removeMessage(data.id, data.channel_id || data.channelId);
      break;
      
    case 'MESSAGE_REACTION_ADD':
      messageStore.addReaction(
        data.message_id || data.messageId,
        data.channel_id || data.channelId,
        { emoji: data.emoji, count: 1, userIds: [] },
        data.user_id || data.userId
      );
      break;
      
    case 'MESSAGE_REACTION_REMOVE':
      messageStore.removeReaction(
        data.message_id || data.messageId,
        data.channel_id || data.channelId,
        data.emoji,
        data.user_id || data.userId
      );
      break;
      
    case 'CHANNEL_CREATE':
      channelStore.addChannel(data);
      break;
      
    case 'CHANNEL_UPDATE':
      channelStore.updateChannel(data);
      break;
      
    case 'CHANNEL_DELETE':
      channelStore.removeChannel(data.id);
      break;
      
    case 'TYPING_START':
      channelStore.setTyping(data.channel_id || data.channelId, data.user_id || data.userId, true);
      // Auto-clear after 10 seconds
      setTimeout(() => {
        channelStore.setTyping(data.channel_id || data.channelId, data.user_id || data.userId, false);
      }, 10000);
      break;
      
    case 'PRESENCE_UPDATE':
      // Could update a presence store here
      break;
      
    case 'VOICE_STATE_UPDATE':
      // Could update a voice store here
      break;
      
    default:
      console.log('Unknown event:', type, data);
  }
}
