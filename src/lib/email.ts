import { Resend } from "resend";

function appBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function accessLinkForToken(token: string) {
  return `${appBaseUrl().replace(/\/$/, "")}/apply/access/${token}`;
}

export async function sendApprovalEmail(opts: {
  to: string;
  firstName: string;
  projectName: string;
  accessToken: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Brno4You <onboarding@resend.dev>";
  if (!apiKey) {
    throw new Error(
      "Email is not configured (RESEND_API_KEY). Set it in Vercel env to send approval emails.",
    );
  }

  const link = accessLinkForToken(opts.accessToken);
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: `You're approved for ${opts.projectName}`,
    text:
      `Hi ${opts.firstName},\n\n` +
      `You have been approved for ${opts.projectName}.\n\n` +
      `Open this link and enter your ID / passport document number to continue ` +
      `(upload your ID and sign the required documents):\n\n` +
      `${link}\n\n` +
      `Brno4You\n`,
    html:
      `<p>Hi ${escapeHtml(opts.firstName)},</p>` +
      `<p>You have been approved for <strong>${escapeHtml(opts.projectName)}</strong>.</p>` +
      `<p>Open the link below and enter your <strong>ID / passport document number</strong> to access your application, upload your ID, and sign the documents.</p>` +
      `<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>` +
      `<p>Brno4You</p>`,
  });
  if (error) {
    throw new Error(error.message || "Failed to send approval email");
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
