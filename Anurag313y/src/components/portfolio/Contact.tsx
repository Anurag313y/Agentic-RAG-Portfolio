import { useState } from "react";
import { Check, Copy, Github, Instagram, Linkedin, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { usePortfolio } from "@/context/portfolio";
import { submitContact } from "@/lib/api/contact.functions";

import { SectionHeading } from "./SectionHeading";

function sanitize(s: string) {
  return s.replace(/[<>]/g, "").trim().slice(0, 2000);
}

export function Contact() {
  const { profile } = usePortfolio();
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const copy = async () => {
    await navigator.clipboard.writeText(profile.email);
    setCopied(true);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopied(false), 1800);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sanitize(form.name);
    const email = sanitize(form.email);
    const subject = sanitize(form.subject);
    const message = sanitize(form.message);
    if (!name || !email || !subject || !message) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      await submitContact({ data: { name, email, subject, message } });
      setSent(true);
      toast.success("Message sent — I'll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSent(false), 4000);
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-12 sm:py-16 md:py-20">
      <div className="section-container">
        <SectionHeading
          id="contact"
          eyebrow="// contact"
          title="Let's build something"
          description="Open to impactful roles, freelance work, and meaningful products."
        />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4 sm:gap-6">
          <div className="space-y-4 min-w-0">
            <div className="glass rounded-2xl p-4 sm:p-6">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">email</div>
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <a
                  href={`mailto:${profile.email}`}
                  className="font-mono text-sm sm:text-base text-cyan hover:text-cyan-glow break-all min-w-0"
                >
                  {profile.email}
                </a>
                <button
                  onClick={copy}
                  className="inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2.5 min-h-11 rounded-md border border-border hover:border-cyan/40 hover:text-cyan transition-colors shrink-0 w-full sm:w-auto"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="glass rounded-2xl p-4 sm:p-6">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">social</div>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                {[
                  { icon: Github, label: "GitHub", href: profile.socials.github },
                  { icon: Linkedin, label: "LinkedIn", href: profile.socials.linkedin },
                  { icon: Instagram, label: "Instagram", href: profile.socials.instagram },
                  { icon: Mail, label: "Email", href: `mailto:${profile.email}` },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-3 min-h-11 rounded-lg border border-border hover:border-cyan/40 hover:text-cyan transition-colors text-sm"
                  >
                    <s.icon className="size-4" /> {s.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-4 sm:p-6 font-mono text-sm">
              <div className="text-emerald">$ status</div>
              <div className="text-muted-foreground pl-2 mt-1">
                <div>● available for work</div>
                <div>● based in {profile.location}</div>
                <div>● replies in &lt; 24h</div>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="glass rounded-2xl p-4 sm:p-8 space-y-4 min-w-0">
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
              <div className="text-xs font-mono text-muted-foreground mb-1.5">subject</div>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                maxLength={160}
                required
                className="w-full bg-background/50 border border-border focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20 outline-none rounded-lg px-3 py-2.5 text-sm"
                placeholder="Project inquiry, role, collaboration…"
              />
            </label>
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
            <div className="font-mono text-[11px] text-muted-foreground">
              // Stored securely — never exposed to the browser
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 min-h-11 rounded-lg bg-cyan text-primary-foreground font-medium hover:bg-cyan-glow transition-colors glow-cyan disabled:opacity-60"
            >
              {sent ? <Check className="size-4" /> : <Send className="size-4" />}
              {sent ? "Sent — talk soon" : loading ? "Sending…" : "Send message"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
