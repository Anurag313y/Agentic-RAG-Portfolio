import { useEffect, useState } from "react";
import { ChevronRight, Terminal, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useActiveSection } from "@/hooks/use-active-section";
import { cn } from "@/lib/utils";

const LINKS = [
  { id: "home", label: "~/home" },
  { id: "about", label: "~/about" },
  { id: "skills", label: "~/skills" },
  { id: "projects", label: "~/projects" },
  { id: "experience", label: "~/experience" },
  { id: "resume", label: "~/resume" },
  { id: "contact", label: "~/contact" },
] as const;

const SECTION_IDS = LINKS.map((l) => l.id);

function navLinkClass(isActive: boolean) {
  return isActive
    ? "px-3 py-1 rounded-md text-cyan bg-cyan/10 border border-cyan/25 transition-colors"
    : "px-3 py-1 rounded-md text-muted-foreground hover:text-cyan hover:bg-cyan/5 transition-colors";
}

function mobileLinkClass(isActive: boolean) {
  return cn(
    "group flex items-center justify-between gap-3 px-4 py-3 min-h-11 rounded-lg font-mono text-sm transition-all duration-200",
    isActive
      ? "text-cyan bg-cyan/12 border border-cyan/35 shadow-[inset_3px_0_0_oklch(0.82_0.16_215)]"
      : "text-foreground/90 bg-secondary/60 border border-border/50 hover:text-cyan hover:border-cyan/30 hover:bg-cyan/8",
  );
}

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeId = useActiveSection([...SECTION_IDS]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled ? "py-1.5" : "py-2.5 sm:py-3",
      )}
    >
      <div className="section-container">
        <nav
          className={cn(
            "relative z-[60] glass rounded-2xl flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 min-w-0",
            scrolled && "glow-cyan",
          )}
        >
          <a
            href="/#home"
            className="flex items-center gap-2 font-mono text-xs sm:text-sm min-w-0 flex-1 sm:flex-none max-w-[58%] sm:max-w-none"
          >
            <span className="grid place-items-center size-7 shrink-0 rounded-md bg-cyan/10 border border-cyan/30 text-cyan">
              <Terminal className="size-4" />
            </span>
            <span className="text-foreground/90 truncate">
              anurag<span className="text-cyan">@</span>portfolio
              <span className="text-muted-foreground hidden sm:inline">:~$</span>
            </span>
          </a>

          <ul className="hidden lg:flex items-center gap-1 font-mono text-xs">
            {LINKS.map((l) => (
              <li key={l.id}>
                <a href={`/#${l.id}`} className={navLinkClass(activeId === l.id)}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/#contact"
              className="font-mono text-xs px-3 py-1.5 min-h-9 rounded-md bg-cyan text-primary-foreground hover:bg-cyan-glow transition-colors glow-cyan hidden sm:inline-flex items-center"
            >
              sudo hire-me
            </a>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={cn(
                "lg:hidden touch-target size-9 grid place-items-center rounded-lg border transition-colors",
                mobileOpen
                  ? "border-cyan/50 text-cyan bg-cyan/10"
                  : "border-border hover:border-cyan/40 hover:text-cyan",
              )}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[55] bg-background/90 backdrop-blur-md lg:hidden cursor-default"
                aria-label="Close menu"
                onClick={closeMobile}
              />

              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-x-3 sm:inset-x-4 top-[calc(env(safe-area-inset-top,0px)+4.25rem)] sm:top-[calc(env(safe-area-inset-top,0px)+4.75rem)] z-[58] lg:hidden max-h-[calc(100dvh-env(safe-area-inset-top,0px)-5.5rem)] overflow-y-auto overscroll-contain"
                role="dialog"
                aria-modal="true"
                aria-label="Site navigation"
              >
                <div className="relative rounded-2xl border border-cyan/25 bg-card shadow-[0_24px_64px_-12px_oklch(0_0_0/0.65)] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan/[0.04] to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.04]" />

                  <ul className="relative p-3 space-y-1.5 font-mono">
                    {LINKS.map((l, index) => (
                      <motion.li
                        key={l.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 + index * 0.035, duration: 0.22 }}
                      >
                        <a
                          href={`/#${l.id}`}
                          onClick={closeMobile}
                          className={mobileLinkClass(activeId === l.id)}
                        >
                          <span className="truncate">{l.label}</span>
                          <ChevronRight
                            className={cn(
                              "size-4 shrink-0 transition-transform duration-200",
                              activeId === l.id
                                ? "text-cyan"
                                : "text-muted-foreground/50 group-hover:text-cyan group-hover:translate-x-0.5",
                            )}
                          />
                        </a>
                      </motion.li>
                    ))}
                  </ul>

                  <div className="relative p-3 pt-0">
                    <div className="pt-3 border-t border-border/60">
                      <a
                        href="/#contact"
                        onClick={closeMobile}
                        className="flex items-center justify-center gap-2 font-mono text-sm px-4 py-3 min-h-11 rounded-lg bg-cyan text-primary-foreground font-medium hover:bg-cyan-glow transition-all hover:shadow-[0_0_20px_-4px_oklch(0.82_0.16_215/0.55)]"
                      >
                        sudo hire-me
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
