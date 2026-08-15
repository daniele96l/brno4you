import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { listStudents } from "@/lib/students";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const students = await listStudents();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Students</h1>
          <p className="text-sm text-[var(--muted)]">
            {students.length} application{students.length === 1 ? "" : "s"}
          </p>
        </div>
        <AdminLogoutButton />
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Verification</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-[var(--muted)]">
                  No students yet.
                </td>
              </tr>
            )}
            {students.map((s) => (
              <tr key={s.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/students/${s.id}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {s.first_name} {s.surname}
                  </Link>
                </td>
                <td className="px-4 py-3">{s.email}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.id_verification_status} />
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {new Date(s.updated_at).toLocaleString()}
                </td>
              </tr>
            ))}
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
