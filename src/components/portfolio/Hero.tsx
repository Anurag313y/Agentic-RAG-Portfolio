import { motion } from "framer-motion";
import { ArrowRight, Download, Mail, Cpu } from "lucide-react";
import { useEffect, useState } from "react";
import { PROFILE } from "@/lib/portfolio-data";

const TYPED_LINES = [
  { prompt: "$", cmd: "whoami", out: "anurag — software engineer · linux native · system builder" },
  { prompt: "$", cmd: "build --portfolio", out: "compiled successfully in 0.42s ✓" },
  { prompt: "$", cmd: "sudo hire-me", out: "permission granted. opening contact channel..." },
];

export function Hero() {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (step >= TYPED_LINES.length) return;
    const line = TYPED_LINES[step].cmd;
    if (typed.length < line.length) {
      const t = setTimeout(() => setTyped(line.slice(0, typed.length + 1)), 55);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setStep((s) => s + 1);
      setTyped("");
    }, 1200);
    return () => clearTimeout(t);
  }, [typed, step]);

  return (
    <section id="home" className="relative min-h-[100svh] pt-28 pb-16 overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass font-mono text-xs text-cyan">
            <span className="size-2 rounded-full bg-emerald animate-pulse" />
            online · available for work
          </div>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="block text-foreground">{PROFILE.name}</span>
            <span className="block text-gradient">{PROFILE.role}</span>
          </h1>
          <p className="mt-6 text-lg text-foreground/85 max-w-xl">{PROFILE.headline}</p>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl">{PROFILE.intro}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#projects"
              className="group inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow transition-all"
            >
              View Projects
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href="#resume"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg glass glass-hover font-medium"
            >
              <Download className="size-4" /> View Resume
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-emerald/40 text-emerald hover:bg-emerald/10 transition-colors font-medium"
            >
              <Mail className="size-4" /> Contact Me
            </a>
          </div>

          <div className="mt-10 grid grid-cols-3 max-w-md gap-4 font-mono">
            {[
              { k: "5+", v: "years" },
              { k: "30+", v: "projects" },
              { k: "99.9%", v: "uptime" },
            ].map((s) => (
              <div key={s.v} className="glass rounded-xl p-3 text-center">
                <div className="text-xl text-cyan font-semibold">{s.k}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
          className="relative"
        >
          <div className="relative aspect-square max-w-md mx-auto">
            <div className="absolute inset-0 grid place-items-center">
              <div className="absolute size-[88%] rounded-full border border-cyan/20 spin-slow" />
              <div
                className="absolute size-[72%] rounded-full border border-emerald/20 spin-slow"
                style={{ animationDirection: "reverse", animationDuration: "24s" }}
              />
              <div className="absolute size-[60%] rounded-full border border-cyan/10 spin-slow" style={{ animationDuration: "30s" }} />
              <div className="absolute size-[56%] rounded-full bg-cyan/20 blur-3xl pulse-ring" />
              <div className="relative size-[48%] rounded-full bg-gradient-to-br from-cyan/40 via-cyan/10 to-emerald/30 grid place-items-center glow-cyan float-orb">
                <div className="size-[60%] rounded-full bg-background/60 backdrop-blur grid place-items-center border border-cyan/30">
                  <Cpu className="size-1/3 text-cyan" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 glass rounded-xl p-4 font-mono text-xs sm:text-sm scanline relative">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="size-3 rounded-full bg-destructive/80" />
              <span className="size-3 rounded-full bg-yellow-500/80" />
              <span className="size-3 rounded-full bg-emerald/80" />
              <span className="ml-2 text-muted-foreground">~/anurag — zsh</span>
            </div>
            <div className="space-y-1.5">
              {TYPED_LINES.slice(0, step).map((l, i) => (
                <div key={i}>
                  <div>
                    <span className="text-emerald">{l.prompt}</span>{" "}
                    <span className="text-foreground">{l.cmd}</span>
                  </div>
                  <div className="text-muted-foreground pl-3">{l.out}</div>
                </div>
              ))}
              {step < TYPED_LINES.length && (
                <div>
                  <span className="text-emerald">$</span>{" "}
                  <span className="text-foreground">{typed}</span>
                  <span className="caret text-cyan">▍</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}