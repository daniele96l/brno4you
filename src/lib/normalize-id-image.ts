import sharp from "sharp";

/** Clear copy when HEIC/HEIF cannot be decoded (sharp/libheif limits or missing HEVC). */
export const HEIC_UPLOAD_ERROR =
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

export function isHeicBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf.toString("ascii", 4, 8) !== "ftyp") return false;
  return HEIC_BRANDS.has(buf.toString("ascii", 8, 12).toLowerCase());
}

export function isHeicDecodeError(message: string): boolean {
  return /heic|heif|iref|security limit|corrupt header|libheif/i.test(message);
}

/**
 * Normalize ID uploads to JPEG for storage + OpenAI.
 * Prefer client-side conversion; server uses unlimited libheif limits when available.
 */
export async function normalizeIdImageBuffer(
  buf: Buffer,
  declaredMime?: string,
): Promise<{ buffer: Buffer; contentType: "image/jpeg"; ext: "jpg" }> {
  const mime = (declaredMime || "").toLowerCase();
  const heicHint =
    isHeicBuffer(buf) || mime === "image/heic" || mime === "image/heif";

  try {
    const jpeg = await sharp(buf, { unlimited: true, failOn: "none" })
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 88 })
      .toBuffer();
    return { buffer: jpeg, contentType: "image/jpeg", ext: "jpg" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    throw new Error(
      heicHint || isHeicDecodeError(msg)
        ? HEIC_UPLOAD_ERROR
        : "Couldn't read that image. Please upload a JPEG or PNG photo of your ID.",
    );
  }
}
