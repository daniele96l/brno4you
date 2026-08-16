import { rpc } from "./supabase";
import type { GeneratedDocument, Student } from "./types";
import type { StudentFormInput } from "./student-schema";
import { randomId } from "./auth";
import { normalizeFormConfig } from "./form-config";

function mapStudent(raw: Record<string, unknown> | null): Student | null {
  if (!raw) return null;
  return {
    id: String(raw.id),
    project_id: String(raw.project_id || ""),
    needs_travel_declaration: Boolean(raw.needs_travel_declaration),
    first_name: String(raw.first_name),
    has_second_name: Boolean(raw.has_second_name),
    second_name: (raw.second_name as string) ?? null,
    surname: String(raw.surname),
    has_second_surname: Boolean(raw.has_second_surname),
    second_surname: (raw.second_surname as string) ?? null,
    birth_date: String(raw.birth_date).slice(0, 10),
    nationality: String(raw.nationality),
    email: String(raw.email),
    phone: String(raw.phone),
    document_type: raw.document_type as Student["document_type"],
    document_number: String(raw.document_number),
    document_country: String(raw.document_country),
    id_front_path: (raw.id_front_path as string) ?? null,
    id_back_path: (raw.id_back_path as string) ?? null,
    id_front_hash: (raw.id_front_hash as string) ?? null,
    id_back_hash: (raw.id_back_hash as string) ?? null,
    id_verification_status:
      raw.id_verification_status as Student["id_verification_status"],
    id_extracted: (raw.id_extracted as Student["id_extracted"]) ?? null,
    id_mismatches: (raw.id_mismatches as Student["id_mismatches"]) ?? null,
    id_verified_at: (raw.id_verified_at as string) ?? null,
    participation_status:
      (raw.participation_status as Student["participation_status"]) ||
      "registered",
    access_token: (raw.access_token as string) ?? null,
    approved_at: (raw.approved_at as string) ?? null,
    rejected_at: (raw.rejected_at as string) ?? null,
    custom_answers:
      (raw.custom_answers as Record<string, string | boolean>) || {},
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

export async function saveStudent(student: Student) {
  await rpc("brno4you_upsert_student", { p_student: student });
}

export async function getStudent(id: string): Promise<Student | null> {
  const data = await rpc<Record<string, unknown> | null>("brno4you_get_student", {
    p_id: id,
  });
  return mapStudent(data);
}

export async function getStudentByAccessToken(
  token: string,
): Promise<Student | null> {
  const data = await rpc<Record<string, unknown> | null>(
    "brno4you_get_student_by_access_token",
    { p_token: token },
  );
  return mapStudent(data);
}

export async function getStudentByEmailAndDocument(
  email: string,
  documentNumber: string,
): Promise<Student | null> {
  const data = await rpc<Record<string, unknown> | null>(
    "brno4you_get_student_by_email_doc",
    { p_email: email, p_document_number: documentNumber },
  );
  return mapStudent(data);
}

export async function listStudents(projectId?: string | null): Promise<Student[]> {
  const data = await rpc<Record<string, unknown>[]>("brno4you_list_students", {
    p_project_id: projectId ?? null,
  });
  return (data || []).map((r) => mapStudent(r)!).filter(Boolean);
}

export function createStudentFromForm(
  data: StudentFormInput,
  projectId: string,
  customAnswers: Record<string, string | boolean> = {},
): Student {
  const now = new Date().toISOString();
  return {
    id: randomId(),
    project_id: projectId,
    needs_travel_declaration: false,
    first_name: data.first_name,
    has_second_name: data.has_second_name,
    second_name: data.has_second_name ? data.second_name || null : null,
    surname: data.surname,
    has_second_surname: data.has_second_surname,
    second_surname: data.has_second_surname ? data.second_surname || null : null,
    birth_date: data.birth_date,
    nationality: data.nationality,
    email: data.email,
    phone: data.phone,
    document_type: data.document_type,
    document_number: data.document_number,
    document_country: data.document_country,
    id_front_path: null,
    id_back_path: null,
    id_front_hash: null,
    id_back_hash: null,
    id_verification_status: "pending",
    id_extracted: null,
    id_mismatches: null,
    id_verified_at: null,
    participation_status: "registered",
    access_token: null,
    approved_at: null,
    rejected_at: null,
    custom_answers: customAnswers,
    created_at: now,
    updated_at: now,
  };
}

export function applyFormToStudent(
  student: Student,
  data: StudentFormInput,
  customAnswers?: Record<string, string | boolean>,
): Student {
  return {
    ...student,
    first_name: data.first_name,
    has_second_name: data.has_second_name,
    second_name: data.has_second_name ? data.second_name || null : null,
    surname: data.surname,
    has_second_surname: data.has_second_surname,
    second_surname: data.has_second_surname ? data.second_surname || null : null,
    birth_date: data.birth_date,
    nationality: data.nationality,
    email: data.email,
    phone: data.phone,
    document_type: data.document_type,
    document_number: data.document_number,
    document_country: data.document_country,
    custom_answers: customAnswers ?? student.custom_answers,
    updated_at: new Date().toISOString(),
  };
}

export async function saveDocument(doc: GeneratedDocument) {
  await rpc("brno4you_save_document", { p_doc: doc });
}

export async function getDocument(
  id: string,
): Promise<GeneratedDocument | null> {
  return rpc<GeneratedDocument | null>("brno4you_get_document", { p_id: id });
}

export async function listStudentDocuments(studentId: string) {
  const docs = await rpc<GeneratedDocument[]>("brno4you_list_documents", {
    p_student_id: studentId,
  });
  return docs || [];
}

export async function listAllDocuments() {
  const docs = await rpc<GeneratedDocument[]>("brno4you_list_all_documents", {});
  return docs || [];
}

/** Re-export for callers that normalize project JSON. */
export { normalizeFormConfig };
