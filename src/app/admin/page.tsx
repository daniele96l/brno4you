import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { listAllDocuments, listStudents } from "@/lib/students";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { ensureTemplatesSeeded } from "@/lib/documents/seed";
import { listDocTemplates } from "@/lib/documents/templates";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const students = await listStudents();
  await ensureTemplatesSeeded();
  const templates = await listDocTemplates();
  const documents = await listAllDocuments();
  const studentTemplates = templates.filter((t) => t.scope === "student");

  const coverage = students.map((s) => {
    const done = studentTemplates.filter((t) =>
      documents.some((d) => d.student_id === s.id && d.template_id === t.id),
    ).length;
    return { id: s.id, done, total: studentTemplates.length };
  });
  const coverageMap = Object.fromEntries(coverage.map((c) => [c.id, c]));
  const totalSlots = students.length * studentTemplates.length;
  const totalDone = coverage.reduce((a, c) => a + c.done, 0);
  const pct = totalSlots ? Math.round((totalDone / totalSlots) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--navy)]">Students</h1>
          <p className="text-sm text-[var(--mint-text)]">
            {students.length} application{students.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/reports" className="btn-primary">
            Reports dashboard
          </Link>
          <Link href="/admin/settings" className="btn-secondary">
            Project settings
          </Link>
          <Link href="/admin/templates" className="btn-secondary">
            Edit templates
          </Link>
          <AdminLogoutButton />
        </div>
      </div>

      <Link
        href="/admin/reports"
        className="panel block space-y-3 p-5 transition hover:shadow-md"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[var(--navy)]">
              Document reports
            </h2>
            <p className="text-sm text-[var(--mint-text)]">
              {totalDone}/{totalSlots} generated · open to pick one report and
              work through students
            </p>
          </div>
          <span className="text-2xl font-extrabold text-[var(--navy)]">
            {pct}%
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[var(--sky)]">
          <div
            className="h-full rounded-full bg-[var(--navy)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Link>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Verification</th>
              <th className="px-4 py-3 font-medium">Docs</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-[var(--muted)]">
                  No students yet.
                </td>
              </tr>
            )}
            {students.map((s) => {
              const c = coverageMap[s.id] || { done: 0, total: studentTemplates.length };
              return (
                <tr key={s.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="font-medium text-[var(--navy)] hover:underline"
                    >
                      {s.first_name} {s.surname}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.id_verification_status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-[var(--navy)]">
                        {c.done}/{c.total}
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--sky)]">
                        <div
                          className="h-full rounded-full bg-[var(--mint)]"
                          style={{
                            width: `${c.total ? (c.done / c.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(s.updated_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    matched: "bg-emerald-100 text-emerald-900",
    pending: "bg-amber-100 text-amber-900",
    mismatch_dismissed: "bg-orange-100 text-orange-900",
    failed: "bg-red-100 text-red-900",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100"}`}
    >
      {status}
    </span>
  );
}
