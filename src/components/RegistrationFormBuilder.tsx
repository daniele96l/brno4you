"use client";

import { useState } from "react";
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
          label: "New question",
          type: "text",
          required: false,
        },
      ],
    }));
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

  async function save() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...project, form_config: config }),
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
            Core identity fields stay fixed. Hide optional ones or add extra
            questions for this project.
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
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--navy)]">
              Extra questions
            </h3>
            <button type="button" className="btn-secondary" onClick={addExtra}>
              Add question
            </button>
          </div>
          {config.extraFields.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No extra questions yet.</p>
          )}
          {config.extraFields.map((f) => (
            <div
              key={f.id}
              className="space-y-2 rounded-xl border border-[var(--line)] p-3"
            >
              <input
                className="input"
                value={f.label}
                onChange={(e) => updateExtra(f.id, { label: e.target.value })}
                placeholder="Question label"
              />
              <div className="grid gap-2 sm:grid-cols-3">
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
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) =>
                      updateExtra(f.id, { required: e.target.checked })
                    }
                  />
                  Required
                </label>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => removeExtra(f.id)}
                >
                  Remove
                </button>
              </div>
              {f.type === "select" && (
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
                  placeholder="Options, comma-separated"
                />
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
