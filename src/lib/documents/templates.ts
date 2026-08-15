import { rpc } from "../supabase";
import type { Student } from "../types";
import type { Partner } from "../partners";
import type { MobilityProject } from "../projects";

/** Settings-shaped fields used in document placeholders. */
export type ProjectSettings = Pick<
  MobilityProject,
  | "project_name"
  | "accreditation_no"
  | "project_no"
  | "project_period"
  | "dates"
  | "venue"
  | "coordinator_name"
  | "coordinator_email"
  | "coordinator_phone"
> & { id?: string; updated_at?: string };

export type DocTemplate = {
  id: string;
  label: string;
  scope: "student" | "general";
  body: string;
  sort_order: number;
  updated_at: string;
};

export function settingsFromProject(project: MobilityProject): ProjectSettings {
  return {
    id: project.id,
    project_name: project.project_name || project.name,
    accreditation_no: project.accreditation_no,
    project_no: project.project_no,
    project_period: project.project_period,
    dates: project.dates,
    venue: project.venue,
    coordinator_name: project.coordinator_name,
    coordinator_email: project.coordinator_email,
    coordinator_phone: project.coordinator_phone,
    updated_at: project.updated_at,
  };
}

/** @deprecated Prefer project-scoped settings via getProject + settingsFromProject */
export async function getProjectSettings(): Promise<ProjectSettings> {
  const { listProjects } = await import("../projects");
  const projects = await listProjects();
  if (projects[0]) return settingsFromProject(projects[0]);
  return {
    id: "default",
    project_name: "",
    accreditation_no: "",
    project_no: "",
    project_period: "",
    dates: "",
    venue: "",
    coordinator_name: "",
    coordinator_email: "",
    coordinator_phone: "",
    updated_at: new Date().toISOString(),
  };
}

export async function listDocTemplates(): Promise<DocTemplate[]> {
  const data = await rpc<DocTemplate[]>("brno4you_list_templates", {});
  return data || [];
}

export async function getDocTemplate(id: string): Promise<DocTemplate | null> {
  return rpc<DocTemplate | null>("brno4you_get_template", { p_id: id });
}

export async function saveDocTemplate(
  template: Pick<DocTemplate, "id" | "label" | "scope" | "body" | "sort_order">,
): Promise<DocTemplate> {
  return rpc<DocTemplate>("brno4you_upsert_template", { p_template: template });
}

export function studentFullName(s: Student) {
  return [
    s.first_name,
    s.has_second_name ? s.second_name : null,
    s.surname,
    s.has_second_surname ? s.second_surname : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildPlaceholderMap(
  settings: ProjectSettings,
  student?: Student | null,
  partner?: Partner | null,
): Record<string, string> {
  const map: Record<string, string> = {
    project_name: settings.project_name || "",
    accreditation_no: settings.accreditation_no || "",
    project_no: settings.project_no || "",
    project_period: settings.project_period || "",
    dates: settings.dates || "",
    venue: settings.venue || "",
    coordinator_name: settings.coordinator_name || "",
    coordinator_email: settings.coordinator_email || "",
    coordinator_phone: settings.coordinator_phone || "",
    full_name: "",
    first_name: "",
    surname: "",
    birth_date: "",
    email: "",
    phone: "",
    nationality: "",
    document_number: "",
    document_country: "",
    partner_name: "",
    partner_oid: "",
    partner_national_id: "",
    partner_address: "",
    partner_legal_representative: "",
    partner_coordinator_name: "",
    partner_email: "",
    partner_phone: "",
    partner_country: "",
  };
  if (student) {
    map.full_name = studentFullName(student);
    map.first_name = student.first_name;
    map.surname = student.surname;
    map.birth_date = student.birth_date;
    map.email = student.email;
    map.phone = student.phone;
    map.nationality = student.nationality;
    map.document_number = student.document_number;
    map.document_country = student.document_country;
  }
  if (partner) {
    map.partner_name = partner.name;
    map.partner_oid = partner.oid;
    map.partner_national_id = partner.national_id;
    map.partner_address = partner.address;
    map.partner_legal_representative = partner.legal_representative;
    map.partner_coordinator_name = partner.coordinator_name;
    map.partner_email = partner.email;
    map.partner_phone = partner.phone;
    map.partner_country = partner.country;
  }
  return map;
}

export function fillTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => {
    const v = vars[key];
    return v == null ? "" : v;
  });
}
