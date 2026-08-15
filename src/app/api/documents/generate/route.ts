import { NextResponse } from "next/server";
import { isAdminAuthenticated, randomId } from "@/lib/auth";
import {
  getStudent,
  listStudentDocuments,
  saveDocument,
  saveStudent,
} from "@/lib/students";
import { generateFromDbTemplate } from "@/lib/documents/registry";
import { ensureTemplatesSeeded } from "@/lib/documents/seed";
import { listDocTemplates } from "@/lib/documents/templates";
import { listPartners } from "@/lib/partners";
import { getProject } from "@/lib/projects";
import { saveUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureTemplatesSeeded();
  const templates = await listDocTemplates();
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    studentId?: string | null;
    templateId?: string;
    partnerId?: string | null;
    projectId?: string | null;
  };
  if (!body.templateId) {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }

  try {
    await ensureTemplatesSeeded();
    const student = body.studentId ? await getStudent(body.studentId) : null;
    if (body.studentId && !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const projectId =
      body.projectId || student?.project_id || null;
    const project = projectId ? await getProject(projectId) : null;

    const partners = await listPartners(projectId);
    const partner = body.partnerId
      ? partners.find((p) => p.id === body.partnerId) || null
      : partners[0] || null;

    const generatedAt = new Date().toISOString();
    const result = await generateFromDbTemplate(
      body.templateId,
      student,
      partner,
      project,
    );
    const docId = randomId();
    const storage_path = await saveUpload(
      `docs/${docId}.pdf`,
      result.buffer,
      result.mime,
    );

    const doc = {
      id: docId,
      student_id: student?.id ?? null,
      template_id: result.template.id,
      filename: result.filename,
      mime: result.mime,
      storage_path,
      created_at: generatedAt,
      status: "generated" as const,
      signed_at: null,
      signer_name: null,
      signature_path: null,
      signed_storage_path: null,
    };
    await saveDocument(doc);

    if (student) {
      student.updated_at = generatedAt;
      await saveStudent(student);
      const documents = await listStudentDocuments(student.id);
      return NextResponse.json({ document: doc, documents });
    }

    return NextResponse.json({ document: doc, documents: [doc] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
