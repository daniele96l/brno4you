import sharp from "sharp";

/** Clear copy when HEIC/HEIF cannot be decoded (sharp prebuilds lack HEVC). */
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

/**
 * Normalize ID uploads to JPEG for storage + OpenAI.
 * Sharp prebuilds cannot decode Apple HEIC (HEVC); those must be converted client-side.
 */
export async function normalizeIdImageBuffer(
  buf: Buffer,
  declaredMime?: string,
): Promise<{ buffer: Buffer; contentType: "image/jpeg"; ext: "jpg" }> {
  const mime = (declaredMime || "").toLowerCase();
  const heicHint =
    isHeicBuffer(buf) || mime === "image/heic" || mime === "image/heif";

  try {
    const jpeg = await sharp(buf)
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
  } catch {
    throw new Error(
      heicHint
        ? HEIC_UPLOAD_ERROR
        : "Couldn't read that image. Please upload a JPEG or PNG photo of your ID.",
    );
  }
}
