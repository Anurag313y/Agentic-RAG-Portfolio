import { Github, Instagram, Linkedin, Mail } from "lucide-react";

import { usePortfolio } from "@/context/portfolio";

export function Footer() {
  const { profile } = usePortfolio();

  return (
    <footer className="py-10 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="font-mono text-sm">
          <span className="text-emerald">$</span>{" "}
          <span className="text-foreground">{profile.name}</span>{" "}
          <span className="text-muted-foreground">— © {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-2">
          {[
            { icon: Github, href: profile.socials.github, label: "GitHub" },
            { icon: Linkedin, href: profile.socials.linkedin, label: "LinkedIn" },
            { icon: Instagram, href: profile.socials.instagram, label: "Instagram" },
            { icon: Mail, href: `mailto:${profile.email}`, label: "Email" },
          ].map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="size-9 grid place-items-center rounded-lg border border-border hover:border-cyan/40 hover:text-cyan transition-colors"
            >
              <s.icon className="size-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
