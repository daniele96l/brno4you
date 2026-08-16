import { rpc } from "./supabase";
import { randomId } from "./auth";
import {
  type MobilityProject,
  type ProjectType,
  availableStudentTemplateIds,
  isMinor,
  normalizeFormConfig,
  partnershipTemplateId,
  projectTypeLabel,
  projectTypeShort,
  requiredStudentTemplateIds,
  signableStudentTemplateIds,
} from "./project-packs";

export type { MobilityProject, ProjectType };
export {
  availableStudentTemplateIds,
  isMinor,
  partnershipTemplateId,
  projectTypeLabel,
  projectTypeShort,
  requiredStudentTemplateIds,
  signableStudentTemplateIds,
};

export type ProjectInput = {
  name: string;
  type: ProjectType;
  slug?: string;
  project_name?: string;
  accreditation_no?: string;
  project_no?: string;
  project_period?: string;
  dates?: string;
  venue?: string;
  coordinator_name?: string;
  coordinator_email?: string;
  coordinator_phone?: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function mapProject(raw: MobilityProject | null): MobilityProject | null {
  if (!raw) return null;
  return {
    ...raw,
    form_config: normalizeFormConfig(
      (raw as MobilityProject & { form_config?: unknown }).form_config,
    ),
  };
}

export async function listProjects(): Promise<MobilityProject[]> {
  const data = await rpc<MobilityProject[]>("brno4you_list_projects", {});
  return (data || []).map((p) => mapProject(p)!).filter(Boolean);
}

export async function getProject(id: string): Promise<MobilityProject | null> {
  return mapProject(
    await rpc<MobilityProject | null>("brno4you_get_project", { p_id: id }),
  );
}

export async function getProjectBySlug(
  slug: string,
): Promise<MobilityProject | null> {
  return mapProject(
    await rpc<MobilityProject | null>("brno4you_get_project_by_slug", {
      p_slug: slug,
    }),
  );
}

export async function saveProject(
  project: MobilityProject,
): Promise<MobilityProject> {
  const data = await rpc<MobilityProject>("brno4you_upsert_project", {
    p_project: {
      ...project,
      form_config: normalizeFormConfig(project.form_config),
    },
  });
  return mapProject(data)!;
}

export function createProject(input: ProjectInput): MobilityProject {
  const now = new Date().toISOString();
  const baseSlug = slugify(input.slug || input.name) || `project-${Date.now()}`;
  return {
    id: `proj_${randomId()}`,
    slug: baseSlug,
    name: input.name.trim(),
    type: input.type,
    project_name: input.project_name?.trim() || input.name.trim(),
    accreditation_no:
      input.accreditation_no?.trim() || "2022-1-CZ01-KA150-YOU-000111402",
    project_no: input.project_no?.trim() || "",
    project_period: input.project_period?.trim() || "",
    dates: input.dates?.trim() || "",
    venue: input.venue?.trim() || "Brno, Czech Republic",
    coordinator_name: input.coordinator_name?.trim() || "Hedvika",
    coordinator_email: input.coordinator_email?.trim() || "",
    coordinator_phone: input.coordinator_phone?.trim() || "",
    form_config: { hiddenOptional: [], extraFields: [] },
    created_at: now,
    updated_at: now,
  };
}
