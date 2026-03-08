# ==========================================
# Safedify AI - Production Docker Image
# Multi-stage build: builds frontend + server in container
# ==========================================
# Usage: docker build -t safedify-ai .
# ==========================================

# --- Stage 1: Build frontend ---
FROM node:22-slim AS frontend-build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# --- Stage 2: Production server ---
FROM node:22-slim

WORKDIR /app/server

# Copy server package files
COPY server/package.json server/package-lock.json ./

# Configure npm for slower/unreliable networks inside Docker
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 60000 \
 && npm config set fetch-retry-maxtimeout 300000 \
 && npm config set fetch-timeout 600000

# Install production server dependencies
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./

# Copy pre-built frontend from stage 1
COPY --from=frontend-build /build/dist/ /app/dist/

# Create data directory
RUN mkdir -p /data && chown -R node:node /data

# Non-root user
USER node

# Environment defaults
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "--import", "tsx", "index.ts"]
