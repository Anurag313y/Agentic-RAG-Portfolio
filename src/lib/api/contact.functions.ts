import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { saveContactMessage } from "../content.server";

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(200),
      email: z.string().email().max(200),
      subject: z.string().min(1).max(300),
      message: z.string().min(1).max(2000),
    }),
  )
  .handler(async ({ data }) => {
    await saveContactMessage(data);
    return { success: true as const };
  });
