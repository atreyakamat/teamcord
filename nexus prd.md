**Nexus**

The Team Communication Platform Built Right

**Product & Technical Specification**

Version 1.0 \| March 2025 \| Confidential

**Open-source \| Self-hostable \| AI-native**

**Executive Summary**

Discord is the dominant team chat platform for gaming communities and
developer groups --- but it was never designed for professional teams.
As it pursues an IPO and accelerates monetisation, it is systematically
failing the teams that rely on it: locking information inside channels
with no searchability, collecting alarming amounts of user data,
providing effectively no customer support, and degrading in performance
with every update.

Nexus is a purpose-built team communication platform that directly
addresses every one of these failures. It is open-source and
self-hostable, giving teams full control over their data. It ships with
a built-in AI agent --- powered by a local LLM on the community edition
and Claude on the cloud tier --- that can summarise threads, log
decisions, search the web, and run code. And it is architected from the
ground up for async professional work, with a structured information
hierarchy that Discord\'s gaming-era design never had.

  -----------------------------------------------------------------------
  *\"Discord is destroying the internet. Information moved there is
  effectively lost --- buried in channels, unsearchable, and hostage to a
  platform that is actively getting worse.\" --- r/unpopularopinion, 3K
  upvotes*

  -----------------------------------------------------------------------

Nexus ships in three tiers: a fully-featured open-source community
edition for self-hosters, a managed cloud Plus tier for small agencies,
and a Pro tier with client portals and white-labelling for professional
services firms.

**The Problem: Why Discord Fails Teams**

The following issues are drawn directly from thousands of user
complaints across Reddit communities including r/discordapp,
r/discordsucks, r/unpopularopinion, and r/privacy. These are not edge
cases --- they are systemic failures affecting every team using Discord
for professional work.

**1. Information is Locked and Lost**

Discord was designed for real-time gaming chat. When teams use it for
work, every decision, every piece of knowledge, every discussion
disappears into an endless scroll. There is no wiki, no decision log, no
structured archive. Channels are ordered by recency, not importance. The
search feature --- criticised consistently as one of the worst in any
chat product --- cannot search across servers, cannot filter
meaningfully, and actively corrupts results by matching partial words.

  -----------------------------------------------------------------------
  *\"And now, I no longer have access to that Discord Channel with
  hundreds of helpful content, tutorials, fixes, and discussions.\" ---
  r/discordsucks*

  -----------------------------------------------------------------------

**2. Privacy and Data Collection**

Discord tracks every application opened on a user\'s device to display
game activity. It collects and retains message metadata even after
deletion. A 2023 GDPR investigation found Discord collecting data in
violation of European law. Most critically, a recent data leak confirmed
that Discord\'s age-verification partner directly shares biometric and
identity data with US government databases --- linking users\' faces and
ID documents to federal records.

  -----------------------------------------------------------------------
  *\"Discord collects AND keeps a dangerous amount of data. They
  recognised that it is a violation of GDPR but weren\'t willing to
  pursue enforcement.\" --- r/privacy, 1K upvotes*

  -----------------------------------------------------------------------

**3. Non-existent Customer Support**

Discord\'s support system is widely considered the worst in the
industry. Tickets are automatically marked as resolved before a human
reads them. The appeal system has no human review path. Account bans ---
including false positives --- have no effective recourse. For
professional teams and agencies, this is a business risk: a false ban or
account compromise can cut an entire team off from their communication
history with no way to recover it.

  -----------------------------------------------------------------------
  *\"I have been on the internet since its very early days, and Discord
  has the worst customer support I have ever experienced.\" ---
  r/discordsucks*

  -----------------------------------------------------------------------

**4. Performance Degradation**

Discord\'s desktop client is built on Electron --- a framework that
wraps a full Chromium browser inside every app instance. On modest
hardware it consumes 500MB+ of RAM at idle. Users consistently report
frame rate drops in games when Discord is running, slow server
switching, and audio cutting out during calls. This is particularly
acute in markets like India, Southeast Asia, and Africa where lower-end
hardware is common --- markets where a lightweight alternative has
enormous growth potential.

  -----------------------------------------------------------------------
  *\"It\'s insane, I was playing REPO with some friends and Discord alone
  was tanking frame rate --- closed it and boom, extra 10fps.\" ---
  r/discordapp, 3.1K upvotes*

  -----------------------------------------------------------------------

**5. Enshittification in Progress**

Discord hired a former Pinterest financial officer in 2021 and pivoted
from product quality to monetisation. Features that were free became
Nitro-only. The UI was redesigned without user consent and made worse.
The platform is now preparing for an IPO --- a process that historically
accelerates this kind of user-hostile monetisation. The community is
fully aware of this trajectory and actively looking for alternatives.

  -----------------------------------------------------------------------
  *\"Discord is already enshittifying. An IPO will accelerate that
  process a lot.\" --- r/discordapp*

  -----------------------------------------------------------------------

**6. Built for Gaming, Not Work**

Discord\'s entire information architecture --- flat channel lists, no
threading by default, no document storage, no decision tracking, no
role-based views --- reflects its gaming origins. When agencies and
professional teams try to use it, they hit these limitations constantly.
There is no concept of a \'project\', no way to give a client limited
access, no async video messaging, and no structured way to capture what
was decided in a conversation.

**Nexus vs Discord: Feature Comparison**

The table below compares Discord\'s current offering against Nexus
across every major dimension of a professional team communication
platform.

  ------------------------------------------------------------------------
  **Feature**            **Discord**              **Nexus**
  ---------------------- ------------------------ ------------------------
  Data ownership         **Stored on Discord\'s   **Self-hosted or our
                         servers**                cloud**

  Privacy / tracking     **Tracks all open apps + **Zero telemetry, no
                         collects metadata**      tracking**

  Search quality         **Poor --- partial       **Full-text + AI
                         match, no cross-server** semantic search**

  Customer support       **Automated, no human    **Email SLA / named
                         review**                 contact**

  Information structure  **Flat channels, no      **Projects \> Channels
                         hierarchy**              \> Threads**

  Knowledge base         **None --- chat only**   **Auto-generated wiki
                                                  per channel**

  Decision logging       **None**                 **Pin threads as
                                                  archived decisions**

  AI assistant           **None built-in**        **Built-in agent (Ollama
                                                  or Claude)**

  Client portals         **None**                 **Pro tier: limited
                                                  client views**

  Voice calls            **Up to server limit**   **Up to 500 (Pro)**

  Video calls            **Yes (Nitro-gated HD)** **Yes --- HD on all
                                                  tiers**

  Screen sharing         **Yes (Nitro-gated 4K)** **Yes --- 1080p all
                                                  tiers, 4K Pro**

  Async video clips      **None**                 **Loom-style inline
                                                  clips**

  Discussion threads     **Yes (basic)**          **Yes --- structured,
                                                  searchable**

  Message persistence    **Indefinite (on         **You control retention
                         Discord)**               policy**

  File storage           **Limited                **20 GB (Plus) / 100 GB
                         (Nitro-gated)**          (Pro)**

  Performance            **Electron --- heavy RAM **Lightweight PWA /
                         usage**                  Tauri desktop**

  Mobile app             **Yes**                  **Yes --- React Native**

  Open source            **No**                   **Yes --- fully MIT
                                                  licensed**

  Self-hosting           **No**                   **Yes --- Docker Compose
                                                  in 5 min**

  GDPR compliance        **Contested**            **Full --- data stays on
                                                  your server**

  Audit logs             **None on free**         **Full audit trail on
                                                  Plus/Pro**

  SSO / SAML             **No**                   **Keycloak OIDC / SAML
                                                  on Plus**

  White-label            **No**                   **Yes on Pro**

  Pricing model          **Free + Nitro           **Free / \$8 / \$25 per
                         (\$9.99/mo)**            user/mo**
  ------------------------------------------------------------------------

**Feature Deep Dive**

Nexus is designed around four principles: information survives, privacy
is not negotiable, async-first, and every team can run it regardless of
technical skill.

**Messaging and Channels**

The core messaging experience is fast, reliable, and built on a
structured hierarchy that Discord lacks entirely.

  -----------------------------------------------------------------------
  **Feature**           **Description**
  --------------------- -------------------------------------------------
  **Workspaces**        Top-level container for an organisation or
                        agency. Supports multiple workspaces per account
                        with instant switching.

  **Projects**          A grouping layer inside a workspace. Each project
                        contains channels, a wiki, and a decision log.
                        Agencies can have one project per client.

  **Channels**          Text channels within a project. Organised by
                        category with drag-and-drop reordering. Unread
                        badges are grouped by priority, not recency.

  **Threads**           Any message can spawn a structured thread.
                        Threads are first-class --- searchable, linkable,
                        and closable when resolved.

  **Direct messages**   1:1 and group DMs with up to 20 participants.
                        Full message history with search.

  **Message reactions** Emoji reactions with custom workspace emoji.
                        Reaction summaries show who reacted.

  **Rich formatting**   Markdown support including code blocks with
                        syntax highlighting for 50+ languages, inline
                        LaTeX, and embedded media previews.

  **Message editing**   Edit history stored and visible. Edits are
                        timestamped. Deleted messages leave a tombstone
                        visible to admins.

  **Pinned messages**   Pin important messages to a channel. Pinned
                        messages appear in a searchable sidebar panel.

  **Scheduled           Write now, send later. Useful for async teams
  messages**            across time zones.
  -----------------------------------------------------------------------

**Voice and Video Calling**

Voice and video are built on WebRTC with an open-source media server
(mediasoup), giving you full control over call infrastructure. No Nitro
paywall, no quality degradation on free tiers.

  -----------------------------------------------------------------------
  **Feature**           **Description**
  --------------------- -------------------------------------------------
  **Voice channels**    Always-on voice rooms within a channel. Join with
                        one click, no call to initiate. Presence shows
                        who is in a voice channel.

  **Video calls**       Up to 25 participants on Community, 100 on Plus,
                        500 on Pro. 1080p HD on all tiers.

  **Screen sharing**    Share full screen, a specific window, or a
                        browser tab. 1080p 30fps on all tiers. 4K 60fps
                        on Pro.

  **Noise suppression** RNNoise-based noise suppression runs client-side.
                        No audio sent to a third party for processing.

  **Echo cancellation** Browser-native AEC with tuned parameters for
                        headphone and speaker setups.

  **Recording**         Call recording with per-participant consent
                        prompts. Recordings stored in workspace file
                        storage.

  **Stage channels**    Broadcast mode: one or more speakers, the rest
                        listen. Raise-hand to request speaking access.
                        Ideal for town halls and all-hands.

  **Async voice clips** Record a voice memo directly in any channel or
                        DM. Plays inline with a waveform visualiser.

  **Async video clips** Record a short screen + camera clip (Loom-style)
                        and post it inline. Captioned automatically by
                        the AI agent.

  **Spatial audio**     Optional: spatial audio positions participants in
                        a virtual room. Available on desktop.
  -----------------------------------------------------------------------

**Discussion Threads and Knowledge Management**

This is where Nexus diverges most sharply from Discord. Every piece of
knowledge generated in a conversation is capturable, structured, and
permanently searchable.

  -----------------------------------------------------------------------
  **Feature**           **Description**
  --------------------- -------------------------------------------------
  **Structured          Threads have a title, status (open / resolved /
  threads**             archived), and owner. Resolved threads feed the
                        channel\'s wiki automatically.

  **Decision log**      Mark any thread as a Decision. The AI agent
                        extracts: what was decided, by whom, on what
                        date, and what alternatives were considered. All
                        decisions are searchable across the workspace.

  **Channel wiki**      Every channel has an auto-generated wiki page.
                        The AI summarises resolved threads into the wiki.
                        Humans can edit the wiki directly. Wiki pages are
                        versioned.

  **Project docs**      Create long-form documents inside a project.
                        Documents are collaborative (simultaneous
                        editing), stored in the workspace, and linkable
                        from any channel.

  **Search**            Full-text search across all messages, threads,
                        wiki pages, docs, and file names. AI semantic
                        search on Plus/Pro finds conceptually related
                        content even without exact keyword matches.

  **Bookmarks**         Bookmark any message, thread, or doc. Bookmarks
                        are personal and synced across devices.

  **Link previews**     Rich unfurl previews for URLs. Custom unfurling
                        for GitHub PRs, Figma files, Notion pages, and
                        Linear issues.

  **File management**   Files are stored per-workspace (not per-message).
                        Browse all files in a project with filter by
                        type, uploader, and date. Version history for
                        re-uploaded files.
  -----------------------------------------------------------------------

**AI Agent**

The Nexus AI agent is always running in the background, ready to be
invoked with \@agent or a slash command. On the community edition it
runs against a locally-hosted LLM via Ollama (Llama 3, Mistral, Phi-3).
On Plus and Pro it runs against Claude (Anthropic). The tool set is
identical across both tiers.

  -----------------------------------------------------------------------
  **Feature**           **Description**
  --------------------- -------------------------------------------------
  **/summarise**        Summarise a thread, a channel\'s activity since a
                        given date, or a linked document. Output is
                        formatted as a structured summary with key points
                        and action items.

  **/decide**           Formally log a decision. The agent extracts
                        participants, options considered, the outcome,
                        and the rationale. Stored in the Decision Log.

  **/search**           Web search via self-hosted SearXNG (community) or
                        direct Bing/Brave API (Plus/Pro). Results are
                        cited inline with sources.

  **/run**              Execute code in a sandboxed interpreter. Supports
                        Python, JavaScript, and shell. Output is posted
                        inline.

  **/draft**            Draft a message, document, or reply in the style
                        of the workspace. Can be given a brief and a
                        tone.

  **Auto-caption**      Automatically transcribe and caption async
                        video/audio clips when posted in a channel.

  **Meeting notes**     During a voice call, the agent can transcribe and
                        generate structured notes posted to the channel
                        on call end.

  **Keyword alerts**    Configure the agent to notify you when specific
                        keywords appear in any channel you are a member
                        of.

  **\@agent mentions**  Mention \@agent in any message to get a direct AI
                        response in-thread. Context includes the last 50
                        messages in the channel.

  **Custom tools**      Pro tier: connect custom tools via a simple JSON
                        schema. The agent can call internal APIs, query
                        databases, or trigger webhooks.
  -----------------------------------------------------------------------

**Moderation and Administration**

  -----------------------------------------------------------------------
  **Feature**           **Description**
  --------------------- -------------------------------------------------
  **Role system**       Hierarchical roles with granular permissions.
                        Roles control: read, write, react, attach files,
                        create threads, manage channels, manage members,
                        admin.

  **Channel             Override role permissions per channel. Lock
  permissions**         channels to specific roles. Set channel-level
                        rate limits.

  **Member management** Invite by email, link, or SSO. Deactivate
                        (preserves history) or delete (redacts messages)
                        members. Bulk import via CSV.

  **Audit log**         Every admin action is logged: who did what, when,
                        and to what. Exportable as CSV or JSON. SIEM
                        integration on Pro.

  **AutoMod**           Rule-based auto-moderation: block keywords,
                        rate-limit repeat senders, quarantine new members
                        for N days.

  **Slow mode**         Per-channel slow mode from 5 seconds to 6 hours.

  **Message retention** Set per-channel message retention policies from 7
                        days to indefinite. Automated deletion runs
                        nightly.

  **Verification        Require new members to complete a verification
  gates**               step (agree to rules, answer questions) before
                        gaining access to channels.
  -----------------------------------------------------------------------

**Client Portals (Pro)**

Designed specifically for agencies. Give clients a curated, read-only or
limited-write view of specific channels without exposing your entire
workspace.

  -----------------------------------------------------------------------
  **Feature**           **Description**
  --------------------- -------------------------------------------------
  **Portal setup**      Create a named portal linked to one or more
                        channels. Generate a portal invite link for the
                        client.

  **Permission model**  Clients can be: read-only (see messages, files,
                        threads), comment-only (reply to threads but not
                        create new ones), or full member of selected
                        channels only.

  **Branding**          Portal has a custom name and logo. Client sees
                        your brand, not Nexus branding (Pro +
                        white-label).

  **File sharing**      Share files with clients directly from workspace
                        storage. Access-controlled: client can only see
                        files shared to the portal.

  **Notification        Client portal users receive email notifications
  control**             for activity. They do not receive workspace-wide
                        notifications.

  **Portal analytics**  See which shared content the client has viewed.
                        Useful for delivery confirmation.
  -----------------------------------------------------------------------

**Technical Architecture**

Nexus is built to be run by a single developer on a \$10/month VPS, or
scaled horizontally across a Kubernetes cluster. The same Docker Compose
file that runs locally is the foundation for the cloud managed tier.

**Core Service Stack**

  -----------------------------------------------------------------------
  **Feature**           **Description**
  --------------------- -------------------------------------------------
  **Messaging service** Go --- handles all WebSocket connections and
                        real-time fan-out. Goroutines allow 50,000+
                        concurrent connections per instance on modest
                        hardware.

  **API gateway**       Caddy --- reverse proxy, automatic TLS, rate
                        limiting, and WebSocket proxying. Single binary,
                        zero configuration for HTTPS.

  **Auth service**      Keycloak --- OIDC / OAuth2 / SAML provider.
                        Handles SSO, social login, and enterprise
                        identity. Self-hosted.

  **Message bus**       NATS JetStream --- single binary, persistent
                        pub/sub. Handles real-time fan-out and durable
                        replay for reconnecting clients. Replaces Kafka
                        for self-host simplicity.

  **Primary database**  PostgreSQL + TimescaleDB extension --- relational
                        data (users, channels, permissions) plus
                        time-series optimised message storage.

  **Search engine**     Meilisearch --- self-hostable full-text search.
                        Indexes messages, threads, docs, and wiki pages.
                        Sub-100ms query latency.

  **Cache / presence**  Redis --- session store, online presence (who is
                        in which voice channel), and rate limit counters.

  **File storage**      MinIO --- S3-compatible object storage.
                        Self-hosted. Swap for AWS S3 or Cloudflare R2 on
                        cloud deployments.

  **Voice / video**     mediasoup --- open-source WebRTC SFU (Selective
                        Forwarding Unit). Runs as a Node.js service.
                        Scales horizontally.

  **AI agent**          Python + LangChain --- provider-agnostic agent
                        runtime. Community: Ollama (local). Plus/Pro:
                        Anthropic Claude API.

  **Web search          SearXNG --- self-hosted meta search engine. No
  (agent)**             API keys required. Federates across Google, Bing,
                        DuckDuckGo.

  **Frontend**          React 18 PWA (web) + Tauri (desktop) + React
                        Native (mobile). Single codebase, shared
                        component library.
  -----------------------------------------------------------------------

**Self-Hosting: Installation**

The entire stack installs with a single command. No Kubernetes knowledge
required for single-server deployments.

curl -fsSL https://get.nexus.sh \| bash

This script: pulls all Docker images, generates secrets and a .env file,
starts Docker Compose, configures Caddy with automatic TLS, and prints
your workspace URL. Total time from a fresh Ubuntu 22.04 VPS to a
working Nexus instance: under five minutes.

Minimum server requirements:

-   2 vCPU, 4 GB RAM for teams up to 50 members

-   4 vCPU, 8 GB RAM for teams up to 250 members

-   K8s cluster (Helm chart provided) for 250+ members or
    high-availability requirements

**AI Agent: Community vs Cloud**

The agent code is identical across tiers. Only the LLM provider changes.
This means community edition users get the full agent feature set ---
summarisation, decision logging, web search, code execution --- running
entirely on their own hardware with no external API calls.

Community edition LLM options (via Ollama):

-   Llama 3.1 8B --- best balance of speed and capability for most agent
    tasks

-   Mistral 7B --- fast, strong at code and technical questions

-   Phi-3 Mini --- very fast, suitable for low-RAM servers (runs in 4
    GB)

Plus / Pro (Claude API):

-   claude-sonnet-4-5 --- default model for all agent tasks

-   API key stored server-side, never exposed to clients

-   Workspace-level usage dashboard with token consumption breakdown

**Pricing**

Nexus is free to self-host forever. The managed cloud tiers exist for
teams who want zero ops overhead.

  ------------------------------------------------------------------------
                    **Community       **Plus            **Pro
                    (Free)**          (\$8/user/mo)**   (\$25/user/mo)**
  ----------------- ----------------- ----------------- ------------------
  **Hosting**       Self-hosted       Cloud (our infra) Cloud + custom
                                                        domain

  **Members**       Unlimited         Unlimited         Unlimited + client
                                                        portals

  **Storage**       Self-managed      20 GB / workspace 100 GB / workspace

  **AI agent**      Ollama (local     Claude API        Claude API +
                    LLM)              (Sonnet)          fine-tuning

  **Voice & video** Up to 25 / call   Up to 100 / call  Up to 500 / call

  **Search**        Full-text         Full-text + AI    Full-text + AI
                    (Meilisearch)     semantic          semantic

  **Support**       Community forum   Email SLA (48 hr) Named contact (4
                                                        hr SLA)

  **Audit logs**    Basic             Full audit trail  Full + SIEM export

  **SSO / SAML**    Manual OIDC       Keycloak SSO      Enterprise SSO +
                                                        SCIM

  **White-label**   No                No                Yes
  ------------------------------------------------------------------------

  -----------------------------------------------------------------------
  *All cloud tiers include a 14-day free trial. No credit card required
  to start. Community edition is MIT licensed --- fork it, modify it,
  deploy it commercially. The only restriction is that you cannot resell
  the managed cloud tier under another brand without a Pro white-label
  agreement.*

  -----------------------------------------------------------------------

**Product Roadmap**

**v1.0 --- Launch (Q3 2025)**

-   Core messaging: channels, threads, DMs, reactions

-   Voice and video calls (mediasoup WebRTC)

-   Screen sharing

-   Basic AI agent: /summarise, /decide, \@agent mentions

-   Full-text search (Meilisearch)

-   Self-host: Docker Compose install script

-   Web PWA client

-   Keycloak auth with Google / GitHub social login

**v1.5 --- Q4 2025**

-   Desktop clients (Tauri --- Windows, macOS, Linux)

-   Mobile apps (React Native --- iOS and Android)

-   Channel wiki (auto-generated from resolved threads)

-   Decision log

-   Async video/audio clips

-   Plus tier launch: Claude API agent, managed hosting

-   Helm chart for Kubernetes deployments

**v2.0 --- Q1 2026**

-   Pro tier launch: client portals, white-label

-   AI semantic search

-   Custom agent tools (JSON schema integration)

-   Meeting transcription and structured notes

-   Stage channels (broadcast mode)

-   SAML / SCIM enterprise SSO

-   SIEM audit log export

**v2.5 --- Q2 2026**

-   Spatial audio

-   Project docs (collaborative long-form editor)

-   Advanced AutoMod with AI-assisted moderation

-   Integrations marketplace (GitHub, Linear, Figma, Notion)

-   Analytics dashboard for workspace admins

**Why Nexus Wins**

The market conditions for a Discord alternative have never been better.
Discord is demonstrably getting worse --- not in users\' perception, but
objectively: the IPO preparation is stripping out user-friendly
features, the ID verification controversy has shaken trust even among
loyal users, and the platform\'s performance continues to degrade. At
the same time, the AI tooling to build a genuinely better product
(open-source LLMs, self-hostable infrastructure, mature WebRTC
libraries) has matured dramatically in the past two years.

**The Self-Host Moat**

No major communication platform is meaningfully self-hostable today.
Slack is fully SaaS. Discord is fully SaaS. Mattermost and Rocket.Chat
are self-hostable but notoriously painful to operate and have never
solved the Discord-native UX problem. Nexus is the first platform
designed for both audiences simultaneously: developers who want to own
their stack completely, and non-technical teams who want to click a
button and get a workspace.

**The AI Agent as Default**

Every other platform treats AI as an add-on integration. Nexus ships
with an AI agent built into the product from day one. On the community
edition, it runs locally --- meaning teams in privacy-sensitive
industries (legal, healthcare, finance) get AI capabilities without any
data leaving their server. This is a capability that no competitor,
commercial or open-source, currently offers.

**The Agency Market**

Small and mid-sized agencies are underserved by every existing tool.
Slack is expensive and has no client portal concept. Discord is free but
unusable for client work. Notion has docs but no real-time
communication. Nexus\'s client portal feature --- letting agencies give
clients a curated, branded view of relevant channels without workspace
access --- solves a real pain that every agency feels and no tool
addresses directly.

  -----------------------------------------------------------------------
  *Nexus is not trying to replace Discord for gaming communities. It is
  replacing Discord for the millions of professional teams who adopted it
  as a stopgap and are actively looking for something better.*

  -----------------------------------------------------------------------

**Contact and Links**

For partnership enquiries, investor access, or early access to the
managed cloud beta:

-   Website: nexus.sh

-   GitHub: github.com/nexus-platform/nexus

-   Discord (ironic, we know): discord.gg/nexus-beta

-   Email: team@nexus.sh

*Nexus --- Built for teams, not for gamers.*
