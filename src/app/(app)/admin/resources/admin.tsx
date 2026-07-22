"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Magnetic } from "@/components/motion/Magnetic";
import { HintTooltip } from "@/components/admin/HintTooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { AddLinkPanel } from "./add-link-panel";
import { SectionAutomationBar } from "./section-automation-bar";

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
  provider?: string | null;
  thumbnailUrl?: string | null;
  author?: string | null;
  companionUrl?: string | null;
  companionFileKey?: string | null;
  companionLabel?: string | null;
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
  fieldNotesHtml?: string | null;
  fieldNotesStatus?: string;
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
                    <HintTooltip hint="Each resource has Edit, Hide/Show, and Delete buttons, plus a More menu for AI actions. Public resources appear on /resources." />
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
                      className="lift inline-flex min-h-11 items-center gap-2 border border-bone bg-bone px-4 text-xs font-medium uppercase tracking-wider text-iron transition-colors hover:bg-stone"
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

              <div className="mt-6 space-y-4">
                {/* Section-wide AI actions: re-tag (restores public search),
                 *  auto-cluster (groups cards under sub-headings on the
                 *  public page), draft field notes. Only shown when
                 *  there's something to operate on. */}
                {filteredResources.length > 0 && (
                  <SectionAutomationBar
                    sectionId={activeSection.id}
                    sectionName={activeSection.name}
                    onComplete={refresh}
                  />
                )}

                {/* Section-aware composer panels.
                 *  - Sermon Studies / Sermons → "Add from link" (sermon mode)
                 *  - Book Studies            → "Add book + study" (book mode)
                 *  - Everything else         → bulk file upload only
                 *  Bulk upload always available since admins may want to
                 *  upload sermon notes or extra material as files too.
                 */}
                {(activeSection.slug === "sermon-studies" ||
                  activeSection.slug === "sermons") && (
                  <AddLinkPanel
                    sectionId={activeSection.id}
                    sectionSlug={activeSection.slug}
                    sectionName={activeSection.name}
                    mode="sermon"
                    onSaved={refresh}
                  />
                )}
                {activeSection.slug === "book-studies" && (
                  <AddLinkPanel
                    sectionId={activeSection.id}
                    sectionSlug={activeSection.slug}
                    sectionName={activeSection.name}
                    mode="book"
                    onSaved={refresh}
                  />
                )}
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
                          fieldNotesHtml?: string;
                          fieldNotesStatus?: "none" | "draft" | "approved";
                          thumbnailUrl?: string;
                          author?: string;
                          companionUrl?: string;
                          companionFileKey?: string;
                          companionLabel?: string;
                        } = { id: r.id };
                        if (typeof patch.title === "string") cleaned.title = patch.title;
                        if (typeof patch.description === "string")
                          cleaned.description = patch.description;
                        if (typeof patch.url === "string") cleaned.url = patch.url;
                        if (typeof patch.fileKey === "string")
                          cleaned.fileKey = patch.fileKey;
                        if (typeof patch.thumbnailUrl === "string")
                          cleaned.thumbnailUrl = patch.thumbnailUrl;
                        if (typeof patch.author === "string")
                          cleaned.author = patch.author;
                        if (typeof patch.companionUrl === "string")
                          cleaned.companionUrl = patch.companionUrl;
                        if (typeof patch.companionFileKey === "string")
                          cleaned.companionFileKey = patch.companionFileKey;
                        if (typeof patch.companionLabel === "string")
                          cleaned.companionLabel = patch.companionLabel;
                        if (typeof patch.category === "string")
                          cleaned.category = patch.category;
                        if (typeof patch.level === "string") cleaned.level = patch.level;
                        if (typeof patch.isPublic === "boolean")
                          cleaned.isPublic = patch.isPublic;
                        if (typeof patch.fieldNotesHtml === "string")
                          cleaned.fieldNotesHtml = patch.fieldNotesHtml;
                        if (
                          patch.fieldNotesStatus === "none" ||
                          patch.fieldNotesStatus === "draft" ||
                          patch.fieldNotesStatus === "approved"
                        )
                          cleaned.fieldNotesStatus = patch.fieldNotesStatus;
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

// Collapsed preview for a draft/approved field-notes row: strip tags,
// collapse whitespace, cap at ~140 chars so the row stays scannable.
function fieldNotesPreview(html: string, max = 140): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
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
  // Book-study surface: cover art, buy link, author, companion. Editable
  // for any link-backed row; file rows keep the simple two-field editor.
  const isLinkRow = !!resource.url || resource.type === "link" || resource.type === "video";
  const [url, setUrl] = useState(resource.url ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(resource.thumbnailUrl ?? "");
  const [author, setAuthor] = useState(resource.author ?? "");
  const [companionUrl, setCompanionUrl] = useState(resource.companionUrl ?? "");
  const [companionLabel, setCompanionLabel] = useState(resource.companionLabel ?? "");
  const [companionFileKey, setCompanionFileKey] = useState(resource.companionFileKey ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [companionUploading, setCompanionUploading] = useState(false);
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

  async function handleRefreshMetadata() {
    setRecat("busy");
    setRecatError("");
    try {
      const res = await fetch(
        `/api/admin/resources/${resource.id}/refresh-metadata`,
        { method: "POST" }
      );
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

  // Field notes: AI-drafted study notes, gated behind admin approval
  // before they render publicly. The server persists "insufficient" as its
  // own status (a draft was attempted but the row lacks usable source
  // material), but this row's props won't reflect that until the next
  // reload — fnInsufficient is a client-only flag that shows the "Needs
  // manual notes" chip immediately after the API call comes back.
  const fieldNotesStatus = resource.fieldNotesStatus ?? "none";
  const [fnState, setFnState] = useState<"idle" | "busy" | "error">("idle");
  const [fnError, setFnError] = useState("");
  const [fnInsufficient, setFnInsufficient] = useState(false);
  const [fnEditing, setFnEditing] = useState(false);
  const [fnDraftHtml, setFnDraftHtml] = useState(resource.fieldNotesHtml ?? "");
  const needsManualNotes = fieldNotesStatus === "insufficient" || fnInsufficient;

  async function runFieldNotesDraft() {
    setFnState("busy");
    setFnError("");
    setFnInsufficient(false);
    try {
      const res = await fetch(`/api/admin/resources/${resource.id}/field-notes`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.status === "insufficient") {
        setFnState("idle");
        setFnInsufficient(true);
        return;
      }
      if (data.status === "failed") {
        setFnState("error");
        setFnError("Draft failed — try again, or write field notes by hand.");
        return;
      }
      setFnState("idle");
      window.location.reload();
    } catch (e) {
      setFnState("error");
      setFnError(e instanceof Error ? e.message : "Failed");
    }
  }

  function handleRedraftFieldNotes() {
    if (!confirm("Redraft field notes? This overwrites the current draft.")) return;
    runFieldNotesDraft();
  }

  async function handleApproveFieldNotes() {
    await onUpdate({ fieldNotesStatus: "approved" });
  }

  async function handleUnpublishFieldNotes() {
    await onUpdate({ fieldNotesStatus: "draft" });
  }

  function openFieldNotesEditor() {
    setFnDraftHtml(resource.fieldNotesHtml ?? "");
    setFnEditing(true);
  }

  async function handleSaveFieldNotes() {
    // Hand-written notes from "none"/"insufficient" enter the normal
    // approve flow just like an AI draft would; saving an edit to an
    // existing "draft"/"approved" row leaves its status untouched.
    const patch: Partial<ResourceRow> =
      fieldNotesStatus === "none" || fieldNotesStatus === "insufficient"
        ? { fieldNotesHtml: fnDraftHtml, fieldNotesStatus: "draft" }
        : { fieldNotesHtml: fnDraftHtml };
    await onUpdate(patch);
    setFnEditing(false);
  }

  // Heuristic: show re-extract on file uploads that don't yet have an
  // AI categorization timestamp (legacy resources from before the bulk
  async function uploadTo(setter: (u: string) => void, kind: "cover" | "companion", file: File) {
    const setBusy = kind === "cover" ? setCoverUploading : setCompanionUploading;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `resources/${kind}s`);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Upload failed");
      }
      const data = (await res.json()) as { url: string };
      setter(data.url);
    } catch (e) {
      setRecat("error");
      setRecatError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  // upload pipeline existed).
  const showReextract =
    !!resource.fileKey &&
    !resource.aiCategorizedAt &&
    /\.docx(\?|$)/i.test(resource.fileKey);

  return (
    <li className="border border-stone/15 bg-iron/30 px-4 py-3 transition-colors hover:border-stone/30">
      {editing ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block h-9 w-full border border-stone/20 bg-transparent px-3 text-sm text-bone focus:border-brass focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block h-9 w-full border border-stone/20 bg-transparent px-3 text-xs text-stone/80 focus:border-brass focus:outline-none"
            />
          </label>

          {isLinkRow && (
            <div className="grid gap-3 border-t border-stone/15 pt-3 md:grid-cols-[100px_1fr]">
              {/* Cover preview + controls */}
              <div className="relative aspect-[2/3] w-[100px] overflow-hidden border border-stone/15 bg-iron/60">
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone/35">
                    <Icon name="image" size={22} />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                    Cover image URL
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="https://... (paste an image URL)"
                      className="block h-9 flex-1 border border-stone/20 bg-transparent px-3 text-xs text-bone focus:border-brass focus:outline-none"
                    />
                    <label className="inline-flex h-9 cursor-pointer items-center border border-dashed border-stone/30 px-3 text-[0.6875rem] uppercase tracking-wider text-stone/75 transition-colors hover:border-brass hover:text-brass">
                      {coverUploading ? "Uploading..." : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadTo(setThumbnailUrl, "cover", f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                    Buy / source link (Amazon, publisher, any store)
                  </span>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.amazon.com/dp/..."
                    className="block h-9 w-full border border-stone/20 bg-transparent px-3 text-xs text-bone focus:border-brass focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                    Author
                  </span>
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. J.C. Ryle"
                    className="block h-9 w-full border border-stone/20 bg-transparent px-3 text-xs text-bone focus:border-brass focus:outline-none"
                  />
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                      Companion study URL
                    </span>
                    <input
                      value={companionUrl}
                      onChange={(e) => setCompanionUrl(e.target.value)}
                      placeholder="https://..."
                      className="block h-9 w-full border border-stone/20 bg-transparent px-3 text-xs text-bone focus:border-brass focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[0.625rem] uppercase tracking-wider text-stone/55">
                      Companion label
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        value={companionLabel}
                        onChange={(e) => setCompanionLabel(e.target.value)}
                        placeholder="Study Guide"
                        className="block h-9 flex-1 border border-stone/20 bg-transparent px-3 text-xs text-bone focus:border-brass focus:outline-none"
                      />
                      <label className="inline-flex h-9 cursor-pointer items-center border border-dashed border-stone/30 px-3 text-[0.6875rem] uppercase tracking-wider text-stone/75 transition-colors hover:border-brass hover:text-brass">
                        {companionUploading ? "..." : companionFileKey ? "Replace file" : "Upload file"}
                        <input
                          type="file"
                          accept=".pdf,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadTo(setCompanionFileKey, "companion", f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {companionFileKey && (
                      <span className="mt-1 block truncate text-[0.625rem] text-olive">✓ File attached</span>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 border-t border-stone/15 pt-3">
            <button
              type="button"
              onClick={async () => {
                await onUpdate({
                  title,
                  description,
                  ...(isLinkRow
                    ? {
                        url,
                        thumbnailUrl,
                        author,
                        companionUrl,
                        companionLabel,
                        companionFileKey,
                      }
                    : {}),
                });
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
        // Text-only row (Drew, 2026-07-11: admin matches the public
        // streamline — no leading type glyph; the title + type/status
        // meta line carries it).
        <div>
          <div className="min-w-0">
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

            {/* Field notes: AI-drafted study notes. "none" prompts a draft,
             *  "insufficient" means a draft was attempted but the row lacks
             *  usable source material (metadata too thin), "draft" needs an
             *  admin's eyes before it goes public, "approved" is live on
             *  /resources/[slug]. "none" and "insufficient" both offer a
             *  manual "Write notes" path alongside the AI draft/retry. */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {fieldNotesStatus === "approved" ? (
                <span className="inline-flex h-5 items-center border border-olive/40 bg-olive/10 px-1.5 text-[0.5625rem] uppercase tracking-wider text-olive">
                  Approved · public
                </span>
              ) : fieldNotesStatus === "draft" ? (
                <span className="inline-flex h-5 items-center border border-brass/40 bg-brass/10 px-1.5 text-[0.5625rem] uppercase tracking-wider text-brass">
                  Draft
                </span>
              ) : needsManualNotes ? (
                <span className="inline-flex h-5 items-center border border-oxblood/40 bg-oxblood/10 px-1.5 text-[0.5625rem] uppercase tracking-wider text-oxblood">
                  Needs manual notes
                </span>
              ) : (
                <span className="inline-flex h-5 items-center border border-stone/20 px-1.5 text-[0.5625rem] uppercase tracking-wider text-stone/55">
                  No field notes
                </span>
              )}

              {/* While the notes editor is open, hide sibling actions so a
               *  stray Approve/Redraft/Unpublish/Draft can't blow away
               *  unsaved textarea content — same convention as row
               *  title/description editing, which swaps the whole row for
               *  Save/Cancel. */}
              {(fieldNotesStatus === "none" || needsManualNotes) && !fnEditing && (
                <>
                  <button
                    type="button"
                    onClick={runFieldNotesDraft}
                    disabled={fnState === "busy"}
                    className="text-xs font-medium text-brass hover:text-gold disabled:opacity-50"
                  >
                    {fnState === "busy" ? "Drafting…" : "Draft notes"}
                  </button>
                  <button
                    type="button"
                    onClick={openFieldNotesEditor}
                    className="text-xs text-stone/65 hover:text-bone"
                  >
                    Write notes
                  </button>
                </>
              )}

              {fieldNotesStatus === "draft" && !fnEditing && (
                <>
                  <button
                    type="button"
                    onClick={handleApproveFieldNotes}
                    className="text-xs font-medium text-brass hover:text-gold"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={openFieldNotesEditor}
                    className="text-xs text-stone/65 hover:text-bone"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleRedraftFieldNotes}
                    disabled={fnState === "busy"}
                    className="text-xs text-stone/65 hover:text-oxblood disabled:opacity-50"
                  >
                    {fnState === "busy" ? "Redrafting…" : "Redraft"}
                  </button>
                </>
              )}

              {fieldNotesStatus === "approved" && !fnEditing && (
                <>
                  <button
                    type="button"
                    onClick={handleUnpublishFieldNotes}
                    className="text-xs text-stone/65 hover:text-oxblood"
                  >
                    Unpublish
                  </button>
                  <button
                    type="button"
                    onClick={openFieldNotesEditor}
                    className="text-xs text-stone/65 hover:text-bone"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>

            {(fieldNotesStatus === "draft" || fieldNotesStatus === "approved") &&
              !fnEditing &&
              resource.fieldNotesHtml && (
                <p className="mt-1 font-pullquote text-xs italic text-stone/60">
                  {fieldNotesPreview(resource.fieldNotesHtml)}
                </p>
              )}

            {fnEditing && (
              <div className="mt-2">
                <textarea
                  value={fnDraftHtml}
                  onChange={(e) => setFnDraftHtml(e.target.value)}
                  rows={6}
                  className="block w-full resize-none border border-stone/20 bg-transparent px-3 py-2 text-xs text-bone focus:border-brass focus:outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveFieldNotes}
                    className="text-xs font-medium text-brass hover:text-gold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setFnEditing(false)}
                    className="text-xs text-stone/55 hover:text-bone"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {fnState === "error" && fnError && (
              <p className="mt-1 text-[0.625rem] text-oxblood">{fnError}</p>
            )}
          </div>
          {/* Actions: three labeled 44px buttons for the everyday moves,
           *  the rest behind a labeled More menu. Words, not glyphs
           *  (Drew, 2026-07-11) — same layout at every breakpoint. All
           *  handlers unchanged from the icon-button era. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex min-h-11 items-center border border-stone/20 px-3 text-xs text-stone/65 transition-colors hover:border-brass hover:text-brass"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onToggleVisibility}
              title={resource.isPublic ? "Hide from public" : "Show on public"}
              className="inline-flex min-h-11 items-center border border-stone/20 px-3 text-xs text-stone/65 transition-colors hover:border-brass hover:text-brass"
            >
              {resource.isPublic ? "Hide" : "Show"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex min-h-11 items-center border border-stone/20 px-3 text-xs text-stone/65 transition-colors hover:border-oxblood hover:text-oxblood"
            >
              Delete
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center border border-stone/20 px-3 text-xs text-stone/65 transition-colors hover:border-brass hover:text-brass"
                >
                  More
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-[220px] rounded-none border-stone/20 bg-iron text-bone"
              >
                {(resource.url || resource.fileKey) && (
                  <DropdownMenuItem asChild className="min-h-11 rounded-none px-3 text-xs text-stone/75 focus:bg-brass/15 focus:text-bone">
                    <a
                      href={resource.url || resource.fileKey || "#"}
                      target="_blank"
                      rel="noopener"
                    >
                      Open file
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleRecategorize}
                  disabled={recat === "busy"}
                  className="min-h-11 rounded-none px-3 text-xs text-stone/75 focus:bg-brass/15 focus:text-bone"
                >
                  Re-tag with AI
                </DropdownMenuItem>
                {/* Re-fetch link metadata (thumbnail, embed, author) for any
                 *  resource whose source is a URL. Useful for legacy rows
                 *  created before the Add-from-link composer existed. */}
                {resource.url && !resource.fileKey && (
                  <DropdownMenuItem
                    onClick={handleRefreshMetadata}
                    disabled={recat === "busy"}
                    className="min-h-11 rounded-none px-3 text-xs text-stone/75 focus:bg-brass/15 focus:text-bone"
                  >
                    Refresh link preview
                  </DropdownMenuItem>
                )}
                {showReextract && (
                  <DropdownMenuItem
                    onClick={handleReextract}
                    disabled={recat === "busy"}
                    className="min-h-11 rounded-none px-3 text-xs text-stone/75 focus:bg-brass/15 focus:text-bone"
                  >
                    Re-extract from file
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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

