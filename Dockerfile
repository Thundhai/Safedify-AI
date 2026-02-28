# ==========================================
# Stage 1: Build Frontend
# ==========================================
FROM node:22-slim AS frontend-build

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source & build
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.js postcss.config.js ./
COPY public/ public/
COPY src/ src/

# Build-time env vars (frontend only)
ARG VITE_GEMINI_API_KEY=""
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

RUN npm run build

# ==========================================
# Stage 2: Production Server
# ==========================================
FROM node:22-slim AS production

WORKDIR /app/server

# Install server dependencies
COPY server/package.json server/package-lock.json ./
RUN npm ci --production

# Copy server source
COPY server/ ./

# Copy frontend build from stage 1
COPY --from=frontend-build /app/dist /app/dist

# Create data directory
RUN mkdir -p /data && chown -R node:node /data

# Non-root user
USER node

# Environment defaults
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "--experimental-sqlite", "--import", "tsx", "index.ts"]
