"use client";

import { useEffect, useState } from "react";
import { explainApiError } from "@/lib/api-error";
import {
  CORE_LOCKED_FIELDS,
  HIDEABLE_OPTIONAL_FIELDS,
  normalizeFormConfig,
  type ExtraFormField,
  type ProjectFormConfig,
} from "@/lib/form-config";
import type { MobilityProject } from "@/lib/project-packs";

type Props = {
  project: MobilityProject;
  onSaved: (project: MobilityProject) => void;
};

export function RegistrationFormBuilder({ project, onSaved }: Props) {
  const [config, setConfig] = useState<ProjectFormConfig>(() =>
    normalizeFormConfig(project.form_config),
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(normalizeFormConfig(project.form_config));
  }, [project.id, project.form_config]);

  function toggleHidden(id: string) {
    setConfig((prev) => {
      const has = prev.hiddenOptional.includes(id);
      return {
        ...prev,
        hiddenOptional: has
          ? prev.hiddenOptional.filter((x) => x !== id)
          : [...prev.hiddenOptional, id],
      };
    });
  }

  function addExtra() {
    const id = `extra_${Date.now().toString(36)}`;
    setConfig((prev) => ({
      ...prev,
      extraFields: [
        ...prev.extraFields,
        {
          id,
          label: "",
          type: "text",
          required: false,
        },
      ],
    }));
    setMessage(null);
  }

  function updateExtra(id: string, patch: Partial<ExtraFormField>) {
    setConfig((prev) => ({
      ...prev,
      extraFields: prev.extraFields.map((f) =>
        f.id === id ? { ...f, ...patch } : f,
      ),
    }));
  }

  function removeExtra(id: string) {
    setConfig((prev) => ({
      ...prev,
      extraFields: prev.extraFields.filter((f) => f.id !== id),
    }));
  }

  function moveExtra(id: string, dir: -1 | 1) {
    setConfig((prev) => {
      const idx = prev.extraFields.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.extraFields.length) return prev;
      const copy = [...prev.extraFields];
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return { ...prev, extraFields: copy };
    });
  }

  async function save() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const cleaned: ProjectFormConfig = {
      ...config,
      extraFields: config.extraFields
        .map((f) => ({
          ...f,
          label: f.label.trim(),
          options: f.options?.map((o) => o.trim()).filter(Boolean),
        }))
        .filter((f) => f.label.length > 0),
    };
    if (cleaned.extraFields.length !== config.extraFields.length) {
      setError("Give every extra question a label, or delete empty ones.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...project, form_config: cleaned }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          explainApiError(json.error, "Could not save the registration form"),
        );
        return;
      }
      onSaved(json.project);
      setConfig(normalizeFormConfig(json.project.form_config));
      setMessage("Registration form saved");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save the registration form",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="panel space-y-4 p-5">
        <div>
          <h2 className="text-lg font-bold text-[var(--navy)]">
            Registration form
          </h2>
          <p className="mt-1 text-sm text-[var(--mint-text)]">
            Core identity fields stay fixed. Hide optional ones or add, edit, or
            delete extra questions for this project.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--navy)]">
            Always included
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {CORE_LOCKED_FIELDS.map((f) => (
              <li
                key={f.id}
                className="rounded-full bg-[var(--sky)] px-3 py-1 text-xs font-medium text-[var(--navy)]"
              >
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--navy)]">
            Optional fields
          </h3>
          <ul className="mt-2 space-y-2">
            {HIDEABLE_OPTIONAL_FIELDS.map((f) => {
              const hidden = config.hiddenOptional.includes(f.id);
              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
                >
                  <span>{f.label}</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => toggleHidden(f.id)}
                  >
                    {hidden ? "Hidden" : "Shown"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--navy)]">
                Extra questions
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Add a question, edit the text below, then save. Use Delete to
                remove one.
              </p>
            </div>
            <button type="button" className="btn-primary" onClick={addExtra}>
              Add question
            </button>
          </div>
          {config.extraFields.length === 0 && (
            <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-6 text-center text-sm text-[var(--muted)]">
              No extra questions yet. Click <strong>Add question</strong> to
              create one you can edit or delete.
            </p>
          )}
          {config.extraFields.map((f, index) => (
            <div
              key={f.id}
              className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--mint-text)]">
                  Question {index + 1}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={index === 0}
                    onClick={() => moveExtra(f.id, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={index === config.extraFields.length - 1}
                    onClick={() => moveExtra(f.id, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-100"
                    onClick={() => removeExtra(f.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <label className="block space-y-1 text-sm">
                <span className="font-medium text-[var(--navy)]">
                  Question text
                </span>
                <input
                  className="input"
                  value={f.label}
                  onChange={(e) => updateExtra(f.id, { label: e.target.value })}
                  placeholder="e.g. Dietary requirements"
                  autoFocus={f.label === "" && index === config.extraFields.length - 1}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium text-[var(--navy)]">
                    Answer type
                  </span>
                  <select
                    className="input"
                    value={f.type}
                    onChange={(e) =>
                      updateExtra(f.id, {
                        type: e.target.value as ExtraFormField["type"],
                      })
                    }
                  >
                    <option value="text">Short text</option>
                    <option value="textarea">Long text</option>
                    <option value="select">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) =>
                      updateExtra(f.id, { required: e.target.checked })
                    }
                  />
                  <span className="font-medium text-[var(--navy)]">
                    Required
                  </span>
                </label>
              </div>
              {f.type === "select" && (
                <label className="block space-y-1 text-sm">
                  <span className="font-medium text-[var(--navy)]">
                    Dropdown options
                  </span>
                  <input
                    className="input"
                    value={(f.options || []).join(", ")}
                    onChange={(e) =>
                      updateExtra(f.id, {
                        options: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Option A, Option B, Option C"
                  />
                </label>
              )}
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-800">{message}</p>}

        <button
          type="button"
          className="btn-primary"
          disabled={loading}
          onClick={() => void save()}
        >
          {loading ? "Saving…" : "Save registration form"}
        </button>
      </div>
    </div>
  );
}
