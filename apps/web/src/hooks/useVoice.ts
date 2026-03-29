import { useState, useEffect, useRef } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';

export const useVoice = (roomId: string) => {
  const [room, setRoom] = useState<any>(null);
  const [producers, setProducers] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<mediasoupClient.types.Device | null>(null);
  const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_VOICE_URL || 'http://localhost:3004');

    socketRef.current.on('connect', async () => {
      console.log('Connected to voice service');
      
      socketRef.current?.emit('joinRoom', { roomId }, async ({ rtpCapabilities }: any) => {
        const device = new mediasoupClient.Device();
        await device.load({ rtpCapabilities });
        deviceRef.current = device;

        // Create transports...
        createSendTransport();
        createRecvTransport();
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  const createSendTransport = () => {
    socketRef.current?.emit('createWebRtcTransport', { roomId, direction: 'send' }, async (params: any) => {
      const transport = deviceRef.current!.createSendTransport(params);
      sendTransportRef.current = transport;

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socketRef.current?.emit('connectTransport', { transportId: transport.id, dtlsParameters }, callback);
      });

      transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
        socketRef.current?.emit('produce', { transportId: transport.id, kind, rtpParameters, appData }, callback);
      });
    });
  };

  const createRecvTransport = () => {
    socketRef.current?.emit('createWebRtcTransport', { roomId, direction: 'recv' }, async (params: any) => {
      const transport = deviceRef.current!.createRecvTransport(params);
      recvTransportRef.current = transport;

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socketRef.current?.emit('connectTransport', { transportId: transport.id, dtlsParameters }, callback);
      });
    });
  };

  const produce = async (track: MediaStreamTrack) => {
    if (!sendTransportRef.current) return;
    const producer = await sendTransportRef.current.produce({ track });
    return producer;
  };

  return { produce };
};
