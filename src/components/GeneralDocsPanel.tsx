"use client";

import { useState } from "react";

type TemplateItem = {
  id: string;
  label: string;
  scope: "student" | "general";
};

export function GeneralDocsPanel({ templates }: { templates: TemplateItem[] }) {
  const general = templates.filter((t) => t.scope === "general");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function generate(templateId: string) {
    setLoadingId(templateId);
    setError(null);
    setLastUrl(null);
    const res = await fetch("/api/documents/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, studentId: null }),
    });
    const json = await res.json();
    setLoadingId(null);
    if (!res.ok) {
      setError(json.error || "Generation failed");
      return;
    }
    setLastUrl(`/api/documents/${json.document.id}`);
  }

  return (
    <div className="panel space-y-3 p-5">
      <h2 className="text-base font-bold text-[var(--navy)]">
        General / partnership documents
      </h2>
      <p className="text-sm text-[var(--mint-text)]">
        Filled from project settings only. Partner organisation fields stay blank.
      </p>
      <ul className="space-y-2 text-sm">
        {general.map((t) => (
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      {lastUrl && (
        <a className="btn-primary inline-flex" href={lastUrl} target="_blank" rel="noreferrer">
          Download last generated PDF
        </a>
      )}
    </div>
  );
}
