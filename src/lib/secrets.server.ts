import {
  getSecretsMemory,
  readAdminSecretsKv,
  type StoredAdminSecrets,
} from "./cache.server";
import type { AdminContent } from "./content.types";
import { getCohereApiKey, getDeepgramApiKey } from "./config.server";

export function secretsFromContent(
  content: Pick<AdminContent, "deepgramApiKey" | "cohereApiKey">,
): StoredAdminSecrets {
  return {
    deepgramApiKey: content.deepgramApiKey?.trim() ?? "",
    cohereApiKey: content.cohereApiKey?.trim() ?? "",
  };
}

export async function hydrateAdminSecrets(
  content?: Pick<AdminContent, "deepgramApiKey" | "cohereApiKey">,
): Promise<StoredAdminSecrets> {
  const fromMemory = getSecretsMemory();
  if (fromMemory) return fromMemory;

  const fromKv = await readAdminSecretsKv();
  if (fromKv) return fromKv;

  if (content) {
    return secretsFromContent(content);
  }

  return { deepgramApiKey: "", cohereApiKey: "" };
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

export async function isDeepgramConfiguredForContent(content: AdminContent): Promise<boolean> {
  return Boolean(await resolveDeepgramApiKey(content));
}
