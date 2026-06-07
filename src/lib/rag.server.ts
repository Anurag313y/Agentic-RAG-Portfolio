/**
 * RAG Engine for JARVIS
 *
 * Handles: chunking portfolio content → embedding via Cohere → storing in D1 →
 * hybrid semantic + focus-based search at query time.
 *
 * All embedding vectors are 1024-dim floats from Cohere embed-english-v3.0.
 * Cosine similarity is computed in pure TypeScript — fast enough for ~60 chunks.
 */

import { ragChunks } from "@/db/schema";
import {
  readQueryEmbeddingCache,
  readRagContentFingerprint,
  readRagIndexStatus,
  writeQueryEmbeddingCache,
  writeRagContentFingerprint,
  writeRagIndexStatus,
} from "./cache.server";
import type { RagIndexPhase, RagIndexStatus } from "./content.types";
import { getDb } from "./db.server";
import { isKnowledgeBaseQuestion, type JarvisFocus } from "./jarvis-intent";
import type { AdminContent } from "./content.types";
import { extractKbFactText } from "./jarvis-speech";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RagChunk {
  id: string;
  source: string;
  content: string;
}

export interface RagChunkWithEmbedding extends RagChunk {
  embedding: number[];
}

interface CohereEmbedResponse {
  embeddings: { float: number[][] };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COHERE_EMBED_MODEL = "embed-english-v3.0";
const COHERE_EMBED_URL = "https://api.cohere.com/v2/embed";

/** Max tokens per chunk — Cohere embed context is 512 tokens; we keep chunks short. */
const MAX_CHUNK_CHARS = 1600;

/** Cohere hard limit per embed request. */
const COHERE_MAX_EMBED_BATCH = 96;

/** Indexing embed batches — larger = fewer API calls; progress still updates each batch. */
const EMBED_PROGRESS_BATCH_SIZE = 16;

/** Skip Cohere query embed when keyword match is this strong (saves ~150–400ms). */
const KEYWORD_FAST_PATH_MIN_SCORE = 6;

/** In-memory chunk cache TTL — avoids D1 + deserialize on every Jarvis question. */
const CHUNKS_CACHE_TTL_MS = 5 * 60 * 1000;

/** Ignore duplicate index runs started within this window. */
const INDEXING_STALE_MS = 5 * 60 * 1000;

let chunksMemoryCache: {
  chunks: RagChunkWithEmbedding[];
  loadedAt: number;
  version: number;
} | null = null;
let chunksCacheVersion = 0;

export function invalidateRagChunksCache(): void {
  chunksCacheVersion++;
  chunksMemoryCache = null;
}

/** D1 batch insert size — Cloudflare D1 allows up to ~100 statements per batch. */
const D1_INSERT_BATCH_SIZE = 50;

const EMBEDDING_STORAGE_PREFIX = "f32:";

const SEMANTIC_TOP_K = 5;
const KEYWORD_TOP_K = 4;
const MAX_CONTEXT_CHUNKS = 10;
const MIN_KB_CHUNKS = 3;

const QUERY_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "did",
  "do",
  "does",
  "where",
  "what",
  "when",
  "how",
  "who",
  "whom",
  "his",
  "her",
  "he",
  "she",
  "they",
  "have",
  "has",
  "had",
  "completed",
  "complete",
  "about",
  "tell",
  "me",
  "please",
  "would",
  "could",
  "from",
  "for",
  "and",
  "or",
  "in",
  "at",
  "to",
  "of",
  "on",
]);

/** Map visitor intent to chunk sources for hybrid retrieval. */
const FOCUS_SOURCE_PRIORITY: Partial<Record<JarvisFocus, string[]>> = {
  projects: ["project"],
  skills: ["skills"],
  experience: ["experience"],
  education: ["knowledge_base"],
  about: ["profile", "about", "knowledge_base"],
  contact: ["profile"],
  resume: ["profile"],
  general: ["knowledge_base"],
};

// ---------------------------------------------------------------------------
// 1. Chunking — deterministic, no external deps
// ---------------------------------------------------------------------------

export function chunkPortfolioContent(content: AdminContent): RagChunk[] {
  const chunks: RagChunk[] = [];

  const p = content.profile;
  const profileText = [
    `Name: ${p.name}`,
    `Role: ${p.role}`,
    `Headline: ${p.headline}`,
    `Location: ${p.location}`,
    `Email: ${p.email}`,
    `Intro: ${p.intro}`,
    p.socials?.github ? `GitHub: ${p.socials.github}` : "",
    p.socials?.linkedin ? `LinkedIn: ${p.socials.linkedin}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  chunks.push({ id: "profile", source: "profile", content: profileText });

  if (content.about?.trim()) {
    chunks.push({ id: "about", source: "about", content: content.about.trim() });
  }

  const visibleProjects = content.projects.filter((pr) => !pr.hidden);
  visibleProjects.forEach((pr, i) => {
    const parts = [
      `Project: ${pr.title}`,
      pr.description ? `Description: ${pr.description}` : "",
      pr.stack?.length ? `Stack: ${pr.stack.join(", ")}` : "",
      pr.features?.length ? `Features: ${pr.features.join(", ")}` : "",
      pr.github ? `GitHub: ${pr.github}` : "",
      pr.demo ? `Demo: ${pr.demo}` : "",
    ].filter(Boolean);
    chunks.push({
      id: `project-${i}`,
      source: "project",
      content: parts.join("\n"),
    });
  });

  content.skills.forEach((cat, i) => {
    if (!cat.items.length) return;
    chunks.push({
      id: `skills-${i}`,
      source: "skills",
      content: `Skill Category: ${cat.category}\nItems: ${cat.items.join(", ")}`,
    });
  });

  content.experience.forEach((exp, i) => {
    const points = exp.points?.length
      ? `\nKey points:\n${exp.points.map((pt) => `• ${pt}`).join("\n")}`
      : "";
    chunks.push({
      id: `exp-${i}`,
      source: "experience",
      content: `Role: ${exp.role}\nCompany: ${exp.company}\nDuration: ${exp.duration}${points}`,
    });
  });

  chunks.push(...chunkKnowledgeBase(content.jarvisKnowledgeBase?.trim() ?? ""));

  return chunks;
}

/**
 * Split Knowledge Base into retrieval-friendly chunks.
 * Prefer one fact per chunk (bullets, key-value lines, markdown sections).
 */
function chunkKnowledgeBase(kb: string): RagChunk[] {
  if (!kb) return [];

  const chunks: RagChunk[] = [];
  let kbIdx = 0;

  const pushChunk = (raw: string) => {
    const trimmed = extractKbFactText(raw.trim());
    if (!trimmed) return;

    if (trimmed.length <= MAX_CHUNK_CHARS) {
      chunks.push({
        id: `kb-${kbIdx++}`,
        source: "knowledge_base",
        content: trimmed,
      });
      return;
    }

    const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
    let buffer = "";
    for (const sentence of sentences) {
      if (buffer.length + sentence.length > MAX_CHUNK_CHARS && buffer) {
        chunks.push({
          id: `kb-${kbIdx++}`,
          source: "knowledge_base",
          content: buffer.trim(),
        });
        buffer = "";
      }
      buffer += sentence;
    }
    if (buffer.trim()) {
      chunks.push({
        id: `kb-${kbIdx++}`,
        source: "knowledge_base",
        content: buffer.trim(),
      });
    }
  };

  const isListLine = (line: string) =>
    /^[-*•]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^[A-Za-z][^:]{0,48}:\s+\S/.test(line);

  const sections = kb.split(/\n(?=#{1,3}\s)/);
  for (const section of sections) {
    const paragraphs = section.split(/\n{2,}/);
    for (const para of paragraphs) {
      const lines = para
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length > 1 && lines.every(isListLine)) {
        let group: string[] = [];
        let groupLen = 0;
        const flushGroup = () => {
          if (group.length) pushChunk(group.join("\n"));
          group = [];
          groupLen = 0;
        };
        for (const line of lines) {
          if (group.length >= 4 || groupLen + line.length > 900) flushGroup();
          group.push(line);
          groupLen += line.length;
        }
        flushGroup();
      } else {
        pushChunk(para);
      }
    }
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// 2. Cohere Embedding API
// ---------------------------------------------------------------------------

function parseCohereApiError(status: number, body: string): string {
  let detail = body.slice(0, 240);
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    detail = parsed.message ?? parsed.error ?? detail;
  } catch {
    /* use raw body excerpt */
  }

  if (status === 401 || status === 403) {
    return "Cohere API key is invalid or unauthorized. Check Admin → API Configuration.";
  }
  if (status === 429) {
    return "Cohere rate limit exceeded. Wait a minute and try again.";
  }
  return `Cohere embed request failed (HTTP ${status}): ${detail}`;
}

async function callCohereEmbed(
  apiKey: string,
  texts: string[],
  inputType: "search_document" | "search_query",
): Promise<number[][]> {
  const res = await fetch(COHERE_EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: COHERE_EMBED_MODEL,
      texts,
      input_type: inputType,
      embedding_types: ["float"],
      truncate: "END",
    }),
  });

  const body = await res.text();

  if (!res.ok) {
    console.error("[rag] Cohere embed error:", res.status, body);
    throw new Error(parseCohereApiError(res.status, body));
  }

  let data: CohereEmbedResponse;
  try {
    data = JSON.parse(body) as CohereEmbedResponse;
  } catch {
    throw new Error("Cohere embed returned an invalid response. Try again shortly.");
  }

  const floats = data.embeddings?.float;
  if (!floats?.length) {
    throw new Error("Cohere embed returned no vectors. Verify your API key has Embed access.");
  }
  if (floats.length !== texts.length) {
    throw new Error(
      `Cohere embed count mismatch: sent ${texts.length} texts, got ${floats.length} vectors.`,
    );
  }

  return floats;
}

type EmbedProgress = {
  total: number;
  processed: number;
  phase: RagIndexPhase;
};

export async function embedChunks(
  apiKey: string,
  chunks: RagChunk[],
  onProgress?: (progress: EmbedProgress) => void | Promise<void>,
): Promise<RagChunkWithEmbedding[]> {
  const results: RagChunkWithEmbedding[] = [];
  const total = chunks.length;
  const batchSize = Math.min(EMBED_PROGRESS_BATCH_SIZE, COHERE_MAX_EMBED_BATCH);

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.content);

    if (onProgress) {
      await onProgress({ total, processed: i, phase: "embedding" });
    }

    const embeddings = await callCohereEmbed(apiKey, texts, "search_document");

    for (let j = 0; j < batch.length; j++) {
      results.push({ ...batch[j], embedding: embeddings[j] });
    }

    if (onProgress) {
      await onProgress({ total, processed: results.length, phase: "embedding" });
    }
  }

  return results;
}

function isIndexingInProgress(status: RagIndexStatus): boolean {
  if (status.state !== "indexing") return false;
  return Date.now() - status.updatedAt < INDEXING_STALE_MS;
}

/** SHA-256 fingerprint of all fields that affect RAG chunks — skip redundant re-indexes. */
export async function computeRagContentFingerprint(content: AdminContent): Promise<string> {
  const payload = JSON.stringify({
    profile: content.profile,
    about: content.about,
    projects: content.projects,
    skills: content.skills,
    experience: content.experience,
    jarvisKnowledgeBase: content.jarvisKnowledgeBase?.trim() ?? "",
  });
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Compact float32 base64 storage — ~4x smaller than JSON, faster D1 writes. */
function serializeEmbedding(embedding: number[]): string {
  const f32 = new Float32Array(embedding);
  const bytes = new Uint8Array(f32.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `${EMBEDDING_STORAGE_PREFIX}${btoa(binary)}`;
}

function deserializeEmbedding(raw: string): number[] {
  if (raw.startsWith(EMBEDDING_STORAGE_PREFIX)) {
    const binary = atob(raw.slice(EMBEDDING_STORAGE_PREFIX.length));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return Array.from(new Float32Array(bytes.buffer));
  }
  return JSON.parse(raw) as number[];
}

async function getRagChunkCount(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ id: ragChunks.id }).from(ragChunks).all();
  return rows.length;
}

export async function embedQuery(apiKey: string, query: string): Promise<number[]> {
  const cached = await readQueryEmbeddingCache(query);
  if (cached) {
    console.log("[rag] Query embedding cache hit.");
    return cached;
  }

  const embeddings = await callCohereEmbed(apiKey, [query], "search_query");
  const embedding = embeddings[0];
  void writeQueryEmbeddingCache(query, embedding);
  return embedding;
}

// ---------------------------------------------------------------------------
// 3. Cosine Similarity + Hybrid Search
// ---------------------------------------------------------------------------

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function semanticSearch(
  queryEmbedding: number[],
  chunks: RagChunkWithEmbedding[],
  topK = SEMANTIC_TOP_K,
): RagChunkWithEmbedding[] {
  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.chunk);
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !QUERY_STOP_WORDS.has(t));
}

function scoreChunkKeywords(
  query: string,
  chunk: RagChunkWithEmbedding,
  tokens: string[],
  queryLower: string,
): number {
  const text = chunk.content.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (text.includes(token)) score += 2;
  }

  const educationQuery =
    /\b(education|school|secondary|higher|college|university|12th|10th|intermediate|ssc|hsc|studied)\b/.test(
      queryLower,
    );

  if (educationQuery && chunk.source === "knowledge_base") {
    score += 3;
    if (
      /\b(school|college|university|secondary|higher|12th|10th|intermediate|ssc|hsc|education)\b/.test(
        text,
      )
    ) {
      score += 4;
    }
  }

  if (isKnowledgeBaseQuestion(query) && chunk.source === "knowledge_base") {
    score += 1;
  }

  return score;
}

export function keywordSearchWithScores(
  query: string,
  chunks: RagChunkWithEmbedding[],
  topK = KEYWORD_TOP_K,
): Array<{ chunk: RagChunkWithEmbedding; score: number }> {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];

  const queryLower = query.toLowerCase();
  const scored = chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunkKeywords(query, chunk, tokens, queryLower),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

/** Lexical overlap — catches exact terms semantic search may miss (e.g. "higher secondary"). */
export function keywordSearch(
  query: string,
  chunks: RagChunkWithEmbedding[],
  topK = KEYWORD_TOP_K,
): RagChunkWithEmbedding[] {
  return keywordSearchWithScores(query, chunks, topK).map((s) => s.chunk);
}

function rankChunksByRelevance(
  chunks: RagChunkWithEmbedding[],
  queryEmbedding: number[] | null,
  query: string,
  focus: JarvisFocus,
): RagChunkWithEmbedding[] {
  const tokens = tokenizeQuery(query);
  const queryLower = query.toLowerCase();

  const scored = chunks.map((chunk) => {
    let score = scoreChunkKeywords(query, chunk, tokens, queryLower);
    if (queryEmbedding) {
      score += cosineSimilarity(queryEmbedding, chunk.embedding) * 12;
    }
    if (focus === "education" && chunk.source === "knowledge_base") score += 3;
    if (isKnowledgeBaseQuestion(query) && chunk.source === "knowledge_base") score += 2;
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.chunk);
}

/**
 * Combine semantic, keyword, and focus-based retrieval so Knowledge Base
 * facts (education, FAQs) are not drowned out by portfolio sections.
 */
export function hybridSearch(
  queryEmbedding: number[],
  allChunks: RagChunkWithEmbedding[],
  query: string,
  focus: JarvisFocus,
  hasKnowledgeBase: boolean,
  semanticTopK = SEMANTIC_TOP_K,
  maxTotal = MAX_CONTEXT_CHUNKS,
): RagChunkWithEmbedding[] {
  const seen = new Set<string>();
  const merged: RagChunkWithEmbedding[] = [];

  const add = (chunk: RagChunkWithEmbedding) => {
    if (seen.has(chunk.id)) return;
    seen.add(chunk.id);
    merged.push(chunk);
  };

  for (const chunk of semanticSearch(queryEmbedding, allChunks, semanticTopK)) {
    add(chunk);
  }

  for (const chunk of keywordSearch(query, allChunks, KEYWORD_TOP_K)) {
    add(chunk);
  }

  const prioritySources = FOCUS_SOURCE_PRIORITY[focus];
  if (prioritySources?.length) {
    const priorityPool = allChunks.filter((c) => prioritySources.includes(c.source));
    for (const chunk of keywordSearch(query, priorityPool, 4)) add(chunk);
    for (const chunk of semanticSearch(queryEmbedding, priorityPool, 3)) add(chunk);
  }

  if (hasKnowledgeBase) {
    const kbChunks = allChunks.filter((c) => c.source === "knowledge_base");
    const kbKeywordHits = keywordSearch(query, kbChunks, MIN_KB_CHUNKS);
    for (const chunk of kbKeywordHits) add(chunk);

    const kbInMerged = merged.some((c) => c.source === "knowledge_base");
    if (
      (isKnowledgeBaseQuestion(query) || focus === "education") &&
      (!kbInMerged || kbKeywordHits.length === 0)
    ) {
      for (const chunk of semanticSearch(queryEmbedding, kbChunks, MIN_KB_CHUNKS)) add(chunk);
    }
  }

  return rankChunksByRelevance(merged, queryEmbedding, query, focus).slice(0, maxTotal);
}

/** Keyword-only retrieval for projects/skills/about/etc. — avoids embed API latency. */
function retrieveFocusContextFast(
  query: string,
  allChunks: RagChunkWithEmbedding[],
  focus: JarvisFocus,
): string | null {
  const prioritySources = FOCUS_SOURCE_PRIORITY[focus];
  const pool = prioritySources?.length
    ? allChunks.filter((c) => prioritySources.includes(c.source))
    : allChunks;

  const hits = keywordSearchWithScores(query, pool, 6);
  if (hits.length === 0 && prioritySources?.length) {
    const fallback = allChunks.filter((c) => prioritySources.includes(c.source)).slice(0, 3);
    if (fallback.length > 0) {
      return formatRetrievedContext(fallback);
    }
    return null;
  }

  const topChunks = rankChunksByRelevance(
    hits.map((h) => h.chunk),
    null,
    query,
    focus,
  ).slice(0, MAX_CONTEXT_CHUNKS);

  return topChunks.length > 0 ? formatRetrievedContext(topChunks) : null;
}

// ---------------------------------------------------------------------------
// 4. Index Content — chunk → embed → batch upsert D1
// ---------------------------------------------------------------------------

async function persistChunks(withEmbeddings: RagChunkWithEmbedding[]): Promise<void> {
  const db = getDb();
  const now = Date.now();

  try {
    await db.delete(ragChunks);
    invalidateRagChunksCache();

    // Drizzle D1 batch() expects a single array argument — not spread statements.
    for (let i = 0; i < withEmbeddings.length; i += D1_INSERT_BATCH_SIZE) {
      const slice = withEmbeddings.slice(i, i + D1_INSERT_BATCH_SIZE);
      await db.batch(
        slice.map((chunk) =>
          db.insert(ragChunks).values({
            id: chunk.id,
            source: chunk.source,
            content: chunk.content,
            embedding: serializeEmbedding(chunk.embedding),
            updatedAt: now,
          }),
        ),
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/no such table|rag_chunks/i.test(msg)) {
      throw new Error(
        "RAG table not found. Run npm run db:migrate:local (dev) or npm run db:migrate:remote (production).",
      );
    }
    throw new Error(`Failed to store RAG chunks: ${msg}`);
  }
}

async function setRagStatus(status: RagIndexStatus): Promise<void> {
  await writeRagIndexStatus(status);
}

export type RagIndexOptions = {
  /** When true, always re-embed even if content fingerprint is unchanged. */
  force?: boolean;
};

export async function indexContent(
  content: AdminContent,
  cohereApiKey: string,
  options: RagIndexOptions = {},
): Promise<number> {
  const force = options.force ?? false;
  const startedAt = Date.now();

  const inFlight = await readRagIndexStatus();
  if (isIndexingInProgress(inFlight)) {
    console.log("[rag] Index already in progress — skipping duplicate run.");
    return inFlight.processedChunks ?? 0;
  }

  await setRagStatus({
    state: "indexing",
    chunkCount: 0,
    totalChunks: 0,
    processedChunks: 0,
    phase: "preparing",
    skipped: false,
    updatedAt: startedAt,
  });

  const rawChunks = chunkPortfolioContent(content);

  await setRagStatus({
    state: "indexing",
    chunkCount: 0,
    totalChunks: rawChunks.length,
    processedChunks: 0,
    phase: "preparing",
    skipped: false,
    updatedAt: Date.now(),
  });

  const fingerprint = await computeRagContentFingerprint(content);
  const storedFingerprint = await readRagContentFingerprint();

  if (!force && storedFingerprint === fingerprint && rawChunks.length > 0) {
    const existing = await getRagChunkCount();
    if (existing > 0) {
      console.log(`[rag] Skipping index — content unchanged (${existing} chunks).`);
      await setRagStatus({
        state: "ready",
        chunkCount: existing,
        totalChunks: rawChunks.length,
        processedChunks: rawChunks.length,
        skipped: true,
        updatedAt: Date.now(),
      });
      return existing;
    }
  }

  try {
    if (rawChunks.length === 0) {
      await writeRagContentFingerprint(fingerprint);
      await setRagStatus({ state: "ready", chunkCount: 0, updatedAt: Date.now() });
      return 0;
    }

    console.log(`[rag] Indexing ${rawChunks.length} chunks…`);
    const embedStart = Date.now();
    const withEmbeddings = await embedChunks(cohereApiKey, rawChunks, async (progress) => {
      await setRagStatus({
        state: "indexing",
        chunkCount: 0,
        totalChunks: progress.total,
        processedChunks: progress.processed,
        phase: progress.phase,
        skipped: false,
        updatedAt: Date.now(),
      });
    });
    console.log(
      `[rag] Embedded ${withEmbeddings.length} chunks in ${Date.now() - embedStart}ms`,
    );

    await setRagStatus({
      state: "indexing",
      chunkCount: 0,
      totalChunks: withEmbeddings.length,
      processedChunks: withEmbeddings.length,
      phase: "persisting",
      skipped: false,
      updatedAt: Date.now(),
    });

    const persistStart = Date.now();
    await persistChunks(withEmbeddings);
    console.log(
      `[rag] Persisted ${withEmbeddings.length} chunks in ${Date.now() - persistStart}ms`,
    );

    await writeRagContentFingerprint(fingerprint);
    await setRagStatus({
      state: "ready",
      chunkCount: withEmbeddings.length,
      totalChunks: withEmbeddings.length,
      processedChunks: withEmbeddings.length,
      skipped: false,
      updatedAt: Date.now(),
    });
    console.log(
      `[rag] Indexed ${withEmbeddings.length} chunks in ${Date.now() - startedAt}ms total.`,
    );
    return withEmbeddings.length;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown indexing error";
    console.error("[rag] Indexing failed:", error);
    await setRagStatus({
      state: "failed",
      chunkCount: 0,
      totalChunks: rawChunks.length,
      processedChunks: 0,
      skipped: false,
      updatedAt: Date.now(),
      error: message,
    });
    throw error;
  }
}

export async function markRagUnconfigured(): Promise<void> {
  await setRagStatus({
    state: "unconfigured",
    chunkCount: 0,
    updatedAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// 5. Retrieve Context — query-time pipeline
// ---------------------------------------------------------------------------

async function loadAllChunks(): Promise<RagChunkWithEmbedding[]> {
  if (
    chunksMemoryCache &&
    chunksMemoryCache.version === chunksCacheVersion &&
    Date.now() - chunksMemoryCache.loadedAt < CHUNKS_CACHE_TTL_MS
  ) {
    return chunksMemoryCache.chunks;
  }

  const db = getDb();
  const rows = await db.select().from(ragChunks).all();

  const chunks = rows.map((row) => ({
    id: row.id,
    source: row.source,
    content: row.content,
    embedding: deserializeEmbedding(row.embedding),
  }));

  chunksMemoryCache = {
    chunks,
    loadedAt: Date.now(),
    version: chunksCacheVersion,
  };

  return chunks;
}

function formatChunkForContext(chunk: RagChunkWithEmbedding): string {
  if (chunk.source === "knowledge_base") {
    return extractKbFactText(chunk.content);
  }
  return chunk.content;
}

function formatRetrievedContext(chunks: RagChunkWithEmbedding[]): string {
  const contextParts = chunks.map(
    (c, i) => `[${i + 1}] (${c.source}) ${formatChunkForContext(c)}`,
  );
  return `RETRIEVED CONTEXT (most relevant facts for this question):\n${contextParts.join("\n\n")}`;
}

export async function retrieveContext(
  query: string,
  cohereApiKey: string,
  focus: JarvisFocus,
  options: { topK?: number; hasKnowledgeBase?: boolean } = {},
): Promise<string | null> {
  const { topK = SEMANTIC_TOP_K, hasKnowledgeBase = false } = options;
  const startQueryTime = Date.now();

  const allChunks = await loadAllChunks();
  if (allChunks.length === 0) return null;

  const kbQuestion = hasKnowledgeBase && (isKnowledgeBaseQuestion(query) || focus === "education");

  // Structured portfolio questions — keyword + focus retrieval, skip Cohere embed (~300–800ms saved)
  if (!kbQuestion && focus !== "general") {
    const focusFast = retrieveFocusContextFast(query, allChunks, focus);
    if (focusFast) {
      console.log(`[rag] Focus fast-path (${focus}, skipped embed) in ${Date.now() - startQueryTime}ms`);
      return focusFast;
    }
  }

  if (kbQuestion) {
    const keywordHits = keywordSearchWithScores(query, allChunks, 8);
    const topHit = keywordHits[0];
    if (
      topHit &&
      topHit.score >= KEYWORD_FAST_PATH_MIN_SCORE &&
      topHit.chunk.source === "knowledge_base"
    ) {
      const topChunks = rankChunksByRelevance(
        keywordHits.map((h) => h.chunk),
        null,
        query,
        focus,
      ).slice(0, MAX_CONTEXT_CHUNKS);
      console.log(
        `[rag] Keyword fast-path (score=${topHit.score}, skipped embed) in ${Date.now() - startQueryTime}ms`,
      );
      return formatRetrievedContext(topChunks);
    }
  }

  const queryEmbedding = await embedQuery(cohereApiKey, query);
  console.log(`[rag] Query embed + chunk load took ${Date.now() - startQueryTime}ms`);

  const startSearch = Date.now();
  const topChunks = hybridSearch(
    queryEmbedding,
    allChunks,
    query,
    focus,
    hasKnowledgeBase,
    topK,
  );
  const kbHits = topChunks.filter((c) => c.source === "knowledge_base").length;
  console.log(
    `[rag] Hybrid search (focus=${focus}, kbHits=${kbHits}/${topChunks.length}) over ${allChunks.length} chunks took ${Date.now() - startSearch}ms`,
  );

  return formatRetrievedContext(topChunks);
}

export async function hasIndexedChunks(): Promise<boolean> {
  const status = await readRagIndexStatus();
  if (status.state === "ready" && status.chunkCount > 0) return true;
  if (status.state === "ready" && status.chunkCount === 0) return false;
  if (status.state === "indexing" && (status.totalChunks ?? 0) > 0) return true;

  const db = getDb();
  const row = await db.select({ id: ragChunks.id }).from(ragChunks).limit(1).get();
  return Boolean(row);
}
