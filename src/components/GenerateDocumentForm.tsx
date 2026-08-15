"use client";

import { useMemo, useState } from "react";
import type { GeneratedDocument } from "@/lib/types";

type TemplateItem = {
  id: string;
  label: string;
  scope: "student" | "general";
};

type Props = {
  studentId: string;
  templates: TemplateItem[];
  initialDocuments: GeneratedDocument[];
  preselectedId?: string;
};

export function GenerateDocumentForm({
  studentId,
  templates,
  initialDocuments,
  preselectedId,
}: Props) {
  const studentTemplates = useMemo(
    () => templates.filter((t) => t.scope === "student"),
    [templates],
  );
  const [selectedId, setSelectedId] = useState(
    preselectedId && studentTemplates.some((t) => t.id === preselectedId)
      ? preselectedId
      : studentTemplates[0]?.id || "",
  );
  const [documents, setDocuments] = useState(initialDocuments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = studentTemplates.find((t) => t.id === selectedId);
  const existing = documents.find((d) => d.template_id === selectedId);

  async function generate() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/documents/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, templateId: selectedId }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Generation failed");
      return;
    }
    setDocuments(json.documents);
  }

  return (
    <div className="space-y-5 text-sm">
      <div>
        <p className="mb-2 font-semibold text-[var(--navy)]">
          Select one document
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {studentTemplates.map((t) => {
            const done = documents.some((d) => d.template_id === t.id);
            const signed = documents.some(
              (d) => d.template_id === t.id && d.status === "signed",
            );
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  selectedId === t.id
                    ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                    : "border-[var(--line)] hover:border-[var(--navy)]"
                }`}
              >
                <div className="font-semibold">{t.label}</div>
                <div
                  className={`mt-1 text-xs ${selectedId === t.id ? "text-white/80" : "text-[var(--mint-text)]"}`}
                >
                  {signed ? "Signed" : done ? "Generated" : "Not generated yet"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--sky)]/30 px-4 py-4">
          <h3 className="font-bold text-[var(--navy)]">{selected.label}</h3>
          <p className="mt-1 text-[var(--mint-text)]">
            {existing?.status === "signed"
              ? `Signed ${existing.signed_at ? new Date(existing.signed_at).toLocaleString() : ""} by ${existing.signer_name || "participant"}`
              : existing
                ? `Last generated ${new Date(existing.created_at).toLocaleString()}`
                : "Ready to generate for this student."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={loading || existing?.status === "signed"}
              onClick={generate}
            >
              {loading
                ? "Generating…"
                : existing
                  ? "Regenerate PDF"
                  : "Generate PDF"}
            </button>
            {existing && (
              <a
                className="btn-secondary"
                href={`/api/documents/${existing.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Review PDF
              </a>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}

      <div>
        <h3 className="mb-2 font-semibold text-[var(--navy)]">
          All files for this student
        </h3>
        <ul className="space-y-2">
          {documents.length === 0 && (
            <li className="text-[var(--muted)]">No documents generated yet.</li>
          )}
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3"
            >
              <span>
                {d.filename}{" "}
                <span className="text-[var(--muted)]">
                  ({d.status}
                  {d.signed_at
                    ? ` · ${new Date(d.signed_at).toLocaleString()}`
                    : ` · ${new Date(d.created_at).toLocaleString()}`}
                  )
                </span>
              </span>
              <a
                className="btn-secondary"
                href={`/api/documents/${d.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
