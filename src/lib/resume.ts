export const DEFAULT_RESUME_PATH = "/resume.pdf";

export { readFileAsDataUrl } from "./media";

/** True when the resume was uploaded via admin (not the bundled default path). */
export function isCustomResumeUrl(resumeUrl: string | undefined | null): boolean {
  const trimmed = (resumeUrl ?? "").trim();
  if (!trimmed || trimmed === DEFAULT_RESUME_PATH) return false;
  return (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    !trimmed.startsWith("/")
  );
}

/** Normalize stored resume URLs for preview/download. */
export function resolveResumeUrl(resumeUrl: string | undefined | null): string {
  const trimmed = (resumeUrl ?? "").trim();
  if (!trimmed) return DEFAULT_RESUME_PATH;
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function resumeDownloadName(profileName: string): string {
  const base = profileName.trim().replace(/\s+/g, "_") || "Resume";
  return `${base}_Resume.pdf`;
}

async function resumeBlob(resumeUrl: string): Promise<Blob> {
  const url = resolveResumeUrl(resumeUrl);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Resume not found (${response.status})`);
  }
  return response.blob();
}

function triggerDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function openResumeInNewTab(resumeUrl: string): Promise<void> {
  const url = resolveResumeUrl(resumeUrl);

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    const blob = await resumeBlob(resumeUrl);
    const objectUrl = URL.createObjectURL(blob);
    const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
    if (!opened) throw new Error("Popup blocked");
    return;
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) throw new Error("Popup blocked");
}

export async function downloadResumeFile(
  resumeUrl: string,
  filename: string,
): Promise<void> {
  const blob = await resumeBlob(resumeUrl);
  triggerDownload(blob, filename);
}
