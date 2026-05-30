/**
 * Step-by-step JARVIS pipeline diagnostics (no mic/STT websocket).
 * Run: node scripts/test-jarvis-pipeline.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadDevVars() {
  const text = readFileSync(resolve(root, ".dev.vars"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function ok(step, detail) {
  console.log(`\n✅ STEP ${step}: PASS — ${detail}`);
}
function fail(step, detail) {
  console.log(`\n❌ STEP ${step}: FAIL — ${detail}`);
}
function warn(step, detail) {
  console.log(`\n⚠️  STEP ${step}: WARN — ${detail}`);
}

const env = loadDevVars();
const DEEPGRAM = env.DEEPGRAM_API_KEY;
const COHERE = env.COHERE_API_KEY;

console.log("=== JARVIS pipeline diagnostics ===\n");
console.log("Keys present:", {
  DEEPGRAM_API_KEY: Boolean(DEEPGRAM),
  COHERE_API_KEY: Boolean(COHERE),
});

// --- Step 0: Config (what the app checks before enabling mic) ---
console.log("\n--- Step 0: App config gate (getJarvisConfig logic) ---");
if (!DEEPGRAM) {
  fail(0, "DEEPGRAM_API_KEY missing → mic disabled (supported=false)");
} else {
  ok(0, "Deepgram key present → deepgramConfigured=true if Jarvis enabled");
}
ok(
  0,
  "If COHERE_API_KEY is set, Jarvis auto-uses Cohere even when primaryModel is 'static' (see resolveEffectiveModel in llm.server.ts)",
);

// --- Step 1: Deepgram token (STT prerequisite) ---
console.log("\n--- Step 1: Deepgram auth grant (listen / STT token) ---");
if (!DEEPGRAM) {
  fail(1, "Skipped — no DEEPGRAM_API_KEY");
} else {
  try {
    const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: 60 }),
    });
    const body = await res.text();
    if (!res.ok) {
      fail(1, `HTTP ${res.status}: ${body.slice(0, 300)}`);
    } else {
      const data = JSON.parse(body);
      ok(
        1,
        `access_token received (expires_in=${data.expires_in ?? "?"})`,
      );
    }
  } catch (e) {
    fail(1, e.message);
  }
}

// --- Step 2: Cohere chat (LLM) ---
console.log("\n--- Step 2: Cohere v2 chat (portfolio Q&A) ---");
if (!COHERE) {
  fail(2, "Skipped — no COHERE_API_KEY");
} else {
  try {
    const res = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COHERE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "command-r-plus-08-2024",
        messages: [
          {
            role: "system",
            content:
              "You are JARVIS. Answer in one short sentence about a software engineer named Anurag.",
          },
          { role: "user", content: "What projects does he have?" },
        ],
        max_tokens: 128,
        temperature: 0.7,
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      fail(2, `HTTP ${res.status}: ${body.slice(0, 400)}`);
    } else {
      const data = JSON.parse(body);
      const text = data.message?.content?.[0]?.text?.trim();
      if (!text) fail(2, "Empty reply — COHERE_EMPTY would trigger static fallback");
      else ok(2, `Reply: "${text.slice(0, 120)}${text.length > 120 ? "…" : ""}"`);
    }
  } catch (e) {
    fail(2, e.message);
  }
}

// --- Step 3: Deepgram TTS ---
console.log("\n--- Step 3: Deepgram speak (text → speech) ---");
if (!DEEPGRAM) {
  fail(3, "Skipped — no DEEPGRAM_API_KEY");
} else {
  try {
    const params = new URLSearchParams({
      model: "aura-2-thalia-en",
      encoding: "mp3",
    });
    const res = await fetch(`https://api.deepgram.com/v1/speak?${params}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Hello, I am JARVIS, your portfolio assistant.",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      fail(3, `HTTP ${res.status}: ${body.slice(0, 300)}`);
    } else {
      const buf = await res.arrayBuffer();
      ok(3, `MP3 audio received (${buf.byteLength} bytes)`);
    }
  } catch (e) {
    fail(3, e.message);
  }
}

// --- Step 4: Local server functions ---
console.log("\n--- Step 4: Dev server RPC (TanStack server functions) ---");
const BASE = process.env.JARVIS_TEST_URL || "http://127.0.0.1:5174";
const FN = {
  getJarvisConfig: "5902ec3a49f646bb5c9052dec20923c0d4544d2c477eec14d18d76c8b4d408ca",
  getDeepgramToken: "753c74082b364aff87363a5e823c5d8434614d04368eb80097fc8a4bb03df87c",
  askJarvis: "e2dd0aeb6fce209c3dfb61f24e4bfaeb4cf832475ad1182ce548aaccd1e7529a",
  tts: "f4f68db460b6606d3d0d1e65efed9523bf5ce9010ca8a42e97e17bb250faab4b",
};

async function callServerFn(id, method, jsonBody) {
  const url = `${BASE}/_serverFn/${id}`;
  const init = {
    method,
    headers: { "x-tsr-serverFn": "true" },
  };
  if (jsonBody) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(jsonBody);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  return { status: res.status, text: text.slice(0, 500) };
}

try {
  const cfg = await callServerFn(FN.getJarvisConfig, "GET");
  if (cfg.status === 200 && cfg.text.includes("enabled")) {
    ok(4, `getJarvisConfig: ${cfg.text}`);
  } else {
    fail(4, `getJarvisConfig HTTP ${cfg.status}: ${cfg.text}`);
  }
} catch (e) {
  fail(4, `Server not reachable at ${BASE}: ${e.message}`);
}

console.log("\n=== Summary ===");
console.log(
  "STT (listen) cannot be fully tested from CLI — requires browser mic + Deepgram WebSocket.",
);
console.log(
  "If Step 2 passes but Jarvis still uses canned answers, set Admin → API → Primary model to 'cohere'.",
);
