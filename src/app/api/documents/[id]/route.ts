import { NextResponse } from "next/server";
import { canAccessStudent, isAdminAuthenticated } from "@/lib/auth";
import { stampNotSignedBanner } from "@/lib/documents/pdf";
import { getDocument } from "@/lib/students";
import { readUpload } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const doc = await getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = await isAdminAuthenticated();
  const isOwner =
    doc.student_id != null && (await canAccessStudent(doc.student_id));
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSigned = doc.status === "signed" && !!doc.signed_storage_path;
  const path = isSigned ? doc.signed_storage_path! : doc.storage_path;
  let buf = await readUpload(path);
  if (!isSigned) {
    try {
      buf = await stampNotSignedBanner(buf);
    } catch {
      // serve original if banner fails
    }
  }
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `inline; filename="${doc.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
