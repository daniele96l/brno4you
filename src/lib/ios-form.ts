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

/** Strip iOS autofill junk (ZW, NBSP, fullwidth @/.) before validate. */
export function normalizeEmail(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060]/g, "")
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

export function normalizePhone(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060]/g, "")
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .trim();
}

export const ID_IMAGE_ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif,image/*";

export const HEIC_CONVERT_ERROR =
  "Couldn't read this iPhone photo — try exporting as JPEG from Photos, or set Camera → Formats → Most Compatible, then re-upload.";

const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
  "heif",
]);

function looksLikeHeicNameOrType(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function looksLikeHeicBytes(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 12) return false;
  const u8 = new Uint8Array(buf);
  const ftyp = String.fromCharCode(u8[4], u8[5], u8[6], u8[7]);
  if (ftyp !== "ftyp") return false;
  const brand = String.fromCharCode(u8[8], u8[9], u8[10], u8[11]).toLowerCase();
  return HEIC_BRANDS.has(brand);
}

function isAlreadyWebFriendly(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (looksLikeHeicNameOrType(file)) return false;
  return (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    type === "image/webp"
  );
}

/** iOS often leaves type empty — give Safari a HEIC MIME so native decode can run. */
function withHeicMime(file: File, heic: boolean): File {
  if (!heic) return file;
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return file;
  const name = file.name.toLowerCase().match(/\.(heic|heif)$/)
    ? file.name
    : `${file.name.replace(/\.[^.]+$/, "") || "id-photo"}.heic`;
  return new File([file], name, { type: "image/heic" });
}

async function canvasToJpegFile(
  source: CanvasImageSource,
  width: number,
  height: number,
  baseName: string,
): Promise<File> {
  const canvas = document.createElement("canvas");
  const max = 2000;
  const scale = Math.min(1, max / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(HEIC_CONVERT_ERROR);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88),
  );
  if (!blob || blob.size < 32) throw new Error(HEIC_CONVERT_ERROR);
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

async function decodeWithCreateImageBitmap(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const base = file.name.replace(/\.[^.]+$/, "") || "id-photo";
      return await canvasToJpegFile(bitmap, bitmap.width, bitmap.height, base);
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

async function decodeWithHtmlImage(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) return null;
    const base = file.name.replace(/\.[^.]+$/, "") || "id-photo";
    return await canvasToJpegFile(img, img.naturalWidth, img.naturalHeight, base);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * libheif fallback for browsers without native HEIC decode.
 * May still fail on iref > 16 — callers map that to HEIC_CONVERT_ERROR.
 */
async function decodeWithHeic2Any(file: File): Promise<File | null> {
  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.88,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!(blob instanceof Blob) || blob.size < 32) return null;
    const base = file.name.replace(/\.[^.]+$/, "") || "id-photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

/**
 * iPhone Photos often give HEIC. Convert to JPEG in the browser before upload
 * (server sharp/libheif rejects many real iPhone HEICs). Never silently keep HEIC.
 * Order: native createImageBitmap → HTML Image → heic2any → friendly error.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  const head = await file.slice(0, 16).arrayBuffer();
  const heic = looksLikeHeicNameOrType(file) || looksLikeHeicBytes(head);

  if (isAlreadyWebFriendly(file) && !heic && file.size < 12_000_000) {
    return file;
  }

  const decodeFile = withHeicMime(file, heic);

  const viaBitmap = await decodeWithCreateImageBitmap(decodeFile);
  if (viaBitmap) return viaBitmap;

  const viaImg = await decodeWithHtmlImage(decodeFile);
  if (viaImg) return viaImg;

  if (heic) {
    const viaHeic2Any = await decodeWithHeic2Any(decodeFile);
    if (viaHeic2Any) return viaHeic2Any;
    throw new Error(HEIC_CONVERT_ERROR);
  }

  if (!isAlreadyWebFriendly(file)) {
    throw new Error(HEIC_CONVERT_ERROR);
  }

  // Large JPEG/PNG that failed re-encode — still upload original.
  return file;
}
