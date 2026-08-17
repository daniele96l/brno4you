"use client";

import { useEffect, useMemo, useState } from "react";
import { explainApiError } from "@/lib/api-error";
import type { GeneratedDocument, Student } from "@/lib/types";

type TemplateItem = { id: string; label: string };

type Props = {
  student: Student;
  templates: TemplateItem[];
  documents: GeneratedDocument[];
  onStudentUpdate: (student: Student) => void;
};

export function AdminParticipantDocsPanel({
  student,
  templates,
  documents,
  onStudentUpdate,
}: Props) {
  const [selected, setSelected] = useState<string[]>(
    student.requested_template_ids || [],
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelected(student.requested_template_ids || []);
  }, [student.id, student.requested_template_ids]);

  const signedIds = useMemo(() => {
    return new Set(
      documents
        .filter((d) => d.status === "signed")
        .map((d) => d.template_id),
    );
  }, [documents]);

  const allRequestedSigned =
    selected.length > 0 && selected.every((id) => signedIds.has(id));

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function saveDocs() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requested_template_ids: selected }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(explainApiError(json.error, "Could not save document selection"));
        return;
      }
      onStudentUpdate(json.student);
      setMessage(
        selected.length
          ? "Saved. Copy the invite link — their portal will show only these documents, prefilled from registration."
          : "Cleared document requests.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyInvite() {
    const url = student.access_token
      ? `${window.location.origin}/apply/access/${student.access_token}`
      : `${window.location.origin}/apply/portal`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function requestTravelPlan() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ travel_plan_status: "requested" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(explainApiError(json.error, "Could not request travel plan"));
        return;
      }
      onStudentUpdate(json.student);
      setMessage("Travel plan requested. Participant will see it in their portal.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (student.participation_status !== "approved") {
    return (
      <div className="panel space-y-2 px-5 py-5 text-sm text-[var(--muted)]">
        <h2 className="text-base font-semibold text-[var(--navy)]">
          Documents to sign
        </h2>
        <p>
          Approve this participant first, then choose which documents they must
          sign.
        </p>
      </div>
    );
  }

  return (
    <div className="panel space-y-4 px-5 py-5">
      <div>
        <h2 className="text-base font-semibold text-[var(--navy)]">
          Documents to sign
        </h2>
        <p className="mt-1 text-sm text-[var(--mint-text)]">
          Tick only the documents this person must sign. PDFs are filled from
          their registration data when they open the portal.
        </p>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No student document templates available for this project.
        </p>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => {
            const checked = selected.includes(t.id);
            const signed = signedIds.has(t.id);
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              >
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(t.id)}
                  />
                  <span>{t.label}</span>
                </label>
                {signed ? (
                  <span className="text-xs font-semibold text-emerald-800">
                    Signed
                  </span>
                ) : checked ? (
                  <span className="text-xs text-amber-800">Requested</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={loading}
          onClick={() => void saveDocs()}
        >
          {loading ? "Saving…" : "Save document requests"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void copyInvite()}
        >
          {copied ? "Copied!" : "Copy invite link"}
        </button>
      </div>

      {allRequestedSigned && student.travel_plan_status === "none" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-medium text-emerald-950">
            All requested documents are signed.
          </p>
          <button
            type="button"
            className="btn-primary mt-3"
            disabled={loading}
            onClick={() => void requestTravelPlan()}
          >
            Request travel plan
          </button>
        </div>
      )}

      {student.travel_plan_status === "requested" && (
        <p className="text-sm text-amber-900">
          Travel plan requested — waiting for the participant to submit.
        </p>
      )}

      {student.travel_plan_status === "submitted" && (
        <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--sky)]/20 px-4 py-3 text-sm">
          <p className="font-semibold text-[var(--navy)]">Travel plan submitted</p>
          <p className="whitespace-pre-wrap">{student.travel_plan_text}</p>
          {student.travel_plan_files?.length > 0 && (
            <ul className="list-disc pl-5">
              {student.travel_plan_files.map((f) => (
                <li key={f.path}>
                  <a
                    className="underline"
                    href={`/api/students/${student.id}/travel-plan/files?path=${encodeURIComponent(f.path)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {f.filename}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-800">{message}</p>}
    </div>
  );
}
