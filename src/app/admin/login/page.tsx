"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Invalid password");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="relative mx-auto max-w-md px-4 py-14">
      <div
        className="blob bg-[var(--lavender)]"
        style={{
          width: 200,
          aspectRatio: "1",
          top: 0,
          right: -30,
          opacity: 0.55,
        }}
      />
      <div className="panel relative px-6 py-8 sm:px-8">
        <h1 className="text-3xl font-extrabold text-[var(--navy)]">Admin login</h1>
        <p className="mt-2 text-sm text-[var(--mint-text)]">
          Enter the administrator password to review students and generate
          documents.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block space-y-1.5 text-sm font-medium text-[var(--navy)]">
            <span>Password</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
