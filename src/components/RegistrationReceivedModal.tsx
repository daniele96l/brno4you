"use client";

import Link from "next/link";

type Props = {
  projectName?: string | null;
  open: boolean;
  onClose: () => void;
};

export function RegistrationReceivedModal({
  projectName,
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-received-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-950 shadow-2xl">
        <p
          id="registration-received-title"
          className="text-lg font-bold text-[var(--navy)]"
        >
          Waiting for approval
        </p>
        <p className="mt-2">
          Your application
          {projectName ? ` for ${projectName}` : ""} was received. The
          organisation has not decided yet. When you are approved, open your
          participant profile again to sign documents.
        </p>
        <p className="mt-2 text-[var(--mint-text)]">
          Use your registration email and ID / passport number to check your
          status anytime.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/apply/portal" className="btn-primary">
            Open participant portal
          </Link>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
