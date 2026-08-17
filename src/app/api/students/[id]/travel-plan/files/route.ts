import { NextResponse } from "next/server";
import { canAccessStudent, isAdminAuthenticated } from "@/lib/auth";
import { getStudent } from "@/lib/students";
import { readUpload } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "";
  if (!path.startsWith(`travel/${id}/`)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const allowed =
    (await isAdminAuthenticated()) || (await canAccessStudent(id));
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const student = await getStudent(id);
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const meta = student.travel_plan_files?.find((f) => f.path === path);
  if (!meta) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  const buf = await readUpload(path);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": meta.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${meta.filename.replace(/"/g, "")}"`,
    },
  });
}
