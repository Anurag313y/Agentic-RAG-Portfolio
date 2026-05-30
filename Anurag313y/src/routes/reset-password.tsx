import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Cpu, Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Admin Console" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Frontend-only stub: backend wiring will send a real reset email.
    setSent(true);
    toast.success("If that email is on file, a reset link has been sent.");
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <form onSubmit={submit} className="glass rounded-2xl p-8 w-full max-w-md relative scanline">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-lg bg-cyan/15 border border-cyan/40 grid place-items-center glow-cyan">
            <Cpu className="size-5 text-cyan" />
          </div>
          <div>
            <div className="font-semibold">Reset Password</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              we'll email a reset link
            </div>
          </div>
        </div>

        {!sent ? (
          <>
            <label className="text-xs font-mono text-muted-foreground">email</label>
            <div className="mt-1 mb-5 flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2">
              <Mail className="size-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow"
            >
              Send reset link <ArrowRight className="size-4" />
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Check your inbox at <span className="text-foreground">{email}</span> for a reset link.
          </p>
        )}

        <Link
          to="/admin"
          className="block text-center mt-4 text-xs text-muted-foreground hover:text-cyan font-mono"
        >
          ← back to login
        </Link>
      </form>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}