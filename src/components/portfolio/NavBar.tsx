import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";

const LINKS = [
  { id: "home", label: "~/home" },
  { id: "terminal", label: "~/terminal" },
  { id: "about", label: "~/about" },
  { id: "skills", label: "~/skills" },
  { id: "projects", label: "~/projects" },
  { id: "experience", label: "~/experience" },
  { id: "resume", label: "~/resume" },
  { id: "contact", label: "~/contact" },
];

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4">
        <nav
          className={`glass rounded-2xl flex items-center justify-between px-4 py-2.5 ${
            scrolled ? "glow-cyan" : ""
          }`}
        >
          <a href="#home" className="flex items-center gap-2 font-mono text-sm">
            <span className="grid place-items-center size-7 rounded-md bg-cyan/10 border border-cyan/30 text-cyan">
              <Terminal className="size-4" />
            </span>
            <span className="text-foreground/90">
              anurag<span className="text-cyan">@</span>portfolio
              <span className="text-muted-foreground">:~$</span>
            </span>
          </a>
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
          <a
            href="#contact"
            className="font-mono text-xs px-3 py-1.5 rounded-md bg-cyan text-primary-foreground hover:bg-cyan-glow transition-colors glow-cyan"
          >
            sudo hire-me
          </a>
        </nav>
      </div>
    </header>
  );
}