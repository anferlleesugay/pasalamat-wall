# ---------- Dependencies (cached until package-lock.json changes) ----------
FROM node:20.18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- Test stage: the quality gate (Jenkins runs: docker build --target test) ----------
FROM deps AS test
COPY . .
RUN npm test

# ---------- Build the static site, stamped with the Jenkins build number ----------
FROM deps AS build
ARG BUILD_NUMBER=dev
ARG GIT_COMMIT=local
ENV VITE_BUILD_NUMBER=$BUILD_NUMBER \
    VITE_GIT_COMMIT=$GIT_COMMIT
COPY . .
RUN npm run build \
 && printf '{"build":"%s","commit":"%s"}\n' "$BUILD_NUMBER" "$GIT_COMMIT" > dist/version.json

# ---------- Runtime: Nginx running as a non-root user ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/version.json || exit 1
