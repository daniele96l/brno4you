import { put, del } from "@vercel/blob";
import { createHash } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveUpload(
  relativeKey: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  if (useBlob()) {
    const blob = await put(relativeKey, data, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  const full = path.join(UPLOAD_ROOT, relativeKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return relativeKey;
}

export async function readUpload(storagePath: string): Promise<Buffer> {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    const res = await fetch(storagePath);
    if (!res.ok) throw new Error("Failed to fetch blob");
    return Buffer.from(await res.arrayBuffer());
  }
  const full = path.join(UPLOAD_ROOT, storagePath);
  return readFile(full);
}

export async function deleteUpload(storagePath: string | null | undefined) {
  if (!storagePath) return;
  try {
    if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
      await del(storagePath, { token: process.env.BLOB_READ_WRITE_TOKEN });
      return;
    }
    await unlink(path.join(UPLOAD_ROOT, storagePath));
  } catch {
    // ignore missing files
  }
}

export function fileHash(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

export function extensionForMime(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("pdf")) return "pdf";
  return "jpg";
}
