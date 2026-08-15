import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDocument } from "@/lib/students";
import { readUpload } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const doc = await getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    doc.storage_path.startsWith("http://") ||
    doc.storage_path.startsWith("https://")
  ) {
    return NextResponse.redirect(doc.storage_path);
  }

  const buf = await readUpload(doc.storage_path);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `attachment; filename="${doc.filename}"`,
    },
  });
}
