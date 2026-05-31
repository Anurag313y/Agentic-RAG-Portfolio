/**
 * SMTP email delivery for Cloudflare Workers.
 *
 * Uses the Workers `connect()` TCP API with TLS to speak SMTP directly
 * to Gmail (or any SMTP server). No third-party email APIs required.
 *
 * The SMTP App Password is resolved from:
 *   1. Env var/secret SMTP_PASS (strictly required from .dev.vars or Cloudflare secrets for security)
 *
 * The "from" email is the admin's profile email (same as SMTP_USER).
 */
import { connect } from "cloudflare:sockets";

import { getSmtpEnvFallback } from "./config.server";
import { fetchAdminContent } from "./content.server";

// ─── Types ────────────────────────────────────────────────────────────
export type ContactEmailInput = {
  to: string;
  replyTo: string;
  name: string;
  phone?: string;
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

// ─── SMTP Config Resolution ──────────────────────────────────────────
async function resolveSmtpCredentials(): Promise<{
  user: string;
  pass: string;
  host: string;
  port: number;
}> {
  const content = await fetchAdminContent();
  const envFallback = getSmtpEnvFallback();

  // Prefer SMTP_USER from env vars because it MUST match the SMTP_PASS.
  // Fallback to profile email if not set.
  const user = envFallback.smtpUser || content.profile.email?.trim();
  if (!user) {
    throw new ContactMailError(
      "SMTP sender email is not configured. Set your email in Admin → Profile & Contact.",
      "NOT_CONFIGURED",
    );
  }

  // SMTP password = env SMTP_PASS only (not stored in admin panel/database for security)
  const pass = envFallback.smtpPass;
  if (!pass) {
    throw new ContactMailError(
      "SMTP App Password is not configured. Add SMTP_PASS to .dev.vars, or set it as a secure secret in Cloudflare.",
      "NOT_CONFIGURED",
    );
  }

  return {
    user,
    pass,
    host: envFallback.smtpHost,
    port: envFallback.smtpPort,
  };
}

// ─── HTML Email Builder ──────────────────────────────────────────────
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailContent(input: ContactEmailInput): { text: string; html: string } {
  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.replyTo);
  const safePhone = input.phone ? escapeHtml(input.phone) : null;
  const safeSubject = escapeHtml(input.subject);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br />");

  const text = [
    "New message from your portfolio contact form",
    "",
    `Name: ${input.name}`,
    `Email: ${input.replyTo}`,
    ...(input.phone ? [`Phone: ${input.phone}`] : []),
    `Subject: ${input.subject}`,
    "",
    input.message,
  ].join("\n");

  const phoneRow = safePhone
    ? `<tr><td style="padding:6px 12px 6px 0;font-weight:600;color:#64748b">Phone</td><td style="color:#0f172a"><a href="tel:${safePhone}" style="color:#0891b2;text-decoration:none">${safePhone}</a></td></tr>`
    : "";

  const html = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#0891b2 0%,#06b6d4 50%,#22d3ee 100%);padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">📬 New Contact Message</h1>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85)">From your portfolio contact form</p>
      </div>
      <div style="background:#ffffff;padding:28px 32px;border:1px solid #e2e8f0;border-top:none">
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:6px 12px 6px 0;font-weight:600;color:#64748b">Name</td><td style="color:#0f172a">${safeName}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;font-weight:600;color:#64748b">Email</td><td><a href="mailto:${safeEmail}" style="color:#0891b2;text-decoration:none">${safeEmail}</a></td></tr>
          ${phoneRow}
          <tr><td style="padding:6px 12px 6px 0;font-weight:600;color:#64748b">Subject</td><td style="color:#0f172a">${safeSubject}</td></tr>
        </table>
        <div style="margin:20px 0 0">
          <div style="font-weight:600;color:#64748b;font-size:13px;margin-bottom:8px">MESSAGE</div>
          <div style="padding:16px 20px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;color:#1e293b;font-size:14px;line-height:1.7">${safeMessage}</div>
        </div>
      </div>
      <div style="background:#f8fafc;padding:16px 32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;text-align:center">
        <p style="margin:0;font-size:11px;color:#94a3b8">Sent via Portfolio Contact Form · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
    </div>
  `.trim();

  return { text, html };
}

// ─── MIME Message Builder ────────────────────────────────────────────
function buildMimeMessage(input: ContactEmailInput, from: string): string {
  const { text, html } = buildEmailContent(input);
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const date = new Date().toUTCString();
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${from.split("@")[1] || "portfolio.local"}>`;

  const headers = [
    `From: Portfolio Contact <${from}>`,
    `To: ${input.to}`,
    `Reply-To: ${input.name} <${input.replyTo}>`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(`[Portfolio] ${input.subject}`)))}?=`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `X-Mailer: Portfolio-SMTP/1.0`,
  ].join("\r\n");

  const body = [
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(text))),
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(html))),
    `--${boundary}--`,
  ].join("\r\n");

  return `${headers}\r\n\r\n${body}\r\n.\r\n`;
}

// ─── Low-level SMTP over connect() ──────────────────────────────────
async function readLine(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  let line = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    line += decoder.decode(value, { stream: true });
    if (line.includes("\r\n")) break;
  }

  return line.trim();
}

async function readMultiLine(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  let response = "";
  const timeout = Date.now() + 10_000; // 10 sec timeout

  while (Date.now() < timeout) {
    const { value, done } = await reader.read();
    if (done) break;
    response += decoder.decode(value, { stream: true });
    // SMTP multi-line: lines like "250-..." continue, "250 ..." is final
    const lines = response.split("\r\n");
    const lastComplete = lines.slice(0, -1);
    if (lastComplete.length > 0) {
      const lastLine = lastComplete[lastComplete.length - 1];
      // Final line has space after code (e.g., "250 OK") not dash
      if (lastLine.length >= 4 && lastLine[3] === " ") {
        return response.trim();
      }
    }
  }

  return response.trim();
}

async function sendCommand(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  command: string,
  expectedCode: number,
): Promise<string> {
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(command + "\r\n"));
  const response = await readMultiLine(reader);

  if (!response.startsWith(String(expectedCode))) {
    throw new ContactMailError(
      `SMTP error: expected ${expectedCode}, got: ${response.substring(0, 120)}`,
      "SEND_FAILED",
    );
  }

  return response;
}

// ─── Main Send Function ─────────────────────────────────────────────
export async function sendContactEmail(input: ContactEmailInput): Promise<void> {
  const { user, pass, host, port } = await resolveSmtpCredentials();

  let socket;
  try {
    // Connect with TLS (port 465 = implicit TLS)
    socket = connect({ hostname: host, port }, { secureTransport: "on" } as any);

    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    const encoder = new TextEncoder();

    // Read server greeting
    const greeting = await readMultiLine(reader);
    if (!greeting.startsWith("220")) {
      throw new ContactMailError(`SMTP server rejected connection: ${greeting.substring(0, 120)}`, "SEND_FAILED");
    }

    // EHLO
    await sendCommand(writer, reader, `EHLO portfolio.local`, 250);

    // AUTH LOGIN
    await sendCommand(writer, reader, `AUTH LOGIN`, 334);
    await writer.write(encoder.encode(btoa(user) + "\r\n"));
    const userResp = await readMultiLine(reader);
    if (!userResp.startsWith("334")) {
      throw new ContactMailError("SMTP authentication failed (username rejected).", "SEND_FAILED");
    }
    await writer.write(encoder.encode(btoa(pass) + "\r\n"));
    const authResp = await readMultiLine(reader);
    if (!authResp.startsWith("235")) {
      throw new ContactMailError(
        "SMTP authentication failed. Check your SMTP_PASS in .dev.vars (locally) or as a secure secret in Cloudflare (production).",
        "SEND_FAILED",
      );
    }

    // MAIL FROM
    await sendCommand(writer, reader, `MAIL FROM:<${user}>`, 250);

    // RCPT TO
    await sendCommand(writer, reader, `RCPT TO:<${input.to}>`, 250);

    // DATA
    await sendCommand(writer, reader, `DATA`, 354);

    // Send email content
    const mimeMessage = buildMimeMessage(input, user);
    await writer.write(encoder.encode(mimeMessage));
    const dataResp = await readMultiLine(reader);
    if (!dataResp.startsWith("250")) {
      throw new ContactMailError(
        "SMTP server rejected the email. Please try again.",
        "SEND_FAILED",
      );
    }

    // QUIT
    try {
      await writer.write(encoder.encode("QUIT\r\n"));
    } catch {
      // ignore — connection might already be closing
    }

    writer.releaseLock();
    reader.releaseLock();
  } catch (error) {
    if (error instanceof ContactMailError) throw error;
    console.error("[contact-mail] SMTP error:", error);
    throw new ContactMailError(
      "Could not deliver your message right now. Please try again or use the email link on this page.",
      "SEND_FAILED",
    );
  } finally {
    try {
      socket?.close();
    } catch {
      // ignore close errors
    }
  }
}
