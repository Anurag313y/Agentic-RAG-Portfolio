import {
  getSecretsMemory,
  readAdminSecretsKv,
  type StoredAdminSecrets,
} from "./cache.server";
import type { AdminContent } from "./content.types";
import { getCohereApiKey, getDeepgramApiKey, getGeminiApiKey } from "./config.server";

export function secretsFromContent(
  content: Pick<AdminContent, "deepgramApiKey" | "cohereApiKey" | "geminiApiKey">,
): StoredAdminSecrets {
  return {
    deepgramApiKey: content.deepgramApiKey?.trim() ?? "",
    cohereApiKey: content.cohereApiKey?.trim() ?? "",
    geminiApiKey: content.geminiApiKey?.trim() ?? "",
  };
}

export async function hydrateAdminSecrets(
  content?: Pick<AdminContent, "deepgramApiKey" | "cohereApiKey" | "geminiApiKey">,
): Promise<StoredAdminSecrets> {
  const fromMemory = getSecretsMemory();
  if (fromMemory) return fromMemory;

  const fromKv = await readAdminSecretsKv();
  if (fromKv) return fromKv;

  if (content) {
    return secretsFromContent(content);
  }

  return { deepgramApiKey: "", cohereApiKey: "", geminiApiKey: "" };
}

function pickSecret(
  stored: string | undefined,
  contentValue: string | undefined,
  envFallback: () => string | null,
): string | null {
  return stored?.trim() || contentValue?.trim() || envFallback() || null;
}

export async function resolveDeepgramApiKey(content: AdminContent): Promise<string | null> {
  const secrets = await hydrateAdminSecrets(content);
  return pickSecret(secrets.deepgramApiKey, content.deepgramApiKey, getDeepgramApiKey);
}

export async function resolveCohereApiKey(content: AdminContent): Promise<string | null> {
  const secrets = await hydrateAdminSecrets(content);
  return pickSecret(secrets.cohereApiKey, content.cohereApiKey, getCohereApiKey);
}

export async function resolveGeminiApiKey(content: AdminContent): Promise<string | null> {
  const secrets = await hydrateAdminSecrets(content);
  return pickSecret(secrets.geminiApiKey, content.geminiApiKey, getGeminiApiKey);
}

export async function isDeepgramConfiguredForContent(content: AdminContent): Promise<boolean> {
  return Boolean(await resolveDeepgramApiKey(content));
}

export async function resolveLlmKeys(content: AdminContent): Promise<{
  geminiApiKey: string | null;
  cohereApiKey: string | null;
}> {
  const [geminiApiKey, cohereApiKey] = await Promise.all([
    resolveGeminiApiKey(content),
    resolveCohereApiKey(content),
  ]);
  return { geminiApiKey, cohereApiKey };
}

