import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of readFileSync(resolve(root, ".dev.vars"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const key = env.DEEPGRAM_API_KEY;
if (!key) {
  console.error("No DEEPGRAM_API_KEY in .dev.vars");
  process.exit(1);
}

const grant = await fetch("https://api.deepgram.com/v1/auth/grant", {
  method: "POST",
  headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ ttl_seconds: 60 }),
});
console.log("grant", grant.status, (await grant.text()).slice(0, 300));

for (const model of ["nova-3", "nova-2", "nova-2-general", "base"]) {
  const res = await fetch(
    `https://api.deepgram.com/v1/listen?model=${model}&language=en`,
    {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": "audio/webm" },
      body: new Uint8Array(0),
    },
  );
  console.log("listen", model, res.status, (await res.text()).slice(0, 280));
}

const codecs = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&language=en", {
  method: "POST",
  headers: { Authorization: `Token ${key}`, "Content-Type": "audio/webm;codecs=opus" },
  body: new Uint8Array(0),
});
console.log("listen codecs header", codecs.status, (await codecs.text()).slice(0, 280));
