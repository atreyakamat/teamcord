import { create } from 'zustand';
import { useAuthStore } from './auth';
import { useMessageStore } from './messages';

interface GatewayState {
  socket: WebSocket | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (op: number, d: any) => void;
}

export const useGatewayStore = create<GatewayState>((set, get) => ({
  socket: null,
  connected: false,
  connect: () => {
    if (get().socket?.readyState === WebSocket.OPEN) return;

    const wsUrl = import.meta.env.VITE_GATEWAY_URL || 'ws://localhost:3002/gateway';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      set({ connected: true, socket: ws });
      const token = useAuthStore.getState().token;
      
      // Send Identify Payload
      get().sendMessage(2, {
        token: token || 'guest_token',
        properties: { os: 'web', browser: 'chrome', device: 'pc' },
      });
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      handleDispatch(payload);
    };

    ws.onclose = () => {
      set({ connected: false, socket: null });
      // Reconnect after 3 seconds
      setTimeout(() => get().connect(), 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws.close();
    };
  },
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ connected: false, socket: null });
    }
  },
  sendMessage: (op: number, d: any) => {
    const { socket } = get();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ op, d }));
    }
  }
}));

function handleDispatch(payload: any) {
  const { op, t, d } = payload;

  if (op === 10) { // HELLO
    // Start heartbeating
    const interval = d.heartbeat_interval;
    setInterval(() => {
      useGatewayStore.getState().sendMessage(1, null);
    }, interval);
  } else if (op === 0) { // DISPATCH
    switch (t) {
      case 'READY':
        useAuthStore.getState().setUser(d.user);
        break;
      case 'MESSAGE_CREATE':
        useMessageStore.getState().addMessage(d);
        break;
      case 'MESSAGE_UPDATE':
        useMessageStore.getState().updateMessage(d);
        break;
      case 'MESSAGE_DELETE':
        useMessageStore.getState().removeMessage(d.id, d.channel_id);
        break;
      // Handle CHANNEL_CREATE, VOICE_STATE_UPDATE, etc.
    }
  }
}
