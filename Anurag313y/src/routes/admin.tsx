import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { Toaster } from "@/components/ui/sonner";
import { checkAdminSession } from "@/lib/api/auth.functions";
import { getAdminContent, loadAdminPage } from "@/lib/api/portfolio.functions";
import type { AdminContent } from "@/lib/content.types";

export const Route = createFileRoute("/admin")({
  loader: () => loadAdminPage(),
  head: () => ({
    meta: [
      { title: "Admin Console — Anurag Yadav" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const loaderData = Route.useLoaderData();
  const [authed, setAuthed] = useState(loaderData.authenticated);
  const [content, setContent] = useState<AdminContent | null>(loaderData.content);

  const onLoginSuccess = async () => {
    const session = await checkAdminSession();
    if (!session.authenticated) return;
    const adminContent = await getAdminContent();
    setContent(adminContent);
    setAuthed(true);
  };

  const onLogout = () => {
    setAuthed(false);
    setContent(null);
  };

  return (
    <>
      {authed && content ? (
        <AdminDashboard initialContent={content} onLogout={onLogout} />
      ) : (
        <AdminLogin onSuccess={onLoginSuccess} />
      )}
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}
