"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Magnetic } from "@/components/motion/Magnetic";
import { HintTooltip } from "@/components/admin/HintTooltip";
import {
  createSection,
  updateSection,
  softDeleteSection,
  createResource,
  updateResource,
  deleteResource,
  recategorizeResource,
} from "@/server/resources-admin";
import { format } from "date-fns";
import { BulkUploadPanel } from "./bulk-upload-panel";

interface Section {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

interface ResourceRow {
  id: string;
  title: string;
  slug?: string;
  summary?: string | null;
  description: string | null;
  type: string;
  url: string | null;
  fileKey: string | null;
  sourceFilename?: string | null;
  sectionId?: string | null;
  category: string | null;
  isPublic: boolean;
  level: string | null;
  audience?: string | null;
  seriesName: string | null;
  topics?: string[] | null;
  themes?: string[] | null;
  booksOfBible?: string[] | null;
  estimatedMinutes?: number | null;
  aiCategorizedAt?: Date | string | null;
  createdAt: Date | string;
}

interface ResourcesAdminProps {
  initialSections: Section[];
  initialResources: ResourceRow[];
  dbError?: string;
}

const ICON_OPTIONS: IconName[] = [
  "scroll",
  "shield",
  "anchor",
  "lamp",
  "flame",
  "compass",
  "watchtower",
  "oak",
  "gate",
  "table",
];

export function ResourcesAdmin({
  initialSections,
  initialResources,
  dbError,
}: ResourcesAdminProps) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [resources, setResources] = useState(initialResources);
  const [activeSlug, setActiveSlug] = useState<string>(
    initialSections[0]?.slug ?? ""
  );
  const [showNewSection, setShowNewSection] = useState(false);
  const [showNewResource, setShowNewResource] = useState(false);
  const [pending, startTransition] = useTransition();

  const activeSection = sections.find((s) => s.slug === activeSlug);
  const filteredResources = useMemo(
    () =>
      resources.filter((r) => {
        if (!activeSection) return false;
        if (r.sectionId && r.sectionId === activeSection.id) return true;
        // legacy rows: match by category slug
        return (r.category ?? "general") === activeSlug;
      }),
    [resources, activeSlug, activeSection]
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleCreateSection(name: string, description: string, icon: string) {
    if (!name.trim()) return;
    try {
      const row = await createSection({ name, description, icon });
      setSections([...sections, row].sort((a, b) => a.sortOrder - b.sortOrder));
      setActiveSlug(row.slug);
      setShowNewSection(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create section");
    }
  }

  async function handleDeleteSection(id: string) {
    if (!confirm("Delete this section? Resources keep their category but will need re-grouping.")) return;
    await softDeleteSection(id);
    const next = sections.filter((s) => s.id !== id);
    setSections(next);
    setActiveSlug(next[0]?.slug ?? "");
  }

  async function handleCreateResource(input: {
    title: string;
    description: string;
    url: string;
    fileKey: string;
    type: "link" | "file" | "video";
  }) {
    if (!input.title.trim()) return;
    if (!activeSlug) {
      alert("Pick a section first.");
      return;
    }
    try {
      const row = await createResource({
        ...input,
        category: activeSlug,
      });
      setResources([row, ...resources]);
      setShowNewResource(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create resource");
    }
  }

  async function handleDeleteResource(id: string) {
    if (!confirm("Delete this resource permanently?")) return;
    await deleteResource(id);
    setResources(resources.filter((r) => r.id !== id));
  }

  async function handleToggleVisibility(r: ResourceRow) {
    await updateResource({ id: r.id, isPublic: !r.isPublic });
    setResources(
      resources.map((x) => (x.id === r.id ? { ...x, isPublic: !x.isPublic } : x))
    );
  }

  if (dbError) {
    // Heuristics for what likely went wrong. We surface the raw error
    // first because it's the only ground truth — these are educated
    // guesses about what to do about it.
    const looksMissingColumn = /column .* does not exist|relation .* does not exist/i.test(
      dbError
    );
    const looksAuth = /authentication|password|permission|role/i.test(dbError);
    const looksConnection = /connect|timeout|ECONN|getaddrinfo|TLS|SSL/i.test(
      dbError
    );

    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="border border-oxblood/40 bg-oxblood/15 p-6 text-sm text-bone">
          <p className="display-xl text-base">The Resources page can&rsquo;t load.</p>

          <p className="mt-3 text-xs uppercase tracking-wider text-stone/55">
            Raw error from Neon
          </p>
          <pre className="mt-2 overflow-x-auto border border-stone/20 bg-iron/60 px-3 py-2 text-[0.6875rem] leading-relaxed text-bone">
{dbError}
          </pre>

          <p className="mt-4 text-xs uppercase tracking-wider text-stone/55">
            Likely cause
          </p>
          <p className="mt-1 text-stone/80">
            {looksMissingColumn
              ? "A migration hasn't been applied to the database your app is connected to. Verify NEON_DATABASE_URL in Vercel points at the database you actually migrated. (Different Neon projects + branches will look identical from the connection string alone.)"
              : looksAuth
              ? "Connection to Neon was refused. The credentials in NEON_DATABASE_URL probably don't match the database — check Vercel env vs the user/password in Neon."
              : looksConnection
              ? "Couldn't reach the Neon endpoint. Network or endpoint URL issue."
              : "Could be a missing migration, a stale Vercel env var, or a DB pointing at a different project. Read the raw error above first."}
          </p>

          {looksMissingColumn && (
            <>
              <p className="mt-4 text-xs uppercase tracking-wider text-stone/55">
                If you need to apply migrations
              </p>
              <pre className="mt-2 overflow-x-auto border border-stone/20 bg-iron/60 px-3 py-2 text-[0.6875rem] leading-relaxed text-bone">
{`cd /Users/drewgodwin/sheepdogsociety
NEON_DATABASE_URL='paste-the-prod-url-here' \\
  node scripts/apply-neon-migration.mjs drizzle`}
              </pre>
              <p className="mt-2 text-[0.6875rem] text-stone/55">
                The runner applies <em>every</em> SQL file in <code>drizzle/</code> in order, with <code>IF NOT EXISTS</code> guards, so it&rsquo;s safe to re-run.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-12 md:py-14">
      {/* Header */}
      <header>
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ Resources</span>
          <div className="hairline flex-1" />
        </div>
        <h1 className="display-xl mt-6 text-3xl text-bone md:text-5xl">
          Build the library.
          <br />
          <span className="text-brass">Section by section.</span>
        </h1>
        <p className="mt-6 max-w-2xl font-pullquote text-base italic leading-relaxed text-stone/80">
          Sections are how the public site groups your library. Bible Studies, Leader Guides, Workout Plans, anything you need. Add files (uploaded to Vercel Blob), AI-generated PDFs/images, or external links. Anything marked public shows on /resources for download.
        </p>
      </header>

      {/* Section rail + resources */}
      <div className="mt-12 grid gap-8 md:grid-cols-[260px_1fr]">
        {/* Section rail */}
        <aside>
          <div className="flex items-center justify-between">
            <span className="section-mark text-stone/55">Sections</span>
            <button
              type="button"
              onClick={() => setShowNewSection((v) => !v)}
              className="text-xs text-brass transition-colors hover:text-gold"
            >
              {showNewSection ? "Cancel" : "+ New"}
            </button>
          </div>

          {showNewSection && (
            <NewSectionForm
              onSubmit={handleCreateSection}
              onCancel={() => setShowNewSection(false)}
            />
          )}

          <ul className="mt-4 space-y-1">
            {sections.map((s) => {
              const active = s.slug === activeSlug;
              const count = resources.filter(
                (r) => (r.category ?? "general") === s.slug
              ).length;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSlug(s.slug)}
                    className={`group flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-brass/15 text-bone"
                        : "text-stone/75 hover:bg-iron/60 hover:text-bone"
                    }`}
                  >
                    <Icon
                      name={(s.icon as IconName) || "scroll"}
                      size={16}
                      className={active ? "text-brass" : "text-stone/55"}
                    />
                    <span className="flex-1 truncate">{s.name}</span>
                    <span className="text-xs text-stone/45">{count}</span>
                  </button>
                </li>
              );
            })}
            {sections.length === 0 && !showNewSection && (
              <li className="border border-dashed border-stone/15 p-4 text-center text-xs text-stone/55">
                No sections yet. Add one to get started.
              </li>
            )}
          </ul>
        </aside>

        {/* Active section */}
        <section className="min-w-0">
          {activeSection ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone/15 pb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <Icon
                      name={(activeSection.icon as IconName) || "scroll"}
                      size={24}
                      className="text-brass"
                    />
                    <h2 className="display-xl text-2xl text-bone md:text-3xl">
                      {activeSection.name}
                    </h2>
                    <HintTooltip hint="Click resources to edit. Toggle public/private with the eye icon. Public resources appear on /resources." />
                  </div>
                  {activeSection.description && (
                    <p className="mt-2 text-sm text-stone/70">
                      {activeSection.description}
                    </p>
                  )}
                  <p className="mt-1 section-mark text-stone/40">
                    /resources/{activeSection.slug}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingSectionId(activeSection.id)}
                    className="inline-flex h-9 items-center gap-1.5 border border-stone/20 px-3 text-xs text-stone/65 transition-colors hover:border-brass hover:text-brass"
                  >
                    <Icon name="pen" size={12} />
                    Edit section
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(activeSection.id)}
                    className="inline-flex h-9 items-center gap-1.5 border border-stone/20 px-3 text-xs text-stone/65 transition-colors hover:border-oxblood hover:text-oxblood"
                  >
                    <Icon name="trash" size={12} />
                    Delete section
                  </button>
                  <Magnetic strength={0.18}>
                    <button
                      type="button"
                      onClick={() => setShowNewResource(true)}
                      className="lift inline-flex h-9 items-center gap-2 border border-bone bg-bone px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-stone"
                    >
                      <Icon name="plus" size={12} />
                      Add one
                    </button>
                  </Magnetic>
                </div>
              </div>

              {editingSectionId === activeSection.id && (
                <EditSectionForm
                  initial={activeSection}
                  onSubmit={async (patch) => {
                    await updateSection({ id: activeSection.id, ...patch });
                    setSections((prev) =>
                      prev.map((s) =>
                        s.id === activeSection.id ? { ...s, ...patch } : s
                      )
                    );
                    setEditingSectionId(null);
                  }}
                  onCancel={() => setEditingSectionId(null)}
                />
              )}

              <div className="mt-6">
                <BulkUploadPanel
                  sectionId={activeSection.id}
                  sectionName={activeSection.name}
                  onUploaded={refresh}
                />
              </div>

              {showNewResource && (
                <NewResourceForm
                  sectionSlug={activeSection.slug}
                  onSubmit={handleCreateResource}
                  onCancel={() => setShowNewResource(false)}
                />
              )}

              <ul className="mt-6 space-y-2">
                {filteredResources.length === 0 && !showNewResource ? (
                  <li className="border border-dashed border-stone/15 p-12 text-center">
                    <Icon
                      name="image"
                      size={32}
                      className="mx-auto text-stone/35"
                    />
                    <p className="mt-4 font-pullquote text-base italic text-stone/65">
                      No resources here yet. Add the first one.
                    </p>
                  </li>
                ) : (
                  filteredResources.map((r) => (
                    <ResourceRow
                      key={r.id}
                      resource={r}
                      onToggleVisibility={() => handleToggleVisibility(r)}
                      onDelete={() => handleDeleteResource(r.id)}
                      onUpdate={async (patch) => {
                        const cleaned: {
                          id: string;
                          title?: string;
                          description?: string;
                          url?: string;
                          fileKey?: string;
                          category?: string;
                          level?: string;
                          isPublic?: boolean;
                        } = { id: r.id };
                        if (typeof patch.title === "string") cleaned.title = patch.title;
                        if (typeof patch.description === "string")
                          cleaned.description = patch.description;
                        if (typeof patch.url === "string") cleaned.url = patch.url;
                        if (typeof patch.fileKey === "string")
                          cleaned.fileKey = patch.fileKey;
                        if (typeof patch.category === "string")
                          cleaned.category = patch.category;
                        if (typeof patch.level === "string") cleaned.level = patch.level;
                        if (typeof patch.isPublic === "boolean")
                          cleaned.isPublic = patch.isPublic;
                        await updateResource(cleaned);
                        setResources(
                          resources.map((x) =>
                            x.id === r.id ? { ...x, ...patch } : x
                          )
                        );
                      }}
                    />
                  ))
                )}
              </ul>
            </>
          ) : (
            <div className="border border-dashed border-stone/15 p-12 text-center">
              <Icon name="scroll" size={32} className="mx-auto text-stone/35" />
              <p className="mt-4 font-pullquote text-base italic text-stone/65">
                Pick a section, or create one to start.
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-12 flex items-center gap-2 text-xs text-stone/45">
        <Icon name="info" size={12} className="text-stone/40" />
        Pages are auto-revalidated. Public visitors see your changes within seconds.
        {pending && <span className="ml-2 text-brass">Refreshing...</span>}
      </p>
    </div>
  );
}

function NewSectionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string, description: string, icon: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<IconName>("scroll");

  return (
    <div className="mt-3 border border-brass/30 bg-iron/40 p-4">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Section name (e.g. Bible Studies)"
        className="block w-full bg-transparent text-sm text-bone placeholder:text-stone/40 focus:outline-none"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description (optional)"
        className="mt-2 block w-full bg-transparent text-xs text-stone/75 placeholder:text-stone/40 focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ICON_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setIcon(opt)}
            className={`flex h-8 w-8 items-center justify-center border ${
              icon === opt
                ? "border-brass bg-brass/20 text-bone"
                : "border-stone/15 text-stone/55 hover:border-brass/50"
            }`}
            title={opt}
          >
            <Icon name={opt} size={14} />
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onSubmit(name, description, icon)}
          disabled={!name.trim()}
          className="lift inline-flex h-8 items-center gap-1.5 bg-brass px-3 text-[0.625rem] font-medium uppercase tracking-wider text-ink transition-colors hover:bg-gold disabled:opacity-60"
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-stone/65 transition-colors hover:text-bone"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function NewResourceForm({
  sectionSlug,
  onSubmit,
  onCancel,
}: {
  sectionSlug: string;
  onSubmit: (input: {
    title: string;
    description: string;
    url: string;
    fileKey: string;
    type: "link" | "file" | "video";
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedKey, setUploadedKey] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `resources/${sectionSlug}`);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUploadedKey(data.url);
      setUrl(data.url);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-6 border border-brass/30 bg-iron/40 p-5">
      <div className="flex items-center gap-3">
        <Icon name="plus" size={14} className="text-brass" />
        <span className="section-mark text-brass">New resource</span>
      </div>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mt-4 block w-full border border-stone/15 bg-transparent px-3 py-2 text-sm text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="Short description"
        className="mt-3 block w-full resize-none border border-stone/15 bg-transparent px-3 py-2 text-sm text-stone/85 placeholder:text-stone/40 focus:border-brass focus:outline-none"
      />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 border border-dashed border-stone/20 bg-iron/30 px-3 py-2 text-xs text-stone/70 hover:border-brass/50">
          <Icon name="download" size={12} className="rotate-180" />
          {uploading
            ? "Uploading..."
            : uploadedKey
            ? "Replace file"
            : "Upload file"}
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="...or external link"
          className="border border-stone/15 bg-transparent px-3 py-2 text-xs text-bone placeholder:text-stone/40 focus:border-brass focus:outline-none"
        />
      </div>
      {uploadedKey && (
        <p className="mt-2 truncate text-[0.625rem] text-stone/50">
          Stored: {uploadedKey}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() =>
            onSubmit({
              title,
              description,
              url,
              fileKey: uploadedKey,
              type: uploadedKey ? "file" : "link",
            })
          }
          disabled={!title.trim() || (!uploadedKey && !url.trim())}
          className="lift inline-flex h-9 items-center gap-1.5 bg-brass px-4 text-xs font-medium uppercase tracking-wider text-ink transition-colors hover:bg-gold disabled:opacity-60"
        >
          Create resource
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-stone/65 transition-colors hover:text-bone"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ResourceRow({
  resource,
  onToggleVisibility,
  onDelete,
  onUpdate,
}: {
  resource: ResourceRow;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<ResourceRow>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(resource.title);
  const [description, setDescription] = useState(resource.description ?? "");
  const [recat, setRecat] = useState<"idle" | "busy" | "error">("idle");
  const [recatError, setRecatError] = useState("");
  const tags = [
    ...(resource.topics ?? []),
    ...(resource.themes ?? []),
    ...(resource.booksOfBible ?? []),
  ];

  async function handleRecategorize() {
    setRecat("busy");
    setRecatError("");
    try {
      await recategorizeResource(resource.id);
      setRecat("idle");
      window.location.reload();
    } catch (e) {
      setRecat("error");
      setRecatError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleReextract() {
    setRecat("busy");
    setRecatError("");
    try {
      const res = await fetch("/api/admin/resources/reextract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resource.id, recategorize: true }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setRecat("idle");
      window.location.reload();
    } catch (e) {
      setRecat("error");
      setRecatError(e instanceof Error ? e.message : "Failed");
    }
  }

  // Heuristic: show re-extract on file uploads that don't yet have an
  // AI categorization timestamp (legacy resources from before the bulk
  // upload pipeline existed).
  const showReextract =
    !!resource.fileKey &&
    !resource.aiCategorizedAt &&
    /\.docx(\?|$)/i.test(resource.fileKey);

  return (
    <li className="group/item border border-stone/15 bg-iron/30 px-4 py-3 transition-colors hover:border-stone/30">
      {editing ? (
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full bg-transparent text-sm text-bone focus:outline-none"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full bg-transparent text-xs text-stone/80 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await onUpdate({ title, description });
                setEditing(false);
              }}
              className="text-xs font-medium text-brass hover:text-gold"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-stone/55 hover:text-bone"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <Icon
            name={resource.fileKey ? "download" : "arrow-up-right"}
            size={16}
            className="mt-1 text-stone/55"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {resource.slug ? (
                <a
                  href={`/resources/${resource.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-medium text-bone hover:text-brass"
                >
                  {resource.title}
                </a>
              ) : (
                <p className="truncate text-sm font-medium text-bone">
                  {resource.title}
                </p>
              )}
              {resource.audience && resource.audience !== "all" && (
                <span className="inline-flex h-5 items-center border border-stone/20 bg-iron/40 px-1.5 text-[0.5625rem] uppercase tracking-wider text-stone/65">
                  {resource.audience}
                </span>
              )}
              {resource.aiCategorizedAt ? (
                <span
                  title={`AI tagged ${format(new Date(resource.aiCategorizedAt), "MMM d, yyyy")}`}
                  className="inline-flex h-5 items-center gap-1 border border-brass/40 bg-brass/10 px-1.5 text-[0.5625rem] uppercase tracking-wider text-brass"
                >
                  <Icon name="sparkles" size={9} />
                  Tagged
                </span>
              ) : (
                <span className="inline-flex h-5 items-center border border-stone/20 px-1.5 text-[0.5625rem] uppercase tracking-wider text-stone/55">
                  Untagged
                </span>
              )}
            </div>
            {(resource.summary || resource.description) && (
              <p className="mt-1 line-clamp-2 text-xs text-stone/65">
                {resource.summary || resource.description}
              </p>
            )}
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.slice(0, 8).map((t) => (
                  <span
                    key={t}
                    className="inline-flex h-5 items-center border border-stone/15 bg-iron/30 px-1.5 text-[0.5625rem] text-stone/70"
                  >
                    {t}
                  </span>
                ))}
                {tags.length > 8 && (
                  <span className="text-[0.5625rem] text-stone/45">
                    +{tags.length - 8} more
                  </span>
                )}
              </div>
            )}
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.625rem] text-stone/40">
              <span>{resource.type}</span>
              <span>·</span>
              <span>
                Added {format(new Date(resource.createdAt), "MMM d, yyyy")}
              </span>
              {resource.estimatedMinutes != null && (
                <>
                  <span>·</span>
                  <span>{resource.estimatedMinutes} min read</span>
                </>
              )}
              {resource.sourceFilename && (
                <>
                  <span>·</span>
                  <span title={resource.sourceFilename} className="truncate max-w-[200px]">
                    {resource.sourceFilename}
                  </span>
                </>
              )}
              {!resource.isPublic && (
                <>
                  <span>·</span>
                  <span className="text-oxblood">Hidden</span>
                </>
              )}
              {recat === "error" && (
                <>
                  <span>·</span>
                  <span className="text-oxblood">{recatError}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/item:opacity-100">
            {(resource.url || resource.fileKey) && (
              <a
                href={resource.url || resource.fileKey || "#"}
                target="_blank"
                rel="noopener"
                className="rounded-none p-1.5 text-stone/55 transition-colors hover:text-bone"
                title="Open file"
              >
                <Icon name="arrow-up-right" size={14} />
              </a>
            )}
            {showReextract && (
              <button
                type="button"
                onClick={handleReextract}
                disabled={recat === "busy"}
                className="rounded-none p-1.5 text-stone/55 transition-colors hover:text-brass disabled:opacity-50"
                title="Extract HTML from .docx + AI tag (legacy resource)"
              >
                <Icon name="scroll" size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={handleRecategorize}
              disabled={recat === "busy"}
              className="rounded-none p-1.5 text-stone/55 transition-colors hover:text-brass disabled:opacity-50"
              title="Re-tag with AI"
            >
              <Icon name="sparkles" size={14} />
            </button>
            <button
              type="button"
              onClick={onToggleVisibility}
              className="rounded-none p-1.5 text-stone/55 transition-colors hover:text-brass"
              title={resource.isPublic ? "Hide from public" : "Show on public"}
            >
              <Icon name="eye" size={14} />
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-none p-1.5 text-stone/55 transition-colors hover:text-bone"
              title="Edit"
            >
              <Icon name="pen" size={14} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-none p-1.5 text-stone/55 transition-colors hover:text-oxblood"
              title="Delete"
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function EditSectionForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: Section;
  onSubmit: (patch: { name?: string; description?: string; icon?: string; sortOrder?: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [icon, setIcon] = useState<string>(initial.icon ?? "scroll");
  const [sortOrder, setSortOrder] = useState<number>(initial.sortOrder);

  return (
    <div className="mt-6 border border-brass/30 bg-iron/40 p-5">
      <div className="flex items-center gap-3">
        <Icon name="pen" size={14} className="text-brass" />
        <span className="section-mark text-brass">§ Edit section</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="block text-[0.625rem] uppercase tracking-wider text-stone/55">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border border-stone/15 bg-transparent px-3 py-2 text-sm text-bone focus:border-brass focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-[0.625rem] uppercase tracking-wider text-stone/55">Sort order</span>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            className="mt-1 block w-full border border-stone/15 bg-transparent px-3 py-2 text-sm text-bone focus:border-brass focus:outline-none"
          />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="block text-[0.625rem] uppercase tracking-wider text-stone/55">Description (one short line)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full border border-stone/15 bg-transparent px-3 py-2 text-sm text-bone focus:border-brass focus:outline-none"
        />
      </label>
      <div className="mt-3">
        <span className="block text-[0.625rem] uppercase tracking-wider text-stone/55">Icon</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ICON_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setIcon(opt)}
              className={`flex h-8 w-8 items-center justify-center border ${
                icon === opt
                  ? "border-brass bg-brass/20 text-bone"
                  : "border-stone/15 text-stone/55 hover:border-brass/50"
              }`}
              title={opt}
            >
              <Icon name={opt} size={14} />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onSubmit({ name, description, icon, sortOrder })}
          disabled={!name.trim()}
          className="lift inline-flex h-8 items-center gap-1.5 bg-brass px-3 text-[0.625rem] font-medium uppercase tracking-wider text-ink transition-colors hover:bg-gold disabled:opacity-60"
        >
          Save changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-stone/65 transition-colors hover:text-bone"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

