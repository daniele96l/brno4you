"use client";

import { useState } from "react";
import { explainApiError } from "@/lib/api-error";
import type { Student } from "@/lib/types";

type Props = {
  student: Student;
  onUpdate: (student: Student) => void;
};

export function TravelPlanForm({ student, onUpdate }: Props) {
  const [text, setText] = useState(student.travel_plan_text || "");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (student.travel_plan_status === "none") return null;

  if (student.travel_plan_status === "submitted") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
        <p className="font-bold text-[var(--navy)]">Travel plan submitted</p>
        <p className="mt-2 whitespace-pre-wrap">{student.travel_plan_text}</p>
        {student.travel_plan_files?.length > 0 && (
          <ul className="mt-2 list-disc pl-5">
            {student.travel_plan_files.map((f) => (
              <li key={f.path}>{f.filename}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("text", text);
      if (files) {
        Array.from(files).forEach((f) => form.append("files", f));
      }
      const res = await fetch(`/api/students/${student.id}/travel-plan`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(explainApiError(json.error, "Could not submit travel plan"));
        return;
      }
      onUpdate(json.student);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4"
    >
      <div>
        <h2 className="text-base font-bold text-[var(--navy)]">
          Travel plan requested
        </h2>
        <p className="mt-1 text-sm text-amber-950">
          Tell us from where, when, and how you will travel. You can attach
          tickets, screenshots, or photos.
        </p>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--navy)]">Your travel plan</span>
        <textarea
          className="input min-h-[120px] bg-white"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          placeholder="e.g. Flight Prague → Brno on 12 July, then train…"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--navy)]">
          Attachments (optional)
        </span>
        <input
          type="file"
          multiple
          accept="image/*,.pdf,application/pdf"
          className="input bg-white"
          onChange={(e) => setFiles(e.target.files)}
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Submitting…" : "Submit travel plan"}
      </button>
    </form>
  );
}
