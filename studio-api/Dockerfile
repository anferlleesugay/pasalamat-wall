# ---------- Base: Node + package files ----------
FROM node:20.18-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# ---------- Test stage (Jenkins runs: docker build --target test) ----------
FROM base AS test
RUN npm ci --no-audit --no-fund
COPY src ./src
COPY tests ./tests
RUN npm test

# ---------- Production dependencies only (no jest, no supertest) ----------
FROM base AS prod-deps
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- Runtime: small image, non-root "node" user ----------
FROM node:20.18-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "src/server.js"]
