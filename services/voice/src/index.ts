import * as mediasoup from 'mediasoup';
import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const port = process.env.VOICE_PORT || 3004;

// ─── Mediasoup Worker Setup ───────────────────────────────────────────────

let worker: mediasoup.types.Worker;

const createWorker = async () => {
  worker = await mediasoup.createWorker({
    logLevel: 'warn',
    rtcMinPort: Number(process.env.RTC_MIN_PORT || 10000),
    rtcMaxPort: Number(process.env.RTC_MAX_PORT || 10100),
  });

  worker.on('died', () => {
    console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
    setTimeout(() => process.exit(1), 2000);
  });

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
  transports: Map<string, mediasoup.types.WebRtcTransport>;
  producers: Map<string, mediasoup.types.Producer>;
  consumers: Map<string, mediasoup.types.Consumer>;
}

const rooms = new Map<string, Room>();

const getOrCreateRoom = async (roomId: string): Promise<Room> => {
  let room = rooms.get(roomId);
  if (!room) {
    const router = await worker.createRouter({
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
      ],
    });
    room = { id: roomId, router, peers: new Map() };
    rooms.set(roomId, room);
  }
  return room;
};

import * as nats from 'nats';

// ─── NATS Integration ──────────────────────────────────────────────────────

let nc: nats.NatsConnection;

const connectNats = async () => {
  nc = await nats.connect({ servers: process.env.NATS_URL || 'nats://nats:4222' });
  console.log('Voice service connected to NATS');
};

connectNats();

// ─── Signaling ─────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  const peerId = uuidv4();
  let currentRoomId: string | null = null;

  socket.on('joinRoom', async ({ roomId }, callback) => {
    currentRoomId = roomId;
    const room = await getOrCreateRoom(roomId);
    const peer: Peer = {
      id: peerId,
      socket,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };
    room.peers.set(peerId, peer);

    // Broadcast voice state update via NATS
    nc.publish(`voice.${roomId}`, JSON.RawJSON(JSON.stringify({
      op: 0,
      t: 'VOICE_STATE_UPDATE',
      d: { user_id: peerId, channel_id: roomId, self_mute: false, self_deaf: false }
    })));

    callback({ rtpCapabilities: room.router.rtpCapabilities });
  });

  socket.on('connectTransport', async ({ transportId, dtlsParameters }) => {
    const room = rooms.get(currentRoomId!);
    const peer = room?.peers.get(peerId);
    const transport = peer?.transports.get(transportId);
    if (transport) {
      await transport.connect({ dtlsParameters });
    }
  });

  socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
    const room = rooms.get(currentRoomId!);
    const peer = room?.peers.get(peerId);
    const transport = peer?.transports.get(transportId);
    if (transport) {
      const producer = await transport.produce({ kind, rtpParameters, appData });
      peer?.producers.set(producer.id, producer);
      
      // Inform others in the room about new producer
      socket.to(currentRoomId!).emit('newProducer', { producerId: producer.id, kind, peerId });
      
      callback({ id: producer.id });
    }
  });

  socket.on('consume', async ({ transportId, producerId, rtpCapabilities }, callback) => {
    const room = rooms.get(currentRoomId!);
    const peer = room?.peers.get(peerId);
    const transport = peer?.transports.get(transportId);
    
    if (transport && room?.router.canConsume({ producerId, rtpCapabilities })) {
      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true,
      });

      peer?.consumers.set(consumer.id, consumer);

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    }
  });

  socket.on('resume', async ({ consumerId }) => {
    const room = rooms.get(currentRoomId!);
    const peer = room?.peers.get(peerId);
    const consumer = peer?.consumers.get(consumerId);
    if (consumer) {
      await consumer.resume();
    }
  });

  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.peers.delete(peerId);
        nc.publish(`voice.${currentRoomId}`, JSON.RawJSON(JSON.stringify({
          op: 0,
          t: 'VOICE_STATE_UPDATE',
          d: { user_id: peerId, channel_id: null }
        })));
      }
    }
  });
});

createWorker().then(() => {
  server.listen(port, () => {
    console.log(`Voice service listening on port ${port}`);
  });
});
