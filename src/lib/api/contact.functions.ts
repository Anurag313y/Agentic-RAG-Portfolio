import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { fetchPublicContent, saveContactMessage } from "../content.server";
import { ContactMailError, sendContactEmail } from "../mail.server";
import { checkContactRateLimit, contactRateLimitMessage } from "../rate-limit.server";

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(20).optional().default(""),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(2000),
});

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator(contactSchema)
  .handler(async ({ data }) => {
    try {
      await checkContactRateLimit();
    } catch (error) {
      if (error instanceof Error && error.message === "RATE_LIMIT") {
        throw new Error(contactRateLimitMessage());
      }
      throw error;
    }

    const content = await fetchPublicContent();
    const recipient = content.profile.email?.trim().toLowerCase();
    if (!recipient || !z.string().email().safeParse(recipient).success) {
      throw new Error(
        "Portfolio contact email is not configured. Set a valid email in Admin → Profile & Contact.",
      );
    }

    try {
      await sendContactEmail({
        to: recipient,
        replyTo: data.email,
        name: data.name,
        phone: data.phone || undefined,
        subject: data.subject,
        message: data.message,
      });
    } catch (error) {
      if (error instanceof ContactMailError) {
        throw new Error(error.message);
      }
      throw error;
    }

    await saveContactMessage({
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      subject: data.subject,
      message: data.message,
    });
    return { success: true as const };
  });
