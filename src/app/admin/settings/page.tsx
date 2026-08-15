"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProjectSettings } from "@/lib/documents/templates";

const FIELDS: { key: keyof ProjectSettings; label: string }[] = [
  { key: "project_name", label: "Project name" },
  { key: "accreditation_no", label: "Accreditation No." },
  { key: "project_no", label: "Project No." },
  { key: "project_period", label: "Project period" },
  { key: "dates", label: "Dates (including travel days)" },
  { key: "venue", label: "Venue (place, country)" },
  { key: "coordinator_name", label: "Coordinator name" },
  { key: "coordinator_email", label: "Coordinator email" },
  { key: "coordinator_phone", label: "Coordinator phone" },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (res.ok) setSettings(json.settings);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      setSettings(json.settings);
      setMessage("Saved");
    }
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-[var(--mint-text)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <Link href="/admin" className="text-sm font-medium text-[var(--navy)] hover:underline">
          ← Students
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold text-[var(--navy)]">
          Project settings
        </h1>
        <p className="mt-2 text-sm text-[var(--mint-text)]">
          Shared fields filled into every generated document (including
          partnership agreements). Partner organisation blanks stay empty for
          now.
        </p>
      </div>

      <form onSubmit={save} className="panel space-y-4 p-6">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="block space-y-1 text-sm">
            <span className="font-medium text-[var(--navy)]">{label}</span>
            <input
              className="input"
              value={String(settings[key] ?? "")}
              onChange={(e) =>
                setSettings({ ...settings, [key]: e.target.value })
              }
            />
          </label>
        ))}
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
