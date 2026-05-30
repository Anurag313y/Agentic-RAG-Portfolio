import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  authenticateAdmin,
  isAdminSessionValid,
  logoutAdmin,
} from "../content.server";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const ok = await authenticateAdmin(data.email, data.password);
    if (!ok) throw new Error("Invalid credentials");
    return { success: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  await logoutAdmin();
  return { success: true as const };
});

export const checkAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  return { authenticated: await isAdminSessionValid() };
});
