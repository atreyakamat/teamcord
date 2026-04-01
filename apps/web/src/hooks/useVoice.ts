import { useState, useEffect, useRef, useCallback } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';

export interface Peer {
  id: string;
  userId: string;
  stream: MediaStream;
  selfMute: boolean;
  selfDeaf: boolean;
  selfVideo: boolean;
}

export const useVoice = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<mediasoupClient.types.Device | null>(null);
  const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const audioProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
  const videoProducerRef = useRef<mediasoupClient.types.Producer | null>(null);
  const consumersRef = useRef<Map<string, mediasoupClient.types.Consumer>>(new Map());

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_VOICE_URL || 'http://localhost:3004');

    socketRef.current.on('connect', () => {
      console.log('Connected to voice service signaling server');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from voice service');
      leaveRoom();
    });

    return () => {
      leaveRoom();
      socketRef.current?.disconnect();
    };
  }, []);

  const initDevice = async (rtpCapabilities: mediasoupClient.types.RtpCapabilities) => {
    try {
      const device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;
      return device;
    } catch (error) {
      console.error('Failed to init device:', error);
      throw error;
    }
  };

  const createSendTransport = async () => {
    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('createTransport', { direction: 'send' }, async (params: any) => {
        if (params.error) return reject(params.error);
        
        const transport = deviceRef.current!.createSendTransport(params);
        sendTransportRef.current = transport;

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketRef.current?.emit('connectTransport', { 
            transportId: transport.id, 
            dtlsParameters 
          }, (res: any) => {
            if (res.error) errback(new Error(res.error));
            else callback();
          });
        });

        transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
          socketRef.current?.emit('produce', { 
            transportId: transport.id, 
            kind, 
            rtpParameters, 
            appData 
          }, (res: any) => {
            if (res.error) errback(new Error(res.error));
            else callback({ id: res.id });
          });
        });

        resolve();
      });
    });
  };

  const createRecvTransport = async () => {
    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('createTransport', { direction: 'recv' }, async (params: any) => {
        if (params.error) return reject(params.error);
        
        const transport = deviceRef.current!.createRecvTransport(params);
        recvTransportRef.current = transport;

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketRef.current?.emit('connectTransport', { 
            transportId: transport.id, 
            dtlsParameters 
          }, (res: any) => {
            if (res.error) errback(new Error(res.error));
            else callback();
          });
        });

        resolve();
      });
    });
  };

  const consumeTrack = async (producerId: string, peerId: string, kind: string, userId: string) => {
    if (!recvTransportRef.current || !deviceRef.current) return;

    socketRef.current?.emit('consume', {
      transportId: recvTransportRef.current.id,
      producerId,
      rtpCapabilities: deviceRef.current.rtpCapabilities
    }, async (params: any) => {
      if (params.error) {
        console.error('Consume error:', params.error);
        return;
      }

      const consumer = await recvTransportRef.current!.consume({
        id: params.id,
        producerId: params.producerId,
        kind: params.kind,
        rtpParameters: params.rtpParameters,
      });

      consumersRef.current.set(consumer.id, consumer);

      // Tell server to resume the consumer
      socketRef.current?.emit('resume', { consumerId: consumer.id }, () => {});

      const track = consumer.track;
      
      setPeers(prev => {
        const existingPeer = prev[peerId];
        const stream = existingPeer ? existingPeer.stream : new MediaStream();
        stream.addTrack(track);
        
        return {
          ...prev,
          [peerId]: {
            id: peerId,
            userId: userId || existingPeer?.userId || peerId,
            stream,
            selfMute: existingPeer?.selfMute || false,
            selfDeaf: existingPeer?.selfDeaf || false,
            selfVideo: existingPeer?.selfVideo || false,
          }
        };
      });
    });
  };

  const joinRoom = useCallback(async (roomId: string, userId: string = 'user') => {
    if (!socketRef.current) return;
    if (currentRoomId === roomId) return;
    
    // Leave current room if already in one
    if (currentRoomId) leaveRoom();

    setCurrentRoomId(roomId);
    
    // 1. Get user media (microphone by default)
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalStream(stream);
    } catch (err) {
      console.error('Failed to get local media:', err);
      // We can still join as a listener if no mic available
    }

    // 2. Join the room on signaling server
    socketRef.current.emit('joinRoom', { roomId, userId }, async (res: any) => {
      if (res.error) {
        console.error('Failed to join room:', res.error);
        return;
      }

      await initDevice(res.rtpCapabilities);
      await createSendTransport();
      await createRecvTransport();

      // Setup event listeners for room events
      socketRef.current?.on('newProducer', ({ producerId, peerId, kind, userId: remoteUserId }) => {
        consumeTrack(producerId, peerId, kind, remoteUserId);
      });

      socketRef.current?.on('peerLeft', ({ peerId }) => {
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[peerId];
          return newPeers;
        });
      });

      socketRef.current?.on('peerVoiceState', ({ peerId, selfMute, selfDeaf, selfVideo }) => {
        setPeers(prev => {
          if (!prev[peerId]) return prev;
          return {
            ...prev,
            [peerId]: { ...prev[peerId], selfMute, selfDeaf, selfVideo }
          };
        });
      });

      // 3. Consume existing producers in the room
      for (const prod of res.existingProducers) {
        await consumeTrack(prod.producerId, prod.peerId, prod.kind, prod.peerId);
      }

      // 4. Produce our local tracks
      if (stream!) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioProducerRef.current = await sendTransportRef.current!.produce({ track: audioTrack });
        }
      }

      setIsConnected(true);
      // Send initial voice state
      socketRef.current?.emit('updateVoiceState', { selfMute: false, selfDeaf: false, selfVideo: false });
    });
  }, [currentRoomId]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.off('newProducer');
    socketRef.current?.off('peerLeft');
    socketRef.current?.off('peerVoiceState');
    
    // Stop local tracks
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    
    // Close transports
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    
    // Reset state
    setPeers({});
    setCurrentRoomId(null);
    setIsConnected(false);
    setIsMuted(false);
    setIsVideoOn(false);
    
    // Notify server
    socketRef.current?.emit('disconnect');
  }, [localStream]);

  const toggleMute = useCallback(() => {
    if (!audioProducerRef.current) return;
    const muted = !isMuted;
    if (muted) {
      audioProducerRef.current.pause();
    } else {
      audioProducerRef.current.resume();
    }
    setIsMuted(muted);
    socketRef.current?.emit('updateVoiceState', { selfMute: muted, selfDeaf: false, selfVideo: isVideoOn });
  }, [isMuted, isVideoOn]);

  const toggleVideo = useCallback(async () => {
    if (!sendTransportRef.current) return;
    
    const turnOn = !isVideoOn;
    
    if (turnOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        videoProducerRef.current = await sendTransportRef.current.produce({ track: videoTrack });
        
        setLocalStream(prev => {
          if (!prev) return stream;
          prev.addTrack(videoTrack);
          return prev;
        });
      } catch (err) {
        console.error('Failed to get video:', err);
        return;
      }
    } else {
      if (videoProducerRef.current) {
        videoProducerRef.current.close();
        videoProducerRef.current = null;
      }
      setLocalStream(prev => {
        if (!prev) return prev;
        prev.getVideoTracks().forEach(t => t.stop());
        return prev;
      });
    }
    
    setIsVideoOn(turnOn);
    socketRef.current?.emit('updateVoiceState', { selfMute: isMuted, selfDeaf: false, selfVideo: turnOn });
  }, [isVideoOn, isMuted]);

  return {
    isConnected,
    currentRoomId,
    peers: Object.values(peers),
    localStream,
    isMuted,
    isVideoOn,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo
  };
};