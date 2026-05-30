import { Briefcase } from "lucide-react";
import { motion } from "framer-motion";

import { usePortfolio } from "@/context/portfolio";

import { SectionHeading } from "./SectionHeading";

export function Experience() {
  const { experience } = usePortfolio();

  return (
    <section id="experience" className="py-12 sm:py-16 md:py-20">
      <div className="section-container">
        <SectionHeading
          id="experience"
          eyebrow="// timeline"
          title="Work Experience"
          description="Where I've built, broken, and rebuilt things."
        />
        <div className="relative max-w-3xl mx-auto">
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-cyan/60 via-cyan/20 to-transparent sm:-translate-x-1/2" />
          {experience.map((e, i) => {
            const left = i % 2 === 0;
            return (
              <motion.div
                key={e.company}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5 }}
                className={`relative pl-12 sm:pl-0 sm:grid sm:grid-cols-2 sm:gap-8 lg:gap-10 mb-8 sm:mb-10 ${
                  left ? "" : "sm:[&>*:first-child]:col-start-2"
                }`}
              >
                <div className={`min-w-0 ${left ? "sm:text-right sm:pr-6 lg:pr-10" : "sm:pl-6 lg:pl-10"}`}>
                  <div className="glass glass-hover rounded-xl p-4 sm:p-5 w-full sm:inline-block text-left max-w-full">
                    <div className="flex items-center gap-2 font-mono text-xs text-cyan">
                      <Briefcase className="size-3.5" /> {e.duration}
                    </div>
                    <h3 className="mt-2 font-semibold text-lg">{e.role}</h3>
                    <div className="text-emerald text-sm">{e.company}</div>
                    <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                      {e.points.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="text-cyan">▸</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <span className="absolute left-4 sm:left-1/2 top-6 -translate-x-1/2 size-3 rounded-full bg-cyan glow-cyan ring-4 ring-background" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}