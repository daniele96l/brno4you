"use client";

import { useState } from "react";
import type { GeneratedDocument } from "@/lib/types";

type Props = {
  studentId: string;
  templates: { id: string; label: string }[];
  initialDocuments: GeneratedDocument[];
};

export function GenerateDocumentForm({
  studentId,
  templates,
  initialDocuments,
}: Props) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [documents, setDocuments] = useState(initialDocuments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/documents/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, templateId }),
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
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1.5">
          <span className="font-medium">Template</span>
          <select
            className="input"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-primary"
          disabled={loading || !templateId}
          onClick={generate}
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <ul className="space-y-2">
        {documents.length === 0 && (
          <li className="text-[var(--muted)]">No documents generated yet.</li>
        )}
        {documents.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3">
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
  );
}
