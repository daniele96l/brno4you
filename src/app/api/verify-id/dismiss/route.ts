import { NextResponse } from "next/server";
import { canAccessStudent } from "@/lib/auth";
import { getStudent, saveStudent } from "@/lib/students";
import { ensureStudentDocuments } from "@/lib/documents/ensure";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { studentId?: string };
  if (!body.studentId) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }
  if (!(await canAccessStudent(body.studentId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const student = await getStudent(body.studentId);
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  student.id_verification_status = "mismatch_dismissed";
  student.updated_at = new Date().toISOString();
  await saveStudent(student);

  if (student.participation_status === "approved") {
    try {
      await ensureStudentDocuments(student);
    } catch {
      // Non-fatal
    }
  }

  const refreshed = await getStudent(body.studentId);
  return NextResponse.json({ student: refreshed || student });
}
