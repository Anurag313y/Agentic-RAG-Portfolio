# syntax=docker/dockerfile:1.7

ARG WRANGLER_VERSION=4.95.0

# ============================================================
# Stage 1: Build (Node 22 Alpine)
# ============================================================
FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================================
# Stage 2: Runtime (Node 22 Debian slim — glibc required by workerd)
# ============================================================
FROM node:22-slim AS runtime
ARG WRANGLER_VERSION
WORKDIR /app

LABEL org.opencontainers.image.title="My Intelligent Portfolio"
LABEL org.opencontainers.image.description="TanStack Start portfolio on Cloudflare Workers (local wrangler dev)"

RUN apt-get update \
  && apt-get install -y --no-install-recommends dos2unix ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g "wrangler@${WRANGLER_VERSION}"

RUN groupadd -r app && useradd -r -m -g app app
RUN mkdir -p /app/.wrangler/state && chown -R app:app /app

COPY --chown=app:app --from=build /app/dist ./dist
COPY --chown=app:app --from=build /app/drizzle ./drizzle
COPY --chown=app:app --from=build /app/wrangler.jsonc ./wrangler.jsonc

COPY docker/entrypoint.sh /app/entrypoint.sh
RUN dos2unix /app/entrypoint.sh \
  && chmod +x /app/entrypoint.sh \
  && chown app:app /app/entrypoint.sh

USER app

ENV PORT=8787
ENV NODE_ENV=production
EXPOSE 8787

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>{if(!r.ok)process.exit(1);return r.text()}).then(()=>process.exit(0)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]
