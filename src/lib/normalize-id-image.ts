import sharp from "sharp";
import { heicBufferToJpeg } from "./heic-libheif";

/** Clear copy when HEIC/HEIF cannot be decoded. */
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

async function sharpToJpeg(buf: Buffer): Promise<Buffer> {
  return sharp(buf, { unlimited: true, failOn: "none", limitInputPixels: false })
    .rotate()
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/**
 * Normalize ID uploads to JPEG for storage + OpenAI.
 * sharp cannot decode iPhone HEVC HEIC on Vercel (AVIF-only) — use libheif-js
 * with disabled security limits for those files.
 */
export async function normalizeIdImageBuffer(
  buf: Buffer,
  declaredMime?: string,
): Promise<{ buffer: Buffer; contentType: "image/jpeg"; ext: "jpg" }> {
  const mime = (declaredMime || "").toLowerCase();
  const heicHint =
    isHeicBuffer(buf) || mime === "image/heic" || mime === "image/heif";

  if (heicHint) {
    try {
      const jpeg = await heicBufferToJpeg(buf);
      return { buffer: jpeg, contentType: "image/jpeg", ext: "jpg" };
    } catch (e) {
      // Fall through to sharp (covers AVIF / odd brands) then friendly error
      try {
        const jpeg = await sharpToJpeg(buf);
        return { buffer: jpeg, contentType: "image/jpeg", ext: "jpg" };
      } catch {
        const msg = e instanceof Error ? e.message : "";
        throw new Error(
          isHeicDecodeError(msg) || heicHint
            ? HEIC_UPLOAD_ERROR
            : "Couldn't read that image. Please upload a JPEG or PNG photo of your ID.",
        );
      }
    }
  }

  try {
    const jpeg = await sharpToJpeg(buf);
    return { buffer: jpeg, contentType: "image/jpeg", ext: "jpg" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    // Maybe mislabeled HEIC
    if (isHeicDecodeError(msg) || isHeicBuffer(buf)) {
      try {
        const jpeg = await heicBufferToJpeg(buf);
        return { buffer: jpeg, contentType: "image/jpeg", ext: "jpg" };
      } catch {
        throw new Error(HEIC_UPLOAD_ERROR);
      }
    }
    throw new Error(
      "Couldn't read that image. Please upload a JPEG or PNG photo of your ID.",
    );
  }
}
