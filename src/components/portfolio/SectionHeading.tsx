import { motion } from "framer-motion";

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mb-10"
    >
      <div className="font-mono text-xs text-cyan mb-3">
        <span className="text-emerald">$</span> cat /portfolio/{id}.md
      </div>
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight whitespace-pre-line">
        <span className="text-gradient">{title}</span>
      </h2>
      {description && <p className="mt-4 text-muted-foreground">{description}</p>}
    </motion.div>
  );
}