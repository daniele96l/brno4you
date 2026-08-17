import { readFile } from "fs/promises";
import path from "path";
import {
  listDocTemplates,
  saveDocTemplate,
  type DocTemplate,
} from "./templates";

type SeedEntry = {
  id: string;
  label: string;
  scope: "student" | "general";
  file: string;
};

/** Upsert bundled templates when the DB has none (or force=true). */
export async function ensureTemplatesSeeded(force = false) {
  const existing = await listDocTemplates();
  const indexPath = path.join(
    process.cwd(),
    "content/doc-templates/index.json",
  );
  const index = JSON.parse(await readFile(indexPath, "utf8")) as SeedEntry[];

  if (existing.length === 0 || force) {
    const seeded: DocTemplate[] = [];
    for (let i = 0; i < index.length; i++) {
      const entry = index[i];
      const body = await readFile(
        path.join(process.cwd(), "content/doc-templates", entry.file),
        "utf8",
      );
      const saved = await saveDocTemplate({
        id: entry.id,
        label: entry.label,
        scope: entry.scope,
        body,
        sort_order: i + 1,
      });
      seeded.push(saved);
    }
    return seeded;
  }

  // Refresh partnership bodies that still lack partner_* placeholders
  for (const entry of index.filter((e) => e.id.startsWith("partnership_"))) {
    const current = existing.find((t) => t.id === entry.id);
    if (current && !current.body.includes("{{partner_name}}")) {
      const body = await readFile(
        path.join(process.cwd(), "content/doc-templates", entry.file),
        "utf8",
      );
      await saveDocTemplate({
        id: entry.id,
        label: entry.label,
        scope: entry.scope,
        body,
        sort_order: current.sort_order,
      });
    }
  }

  // Refresh participants agreement if name/DOB placeholders are missing
  const agreement = existing.find((t) => t.id === "participants_agreement");
  if (agreement && !agreement.body.includes("{{full_name}}")) {
    const entry = index.find((e) => e.id === "participants_agreement");
    if (entry) {
      const body = await readFile(
        path.join(process.cwd(), "content/doc-templates", entry.file),
        "utf8",
      );
      await saveDocTemplate({
        id: entry.id,
        label: entry.label,
        scope: entry.scope,
        body,
        sort_order: agreement.sort_order,
      });
    }
  }

  return listDocTemplates();
}
