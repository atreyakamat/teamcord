import { useEffect, useRef } from 'react'
import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from 'lucide-react'
import { useAuthStore } from '../../stores/auth'
import { useVoice } from '../../hooks/useVoice'

interface VoiceChannelProps {
  channelId: string
  onLeave: () => void
}

export const VoiceChannel = ({ channelId, onLeave }: VoiceChannelProps) => {
  const user = useAuthStore((state) => state.user)
  const {
    isConnected,
    peers,
    localStream,
    isMuted,
    isVideoOn,
    isScreenSharing,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useVoice()

  useEffect(() => {
    const userId = user?.id || `guest-${Math.random().toString(36).slice(2, 8)}`
    joinRoom(channelId, userId)

    return () => {
      leaveRoom()
    }
  }, [channelId, joinRoom, leaveRoom, user?.id])

  const handleDisconnect = () => {
    leaveRoom()
    onLeave()
  }

  return (
    <div className="flex h-full w-full flex-col bg-dc-primary p-4">
      <div className="flex items-center justify-between border-b border-dc-tertiary pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Voice Channel</h2>
          <p className="mt-1 text-sm text-dc-muted">
            Camera, audio, and screen sharing now run inside the same TeamCord room.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-dc-muted">
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-dc-green' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {localStream && (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black shadow-lg">
              <VideoBox stream={localStream} muted isLocal />
              <div className="absolute bottom-2 left-2 flex items-center space-x-2 rounded bg-black/60 px-2 py-1 text-sm text-white">
                <span>{user?.displayName || 'You'}</span>
                {isMuted && <MicOff size={14} className="text-red-400" />}
                {isScreenSharing && (
                  <span className="rounded bg-[rgba(255,122,24,0.9)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#10292f]">
                    Screen
                  </span>
                )}
              </div>
            </div>
          )}

          {peers.map((peer) => (
            <div key={peer.id} className="relative aspect-video overflow-hidden rounded-lg bg-black shadow-lg">
              <VideoBox stream={peer.stream} />
              <div className="absolute bottom-2 left-2 flex items-center space-x-2 rounded bg-black/60 px-2 py-1 text-sm text-white">
                <span>{peer.userId}</span>
                {peer.selfMute && <MicOff size={14} className="text-red-400" />}
              </div>
            </div>
          ))}
        </div>

        {peers.length === 0 && isConnected && (
          <div className="flex h-full items-center justify-center text-dc-muted">
            <p>You are the only one here. Waiting for others to join...</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center space-x-4 rounded-lg bg-dc-secondary p-4 shadow-md">
        <ControlButton
          icon={isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          active={!isMuted}
          danger={isMuted}
          onClick={toggleMute}
          tooltip={isMuted ? 'Unmute' : 'Mute'}
        />
        <ControlButton
          icon={isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
          active={isVideoOn}
          danger={!isVideoOn}
          onClick={toggleVideo}
          tooltip={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
        />
        <ControlButton
          icon={<MonitorUp size={24} />}
          active={isScreenSharing}
          onClick={toggleScreenShare}
          tooltip={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        />
        <div className="mx-2 h-8 w-px bg-dc-tertiary" />
        <button
          type="button"
          onClick={handleDisconnect}
          className="flex h-12 w-16 items-center justify-center rounded-lg bg-red-500 text-white transition hover:bg-red-600"
          title="Disconnect"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  )
}

const VideoBox = ({
  stream,
  muted = false,
  isLocal = false,
}: {
  stream: MediaStream
  muted?: boolean
  isLocal?: boolean
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const hasVideo = stream.getVideoTracks().length > 0

    if (hasVideo && videoRef.current) {
      videoRef.current.srcObject = stream
    } else if (!hasVideo && audioRef.current && !muted) {
      audioRef.current.srcObject = stream
    }
  }, [stream, muted])

  const hasVideo = stream.getVideoTracks().length > 0

  return (
    <>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`h-full w-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-dc-tertiary">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-dc-green text-3xl font-bold text-white">
            ?
          </div>
          {!muted && <audio ref={audioRef} autoPlay playsInline />}
        </div>
      )}
    </>
  )
}

const ControlButton = ({
  icon,
  active,
  danger = false,
  onClick,
  tooltip,
}: {
  icon: React.ReactNode
  active: boolean
  danger?: boolean
  onClick: () => void
  tooltip: string
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition
        ${active ? 'bg-dc-hover text-white hover:bg-dc-tertiary' : ''}
        ${danger && !active ? 'bg-red-500 text-white hover:bg-red-600' : ''}
        ${!active && !danger ? 'bg-dc-tertiary text-dc-muted hover:text-white' : ''}
      `}
    >
      {icon}
    </button>
  )
}
