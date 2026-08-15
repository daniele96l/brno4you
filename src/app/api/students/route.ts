import { NextResponse } from "next/server";
import { studentFormSchema } from "@/lib/student-schema";
import {
  createStudentFromForm,
  saveStudent,
} from "@/lib/students";
import {
  createStudentSession,
  isAdminAuthenticated,
} from "@/lib/auth";
import { extensionForMime, fileHash, saveUpload } from "@/lib/storage";

export const runtime = "nodejs";

async function parseMultipart(req: Request) {
  const form = await req.formData();
  const jsonRaw = form.get("data");
  if (typeof jsonRaw !== "string") {
    throw new Error("Missing data");
  }
  const parsed = studentFormSchema.safeParse(JSON.parse(jsonRaw));
  if (!parsed.success) {
    return { error: parsed.error.flatten(), data: null, form };
  }
  return { error: null, data: parsed.data, form };
}

async function handleFiles(
  studentId: string,
  form: FormData,
  requireFront: boolean,
) {
  const front = form.get("id_front");
  const back = form.get("id_back");

  let id_front_path: string | null = null;
  let id_back_path: string | null = null;
  let id_front_hash: string | null = null;
  let id_back_hash: string | null = null;

  if (front instanceof File && front.size > 0) {
    const buf = Buffer.from(await front.arrayBuffer());
    const ext = extensionForMime(front.type || "image/jpeg");
    id_front_path = await saveUpload(
      `ids/${studentId}/front.${ext}`,
      buf,
      front.type || "image/jpeg",
    );
    id_front_hash = fileHash(buf);
  } else if (requireFront) {
    throw new Error("ID front image is required");
  }

  if (back instanceof File && back.size > 0) {
    const buf = Buffer.from(await back.arrayBuffer());
    const ext = extensionForMime(back.type || "image/jpeg");
    id_back_path = await saveUpload(
      `ids/${studentId}/back.${ext}`,
      buf,
      back.type || "image/jpeg",
    );
    id_back_hash = fileHash(buf);
  }

  return { id_front_path, id_back_path, id_front_hash, id_back_hash };
}

export async function POST(req: Request) {
  try {
    const { error, data, form } = await parseMultipart(req);
    if (error || !data) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const projectId =
      typeof form.get("project_id") === "string"
        ? String(form.get("project_id"))
        : (data as { project_id?: string }).project_id;
    // project_id may be embedded in JSON payload
    const payload = JSON.parse(String(form.get("data"))) as {
      project_id?: string;
    };
    const resolvedProjectId = payload.project_id || projectId;
    if (!resolvedProjectId) {
      return NextResponse.json(
        { error: "project_id required — use a project invite link" },
        { status: 400 },
      );
    }

    const student = createStudentFromForm(data, resolvedProjectId);
    const files = await handleFiles(student.id, form, true);

    if (data.document_type === "id_card" && !files.id_back_path) {
      return NextResponse.json(
        { error: { formErrors: ["ID card back image is required"] } },
        { status: 400 },
      );
    }

    Object.assign(student, files);
    await saveStudent(student);
    await createStudentSession(student.id);

    return NextResponse.json({ student });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create student";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { listStudents } = await import("@/lib/students");
  const students = await listStudents();
  return NextResponse.json({ students });
}
