import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  Code2,
  FileText,
  LogOut,
  Plus,
  Save,
  Trash2,
  User,
  Eye,
  EyeOff,
  Link2,
  Upload,
  RotateCcw,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import {
  loadContent,
  saveContent,
  resetContent,
  setAdminSession,
  type Content,
} from "@/lib/admin-store";

type Tab = "profile" | "about" | "projects" | "skills" | "experience" | "resume" | "social";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "profile", label: "Profile & Contact", icon: User },
  { id: "about", label: "About", icon: FileText },
  { id: "projects", label: "Projects", icon: Code2 },
  { id: "skills", label: "Skills", icon: Cpu },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "resume", label: "Resume", icon: Upload },
  { id: "social", label: "Social Links", icon: Link2 },
];

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [content, setContent] = useState<Content>(() => loadContent());
  const [tab, setTab] = useState<Tab>("profile");

  const persist = (next: Content) => {
    setContent(next);
    saveContent(next);
    toast.success("Saved");
  };

  const logout = () => {
    setAdminSession(false);
    onLogout();
  };

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 py-6">
        {/* Top bar */}
        <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-md bg-cyan/15 border border-cyan/40 grid place-items-center">
              <Cpu className="size-4 text-cyan" />
            </div>
            <div>
              <div className="text-sm font-semibold">Admin Console</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                portfolio content
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-xs px-3 py-1.5 rounded-md glass glass-hover font-mono"
            >
              view site
            </Link>
            <button
              onClick={() => {
                resetContent();
                setContent(loadContent());
                toast.success("Reset to defaults");
              }}
              className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-cyan/40 font-mono inline-flex items-center gap-1.5"
            >
              <RotateCcw className="size-3.5" /> reset
            </button>
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 font-mono inline-flex items-center gap-1.5"
            >
              <LogOut className="size-3.5" /> logout
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="glass rounded-2xl p-3 h-fit">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-cyan/15 text-cyan border border-cyan/40"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  <Icon className="size-4" />
                  {t.label}
                </button>
              );
            })}
          </aside>

          {/* Panel */}
          <main className="glass rounded-2xl p-6 min-h-[500px]">
            {tab === "profile" && <ProfilePanel content={content} onSave={persist} />}
            {tab === "about" && <AboutPanel content={content} onSave={persist} />}
            {tab === "projects" && <ProjectsPanel content={content} onSave={persist} />}
            {tab === "skills" && <SkillsPanel content={content} onSave={persist} />}
            {tab === "experience" && <ExperiencePanel content={content} onSave={persist} />}
            {tab === "resume" && <ResumePanel content={content} onSave={persist} />}
            {tab === "social" && <SocialPanel content={content} onSave={persist} />}
          </main>
        </div>
      </div>
    </div>
  );
}

// ---------- Reusable bits ----------

function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm outline-none focus:border-cyan/50"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm outline-none focus:border-cyan/50"
        />
      )}
    </label>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="mt-6 flex justify-end">
      <button
        onClick={onSave}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow"
      >
        <Save className="size-4" /> Save changes
      </button>
    </div>
  );
}

function PanelHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
    </div>
  );
}

// ---------- Panels ----------

function ProfilePanel({ content, onSave }: { content: Content; onSave: (c: Content) => void }) {
  const [p, setP] = useState(content.profile);
  return (
    <div>
      <PanelHeader title="Profile & Contact" desc="Public-facing identity shown across the portfolio." />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="name" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
        <Field label="role" value={p.role} onChange={(v) => setP({ ...p, role: v })} />
        <Field label="handle" value={p.handle} onChange={(v) => setP({ ...p, handle: v })} />
        <Field label="location" value={p.location} onChange={(v) => setP({ ...p, location: v })} />
        <Field label="email" value={p.email} onChange={(v) => setP({ ...p, email: v })} type="email" />
      </div>
      <div className="mt-4 grid gap-4">
        <Field label="headline" value={p.headline} onChange={(v) => setP({ ...p, headline: v })} textarea />
        <Field label="intro" value={p.intro} onChange={(v) => setP({ ...p, intro: v })} textarea />
      </div>
      <SaveBar onSave={() => onSave({ ...content, profile: p })} />
    </div>
  );
}

function AboutPanel({ content, onSave }: { content: Content; onSave: (c: Content) => void }) {
  const [about, setAbout] = useState(content.about);
  return (
    <div>
      <PanelHeader title="About Section" desc="Long-form bio shown on the About section." />
      <Field label="about text" value={about} onChange={setAbout} textarea />
      <SaveBar onSave={() => onSave({ ...content, about })} />
    </div>
  );
}

function ProjectsPanel({ content, onSave }: { content: Content; onSave: (c: Content) => void }) {
  const [items, setItems] = useState(content.projects);

  const update = (i: number, patch: Partial<(typeof items)[number]>) => {
    setItems(items.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const add = () =>
    setItems([
      ...items,
      { title: "New Project", description: "", stack: [], features: [], github: "", demo: "", hidden: false },
    ]);

  return (
    <div>
      <PanelHeader title="Projects" desc="Add, edit, hide, or remove projects." />
      <div className="space-y-4">
        {items.map((p, i) => (
          <div key={i} className="rounded-xl border border-border/70 p-4 bg-background/30">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => update(i, { hidden: !p.hidden })}
                  className="text-xs px-2 py-1 rounded-md border border-border hover:border-cyan/40 inline-flex items-center gap-1.5"
                >
                  {p.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {p.hidden ? "hidden" : "visible"}
                </button>
                <button
                  onClick={() => remove(i)}
                  className="text-xs px-2 py-1 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="size-3.5" /> remove
                </button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="title" value={p.title} onChange={(v) => update(i, { title: v })} />
              <Field
                label="stack (comma separated)"
                value={p.stack.join(", ")}
                onChange={(v) => update(i, { stack: v.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
              <Field label="github url" value={p.github} onChange={(v) => update(i, { github: v })} />
              <Field label="demo url" value={p.demo} onChange={(v) => update(i, { demo: v })} />
            </div>
            <div className="mt-3">
              <Field
                label="description"
                value={p.description}
                onChange={(v) => update(i, { description: v })}
                textarea
              />
            </div>
            <div className="mt-3">
              <Field
                label="features (comma separated)"
                value={p.features.join(", ")}
                onChange={(v) => update(i, { features: v.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={add}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan/40 text-cyan hover:bg-cyan/10 text-sm"
        >
          <Plus className="size-4" /> Add project
        </button>
        <button
          onClick={() => onSave({ ...content, projects: items })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow"
        >
          <Save className="size-4" /> Save changes
        </button>
      </div>
    </div>
  );
}

function SkillsPanel({ content, onSave }: { content: Content; onSave: (c: Content) => void }) {
  const [items, setItems] = useState(content.skills);

  const update = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems(items.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const add = () => setItems([...items, { category: "New Category", items: [] }]);

  return (
    <div>
      <PanelHeader title="Skills" desc="Group skills by category." />
      <div className="space-y-3">
        {items.map((s, i) => (
          <div key={i} className="rounded-xl border border-border/70 p-4 bg-background/30">
            <div className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-end">
              <Field label="category" value={s.category} onChange={(v) => update(i, { category: v })} />
              <Field
                label="items (comma separated)"
                value={s.items.join(", ")}
                onChange={(v) => update(i, { items: v.split(",").map((x) => x.trim()).filter(Boolean) })}
              />
              <button
                onClick={() => remove(i)}
                className="h-[42px] px-3 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex items-center gap-1.5 text-sm"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={add}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan/40 text-cyan hover:bg-cyan/10 text-sm"
        >
          <Plus className="size-4" /> Add category
        </button>
        <button
          onClick={() => onSave({ ...content, skills: items })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow"
        >
          <Save className="size-4" /> Save changes
        </button>
      </div>
    </div>
  );
}

function ExperiencePanel({ content, onSave }: { content: Content; onSave: (c: Content) => void }) {
  const [items, setItems] = useState(content.experience);

  const update = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems(items.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const add = () =>
    setItems([...items, { company: "Company", role: "Role", duration: "YYYY — YYYY", points: [] }]);

  return (
    <div>
      <PanelHeader title="Work Experience" desc="Roles, durations, and key wins." />
      <div className="space-y-3">
        {items.map((e, i) => (
          <div key={i} className="rounded-xl border border-border/70 p-4 bg-background/30">
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="company" value={e.company} onChange={(v) => update(i, { company: v })} />
              <Field label="role" value={e.role} onChange={(v) => update(i, { role: v })} />
              <Field label="duration" value={e.duration} onChange={(v) => update(i, { duration: v })} />
            </div>
            <div className="mt-3">
              <Field
                label="key points (one per line)"
                value={e.points.join("\n")}
                onChange={(v) => update(i, { points: v.split("\n").map((x) => x.trim()).filter(Boolean) })}
                textarea
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => remove(i)}
                className="text-xs px-2 py-1 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex items-center gap-1.5"
              >
                <Trash2 className="size-3.5" /> remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={add}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan/40 text-cyan hover:bg-cyan/10 text-sm"
        >
          <Plus className="size-4" /> Add role
        </button>
        <button
          onClick={() => onSave({ ...content, experience: items })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow"
        >
          <Save className="size-4" /> Save changes
        </button>
      </div>
    </div>
  );
}

function ResumePanel({ content, onSave }: { content: Content; onSave: (c: Content) => void }) {
  const [url, setUrl] = useState(content.resumeUrl);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Please upload a PDF");
      return;
    }
    // Frontend-only: convert to object URL. (Backend will replace with proper storage.)
    const obj = URL.createObjectURL(f);
    setUrl(obj);
    toast.success("PDF loaded — click Save to apply");
  };

  return (
    <div>
      <PanelHeader title="Resume" desc="Replace the PDF that the resume section serves." />
      <div className="rounded-xl border border-dashed border-cyan/30 p-8 text-center bg-background/30">
        <Upload className="size-7 text-cyan mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Drag & drop a PDF, or pick a file.</p>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="mt-3 mx-auto block text-xs text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-cyan/40 file:bg-cyan/10 file:text-cyan file:font-mono"
        />
      </div>
      <div className="mt-4">
        <Field label="current resume url" value={url} onChange={setUrl} />
      </div>
      <SaveBar onSave={() => onSave({ ...content, resumeUrl: url, profile: { ...content.profile, resumeUrl: url } })} />
    </div>
  );
}

function SocialPanel({ content, onSave }: { content: Content; onSave: (c: Content) => void }) {
  const [s, setS] = useState(content.profile.socials);
  const [email, setEmail] = useState(content.profile.email);

  return (
    <div>
      <PanelHeader title="Social Links" desc="GitHub, LinkedIn, Instagram, Twitter, Email." />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="email" value={email} onChange={setEmail} />
        <Field label="github" value={s.github} onChange={(v) => setS({ ...s, github: v })} />
        <Field label="linkedin" value={s.linkedin} onChange={(v) => setS({ ...s, linkedin: v })} />
        <Field label="instagram" value={s.instagram} onChange={(v) => setS({ ...s, instagram: v })} />
        <Field label="twitter" value={s.twitter} onChange={(v) => setS({ ...s, twitter: v })} />
      </div>
      <SaveBar
        onSave={() =>
          onSave({ ...content, profile: { ...content.profile, socials: s, email } })
        }
      />
    </div>
  );
}