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
  const videoProducerRef = useRef<mediasoupClient.types.Producer | null>(null)
  const consumersRef = useRef<Map<string, mediasoupClient.types.Consumer>>(new Map())
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null)
  const screenTrackRef = useRef<MediaStreamTrack | null>(null)

  const rebuildLocalStream = useCallback((nextVideoTrack: MediaStreamTrack | null) => {
    setLocalStream((current) => {
      const audioTracks = current?.getAudioTracks() || []
      const nextTracks = [...audioTracks]
      if (nextVideoTrack) {
        nextTracks.push(nextVideoTrack)
      }
      return nextTracks.length > 0 ? new MediaStream(nextTracks) : null
    })
  }, [])

  const stopVideoProducer = useCallback(() => {
    videoProducerRef.current?.close()
    videoProducerRef.current = null
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
    stopVideoProducer()
    clearScreenTrack()
    rebuildLocalStream(cameraTrackRef.current)
    setIsScreenSharing(false)
    socketRef.current?.emit('updateVoiceState', {
      selfMute: isMuted,
      selfDeaf: false,
      selfVideo: isVideoOn,
    })
  }, [clearScreenTrack, isMuted, isVideoOn, rebuildLocalStream, stopVideoProducer])

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
    stopVideoProducer()

    sendTransportRef.current?.close()
    recvTransportRef.current?.close()
    sendTransportRef.current = null
    recvTransportRef.current = null

    clearCameraTrack()
    clearScreenTrack()

    setPeers({})
    setCurrentRoomId(null)
    setIsConnected(false)
    setIsMuted(false)
    setIsVideoOn(false)
    setIsScreenSharing(false)
  }, [clearCameraTrack, clearScreenTrack, localStream, stopVideoProducer])

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
      stopVideoProducer()
      clearCameraTrack()
      rebuildLocalStream(screenTrackRef.current)
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const videoTrack = stream.getVideoTracks()[0]
      cameraTrackRef.current = videoTrack
      videoProducerRef.current = await sendTransportRef.current.produce({
        track: videoTrack,
      })
      rebuildLocalStream(videoTrack)
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
    stopVideoProducer,
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
      stopVideoProducer()
      clearCameraTrack()
      setIsVideoOn(false)
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = stream.getVideoTracks()[0]
      screenTrackRef.current = screenTrack

      screenTrack.onended = () => {
        stopScreenShareInternal().catch((error) => {
          console.error('Failed to stop screen share:', error)
        })
      }

      videoProducerRef.current = await sendTransportRef.current.produce({
        track: screenTrack,
        appData: { source: 'screen' },
      })
      rebuildLocalStream(screenTrack)
      setIsScreenSharing(true)
      socketRef.current?.emit('updateVoiceState', {
        selfMute: isMuted,
        selfDeaf: false,
        selfVideo: true,
      })
    } catch (error) {
      console.error('Failed to start screen share:', error)
    }
  }, [
    clearCameraTrack,
    isMuted,
    isScreenSharing,
    isVideoOn,
    rebuildLocalStream,
    stopScreenShareInternal,
    stopVideoProducer,
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
