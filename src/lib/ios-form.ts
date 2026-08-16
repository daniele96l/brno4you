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

/** Broad accept — empty MIME from iOS is fine; exotic types go to convert. */
export const ID_IMAGE_ACCEPT =
  "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.tif,.tiff,.bmp,.gif,.avif";

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

function baseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "") || "id-photo";
}

/** Copy bytes into a fresh File with a decode-friendly MIME (iOS often leaves type empty). */
async function reblobAsHeic(file: File): Promise<File> {
  const bytes = await file.arrayBuffer();
  const name = file.name.toLowerCase().match(/\.(heic|heif)$/)
    ? file.name
    : `${baseName(file)}.heic`;
  return new File([bytes], name, {
    type: "image/heic",
    lastModified: file.lastModified,
  });
}

async function canvasToJpegFile(
  source: CanvasImageSource,
  width: number,
  height: number,
  nameBase: string,
): Promise<File> {
  const canvas = document.createElement("canvas");
  const max = 2000;
  const scale = Math.min(1, max / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(HEIC_CONVERT_ERROR);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  let blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88),
  );

  // Older WebKit sometimes returns null from toBlob — fall back to data URL.
  if (!blob || blob.size < 32) {
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      const res = await fetch(dataUrl);
      blob = await res.blob();
    } catch {
      blob = null;
    }
  }

  if (!blob || blob.size < 32) throw new Error(HEIC_CONVERT_ERROR);
  return new File([blob], `${nameBase}.jpg`, { type: "image/jpeg" });
}

async function decodeWithCreateImageBitmap(file: File): Promise<File | null> {
  try {
    const attempts: Promise<ImageBitmap>[] = [
      createImageBitmap(file),
      createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions),
    ];
    let bitmap: ImageBitmap | null = null;
    for (const attempt of attempts) {
      try {
        bitmap = await attempt;
        break;
      } catch {
        /* try next */
      }
    }
    if (!bitmap) return null;
    try {
      return await canvasToJpegFile(
        bitmap,
        bitmap.width,
        bitmap.height,
        baseName(file),
      );
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
    img.src = url;
    try {
      if (typeof img.decode === "function") {
        await img.decode();
      } else {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("decode failed"));
        });
      }
    } catch {
      return null;
    }
    if (!img.naturalWidth || !img.naturalHeight) return null;
    return await canvasToJpegFile(
      img,
      img.naturalWidth,
      img.naturalHeight,
      baseName(file),
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Newer libheif (via heic-to) — better iOS 18 support than heic2any. */
async function decodeWithHeicTo(file: File): Promise<File | null> {
  try {
    const { heicTo } = await import("heic-to");
    const blob = await heicTo({
      blob: file,
      type: "image/jpeg",
      quality: 0.88,
    });
    if (!(blob instanceof Blob) || blob.size < 32) return null;
    return new File([blob], `${baseName(file)}.jpg`, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

/**
 * Server path: libheif-js with security limits disabled (handles iref > 16 + HEVC).
 * Used when browser native decode and heic-to both fail (e.g. desktop Chrome).
 */
async function decodeViaServerApi(file: File): Promise<File | null> {
  try {
    const form = new FormData();
    form.set("file", file, file.name || "photo.heic");
    const res = await fetch("/api/convert-image", {
      method: "POST",
      body: form,
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size < 32) return null;
    const type = (blob.type || "").toLowerCase();
    if (type && type !== "image/jpeg" && !type.includes("octet")) {
      // Unexpected type — still try if it looks like jpeg bytes
    }
    return new File([blob], `${baseName(file)}.jpg`, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

/**
 * Convert any picked ID photo to JPEG before upload.
 * Order: native bitmap → HTML Image → heic-to → server libheif → friendly error.
 * Never silently keep HEIC for storage/OCR.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  const head = await file.slice(0, 16).arrayBuffer();
  const heic = looksLikeHeicNameOrType(file) || looksLikeHeicBytes(head);

  if (isAlreadyWebFriendly(file) && !heic && file.size < 12_000_000) {
    return file;
  }

  const decodeFile = heic ? await reblobAsHeic(file) : file;

  const viaBitmap = await decodeWithCreateImageBitmap(decodeFile);
  if (viaBitmap) return viaBitmap;

  const viaImg = await decodeWithHtmlImage(decodeFile);
  if (viaImg) return viaImg;

  if (heic) {
    const viaHeicTo = await decodeWithHeicTo(decodeFile);
    if (viaHeicTo) return viaHeicTo;

    const viaServer = await decodeViaServerApi(decodeFile);
    if (viaServer) return viaServer;

    throw new Error(HEIC_CONVERT_ERROR);
  }

  // Non-HEIC exotic type — try server normalize, else keep original if tiny decode failed
  const viaServer = await decodeViaServerApi(file);
  if (viaServer) return viaServer;

  if (!isAlreadyWebFriendly(file)) {
    throw new Error(HEIC_CONVERT_ERROR);
  }

  return file;
}
