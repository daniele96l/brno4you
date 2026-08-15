import { createHash } from "crypto";
import { rpc } from "./supabase";

export async function saveUpload(
  relativeKey: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  await rpc("brno4you_put_file_b64", {
    p_path: relativeKey,
    p_content_b64: data.toString("base64"),
    p_content_type: contentType,
  });
  return relativeKey;
}

export async function readUpload(storagePath: string): Promise<Buffer> {
  const file = await rpc<{
    path: string;
    content_type: string;
    content_base64: string;
  } | null>("brno4you_get_file", { p_path: storagePath });
  if (!file?.content_base64) throw new Error("File not found");
  return Buffer.from(file.content_base64, "base64");
}

export async function deleteUpload(_storagePath: string | null | undefined) {
  // optional; not required for v1
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
