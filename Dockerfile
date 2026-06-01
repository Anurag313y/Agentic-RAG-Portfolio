# syntax=docker/dockerfile:1.7

ARG WRANGLER_VERSION=4.95.0

# ============================================================
# Stage 1: Build
# Uses Alpine for a lightweight build environment.
# ============================================================
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies required by node-gyp or other native addons
RUN apk add --no-cache libc6-compat

# Optimize caching by installing dependencies before copying source
COPY package.json package-lock.json ./
RUN npm ci

# Copy the remaining source files
COPY . .

# Build the application
RUN npm run build


# ============================================================
# Stage 2: Runtime
# Uses Debian Slim (glibc) which is natively required by Cloudflare's
# workerd runtime. Using Alpine here would cause ENOENT errors.
# ============================================================
FROM node:22-slim AS runtime
ARG WRANGLER_VERSION
WORKDIR /app

# dos2unix is critical for Windows users to prevent \r carriage return 
# bad interpreter errors when running entrypoint.sh
RUN apt-get update && apt-get install -y dos2unix ca-certificates && rm -rf /var/lib/apt/lists/*

# Install wrangler globally (workerd/miniflare). Version matches package.json.
RUN npm install -g wrangler@${WRANGLER_VERSION}

# Security: Create a non-root user with a home directory
# The -m flag creates /home/app which is required for Wrangler to store .config logs
RUN groupadd -r app && useradd -r -m -g app app
RUN mkdir -p /app/.wrangler/state && chown -R app:app /app

# Copy the built worker bundle and client assets from the build stage
COPY --chown=app:app --from=build /app/dist ./dist

# Copy D1 database migrations so they can be applied on startup
COPY --chown=app:app --from=build /app/drizzle ./drizzle

# Copy the wrangler configuration
COPY --chown=app:app --from=build /app/wrangler.jsonc ./wrangler.jsonc

# Copy the hardened entrypoint script
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN dos2unix /app/entrypoint.sh \
 && chmod +x /app/entrypoint.sh \
 && chown app:app /app/entrypoint.sh

# Drop down to the non-root user
USER app

# Standardized port for Cloudflare workers
ENV PORT=8787
EXPOSE 8787

# Wait for wrangler dev to actually start responding to requests
HEALTHCHECK --interval=15s --timeout=5s --start-period=35s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>{if(!r.ok)process.exit(1);return r.text()}).then(()=>process.exit(0)).catch(()=>process.exit(1))"

# Start the application
ENTRYPOINT ["/app/entrypoint.sh"]
