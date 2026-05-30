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
      className="max-w-2xl mb-4 sm:mb-6 lg:mb-7"
    >
      <div className="font-mono text-[10px] sm:text-xs text-cyan mb-2 sm:mb-3 break-all sm:break-normal">
        <span className="text-emerald">$</span> cat /portfolio/{id}.md
      </div>
      <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight whitespace-pre-line break-words">
        <span className="text-gradient">{title}</span>
      </h2>
      {description && (
        <p className="mt-2 sm:mt-4 text-xs sm:text-base text-muted-foreground leading-relaxed line-clamp-4 sm:line-clamp-none">
          {description}
        </p>
      )}
    </motion.div>
  );
}