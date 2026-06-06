import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
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
  Menu,
  X,
  Key,
  BookOpen,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { adminLogout } from "@/lib/api/auth.functions";
import type { RagIndexStatus } from "@/lib/content.types";
import {
  getAdminContent,
  getRagIndexStatus,
  updatePortfolioContent,
  reindexRag,
} from "@/lib/api/portfolio.functions";
import type { AdminContent } from "@/lib/admin-store";
import { JARVIS_KNOWLEDGE_BASE_MAX, PORTFOLIO_QUERY_KEY } from "@/lib/content.types";
import { compressImageFile, formatDataUrlSize } from "@/lib/media";
import { readFileAsDataUrl } from "@/lib/resume";

type Tab =
  | "profile"
  | "about"
  | "projects"
  | "skills"
  | "experience"
  | "resume"
  | "social"
  | "knowledge"
  | "api";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "profile", label: "Profile & Contact", icon: User },
  { id: "about", label: "About", icon: FileText },
  { id: "projects", label: "Projects", icon: Code2 },
  { id: "skills", label: "Skills", icon: Cpu },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "resume", label: "Resume", icon: Upload },
  { id: "social", label: "Social Links", icon: Link2 },
  { id: "knowledge", label: "JARVIS Knowledge Base", icon: BookOpen },
  { id: "api", label: "API Configuration", icon: Key },
];

export function AdminDashboard({
  initialContent,
  onLogout,
}: {
  initialContent: AdminContent;
  onLogout: () => void;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState<AdminContent>(initialContent);
  const [tab, setTab] = useState<Tab>("profile");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const persist = async (next: AdminContent) => {
    const merged: AdminContent = {
      ...next,
      deepgramApiKey: next.deepgramApiKey?.trim() || content.deepgramApiKey || "",
      cohereApiKey: next.cohereApiKey?.trim() || content.cohereApiKey || "",
    };
    setContent(merged);
    setSaving(true);
    try {
      await updatePortfolioContent({ data: merged });
      await queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
      const fresh = await getAdminContent();
      setContent(fresh);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await adminLogout();
    onLogout();
  };

  const selectTab = (t: Tab) => {
    setTab(t);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] relative overflow-x-clip">
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-50" />
      <div className="relative mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6">
        {/* Top bar */}
        <div className="glass rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden touch-target size-11 grid place-items-center rounded-md border border-border hover:border-cyan/40 hover:text-cyan transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            <div className="size-7 sm:size-8 rounded-md bg-cyan/15 border border-cyan/40 grid place-items-center">
              <Cpu className="size-3.5 sm:size-4 text-cyan" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold">Admin Console</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                portfolio content
              </div>
            </div>
            <div className="sm:hidden text-sm font-semibold">Admin</div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/"
              className="text-xs px-2 sm:px-3 py-1.5 rounded-md glass glass-hover font-mono hidden sm:inline-flex"
            >
              view site
            </Link>

            <button
              onClick={logout}
              className="text-xs px-2 sm:px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 font-mono inline-flex items-center gap-1 sm:gap-1.5"
            >
              <LogOut className="size-3.5" /> <span className="hidden sm:inline">logout</span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-4 sm:gap-6 items-start">
          {/* Sidebar — mobile overlay / desktop static */}
          {/* Mobile overlay backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <aside
            className={`
              lg:relative lg:translate-x-0 lg:opacity-100 lg:block
              fixed top-0 left-0 z-50 h-full w-[min(260px,85vw)] lg:w-full
              glass rounded-none lg:rounded-2xl p-3 lg:h-fit
              transition-all duration-300 ease-out
              ${
                sidebarOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
              }
            `}
          >
            {/* Mobile close button inside sidebar */}
            <div className="lg:hidden flex items-center justify-between p-2 mb-2 border-b border-border/60">
              <span className="font-mono text-xs text-muted-foreground">Navigation</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="size-7 grid place-items-center rounded-md hover:text-cyan"
              >
                <X className="size-4" />
              </button>
            </div>
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTab(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-3 min-h-11 rounded-lg text-sm transition-colors ${
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
            {/* Mobile-only view site link */}
            <div className="lg:hidden mt-3 pt-3 border-t border-border/60">
              <Link
                to="/"
                className="block text-center text-xs px-3 py-2 rounded-md glass glass-hover font-mono"
              >
                view site
              </Link>
            </div>
          </aside>

          {/* Panel */}
          <main className="glass rounded-2xl p-4 sm:p-6 min-h-[400px] sm:min-h-[500px]">
            {tab === "profile" && <ProfilePanel content={content} onSave={persist} />}
            {tab === "about" && <AboutPanel content={content} onSave={persist} />}
            {tab === "projects" && <ProjectsPanel content={content} onSave={persist} />}
            {tab === "skills" && <SkillsPanel content={content} onSave={persist} />}
            {tab === "experience" && <ExperiencePanel content={content} onSave={persist} />}
            {tab === "resume" && <ResumePanel content={content} onSave={persist} />}
            {tab === "social" && <SocialPanel content={content} onSave={persist} />}
            {tab === "knowledge" && <KnowledgeBasePanel content={content} onSave={persist} />}
            {tab === "api" && <ApiPanel content={content} onSave={persist} />}
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
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow text-sm"
      >
        <Save className="size-4" /> Save changes
      </button>
    </div>
  );
}

function PanelHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-4 sm:mb-5">
      <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
      {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
    </div>
  );
}

// ---------- Panels ----------

function ProfilePanel({
  content,
  onSave,
}: {
  content: AdminContent;
  onSave: (c: AdminContent) => void;
}) {
  const [p, setP] = useState(content.profile);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WEBP, etc.)");
      return;
    }
    try {
      const result = await compressImageFile(file, { maxWidth: 800, maxHeight: 800 });
      setP((prev) => ({ ...prev, photoUrl: result }));
      toast.success(`Photo ready (${formatDataUrlSize(result)}) — click Save to apply`);
    } catch {
      toast.error("Failed to process image file");
    }
  };

  return (
    <div>
      <PanelHeader
        title="Profile & Contact"
        desc="Public-facing identity shown across the portfolio."
      />
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="name" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
        <Field label="role" value={p.role} onChange={(v) => setP({ ...p, role: v })} />
        <Field label="handle" value={p.handle} onChange={(v) => setP({ ...p, handle: v })} />
        <Field label="location" value={p.location} onChange={(v) => setP({ ...p, location: v })} />
        <Field
          label="email"
          value={p.email}
          onChange={(v) => setP({ ...p, email: v })}
          type="email"
        />
        <Field
          label="photo url"
          value={p.photoUrl || ""}
          onChange={(v) => setP({ ...p, photoUrl: v })}
        />
      </div>
      <div className="mt-4 grid sm:grid-cols-[1fr_2fr] gap-4">
        <div className="rounded-xl border border-dashed border-cyan/30 p-4 text-center bg-background/30 flex flex-col justify-center items-center">
          <Upload className="size-5 text-cyan mb-2" />
          <p className="text-xs text-muted-foreground">Upload profile photo</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            className="mt-2 text-[10px] text-muted-foreground w-full file:mr-2 file:px-2 file:py-1 file:rounded file:border file:border-cyan/40 file:bg-cyan/10 file:text-cyan file:font-mono file:cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-4 p-3 rounded-xl border border-border/60 bg-background/20">
          <div className="size-16 rounded-lg overflow-hidden border border-border/80 shrink-0 bg-background">
            <img
              src={
                p.photoUrl ||
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80"
              }
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80";
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono min-w-0">
            <div className="text-cyan font-semibold">Photo Preview</div>
            <div className="mt-1 text-[10px] break-all truncate">
              {p.photoUrl?.startsWith("data:")
                ? "Uploaded Image (Base64)"
                : p.photoUrl || "Default Avatar"}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 sm:mt-4 grid gap-3 sm:gap-4">
        <Field
          label="headline"
          value={p.headline}
          onChange={(v) => setP({ ...p, headline: v })}
          textarea
        />
        <Field label="intro" value={p.intro} onChange={(v) => setP({ ...p, intro: v })} textarea />
      </div>
      <SaveBar onSave={() => onSave({ ...content, profile: p })} />
    </div>
  );
}

function AboutPanel({
  content,
  onSave,
}: {
  content: AdminContent;
  onSave: (c: AdminContent) => void;
}) {
  const [about, setAbout] = useState(content.about);
  return (
    <div>
      <PanelHeader title="About Section" desc="Long-form bio shown on the About section." />
      <Field label="about text" value={about} onChange={setAbout} textarea />
      <SaveBar onSave={() => onSave({ ...content, about })} />
    </div>
  );
}

const PROJECT_IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80";

function ProjectImageEditor({
  imageUrl,
  title,
  onChange,
}: {
  imageUrl?: string;
  title: string;
  onChange: (url: string) => void;
}) {
  const previewSrc = imageUrl?.trim() || PROJECT_IMAGE_FALLBACK;
  const isUploaded = imageUrl?.startsWith("data:") ?? false;

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WEBP, etc.)");
      return;
    }
    try {
      const result = await compressImageFile(file);
      onChange(result);
      toast.success(`Image ready (${formatDataUrlSize(result)}) — click Save to apply`);
    } catch {
      toast.error("Failed to process image file");
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-border/60 bg-background/20 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          card image
        </span>
        {imageUrl?.trim() ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] px-2 py-1 rounded-md border border-border hover:border-destructive/40 text-muted-foreground hover:text-destructive"
          >
            Remove image
          </button>
        ) : null}
      </div>
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-start">
        <div className="space-y-2 min-w-0">
          {isUploaded ? (
            <div className="rounded-lg border border-emerald/30 bg-emerald/5 px-3 py-2">
              <p className="text-xs font-mono text-emerald">Uploaded image stored</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDataUrlSize(imageUrl!)} — saved when you click Save changes
              </p>
            </div>
          ) : (
            <Field label="image url" value={imageUrl || ""} onChange={onChange} />
          )}
          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-cyan/30 p-3 bg-background/30 cursor-pointer hover:border-cyan/50 transition-colors">
            <Upload className="size-4 text-cyan" />
            <span className="text-[10px] text-muted-foreground font-mono">
              {isUploaded ? "Replace image" : "Upload project image"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                void handleFileChange(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="size-[88px] aspect-square rounded-lg overflow-hidden border border-cyan/20 bg-background ring-1 ring-white/5">
            <img
              src={previewSrc}
              alt={`${title} preview`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = PROJECT_IMAGE_FALLBACK;
              }}
            />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground text-center max-w-[88px]">
            {isUploaded ? "Uploaded" : imageUrl?.trim() ? "URL set" : "Default"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProjectsPanel({
  content,
  onSave,
}: {
  content: AdminContent;
  onSave: (c: AdminContent) => void;
}) {
  const [items, setItems] = useState(content.projects);

  const update = (i: number, patch: Partial<(typeof items)[number]>) => {
    setItems(items.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const add = () =>
    setItems([
      ...items,
      {
        title: "New Project",
        description: "",
        stack: [],
        features: [],
        github: "",
        demo: "",
        imageUrl: "",
        hidden: false,
      },
    ]);

  return (
    <div>
      <PanelHeader title="Projects" desc="Add, edit, hide, or remove projects." />
      <div className="space-y-4">
        {items.map((p, i) => (
          <div key={i} className="rounded-xl border border-border/70 p-3 sm:p-4 bg-background/30">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => update(i, { hidden: !p.hidden })}
                  className="text-xs px-2 py-1 rounded-md border border-border hover:border-cyan/40 inline-flex items-center gap-1 sm:gap-1.5"
                >
                  {p.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  <span className="hidden sm:inline">{p.hidden ? "hidden" : "visible"}</span>
                </button>
                <button
                  onClick={() => remove(i)}
                  className="text-xs px-2 py-1 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex items-center gap-1 sm:gap-1.5"
                >
                  <Trash2 className="size-3.5" /> <span className="hidden sm:inline">remove</span>
                </button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="title" value={p.title} onChange={(v) => update(i, { title: v })} />
              <Field
                label="stack (comma separated)"
                value={p.stack.join(", ")}
                onChange={(v) =>
                  update(i, {
                    stack: v.split(",").map((s) => s.trim()),
                  })
                }
              />
              <Field
                label="github url"
                value={p.github}
                onChange={(v) => update(i, { github: v })}
              />
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
                onChange={(v) =>
                  update(i, {
                    features: v.split(",").map((s) => s.trim()),
                  })
                }
              />
            </div>
            <ProjectImageEditor
              imageUrl={p.imageUrl}
              title={p.title}
              onChange={(imageUrl) => update(i, { imageUrl })}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col sm:flex-row justify-between gap-2">
        <button
          onClick={add}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-cyan/40 text-cyan hover:bg-cyan/10 text-sm"
        >
          <Plus className="size-4" /> Add project
        </button>
        <button
          onClick={() =>
            onSave({
              ...content,
              projects: items.map((p) => ({
                ...p,
                stack: p.stack.filter(Boolean),
                features: p.features.filter(Boolean),
              })),
            })
          }
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow text-sm"
        >
          <Save className="size-4" /> Save changes
        </button>
      </div>
    </div>
  );
}

function SkillsPanel({
  content,
  onSave,
}: {
  content: AdminContent;
  onSave: (c: AdminContent) => void;
}) {
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
          <div key={i} className="rounded-xl border border-border/70 p-3 sm:p-4 bg-background/30">
            <div className="grid sm:grid-cols-[1fr_2fr] gap-3 items-end">
              <Field
                label="category"
                value={s.category}
                onChange={(v) => update(i, { category: v })}
              />
              <Field
                label="items (comma separated)"
                value={s.items.join(", ")}
                onChange={(v) =>
                  update(i, {
                    items: v.split(",").map((x) => x.trim()),
                  })
                }
              />
            </div>
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => remove(i)}
                className="px-2 sm:px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <Trash2 className="size-3.5 sm:size-4" />{" "}
                <span className="hidden sm:inline">Remove</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col sm:flex-row justify-between gap-2">
        <button
          onClick={add}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-cyan/40 text-cyan hover:bg-cyan/10 text-sm"
        >
          <Plus className="size-4" /> Add category
        </button>
        <button
          onClick={() =>
            onSave({
              ...content,
              skills: items.map((s) => ({
                ...s,
                items: s.items.filter(Boolean),
              })),
            })
          }
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow text-sm"
        >
          <Save className="size-4" /> Save changes
        </button>
      </div>
    </div>
  );
}

function ExperiencePanel({
  content,
  onSave,
}: {
  content: AdminContent;
  onSave: (c: AdminContent) => void;
}) {
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
          <div key={i} className="rounded-xl border border-border/70 p-3 sm:p-4 bg-background/30">
            <div className="grid sm:grid-cols-3 gap-3">
              <Field
                label="company"
                value={e.company}
                onChange={(v) => update(i, { company: v })}
              />
              <Field label="role" value={e.role} onChange={(v) => update(i, { role: v })} />
              <Field
                label="duration"
                value={e.duration}
                onChange={(v) => update(i, { duration: v })}
              />
            </div>
            <div className="mt-3">
              <Field
                label="key points (one per line)"
                value={e.points.join("\n")}
                onChange={(v) =>
                  update(i, {
                    points: v
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
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
      <div className="mt-4 flex flex-col sm:flex-row justify-between gap-2">
        <button
          onClick={add}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-cyan/40 text-cyan hover:bg-cyan/10 text-sm"
        >
          <Plus className="size-4" /> Add role
        </button>
        <button
          onClick={() => onSave({ ...content, experience: items })}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan text-primary-foreground font-medium glow-cyan hover:bg-cyan-glow text-sm"
        >
          <Save className="size-4" /> Save changes
        </button>
      </div>
    </div>
  );
}

function ResumePanel({
  content,
  onSave,
}: {
  content: AdminContent;
  onSave: (c: AdminContent) => void;
}) {
  const [url, setUrl] = useState(content.resumeUrl);

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Please upload a PDF");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(f);
      setUrl(dataUrl);
      toast.success("PDF loaded — click Save to apply");
    } catch {
      toast.error("Could not read the PDF file");
    }
  };

  return (
    <div>
      <PanelHeader title="Resume" desc="Replace the PDF that the resume section serves." />
      <div className="rounded-xl border border-dashed border-cyan/30 p-6 sm:p-8 text-center bg-background/30">
        <Upload className="size-6 sm:size-7 text-cyan mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Drag & drop a PDF, or pick a file.</p>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="mt-3 mx-auto block text-xs text-muted-foreground file:mr-2 sm:file:mr-3 file:px-2 sm:file:px-3 file:py-1.5 file:rounded-md file:border file:border-cyan/40 file:bg-cyan/10 file:text-cyan file:font-mono"
        />
      </div>
      <div className="mt-4">
        <Field label="current resume url" value={url} onChange={setUrl} />
        {url.trim().startsWith("blob:") && (
          <p className="mt-2 text-xs font-mono text-amber-400/90">
            This link expired after a refresh. Upload the PDF again and save.
          </p>
        )}
      </div>
      <SaveBar
        onSave={() =>
          onSave({ ...content, resumeUrl: url, profile: { ...content.profile, resumeUrl: url } })
        }
      />
    </div>
  );
}

function SocialPanel({
  content,
  onSave,
}: {
  content: AdminContent;
  onSave: (c: AdminContent) => void;
}) {
  const [s, setS] = useState(content.profile.socials);
  const [email, setEmail] = useState(content.profile.email);

  return (
    <div>
      <PanelHeader title="Social Links" desc="GitHub, LinkedIn, Instagram, Twitter, Email." />
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <Field label="email" value={email} onChange={setEmail} />
        <Field label="github" value={s.github} onChange={(v) => setS({ ...s, github: v })} />
        <Field label="linkedin" value={s.linkedin} onChange={(v) => setS({ ...s, linkedin: v })} />
        <Field
          label="instagram"
          value={s.instagram}
          onChange={(v) => setS({ ...s, instagram: v })}
        />
        <Field label="twitter" value={s.twitter} onChange={(v) => setS({ ...s, twitter: v })} />
      </div>
      <SaveBar
        onSave={() => onSave({ ...content, profile: { ...content.profile, socials: s, email } })}
      />
    </div>
  );
}

function KnowledgeBasePanel({
  content,
  onSave,
}: {
  content: AdminContent;
  onSave: (c: AdminContent) => void;
}) {
  const [kb, setKb] = useState(content.jarvisKnowledgeBase ?? "");
  const len = kb.length;
  const overLimit = len > JARVIS_KNOWLEDGE_BASE_MAX;

  return (
    <div>
      <PanelHeader
        title="JARVIS Knowledge Base"
        desc="Store facts about you in plain text. When Primary model is Cohere, JARVIS answers from this knowledge base plus your portfolio sections via RAG."
      />
      <div className="mb-4 rounded-lg border border-cyan/25 bg-cyan/5 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
        <p className="text-foreground/90 font-medium mb-1">What to add</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Short bio, education, certifications, languages</li>
          <li>Interview talking points, achievements, hobbies, values</li>
          <li>FAQs visitors ask (“Are you open to work?”, “What stack do you prefer?”)</li>
          <li>Anything not covered in Projects / Skills / Experience tabs</li>
        </ul>
        <p className="mt-2">
          Then open <span className="text-cyan font-mono">API Configuration</span> → set{" "}
          <span className="text-cyan font-mono">primary model</span> to{" "}
          <span className="text-cyan font-mono">Cohere</span> and save your Cohere API key.
        </p>
      </div>
      <label className="block">
        <span className="text-xs font-mono text-muted-foreground">knowledge base</span>
        <textarea
          value={kb}
          onChange={(e) => setKb(e.target.value)}
          rows={16}
          placeholder={`Example:\n\n## About me\nI am a full-stack developer based in...\n\n## Open to work\nYes, open to remote roles starting...\n\n## Fun facts\nI enjoy building voice AI demos...`}
          className="mt-1 w-full rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm font-mono leading-relaxed outline-none focus:border-cyan/50"
        />
        <div
          className={`mt-1 text-right text-[10px] font-mono ${overLimit ? "text-destructive" : "text-muted-foreground"}`}
        >
          {len.toLocaleString()} / {JARVIS_KNOWLEDGE_BASE_MAX.toLocaleString()} characters
          {overLimit ? " — trim before saving" : ""}
        </div>
      </label>
      <SaveBar
        onSave={() =>
          onSave({
            ...content,
            jarvisKnowledgeBase: kb.slice(0, JARVIS_KNOWLEDGE_BASE_MAX),
          })
        }
      />
    </div>
  );
}

function KeyStatus({ configured, label }: { configured: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-md border ${
        configured
          ? "border-emerald/35 bg-emerald/10 text-emerald"
          : "border-border/70 bg-background/40 text-muted-foreground"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${configured ? "bg-emerald animate-pulse" : "bg-muted-foreground/50"}`}
      />
      {label}: {configured ? "configured" : "not set"}
    </span>
  );
}

function SecretKeyField({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  saved,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  saved: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={saved ? "Saved — enter a new key to replace" : placeholder}
          className="bg-transparent outline-none w-full text-sm font-mono"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="text-muted-foreground hover:text-cyan shrink-0"
          aria-label={visible ? "Hide key" : "Show key"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </label>
  );
}

function ragIndexingPercent(status: RagIndexStatus): number {
  if (!status.totalChunks || status.processedChunks == null) return 0;
  if (status.processedChunks > 0) {
    return Math.min(100, Math.round((status.processedChunks / status.totalChunks) * 100));
  }
  if (status.phase === "persisting") return 92;
  if (status.phase === "embedding") return 4;
  if (status.phase === "preparing") return 1;
  return 0;
}

function ragStatusLabel(status: RagIndexStatus): string {
  switch (status.state) {
    case "indexing": {
      if (status.totalChunks && status.processedChunks != null && status.processedChunks > 0) {
        const pct = ragIndexingPercent(status);
        return `Embedding ${status.processedChunks}/${status.totalChunks} chunks (${pct}%)…`;
      }
      if (status.phase === "persisting") {
        return `Saving ${status.totalChunks ?? ""} chunks to database…`;
      }
      if (status.phase === "embedding") {
        return `Calling Cohere embed API (0/${status.totalChunks ?? "?"} done)…`;
      }
      return `Preparing ${status.totalChunks ?? ""} chunks…`;
    }
    case "ready":
      if (status.skipped && status.chunkCount > 0) {
        return `Up to date — ${status.chunkCount} chunks (skipped, content unchanged)`;
      }
      if (status.chunkCount > 0) {
        return `Ready — ${status.chunkCount} chunks indexed`;
      }
      return "Ready — no content to index";
    case "failed":
      return status.error ? `Failed — ${status.error}` : "Indexing failed";
    case "unconfigured":
      return "Cohere API key required";
    default:
      return "Not indexed yet";
  }
}

function ragStatusTone(status: RagIndexStatus): string {
  switch (status.state) {
    case "ready":
      return "border-emerald/35 bg-emerald/10 text-emerald";
    case "indexing":
      return "border-cyan/35 bg-cyan/10 text-cyan";
    case "failed":
      return "border-destructive/35 bg-destructive/10 text-destructive";
    case "unconfigured":
      return "border-yellow-500/35 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    default:
      return "border-border/70 bg-background/40 text-muted-foreground";
  }
}

function RagIndexSection() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<RagIndexStatus | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await getRagIndexStatus();
      setStatus(next);
    } catch {
      /* ignore — badge stays on last known state */
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status?.state !== "indexing") return;
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status?.state, refreshStatus]);

  const pollUntilRagSettled = useCallback(async (): Promise<RagIndexStatus | null> => {
    for (let attempt = 0; attempt < 300; attempt++) {
      const next = await getRagIndexStatus();
      setStatus(next);
      if (next.state === "ready" || next.state === "failed") {
        return next;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return null;
  }, []);

  const handleReindex = async () => {
    setLoading(true);
    try {
      const result = await reindexRag();

      if (!result.started) {
        setStatus(result.status);
        if (result.status.state === "unconfigured") {
          toast.info("No Cohere API key set — add your key above and save first.");
        }
        return;
      }

      setStatus(result.status);
      const final = await pollUntilRagSettled();
      if (!final) {
        toast.error("Indexing is taking longer than expected. Check terminal [rag] logs.");
        return;
      }
      if (final.state === "failed") {
        toast.error(final.error ?? "Re-indexing failed. Check your Cohere API key.");
        return;
      }
      if (final.skipped) {
        toast.info(`RAG up to date — ${final.chunkCount} chunks (content unchanged).`);
      } else {
        toast.success(`RAG re-indexed: ${final.chunkCount} chunks embedded.`);
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Re-indexing failed. Check your Cohere API key and try again.";
      toast.error(message);
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {status && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs font-mono ${ragStatusTone(status)}`}
        >
          {ragStatusLabel(status)}
          {status.state === "indexing" && status.totalChunks != null && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-background/60 overflow-hidden">
              <div
                className="h-full bg-cyan transition-all duration-300"
                style={{ width: `${ragIndexingPercent(status)}%` }}
              />
            </div>
          )}
          {status.updatedAt > 0 && status.state !== "indexing" && (
            <span className="block mt-0.5 opacity-70">
              Updated {new Date(status.updatedAt).toLocaleString()}
            </span>
          )}
        </div>
      )}
      <button
        onClick={handleReindex}
        disabled={loading || status?.state === "indexing"}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan/40 text-cyan hover:bg-cyan/10 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCcw className={`size-4 ${loading || status?.state === "indexing" ? "animate-spin" : ""}`} />
        {loading || status?.state === "indexing" ? "Re-indexing…" : "Re-index RAG"}
      </button>
    </div>
  );
}

function ApiPanel({
  content,
  onSave,
}: {
  content: AdminContent;
  onSave: (c: AdminContent) => void;
}) {
  const [deepgramApiKey, setDeepgramApiKey] = useState("");
  const [cohereApiKey, setCohereApiKey] = useState("");
  const [primaryModel, setPrimaryModel] = useState<AdminContent["primaryModel"]>(
    content.primaryModel === "cohere" ? "cohere" : "static",
  );
  const [jarvisEnabled, setJarvisEnabled] = useState(content.jarvisEnabled !== false);
  const [deepgramSttModel, setDeepgramSttModel] = useState(content.deepgramSttModel ?? "nova-3");
  const [deepgramTtsModel, setDeepgramTtsModel] = useState(
    content.deepgramTtsModel ?? "aura-2-thalia-en",
  );
  const [showDeepgram, setShowDeepgram] = useState(false);
  const [showCohere, setShowCohere] = useState(false);

  const deepgramConfigured = Boolean(deepgramApiKey.trim() || content.deepgramApiKey?.trim());
  const cohereConfigured = Boolean(cohereApiKey.trim() || content.cohereApiKey?.trim());

  return (
    <div>
      <PanelHeader
        title="API Configuration"
        desc="Manage provider keys from the admin panel. Keys are stored server-side and never exposed on the public site."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <KeyStatus configured={deepgramConfigured} label="Deepgram" />
        <KeyStatus configured={cohereConfigured} label="Cohere" />
      </div>

      <div className="mb-5 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
        Save keys here to enable JARVIS voice and AI replies without redeploying. For security, SMTP settings (like your App Password) must be configured in <span className="font-mono text-cyan">.dev.vars</span> via <span className="font-mono text-cyan">SMTP_PASS</span> (locally) or as a secure secret (in production).
      </div>

      <div className="space-y-6">
        <section className="space-y-4 rounded-xl border border-border/60 bg-background/20 p-4">
          <div>
            <h3 className="text-sm font-semibold">Voice — Deepgram</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Powers JARVIS speech-to-text and text-to-speech.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={jarvisEnabled}
              onChange={(e) => setJarvisEnabled(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">JARVIS voice assistant enabled</span>
          </label>

          <SecretKeyField
            label="deepgram api key"
            value={deepgramApiKey}
            onChange={setDeepgramApiKey}
            visible={showDeepgram}
            onToggleVisible={() => setShowDeepgram(!showDeepgram)}
            saved={Boolean(content.deepgramApiKey?.trim())}
            placeholder="Paste Deepgram API key"
          />

          <label className="block">
            <span className="text-xs font-mono text-muted-foreground">deepgram STT model</span>
            <input
              value={deepgramSttModel}
              onChange={(e) => setDeepgramSttModel(e.target.value)}
              placeholder="nova-3"
              className="mt-1 w-full rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm font-mono outline-none focus:border-cyan/50"
            />
          </label>

          <label className="block">
            <span className="text-xs font-mono text-muted-foreground">deepgram TTS model</span>
            <input
              value={deepgramTtsModel}
              onChange={(e) => setDeepgramTtsModel(e.target.value)}
              placeholder="aura-2-thalia-en"
              className="mt-1 w-full rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm font-mono outline-none focus:border-cyan/50"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-xl border border-border/60 bg-background/20 p-4">
          <div>
            <h3 className="text-sm font-semibold">AI — Cohere</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Powers JARVIS conversational replies and RAG semantic search over your portfolio.
            </p>
          </div>

          <label className="block">
            <span className="text-xs font-mono text-muted-foreground">primary model</span>
            <select
              value={primaryModel}
              onChange={(e) => setPrimaryModel(e.target.value as AdminContent["primaryModel"])}
              className="mt-1 w-full rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm outline-none focus:border-cyan/50"
            >
              <option value="static">Static (no AI)</option>
              <option value="cohere">Cohere (RAG + Knowledge Base)</option>
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Choose Cohere and save a valid API key to enable AI answers from your Knowledge Base
              and portfolio sections.
            </p>
          </label>

          <SecretKeyField
            label="cohere api key"
            value={cohereApiKey}
            onChange={setCohereApiKey}
            visible={showCohere}
            onToggleVisible={() => setShowCohere(!showCohere)}
            saved={Boolean(content.cohereApiKey?.trim())}
            placeholder="Paste Cohere API key"
          />
        </section>

        <section className="space-y-4 rounded-xl border border-border/60 bg-background/20 p-4">
          <div>
            <h3 className="text-sm font-semibold">RAG Indexing</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Re-index all portfolio content for semantic search. Runs automatically on save when Cohere key is set.
            </p>
          </div>
          <RagIndexSection />
        </section>
      </div>

      <SaveBar
        onSave={() =>
          onSave({
            ...content,
            deepgramApiKey: deepgramApiKey.trim() || content.deepgramApiKey || "",
            cohereApiKey: cohereApiKey.trim() || content.cohereApiKey || "",
            primaryModel,
            jarvisEnabled,
            deepgramSttModel,
            deepgramTtsModel,
          })
        }
      />
    </div>
  );
}
