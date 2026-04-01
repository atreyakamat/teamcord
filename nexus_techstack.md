+-----------------------------------------------------------------------+
| **Nexus**                                                             |
|                                                                       |
| The Discord We Deserved                                               |
|                                                                       |
| **Tech Stack & Design Principles \| v1.0 \| 2025**                    |
+-----------------------------------------------------------------------+

  ----------------- ------------------- ----------------- --------------------
  **Open Source     **Self-Hostable**   **AI-Native**     **Discord-Inspired
  (MIT)**                                                 UI**

  ----------------- ------------------- ----------------- --------------------

  -----------------------------------------------------------------------
  **\# overview**

  -----------------------------------------------------------------------

This document describes the complete technical stack and design
principles behind Nexus --- a from-scratch reimplementation of the
Discord experience, built for professional teams, agencies, and
privacy-conscious organisations.

We have reverse-engineered every aspect of Discord\'s UI, UX, and
feature set, then made deliberate architectural decisions that fix the
things Discord gets wrong: data ownership, performance, knowledge
management, and AI-native tooling.

  -----------------------------------------------------------------------
  **\# discord-ui-anatomy --- what we are replicating**

  -----------------------------------------------------------------------

Discord\'s layout is a three-panel design that has become one of the
most recognisable interfaces on the internet. We replicate every layer
of it exactly.

▸ **LAYOUT LAYERS**

\# **server list --- far left rail**

A 72px-wide dark rail (background: #1E1F22) showing server icons as 48px
rounded squares (border-radius: 50% when unselected, 30% when selected).
We replicate this with the same dimensions, the same \'pill\' indicator
for active server, and the same unread badge system.

\# **channel sidebar --- left panel**

240px wide, background #2B2D31. Contains: server name header, voice
channel status bar, and scrollable channel list grouped by collapsible
categories. Channel names are prefixed with \# for text, a speaker icon
for voice. We use the exact same 32px row height, the same hover state
(#35373C), and the same selected state (#404249).

\# **main chat panel --- centre**

Flexible width, background #313338. Contains: channel header bar,
message list with date separators, and the input bar at the bottom.
Message rows are 44px min-height, hover reveals the action row (react,
reply, edit, more). We replicate all of this including the
jump-to-bottom FAB.

\# **member list --- right panel**

240px wide, background #2B2D31. Shows online members grouped by role
with presence indicators (green = online, yellow = idle, red = DND, grey
= offline). We replicate the exact 8px presence dot size and position.

▸ **TYPOGRAPHY**

Discord uses \'gg sans\' (their proprietary font, released 2022) and
\'Whitney\' (their legacy font). For Nexus we use Inter as the closest
open-source equivalent --- same proportions, similar optical weight.
Monospace text (code blocks, IDs) uses JetBrains Mono.

+-----------------------------------------------------------------------+
| // Font stack --- Nexus design system                                 |
|                                                                       |
| font-family: \'Inter\', \'gg sans\', \'Noto Sans\', sans-serif;       |
|                                                                       |
| font-family-mono: \'JetBrains Mono\', \'Consolas\', monospace;        |
|                                                                       |
| // Discord exact sizes (we match these)                               |
|                                                                       |
| font-size-message: 16px // message body                               |
|                                                                       |
| font-size-ui: 14px // channel names, member list                      |
|                                                                       |
| font-size-category: 12px // category labels (uppercase)               |
|                                                                       |
| font-size-timestamp: 12px // message timestamps                       |
|                                                                       |
| line-height-message: 1.375 // Discord\'s exact line height            |
+-----------------------------------------------------------------------+

▸ **COLOUR SYSTEM --- EXACT DISCORD DARK THEME VALUES**

+----------------------------------+-----------------------------------+
| **Background layers**            | **Brand & status colours**        |
|                                  |                                   |
|   ---- ------------------------  |   ---- -------------------------  |
|        #1E1F22 --- bgTertiary    |        #5865F2 --- Blurple        |
|        (server list)             |        (primary brand)            |
|                                  |                                   |
|   ---- ------------------------  |   ---- -------------------------  |
|                                  |                                   |
|   ---- ------------------------  |   ---- -------------------------  |
|        #2B2D31 --- bgSecondary   |        #57F287 --- Green (online  |
|        (channel sidebar)         |        / success)                 |
|                                  |                                   |
|   ---- ------------------------  |   ---- -------------------------  |
|                                  |                                   |
|   ---- ------------------------  |   ---- -------------------------  |
|        #313338 --- bgPrimary     |        #FEE75C --- Yellow (idle   |
|        (chat area)               |        / warning)                 |
|                                  |                                   |
|   ---- ------------------------  |   ---- -------------------------  |
|                                  |                                   |
|   ---- ------------------------  |   ---- -------------------------  |
|        #383A40 --- bgInput       |        #ED4245 --- Red (DND /     |
|        (message box)             |        danger)                    |
|                                  |                                   |
|   ---- ------------------------  |   ---- -------------------------  |
|                                  |                                   |
|   ---- ------------------------  |   ---- -------------------------  |
|        #404249 --- bgHover /     |        #EB459E --- Fuchsia        |
|        selected channel          |        (boosts / special)         |
|                                  |                                   |
|   ---- ------------------------  |   ---- -------------------------  |
+----------------------------------+-----------------------------------+

▸ **COMPONENT SPECS --- EXACT MEASUREMENTS**

+-----------------------------------------------------------------------+
| // Discord component measurements --- Nexus matches these exactly     |
|                                                                       |
| // Server list rail                                                   |
|                                                                       |
| width: 72px                                                           |
|                                                                       |
| server-icon-size: 48px                                                |
|                                                                       |
| icon-border-radius: 50% → 30% (on select, animated 200ms ease)        |
|                                                                       |
| active-pill: 4px wide, 40px tall, #FFFFFF, left edge                  |
|                                                                       |
| // Channel sidebar                                                    |
|                                                                       |
| width: 240px                                                          |
|                                                                       |
| channel-row-height: 32px                                              |
|                                                                       |
| channel-padding: 0 8px                                                |
|                                                                       |
| category-height: 40px (first) / 32px (subsequent)                     |
|                                                                       |
| category-font: 12px, uppercase, letter-spacing: 0.02em                |
|                                                                       |
| // Messages                                                           |
|                                                                       |
| avatar-size: 40px, border-radius: 50%                                 |
|                                                                       |
| message-padding: 2px 16px                                             |
|                                                                       |
| grouped-padding: 0 16px (no avatar, 44px left indent)                 |
|                                                                       |
| timestamp-opacity: 0 → 1 on row hover                                 |
|                                                                       |
| action-bar-top: -16px from message top                                |
|                                                                       |
| // Input bar                                                          |
|                                                                       |
| height: 44px min (grows with content)                                 |
|                                                                       |
| border-radius: 8px                                                    |
|                                                                       |
| background: #383A40                                                   |
|                                                                       |
| padding: 11px 16px                                                    |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **\# tech-stack --- complete layer breakdown**

  -----------------------------------------------------------------------

Every technology choice is made to match or exceed Discord\'s
capabilities while remaining self-hostable on modest hardware. Where
Discord uses proprietary internal systems, we use the best open-source
equivalent.

▸ **CLIENT LAYER**

  -----------------------------------------------------------------------
  **Layer**        **Technology**      **Why we chose it**
  ---------------- ------------------- ----------------------------------
  **Web app**      React 18 + Vite     Same SPA pattern as Discord web.
                                       Vite gives sub-300ms HMR in dev.
                                       Code-splits per route for fast
                                       initial load.

  **Desktop**      Tauri 2.0           Rust-based alternative to
                                       Electron. 50--80MB RAM vs
                                       Discord\'s 300MB+. Ships a real
                                       native webview, not a bundled
                                       Chromium.

  **Mobile**       React Native 0.74   Shared component logic with web
                                       via a platform-abstraction layer.
                                       Expo for OTA updates without app
                                       store roundtrips.

  **State mgmt**   Zustand + Immer     Discord uses internal Flux-derived
                                       store. Zustand is smaller, faster,
                                       and easier to reason about for
                                       complex real-time state.

  **Real-time**    Socket.io client    Manages WebSocket reconnection,
                                       fallback transports, and event
                                       multiplexing. Matches Discord\'s
                                       reconnect UX exactly.

  **UI library**   Radix UI + Tailwind Radix for accessible headless
                                       primitives (context menus,
                                       tooltips, popovers). Tailwind for
                                       Discord-matching utility classes.

  **CSS vars**     CSS custom          Full Discord dark/light theme
                   properties          replication via CSS variables.
                                       Theme switch is instant (no
                                       re-render), same as Discord.

  **Voice client** mediasoup-client    WebRTC SFU client. Handles codec
                                       negotiation (Opus for audio,
                                       VP8/H264 for video). Same codec
                                       stack as Discord.
  -----------------------------------------------------------------------

▸ **GATEWAY & TRANSPORT**

  -----------------------------------------------------------------------
  **Layer**        **Technology**      **Why we chose it**
  ---------------- ------------------- ----------------------------------
  **Reverse        Caddy 2             Auto-TLS via Let\'s Encrypt.
  proxy**                              Zero-config HTTPS. WebSocket
                                       proxying. Rate limiting
                                       middleware. Single binary.

  **API gateway**  Go + Chi router     Thin gateway layer: auth header
                                       validation, rate limit
                                       enforcement, request routing to
                                       downstream services.

  **WebSocket**    Go + gorilla/ws     Each WS connection is a goroutine
                                       (2--4 KB). Handles 50K+ concurrent
                                       connections on a 4-core server.
                                       Discord equivalent: Elixir/BEAM.

  **Protocol**     JSON over WS        Discord\'s gateway protocol
                                       (dispatch events, heartbeat,
                                       identify) replicated exactly ---
                                       including opcode numbers for
                                       client compatibility.

  **TLS**          TLS 1.3 only        Discord enforces TLS 1.2+. We
                                       require 1.3. Removes legacy cipher
                                       suite attack surface.
  -----------------------------------------------------------------------

▸ **CORE SERVICES**

  -----------------------------------------------------------------------
  **Layer**        **Technology**      **Why we chose it**
  ---------------- ------------------- ----------------------------------
  **Messaging      Go                  Handles message
  svc**                                create/edit/delete, channel
                                       fan-out, read state tracking.
                                       Stateless --- scales horizontally.

  **Auth svc**     Keycloak 24         OIDC/OAuth2/SAML. Social login
                                       (Google, GitHub, Apple). Discord
                                       uses proprietary OAuth2 server.
                                       Keycloak is equivalent in
                                       features.

  **Voice/video    mediasoup 3         Node.js WebRTC SFU. Selective
  svc**                                forwarding (no server-side
                                       decode). Supports simulcast, SVC,
                                       DTLS-SRTP. Same approach as
                                       Discord.

  **Notification   Go                  Fan-out push notifications (FCM,
  svc**                                APNs, web push). Email digests via
                                       SMTP or Resend API. Discord
                                       equivalent: custom push system.

  **File svc**     Go + MinIO          Multipart upload, chunked
                                       download, image resizing
                                       (libvips). Generates presigned
                                       URLs for direct client-to-storage
                                       uploads.

  **AI agent svc** Python + FastAPI    Runs agent tool loop.
                                       Provider-agnostic (Ollama or
                                       Claude). Streams tokens back to
                                       messaging service via NATS.

  **Search svc**   Go + Meilisearch    Indexes messages, threads, docs on
                                       write. Query latency \<100ms.
                                       Discord\'s search is consistently
                                       criticised; ours is not.
  -----------------------------------------------------------------------

▸ **MESSAGE BUS & STREAMING**

  ------------------------------------------------------------------------
  **Layer**         **Technology**      **Why we chose it**
  ----------------- ------------------- ----------------------------------
  **Broker**        NATS JetStream      Single binary. Persistent streams
                                        with consumer groups. Fan-out for
                                        real-time delivery. Replay for
                                        reconnecting clients. No
                                        ZooKeeper.

  **Topics**        channel.{id}        One subject per channel. AI agent
                                        subscribes to all subjects
                                        matching channel.\>. Presence
                                        events on presence.{userId}.

  **Persistence**   JetStream Streams   Messages stored for configurable
                                        retention window. Clients request
                                        replay from last-seen sequence on
                                        reconnect.

  **Delivery**      At-least-once       Consumers ack messages. Unacked
                                        messages re-delivered after
                                        timeout. Exactly-once via dedup ID
                                        on producer side.
  ------------------------------------------------------------------------

▸ **DATA LAYER**

  ------------------------------------------------------------------------
  **Layer**         **Technology**      **Why we chose it**
  ----------------- ------------------- ----------------------------------
  **Primary DB**    PostgreSQL 16       Users, channels, permissions,
                                        message metadata. JSONB for
                                        message embeds and custom
                                        metadata. Row-level security for
                                        multi-tenancy.

  **Time-series**   TimescaleDB         Message content stored as
                    extension           time-series. Automatic chunking by
                                        time. Fast range queries for
                                        history load (Discord\'s biggest
                                        pain point).

  **Cache**         Redis 7 (Valkey)    Session tokens, presence state,
                                        rate limit counters, channel
                                        member lists. Valkey is the
                                        open-source Redis fork
                                        post-licence change.

  **Search index**  Meilisearch 1.8     Full-text search with typo
                                        tolerance. Faceted filtering by
                                        channel, author, date. Index
                                        updated async via NATS consumer.

  **Object store**  MinIO               Avatars, file attachments, video
                    (S3-compatible)     clips. Swap for AWS S3 or
                                        Cloudflare R2 in cloud
                                        deployments. No code change
                                        needed.

  **Migrations**    golang-migrate      SQL migration files
                                        version-controlled. Runs at
                                        service startup. Rollback
                                        supported.
  ------------------------------------------------------------------------

▸ **AI AGENT STACK**

  -----------------------------------------------------------------------
  **Layer**        **Technology**      **Why we chose it**
  ---------------- ------------------- ----------------------------------
  **Runtime**      Python 3.12 +       Async agent loop. Concurrent tool
                   asyncio             calls. SSE streaming back to chat.

  **Framework**    LangChain 0.2       Provider-agnostic LLM abstraction.
                                       Same agent code runs on Ollama
                                       (community) and Claude API
                                       (Plus/Pro).

  **Community      Ollama (local)      Llama 3.1 8B / Mistral 7B / Phi-3
  LLM**                                Mini. Runs on the same server as
                                       Nexus. No external API calls. Full
                                       privacy.

  **Cloud LLM**    Claude (Anthropic   claude-sonnet-4-5 on Plus/Pro. API
                   API)                key stored server-side, encrypted
                                       at rest. Never exposed to client.

  **Web search**   SearXNG             Meta-search engine. No API keys.
                   (self-hosted)       Federates Google/Bing/DDG.
                                       Community edition gets web search
                                       for free.

  **Code           Deno sandbox        Sandboxed JS/TS execution. V8
  execution**                          isolates, no filesystem access, 5s
                                       timeout. Python via restricted
                                       subprocess.

  **Embeddings**   nomic-embed-text    768-dim embeddings for semantic
                   (local)             search. Runs via Ollama. Powers
                                       Plus/Pro \'find similar messages\'
                                       feature.

  **Vector store** pgvector extension  Embeddings stored alongside
                                       messages in Postgres. No separate
                                       vector DB to operate.
  -----------------------------------------------------------------------

▸ **DEVOPS & SELF-HOSTING**

  -----------------------------------------------------------------------
  **Layer**        **Technology**      **Why we chose it**
  ---------------- ------------------- ----------------------------------
  **Containers**   Docker + Compose    Single docker-compose.yml spins up
                                       the full stack. One command
                                       install on any Ubuntu/Debian VPS.

  **K8s charts**   Helm 3              Production Kubernetes deployment.
                                       Horizontal pod autoscaling on
                                       messaging and voice services.

  **CI/CD**        GitHub Actions      Build → test → push to GHCR →
                                       deploy. Matrix builds for amd64
                                       and arm64 (Raspberry Pi
                                       compatible).

  **Metrics**      Prometheus +        Preconfigured dashboards: message
                   Grafana             throughput, WS connections, voice
                                       call participants, AI agent token
                                       usage.

  **Logs**         Loki + Promtail     Structured JSON logs from all
                                       services. Queryable from Grafana.
                                       No external logging service
                                       required.

  **Tracing**      OpenTelemetry +     Distributed traces across service
                   Tempo               boundaries. Plug into Grafana
                                       Tempo or Jaeger.

  **Secrets**      Docker secrets /    No secrets in environment
                   K8s secrets         variables. Mounted as tmpfs files
                                       at runtime.

  **Backups**      pgbackup + MinIO    Automated nightly Postgres dumps
                   sync                to MinIO. MinIO bucket sync to
                                       remote (S3/B2/Cloudflare R2)
                                       optional.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  **\# design-principles --- our 10 commandments**

  -----------------------------------------------------------------------

These principles guide every product and engineering decision. They are
deliberately written in contrast to Discord\'s known failures ---
sourced from thousands of user complaints and technical analyses.

+----+-----------------------------------------------------------------+
| ** | **Performance is a feature, not a nice-to-have**                |
| 01 |                                                                 |
| ** | The client must use under 150MB RAM at idle (Discord: 300MB+).  |
|    | Every interaction must respond in under 100ms on a 10Mbps       |
|    | connection. We use Tauri instead of Electron specifically for   |
|    | this. We lazy-load everything. We never block the main thread.  |
|    |                                                                 |
|    | **vs Discord:** *Discord\'s Electron client consistently tanks  |
|    | frame rates in games. Users report 10+ fps gains from closing   |
|    | Discord. We will never cause this.*                             |
+----+-----------------------------------------------------------------+

+----+-----------------------------------------------------------------+
| ** | **You own your data, completely**                               |
| 02 |                                                                 |
| ** | Self-hosted Nexus makes zero external network calls. No         |
|    | telemetry, no analytics beacons, no CDN assets from our         |
|    | servers. The admin dashboard shows every byte of outbound       |
|    | traffic. On cloud tiers, data is encrypted at rest with keys    |
|    | the customer controls.                                          |
|    |                                                                 |
|    | **vs Discord:** *Discord tracks every application you open,     |
|    | stores message metadata indefinitely, and has confirmed         |
|    | data-sharing with government databases via its ID verification  |
|    | partner.*                                                       |
+----+-----------------------------------------------------------------+

+----+-----------------------------------------------------------------+
| ** | **Information must survive conversations**                      |
| 03 |                                                                 |
| ** | Every conversation that produces a decision, a document, or a   |
|    | piece of knowledge must have a home outside the message scroll. |
|    | Channel wikis, decision logs, and thread archives are           |
|    | first-class citizens --- not afterthoughts. The AI agent\'s     |
|    | primary job is to move knowledge from chat into structured      |
|    | storage.                                                        |
|    |                                                                 |
|    | **vs Discord:** *Discord has no wiki, no decision log, no       |
|    | searchable archive. Knowledge dies in the scroll. Users report  |
|    | losing hundreds of valuable discussions permanently.*           |
+----+-----------------------------------------------------------------+

+----+-----------------------------------------------------------------+
| ** | **Search must be excellent, not an afterthought**               |
| 04 |                                                                 |
| ** | Full-text search indexes every message, thread, wiki page,      |
|    | document, and file name. Results return in under 100ms via      |
|    | Meilisearch. Semantic search (Plus/Pro) finds conceptually      |
|    | related content without exact keyword matches. Filters: by      |
|    | person, channel, date range, file type, message type.           |
|    |                                                                 |
|    | **vs Discord:** *Discord\'s search is consistently ranked among |
|    | the worst in any chat product. It cannot search across servers, |
|    | produces irrelevant partial-match results, and is slow on large |
|    | servers.*                                                       |
+----+-----------------------------------------------------------------+

+----+-----------------------------------------------------------------+
| ** | **AI is built in, not bolted on**                               |
| 05 |                                                                 |
| ** | The AI agent is a first-class workspace member, not an          |
|    | integration or a bot. It has read access to all channels it is  |
|    | a member of. It subscribes to the message bus and can be        |
|    | triggered by mention, slash command, or keyword. Its tools      |
|    | (summarise, decide, search, run code) are native workspace      |
|    | features.                                                       |
|    |                                                                 |
|    | **vs Discord:** *Discord has no native AI. Third-party bots are |
|    | unreliable, lack context, and require external API keys that    |
|    | users must manage themselves.*                                  |
+----+-----------------------------------------------------------------+

+----+-----------------------------------------------------------------+
| ** | **One command to run everything**                               |
| 06 |                                                                 |
| ** | The entire Nexus stack --- all services, all databases, all     |
|    | monitoring --- must start with a single command on a fresh      |
|    | Ubuntu VPS. The install script handles secrets, TLS, DNS        |
|    | validation, and first-user setup. Time to a working workspace:  |
|    | under 5 minutes. We test this on every release.                 |
|    |                                                                 |
|    | **vs Discord:** *Rocket.Chat and Mattermost are self-hostable   |
|    | but take hours to configure correctly. Docker Compose files     |
|    | with 15 services and manual environment variable setup are a    |
|    | failure mode we explicitly avoid.*                              |
+----+-----------------------------------------------------------------+

+----+-----------------------------------------------------------------+
| ** | **Voice quality degrades gracefully**                           |
| 07 |                                                                 |
| ** | Voice uses Opus at 64kbps by default. On congested networks,    |
|    | the SFU reduces bitrate adaptively before dropping              |
|    | participants. All voice infrastructure runs on the customer\'s  |
|    | server --- no media relay through our infrastructure.           |
|    | On-premise voice means zero latency from client to server on a  |
|    | LAN.                                                            |
|    |                                                                 |
|    | **vs Discord:** *Discord\'s voice quality is good, but all      |
|    | media transits Discord\'s servers, introducing latency and a    |
|    | privacy concern. Enterprise teams cannot use Discord for        |
|    | confidential voice calls.*                                      |
+----+-----------------------------------------------------------------+

+----+-----------------------------------------------------------------+
| ** | **The UI is Discord, the internals are not**                    |
| 08 |                                                                 |
| ** | We deliberately replicate Discord\'s three-panel layout, its    |
|    | colour system, its component dimensions, and its interaction    |
|    | patterns. Users switching from Discord should feel at home      |
|    | within minutes. But behind the UI, every architectural decision |
|    | is made for longevity, privacy, and performance --- not for     |
|    | gaming communities.                                             |
|    |                                                                 |
|    | **vs Discord:** *Discord\'s UI is genuinely excellent. We are   |
|    | not fixing what is not broken. We are fixing everything         |
|    | underneath it.*                                                 |
+----+-----------------------------------------------------------------+

+----+-----------------------------------------------------------------+
| ** | **No dark patterns, ever**                                      |
| 09 |                                                                 |
| ** | No artificial Nitro paywalls on features that cost us nothing   |
|    | to provide. No \'you have 5 messages left this month\' popups.  |
|    | No dark UI patterns that push upgrades during onboarding.       |
|    | Pricing is transparent, tiers are honest about what they        |
|    | include, and the community edition is permanently               |
|    | fully-featured.                                                 |
|    |                                                                 |
|    | **vs Discord:** *Discord has progressively moved HD video,      |
|    | larger file uploads, custom emoji, and profile customisation    |
|    | behind Nitro paywalls. The enshittification trajectory is clear |
|    | and accelerating post-IPO.*                                     |
+----+-----------------------------------------------------------------+

+----+-----------------------------------------------------------------+
| ** | **Support is a real function, not a bot**                       |
| 10 |                                                                 |
| ** | Plus tier: email support with 48-hour SLA, staffed by humans.   |
|    | Pro tier: named contact, 4-hour SLA. Community tier: forum with |
|    | fast community response plus GitHub issues tracked and triaged  |
|    | weekly. Every paid ticket is answered by a person.              |
|    |                                                                 |
|    | **vs Discord:** *Discord\'s support system automatically closes |
|    | tickets before a human reads them. Account bans have no         |
|    | effective appeal path. This is not acceptable for professional  |
|    | teams and we treat it as a hard baseline requirement.*          |
+----+-----------------------------------------------------------------+

  -----------------------------------------------------------------------
  **\# discord-replication-spec --- feature by feature**

  -----------------------------------------------------------------------

This section documents the specific Discord features we replicate and
how we implement each one. Where we deviate from Discord\'s
implementation (for performance, privacy, or capability reasons), the
deviation is noted.

▸ **GATEWAY PROTOCOL**

Discord\'s gateway is a WebSocket connection with a JSON (or ETF)
message format using opcode-based dispatch. We replicate the opcode
structure exactly so that community-built Discord clients can connect to
a Nexus server with minimal modification.

+-----------------------------------------------------------------------+
| // Discord gateway opcodes --- Nexus implements all of these          |
|                                                                       |
| OP 0: DISPATCH → server sends events (MESSAGE_CREATE, etc.)           |
|                                                                       |
| OP 1: HEARTBEAT → client pings server                                 |
|                                                                       |
| OP 2: IDENTIFY → client sends token + capabilities                    |
|                                                                       |
| OP 7: RECONNECT → server tells client to reconnect                    |
|                                                                       |
| OP 9: INVALID_SESSION → server rejects identify                       |
|                                                                       |
| OP 10: HELLO → server sends heartbeat interval                        |
|                                                                       |
| OP 11: HEARTBEAT_ACK → server acks heartbeat                          |
|                                                                       |
| // Extension opcodes for Nexus-only features                          |
|                                                                       |
| OP 100: AI_AGENT_TYPING → agent is generating a response              |
|                                                                       |
| OP 101: DECISION_LOGGED → a decision was archived in this channel     |
|                                                                       |
| OP 102: WIKI_UPDATED → channel wiki page was modified                 |
+-----------------------------------------------------------------------+

▸ **VOICE ARCHITECTURE**

Discord uses a custom UDP voice protocol (DAVE --- Discord\'s end-to-end
encrypted voice). We use standard WebRTC with mediasoup as the SFU,
which gives us the same selective forwarding behaviour. We do not yet
implement DAVE\'s end-to-end encryption; instead we use DTLS-SRTP (the
WebRTC standard).

+-----------------------------------------------------------------------+
| // Voice flow --- matches Discord\'s architecture                     |
|                                                                       |
| 1\. Client requests voice token from REST API                         |
|                                                                       |
| 2\. REST returns: {endpoint, token, session_id}                       |
|                                                                       |
| 3\. Client connects WebSocket to voice endpoint                       |
|                                                                       |
| 4\. Client sends IDENTIFY with {server_id, user_id, session_id,       |
| token}                                                                |
|                                                                       |
| 5\. Server sends READY with {ssrc, ip, port, modes}                   |
|                                                                       |
| 6\. Client discovers external IP via UDP hole punch                   |
|                                                                       |
| 7\. Client sends SELECT_PROTOCOL with ICE candidates                  |
|                                                                       |
| 8\. Server sends SESSION_DESCRIPTION with DTLS fingerprint            |
|                                                                       |
| 9\. WebRTC DTLS handshake completes                                   |
|                                                                       |
| 10\. Media flows: Opus audio, VP8/H264 video                          |
|                                                                       |
| // Codecs --- identical to Discord                                    |
|                                                                       |
| Audio: Opus, 48kHz, 2ch, 64kbps default / 96kbps max                  |
|                                                                       |
| Video: VP8 (baseline) + H264 (hardware-accelerated, optional)         |
|                                                                       |
| Screen: VP8 at up to 30fps / 1080p (4K on Pro via H265)               |
+-----------------------------------------------------------------------+

▸ **MESSAGE DELIVERY GUARANTEES**

Discord delivers messages on a best-effort basis over WebSocket with
client-side optimistic rendering. We match this behaviour but add a
durable replay layer (NATS JetStream) that Discord lacks --- meaning
reconnecting clients get missed messages from the broker, not a REST API
catchup call.

+-----------------------------------------------------------------------+
| // Discord message flow (what we replicate)                           |
|                                                                       |
| Client sends: POST /channels/{id}/messages                            |
|                                                                       |
| Server acks: 200 OK with full Message object (snowflake ID,           |
| timestamp)                                                            |
|                                                                       |
| Server emits: WS event MESSAGE_CREATE to all channel subscribers      |
|                                                                       |
| // Nexus additions on top                                             |
|                                                                       |
| NATS publish: channel.{id} subject with Message object                |
|                                                                       |
| JetStream: message stored with sequence number                        |
|                                                                       |
| Reconnect: client sends last-seen sequence → server replays missed    |
|                                                                       |
| AI trigger: agent subscriber checks for \@agent / slash commands      |
|                                                                       |
| Search index: Meilisearch document upserted async (\< 50ms delay)     |
+-----------------------------------------------------------------------+

▸ **SNOWFLAKE IDS**

Discord uses 64-bit snowflake IDs encoding millisecond timestamp +
worker ID + sequence. We use the identical format so that message IDs
are sortable by time and can be used for pagination without a database
query.

+-----------------------------------------------------------------------+
| // Discord snowflake format --- Nexus matches exactly                 |
|                                                                       |
| Bit layout (64 bits total):                                           |
|                                                                       |
| \[63..22\] 42 bits milliseconds since Discord epoch                   |
| (2015-01-01T00:00:00Z)                                                |
|                                                                       |
| \[21..17\] 5 bits internal worker ID                                  |
|                                                                       |
| \[16..12\] 5 bits internal process ID                                 |
|                                                                       |
| \[11..0\] 12 bits sequence (resets per millisecond)                   |
|                                                                       |
| // Nexus epoch (our founding date, not Discord\'s)                    |
|                                                                       |
| const NEXUS_EPOCH = 1704067200000n; // 2024-01-01T00:00:00.000Z       |
|                                                                       |
| function generateSnowflake(workerId, processId) {                     |
|                                                                       |
| const ms = BigInt(Date.now()) - NEXUS_EPOCH;                          |
|                                                                       |
| return (ms \<\< 22n) \| (workerId \<\< 17n) \| (processId \<\< 12n)   |
| \| seq++;                                                             |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **\# getting-started --- install in 5 minutes**

  -----------------------------------------------------------------------

▸ **REQUIREMENTS**

-   Ubuntu 22.04 LTS or Debian 12 (x86_64 or arm64)

-   Minimum: 2 vCPU, 4 GB RAM, 40 GB SSD

-   Recommended: 4 vCPU, 8 GB RAM, 100 GB SSD (up to 250 users)

-   A domain name pointed at your server (for automatic TLS)

-   Ports 80, 443 (HTTP/HTTPS) and 3478, 5349 (TURN/STUN for voice) open

▸ **ONE-COMMAND INSTALL**

+-----------------------------------------------------------------------+
| \# Download and run the install script                                |
|                                                                       |
| curl -fsSL https://get.nexus.sh \| bash                               |
|                                                                       |
| \# The script will:                                                   |
|                                                                       |
| \# 1. Check system requirements                                       |
|                                                                       |
| \# 2. Install Docker + Docker Compose if not present                  |
|                                                                       |
| \# 3. Generate all secrets (.env file)                                |
|                                                                       |
| \# 4. Pull all service images from ghcr.io/nexus-platform             |
|                                                                       |
| \# 5. Start the full stack                                            |
|                                                                       |
| \# 6. Configure Caddy with automatic TLS                              |
|                                                                       |
| \# 7. Create the first admin user                                     |
|                                                                       |
| \# 8. Print your workspace URL                                        |
|                                                                       |
| \# Manual install (if you prefer to inspect first)                    |
|                                                                       |
| git clone https://github.com/nexus-platform/nexus                     |
|                                                                       |
| cd nexus                                                              |
|                                                                       |
| cp .env.example .env \# edit domain, SMTP, etc.                       |
|                                                                       |
| docker compose up -d                                                  |
+-----------------------------------------------------------------------+

▸ **AI AGENT SETUP --- COMMUNITY EDITION**

+-----------------------------------------------------------------------+
| \# Install Ollama (runs on the same server or a separate GPU machine) |
|                                                                       |
| curl -fsSL https://ollama.ai/install.sh \| bash                       |
|                                                                       |
| \# Pull the recommended model for Nexus agent                         |
|                                                                       |
| ollama pull llama3.1:8b \# best overall (requires 6 GB RAM)           |
|                                                                       |
| \# ollama pull mistral:7b \# faster, slightly less capable            |
|                                                                       |
| \# ollama pull phi3:mini \# very fast, works on 4 GB RAM              |
|                                                                       |
| \# Configure Nexus to use local Ollama                                |
|                                                                       |
| \# In your .env file:                                                 |
|                                                                       |
| AI_PROVIDER=ollama                                                    |
|                                                                       |
| OLLAMA_BASE_URL=http://localhost:11434                                |
|                                                                       |
| OLLAMA_MODEL=llama3.1:8b                                              |
|                                                                       |
| \# Restart the AI agent service                                       |
|                                                                       |
| docker compose restart ai-agent                                       |
+-----------------------------------------------------------------------+

▸ **AI AGENT SETUP --- PLUS/PRO (CLAUDE API)**

+-----------------------------------------------------------------------+
| \# In your .env file (or workspace admin dashboard):                  |
|                                                                       |
| AI_PROVIDER=anthropic                                                 |
|                                                                       |
| ANTHROPIC_API_KEY=sk-ant-api03-\...                                   |
|                                                                       |
| ANTHROPIC_MODEL=claude-sonnet-4-5                                     |
|                                                                       |
| \# The API key is stored encrypted at rest.                           |
|                                                                       |
| \# It is never sent to the client.                                    |
|                                                                       |
| \# Token usage is tracked per workspace in the admin dashboard.       |
+-----------------------------------------------------------------------+

▸ **ENVIRONMENT VARIABLES REFERENCE**

  -------------------------------------------------------------------------------------
  **Layer**                 **Technology**           **Why we chose it**
  ------------------------- ------------------------ ----------------------------------
  **DOMAIN**                nexus.example.com        Your domain. Caddy auto-issues TLS
                                                     cert. Required.

  **POSTGRES_PASSWORD**     (generated)              Postgres root password.
                                                     Auto-generated by install script.

  **REDIS_PASSWORD**        (generated)              Redis auth token. Auto-generated.

  **JWT_SECRET**            (generated)              64-char secret for signing session
                                                     tokens.

  **MINIO_ROOT_USER**       nexus                    MinIO admin username.

  **MINIO_ROOT_PASSWORD**   (generated)              MinIO admin password.

  **SMTP_HOST**             smtp.example.com         SMTP server for email
                                                     notifications. Optional.

  **SMTP_USER**             noreply@example.com      SMTP username.

  **SMTP_PASS**                                      SMTP password. Optional.

  **AI_PROVIDER**           ollama \| anthropic      LLM provider for the AI agent.

  **OLLAMA_BASE_URL**       http://localhost:11434   Ollama API URL. Used when
                                                     AI_PROVIDER=ollama.

  **ANTHROPIC_API_KEY**     sk-ant-api03-\...        Anthropic API key. Used when
                                                     AI_PROVIDER=anthropic.

  **MAX_UPLOAD_MB**         100                      Maximum file upload size in
                                                     megabytes.

  **RETENTION_DAYS**        0 (unlimited)            Message retention. 0 = keep
                                                     forever.

  **ENABLE_REGISTRATION**   true                     Allow new user self-registration.
                                                     Set false to invite-only.
  -------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **\# links-and-resources**

  -----------------------------------------------------------------------

-   GitHub: github.com/nexus-platform/nexus

-   Docs: docs.nexus.sh

-   Self-host guide: docs.nexus.sh/self-hosting

-   API reference: docs.nexus.sh/api

-   Community forum: community.nexus.sh

-   Discord (the irony): discord.gg/nexus-beta

-   Status page: status.nexus.sh

+-----------------------------------------------------------------------+
| **Nexus is Discord done right.**                                      |
|                                                                       |
| *Same UI. Better internals. Your data. Your server.*                  |
+-----------------------------------------------------------------------+
