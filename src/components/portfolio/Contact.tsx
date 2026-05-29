import { useState } from "react";
import { Copy, Check, Github, Linkedin, Instagram, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { SectionHeading } from "./SectionHeading";
import { PROFILE } from "@/lib/portfolio-data";

function sanitize(s: string) {
  return s.replace(/[<>]/g, "").trim().slice(0, 2000);
}

export function Contact() {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const copy = async () => {
    await navigator.clipboard.writeText(PROFILE.email);
    setCopied(true);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopied(false), 1800);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = sanitize(form.name);
    const email = sanitize(form.email);
    const message = sanitize(form.message);
    if (!name || !email || !message) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    setSent(true);
    toast.success("Message queued — I'll get back to you soon.");
    setForm({ name: "", email: "", message: "" });
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <section id="contact" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeading
          id="contact"
          eyebrow="// contact"
          title="Let's build something"
          description="Open to senior engineering roles, freelance, and interesting collaborations."
        />
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
          <div className="space-y-4">
            <div className="glass rounded-2xl p-6">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">email</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <a href={`mailto:${PROFILE.email}`} className="font-mono text-cyan hover:text-cyan-glow break-all">
                  {PROFILE.email}
                </a>
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border hover:border-cyan/40 hover:text-cyan transition-colors"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">social</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Github, label: "GitHub", href: PROFILE.socials.github },
                  { icon: Linkedin, label: "LinkedIn", href: PROFILE.socials.linkedin },
                  { icon: Instagram, label: "Instagram", href: PROFILE.socials.instagram },
                  { icon: Mail, label: "Email", href: `mailto:${PROFILE.email}` },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:border-cyan/40 hover:text-cyan transition-colors text-sm"
                  >
                    <s.icon className="size-4" /> {s.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6 font-mono text-sm">
              <div className="text-emerald">$ status</div>
              <div className="text-muted-foreground pl-2 mt-1">
                <div>● available for work</div>
                <div>● based in {PROFILE.location}</div>
                <div>● replies in &lt; 24h</div>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="glass rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-xs font-mono text-muted-foreground mb-1.5">name</div>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={120}
                  required
                  className="w-full bg-background/50 border border-border focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20 outline-none rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Ada Lovelace"
                />
              </label>
              <label className="block">
                <div className="text-xs font-mono text-muted-foreground mb-1.5">email</div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={160}
                  required
                  className="w-full bg-background/50 border border-border focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20 outline-none rounded-lg px-3 py-2.5 text-sm"
                  placeholder="you@company.com"
                />
              </label>
            </div>
            <label className="block">
              <div className="text-xs font-mono text-muted-foreground mb-1.5">message</div>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                maxLength={2000}
                required
                rows={6}
                className="w-full bg-background/50 border border-border focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20 outline-none rounded-lg px-3 py-2.5 text-sm resize-y"
                placeholder="Tell me about your project, role, or idea…"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan text-primary-foreground font-medium hover:bg-cyan-glow transition-colors glow-cyan"
            >
              {sent ? <Check className="size-4" /> : <Send className="size-4" />}
              {sent ? "Sent — talk soon" : "Send message"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}