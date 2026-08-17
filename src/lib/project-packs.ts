import type { Student } from "./types";
import type { ProjectFormConfig } from "./form-config";
import { DEFAULT_FORM_CONFIG, normalizeFormConfig } from "./form-config";

export type ProjectType = "training_course" | "youth_exchange";

export type MobilityProject = {
  id: string;
  slug: string;
  name: string;
  type: ProjectType;
  project_name: string;
  accreditation_no: string;
  project_no: string;
  project_period: string;
  dates: string;
  venue: string;
  coordinator_name: string;
  coordinator_email: string;
  coordinator_phone: string;
  form_config: ProjectFormConfig;
  created_at: string;
  updated_at: string;
};

export { DEFAULT_FORM_CONFIG, normalizeFormConfig };
export type { ProjectFormConfig };

export function projectTypeLabel(type: ProjectType) {
  return type === "youth_exchange" ? "Youth Exchange" : "Training Course";
}

export function projectTypeShort(type: ProjectType) {
  return type === "youth_exchange" ? "YE" : "TC";
}

/** Age under 18 as of today. */
export function isMinor(birthDate: string) {
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age < 18;
}

/**
 * Infer minor status from partial birth-date selects.
 * Returns null when year alone is ambiguous (turning-18 calendar year).
 */
export function isMinorFromBirthParts(
  year: string,
  month = "",
  day = "",
): boolean | null {
  if (!year) return null;
  const y = parseInt(year, 10);
  if (Number.isNaN(y)) return null;

  if (month && day) return isMinor(`${year}-${month}-${day}`);

  const eighteenthYear = new Date().getFullYear() - 18;
  if (y > eighteenthYear) return true;
  if (y < eighteenthYear) return false;

  if (month && !day) {
    const lastDay = String(
      new Date(y, parseInt(month, 10), 0).getDate(),
    ).padStart(2, "0");
    if (isMinor(`${year}-${month}-${lastDay}`)) return true;
    if (!isMinor(`${year}-${month}-01`)) return false;
    return null;
  }

  return null;
}

/** Templates this student must sign — admin checklist, or empty until requested. */
export function studentRequestedTemplateIds(
  student: Pick<Student, "requested_template_ids">,
): string[] {
  return Array.isArray(student.requested_template_ids)
    ? student.requested_template_ids.filter(Boolean)
    : [];
}

/** Templates the student must sign — only what the admin ticked for them. */
export function requiredStudentTemplateIds(
  _project: Pick<MobilityProject, "type">,
  student: Pick<Student, "requested_template_ids">,
): string[] {
  return studentRequestedTemplateIds(student);
}

/** Docs to prepare/sign for this participant (admin checklist only). */
export function signableStudentTemplateIds(
  _project: Pick<MobilityProject, "type">,
  student: Pick<Student, "requested_template_ids">,
): string[] {
  return studentRequestedTemplateIds(student);
}

/** Student templates shown in generate UI for this project. */
export function availableStudentTemplateIds(
  project: Pick<MobilityProject, "type">,
): string[] {
  const ids = [
    "participants_agreement",
    "zero_tolerance",
    "legal_guardian_confirmation",
    "travel_tickets_declaration",
  ];
  if (project.type === "youth_exchange") {
    ids.push("letter_for_parents", "contract_leaders_minors");
  }
  return ids;
}

export function partnershipTemplateId(type: ProjectType) {
  return type === "youth_exchange" ? "partnership_ye" : "partnership_tc";
}
