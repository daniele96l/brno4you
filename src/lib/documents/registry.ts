import type { DocumentTemplate } from "./types";
import { studentSummaryTemplate } from "./student-summary";

/** Register new document templates here. */
export const documentTemplates: DocumentTemplate[] = [studentSummaryTemplate];

export function getTemplate(id: string) {
  return documentTemplates.find((t) => t.id === id) ?? null;
}

export function listTemplates() {
  return documentTemplates.map(({ id, label }) => ({ id, label }));
}
