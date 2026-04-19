# Welcome to TeamCord! 🚀

> Discord is where your gaming friends hang out. **TeamCord is where your team gets work done.**

Welcome to our community! TeamCord is designed to give us the speed of real-time chat with the structure of a professional workplace. This guide will help you get settled and make the most of our new workspace.

---

## 🛠️ Getting Started (For Members)

### 1. Set Up Your Profile
Click on your user settings (bottom-left) to:
- **Upload an Avatar:** Personalize your presence.
- **Set a Status:** Let the team know if you're "Deep Work" 🧠 or "Available" ☕.
- **Link Keycloak:** Ensure your single sign-on is active for secure access.

### 2. Master the Search
Unlike other platforms, TeamCord's search actually works.
- Press `Ctrl + K` (or `Cmd + K`) to open the **Quick Jumper**.
- Search for messages, files, or specific decisions across all channels.

### 3. Meet the AI Agent (`@agent`)
Our built-in AI assistant is here to help you stay productive:
- **Summarize:** Type `/summarise` in any long thread to get a bulleted recap of what you missed.
- **Ask Questions:** Mention `@agent` to ask about project technicals or find information buried in the docs.
- **Run Code:** Use `/run` to execute Python or JS snippets directly in the chat.

### 4. Voice & Screen Sharing
Need a quick sync? Just click into a **Voice Channel**.
- **HD Video:** Toggle your camera for face-to-face meetings.
- **Screen Share:** Click the screen icon to present your work with high-fidelity text rendering.

---

## ⚖️ Guidelines for Professionals

To keep our workspace productive, we follow these core principles:

1. **Async-First:** If a reply isn't urgent, post it in a thread. Don't ping individuals unless necessary.
2. **Knowledge Persistence:** If a discussion results in a decision, use the **Decision Log** (see below).
3. **Privacy by Default:** Your data stays on our server. Respect the privacy of your teammates and clients.

---

## 🛡️ For Moderators & Admins

### The Decision Log (Our Superpower)
When a conversation reaches a conclusion, don't let it get lost in the scroll.
- **Log it:** Use the `/decide` command to archive a decision.
- **Extraction:** The AI Agent will automatically extract the *Rationale*, *Participants*, and *Outcome*.
- **Visibility:** All decisions are searchable in the **Decision Log** tab at the top of the workspace.

### Managing Channels
- **Categories:** Keep the sidebar clean. Group channels by project or department (e.g., `#dev-api`, `#design-ui`).
- **Permissions:** Use Keycloak roles to control who can view sensitive channels or manage client portals.

### Health & Observability
Check the system health at the admin dashboard:
- **Storage:** Monitor the MinIO bucket for file usage.
- **AI Load:** Check the Ollama status if the Agent response time increases.

---

## ✅ Launch Status: What’s Still Remaining

Before calling Teamcord v1.0 fully verified in production, complete these final checks:

1. **Build verification:** run `go build` for `services/messaging` and `services/files`, then run `pnpm build` from repo root.
2. **Database migration:** apply `services/messaging/migrations/0003_add_file_meta_table.sql` on your live database.
3. **End-to-end smoke tests:** validate Keycloak login flow, file upload + `/f/{fileId}` redirect, screen share across two clients, and search jump-to-message behavior.
4. **PWA audit:** run Lighthouse and confirm installability + offline fallback (`offline.html`) works.
5. **Production env sanity:** confirm `.env` values are real secrets (not placeholders), public URLs are domain-based, and Caddy routes are reachable externally.

If all five pass, your community launch is operationally complete.

---

## 🤝 Contributing & Support

- **Found a bug?** Report it in the `#system-feedback` channel or open an issue on GitHub.
- **Need help?** Ask in `#help-desk` or mention a Moderator.

**TeamCord** — *Built for teams, not for gamers.*
