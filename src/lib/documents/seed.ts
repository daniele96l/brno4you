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
  if (existing.length > 0 && !force) return existing;

  const indexPath = path.join(
    process.cwd(),
    "content/doc-templates/index.json",
  );
  const index = JSON.parse(await readFile(indexPath, "utf8")) as SeedEntry[];

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
