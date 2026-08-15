import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getStudent, listStudentDocuments } from "@/lib/students";
import { GenerateDocumentForm } from "@/components/GenerateDocumentForm";
import { ensureTemplatesSeeded } from "@/lib/documents/seed";
import { listDocTemplates } from "@/lib/documents/templates";

type Props = { params: Promise<{ id: string }> };

export default async function AdminStudentPage({ params }: Props) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();

  const documents = await listStudentDocuments(id);
  await ensureTemplatesSeeded();
  const templates = await listDocTemplates();

  const name = [
    student.first_name,
    student.has_second_name ? student.second_name : null,
    student.surname,
    student.has_second_surname ? student.second_surname : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <Link href="/admin" className="text-sm font-medium text-[var(--navy)] hover:underline">
          ← All students
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold text-[var(--navy)]">
          {name}
        </h1>
        <p className="text-sm text-[var(--mint-text)]">
          Verification: {student.id_verification_status}
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
              ["Document", `${student.document_type} · ${student.document_country}`],
              ["Document number", student.document_number],
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

      <div className="panel space-y-4 px-5 py-5">
        <h2 className="text-base font-semibold">Documents</h2>
        <GenerateDocumentForm
          studentId={student.id}
          templates={templates}
          initialDocuments={documents}
        />
      </div>
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
