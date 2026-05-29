import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/portfolio/NavBar";
import { Hero } from "@/components/portfolio/Hero";
import { About } from "@/components/portfolio/About";
import { Skills } from "@/components/portfolio/Skills";
import { Projects } from "@/components/portfolio/Projects";
import { Experience } from "@/components/portfolio/Experience";
import { Resume } from "@/components/portfolio/Resume";
import { Contact } from "@/components/portfolio/Contact";
import { Footer } from "@/components/portfolio/Footer";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anurag Yadav — Software Engineer" },
      { name: "description", content: "Futuristic portfolio of Anurag Yadav — Software Engineer building fast, reliable, and elegant software." },
      { property: "og:title", content: "Anurag Yadav — Software Engineer" },
      { property: "og:description", content: "Linux-native full-stack engineer. Projects, experience, and an interactive terminal." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
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
  );
}
