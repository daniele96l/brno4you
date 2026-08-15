"use client";

import { useState } from "react";
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
};

export function GenerateDocumentForm({
  studentId,
  templates,
  initialDocuments,
}: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const studentTemplates = templates.filter((t) => t.scope === "student");

  async function generate(templateId: string) {
    setLoadingId(templateId);
    setError(null);
    const res = await fetch("/api/documents/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, templateId }),
    });
    const json = await res.json();
    setLoadingId(null);
    if (!res.ok) {
      setError(json.error || "Generation failed");
      return;
    }
    setDocuments(json.documents);
  }

  return (
    <div className="space-y-5 text-sm">
      <ul className="space-y-2">
        {studentTemplates.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-2"
          >
            <span className="font-medium text-[var(--navy)]">{t.label}</span>
            <button
              type="button"
              className="btn-secondary"
              disabled={loadingId === t.id}
              onClick={() => generate(t.id)}
            >
              {loadingId === t.id ? "Generating…" : "Generate PDF"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-red-600">{error}</p>}
      <div>
        <h3 className="mb-2 font-semibold text-[var(--navy)]">
          Generated for this student
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
                  ({new Date(d.created_at).toLocaleString()})
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
