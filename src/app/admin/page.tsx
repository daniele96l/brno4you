import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { listStudents } from "@/lib/students";
import { listPartners, ensureSampleDataSeeded } from "@/lib/partners";
import {
  listProjects,
  projectTypeLabel,
  projectTypeShort,
} from "@/lib/projects";
import { ensureTemplatesSeeded } from "@/lib/documents/seed";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { CreateProjectForm } from "@/components/CreateProjectForm";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  await ensureTemplatesSeeded();
  await ensureSampleDataSeeded();
  const [projects, students, partners] = await Promise.all([
    listProjects(),
    listStudents(),
    listPartners(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--navy)]">
            Projects
          </h1>
          <p className="text-sm text-[var(--mint-text)]">
            Youth Exchanges and Training Courses — open a project to manage
            participants, partners, and documents.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/templates" className="btn-secondary">
            Edit templates
          </Link>
          <AdminLogoutButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((p) => {
          const nStudents = students.filter((s) => s.project_id === p.id).length;
          const nPartners = partners.filter((x) => x.project_id === p.id).length;
          return (
            <Link
              key={p.id}
              href={`/admin/projects/${p.id}`}
              className="panel block space-y-2 p-5 transition hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--sky)] px-2.5 py-0.5 text-xs font-bold text-[var(--navy)]">
                  {projectTypeShort(p.type)}
                </span>
                <span className="text-xs text-[var(--mint-text)]">
                  {projectTypeLabel(p.type)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[var(--navy)]">{p.name}</h2>
              <p className="text-sm text-[var(--mint-text)]">
                {nStudents} participant{nStudents === 1 ? "" : "s"} · {nPartners}{" "}
                partner{nPartners === 1 ? "" : "s"}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                Invite: /apply/{p.slug}
              </p>
            </Link>
          );
        })}
      </div>

      {projects.length === 0 && (
        <p className="text-sm text-[var(--muted)]">No projects yet.</p>
      )}

      <CreateProjectForm />
    </div>
  );
}
