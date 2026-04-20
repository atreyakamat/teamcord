import { useCallback, useEffect, useRef, useState } from 'react'
import * as mediasoupClient from 'mediasoup-client'
import { io, Socket } from 'socket.io-client'
import { VOICE_SOCKET_PATH, VOICE_URL } from '../lib/config'

export interface Peer {
  id: string
  userId: string
  stream: MediaStream
  selfMute: boolean
  selfDeaf: boolean
  selfVideo: boolean
}

export const useVoice = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [peers, setPeers] = useState<Record<string, Peer>>({})
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const deviceRef = useRef<mediasoupClient.types.Device | null>(null)
  const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null)
  const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null)
  const audioProducerRef = useRef<mediasoupClient.types.Producer | null>(null)
  const cameraProducerRef = useRef<mediasoupClient.types.Producer | null>(null)
  const screenProducerRef = useRef<mediasoupClient.types.Producer | null>(null)
  const consumersRef = useRef<Map<string, mediasoupClient.types.Consumer>>(new Map())
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null)
  const screenTrackRef = useRef<MediaStreamTrack | null>(null)
  const cameraWasActiveBeforeScreenShareRef = useRef(false)

  const rebuildLocalStream = useCallback(() => {
    setLocalStream((current) => {
      const audioTracks = current?.getAudioTracks() || []
      const nextTracks = [...audioTracks]
      const activeVideoTrack = screenTrackRef.current || cameraTrackRef.current
      if (activeVideoTrack) {
        nextTracks.push(activeVideoTrack)
      }
      return nextTracks.length > 0 ? new MediaStream(nextTracks) : null
    })
  }, [])

  const stopCameraProducer = useCallback(() => {
    cameraProducerRef.current?.close()
    cameraProducerRef.current = null
  }, [])

  const stopScreenProducer = useCallback(() => {
    screenProducerRef.current?.close()
    screenProducerRef.current = null
  }, [])

  const clearCameraTrack = useCallback(() => {
    if (cameraTrackRef.current) {
      cameraTrackRef.current.stop()
      cameraTrackRef.current = null
    }
  }, [])

  const clearScreenTrack = useCallback(() => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop()
      screenTrackRef.current = null
    }
  }, [])

  const stopScreenShareInternal = useCallback(async () => {
    stopScreenProducer()
    clearScreenTrack()

    let restoredCamera = false
    if (
      cameraWasActiveBeforeScreenShareRef.current &&
      cameraProducerRef.current &&
      cameraTrackRef.current
    ) {
      cameraTrackRef.current.enabled = true
      await cameraProducerRef.current.resume()
      restoredCamera = true
    }
    cameraWasActiveBeforeScreenShareRef.current = false

    rebuildLocalStream()
    setIsScreenSharing(false)
    setIsVideoOn(restoredCamera)
    socketRef.current?.emit('updateVoiceState', {
      selfMute: isMuted,
      selfDeaf: false,
      selfVideo: restoredCamera,
    })
  }, [clearScreenTrack, isMuted, rebuildLocalStream, stopScreenProducer])

  useEffect(() => {
    socketRef.current = io(VOICE_URL, {
      path: VOICE_SOCKET_PATH,
    })

    socketRef.current.on('connect', () => {
      console.log('Connected to voice service signaling server')
    })

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from voice service')
      setIsConnected(false)
      setCurrentRoomId(null)
      setPeers({})
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  const initDevice = async (rtpCapabilities: mediasoupClient.types.RtpCapabilities) => {
    const device = new mediasoupClient.Device()
    await device.load({ routerRtpCapabilities: rtpCapabilities })
    deviceRef.current = device
    return device
  }

  const createSendTransport = async () => {
    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('createTransport', { direction: 'send' }, (params: any) => {
        if (params.error) {
          reject(params.error)
          return
        }

        const transport = deviceRef.current?.createSendTransport(params)
        if (!transport) {
          reject(new Error('Unable to create send transport'))
          return
        }

        sendTransportRef.current = transport

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketRef.current?.emit(
            'connectTransport',
            {
              transportId: transport.id,
              dtlsParameters,
            },
            (response: any) => {
              if (response.error) {
                errback(new Error(response.error))
              } else {
                callback()
              }
            }
          )
        })

        transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
          socketRef.current?.emit(
            'produce',
            {
              transportId: transport.id,
              kind,
              rtpParameters,
              appData,
            },
            (response: any) => {
              if (response.error) {
                errback(new Error(response.error))
              } else {
                callback({ id: response.id })
              }
            }
          )
        })

        resolve()
      })
    })
  }

  const createRecvTransport = async () => {
    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('createTransport', { direction: 'recv' }, (params: any) => {
        if (params.error) {
          reject(params.error)
          return
        }

        const transport = deviceRef.current?.createRecvTransport(params)
        if (!transport) {
          reject(new Error('Unable to create receive transport'))
          return
        }

        recvTransportRef.current = transport

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketRef.current?.emit(
            'connectTransport',
            {
              transportId: transport.id,
              dtlsParameters,
            },
            (response: any) => {
              if (response.error) {
                errback(new Error(response.error))
              } else {
                callback()
              }
            }
          )
        })

        resolve()
      })
    })
  }

  const consumeTrack = async (producerId: string, peerId: string, userId: string) => {
    if (!recvTransportRef.current || !deviceRef.current) {
      return
    }

    socketRef.current?.emit(
      'consume',
      {
        transportId: recvTransportRef.current.id,
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities,
      },
      async (params: any) => {
        if (params.error) {
          console.error('Consume error:', params.error)
          return
        }

        const consumer = await recvTransportRef.current?.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
        })

        if (!consumer) {
          return
        }

        consumersRef.current.set(consumer.id, consumer)
        socketRef.current?.emit('resume', { consumerId: consumer.id }, () => {})

        setPeers((currentPeers) => {
          const existingPeer = currentPeers[peerId]
          const stream = existingPeer ? existingPeer.stream : new MediaStream()
          stream.addTrack(consumer.track)

          return {
            ...currentPeers,
            [peerId]: {
              id: peerId,
              userId: userId || existingPeer?.userId || peerId,
              stream,
              selfMute: existingPeer?.selfMute || false,
              selfDeaf: existingPeer?.selfDeaf || false,
              selfVideo: existingPeer?.selfVideo || false,
            },
          }
        })
      }
    )
  }

  const joinRoom = useCallback(
    async (roomId: string, userId = 'user') => {
      if (!socketRef.current || currentRoomId === roomId) {
        return
      }

      if (currentRoomId) {
        socketRef.current.emit('leaveRoom')
      }

      setCurrentRoomId(roomId)

      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        setLocalStream(stream)
      } catch (error) {
        console.error('Failed to get local media:', error)
      }

      socketRef.current.emit('joinRoom', { roomId, userId }, async (response: any) => {
        if (response.error) {
          console.error('Failed to join room:', response.error)
          return
        }

        await initDevice(response.rtpCapabilities)
        await createSendTransport()
        await createRecvTransport()

        socketRef.current?.on('newProducer', ({ producerId, peerId, userId: remoteUserId }) => {
          consumeTrack(producerId, peerId, remoteUserId)
        })

        socketRef.current?.on('peerLeft', ({ peerId }) => {
          setPeers((currentPeers) => {
            const nextPeers = { ...currentPeers }
            delete nextPeers[peerId]
            return nextPeers
          })
        })

        socketRef.current?.on('peerVoiceState', ({ peerId, selfMute, selfDeaf, selfVideo }) => {
          setPeers((currentPeers) => {
            if (!currentPeers[peerId]) {
              return currentPeers
            }

            return {
              ...currentPeers,
              [peerId]: {
                ...currentPeers[peerId],
                selfMute,
                selfDeaf,
                selfVideo,
              },
            }
          })
        })

        for (const producer of response.existingProducers || []) {
          await consumeTrack(producer.producerId, producer.peerId, producer.userId || producer.peerId)
        }

        if (stream) {
          const audioTrack = stream.getAudioTracks()[0]
          if (audioTrack && sendTransportRef.current) {
            audioProducerRef.current = await sendTransportRef.current.produce({ track: audioTrack })
          }
        }

        setIsConnected(true)
        socketRef.current?.emit('updateVoiceState', {
          selfMute: false,
          selfDeaf: false,
          selfVideo: false,
        })
      })
    },
    [consumeTrack, currentRoomId]
  )

  const leaveRoom = useCallback(() => {
    socketRef.current?.off('newProducer')
    socketRef.current?.off('peerLeft')
    socketRef.current?.off('peerVoiceState')
    socketRef.current?.emit('leaveRoom')

    localStream?.getTracks().forEach((track) => track.stop())
    setLocalStream(null)

    consumersRef.current.forEach((consumer) => consumer.close())
    consumersRef.current.clear()

    audioProducerRef.current?.close()
    audioProducerRef.current = null
    stopCameraProducer()
    stopScreenProducer()

    sendTransportRef.current?.close()
    recvTransportRef.current?.close()
    sendTransportRef.current = null
    recvTransportRef.current = null

    clearCameraTrack()
    clearScreenTrack()
    cameraWasActiveBeforeScreenShareRef.current = false

    setPeers({})
    setCurrentRoomId(null)
    setIsConnected(false)
    setIsMuted(false)
    setIsVideoOn(false)
    setIsScreenSharing(false)
  }, [clearCameraTrack, clearScreenTrack, localStream, stopCameraProducer, stopScreenProducer])

  const toggleMute = useCallback(() => {
    if (!audioProducerRef.current) {
      return
    }

    const nextMuted = !isMuted
    if (nextMuted) {
      audioProducerRef.current.pause()
    } else {
      audioProducerRef.current.resume()
    }

    setIsMuted(nextMuted)
    socketRef.current?.emit('updateVoiceState', {
      selfMute: nextMuted,
      selfDeaf: false,
      selfVideo: isVideoOn || isScreenSharing,
    })
  }, [isMuted, isScreenSharing, isVideoOn])

  const toggleVideo = useCallback(async () => {
    if (!sendTransportRef.current) {
      return
    }

    if (isVideoOn) {
      stopCameraProducer()
      clearCameraTrack()
      rebuildLocalStream()
      setIsVideoOn(false)
      socketRef.current?.emit('updateVoiceState', {
        selfMute: isMuted,
        selfDeaf: false,
        selfVideo: isScreenSharing,
      })
      return
    }

    if (isScreenSharing) {
      await stopScreenShareInternal()
    }

    try {
      if (cameraProducerRef.current && cameraTrackRef.current) {
        cameraTrackRef.current.enabled = true
        await cameraProducerRef.current.resume()
        rebuildLocalStream()
        setIsVideoOn(true)
        socketRef.current?.emit('updateVoiceState', {
          selfMute: isMuted,
          selfDeaf: false,
          selfVideo: true,
        })
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const videoTrack = stream.getVideoTracks()[0]
      cameraTrackRef.current = videoTrack
      cameraProducerRef.current = await sendTransportRef.current.produce({
        track: videoTrack,
        appData: { source: 'camera' },
        encodings: [{ maxBitrate: 2_500_000, maxFramerate: 30, scaleResolutionDownBy: 1 }],
        codecOptions: { videoGoogleStartBitrate: 1200 },
      })
      rebuildLocalStream()
      setIsVideoOn(true)
      socketRef.current?.emit('updateVoiceState', {
        selfMute: isMuted,
        selfDeaf: false,
        selfVideo: true,
      })
    } catch (error) {
      console.error('Failed to get video:', error)
    }
  }, [
    clearCameraTrack,
    isMuted,
    isScreenSharing,
    isVideoOn,
    rebuildLocalStream,
    stopScreenShareInternal,
    stopCameraProducer,
  ])

  const toggleScreenShare = useCallback(async () => {
    if (!sendTransportRef.current) {
      return
    }

    if (isScreenSharing) {
      await stopScreenShareInternal()
      return
    }

    if (isVideoOn) {
      cameraWasActiveBeforeScreenShareRef.current = true
      if (cameraTrackRef.current) {
        cameraTrackRef.current.enabled = false
      }
      if (cameraProducerRef.current) {
        await cameraProducerRef.current.pause()
      }
      setIsVideoOn(false)
    } else {
      cameraWasActiveBeforeScreenShareRef.current = false
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { max: 30 },
        },
        audio: false,
      })
      const screenTrack = stream.getVideoTracks()[0]
      screenTrackRef.current = screenTrack

      screenTrack.onended = () => {
        stopScreenShareInternal().catch((error) => {
          console.error('Failed to stop screen share:', error)
        })
      }

      screenProducerRef.current = await sendTransportRef.current.produce({
        track: screenTrack,
        appData: { source: 'screen' },
        encodings: [{ maxBitrate: 8_000_000, maxFramerate: 30, scaleResolutionDownBy: 1 }],
        codecOptions: { videoGoogleStartBitrate: 3000 },
      })
      rebuildLocalStream()
      setIsScreenSharing(true)
      socketRef.current?.emit('updateVoiceState', {
        selfMute: isMuted,
        selfDeaf: false,
        selfVideo: true,
      })
    } catch (error) {
      if (
        cameraWasActiveBeforeScreenShareRef.current &&
        cameraProducerRef.current &&
        cameraTrackRef.current
      ) {
        cameraTrackRef.current.enabled = true
        await cameraProducerRef.current.resume()
        rebuildLocalStream()
        setIsVideoOn(true)
      }
      cameraWasActiveBeforeScreenShareRef.current = false
      console.error('Failed to start screen share:', error)
    }
  }, [
    isMuted,
    isScreenSharing,
    isVideoOn,
    rebuildLocalStream,
    stopScreenShareInternal,
  ])

  return {
    isConnected,
    currentRoomId,
    peers: Object.values(peers),
    localStream,
    isMuted,
    isVideoOn,
    isScreenSharing,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  }
}
