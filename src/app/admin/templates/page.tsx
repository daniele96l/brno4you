"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DocTemplate } from "@/lib/documents/templates";

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<DocTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/templates");
      const json = await res.json();
      if (res.ok) {
        setTemplates(json.templates);
        if (json.templates[0]) {
          setSelectedId(json.templates[0].id);
          setDraft(json.templates[0]);
        }
      }
    })();
  }, []);

  function selectTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    setSelectedId(id);
    setDraft(t ? { ...t } : null);
    setMessage(null);
    setError(null);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/admin/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Save failed");
      return;
    }
    setTemplates((prev) =>
      prev.map((t) => (t.id === json.template.id ? json.template : t)),
    );
    setDraft(json.template);
    setMessage("Saved");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <Link href="/admin" className="text-sm font-medium text-[var(--navy)] hover:underline">
          ← Students
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold text-[var(--navy)]">
          Document templates
        </h1>
        <p className="mt-2 text-sm text-[var(--mint-text)]">
          Edit template text here. Use placeholders like{" "}
          <code className="rounded bg-black/5 px-1">{"{{full_name}}"}</code>,{" "}
          <code className="rounded bg-black/5 px-1">{"{{birth_date}}"}</code>,{" "}
          <code className="rounded bg-black/5 px-1">{"{{project_name}}"}</code>,{" "}
          <code className="rounded bg-black/5 px-1">{"{{dates}}"}</code>,{" "}
          <code className="rounded bg-black/5 px-1">{"{{venue}}"}</code>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="panel space-y-1 p-3">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTemplate(t.id)}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${
                selectedId === t.id
                  ? "bg-[var(--navy)] text-white"
                  : "hover:bg-[var(--sky)] text-[var(--navy)]"
              }`}
            >
              <span className="font-semibold">{t.label}</span>
              <span className="mt-0.5 block text-xs opacity-80">{t.scope}</span>
            </button>
          ))}
        </aside>

        {draft && (
          <div className="panel space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-[var(--navy)]">Label</span>
                <input
                  className="input"
                  value={draft.label}
                  onChange={(e) =>
                    setDraft({ ...draft, label: e.target.value })
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-[var(--navy)]">Scope</span>
                <select
                  className="input"
                  value={draft.scope}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      scope: e.target.value as "student" | "general",
                    })
                  }
                >
                  <option value="student">Student</option>
                  <option value="general">General / project</option>
                </select>
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-[var(--navy)]">Body</span>
              <textarea
                className="input min-h-[420px] rounded-2xl font-mono text-xs leading-relaxed"
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Saving…" : "Save template"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
