import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getStudent, listStudentDocuments, saveDocument, saveStudent } from "@/lib/students";
import { getTemplate, listTemplates } from "@/lib/documents/registry";
import { saveUpload } from "@/lib/storage";
import { randomId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ templates: listTemplates() });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    studentId?: string;
    templateId?: string;
  };
  if (!body.studentId || !body.templateId) {
    return NextResponse.json(
      { error: "studentId and templateId required" },
      { status: 400 },
    );
  }

  const student = await getStudent(body.studentId);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const template = getTemplate(body.templateId);
  if (!template) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  const generatedAt = new Date().toISOString();
  const result = await template.generate(student, { generatedAt });
  const docId = randomId();
  const storage_path = await saveUpload(
    `docs/${docId}.pdf`,
    result.buffer,
    result.mime,
  );

  const doc = {
    id: docId,
    student_id: student.id,
    template_id: template.id,
    filename: result.filename,
    mime: result.mime,
    storage_path,
    created_at: generatedAt,
  };
  await saveDocument(doc);
  student.updated_at = generatedAt;
  await saveStudent(student);

  const docs = await listStudentDocuments(student.id);
  return NextResponse.json({ document: doc, documents: docs });
}
