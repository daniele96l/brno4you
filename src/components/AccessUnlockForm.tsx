"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { explainApiError } from "@/lib/api-error";

type Props = {
  /** When set (from approval email), only document number is required. */
  token?: string;
};

export function AccessUnlockForm({ token }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/apply/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token || undefined,
          email: token ? undefined : email,
          document_number: documentNumber,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          explainApiError(json.error, "Could not open your participant profile"),
        );
        return;
      }
      router.replace(`/apply/student/${json.studentId}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open your participant profile",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!token && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--navy)]">
            Email used in your application
          </span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="name@example.com"
          />
        </label>
      )}
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-[var(--navy)]">
          Document number (as on your ID / passport)
        </span>
        <input
          className="input"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          required
          autoComplete="off"
          placeholder="e.g. 214320826"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700 whitespace-pre-line">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Opening…" : "Open my profile"}
      </button>
    </form>
  );
}
