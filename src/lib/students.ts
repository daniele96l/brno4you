import { getRedis, keys } from "./redis";
import type { GeneratedDocument, Student } from "./types";
import type { StudentFormInput } from "./student-schema";
import { randomId } from "./auth";

export async function saveStudent(student: Student) {
  const redis = getRedis();
  await redis.set(keys.student(student.id), JSON.stringify(student));
  await redis.zadd(keys.studentsIndex, Date.parse(student.created_at), student.id);
  await redis.set(keys.studentsEmail(student.email), student.id);
}

export async function getStudent(id: string): Promise<Student | null> {
  const raw = await getRedis().get(keys.student(id));
  if (!raw) return null;
  return JSON.parse(raw) as Student;
}

export async function listStudents(): Promise<Student[]> {
  const redis = getRedis();
  const ids = await redis.zrevrange(keys.studentsIndex, 0, -1);
  const students: Student[] = [];
  for (const id of ids) {
    const s = await getStudent(id);
    if (s) students.push(s);
  }
  return students;
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

export function applyFormToStudent(student: Student, data: StudentFormInput): Student {
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
  const redis = getRedis();
  await redis.set(keys.doc(doc.id), JSON.stringify(doc));
  await redis.sadd(keys.studentDocs(doc.student_id), doc.id);
}

export async function getDocument(id: string): Promise<GeneratedDocument | null> {
  const raw = await getRedis().get(keys.doc(id));
  if (!raw) return null;
  return JSON.parse(raw) as GeneratedDocument;
}

export async function listStudentDocuments(studentId: string) {
  const redis = getRedis();
  const ids = await redis.smembers(keys.studentDocs(studentId));
  const docs: GeneratedDocument[] = [];
  for (const id of ids) {
    const d = await getDocument(id);
    if (d) docs.push(d);
  }
  return docs.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
