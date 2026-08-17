import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getStudent, listStudentDocuments } from "@/lib/students";
import { AdminStudentActions } from "@/components/AdminStudentActions";
import { ensureTemplatesSeeded } from "@/lib/documents/seed";
import { listDocTemplates } from "@/lib/documents/templates";
import {
  availableStudentTemplateIds,
  getProject,
  projectTypeLabel,
} from "@/lib/projects";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ doc?: string }>;
};

export default async function AdminStudentPage({ params, searchParams }: Props) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  const { id } = await params;
  const { doc } = await searchParams;
  const student = await getStudent(id);
  if (!student) notFound();

  const project = student.project_id
    ? await getProject(student.project_id)
    : null;
  const documents = await listStudentDocuments(id);
  await ensureTemplatesSeeded();
  const allTemplates = await listDocTemplates();
  const allowed = new Set(
    project ? availableStudentTemplateIds(project) : [],
  );
  const templates = allTemplates.filter(
    (t) => t.scope === "student" && (!project || allowed.has(t.id)),
  );

  const name = [
    student.first_name,
    student.has_second_name ? student.second_name : null,
    student.surname,
    student.has_second_surname ? student.second_surname : null,
  ]
    .filter(Boolean)
    .join(" ");

  const customRows = Object.entries(student.custom_answers || {}).map(
    ([k, v]) =>
      [k, typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)] as [
        string,
        string,
      ],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <Link
          href={project ? `/admin/projects/${project.id}` : "/admin"}
          className="text-sm font-medium text-[var(--navy)] hover:underline"
        >
          ← {project ? project.name : "Projects"}
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold text-[var(--navy)]">
          {name}
        </h1>
        <p className="text-sm text-[var(--mint-text)]">
          Participation: {student.participation_status} · Verification:{" "}
          {student.id_verification_status}
          {project ? ` · ${projectTypeLabel(project.type)}` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel space-y-3 px-5 py-5 text-sm">
          <h2 className="text-base font-semibold">Submitted data</h2>
          <Dl
            rows={[
              ["Email", student.email],
              ["Phone", student.phone],
              ["Birth date", student.birth_date],
              ["Nationality", student.nationality],
              [
                "Document",
                `${student.document_type} · ${student.document_country}`,
              ],
              ["Document number", student.document_number],
              ...customRows,
            ]}
          />
        </div>

        <div className="panel space-y-3 px-5 py-5 text-sm">
          <h2 className="text-base font-semibold">ID vs form</h2>
          {student.id_extracted ? (
            <pre className="overflow-x-auto rounded bg-black/5 p-3 text-xs">
              {JSON.stringify(
                {
                  extracted: student.id_extracted,
                  mismatches: student.id_mismatches,
                },
                null,
                2,
              )}
            </pre>
          ) : (
            <p className="text-[var(--muted)]">No verification run yet.</p>
          )}
        </div>
      </div>

      <div className="panel space-y-4 px-5 py-5">
        <h2 className="text-base font-semibold">ID images</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {student.id_front_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/students/${student.id}/files/front`}
              alt="ID front"
              className="max-h-72 w-full rounded-lg border border-[var(--line)] object-contain bg-white"
            />
          )}
          {student.id_back_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/students/${student.id}/files/back`}
              alt="ID back"
              className="max-h-72 w-full rounded-lg border border-[var(--line)] object-contain bg-white"
            />
          )}
        </div>
      </div>

      {(student.guardian_id_front_path || student.guardian_id_back_path) && (
        <div className="panel space-y-4 px-5 py-5">
          <h2 className="text-base font-semibold">Parent / guardian ID</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {student.guardian_id_front_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/students/${student.id}/files/guardian_front`}
                alt="Guardian ID front"
                className="max-h-72 w-full rounded-lg border border-[var(--line)] object-contain bg-white"
              />
            )}
            {student.guardian_id_back_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/students/${student.id}/files/guardian_back`}
                alt="Guardian ID back"
                className="max-h-72 w-full rounded-lg border border-[var(--line)] object-contain bg-white"
              />
            )}
          </div>
        </div>
      )}

      <AdminStudentActions
        initialStudent={student}
        templates={templates.map((t) => ({
          id: t.id,
          label: t.label,
          scope: t.scope as "student" | "general",
        }))}
        initialDocuments={documents}
        preselectedId={doc}
      />
    </div>
  );
}

function Dl({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[9rem_1fr] gap-2">
          <dt className="text-[var(--muted)]">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
