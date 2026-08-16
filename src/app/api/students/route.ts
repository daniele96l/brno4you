import { NextResponse } from "next/server";
import { getProject } from "@/lib/projects";
import {
  buildRegistrationSchema,
  normalizeFormConfig,
  toStudentFormInput,
} from "@/lib/form-config";
import { createStudentFromForm, saveStudent } from "@/lib/students";
import { createStudentSession, isAdminAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const jsonRaw = form.get("data");
    if (typeof jsonRaw !== "string") {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }
    const payload = JSON.parse(jsonRaw) as Record<string, unknown>;
    const resolvedProjectId =
      (typeof form.get("project_id") === "string"
        ? String(form.get("project_id"))
        : null) ||
      (typeof payload.project_id === "string" ? payload.project_id : null);
    if (!resolvedProjectId) {
      return NextResponse.json(
        { error: "project_id required — use a project invite link" },
        { status: 400 },
      );
    }

    const project = await getProject(resolvedProjectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const formConfig = normalizeFormConfig(project.form_config);
    const parsed = buildRegistrationSchema(formConfig).safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const studentData = toStudentFormInput(parsed.data, formConfig);
    const customAnswers =
      (parsed.data.custom_answers as Record<string, string | boolean>) || {};
    const student = createStudentFromForm(
      studentData,
      resolvedProjectId,
      customAnswers,
    );
    // Registration only — no ID photos yet
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
