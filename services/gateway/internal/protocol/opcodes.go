package protocol

// Opcodes as defined in the spec
const (
	// Client -> Server
	OpHeartbeat        = 1
	OpIdentify         = 2
	OpVoiceStateUpdate = 4
	OpRequestMembers   = 8

	// Server -> Client
	OpDispatch     = 0
	OpReconnect    = 7
	OpInvalidSession = 9
	OpHello        = 10
	OpHeartbeatAck = 11
)

// Event types for OpDispatch
const (
	EventReady               = "READY"
	EventMessageCreate       = "MESSAGE_CREATE"
	EventMessageUpdate       = "MESSAGE_UPDATE"
	EventMessageDelete       = "MESSAGE_DELETE"
	EventMessageReactionAdd  = "MESSAGE_REACTION_ADD"
	EventMessageReactionRemove = "MESSAGE_REACTION_REMOVE"
	EventTypingStart         = "TYPING_START"
	EventChannelCreate       = "CHANNEL_CREATE"
	EventChannelUpdate       = "CHANNEL_UPDATE"
	EventChannelDelete       = "CHANNEL_DELETE"
	EventThreadCreate        = "THREAD_CREATE"
	EventThreadUpdate        = "THREAD_UPDATE"
	EventVoiceStateUpdate    = "VOICE_STATE_UPDATE"
	EventPresenceUpdate      = "PRESENCE_UPDATE"
	EventMemberUpdate        = "WORKSPACE_MEMBER_UPDATE"
	EventMemberRemove        = "WORKSPACE_MEMBER_REMOVE"
	
	// TeamCord extensions
	EventAiAgentTyping       = "AI_AGENT_TYPING"
	EventDecisionLogged      = "DECISION_LOGGED"
	EventWikiUpdated         = "WIKI_UPDATED"
)

type GatewayPayload struct {
	Op int         `json:"op"`
	D  interface{} `json:"d"`
	S  *int        `json:"s,omitempty"` // Sequence number
	T  *string     `json:"t,omitempty"` // Event name
}
