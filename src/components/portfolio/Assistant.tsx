import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const QA: { q: string; a: string }[] = [
  {
    q: "Tell me about this developer",
    a: "Anurag is a software engineer focused on building reliable, high-performance systems. He works across the stack — from Linux infrastructure to polished React UIs — and cares deeply about craft and clarity.",
  },
  {
    q: "Show best projects",
    a: "Sentinel (real-time observability), Orbit (E2E-encrypted file sync), and Forge (self-hosted CI) are great starting points. Each is production-grade and well-tested.",
  },
  {
    q: "What are his strongest skills?",
    a: "TypeScript & React for frontend, Node.js / Go for backend, PostgreSQL & Redis for data, and Docker / Linux / AWS for infra. Strong taste for performance, observability, and DX.",
  },
  {
    q: "How can I contact him?",
    a: "Easiest: email hello@anuragyadav.dev, or use the contact form below. He typically replies within 24 hours.",
  },
];

export function Assistant() {
  const [active, setActive] = useState<number | null>(0);
  const [typing, setTyping] = useState(false);

  const pick = (i: number) => {
    setTyping(true);
    setActive(i);
    setTimeout(() => setTyping(false), 600);
  };

  return (
    <section id="assistant" className="py-24">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeading
          id="assistant"
          eyebrow="// jarvis"
          title="Portfolio Assistant"
          description="A quick AI-style assistant for recruiters. Pick a question to get an answer."
        />
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
          <div className="glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 size-60 rounded-full bg-cyan/10 blur-3xl" />
            <div className="flex items-center gap-3">
              <div className="relative size-12 rounded-full bg-cyan/15 border border-cyan/40 grid place-items-center glow-cyan">
                <Bot className="size-6 text-cyan" />
                <span className="absolute inset-0 rounded-full border border-cyan/40 pulse-ring" />
              </div>
              <div>
                <div className="font-semibold">J.A.R.V.I.S</div>
                <div className="text-xs text-emerald font-mono">● online · ready</div>
              </div>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              I'm a lightweight assistant trained on Anurag's portfolio. Tap a question on the right to get an instant answer.
            </p>
            <div className="mt-5 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              v1.0 · static · upgradeable to live LLM
            </div>
          </div>

          <div className="glass rounded-2xl p-6 flex flex-col">
            <div className="flex flex-wrap gap-2 mb-4">
              {QA.map((item, i) => (
                <button
                  key={item.q}
                  onClick={() => pick(i)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    active === i
                      ? "bg-cyan/15 border-cyan/50 text-cyan"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-cyan/40"
                  }`}
                >
                  {item.q}
                </button>
              ))}
            </div>
            <motion.div
              key={active ?? -1}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 rounded-xl bg-background/50 border border-border/60 p-5 font-mono text-sm leading-relaxed min-h-[180px]"
            >
              <div className="flex items-center gap-2 text-cyan text-xs mb-3">
                <Sparkles className="size-3.5" /> response
              </div>
              {typing ? (
                <span className="text-muted-foreground">
                  thinking<span className="caret">▍</span>
                </span>
              ) : (
                <p className="text-foreground/90">{active !== null ? QA[active].a : "Pick a question to begin."}</p>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}