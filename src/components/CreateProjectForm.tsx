"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { explainApiError } from "@/lib/api-error";
import type { ProjectType } from "@/lib/project-packs";

export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("youth_exchange");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter a project name before creating.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          explainApiError(json.error, "Could not create the project — try again"),
        );
        return;
      }
      router.push(`/admin/projects/${json.project.id}?tab=registration`);
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
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--navy)]">Name</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. YE Brno Summer 2026"
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
