"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeneratedDocument, Student } from "@/lib/types";

type TemplateItem = { id: string; label: string };

type Props = {
  student: Student;
  unlocked: boolean;
};

export function ParticipantDocuments({ student, unlocked }: Props) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [docs, setDocs] = useState<GeneratedDocument[]>([]);
  const [required, setRequired] = useState<string[]>([]);
  const [signableIds, setSignableIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(
    `${student.first_name} ${student.surname}`.trim(),
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/students/${student.id}/documents`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not load documents");
      return;
    }
    setDocs(json.documents || []);
    setRequired(json.requiredTemplateIds || []);
    setSignableIds(json.signableTemplateIds || json.requiredTemplateIds || []);
    setTemplates(json.templates || []);
  }, [student.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!unlocked) return;
    void (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/students/${student.id}/documents`, {
        method: "POST",
      });
      const json = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(json.error || "Could not prepare documents");
        return;
      }
      setDocs(json.documents || []);
      await load();
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    })();
  }, [unlocked, student.id, load]);

  function labelFor(templateId: string) {
    return templates.find((t) => t.id === templateId)?.label || templateId;
  }

  function docFor(templateId: string) {
    return docs.find((d) => d.template_id === templateId);
  }

  function setupCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }

  useEffect(() => {
    if (signingId) {
      requestAnimationFrame(setupCanvas);
    }
  }, [signingId]);

  function pointerPos(
    e: React.PointerEvent<HTMLCanvasElement>,
  ): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function onPointerUp() {
    drawing.current = false;
  }

  async function confirmSign() {
    if (!signingId || !canvasRef.current) return;
    setLoading(true);
    setError(null);
    const signaturePngBase64 = canvasRef.current.toDataURL("image/png");
    const res = await fetch(`/api/documents/${signingId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerName, signaturePngBase64 }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Sign failed");
      return;
    }
    setSigningId(null);
    await load();
  }

  if (!unlocked) {
    return (
      <div
        ref={sectionRef}
        className="rounded-2xl border border-[var(--line)] bg-[var(--sky)]/40 px-4 py-4 text-sm text-[var(--navy)]"
      >
        After you submit and your ID is verified, you will sign each document
        and declaration here (preview → draw signature → confirm).
      </div>
    );
  }

  const signingDoc = signingId
    ? docs.find((d) => d.id === signingId)
    : null;

  const signedRequired = required.filter((tid) => {
    const d = docFor(tid);
    return d?.status === "signed";
  }).length;

  return (
    <div ref={sectionRef} className="space-y-4 scroll-mt-8">
      <div>
        <h2 className="text-lg font-bold text-[var(--navy)]">
          Documents to sign
        </h2>
        <p className="text-sm text-[var(--mint-text)]">
          ID verified. Preview each PDF, then click Sign — draw your signature
          and type your full name.
          {required.length > 0 && (
            <>
              {" "}
              Progress: {signedRequired}/{required.length} required signed
              {loading ? " · preparing…" : ""}.
            </>
          )}
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {signableIds.map((tid) => {
          const d = docFor(tid);
          const isRequired = required.includes(tid);
          const status = !d
            ? loading
              ? "Preparing…"
              : "Not ready"
            : d.status === "signed"
              ? "Signed"
              : "Ready to sign";
          return (
            <li
              key={tid}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] px-4 py-3"
            >
              <div>
                <div className="font-medium text-[var(--navy)]">
                  {labelFor(tid)}
                  {isRequired ? (
                    <span className="ml-2 text-xs font-semibold text-[var(--mint-text)]">
                      Required
                    </span>
                  ) : (
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      Optional
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--mint-text)]">{status}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {d && (
                  <a
                    className="btn-secondary"
                    href={`/api/documents/${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview
                  </a>
                )}
                {d && d.status !== "signed" && (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={loading}
                    onClick={() => {
                      setSignerName(
                        `${student.first_name} ${student.surname}`.trim(),
                      );
                      setSigningId(d.id);
                    }}
                  >
                    Sign
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {signableIds.length === 0 && !loading && (
          <li className="text-sm text-[var(--muted)]">
            Preparing your documents…
          </li>
        )}
      </ul>

      {signingDoc && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--navy)]">
              Sign: {labelFor(signingDoc.template_id)}
            </h3>
            <p className="text-sm text-[var(--mint-text)]">
              Open the PDF, read it, then draw your signature and type your name
              to confirm.
            </p>
            <a
              className="btn-secondary inline-flex"
              href={`/api/documents/${signingDoc.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Open PDF to review
            </a>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-[var(--navy)]">
                Full name (typed)
              </span>
              <input
                className="input"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </label>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--navy)]">
                  Draw signature
                </span>
                <button
                  type="button"
                  className="text-xs text-[var(--mint-text)] underline"
                  onClick={setupCanvas}
                >
                  Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={400}
                height={140}
                className="w-full touch-none rounded-xl border border-[var(--line)] bg-white"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={loading}
                onClick={confirmSign}
              >
                {loading ? "Signing…" : "Confirm signature"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSigningId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
