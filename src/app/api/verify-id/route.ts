import { NextResponse } from "next/server";
import { canAccessStudent } from "@/lib/auth";
import { getStudent, saveStudent } from "@/lib/students";
import { readUpload } from "@/lib/storage";
import { compareStudentToExtracted, extractIdData } from "@/lib/verify-id";
import { ensureStudentDocuments } from "@/lib/documents/ensure";

export const runtime = "nodejs";

async function ensureDocsSafe(studentId: string) {
  try {
    const student = await getStudent(studentId);
    if (!student) return;
    if (
      student.id_verification_status !== "matched" &&
      student.id_verification_status !== "mismatch_dismissed"
    ) {
      return;
    }
    await ensureStudentDocuments(student);
  } catch {
    // Non-fatal: participant UI can retry via POST /documents
  }
}

export async function POST(req: Request) {
  let studentId: string | undefined;
  try {
    const body = (await req.json()) as { studentId?: string; force?: boolean };
    studentId = body.studentId;
    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }
    if (!(await canAccessStudent(studentId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await getStudent(studentId);
    if (!student) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!student.id_front_path) {
      return NextResponse.json({ error: "Missing ID front" }, { status: 400 });
    }

    // Skip OpenAI if already verified for same images
    if (
      !body.force &&
      student.id_verified_at &&
      student.id_extracted &&
      (student.id_verification_status === "matched" ||
        student.id_verification_status === "mismatch_dismissed")
    ) {
      await ensureDocsSafe(studentId);
      const refreshed = await getStudent(studentId);
      return NextResponse.json({
        status: student.id_verification_status,
        mismatches: student.id_mismatches || [],
        extracted: student.id_extracted,
        skipped: true,
        student: refreshed || student,
      });
    }

    const front = await readUpload(student.id_front_path);
    const back = student.id_back_path
      ? await readUpload(student.id_back_path)
      : null;

    const extracted = await extractIdData(front, back);
    const mismatches = compareStudentToExtracted(student, extracted);

    student.id_extracted = extracted;
    student.id_mismatches = mismatches;
    student.id_verification_status =
      mismatches.length === 0 ? "matched" : "pending";
    student.id_verified_at = new Date().toISOString();
    student.updated_at = student.id_verified_at;
    await saveStudent(student);

    if (mismatches.length === 0) {
      await ensureDocsSafe(studentId);
    }

    const refreshed = await getStudent(studentId);
    return NextResponse.json({
      status: mismatches.length === 0 ? "matched" : "mismatch",
      mismatches,
      extracted,
      skipped: false,
      student: refreshed || student,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed";
    if (studentId) {
      const student = await getStudent(studentId);
      if (student) {
        student.id_verification_status = "failed";
        student.updated_at = new Date().toISOString();
        await saveStudent(student);
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
