import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { isAdminAuthed } from "@/lib/admin-store";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — Anurag Yadav" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAuthed(isAdminAuthed());
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  return (
    <>
      {authed ? (
        <AdminDashboard onLogout={() => setAuthed(false)} />
      ) : (
        <AdminLogin onSuccess={() => setAuthed(true)} />
      )}
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}