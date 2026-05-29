import { createFileRoute } from "@tanstack/react-router";

import { About } from "@/components/portfolio/About";
import { Contact } from "@/components/portfolio/Contact";
import { Experience } from "@/components/portfolio/Experience";
import { Footer } from "@/components/portfolio/Footer";
import { Hero } from "@/components/portfolio/Hero";
import { NavBar } from "@/components/portfolio/NavBar";
import { Projects } from "@/components/portfolio/Projects";
import { Resume } from "@/components/portfolio/Resume";
import { Skills } from "@/components/portfolio/Skills";
import { Toaster } from "@/components/ui/sonner";
import { PortfolioProvider } from "@/context/portfolio";
import { PORTFOLIO_STALE_TIME } from "@/hooks/use-portfolio-query";
import { PORTFOLIO_QUERY_KEY } from "@/lib/content.types";
import { fetchPublicContent } from "@/lib/content.server";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    return context.queryClient.ensureQueryData({
      queryKey: PORTFOLIO_QUERY_KEY,
      queryFn: () => fetchPublicContent(),
      staleTime: PORTFOLIO_STALE_TIME,
    });
  },
  head: () => ({
    meta: [
      { title: "Anurag Yadav — Software Engineer" },
      {
        name: "description",
        content:
          "Futuristic portfolio of Anurag Yadav — Software Engineer building fast, reliable, and elegant software.",
      },
      { property: "og:title", content: "Anurag Yadav — Software Engineer" },
      {
        property: "og:description",
        content: "Linux-native full-stack engineer. Projects, experience, and an interactive terminal.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const content = Route.useLoaderData();

  return (
    <PortfolioProvider content={content}>
      <div className="min-h-screen">
        <NavBar />
        <main>
          <Hero />
          <About />
          <Skills />
          <Projects />
          <Experience />
          <Resume />
          <Contact />
        </main>
        <Footer />
        <Toaster theme="dark" position="bottom-right" />
      </div>
    </PortfolioProvider>
  );
}
