import Link from "next/link";
import { connection } from "next/server";
import { listProjects, projectTypeLabel } from "@/lib/projects";
import { ensureSampleDataSeeded } from "@/lib/partners";

export default async function ApplyIndexPage() {
  // Always load at request time — admin-created projects must appear immediately.
  await connection();
  await ensureSampleDataSeeded();
  const projects = await listProjects();

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="panel relative space-y-6 px-6 py-8 sm:px-10 sm:py-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--mint-text)]">
            Student portal
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
            Choose a project
          </h1>
          <p className="mt-3 max-w-xl text-[var(--mint-text)]">
            Use the invite link from Brno for you, or open one of the projects
            below.
          </p>
        </div>
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/apply/${p.slug}`}
                className="block rounded-2xl border border-[var(--line)] px-4 py-4 transition hover:border-[var(--navy)]"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--mint-text)]">
                  {projectTypeLabel(p.type)}
                </span>
                <div className="font-bold text-[var(--navy)]">{p.name}</div>
              </Link>
            </li>
          ))}
          {projects.length === 0 && (
            <li className="text-sm text-[var(--muted)]">
              No open projects yet. Ask your coordinator for an invite link.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
