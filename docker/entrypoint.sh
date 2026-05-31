#!/bin/sh
# =============================================================
# Docker entrypoint for Anurag's Intelligent Portfolio
# =============================================================
# Responsibilities:
#   1. Materialize environment variables as .dev.vars so that
#      wrangler dev can read Cloudflare Worker bindings/secrets.
#   2. Apply any pending D1 (SQLite) migrations locally.
#   3. Start the wrangler dev server using the built bundle.
# =============================================================
set -e

WRANGLER_CONFIG="/app/wrangler.jsonc"
PORT="${PORT:-8787}"

# ── Step 1: Write .dev.vars ───────────────────────────────────
echo "[entrypoint] Writing /app/.dev.vars from environment..."
rm -f /app/.dev.vars

for var in \
  ADMIN_EMAIL ADMIN_PASSWORD \
  SMTP_USER SMTP_PASS SMTP_HOST SMTP_PORT \
  DEEPGRAM_API_KEY COHERE_API_KEY GEMINI_API_KEY \
  RESEND_API_KEY RESEND_FROM; do
  val=$(eval "printf '%s' \"\${${var}:-}\"")
  if [ -n "$val" ]; then
    printf '%s="%s"\n' "$var" "$val" >> /app/.dev.vars
  fi
done

echo "[entrypoint] .dev.vars written ($(wc -l < /app/.dev.vars) entries)."

# ── Step 2: Apply D1 migrations ───────────────────────────────
echo "[entrypoint] Applying D1 migrations (local)..."
if wrangler d1 migrations apply portfolio-db \
     --local \
     --config "$WRANGLER_CONFIG" 2>&1; then
  echo "[entrypoint] Migrations applied successfully."
else
  echo "[entrypoint] WARNING: Migrations step encountered an issue (may already be applied). Continuing..."
fi

# ── Step 3: Start wrangler dev ────────────────────────────────
# Ensure the Vite-built wrangler.json uses the SAME Miniflare state 
# directory as the root config by symlinking it.
mkdir -p /app/dist/server
rm -rf /app/dist/server/.wrangler
ln -s /app/.wrangler /app/dist/server/.wrangler
ln -s /app/.dev.vars /app/dist/server/.dev.vars

# Use the Vite-built wrangler.json which includes the assets directory
# config (pointing to ../client) so CSS/JS/images are served correctly.
# The original wrangler.jsonc does NOT have an assets entry.
BUILT_CONFIG="/app/dist/server/wrangler.json"
echo "[entrypoint] Starting wrangler dev on 0.0.0.0:${PORT}..."
exec wrangler dev \
  --port "$PORT" \
  --ip 0.0.0.0 \
  --local \
  --config "$BUILT_CONFIG"
