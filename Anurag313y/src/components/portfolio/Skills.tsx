import { motion } from "framer-motion";
import {
  Layers, Server, Database, Wrench, Code, Cloud,
} from "lucide-react";

import { usePortfolio } from "@/context/portfolio";

import { SectionHeading } from "./SectionHeading";

const ICONS: Record<string, any> = {
  Frontend: Layers,
  Backend: Server,
  Databases: Database,
  "DevOps / Tools": Wrench,
  Languages: Code,
  Cloud: Cloud,
};

export function Skills() {
  const { skills } = usePortfolio();

  return (
    <section id="skills" className="py-12 sm:py-16 md:py-20 relative">
      <div className="section-container">
        <SectionHeading
          id="skills"
          eyebrow="// stack"
          title="Skills & Tooling"
          description="The tools I reach for daily. Categorized for clarity."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {skills.map((cat, i) => {
            const Icon = ICONS[cat.category] ?? Code;
            return (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className="glass glass-hover rounded-2xl p-4 sm:p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-lg bg-cyan/10 border border-cyan/30 text-cyan grid place-items-center">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-lg">{cat.category}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((s) => (
                    <span
                      key={s}
                      className="font-mono text-xs px-2.5 py-2 min-h-9 inline-flex items-center rounded-md bg-secondary/60 border border-border text-foreground/85 hover:border-cyan/40 hover:text-cyan transition-colors"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}