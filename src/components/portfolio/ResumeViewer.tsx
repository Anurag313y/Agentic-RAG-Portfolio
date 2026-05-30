"use client";

import { Download, ExternalLink, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  downloadResumeFile,
  isCustomResumeUrl,
  openResumeInNewTab,
  resumeDownloadName,
} from "@/lib/resume";

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
    <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between border border-border/60">
      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
        <div className="size-12 sm:size-14 rounded-xl bg-cyan/10 border border-cyan/30 text-cyan grid place-items-center shrink-0">
          <FileText className="size-6 sm:size-7" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-base sm:text-lg leading-tight break-words">
            {profileName} — Resume.pdf
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">
            {isCustom ? "Uploaded resume · PDF" : "Portfolio resume · PDF"}
          </div>
          {isCustom && !staleBlob && (
            <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] sm:text-xs px-2.5 py-1 rounded-md border border-emerald/35 bg-emerald/10 text-emerald">
              <span className="size-1.5 rounded-full bg-emerald animate-pulse" />
              Live from admin
            </span>
          )}
          {staleBlob && (
            <p className="mt-2 text-xs text-amber-400/90 font-mono">
              Re-upload your PDF in admin — the saved link expired.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
        <button
          type="button"
          onClick={handleView}
          disabled={opening}
          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 min-h-11 rounded-lg bg-cyan text-primary-foreground font-medium hover:bg-cyan-glow transition-colors glow-cyan disabled:opacity-60"
        >
          <ExternalLink className="size-4" />
          {opening ? "Opening…" : "View Resume"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 min-h-11 rounded-lg glass glass-hover font-medium disabled:opacity-60"
        >
          <Download className="size-4" />
          {downloading ? "Downloading…" : "Download"}
        </button>
      </div>
    </div>
  );
}
