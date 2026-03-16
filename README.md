# Razed AI

Razed AI is an upgraded chatbot web app with a polished interface, configurable system prompts, and **server-side API key handling**.

## What's new

- Secure backend proxy (`/api/chat`) so OpenAI key lives in `.env`
- Health endpoint (`/api/health`) with UI status badge
- Better chat UX:
  - Enter to send, Shift+Enter for newline
  - Typing indicator
  - Copy button for every message
  - Chat export to JSON
- Prompt presets (Balanced Assistant, Code Expert, Founder Strategist)
- Default system prompt now includes: **Made by OroLabs**

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Add your key in `.env`:
   ```env
   OPENAI_API_KEY=sk-your-openai-key
   PORT=3000
   ```
4. Start server:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000`

## Notes

- API key is no longer stored in browser localStorage.
- UI settings and chat history are still persisted in localStorage for convenience.
