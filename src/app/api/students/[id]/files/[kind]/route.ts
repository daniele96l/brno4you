import { NextResponse } from "next/server";
import { canAccessStudent } from "@/lib/auth";
import { getStudent } from "@/lib/students";
import { readUpload } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; kind: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id, kind } = await ctx.params;
  if (!(await canAccessStudent(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const student = await getStudent(id);
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const path =
    kind === "front"
      ? student.id_front_path
      : kind === "back"
        ? student.id_back_path
        : kind === "guardian_front"
          ? student.guardian_id_front_path
          : kind === "guardian_back"
            ? student.guardian_id_back_path
            : null;

  if (!path) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buf = await readUpload(path);
  const ext = path.split(".").pop()?.toLowerCase();
  const type =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : "image/jpeg";

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=60",
    },
  });
}
