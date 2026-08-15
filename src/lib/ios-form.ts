/** iPhone Safari autofill fills the DOM but often skips React onChange. */
export function readInputValue(name: string): string {
  if (typeof document === "undefined") return "";
  const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(
    `input[name="${name}"], select[name="${name}"]`,
  );
  return el?.value?.trim() ?? "";
}

export function readSelectById(id: string): string {
  if (typeof document === "undefined") return "";
  const el = document.getElementById(id) as HTMLSelectElement | null;
  return el?.value?.trim() ?? "";
}

/** Strip iOS autofill junk; keep a usable email/phone. */
export function normalizeEmail(raw: string): string {
  return raw.replace(/[\u200B-\u200D\uFEFF]/g, "").trim().toLowerCase();
}

export function normalizePhone(raw: string): string {
  return raw.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

/**
 * iPhone Photos often give HEIC. Convert to JPEG in the browser when needed
 * so upload + OpenAI/sharp always get a normal image.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  const alreadyOk =
    (type === "image/jpeg" ||
      type === "image/jpg" ||
      type === "image/png" ||
      type === "image/webp") &&
    !name.endsWith(".heic") &&
    !name.endsWith(".heif");
  if (alreadyOk && file.size < 12_000_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const max = 2000;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88),
    );
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "id-photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
