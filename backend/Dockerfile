# ==============================================================================
# HomeVault Backend - Production Multi-Stage Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Builder Stage: Compile TypeScript & Prune Dev Dependencies
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (utilizing Docker layer caching)
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy backend source code
COPY src/ ./src

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# Prune devDependencies to keep image size minimal
RUN npm prune --omit=dev

# ------------------------------------------------------------------------------
# 2. Production Runner Stage: Lightweight, Secure, Non-Root Runtime
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Create non-root directories and set ownership to built-in 'node' user
RUN mkdir -p /app/public/uploads && chown -R node:node /app

# Copy production node_modules and compiled code from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Copy default public directory if present
COPY --chown=node:node public ./public

# Switch to non-root user for security
USER node

EXPOSE 5001

# Health check to monitor container responsiveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

# Start production server
CMD ["node", "dist/server.js"]

