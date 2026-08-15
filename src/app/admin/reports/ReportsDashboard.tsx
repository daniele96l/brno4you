"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GeneratedDocument, Student } from "@/lib/types";

type TemplateItem = {
  id: string;
  label: string;
  scope: "student" | "general";
};

type Props = {
  students: Student[];
  templates: TemplateItem[];
  documents: GeneratedDocument[];
  initialTemplateId?: string;
};

function latestDoc(
  docs: GeneratedDocument[],
  studentId: string | null,
  templateId: string,
) {
  return docs.find(
    (d) =>
      d.template_id === templateId &&
      (studentId == null
        ? d.student_id == null
        : d.student_id === studentId),
  );
}

export function ReportsDashboard({
  students,
  templates,
  documents: initialDocs,
  initialTemplateId,
}: Props) {
  const router = useRouter();
  const studentTemplates = templates.filter((t) => t.scope === "student");
  const generalTemplates = templates.filter((t) => t.scope === "general");

  const [selectedId, setSelectedId] = useState(
    initialTemplateId && templates.some((t) => t.id === initialTemplateId)
      ? initialTemplateId
      : studentTemplates[0]?.id || generalTemplates[0]?.id || "",
  );
  const [docs, setDocs] = useState(initialDocs);
  const [filter, setFilter] = useState<"all" | "missing" | "done">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const selected = templates.find((t) => t.id === selectedId) || null;

  const perTemplateStats = useMemo(() => {
    return studentTemplates.map((t) => {
      const done = students.filter((s) =>
        docs.some((d) => d.student_id === s.id && d.template_id === t.id),
      ).length;
      return {
        id: t.id,
        label: t.label,
        done,
        total: students.length,
        pct: students.length ? Math.round((done / students.length) * 100) : 0,
      };
    });
  }, [studentTemplates, students, docs]);

  const overallDone = perTemplateStats.reduce((a, s) => a + s.done, 0);
  const overallTotal = Math.max(students.length * studentTemplates.length, 1);
  const overallPct = Math.round((overallDone / overallTotal) * 100);

  const rows = useMemo(() => {
    if (!selected || selected.scope !== "student") return [];
    return students
      .map((s) => {
        const doc = latestDoc(docs, s.id, selected.id);
        return {
          student: s,
          doc,
          status: doc ? ("done" as const) : ("missing" as const),
        };
      })
      .filter((r) => filter === "all" || r.status === filter);
  }, [students, docs, selected, filter]);

  function selectTemplate(id: string) {
    setSelectedId(id);
    setPreview(null);
    setError(null);
    router.replace(`/admin/reports?doc=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  async function generate(studentId: string | null) {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/documents/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selected.id, studentId }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Generation failed");
      return;
    }
    const created = json.document as GeneratedDocument;
    setDocs((prev) => [created, ...prev.filter((d) => d.id !== created.id)]);
    if (json.document?.id) {
      setPreview(`/api/documents/${json.document.id}`);
    }
  }

  async function generateMissing() {
    if (!selected || selected.scope !== "student") return;
    const missing = students.filter(
      (s) => !docs.some((d) => d.student_id === s.id && d.template_id === selected.id),
    );
    setLoading(true);
    setError(null);
    for (const s of missing) {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selected.id, studentId: s.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(`${s.first_name} ${s.surname}: ${json.error || "failed"}`);
        setLoading(false);
        return;
      }
      const created = json.document as GeneratedDocument;
      setDocs((prev) => [created, ...prev]);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Overall visualization */}
      <div className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--navy)]">
              Document coverage
            </h2>
            <p className="text-sm text-[var(--mint-text)]">
              {overallDone} / {students.length * studentTemplates.length} student
              documents generated ({overallPct}%)
            </p>
          </div>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[var(--sky)]">
          <div
            className="h-full rounded-full bg-[var(--navy)] transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perTemplateStats.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectTemplate(s.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                selectedId === s.id
                  ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                  : "border-[var(--line)] bg-white hover:border-[var(--navy)]"
              }`}
            >
              <div className="text-sm font-semibold">{s.label}</div>
              <div
                className={`mt-1 text-xs ${selectedId === s.id ? "text-white/80" : "text-[var(--mint-text)]"}`}
              >
                {s.done}/{s.total} students · {s.pct}%
              </div>
              <div
                className={`mt-2 h-1.5 overflow-hidden rounded-full ${selectedId === s.id ? "bg-white/25" : "bg-[var(--sky)]"}`}
              >
                <div
                  className={`h-full rounded-full ${selectedId === s.id ? "bg-white" : "bg-[var(--mint)]"}`}
                  style={{ width: `${s.pct}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Pre-select one report */}
        <aside className="panel space-y-2 p-3">
          <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--mint-text)]">
            Choose report
          </p>
          <p className="px-2 pb-2 text-[11px] text-[var(--muted)]">
            Student docs
          </p>
          {studentTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTemplate(t.id)}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${
                selectedId === t.id
                  ? "bg-[var(--navy)] text-white"
                  : "text-[var(--navy)] hover:bg-[var(--sky)]"
              }`}
            >
              {t.label}
            </button>
          ))}
          <p className="px-2 pb-1 pt-3 text-[11px] text-[var(--muted)]">
            General / partnership
          </p>
          {generalTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTemplate(t.id)}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${
                selectedId === t.id
                  ? "bg-[var(--navy)] text-white"
                  : "text-[var(--navy)] hover:bg-[var(--sky)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </aside>

        <div className="panel space-y-4 p-5">
          {selected && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--navy)]">
                    {selected.label}
                  </h2>
                  <p className="text-sm text-[var(--mint-text)]">
                    {selected.scope === "student"
                      ? "Per-student report — review who still needs it, then generate."
                      : "Project-level report — filled from project settings."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/templates`}
                    className="btn-secondary"
                  >
                    Edit text
                  </Link>
                  {selected.scope === "student" && (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={loading}
                      onClick={generateMissing}
                    >
                      {loading ? "Working…" : "Generate all missing"}
                    </button>
                  )}
                  {selected.scope === "general" && (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={loading}
                      onClick={() => generate(null)}
                    >
                      {loading ? "Generating…" : "Generate PDF"}
                    </button>
                  )}
                </div>
              </div>

              {selected.scope === "general" && (
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--sky)]/40 px-4 py-3 text-sm">
                  {(() => {
                    const doc = latestDoc(docs, null, selected.id);
                    return doc ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          Last generated{" "}
                          {new Date(doc.created_at).toLocaleString()}
                        </span>
                        <a
                          className="btn-secondary"
                          href={`/api/documents/${doc.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download / review
                        </a>
                      </div>
                    ) : (
                      <span className="text-[var(--mint-text)]">
                        Not generated yet for this project.
                      </span>
                    );
                  })()}
                </div>
              )}

              {selected.scope === "student" && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["all", "All"],
                        ["missing", "Missing only"],
                        ["done", "Done only"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFilter(id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          filter === id
                            ? "bg-[var(--navy)] text-white"
                            : "bg-[var(--sky)] text-[var(--navy)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="border-b border-[var(--line)] text-[var(--muted)]">
                        <tr>
                          <th className="py-2 pr-3 font-medium">Student</th>
                          <th className="py-2 pr-3 font-medium">Status</th>
                          <th className="py-2 pr-3 font-medium">Last file</th>
                          <th className="py-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-6 text-[var(--muted)]"
                            >
                              No students in this filter.
                            </td>
                          </tr>
                        )}
                        {rows.map(({ student: s, doc, status }) => (
                          <tr
                            key={s.id}
                            className="border-b border-[var(--line)] last:border-0"
                          >
                            <td className="py-3 pr-3">
                              <Link
                                href={`/admin/students/${s.id}?doc=${selected.id}`}
                                className="font-medium text-[var(--navy)] hover:underline"
                              >
                                {s.first_name} {s.surname}
                              </Link>
                              <div className="text-xs text-[var(--muted)]">
                                {s.email}
                              </div>
                            </td>
                            <td className="py-3 pr-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  status === "done"
                                    ? "bg-emerald-100 text-emerald-900"
                                    : "bg-amber-100 text-amber-900"
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="py-3 pr-3 text-[var(--muted)]">
                              {doc
                                ? new Date(doc.created_at).toLocaleString()
                                : "—"}
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  disabled={loading}
                                  onClick={() => generate(s.id)}
                                >
                                  {doc ? "Regenerate" : "Generate"}
                                </button>
                                {doc && (
                                  <a
                                    className="btn-secondary"
                                    href={`/api/documents/${doc.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Review PDF
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {preview && (
                <a
                  className="btn-primary inline-flex"
                  href={preview}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open last generated PDF
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
