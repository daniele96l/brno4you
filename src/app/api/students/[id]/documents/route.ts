import { NextResponse } from "next/server";
import { canAccessStudent } from "@/lib/auth";
import { ensureStudentDocuments } from "@/lib/documents/ensure";
import { getStudent, listStudentDocuments } from "@/lib/students";
import {
  getProject,
  requiredStudentTemplateIds,
  signableStudentTemplateIds,
} from "@/lib/projects";
import { listDocTemplates } from "@/lib/documents/templates";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await canAccessStudent(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const student = await getStudent(id);
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const documents = await listStudentDocuments(id);
  const project = student.project_id
    ? await getProject(student.project_id)
    : null;
  const required = project
    ? requiredStudentTemplateIds(project, student)
    : [];
  const signableTemplateIds = project
    ? signableStudentTemplateIds(project, student)
    : [];
  const templates = await listDocTemplates();

  return NextResponse.json({
    documents,
    requiredTemplateIds: required,
    signableTemplateIds,
    templates: templates.map((t) => ({
      id: t.id,
      label: t.label,
      scope: t.scope,
    })),
    project,
    verified:
      student.id_verification_status === "matched" ||
      student.id_verification_status === "mismatch_dismissed",
  });
}

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!(await canAccessStudent(id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const student = await getStudent(id);
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const verified =
    student.id_verification_status === "matched" ||
    student.id_verification_status === "mismatch_dismissed";
  if (!verified) {
    return NextResponse.json(
      { error: "Complete ID verification before generating documents" },
      { status: 400 },
    );
  }

  try {
    const documents = await ensureStudentDocuments(student);
    const project = await getProject(student.project_id);
    return NextResponse.json({
      documents,
      requiredTemplateIds: project
        ? requiredStudentTemplateIds(project, student)
        : [],
      signableTemplateIds: project
        ? signableStudentTemplateIds(project, student)
        : [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ensure failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
