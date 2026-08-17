import { randomId } from "@/lib/auth";
import { generateFromDbTemplate } from "@/lib/documents/registry";
import { getProject, signableStudentTemplateIds } from "@/lib/projects";
import { listStudentDocuments, saveDocument } from "@/lib/students";
import type { GeneratedDocument, Student } from "@/lib/types";
import { saveUpload } from "@/lib/storage";

/** Generate only the documents the admin requested for this student.
 *  Regenerates unsigned PDFs so project settings (no./dates/venue) stay current.
 */
export async function ensureStudentDocuments(
  student: Student,
): Promise<GeneratedDocument[]> {
  const project = await getProject(student.project_id);
  if (!project) throw new Error("Project not found");

  const toPrepare = signableStudentTemplateIds(project, student);
  if (!toPrepare.length) {
    return listStudentDocuments(student.id);
  }
  const existing = await listStudentDocuments(student.id);
  const byTemplate = new Map(existing.map((d) => [d.template_id, d]));

  for (const templateId of toPrepare) {
    const current = byTemplate.get(templateId);
    if (current?.status === "signed") continue;

    const result = await generateFromDbTemplate(
      templateId,
      student,
      null,
      project,
    );
    const docId = current?.id || randomId();
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
      created_at: current?.created_at || new Date().toISOString(),
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

/** Refresh all unsigned student PDFs for a project after settings change. */
export async function regenerateUnsignedForProject(projectId: string) {
  const { listStudents } = await import("@/lib/students");
  const students = await listStudents(projectId);
  let count = 0;
  for (const student of students) {
    const docs = await listStudentDocuments(student.id);
    for (const doc of docs) {
      if (doc.status === "signed") continue;
      await regenerateUnsignedDocument(student, doc.template_id);
      count += 1;
    }
  }
  return count;
}
