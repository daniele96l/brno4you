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
  const filled = fillTemplate(
    template.body,
    buildPlaceholderMap(settings, student, partner),
  );
  const buffer = await textToPdf(template.label, filled);

  const slug = student
    ? studentFullName(student).replace(/\s+/g, "-").toLowerCase() || student.id
    : partner
      ? partner.name.replace(/\s+/g, "-").toLowerCase()
      : "general";

  return {
    buffer,
    filename: `brno4you-${template.id}-${slug}.pdf`,
    mime: "application/pdf" as const,
    template,
  };
}
