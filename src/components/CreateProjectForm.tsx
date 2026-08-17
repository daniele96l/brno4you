"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { explainApiError } from "@/lib/api-error";
import type { ProjectType } from "@/lib/project-packs";

export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("youth_exchange");
  const [projectNo, setProjectNo] = useState("");
  const [dates, setDates] = useState("");
  const [venue, setVenue] = useState("Brno, Czech Republic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter a project name before creating.");
      return;
    }
    if (!projectNo.trim() || !dates.trim() || !venue.trim()) {
      setError(
        "Project number, dates, and venue are required — they appear on documents participants sign.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          project_name: name,
          project_no: projectNo,
          dates,
          venue,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          explainApiError(json.error, "Could not create the project — try again"),
        );
        return;
      }
      router.push(`/admin/projects/${json.project.id}?tab=settings`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? explainApiError(err.message, "Could not create the project")
          : "Could not create the project — check your connection",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-3 p-5">
      <h2 className="text-base font-bold text-[var(--navy)]">New project</h2>
      <p className="text-sm text-[var(--mint-text)]">
        Name, project number, dates and venue are printed on participant
        documents.
      </p>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--navy)]">Project name</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Love Koťátko"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--navy)]">Type</span>
        <select
          className="input"
          value={type}
          onChange={(e) => setType(e.target.value as ProjectType)}
        >
          <option value="youth_exchange">Youth Exchange (YE)</option>
          <option value="training_course">Training Course (TC)</option>
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--navy)]">Project No.</span>
        <input
          className="input"
          value={projectNo}
          onChange={(e) => setProjectNo(e.target.value)}
          required
          placeholder="e.g. 2024-1-CZ01-KA152-YOU-000123456"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--navy)]">
          Dates (including travel days)
        </span>
        <input
          className="input"
          value={dates}
          onChange={(e) => setDates(e.target.value)}
          required
          placeholder="e.g. 12–20 July 2026"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--navy)]">Venue</span>
        <input
          className="input"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          required
          placeholder="Brno, Czech Republic"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600 whitespace-pre-line">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}
