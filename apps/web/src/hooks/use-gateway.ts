"use client";

import { useEffect, useRef, useCallback } from "react";
import type { GatewayEvent } from "@teamcord/types";

const GATEWAY_URL =
  process.env["NEXT_PUBLIC_GATEWAY_URL"] ?? "ws://localhost:3002";

export function useGateway(
  token: string | null,
  onEvent: (event: GatewayEvent) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!token) return;

    const ws = new WebSocket(`${GATEWAY_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[gateway] connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as GatewayEvent;
        onEvent(data);
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      // Reconnect with exponential backoff
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token, onEvent]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((channelId: string) => {
    wsRef.current?.send(
      JSON.stringify({ type: "subscribe:channel", channelId })
    );
  }, []);

  const unsubscribe = useCallback((channelId: string) => {
    wsRef.current?.send(
      JSON.stringify({ type: "unsubscribe:channel", channelId })
    );
  }, []);

  const sendTyping = useCallback(
    (channelId: string, workspaceId: string, typing: boolean) => {
      wsRef.current?.send(
        JSON.stringify({
          type: typing ? "typing:start" : "typing:stop",
          channelId,
          workspaceId,
        })
      );
    },
    []
  );

  return { subscribe, unsubscribe, sendTyping };
}
