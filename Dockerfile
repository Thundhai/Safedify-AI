# ==========================================
# Safedify AI - Production Docker Image
# ==========================================
# Build locally first, then copy into Docker:
#   npm ci && npm run build
#   cd server && npm ci --omit=dev
#   docker build -t safedify-ai .
# ==========================================
FROM node:22-slim

WORKDIR /app/server

# Copy package files and install deps inside container
# (needed because native binaries like esbuild are platform-specific)
COPY server/package.json server/package-lock.json ./

# Configure npm for slower/unreliable networks inside Docker
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 60000 \
 && npm config set fetch-retry-maxtimeout 300000 \
 && npm config set fetch-timeout 600000

# Copy node_modules from host, then rebuild native modules for Linux
COPY server/node_modules/ ./node_modules/
RUN npm rebuild

# Copy server source
COPY server/ ./

# Copy pre-built frontend (built on host via `npm run build`)
COPY dist/ /app/dist/

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
