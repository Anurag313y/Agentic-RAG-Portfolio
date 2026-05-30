import { useEffect, useState } from "react";
import { Terminal, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const LINKS = [
  { id: "home", label: "~/home" },
  { id: "about", label: "~/about" },
  { id: "skills", label: "~/skills" },
  { id: "projects", label: "~/projects" },
  { id: "experience", label: "~/experience" },
  { id: "resume", label: "~/resume" },
  { id: "contact", label: "~/contact" },
];

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2" : "py-3 sm:py-4"
      }`}
    >
      <div className="section-container">
        <nav
          className={`glass rounded-2xl flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 min-w-0 ${
            scrolled ? "glow-cyan" : ""
          }`}
        >
          <a
            href="#home"
            className="flex items-center gap-2 font-mono text-xs sm:text-sm min-w-0 flex-1 sm:flex-none max-w-[58%] sm:max-w-none"
          >
            <span className="grid place-items-center size-7 sm:size-8 shrink-0 rounded-md bg-cyan/10 border border-cyan/30 text-cyan">
              <Terminal className="size-4" />
            </span>
            <span className="text-foreground/90 truncate">
              anurag<span className="text-cyan">@</span>portfolio
              <span className="text-muted-foreground hidden sm:inline">:~$</span>
            </span>
          </a>

          {/* Desktop links */}
          <ul className="hidden lg:flex items-center gap-1 font-mono text-xs">
            {LINKS.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-cyan hover:bg-cyan/5 transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#contact"
              className="font-mono text-xs px-3 py-2 min-h-11 rounded-md bg-cyan text-primary-foreground hover:bg-cyan-glow transition-colors glow-cyan hidden sm:inline-flex items-center"
            >
              sudo hire-me
            </a>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden touch-target size-11 grid place-items-center rounded-lg border border-border hover:border-cyan/40 hover:text-cyan transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="lg:hidden mt-2 glass rounded-2xl p-4 overflow-hidden"
            >
              <ul className="space-y-1 font-mono text-sm">
                {LINKS.map((l) => (
                  <li key={l.id}>
                    <a
                      href={`#${l.id}`}
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 min-h-11 rounded-lg text-muted-foreground hover:text-cyan hover:bg-cyan/5 transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-border/60">
                <a
                  href="#contact"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center font-mono text-sm px-4 py-3 min-h-11 rounded-lg bg-cyan text-primary-foreground hover:bg-cyan-glow transition-colors glow-cyan"
                >
                  sudo hire-me
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}