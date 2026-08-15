import { rpc } from "./supabase";
import type { GeneratedDocument, Student } from "./types";
import type { StudentFormInput } from "./student-schema";
import { randomId } from "./auth";

function mapStudent(raw: Record<string, unknown> | null): Student | null {
  if (!raw) return null;
  return {
    id: String(raw.id),
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
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

export async function saveStudent(student: Student) {
  await rpc("verno4u_upsert_student", { p_student: student });
}

export async function getStudent(id: string): Promise<Student | null> {
  const data = await rpc<Record<string, unknown> | null>("verno4u_get_student", {
    p_id: id,
  });
  return mapStudent(data);
}

export async function listStudents(): Promise<Student[]> {
  const data = await rpc<Record<string, unknown>[]>("verno4u_list_students", {});
  return (data || []).map((r) => mapStudent(r)!).filter(Boolean);
}

export function createStudentFromForm(data: StudentFormInput): Student {
  const now = new Date().toISOString();
  return {
    id: randomId(),
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
    created_at: now,
    updated_at: now,
  };
}

export function applyFormToStudent(
  student: Student,
  data: StudentFormInput,
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
    updated_at: new Date().toISOString(),
  };
}

export async function saveDocument(doc: GeneratedDocument) {
  await rpc("verno4u_save_document", { p_doc: doc });
}

export async function getDocument(
  id: string,
): Promise<GeneratedDocument | null> {
  return rpc<GeneratedDocument | null>("verno4u_get_document", { p_id: id });
}

export async function listStudentDocuments(studentId: string) {
  const docs = await rpc<GeneratedDocument[]>("verno4u_list_documents", {
    p_student_id: studentId,
  });
  return docs || [];
}
