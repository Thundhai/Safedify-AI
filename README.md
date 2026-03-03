<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Safedify AI — HSE Management Platform

A full-stack Health, Safety & Environment (HSE) management platform powered by Google Gemini AI. Features AI-powered incident classification, a ReAct-style database agent, voice input/output, PPE detection, and comprehensive safety dashboards.

## Architecture

```
┌───────────────────────────────┐
│       React Frontend          │  Port 3000 (dev) / served by Express (prod)
│   Vite + TypeScript + Tailwind│
└──────────┬────────────────────┘
           │  /api/*
┌──────────▼────────────────────┐
│       Express Backend         │  Port 4000
│   Node.js + SQLite + JWT      │
│   ┌───────────────────┐       │
│   │  Gemini AI Agent  │       │
│   │  ReAct Loop +     │       │
│   │  12 DB Tools      │       │
│   └───────────────────┘       │
└───────────────────────────────┘
```

## Features

- **AI Incident Classification** — Auto-classify severity, type, and root causes via Gemini
- **AI Agent Chat** — ReAct-style agent with 12 database tools (query, create, analyze)
- **Voice Input** — Speech-to-text for incident reports (Web Speech API)
- **Voice Output** — Text-to-speech for announcements and reports (SpeechSynthesis)
- **PPE Detection** — Upload photos for AI-powered PPE compliance analysis
- **Safety Dashboards** — TRIR, LTIFR, incident trends, environmental monitoring
- **Permit Management** — Work permits with expiry tracking
- **Emergency Management** — Global emergency contacts, drill scheduling
- **Dark Mode** — Full dark mode support
- **Autocomplete** — HSE-specific dictionary with 200+ terms and auto-correction

## Quick Start (Development)

### Prerequisites

- **Node.js** v22+ (v24 recommended for built-in SQLite)
- **Gemini API Key** — get one at [aistudio.google.com](https://aistudio.google.com/app/apikey)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/Safedify-AI.git
cd Safedify-AI

# Frontend dependencies
npm install

# Backend dependencies
cd server && npm install && cd ..
```

### 2. Configure Environment

```bash
# Frontend
cp .env.example .env.local
# Edit .env.local → set VITE_GEMINI_API_KEY

# Backend
cp server/.env.example server/.env
# Edit server/.env → set GEMINI_API_KEY and JWT_SECRET
```

### 3. Run Development Servers

```bash
# Terminal 1: Frontend (port 3000)
npm run dev

# Terminal 2: Backend (port 4000)
npm run dev:server
```

Visit [http://localhost:3000](http://localhost:3000)

### Login Credentials

| Email | Password | Role | Tier |
|-------|----------|------|------|
| admin@safedify.com | password | Admin | Enterprise |
| supervisor@safedify.com | password | HSE Supervisor | Pro |
| worker@safedify.com | password | Worker | Free |

## Production Deployment

### Option 1: Docker (Recommended)

```bash
# 1. Create environment file in project root
cat > .env << EOF
JWT_SECRET=$(openssl rand -base64 48)
GEMINI_API_KEY=your-gemini-api-key
OPENWEATHER_API_KEY=your-openweather-key
SEED_DEMO_USERS=true
EOF

# 2. Build & start
docker compose up -d --build

# 3. Check health
curl http://localhost:4000/api/health
```

The app runs on port **4000** — serves both the API and frontend.

### Option 2: Direct (Node.js)

```bash
# 1. Build frontend
npm run build

# 2. Install server production dependencies
cd server && npm install --omit=dev && cd ..

# 3. Configure production environment
cp server/.env.example server/.env
# Edit server/.env:
#   NODE_ENV=production
#   JWT_SECRET=<strong-random-string>  (64+ chars)
#   GEMINI_API_KEY=<your-key>

# 4. Start production server
NODE_ENV=production npm start
```

### Option 3: Docker Build Manually

```bash
docker build -t safedify-ai .

docker run -d \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e GEMINI_API_KEY=your-key \
  -e JWT_SECRET=$(openssl rand -base64 48) \
  -e SEED_DEMO_USERS=true \
  -v safedify-data:/data \
  safedify-ai
```

### Reverse Proxy (Production)

In production, use a reverse proxy (nginx, Caddy, Traefik) for TLS:

```nginx
# nginx example
server {
    listen 443 ssl;
    server_name safedify.yourdomain.com;
    ssl_certificate /etc/ssl/certs/safedify.pem;
    ssl_certificate_key /etc/ssl/private/safedify.key;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Environment Variables

### Frontend (.env.local) — Development only

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend API URL (default: `/api` — proxied by Vite) |

### Backend (server/.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development` or `production` |
| `PORT` | No | `4000` | Server port |
| `JWT_SECRET` | **Yes** | — | Secret for JWT tokens (64+ chars, **change in production!**) |
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key for AI features |
| `OPENWEATHER_API_KEY` | No | — | OpenWeatherMap API key for weather/AQI |
| `SITE_LATITUDE` | No | `25.2048` | Default site latitude |
| `SITE_LONGITUDE` | No | `55.2708` | Default site longitude |
| `ALLOWED_ORIGINS` | No | `localhost` | Comma-separated CORS origins |
| `DATA_DIR` | No | `server/` | Directory for SQLite database file |
| `SMTP_HOST` | No | — | SMTP server for password reset emails |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `SMTP_FROM` | No | `noreply@safedify.com` | From address for emails |
| `APP_URL` | No | `http://localhost:4000` | Public URL (for email links) |
| `SEED_DEMO_USERS` | No | `false` | Create demo users on first run |
| `HOST` | No | `0.0.0.0` (prod) | Bind address |

## Project Structure

```
Safedify-AI/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── services/           # API client, Gemini service, auth
│   ├── hooks/              # Custom hooks (autocomplete, etc.)
│   ├── context/            # React context (auth, theme)
│   └── types/              # TypeScript types
├── server/                 # Express backend
│   ├── agent/              # AI agent (ReAct loop + 12 tools)
│   ├── routes/             # API routes (auth, data, agent)
│   ├── db.ts               # SQLite schema & connection
│   ├── auth.ts             # JWT authentication
│   └── index.ts            # Server entry (Express)
├── public/                 # Static assets
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Docker Compose config
└── vite.config.ts          # Vite configuration
```

## Security Notes

- **JWT_SECRET**: Always use a strong, unique secret in production (64+ chars — use `openssl rand -base64 48`)
- **HTTPS**: Use a reverse proxy (nginx, Caddy) with TLS in production
- **Rate Limiting**: API routes are rate-limited (100 req/15min, AI: 15 req/min in production)
- **RBAC**: Server-side role-based access control on all write endpoints
- **Helmet**: Security headers applied via helmet middleware
- **CORS**: Strict origin validation in production mode
- **SQL Injection**: Agent SQL queries are read-only with injection hardening
- **No API Keys in Frontend**: All AI calls proxy through the backend

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 3 |
| Backend | Express 4, Node.js 22+, SQLite (built-in) |
| AI | Google Gemini 2.5 Flash via @google/genai |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Deployment | Docker, docker-compose |

## License

MIT
