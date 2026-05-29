import { useState } from "react";
import { Cpu, Lock, Mail, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ADMIN } from "@/lib/portfolio-data";
import { setAdminSession } from "@/lib/admin-store";
import { toast } from "sonner";

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (email.trim().toLowerCase() === ADMIN.email && password === ADMIN.password) {
        setAdminSession(true);
        toast.success("Access granted");
        onSuccess();
      } else {
        toast.error("Invalid credentials");
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <form
        onSubmit={submit}
        className="glass rounded-2xl p-8 w-full max-w-md relative scanline"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-lg bg-cyan/15 border border-cyan/40 grid place-items-center glow-cyan">
            <Cpu className="size-5 text-cyan" />
          </div>
          <div>
            <div className="font-semibold">Admin Console</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              authorized access only
            </div>
          </div>
        </div>

        <label className="text-xs font-mono text-muted-foreground">email</label>
        <div className="mt-1 mb-4 flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2">
          <Mail className="size-4 text-muted-foreground" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            className="bg-transparent outline-none w-full text-sm"
            autoComplete="email"
          />
        </div>

        <label className="text-xs font-mono text-muted-foreground">password</label>
        <div className="mt-1 mb-2 flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2">
          <Lock className="size-4 text-muted-foreground" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-transparent outline-none w-full text-sm"
            autoComplete="current-password"
          />
        </div>

        <div className="flex justify-end mb-5">
          <Link
            to="/reset-password"
            className="text-xs text-muted-foreground hover:text-cyan font-mono"
          >
            forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow transition-all disabled:opacity-60"
        >
          {loading ? "Authenticating…" : "Sign In"}
          <ArrowRight className="size-4" />
        </button>

        <Link
          to="/"
          className="block text-center mt-4 text-xs text-muted-foreground hover:text-cyan font-mono"
        >
          ← back to portfolio
        </Link>
      </form>
    </div>
  );
}