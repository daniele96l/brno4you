import { NextResponse } from "next/server";
import { canAccessStudent } from "@/lib/auth";
import { participantReadyForDocuments } from "@/lib/participant-id";
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
    verified: participantReadyForDocuments(student),
    participation_status: student.participation_status,
    requested_template_ids: student.requested_template_ids || [],
    docs_requested_at: student.docs_requested_at,
    travel_plan_status: student.travel_plan_status,
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

  if (student.participation_status !== "approved") {
    return NextResponse.json(
      { error: "Documents are available after your application is approved" },
      { status: 400 },
    );
  }
  if (!student.requested_template_ids?.length) {
    return NextResponse.json(
      {
        error:
          "The organisers have not requested any documents for you to sign yet.",
      },
      { status: 400 },
    );
  }

  if (!participantReadyForDocuments(student)) {
    if (
      student.participation_status === "approved" &&
      (student.id_verification_status === "matched" ||
        student.id_verification_status === "mismatch_dismissed")
    ) {
      return NextResponse.json(
        {
          error:
            "Upload the parent or legal guardian ID before documents can be prepared.",
        },
        { status: 400 },
      );
    }
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
