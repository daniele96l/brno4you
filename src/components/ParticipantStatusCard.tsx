import type { ParticipationStatus } from "@/lib/types";

export function ParticipantStatusCard({
  status,
  projectName,
}: {
  status: ParticipationStatus;
  projectName?: string | null;
}) {
  if (status === "registered") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
        <p className="font-bold text-[var(--navy)]">Waiting for approval</p>
        <p className="mt-1">
          Your application
          {projectName ? ` for ${projectName}` : ""} was received. The
          organisation has not decided yet. You will get an email when you are
          approved.
        </p>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-950">
        <p className="font-bold">Not approved</p>
        <p className="mt-1">
          Your application
          {projectName ? ` for ${projectName}` : ""} was not selected for this
          project. Contact the organisers if you have questions.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
      <p className="font-bold text-[var(--navy)]">Approved</p>
      <p className="mt-1">
        You are accepted
        {projectName ? ` for ${projectName}` : ""}. Upload your ID if needed,
        then sign the documents below.
      </p>
    </div>
  );
}
