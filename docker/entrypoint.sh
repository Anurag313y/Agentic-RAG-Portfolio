#!/bin/sh
# =============================================================
# Docker entrypoint — My Intelligent Portfolio
# =============================================================
# 1. Ensure .dev.vars exists (mounted or built from env)
# 2. Apply local D1 migrations (portfolio-db + rag_chunks)
# 3. Start wrangler dev against the Vite-built worker bundle
# =============================================================
set -e

WRANGLER_CONFIG="/app/wrangler.jsonc"
BUILT_CONFIG="/app/dist/server/wrangler.json"
PORT="${PORT:-8787}"

write_dev_vars_from_env() {
  rm -f /app/.dev.vars

  for var in \
    ADMIN_EMAIL ADMIN_PASSWORD \
    SMTP_USER SMTP_PASS SMTP_HOST SMTP_PORT \
    DEEPGRAM_API_KEY COHERE_API_KEY; do
    # shellcheck disable=SC2154
    eval "val=\${${var}:-}"
    if [ -n "$val" ]; then
      # Escape double quotes for wrangler .dev.vars format
      escaped=$(printf '%s' "$val" | sed 's/"/\\"/g')
      printf '%s="%s"\n' "$var" "$escaped" >> /app/.dev.vars
    fi
  done
}

# ── Step 1: .dev.vars ─────────────────────────────────────────
if [ -f /app/.dev.vars ] && [ -s /app/.dev.vars ]; then
  echo "[entrypoint] Using .dev.vars ($(wc -l < /app/.dev.vars | tr -d ' ') entries)."
else
  echo "[entrypoint] No .dev.vars found — building from container environment..."
  write_dev_vars_from_env
  echo "[entrypoint] .dev.vars written ($(wc -l < /app/.dev.vars | tr -d ' ') entries)."
fi

if ! grep -q '^ADMIN_EMAIL=' /app/.dev.vars 2>/dev/null; then
  echo "[entrypoint] ERROR: ADMIN_EMAIL is required. Copy .dev.vars.example to .dev.vars and set credentials."
  exit 1
fi

if ! grep -q '^ADMIN_PASSWORD=' /app/.dev.vars 2>/dev/null; then
  echo "[entrypoint] ERROR: ADMIN_PASSWORD is required. Copy .dev.vars.example to .dev.vars and set credentials."
  exit 1
fi

# ── Step 2: D1 migrations ─────────────────────────────────────
echo "[entrypoint] Applying D1 migrations (local)..."
if wrangler d1 migrations apply portfolio-db \
     --local \
     --config "$WRANGLER_CONFIG" 2>&1; then
  echo "[entrypoint] Migrations applied successfully."
else
  echo "[entrypoint] WARNING: Migration step reported an issue (may already be applied). Continuing..."
fi

# ── Step 3: Link wrangler state + secrets into build output ───
mkdir -p /app/dist/server
rm -rf /app/dist/server/.wrangler
ln -sf /app/.wrangler /app/dist/server/.wrangler
ln -sf /app/.dev.vars /app/dist/server/.dev.vars

if [ ! -f "$BUILT_CONFIG" ]; then
  echo "[entrypoint] ERROR: Built worker config not found at $BUILT_CONFIG — run npm run build first."
  exit 1
fi

echo "[entrypoint] Starting wrangler dev on 0.0.0.0:${PORT}..."
echo "[entrypoint] Open http://127.0.0.1:${PORT} (or host port 5173 if mapped)"
exec wrangler dev \
  --port "$PORT" \
  --ip 0.0.0.0 \
  --local \
  --config "$BUILT_CONFIG"
