import { NextResponse } from "next/server";
import {
  HEIC_UPLOAD_ERROR,
  normalizeIdImageBuffer,
} from "@/lib/normalize-id-image";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Convert any image (incl. iPhone HEIC with iref > 16) to JPEG for the client. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing image file" },
        { status: 400 },
      );
    }
    if (file.size > 25_000_000) {
      return NextResponse.json(
        { error: "Photo is too large — try a smaller one" },
        { status: 413 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length < 32) {
      return NextResponse.json({ error: HEIC_UPLOAD_ERROR }, { status: 400 });
    }

    const { buffer, contentType } = await normalizeIdImageBuffer(
      buf,
      file.type,
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : HEIC_UPLOAD_ERROR;
    return NextResponse.json(
      { error: msg || HEIC_UPLOAD_ERROR },
      { status: 400 },
    );
  }
}
