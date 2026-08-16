import { AccessUnlockForm } from "@/components/AccessUnlockForm";

type Props = { params: Promise<{ token: string }> };

export default async function AccessPage({ params }: Props) {
  const { token } = await params;

  return (
    <div className="relative mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <div className="panel relative space-y-6 px-6 py-8 sm:px-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">
            Open your application
          </h1>
          <p className="mt-3 text-[var(--mint-text)]">
            Enter the document number from your ID or passport to continue —
            upload your ID and sign the project documents.
          </p>
        </div>
        <AccessUnlockForm token={token} />
      </div>
    </div>
  );
}
