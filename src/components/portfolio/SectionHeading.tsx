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
      className="max-w-2xl mb-8 sm:mb-10"
    >
      <div className="font-mono text-xs text-cyan mb-3 break-all sm:break-normal">
        <span className="text-emerald">$</span> cat /portfolio/{id}.md
      </div>
      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight whitespace-pre-line break-words">
        <span className="text-gradient">{title}</span>
      </h2>
      {description && (
        <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </motion.div>
  );
}