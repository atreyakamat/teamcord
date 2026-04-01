import { useEffect, useRef } from 'react';
import { useVoice, Peer } from '../../hooks/useVoice';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp } from 'lucide-react';

interface VoiceChannelProps {
  channelId: string;
  onLeave: () => void;
}

export const VoiceChannel = ({ channelId, onLeave }: VoiceChannelProps) => {
  const {
    isConnected,
    peers,
    localStream,
    isMuted,
    isVideoOn,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleVideo
  } = useVoice();

  useEffect(() => {
    // We assume the user has some ID and Name in a real app
    const userId = `user-${Math.random().toString(36).substring(7)}`;
    joinRoom(channelId, userId);

    return () => {
      leaveRoom();
    };
  }, [channelId, joinRoom, leaveRoom]);

  const handleDisconnect = () => {
    leaveRoom();
    onLeave();
  };

  return (
    <div className="flex h-full w-full flex-col bg-dc-primary p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dc-tertiary pb-4">
        <h2 className="text-xl font-bold text-white">Voice Channel</h2>
        <div className="flex items-center space-x-2 text-dc-muted">
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-dc-green' : 'bg-red-500'}`}></span>
          <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-grow overflow-y-auto py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Local User */}
          {localStream && (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black shadow-lg">
              <VideoBox stream={localStream} muted={true} isLocal />
              <div className="absolute bottom-2 left-2 flex items-center space-x-2 rounded bg-black/60 px-2 py-1 text-sm text-white">
                <span>You</span>
                {isMuted && <MicOff size={14} className="text-red-400" />}
              </div>
            </div>
          )}

          {/* Remote Peers */}
          {peers.map((peer) => (
            <div key={peer.id} className="relative aspect-video overflow-hidden rounded-lg bg-black shadow-lg">
              <VideoBox stream={peer.stream} />
              <div className="absolute bottom-2 left-2 flex items-center space-x-2 rounded bg-black/60 px-2 py-1 text-sm text-white">
                <span>{peer.userId}</span>
                {peer.selfMute && <MicOff size={14} className="text-red-400" />}
                {peer.selfDeaf && <PhoneOff size={14} className="text-red-400" />}
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

      {/* Control Bar */}
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
          tooltip={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'} 
        />
        <ControlButton 
          icon={<MonitorUp size={24} />} 
          active={false} 
          onClick={() => alert('Screen share not implemented yet')} 
          tooltip="Share Screen" 
        />
        <div className="h-8 w-px bg-dc-tertiary mx-2"></div>
        <button 
          onClick={handleDisconnect}
          className="flex h-12 w-16 items-center justify-center rounded-lg bg-red-500 text-white transition hover:bg-red-600"
          title="Disconnect"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};

// Helper component to render MediaStream
const VideoBox = ({ stream, muted = false, isLocal = false }: { stream: MediaStream, muted?: boolean, isLocal?: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const hasVideo = stream.getVideoTracks().length > 0;
    
    if (hasVideo && videoRef.current) {
      videoRef.current.srcObject = stream;
    } else if (!hasVideo && audioRef.current && !muted) {
      audioRef.current.srcObject = stream;
    }
  }, [stream, muted]);

  const hasVideo = stream.getVideoTracks().length > 0;

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
            {/* Fallback avatar */}
            ?
          </div>
          {!muted && <audio ref={audioRef} autoPlay playsInline />}
        </div>
      )}
    </>
  );
};

const ControlButton = ({ 
  icon, 
  active, 
  danger = false,
  onClick, 
  tooltip 
}: { 
  icon: React.ReactNode; 
  active: boolean; 
  danger?: boolean;
  onClick: () => void; 
  tooltip: string; 
}) => {
  return (
    <button
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
  );
};