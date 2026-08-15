import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { listStudentDocuments } from "@/lib/students";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const documents = await listStudentDocuments(id);
  return NextResponse.json({ documents });
}
