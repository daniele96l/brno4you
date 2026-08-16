import { AccessUnlockForm } from "@/components/AccessUnlockForm";
import Link from "next/link";

export default function ParticipantPortalPage() {
  return (
    <div className="relative mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <div className="panel relative space-y-6 px-6 py-8 sm:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--mint-text)]">
            Participant portal
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
            Open your profile
          </h1>
          <p className="mt-3 text-[var(--mint-text)]">
            Enter the email and document number from your registration to see
            your application status and (if approved) the documents to sign.
          </p>
        </div>
        <AccessUnlockForm />
        <p className="text-sm text-[var(--muted)]">
          New applicant?{" "}
          <Link href="/apply" className="font-medium text-[var(--navy)] underline">
            Choose a project and apply
          </Link>
        </p>
      </div>
    </div>
  );
}
