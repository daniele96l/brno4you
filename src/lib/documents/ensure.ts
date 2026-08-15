import { randomId } from "@/lib/auth";
import { generateFromDbTemplate } from "@/lib/documents/registry";
import { getProject, signableStudentTemplateIds } from "@/lib/projects";
import { listStudentDocuments, saveDocument } from "@/lib/students";
import type { GeneratedDocument, Student } from "@/lib/types";
import { saveUpload } from "@/lib/storage";

/** Generate all project student docs the participant can sign (required + optional). */
export async function ensureStudentDocuments(
  student: Student,
): Promise<GeneratedDocument[]> {
  const project = await getProject(student.project_id);
  if (!project) throw new Error("Project not found");

  const toPrepare = signableStudentTemplateIds(project, student);
  const existing = await listStudentDocuments(student.id);
  const byTemplate = new Map(existing.map((d) => [d.template_id, d]));

  for (const templateId of toPrepare) {
    const current = byTemplate.get(templateId);
    if (current) continue;

    const result = await generateFromDbTemplate(
      templateId,
      student,
      null,
      project,
    );
    const docId = randomId();
    const storage_path = await saveUpload(
      `docs/${docId}.pdf`,
      result.buffer,
      result.mime,
    );
    const doc: GeneratedDocument = {
      id: docId,
      student_id: student.id,
      template_id: templateId,
      filename: result.filename,
      mime: result.mime,
      storage_path,
      created_at: new Date().toISOString(),
      status: "generated",
      signed_at: null,
      signer_name: null,
      signature_path: null,
      signed_storage_path: null,
    };
    await saveDocument(doc);
    byTemplate.set(templateId, doc);
  }

  return listStudentDocuments(student.id);
}

export async function regenerateUnsignedDocument(
  student: Student,
  templateId: string,
): Promise<GeneratedDocument> {
  const project = await getProject(student.project_id);
  if (!project) throw new Error("Project not found");

  const existing = (await listStudentDocuments(student.id)).find(
    (d) => d.template_id === templateId,
  );
  if (existing?.status === "signed") {
    throw new Error("Document already signed");
  }

  const result = await generateFromDbTemplate(
    templateId,
    student,
    null,
    project,
  );
  const docId = existing?.id || randomId();
  const storage_path = await saveUpload(
    `docs/${docId}.pdf`,
    result.buffer,
    result.mime,
  );
  const doc: GeneratedDocument = {
    id: docId,
    student_id: student.id,
    template_id: templateId,
    filename: result.filename,
    mime: result.mime,
    storage_path,
    created_at: existing?.created_at || new Date().toISOString(),
    status: "generated",
    signed_at: null,
    signer_name: null,
    signature_path: null,
    signed_storage_path: null,
  };
  await saveDocument(doc);
  return doc;
}
