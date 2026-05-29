import { motion } from "framer-motion";
import { SectionHeading } from "./SectionHeading";
import { Code2, Cpu, Gauge, Shield } from "lucide-react";

const PILLARS = [
  { icon: Gauge, title: "Performance", text: "Sub-100ms interactions, profiled, measured, optimized." },
  { icon: Shield, title: "Reliability", text: "Tests, observability, and graceful failure paths by default." },
  { icon: Code2, title: "Craft", text: "Clean architecture, readable code, durable abstractions." },
  { icon: Cpu, title: "Systems", text: "Comfortable from Linux internals up to product UI." },
];

export function About() {
  return (
    <section id="about" className="py-24">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeading
          id="about"
          eyebrow="// about"
          title="The Engineer Behind the Terminal"
          description="I'm Anurag — a software engineer who treats every product like a system. I care about the boring details that compound: caches that hit, queries that scan small, builds that don't flake, and UIs that don't lie about their state."
        />

        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-6 font-mono text-sm space-y-3"
          >
            <div>
              <span className="text-emerald">const</span>{" "}
              <span className="text-cyan">engineer</span> = {"{"}
            </div>
            <div className="pl-4">
              <span className="text-muted-foreground">name:</span>{" "}
              <span className="text-foreground">"Anurag Yadav"</span>,
            </div>
            <div className="pl-4">
              <span className="text-muted-foreground">stack:</span>{" "}
              <span className="text-foreground">["TypeScript", "Go", "Python", "Linux"]</span>,
            </div>
            <div className="pl-4">
              <span className="text-muted-foreground">focus:</span>{" "}
              <span className="text-foreground">"reliable systems & beautiful UX"</span>,
            </div>
            <div className="pl-4">
              <span className="text-muted-foreground">currently:</span>{" "}
              <span className="text-emerald">"open to senior roles"</span>,
            </div>
            <div>{"};"}</div>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="glass glass-hover rounded-xl p-5"
              >
                <div className="size-10 rounded-lg bg-cyan/10 border border-cyan/30 text-cyan grid place-items-center mb-4">
                  <p.icon className="size-5" />
                </div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}