import type { Student } from "./types";

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
  created_at: string;
  updated_at: string;
};

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

/** Templates the student must have generated for coverage. */
export function requiredStudentTemplateIds(
  project: Pick<MobilityProject, "type">,
  student: Pick<Student, "birth_date" | "needs_travel_declaration">,
): string[] {
  const ids = ["participants_agreement", "zero_tolerance"];
  if (isMinor(student.birth_date)) {
    ids.push("legal_guardian_confirmation");
    if (project.type === "youth_exchange") {
      ids.push("letter_for_parents");
    }
  }
  if (student.needs_travel_declaration) {
    ids.push("travel_tickets_declaration");
  }
  return ids;
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
