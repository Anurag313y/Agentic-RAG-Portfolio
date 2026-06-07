"use client";

import { motion } from "framer-motion";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  downloadResumeFile,
  isCustomResumeUrl,
  openResumeInNewTab,
  resumeDownloadName,
} from "@/lib/resume";
import { cn } from "@/lib/utils";

type ResumeViewerProps = {
  profileName: string;
  resumeUrl: string;
};

export function ResumeViewer({ profileName, resumeUrl }: ResumeViewerProps) {
  const [downloading, setDownloading] = useState(false);
  const [opening, setOpening] = useState(false);
  const downloadName = resumeDownloadName(profileName);
  const isCustom = isCustomResumeUrl(resumeUrl);
  const staleBlob = resumeUrl.trim().startsWith("blob:");

  const handleView = async () => {
    if (staleBlob) {
      toast.error("Resume link expired. Re-upload your PDF in admin.");
      return;
    }
    setOpening(true);
    try {
      await openResumeInNewTab(resumeUrl);
    } catch {
      toast.error("Could not open the resume. Allow pop-ups and try again.");
    } finally {
      setOpening(false);
    }
  };

  const handleDownload = async () => {
    if (staleBlob) {
      toast.error("Resume link expired. Re-upload your PDF in admin.");
      return;
    }
    setDownloading(true);
    try {
      await downloadResumeFile(resumeUrl, downloadName);
    } catch {
      toast.error("Could not download the resume. Try View Resume instead.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="group relative glass glass-hover rounded-xl sm:rounded-2xl overflow-hidden border border-cyan/20"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan/[0.06] via-transparent to-emerald/[0.04] pointer-events-none" />
      <div className="absolute top-2.5 left-2.5 size-2 border-t border-l border-cyan/40 pointer-events-none" />
      <div className="absolute top-2.5 right-2.5 size-2 border-t border-r border-cyan/40 pointer-events-none" />
      <div className="absolute bottom-2.5 left-2.5 size-2 border-b border-l border-cyan/40 pointer-events-none" />
      <div className="absolute bottom-2.5 right-2.5 size-2 border-b border-r border-cyan/40 pointer-events-none" />

      <div className="relative p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="relative shrink-0 size-12 sm:size-[4.25rem] rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan/15 to-cyan/5 border border-cyan/30 grid place-items-center shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
            <FileText className="size-5 sm:size-7 text-cyan" strokeWidth={1.5} />
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 font-mono text-[9px] sm:text-[10px] px-1.5 py-px rounded-sm bg-cyan/20 border border-cyan/30 text-cyan leading-none">
              PDF
            </span>
          </div>

          <div className="min-w-0 pt-0.5">
            <h3 className="font-semibold text-sm sm:text-lg leading-snug text-foreground truncate">
              {profileName}
            </h3>
            <p className="mt-0.5 font-mono text-[11px] sm:text-sm text-muted-foreground">
              Resume.pdf
              <span className="text-muted-foreground/50 mx-1.5">·</span>
              {isCustom ? "Uploaded" : "Portfolio"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isCustom && !staleBlob && (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded-full border border-emerald/30 bg-emerald/10 text-emerald">
                  <span className="size-1.5 rounded-full bg-emerald animate-pulse shrink-0" />
                  Live from admin
                </span>
              )}
              {!staleBlob && (
                <span className="font-mono text-[10px] sm:text-xs text-muted-foreground/70">
                  Ready to view or save
                </span>
              )}
            </div>

            {staleBlob && (
              <p className="mt-2 text-[11px] sm:text-xs text-amber-400/90 font-mono leading-relaxed">
                Re-upload your PDF in admin — the saved link expired.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t border-border/40 sm:border-t-0">
          <button
            type="button"
            onClick={handleView}
            disabled={opening || staleBlob}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-9 text-xs sm:text-sm rounded-lg font-medium transition-all duration-200",
              "bg-cyan text-primary-foreground hover:bg-cyan-glow active:scale-[0.98]",
              "hover:shadow-[0_0_20px_-4px_oklch(0.82_0.16_215/0.55)]",
              "disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            {opening ? (
              <Loader2 className="size-3.5 sm:size-4 shrink-0 animate-spin" />
            ) : (
              <ExternalLink className="size-3.5 sm:size-4 shrink-0" />
            )}
            <span className="truncate">{opening ? "Opening…" : "View"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || staleBlob}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-9 text-xs sm:text-sm rounded-lg font-medium transition-all duration-200",
              "border border-cyan/25 bg-background/40 text-foreground",
              "hover:border-cyan/45 hover:bg-cyan/5 hover:text-cyan active:scale-[0.98]",
              "disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            {downloading ? (
              <Loader2 className="size-3.5 sm:size-4 shrink-0 animate-spin" />
            ) : (
              <Download className="size-3.5 sm:size-4 shrink-0" />
            )}
            <span className="truncate">{downloading ? "Saving…" : "Download"}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
