export const PROFILE = {
  name: "Anurag Yadav",
  role: "Software Engineer",
  handle: "anurag@portfolio",
  headline: "I build fast, reliable, and elegant software — from Linux servers to pixel-perfect UIs.",
  intro:
    "Full-stack engineer focused on performance, developer experience, and clean systems design. I ship products that feel as good as they perform.",
  location: "India · Remote",
  email: "hello@anuragyadav.dev",
  resumeUrl: "/resume.pdf",
  socials: {
    github: "https://github.com/anuragyadav",
    linkedin: "https://linkedin.com/in/anuragyadav",
    instagram: "https://instagram.com/anuragyadav",
    twitter: "https://twitter.com/anuragyadav",
  },
};

export const SKILLS = [
  {
    category: "Frontend",
    items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion", "Vite"],
  },
  {
    category: "Backend",
    items: ["Node.js", "Express", "FastAPI", "GraphQL", "REST", "tRPC"],
  },
  {
    category: "Databases",
    items: ["PostgreSQL", "MongoDB", "Redis", "Prisma", "Supabase"],
  },
  {
    category: "DevOps / Tools",
    items: ["Linux", "Docker", "Nginx", "Git", "GitHub Actions", "Bash"],
  },
  {
    category: "Languages",
    items: ["TypeScript", "JavaScript", "Python", "Go", "C++", "SQL"],
  },
  {
    category: "Cloud",
    items: ["AWS", "Vercel", "Cloudflare", "Railway", "Docker Swarm"],
  },
];

export const PROJECTS = [
  {
    title: "Sentinel — Observability Platform",
    description:
      "Real-time log streaming and metrics dashboard for distributed systems with sub-second query latency.",
    stack: ["Next.js", "Go", "ClickHouse", "WebSockets"],
    features: ["Live log tailing", "Custom alerting", "Trace correlation"],
    github: "https://github.com/anuragyadav/sentinel",
    demo: "https://sentinel.demo.dev",
  },
  {
    title: "Orbit — Cloud File Sync",
    description:
      "End-to-end encrypted file sync across devices with delta updates and conflict-free merges.",
    stack: ["Rust", "React", "S3", "WebRTC"],
    features: ["E2E encryption", "Delta sync", "Offline-first"],
    github: "https://github.com/anuragyadav/orbit",
    demo: "https://orbit.demo.dev",
  },
  {
    title: "Forge — CI Pipeline Runner",
    description:
      "Lightweight self-hosted CI runner with isolated container builds and parallel matrix jobs.",
    stack: ["TypeScript", "Docker", "Redis", "Node.js"],
    features: ["Matrix builds", "Caching layer", "GitHub integration"],
    github: "https://github.com/anuragyadav/forge",
    demo: "https://forge.demo.dev",
  },
  {
    title: "Nimbus — AI Chat Workspace",
    description:
      "Team-first AI workspace with shared threads, prompt libraries, and per-workspace memory.",
    stack: ["Next.js", "Postgres", "OpenAI", "tRPC"],
    features: ["Shared threads", "Prompt library", "RBAC"],
    github: "https://github.com/anuragyadav/nimbus",
    demo: "https://nimbus.demo.dev",
  },
];

export const EXPERIENCE = [
  {
    company: "Stratos Labs",
    role: "Senior Software Engineer",
    duration: "2023 — Present",
    points: [
      "Led migration of monolith to event-driven microservices, cutting p95 latency by 62%.",
      "Built internal observability platform now used by 40+ engineers daily.",
      "Mentored 4 engineers and owned quarterly performance reviews.",
    ],
  },
  {
    company: "Nebula Systems",
    role: "Full-Stack Engineer",
    duration: "2021 — 2023",
    points: [
      "Shipped customer-facing dashboard used by 25k+ MAUs with 99.95% uptime.",
      "Designed multi-region Postgres replication and zero-downtime deploys.",
      "Reduced infrastructure cost by 38% via container right-sizing.",
    ],
  },
  {
    company: "Indie / Open Source",
    role: "Software Engineer",
    duration: "2019 — 2021",
    points: [
      "Maintained open-source CLI tools with 3k+ combined GitHub stars.",
      "Contributed to popular Node.js libraries and Linux tooling.",
    ],
  },
];