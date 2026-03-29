# 🚀 What To Do Next - Your TeamCord Implementation Roadmap

## 📊 Current Status: 35-40% Complete

You have a **solid foundation** with core messaging, authentication, and infrastructure working. But **critical features are missing** that block MVP launch.

---

## ⚠️ CRITICAL BLOCKERS (Must Fix for MVP)

These 4 items are **blocking your MVP launch**. Without them, you cannot compete with Discord:

### 1. 🎥 Voice & Video System (0% Complete) - **HIGHEST PRIORITY**

**Why Critical:** It's in your PRD v1.0 requirements. Discord's main feature. Users expect it.

**What's Missing:**
- mediasoup SFU implementation
- Voice channels (join/leave/speak)
- Video calls
- Screen sharing
- WebRTC signaling
- Voice state tracking

**Estimated Effort:** 80 hours (6 weeks for 1 developer)

**How to Start:**
```bash
# Install mediasoup in services/voice
cd services/voice
npm install mediasoup

# Create basic SFU server structure
# services/voice/src/index.ts - Express + WebSocket server
# services/voice/src/room-manager.ts - Router per voice channel
# services/voice/src/peer.ts - Per-participant state
```

**Resources:**
- [mediasoup documentation](https://mediasoup.org/)
- [mediasoup demo](https://github.com/versatica/mediasoup-demo)
- Example voice flow in `teamcord_techstack.md` lines 522-551

---

### 2. 🤖 AI Agent (15% Complete) - **KEY DIFFERENTIATOR**

**Why Critical:** This is your unique value proposition vs Discord. "AI-native" is in your tagline.

**What's Missing:**
- LangChain integration
- /summarise tool (currently stub)
- /decide tool (currently stub)
- /search tool
- /run tool
- Ollama provider connection
- Claude API provider
- Tool execution engine

**Estimated Effort:** 48 hours (2 weeks for 1 developer)

**How to Start:**
```bash
# Install LangChain in services/ai-agent
cd services/ai-agent
pip install langchain langchain-community

# Implement tools
# services/ai-agent/agent/tools/summarise.py - already stubbed
# services/ai-agent/agent/tools/decide.py - already stubbed
# services/ai-agent/agent/core.py - add LangChain agent loop
```

**Quick Win:**
Get `/summarise` working first. It's the most useful and easiest to implement:
1. Fetch last N messages from channel
2. Send to Ollama with prompt: "Summarize these messages..."
3. Return AI response
4. Post back to channel

---

### 3. 📁 File Upload & Storage (0% Complete) - **ESSENTIAL**

**Why Critical:** Teams need to share files. Attachments are expected in every chat app.

**What's Missing:**
- File upload API
- MinIO integration
- Image thumbnails (libvips)
- File download (presigned URLs)
- Frontend upload component
- File gallery view

**Estimated Effort:** 40 hours (1.5 weeks for 1 developer)

**How to Start:**
```bash
# MinIO is already running (docker-compose.yml)
# Create files service in services/files

cd services/files

# Go implementation
# main.go - HTTP server
# internal/storage/minio.go - MinIO client
# internal/upload/handler.go - Multipart upload
# internal/thumbnail/generator.go - Image resizing with libvips
```

**Upload Flow:**
1. Client requests upload URL
2. Server generates presigned MinIO URL
3. Client uploads directly to MinIO
4. Client confirms upload complete
5. Server creates file record in database

---

### 4. 🔍 Search Integration (5% Complete) - **USER EXPECTATION**

**Why Critical:** "Discord's search is terrible" is your main marketing point. Must be excellent.

**What's Missing:**
- Meilisearch index creation
- Message indexing on create/edit/delete
- Search API endpoints
- Search UI component
- Filters (channel, author, date)

**Estimated Effort:** 24 hours (1 week for 1 developer)

**How to Start:**
```bash
# Meilisearch is already running (docker-compose.yml)

# Wire up indexing
# apps/api/src/routes/messages.ts - add Meilisearch client
# On message create: index in Meilisearch
# On message edit: update Meilisearch
# On message delete: remove from Meilisearch

# Create search endpoint
# apps/api/src/routes/search.ts - already exists, implement it
```

**Quick Win:**
Get basic full-text search working first (exact phrase matching), then add filters later.

---

## 🔧 Architecture Fixes (Do These First)

Before adding features, fix these critical architecture issues:

### 1. Rename "Nexus" → "TeamCord" (4 hours)

**Problem:** Code has inconsistent naming (Nexus in docs, TeamCord in implementation)

**Files to Change (~20 files):**
```bash
# Find all references
grep -r "Nexus\|nexus" --include="*.py" --include="*.go" --include="*.md"

# Key files:
- services/ai-agent/main.py (NexusAgent → TeamCordAgent)
- services/ai-agent/agent/core.py (class name)
- docker-compose.yml (nexus-postgres → teamcord-postgres)
- services/messaging/migrations/*.sql (comments)
- docs/*.md (all documentation)
```

### 2. Standardize ID System (16 hours)

**Problem:** Drizzle ORM uses UUIDs (nanoid), Go SQL uses snowflake IDs → incompatible

**Decision Needed:**
- Option A: Migrate Drizzle to snowflake IDs (RECOMMENDED)
  - Go already has snowflake function in SQL migration
  - Better for distributed systems
  - Sortable by time

- Option B: Migrate Go to UUIDs
  - Simpler but loses time-based sorting

**Recommended:** Use snowflake IDs everywhere

### 3. Add JWT Validation to Go Services (8 hours)

**Problem:** Go services don't validate JWT tokens → security hole

**Fix:**
```go
// services/gateway/internal/auth/jwt.go
// services/messaging/internal/auth/jwt.go

func ValidateJWT(tokenString string) (*Claims, error) {
    // Parse and validate JWT
    // Check expiry
    // Return claims
}

// Add middleware to all Go HTTP handlers
```

---

## 📅 Recommended Implementation Order

### Week 1-2: Foundation (80 hours)
- [ ] Rename Nexus → TeamCord (4h)
- [ ] Standardize on snowflake IDs (16h)
- [ ] Add JWT validation to Go (8h)
- [ ] Add structured logging (12h)
- [ ] Implement permission checks (16h)
- [ ] Add input validation to Go (8h)
- [ ] Security audit (8h)
- [ ] Add test framework (8h)

### Week 3-4: Voice Service (80 hours)
- [ ] Setup mediasoup SFU (16h)
- [ ] Voice channel join/leave (12h)
- [ ] Audio transmission (Opus) (16h)
- [ ] Video transmission (VP8) (12h)
- [ ] Screen sharing (8h)
- [ ] Frontend voice UI (16h)

### Week 5-6: AI Agent MVP (48 hours)
- [ ] Integrate LangChain (8h)
- [ ] Implement /summarise tool (12h)
- [ ] Implement /decide tool (12h)
- [ ] Wire Ollama provider (8h)
- [ ] Add streaming responses (8h)

### Week 7-8: Files & Search (64 hours)
- [ ] MinIO integration (12h)
- [ ] Upload API (8h)
- [ ] Image thumbnails (8h)
- [ ] Frontend upload UI (12h)
- [ ] Meilisearch integration (12h)
- [ ] Search UI (12h)

### Week 9-10: Core Features (120 hours)
- [ ] Thread support (32h)
- [ ] Emoji reactions (20h)
- [ ] Markdown rendering (8h)
- [ ] Code highlighting (8h)
- [ ] User mentions (12h)
- [ ] Direct messages (16h)
- [ ] Message embeds (12h)
- [ ] Link previews (12h)

### Week 11-12: Polish & Launch (100 hours)
- [ ] Security audit & fixes (16h)
- [ ] Metrics & monitoring (20h)
- [ ] One-command install script (12h)
- [ ] API documentation (8h)
- [ ] Deployment guide (8h)
- [ ] Performance testing (12h)
- [ ] Bug fixes (24h)

**Total:** 492 hours (~12 weeks with 2-3 developers)

---

## 🏃 Quick Wins (Do These for Morale)

While working on big features, get these quick wins to see progress:

### 1. Get /summarise Working (8 hours)
- Easiest AI tool to implement
- Immediately useful
- Shows AI capability

### 2. Basic File Upload (12 hours)
- Just get upload working, thumbnails later
- Unblocks team testing

### 3. Simple Search (8 hours)
- Basic Meilisearch integration
- Just index messages, no filters yet
- Still way better than Discord

### 4. Markdown Rendering (8 hours)
- Use `react-markdown` library
- Immediate UX improvement

---

## 🎯 Success Metrics for MVP

Your MVP is ready when you can check all these boxes:

### Must Have (P0)
- [ ] Users can register and login
- [ ] Users can create/join workspaces
- [ ] Users can create text channels
- [ ] Users can send/receive messages in real-time
- [ ] Users can join voice channels and talk
- [ ] Users can enable video in calls
- [ ] Users can share their screen
- [ ] Users can upload and download files
- [ ] Users can @mention the AI agent and get responses
- [ ] /summarise command works
- [ ] Full-text search finds messages instantly
- [ ] Thread support (create thread, reply in thread)
- [ ] Markdown rendering (bold, italic, code blocks)
- [ ] One-command install script works

### Should Have (P1)
- [ ] Emoji reactions
- [ ] User mentions (@user)
- [ ] Direct messages (1:1)
- [ ] Role-based permissions enforced
- [ ] /decide command logs decisions
- [ ] Client portal basic functionality

### Nice to Have (P2)
- [ ] Group DMs
- [ ] Channel wiki
- [ ] Code syntax highlighting
- [ ] Message embeds
- [ ] Link previews

---

## 📚 Key Documents Reference

All the info you need is in these files:

1. **IMPLEMENTATION_STATUS.md** (30,000 words)
   - Complete feature status matrix
   - Detailed audit of every service
   - Architecture issues
   - Roadmap with time estimates

2. **IMPLEMENTATION_SUMMARY.md** (5,000 words)
   - Quick overview
   - What's done vs what's missing
   - Next steps
   - Security recommendations

3. **teamcord prd.md**
   - Product requirements
   - Feature descriptions
   - Why we're building this

4. **teamcord_techstack.md**
   - Complete technical specifications
   - Exact implementations needed
   - Discord design system specs

5. **README.md**
   - Quick start guide
   - Project overview
   - Setup instructions

---

## 🛠️ Development Environment Setup

### 1. Start All Services

```bash
# Clone repo (if not already)
git clone https://github.com/atreyakamat/teamcord
cd teamcord

# Copy environment variables
cp .env.example .env

# Start Docker services
docker compose up -d

# Wait for services to be healthy
docker ps

# Install dependencies
pnpm install

# Run database migrations
cd packages/db && pnpm db:push && cd ../..

# Start development servers
pnpm dev
```

### 2. Access Services

- Web: http://localhost:3010
- API: http://localhost:3001
- Gateway: ws://localhost:3002
- Grafana: http://localhost:3005
- Prometheus: http://localhost:9090
- Meilisearch: http://localhost:7700
- MinIO Console: http://localhost:9001
- Keycloak: http://localhost:8080

### 3. Verify Services

```bash
# Check PostgreSQL
docker exec -it teamcord-postgres psql -U teamcord -d teamcord -c "SELECT version();"

# Check Redis
docker exec -it teamcord-redis redis-cli ping

# Check NATS
curl http://localhost:8222/healthz

# Check Meilisearch
curl http://localhost:7700/health

# Check Ollama
curl http://localhost:11434/api/tags
```

---

## 🔒 Security Checklist (Do Before Launch)

### Critical (P0)
- [ ] Change all default passwords in docker-compose.yml
- [ ] Generate random JWT_SECRET (64+ characters)
- [ ] Implement permission checks on all endpoints
- [ ] Add rate limiting to Go services
- [ ] Validate all user input
- [ ] Add CSRF protection
- [ ] Enable HTTPS in production (use Caddy)
- [ ] Implement audit logging

### High Priority (P1)
- [ ] Add session invalidation
- [ ] Implement "log out all sessions"
- [ ] Track active sessions
- [ ] Add 2FA support (optional)
- [ ] Scan for SQL injection vulnerabilities
- [ ] Test XSS prevention
- [ ] Review error messages (don't leak info)

### Medium Priority (P2)
- [ ] Add CSP headers
- [ ] Implement brute force protection
- [ ] Add honeypot fields
- [ ] Set up security monitoring
- [ ] Regular dependency updates

---

## 📝 Testing Checklist

### Before Merging Any Code
- [ ] Write unit tests (aim for 70%+ coverage)
- [ ] Write integration tests for API endpoints
- [ ] Test authentication flows
- [ ] Test permission enforcement
- [ ] Test real-time updates (WebSocket)
- [ ] Test file upload/download
- [ ] Test AI agent responses

### Before Launch
- [ ] Load test (100+ concurrent users)
- [ ] Security penetration testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing
- [ ] Accessibility testing (WCAG 2.1 AA)
- [ ] Performance testing (Lighthouse score > 90)

---

## 📊 Key Performance Indicators

Track these metrics to measure progress:

### Development Velocity
- **Lines of Code:** Currently ~15,000, target ~30,000 for MVP
- **Test Coverage:** Currently 0%, target 70%+
- **Services Complete:** Currently 3/7, target 7/7
- **Features Complete:** Currently 35-40%, target 100% P0 features

### User Experience
- **Message Send Latency:** Target <100ms
- **Search Response Time:** Target <100ms
- **Voice Call Setup:** Target <2 seconds
- **Page Load Time:** Target <2 seconds

### Infrastructure
- **Uptime:** Target 99.9%
- **Error Rate:** Target <0.1%
- **CPU Usage:** Target <70% average
- **Memory Usage:** Target <80% average

---

## 🎉 Milestones

### Milestone 1: Foundation Complete (Week 2)
- ✅ All "Nexus" renamed to "TeamCord"
- ✅ Snowflake IDs working everywhere
- ✅ JWT validation in all services
- ✅ Permission system enforced
- ✅ Test framework setup
- ✅ Security audit done

### Milestone 2: Voice Working (Week 4)
- ✅ mediasoup SFU running
- ✅ Can join/leave voice channels
- ✅ Audio transmission working
- ✅ Video calls working
- ✅ Screen sharing working
- ✅ Voice UI polished

### Milestone 3: AI Agent MVP (Week 6)
- ✅ /summarise working with Ollama
- ✅ /decide working
- ✅ @agent mentions responding
- ✅ Streaming responses
- ✅ Agent typing indicators

### Milestone 4: Files & Search (Week 8)
- ✅ File upload working
- ✅ MinIO integration complete
- ✅ Image thumbnails generating
- ✅ Meilisearch integrated
- ✅ Full-text search working
- ✅ Search UI polished

### Milestone 5: Core Features (Week 10)
- ✅ Thread support complete
- ✅ Emoji reactions working
- ✅ Markdown rendering
- ✅ Direct messages working
- ✅ User mentions working

### Milestone 6: MVP Launch (Week 12)
- ✅ All P0 features complete
- ✅ Security audit passed
- ✅ Performance tests passed
- ✅ Documentation complete
- ✅ One-command install working
- ✅ Landing page live
- 🚀 **LAUNCH!**

---

## 🤝 Getting Help

### Resources
- **Documentation:** All in `/docs` folder
- **PRD:** `teamcord prd.md` - Product requirements
- **Tech Spec:** `teamcord_techstack.md` - Implementation details
- **Status:** `IMPLEMENTATION_STATUS.md` - Current state
- **Summary:** `IMPLEMENTATION_SUMMARY.md` - Quick overview

### External Resources
- **mediasoup:** https://mediasoup.org/
- **LangChain:** https://python.langchain.com/
- **Meilisearch:** https://www.meilisearch.com/docs
- **MinIO:** https://min.io/docs/minio/linux/
- **Discord Developer Docs:** https://discord.com/developers/docs (for reference)

### Community
- **GitHub Issues:** Report bugs, request features
- **GitHub Discussions:** Ask questions, share ideas
- **Discord (ironic):** Join TeamCord community server

---

## 🎯 Your First Day Action Plan

Today, do this (in order):

### Morning (4 hours)
1. **Read this document** (you're doing it!) ✅
2. **Read IMPLEMENTATION_SUMMARY.md** (20 min)
3. **Setup development environment** (30 min)
   ```bash
   docker compose up -d
   pnpm install
   pnpm dev
   ```
4. **Test current functionality** (30 min)
   - Register account
   - Create workspace
   - Create channel
   - Send messages
   - Verify real-time updates work
5. **Start renaming Nexus → TeamCord** (2 hours)
   - Search and replace in all files
   - Update comments
   - Test everything still works

### Afternoon (4 hours)
6. **Begin voice service implementation** (4 hours)
   ```bash
   cd services/voice
   npm install mediasoup
   # Follow mediasoup documentation
   # Create basic SFU server structure
   ```

### Tomorrow
7. **Continue voice implementation**
8. **Get basic audio working**
9. **Test voice with 2 clients**

---

## 📈 Progress Tracking

Use this checklist to track your MVP progress:

### Foundation (Week 1-2)
- [ ] Nexus → TeamCord rename complete
- [ ] Snowflake IDs working
- [ ] JWT validation in Go services
- [ ] Structured logging added
- [ ] Permission system enforced
- [ ] Input validation in Go
- [ ] Security audit done
- [ ] Test framework setup

### Voice & Video (Week 3-4)
- [ ] mediasoup installed and configured
- [ ] Voice channels joinable
- [ ] Audio transmission working
- [ ] Video transmission working
- [ ] Screen sharing working
- [ ] Voice UI complete
- [ ] Tested with 10+ participants

### AI Agent (Week 5-6)
- [ ] LangChain integrated
- [ ] Ollama connected
- [ ] /summarise tool complete
- [ ] /decide tool complete
- [ ] /search tool complete
- [ ] @agent mentions working
- [ ] Streaming responses working

### Files & Search (Week 7-8)
- [ ] MinIO integrated
- [ ] File upload API complete
- [ ] Image thumbnails working
- [ ] File download working
- [ ] Meilisearch integrated
- [ ] Search API complete
- [ ] Search UI complete

### Core Features (Week 9-10)
- [ ] Thread support complete
- [ ] Emoji reactions working
- [ ] Markdown rendering working
- [ ] Code syntax highlighting
- [ ] User mentions working
- [ ] Direct messages working
- [ ] Message embeds working

### Polish & Launch (Week 11-12)
- [ ] All P0 features tested
- [ ] Security audit passed
- [ ] Performance tests passed
- [ ] Documentation complete
- [ ] Install script working
- [ ] Landing page deployed
- [ ] MVP launched! 🚀

---

## 🎊 You're Ready!

You have:
- ✅ Comprehensive documentation
- ✅ Clear roadmap with time estimates
- ✅ Prioritized task list
- ✅ Architecture understanding
- ✅ Beautiful landing page ready
- ✅ Development environment setup

**Now go build! The path to MVP is clear. Just follow the plan and execute. 💪**

**You've got this! 🚀**

---

*Document created: March 29, 2026*
*Last updated: March 29, 2026*
*Next review: After Foundation phase (Week 2)*
