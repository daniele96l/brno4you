import { rpc } from "../supabase";
import type { Student } from "../types";

export type ProjectSettings = {
  id: string;
  project_name: string;
  accreditation_no: string;
  project_no: string;
  project_period: string;
  dates: string;
  venue: string;
  coordinator_name: string;
  coordinator_email: string;
  coordinator_phone: string;
  updated_at: string;
};

export type DocTemplate = {
  id: string;
  label: string;
  scope: "student" | "general";
  body: string;
  sort_order: number;
  updated_at: string;
};

export async function getProjectSettings(): Promise<ProjectSettings> {
  return rpc<ProjectSettings>("brno4you_get_project_settings", {});
}

export async function saveProjectSettings(
  settings: Partial<ProjectSettings>,
): Promise<ProjectSettings> {
  return rpc<ProjectSettings>("brno4you_upsert_project_settings", {
    p_settings: settings,
  });
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
  return map;
}

export function fillTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => {
    const v = vars[key];
    return v == null ? "" : v;
  });
}
