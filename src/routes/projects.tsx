import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Footer } from "@/components/portfolio/Footer";
import { NavBar } from "@/components/portfolio/NavBar";
import { ProjectCard } from "@/components/portfolio/Projects";
import { ProjectDetailDialog } from "@/components/portfolio/ProjectDetailDialog";
import { SectionHeading } from "@/components/portfolio/SectionHeading";
import { Toaster } from "@/components/ui/sonner";
import { PortfolioProvider, usePortfolio } from "@/context/portfolio";
import { PORTFOLIO_STALE_TIME } from "@/hooks/use-portfolio-query";
import { getPortfolioContent } from "@/lib/api/portfolio.functions";
import { PORTFOLIO_QUERY_KEY } from "@/lib/content.types";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/projects")({
  loader: async ({ context }) => {
    return context.queryClient.ensureQueryData({
      queryKey: PORTFOLIO_QUERY_KEY,
      queryFn: () => getPortfolioContent(),
      staleTime: PORTFOLIO_STALE_TIME,
    });
  },
  head: () => ({
    meta: [
      { title: "All Projects — Anurag Yadav" },
      {
        name: "description",
        content: "Archive of software engineering projects, system designs, and web applications built by Anurag Yadav.",
      },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const content = Route.useLoaderData();

  return (
    <PortfolioProvider content={content}>
      <div className="min-h-screen min-h-[100dvh] overflow-x-clip bg-background">
        <NavBar />
        <main className="overflow-x-clip pt-28 pb-20">
          <ProjectsList />
        </main>
        <Footer />
        <Toaster theme="dark" position="bottom-right" toastOptions={{ className: "max-w-[calc(100vw-2rem)]" }} />
      </div>
    </PortfolioProvider>
  );
}

function ProjectsList() {
  const { projects } = usePortfolio();
  const visibleProjects = projects.filter((p) => !p.hidden);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  const detailProject = detailIndex !== null ? visibleProjects[detailIndex] ?? null : null;

  return (
    <div className="section-container">
      <div className="mb-8">
        <a
          href="/#projects"
          className="inline-flex items-center gap-2 font-mono text-xs text-cyan hover:text-cyan/80 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" /> 
          <span>$ cd ..</span>
        </a>
      </div>

      <SectionHeading
        id="projects-archive"
        eyebrow="// archive"
        title="All Projects"
        description="A complete directory of systems, libraries, and applications I've built and maintained."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5 lg:gap-6 mt-8 sm:mt-12">
        {visibleProjects.map((p, i) => (
          <ProjectCard
            key={p.title}
            project={p}
            index={i}
            onOpenDetail={() => setDetailIndex(i)}
          />
        ))}
      </div>

      <ProjectDetailDialog
        project={detailProject}
        index={detailIndex ?? 0}
        open={detailIndex !== null}
        onOpenChange={(next) => {
          if (!next) setDetailIndex(null);
        }}
      />
    </div>
  );
}
