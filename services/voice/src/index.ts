import * as mediasoup from 'mediasoup';
import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  path: '/voice/socket.io',
  cors: { origin: '*' },
});

const port = process.env.VOICE_PORT || 3004;
const announcedIp = process.env.ANNOUNCED_IP || '127.0.0.1';

// ─── Mediasoup Worker Setup ───────────────────────────────────────────────

const workers: mediasoup.types.Worker[] = [];
let workerIndex = 0;

const createWorkers = async () => {
  const numWorkers = Math.max(1, require('os').cpus().length);
  console.log(`Creating ${numWorkers} mediasoup workers`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: 'warn',
      rtcMinPort: Number(process.env.RTC_MIN_PORT || 10000),
      rtcMaxPort: Number(process.env.RTC_MAX_PORT || 10100),
    });

    worker.on('died', () => {
      console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
      setTimeout(() => process.exit(1), 2000);
    });

    workers.push(worker);
  }
};

const getNextWorker = () => {
  const worker = workers[workerIndex];
  workerIndex = (workerIndex + 1) % workers.length;
  return worker;
};

// ─── Room & Peer Management ────────────────────────────────────────────────

interface Room {
  id: string;
  router: mediasoup.types.Router;
  peers: Map<string, Peer>;
}

interface Peer {
  id: string;
  socket: any;
  userId: string;
  transports: Map<string, mediasoup.types.WebRtcTransport>;
  producers: Map<string, mediasoup.types.Producer>;
  consumers: Map<string, mediasoup.types.Consumer>;
}

const rooms = new Map<string, Room>();

const getOrCreateRoom = async (roomId: string): Promise<Room> => {
  let room = rooms.get(roomId);
  if (!room) {
    const router = await getNextWorker().createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: { 'x-google-start-bitrate': 1000 },
        },
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
          },
        },
      ],
    });
    room = { id: roomId, router, peers: new Map() };
    rooms.set(roomId, room);
    console.log(`Created room ${roomId}`);
  }
  return room;
};

import * as nats from 'nats';

// ─── NATS Integration ──────────────────────────────────────────────────────

let nc: nats.NatsConnection;

const connectNats = async () => {
  try {
    nc = await nats.connect({ servers: process.env.NATS_URL || 'nats://nats:4222' });
    console.log('Voice service connected to NATS');
  } catch (e) {
    console.warn('NATS connection failed, running without NATS:', e);
  }
};

const publishVoiceState = async (channelId: string | null, userId: string, state: any) => {
  if (!nc) return;
  
  try {
    const payload = {
      op: 0,
      t: 'VOICE_STATE_UPDATE',
      d: {
        user_id: userId,
        channel_id: channelId,
        ...state,
      },
    };
    
    const subject = channelId ? `voice.${channelId}` : 'voice.leave';
    await nc.publish(subject, Buffer.from(JSON.stringify(payload)));
  } catch (e) {
    console.error('Failed to publish voice state:', e);
  }
};

// ─── WebRTC Transport Creation ─────────────────────────────────────────────

const createWebRtcTransport = async (router: mediasoup.types.Router) => {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: announcedIp,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
  });

  return transport;
};

// ─── Signaling ─────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  const peerId = uuidv4();
  let currentRoomId: string | null = null;
  let currentUserId: string = peerId;

  socket.on('joinRoom', async ({ roomId, userId }, callback) => {
    try {
      currentRoomId = roomId;
      currentUserId = userId || peerId;
      
      const room = await getOrCreateRoom(roomId);
      const peer: Peer = {
        id: peerId,
        socket,
        userId: currentUserId,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      };
      room.peers.set(peerId, peer);
      socket.join(roomId);

      // Broadcast voice state update via NATS
      await publishVoiceState(roomId, currentUserId, {
        self_mute: false,
        self_deaf: false,
        self_video: false,
      });

      // Get existing producers in the room
      const existingProducers: { peerId: string; producerId: string; kind: string }[] = [];
      for (const [pId, p] of room.peers) {
        if (pId !== peerId) {
          for (const [prodId, producer] of p.producers) {
            existingProducers.push({
              peerId: pId,
              producerId: prodId,
              kind: producer.kind,
            });
          }
        }
      }

      callback({
        rtpCapabilities: room.router.rtpCapabilities,
        existingProducers,
      });
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ error: 'Failed to join room' });
    }
  });

  socket.on('createTransport', async ({ direction }, callback) => {
    try {
      const room = rooms.get(currentRoomId!);
      if (!room) {
        callback({ error: 'Room not found' });
        return;
      }

      const peer = room.peers.get(peerId);
      if (!peer) {
        callback({ error: 'Peer not found' });
        return;
      }

      const transport = await createWebRtcTransport(room.router);
      peer.transports.set(transport.id, transport);

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    } catch (error) {
      console.error('Error creating transport:', error);
      callback({ error: 'Failed to create transport' });
    }
  });

  socket.on('connectTransport', async ({ transportId, dtlsParameters }, callback) => {
    try {
      const room = rooms.get(currentRoomId!);
      const peer = room?.peers.get(peerId);
      const transport = peer?.transports.get(transportId);
      
      if (transport) {
        await transport.connect({ dtlsParameters });
        callback({ success: true });
      } else {
        callback({ error: 'Transport not found' });
      }
    } catch (error) {
      console.error('Error connecting transport:', error);
      callback({ error: 'Failed to connect transport' });
    }
  });

  socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
    try {
      const room = rooms.get(currentRoomId!);
      const peer = room?.peers.get(peerId);
      const transport = peer?.transports.get(transportId);
      
      if (!transport) {
        callback({ error: 'Transport not found' });
        return;
      }

      const producer = await transport.produce({ kind, rtpParameters, appData });
      peer?.producers.set(producer.id, producer);
      
      producer.on('transportclose', () => {
        producer.close();
        peer?.producers.delete(producer.id);
      });

      // Inform others in the room about new producer
      socket.to(currentRoomId!).emit('newProducer', {
        producerId: producer.id,
        kind,
        peerId,
        userId: currentUserId,
      });
      
      callback({ id: producer.id });
    } catch (error) {
      console.error('Error producing:', error);
      callback({ error: 'Failed to produce' });
    }
  });

  socket.on('consume', async ({ transportId, producerId, rtpCapabilities }, callback) => {
    try {
      const room = rooms.get(currentRoomId!);
      const peer = room?.peers.get(peerId);
      const transport = peer?.transports.get(transportId);
      
      if (!transport || !room?.router.canConsume({ producerId, rtpCapabilities })) {
        callback({ error: 'Cannot consume' });
        return;
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // Start paused, resume when client is ready
      });

      peer?.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        consumer.close();
        peer?.consumers.delete(consumer.id);
      });

      consumer.on('producerclose', () => {
        consumer.close();
        peer?.consumers.delete(consumer.id);
        socket.emit('producerClosed', { consumerId: consumer.id });
      });

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (error) {
      console.error('Error consuming:', error);
      callback({ error: 'Failed to consume' });
    }
  });

  socket.on('resume', async ({ consumerId }, callback) => {
    try {
      const room = rooms.get(currentRoomId!);
      const peer = room?.peers.get(peerId);
      const consumer = peer?.consumers.get(consumerId);
      
      if (consumer) {
        await consumer.resume();
        callback({ success: true });
      } else {
        callback({ error: 'Consumer not found' });
      }
    } catch (error) {
      console.error('Error resuming:', error);
      callback({ error: 'Failed to resume' });
    }
  });

  socket.on('updateVoiceState', async ({ selfMute, selfDeaf, selfVideo }) => {
    await publishVoiceState(currentRoomId, currentUserId, {
      self_mute: selfMute,
      self_deaf: selfDeaf,
      self_video: selfVideo,
    });
    
    // Notify others in room
    socket.to(currentRoomId!).emit('peerVoiceState', {
      peerId,
      userId: currentUserId,
      selfMute,
      selfDeaf,
      selfVideo,
    });
  });

  socket.on('disconnect', async () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const peer = room.peers.get(peerId);
        if (peer) {
          // Close all transports (this closes producers and consumers)
          for (const transport of peer.transports.values()) {
            transport.close();
          }
          room.peers.delete(peerId);
          
          // Notify others
          socket.to(currentRoomId).emit('peerLeft', { peerId, userId: currentUserId });
          
          // If room is empty, clean it up
          if (room.peers.size === 0) {
            room.router.close();
            rooms.delete(currentRoomId);
            console.log(`Room ${currentRoomId} closed (empty)`);
          }
        }
        
        await publishVoiceState(null, currentUserId, {});
      }
    }
  });
});

// ─── HTTP Endpoints ────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    workers: workers.length,
    rooms: rooms.size,
    peers: Array.from(rooms.values()).reduce((sum, room) => sum + room.peers.size, 0),
  });
});

app.get('/rooms', (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    peers: room.peers.size,
    peerIds: Array.from(room.peers.keys()),
  }));
  res.json(roomList);
});

// ─── Start ─────────────────────────────────────────────────────────────────

connectNats();

createWorkers().then(() => {
  server.listen(port, () => {
    console.log(`Voice service listening on port ${port}`);
    console.log(`Workers: ${workers.length}`);
    console.log(`Announced IP: ${announcedIp}`);
  });
});
