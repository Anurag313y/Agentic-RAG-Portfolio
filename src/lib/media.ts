export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

/** Resize and compress images before storing in D1 — keeps uploads fast and reliable. */
export async function compressImageFile(
  file: File,
  { maxWidth = 1280, maxHeight = 1280, quality = 0.82 }: CompressImageOptions = {},
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas not supported");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const outputType =
    file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
  return canvas.toDataURL(outputType, quality);
}

export function resolveMediaUrl(url: string | undefined | null): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed || trimmed.startsWith("blob:")) return "";
  return trimmed;
}

export function formatDataUrlSize(dataUrl: string): string {
  const base64 = dataUrl.split(",")[1] ?? "";
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
