import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { listAllDocuments, listStudents } from "@/lib/students";
import { listPartners, ensureSampleDataSeeded } from "@/lib/partners";
import { getProject, listProjects } from "@/lib/projects";
import { ensureTemplatesSeeded } from "@/lib/documents/seed";
import { ensureStudentDocuments } from "@/lib/documents/ensure";
import { listDocTemplates } from "@/lib/documents/templates";
import { ProjectDashboard } from "./ProjectDashboard";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminProjectPage({ params, searchParams }: Props) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const { tab } = await searchParams;
  await ensureTemplatesSeeded();
  await ensureSampleDataSeeded();

  const project = await getProject(id);
  if (!project) notFound();

  let [students, partners, templates, documents, allProjects] =
    await Promise.all([
      listStudents(id),
      listPartners(id),
      listDocTemplates(),
      listAllDocuments(),
      listProjects(),
    ]);

  // Backfill PDFs for already-verified participants (no admin Generate)
  await Promise.all(
    students
      .filter(
        (s) =>
          s.id_verification_status === "matched" ||
          s.id_verification_status === "mismatch_dismissed",
      )
      .map((s) => ensureStudentDocuments(s).catch(() => null)),
  );
  documents = await listAllDocuments();

  const initialTab =
    tab === "partners" ||
    tab === "documents" ||
    tab === "settings" ||
    tab === "participants"
      ? tab
      : "participants";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <ProjectDashboard
        project={project}
        students={students}
        partners={partners}
        templates={templates}
        documents={documents.filter(
          (d) =>
            !d.student_id ||
            students.some((s) => s.id === d.student_id),
        )}
        allProjects={allProjects}
        initialTab={initialTab}
      />
    </div>
  );
}
