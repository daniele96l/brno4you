import type { DocumentTemplate } from "./types";
import type { Student } from "../types";
import type { Partner } from "../partners";
import type { MobilityProject } from "../projects";
import { getProject } from "../projects";
import { textToPdf } from "./pdf";
import {
  buildPlaceholderMap,
  fillTemplate,
  getDocTemplate,
  settingsFromProject,
  studentFullName,
} from "./templates";
import { studentSummaryTemplate } from "./student-summary";
import {
  fillDocxTemplate,
  loadDocxTemplateFile,
  type DocxFillData,
} from "./fill-docx";
import { docxBufferToPdf } from "./docx-to-pdf";

export { studentSummaryTemplate };

/** Legacy code registry kept for the summary PDF only. */
export const documentTemplates: DocumentTemplate[] = [studentSummaryTemplate];

export function getTemplate(id: string) {
  return documentTemplates.find((t) => t.id === id) ?? null;
}

export function listTemplates() {
  return documentTemplates.map(({ id, label }) => ({ id, label }));
}

export async function generateFromDbTemplate(
  templateId: string,
  student: Student | null,
  partner: Partner | null = null,
  project?: MobilityProject | null,
) {
  const template = await getDocTemplate(templateId);
  if (!template) throw new Error("Unknown template");

  if (template.scope === "student" && !student) {
    throw new Error("This template requires a student");
  }

  let resolved = project || null;
  if (!resolved) {
    const projectId = student?.project_id || partner?.project_id;
    if (projectId) resolved = await getProject(projectId);
  }
  if (!resolved) throw new Error("Project not found for document generation");

  const settings = settingsFromProject(resolved);
  const vars = buildPlaceholderMap(settings, student, partner);
  const slug = student
    ? studentFullName(student).replace(/\s+/g, "-").toLowerCase() || student.id
    : partner
      ? partner.name.replace(/\s+/g, "-").toLowerCase()
      : "general";

  const docxTemplate = await loadDocxTemplateFile(templateId);
  if (docxTemplate) {
    const fillData: DocxFillData = {
      project_name: vars.project_name,
      accreditation_no: vars.accreditation_no,
      project_no: vars.project_no,
      project_period: vars.project_period,
      dates: vars.dates,
      venue: vars.venue,
      coordinator_name: vars.coordinator_name,
      coordinator_email: vars.coordinator_email,
      coordinator_phone: vars.coordinator_phone,
      full_name: vars.full_name,
      birth_date: vars.birth_date,
      nationality: vars.nationality,
      phone: vars.phone,
      email: vars.email,
      partner_name: vars.partner_name,
      partner_oid: vars.partner_oid,
      partner_national_id: vars.partner_national_id,
      partner_address: vars.partner_address,
      partner_legal_representative: vars.partner_legal_representative,
      partner_coordinator_name: vars.partner_coordinator_name,
      partner_email: vars.partner_email,
      partner_phone: vars.partner_phone,
      partner_country: vars.partner_country,
      sending_organisation: partner
        ? `${partner.name}, ${partner.country}`
        : "",
    };
    const filledDocx = await fillDocxTemplate(docxTemplate, fillData);
    const buffer = await docxBufferToPdf(filledDocx);
    return {
      buffer,
      filename: `brno4you-${template.id}-${slug}.pdf`,
      mime: "application/pdf" as const,
      template,
    };
  }

  // Fallback for templates without a DOCX file
  const filled = fillTemplate(template.body, vars);
  const buffer = await textToPdf(template.label, filled);
  return {
    buffer,
    filename: `brno4you-${template.id}-${slug}.pdf`,
    mime: "application/pdf" as const,
    template,
  };
}
