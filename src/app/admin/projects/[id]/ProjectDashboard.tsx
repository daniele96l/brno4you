"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GeneratedDocument, Student } from "@/lib/types";
import type { Partner } from "@/lib/partners";
import type { MobilityProject } from "@/lib/project-packs";
import {
  availableStudentTemplateIds,
  partnershipTemplateId,
  projectTypeLabel,
  requiredStudentTemplateIds,
  signableStudentTemplateIds,
} from "@/lib/project-packs";

type TemplateItem = {
  id: string;
  label: string;
  scope: "student" | "general";
};

type Tab = "participants" | "partners" | "documents" | "settings";

type Props = {
  project: MobilityProject;
  students: Student[];
  partners: Partner[];
  templates: TemplateItem[];
  documents: GeneratedDocument[];
  allProjects: MobilityProject[];
  initialTab?: Tab;
};

export function ProjectDashboard({
  project: initialProject,
  students: initialStudents,
  partners,
  templates,
  documents: initialDocs,
  allProjects,
  initialTab = "participants",
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [project, setProject] = useState(initialProject);
  const [students, setStudents] = useState(initialStudents);
  const [docs, setDocs] = useState(initialDocs);
  const [partnerId, setPartnerId] = useState(partners[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const studentTemplates = useMemo(() => {
    const allowed = new Set(availableStudentTemplateIds(project));
    return templates.filter(
      (t) => t.scope === "student" && allowed.has(t.id),
    );
  }, [templates, project]);

  const partnershipId = partnershipTemplateId(project.type);
  const partnershipTemplate = templates.find((t) => t.id === partnershipId);

  const [docTemplateId, setDocTemplateId] = useState(
    studentTemplates[0]?.id || partnershipId,
  );

  const coverage = useMemo(() => {
    return students.map((s) => {
      const pack = signableStudentTemplateIds(project, s);
      const generated = pack.filter((tid) =>
        docs.some((d) => d.student_id === s.id && d.template_id === tid),
      ).length;
      const signed = pack.filter((tid) =>
        docs.some(
          (d) =>
            d.student_id === s.id &&
            d.template_id === tid &&
            d.status === "signed",
        ),
      ).length;
      return {
        id: s.id,
        generated,
        signed,
        total: pack.length,
      };
    });
  }, [students, docs, project]);

  const coverageMap = Object.fromEntries(coverage.map((c) => [c.id, c]));

  async function copyInvite() {
    const url = `${window.location.origin}/apply/${project.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function toggleTravel(student: Student) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        needs_travel_declaration: !student.needs_travel_declaration,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Update failed");
      return;
    }
    setStudents((prev) =>
      prev.map((s) => (s.id === student.id ? json.student : s)),
    );
  }

  async function reassign(student: Student, projectId: string) {
    if (projectId === student.project_id) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Reassign failed");
      return;
    }
    setStudents((prev) => prev.filter((s) => s.id !== student.id));
    router.refresh();
  }

  async function generate(studentId: string | null, templateId: string) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/documents/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        templateId,
        partnerId: templateId.startsWith("partnership_")
          ? partnerId || null
          : null,
        projectId: project.id,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Generation failed");
      return;
    }
    const created = json.document as GeneratedDocument;
    setDocs((prev) => [created, ...prev.filter((d) => d.id !== created.id)]);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Save failed");
      return;
    }
    setProject(json.project);
    setMessage("Settings saved");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "participants", label: "Participants" },
    { id: "partners", label: "Partners" },
    { id: "documents", label: "Documents" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="text-sm font-medium text-[var(--navy)] hover:underline"
          >
            ← Projects
          </Link>
          <div className="mt-2">
            <span className="rounded-full bg-[var(--sky)] px-2.5 py-0.5 text-xs font-bold text-[var(--navy)]">
              {projectTypeLabel(project.type)}
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-extrabold text-[var(--navy)]">
            {project.name}
          </h1>
        </div>
        <button type="button" className="btn-secondary" onClick={copyInvite}>
          {copied ? "Copied!" : "Copy invite link"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === t.id
                ? "bg-[var(--navy)] text-white"
                : "bg-[var(--sky)] text-[var(--navy)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {tab === "participants" && (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Generated</th>
                <th className="px-4 py-3 font-medium">Signed</th>
                <th className="px-4 py-3 font-medium">Travel declaration</th>
                <th className="px-4 py-3 font-medium">Move to</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-[var(--muted)]">
                    No participants yet. Share the invite link.
                  </td>
                </tr>
              )}
              {students.map((s) => {
                const c = coverageMap[s.id] || {
                  generated: 0,
                  signed: 0,
                  total: 0,
                };
                return (
                  <tr
                    key={s.id}
                    className="border-b border-[var(--line)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="font-medium text-[var(--navy)] hover:underline"
                      >
                        {s.first_name} {s.surname}
                      </Link>
                      <div className="text-xs text-[var(--muted)]">{s.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          s.id_verification_status === "matched"
                            ? "bg-emerald-100 text-emerald-900"
                            : s.id_verification_status === "mismatch_dismissed"
                              ? "bg-orange-100 text-orange-900"
                              : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {s.id_verification_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {c.generated}/{c.total}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {c.signed}/{c.total}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={loading}
                        onClick={() => toggleTravel(s)}
                      >
                        {s.needs_travel_declaration
                          ? "Required ✓"
                          : "Not required"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="input max-w-[200px]"
                        value={s.project_id}
                        disabled={loading}
                        onChange={(e) => reassign(s, e.target.value)}
                      >
                        {allProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "partners" && (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Organisation</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">OID</th>
                <th className="px-4 py-3 font-medium">Coordinator</th>
              </tr>
            </thead>
            <tbody>
              {partners.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-[var(--muted)]">
                    No partners on this project yet.
                  </td>
                </tr>
              )}
              {partners.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[var(--line)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-[var(--navy)]">
                    {p.name}
                  </td>
                  <td className="px-4 py-3">{p.country}</td>
                  <td className="px-4 py-3">{p.oid}</td>
                  <td className="px-4 py-3">{p.coordinator_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "documents" && (
        <div className="panel space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {studentTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDocTemplateId(t.id)}
                className={`rounded-xl px-3 py-2 text-sm ${
                  docTemplateId === t.id
                    ? "bg-[var(--navy)] text-white"
                    : "bg-[var(--sky)] text-[var(--navy)]"
                }`}
              >
                {t.label}
              </button>
            ))}
            {partnershipTemplate && (
              <button
                type="button"
                onClick={() => setDocTemplateId(partnershipTemplate.id)}
                className={`rounded-xl px-3 py-2 text-sm ${
                  docTemplateId === partnershipTemplate.id
                    ? "bg-[var(--navy)] text-white"
                    : "bg-[var(--sky)] text-[var(--navy)]"
                }`}
              >
                {partnershipTemplate.label}
              </button>
            )}
          </div>

          {docTemplateId.startsWith("partnership_") ? (
            <div className="space-y-3">
              <label className="block space-y-1 text-sm">
                <span className="font-medium text-[var(--navy)]">Partner</span>
                <select
                  className="input max-w-md"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={loading || !partnerId}
                onClick={() => generate(null, docTemplateId)}
              >
                Generate partnership PDF
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-[var(--line)] text-[var(--muted)]">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Student</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const doc = docs.find(
                      (d) =>
                        d.student_id === s.id &&
                        d.template_id === docTemplateId,
                    );
                    const required = requiredStudentTemplateIds(project, s);
                    const needed = required.includes(docTemplateId);
                    const statusLabel = !doc
                      ? needed
                        ? "missing"
                        : "—"
                      : doc.status === "signed"
                        ? "signed"
                        : "generated";
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-[var(--line)] last:border-0"
                      >
                        <td className="py-3 pr-3">
                          {s.first_name} {s.surname}
                          {!needed && (
                            <span className="ml-2 text-xs text-[var(--muted)]">
                              (optional)
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          {statusLabel}
                          {doc?.signed_at && (
                            <div className="text-xs text-[var(--muted)]">
                              {new Date(doc.signed_at).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-secondary"
                              disabled={loading || doc?.status === "signed"}
                              onClick={() => generate(s.id, docTemplateId)}
                            >
                              {doc ? "Regenerate" : "Generate"}
                            </button>
                            {doc && (
                              <a
                                className="btn-secondary"
                                href={`/api/documents/${doc.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Review
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "settings" && (
        <form onSubmit={saveSettings} className="panel space-y-4 p-6">
          {(
            [
              ["name", "Display name"],
              ["slug", "Invite slug (/apply/…)"],
              ["project_name", "Project name (in documents)"],
              ["accreditation_no", "Accreditation No."],
              ["project_no", "Project No."],
              ["project_period", "Project period"],
              ["dates", "Dates"],
              ["venue", "Venue"],
              ["coordinator_name", "Coordinator name"],
              ["coordinator_email", "Coordinator email"],
              ["coordinator_phone", "Coordinator phone"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block space-y-1 text-sm">
              <span className="font-medium text-[var(--navy)]">{label}</span>
              <input
                className="input"
                value={String(project[key] ?? "")}
                onChange={(e) =>
                  setProject({ ...project, [key]: e.target.value })
                }
              />
            </label>
          ))}
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Saving…" : "Save settings"}
          </button>
        </form>
      )}
    </div>
  );
}
