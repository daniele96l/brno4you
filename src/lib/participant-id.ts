import type { Student } from "./types";
import { isMinor } from "./project-packs";

export function participantIdVerified(student: Pick<Student, "id_verification_status">) {
  return (
    student.id_verification_status === "matched" ||
    student.id_verification_status === "mismatch_dismissed"
  );
}

export function guardianIdRequired(student: Pick<Student, "birth_date">) {
  return isMinor(student.birth_date);
}

export function guardianIdUploaded(
  student: Pick<Student, "guardian_id_front_path">,
) {
  return Boolean(student.guardian_id_front_path);
}

/** Participant can access signing after ID verify (+ guardian ID if minor). */
export function participantReadyForDocuments(student: Student) {
  if (student.participation_status !== "approved") return false;
  if (!participantIdVerified(student)) return false;
  if (guardianIdRequired(student) && !guardianIdUploaded(student)) return false;
  return true;
}

export function documentsSignedByGuardian(student: Pick<Student, "birth_date">) {
  return guardianIdRequired(student);
}
