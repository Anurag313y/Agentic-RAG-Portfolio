import { env } from "cloudflare:workers";

export type ContactEmailInput = {
  to: string;
  replyTo: string;
  name: string;
  subject: string;
  message: string;
};

export type ContactMailErrorCode = "NOT_CONFIGURED" | "SEND_FAILED";

export class ContactMailError extends Error {
  readonly code: ContactMailErrorCode;

  constructor(message: string, code: ContactMailErrorCode) {
    super(message);
    this.name = "ContactMailError";
    this.code = code;
  }
}

function getResendApiKey(): string | null {
  return env.RESEND_API_KEY?.trim() || null;
}

function getFromAddress(): string {
  const from = env.RESEND_FROM?.trim();
  if (from) return from;
  return "Portfolio Contact <onboarding@resend.dev>";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendContactEmail(input: ContactEmailInput): Promise<void> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new ContactMailError(
      "Email delivery is not configured. Add RESEND_API_KEY to .dev.vars (local) or Cloudflare secrets (production).",
      "NOT_CONFIGURED",
    );
  }

  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.replyTo);
  const safeSubject = escapeHtml(input.subject);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br />");

  const text = [
    "New message from your portfolio contact form",
    "",
    `Name: ${input.name}`,
    `Email: ${input.replyTo}`,
    `Subject: ${input.subject}`,
    "",
    input.message,
  ].join("\n");

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;line-height:1.5;color:#0f172a">
      <p style="margin:0 0 16px">You received a new message from your portfolio contact form.</p>
      <table style="border-collapse:collapse;width:100%;max-width:520px">
        <tr><td style="padding:6px 12px 6px 0;font-weight:600">Name</td><td>${safeName}</td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:600">Email</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
        <tr><td style="padding:6px 12px 6px 0;font-weight:600">Subject</td><td>${safeSubject}</td></tr>
      </table>
      <p style="margin:20px 0 8px;font-weight:600">Message</p>
      <div style="padding:12px 16px;background:#f1f5f9;border-radius:8px">${safeMessage}</div>
    </div>
  `.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: [input.to],
      reply_to: input.replyTo,
      subject: `[Portfolio] ${input.subject}`,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[contact-mail] Resend failed:", response.status, detail);
    throw new ContactMailError(
      "Could not deliver your message right now. Please try again or use the email link on this page.",
      "SEND_FAILED",
    );
  }
}
