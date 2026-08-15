"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { explainApiError } from "@/lib/api-error";
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [signingOpen, setSigningOpen] = useState(false);
  const [signerName, setSignerName] = useState(
    `${student.first_name} ${student.surname}`.trim(),
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/students/${student.id}/documents`);
      const json = await res.json();
      if (!res.ok) {
        setError(
          explainApiError(
            json.error,
            "Could not load your documents — refresh the page",
          ),
        );
        return;
      }
      setError(null);
      setDocs(json.documents || []);
      setRequired(json.requiredTemplateIds || []);
      setSignableIds(json.signableTemplateIds || json.requiredTemplateIds || []);
      setTemplates(json.templates || []);
    } catch (e) {
      setError(
        e instanceof Error
          ? explainApiError(e.message, "Could not load your documents")
          : "Could not load your documents — check your connection",
      );
    }
  }, [student.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!unlocked) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/students/${student.id}/documents`, {
          method: "POST",
        });
        const json = await res.json();
        if (!res.ok) {
          setError(
            explainApiError(
              json.error,
              "Could not prepare documents for signing — try refreshing",
            ),
          );
          setLoading(false);
          return;
        }
        setDocs(json.documents || []);
        if (json.signableTemplateIds) setSignableIds(json.signableTemplateIds);
        if (json.requiredTemplateIds) setRequired(json.requiredTemplateIds);
        await load();
        sectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } catch (e) {
        setError(
          e instanceof Error
            ? explainApiError(e.message, "Could not prepare documents")
            : "Could not prepare documents — check your connection",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [unlocked, student.id, load]);

  function labelFor(templateId: string) {
    return templates.find((t) => t.id === templateId)?.label || templateId;
  }

  function docFor(templateId: string) {
    return docs.find((d) => d.template_id === templateId);
  }

  useEffect(() => {
    if (!signableIds.length) return;
    const idx = signableIds.findIndex((tid) => {
      const d = docs.find((x) => x.template_id === tid);
      return !d || d.status !== "signed";
    });
    if (idx >= 0) setActiveIndex(idx);
  }, [signableIds, docs]);

  const currentId = signableIds[activeIndex];
  const currentDoc = currentId ? docFor(currentId) : undefined;
  const allSigned = useMemo(
    () =>
      signableIds.length > 0 &&
      signableIds.every((tid) => docFor(tid)?.status === "signed"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signableIds, docs],
  );

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
    if (signingOpen) requestAnimationFrame(setupCanvas);
  }, [signingOpen]);

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
    if (!currentDoc || !canvasRef.current) return;
    if (!signerName.trim()) {
      setError("Type your full name before confirming the signature.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const signaturePngBase64 = canvasRef.current.toDataURL("image/png");
      const res = await fetch(`/api/documents/${currentDoc.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signaturePngBase64 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          explainApiError(
            json.error,
            "Signing failed — draw your signature, type your name, and try again",
          ),
        );
        return;
      }
      setSigningOpen(false);
      await load();
      const next = signableIds.findIndex((tid, i) => {
        if (i <= activeIndex) return false;
        const d = docs.find((x) => x.template_id === tid);
        return !d || d.status !== "signed" || tid !== currentId;
      });
      if (next >= 0) setActiveIndex(next);
      else setActiveIndex(Math.min(activeIndex + 1, signableIds.length - 1));
    } catch (e) {
      setError(
        e instanceof Error
          ? explainApiError(e.message, "Signing failed")
          : "Signing failed — check your connection",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!unlocked) {
    return null;
  }

  const signedCount = signableIds.filter(
    (tid) => docFor(tid)?.status === "signed",
  ).length;

  return (
    <div ref={sectionRef} className="space-y-4 scroll-mt-8">
      <div>
        <h2 className="text-lg font-bold text-[var(--navy)]">
          Sign with your verified ID
        </h2>
        <p className="text-sm text-[var(--mint-text)]">
          Your ID was checked. Sign one document at a time
          {signableIds.length
            ? ` (${signedCount}/${signableIds.length} done)`
            : ""}
          {loading ? " · preparing PDFs…" : ""}.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 whitespace-pre-line"
        >
          {error}
        </p>
      )}

      {allSigned ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          All documents are signed. You can close this page.
        </div>
      ) : (
        currentId && (
          <div className="space-y-4 rounded-2xl border-2 border-[var(--navy)] bg-white px-4 py-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mint-text)]">
                Document {activeIndex + 1} of {signableIds.length}
              </p>
              {required.includes(currentId) ? (
                <span className="text-xs font-semibold text-[var(--navy)]">
                  Required
                </span>
              ) : (
                <span className="text-xs text-[var(--muted)]">Optional</span>
              )}
            </div>
            <h3 className="text-xl font-extrabold text-[var(--navy)]">
              {labelFor(currentId)}
            </h3>
            <p className="text-sm text-[var(--mint-text)]">
              Filled with your application data and linked to the ID you
              uploaded.
            </p>

            {!currentDoc && !loading && (
              <p className="text-sm text-amber-900">
                This PDF isn’t ready yet. Wait a moment or refresh the page.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {currentDoc && (
                <a
                  className="btn-secondary"
                  href={`/api/documents/${currentDoc.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  1. Preview PDF
                </a>
              )}
              {currentDoc && currentDoc.status !== "signed" && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={loading || !currentDoc}
                  onClick={() => {
                    setError(null);
                    setSignerName(
                      `${student.first_name} ${student.surname}`.trim(),
                    );
                    setSigningOpen(true);
                  }}
                >
                  2. Sign this document
                </button>
              )}
              {currentDoc?.status === "signed" && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900">
                  Signed
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
              <button
                type="button"
                className="btn-secondary"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={activeIndex >= signableIds.length - 1}
                onClick={() =>
                  setActiveIndex((i) =>
                    Math.min(signableIds.length - 1, i + 1),
                  )
                }
              >
                Next document
              </button>
            </div>
          </div>
        )
      )}

      {!allSigned && !currentId && !loading && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
          No documents are ready to sign yet. If this stays empty, refresh or
          contact the organisers.
        </p>
      )}

      <ol className="space-y-2">
        {signableIds.map((tid, i) => {
          const d = docFor(tid);
          const signed = d?.status === "signed";
          const isActive = i === activeIndex && !allSigned;
          return (
            <li key={tid}>
              <button
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm ${
                  isActive
                    ? "border-[var(--navy)] bg-[var(--sky)]/50"
                    : "border-[var(--line)] bg-white"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    signed
                      ? "bg-emerald-600 text-white"
                      : isActive
                        ? "bg-[var(--navy)] text-white"
                        : "bg-[var(--sky)] text-[var(--navy)]"
                  }`}
                >
                  {signed ? "✓" : i + 1}
                </span>
                <span className="font-medium text-[var(--navy)]">
                  {labelFor(tid)}
                </span>
                <span className="ml-auto text-xs text-[var(--muted)]">
                  {signed ? "Signed" : d ? "Not signed" : "Preparing…"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {signingOpen && currentDoc && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-[var(--navy)]">
              Sign: {labelFor(currentDoc.template_id)}
            </h3>
            <p className="text-sm text-[var(--mint-text)]">
              Your identity was verified with the ID you uploaded. Draw your
              signature and type your full name.
            </p>
            {error && (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 whitespace-pre-line"
              >
                {error}
              </p>
            )}
            <a
              className="btn-secondary inline-flex"
              href={`/api/documents/${currentDoc.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Open PDF again
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
                onClick={() => setSigningOpen(false)}
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
