import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { listAllDocuments, listStudents } from "@/lib/students";
import { ensureTemplatesSeeded } from "@/lib/documents/seed";
import { listDocTemplates } from "@/lib/documents/templates";
import { ReportsDashboard } from "./ReportsDashboard";

type Props = { searchParams: Promise<{ doc?: string }> };

export default async function AdminReportsPage({ searchParams }: Props) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { doc } = await searchParams;
  await ensureTemplatesSeeded();
  const [students, templates, documents] = await Promise.all([
    listStudents(),
    listDocTemplates(),
    listAllDocuments(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="text-sm font-medium text-[var(--navy)] hover:underline"
          >
            ← Students
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold text-[var(--navy)]">
            Reports
          </h1>
          <p className="mt-1 text-sm text-[var(--mint-text)]">
            Pick one document type, see who still needs it, generate and review
            PDFs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/settings" className="btn-secondary">
            Project settings
          </Link>
          <Link href="/admin/templates" className="btn-secondary">
            Edit templates
          </Link>
        </div>
      </div>

      <ReportsDashboard
        students={students}
        templates={templates}
        documents={documents}
        initialTemplateId={doc}
      />
    </div>
  );
}
