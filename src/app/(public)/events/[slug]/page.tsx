import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Icon } from "@/components/icons/Icon";
import { format } from "date-fns";
import { Kicker } from "@/components/public/kicker";

export const revalidate = 60;

async function getEvent(id: string) {
  try {
    const [row] = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ev = await getEvent(slug);
  if (!ev) return { title: "Gathering — Sheepdog Society" };
  return {
    title: `${ev.title} — Sheepdog Society`,
    description: ev.description ?? undefined,
    openGraph: {
      title: ev.title,
      description: ev.description ?? undefined,
      images: ev.imageUrl ? [ev.imageUrl] : undefined,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ev = await getEvent(slug);
  if (!ev) notFound();

  const start = new Date(ev.startTime);
  const end = ev.endTime ? new Date(ev.endTime) : null;
  const isPast = ev.isPast || (end ? end < new Date() : start < new Date());
  const photos =
    (ev.photos as Array<{ url: string; alt?: string; caption?: string }> | null) ?? [];
  const recap = ev.recap ?? "";

  return (
    <article className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        <Kicker left="Gathering notice" right={format(start, "EEEE, MMMM d, yyyy")} />

        <div className="mt-10 grid gap-12 lg:grid-cols-12">
          {/* Left column */}
          <div className="lg:col-span-8">
            {ev.eventType && <p className="section-mark">{ev.eventType}</p>}
            <h1 className="display-soft mt-4 text-display-lg">{ev.title}</h1>
            {ev.isCancelled && (
              <p className="mt-6 inline-flex items-center gap-2 border border-oxblood/50 bg-oxblood/15 px-3 py-1.5 text-sm text-foreground">
                This date is cancelled. Check the calendar for what is next.
              </p>
            )}

            {ev.description ? (
              <p className="dropcap mt-8 max-w-prose whitespace-pre-line font-scripture text-lg text-foreground/85">
                {ev.description}
              </p>
            ) : (
              <p className="mt-8 font-pullquote text-xl italic text-muted-foreground">
                More details coming soon.
              </p>
            )}

            {/* Recap (past events only) */}
            {isPast && recap && (
              <section className="mt-14 border-t border-foreground/15 pt-10">
                <Kicker left="Recap" />
                <div className="mt-6 max-w-prose space-y-5">
                  {recap.split(/\n\n+/).map((p, i) => (
                    <p key={i} className="font-scripture text-lg text-foreground/85">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* RSVP / back nav — no RSVP for past OR cancelled dates */}
            <div className="mt-14 flex flex-wrap items-center gap-6 border-t border-foreground/15 pt-8">
              {!isPast && !ev.isCancelled && ev.registrationUrl && (
                <a
                  href={ev.registrationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="lift inline-flex h-12 cursor-pointer items-center gap-3 bg-brass px-6 text-sm font-medium uppercase tracking-[0.18em] text-iron transition-colors hover:bg-gold"
                >
                  RSVP
                  <Icon name="arrow-up-right" size={16} />
                </a>
              )}
              <Link href="/events" className="link-editorial text-sm">
                ← All gatherings
              </Link>
            </div>
          </div>

          {/* Right rail — the particulars */}
          <aside className="border-t-2 border-foreground/60 pt-6 lg:col-span-4 lg:border-l lg:border-t-0 lg:border-foreground/15 lg:pl-10 lg:pt-0">
            <p className="folio">The particulars</p>
            <dl className="mt-6 space-y-6">
              <div>
                <dt className="folio">When</dt>
                <dd className="mt-1.5 font-display text-lg">
                  {format(start, "EEEE, MMMM d")}
                  <br />
                  <span className="text-foreground/70">
                    {format(start, "h:mm a")}
                    {end ? ` – ${format(end, "h:mm a")}` : ""}
                  </span>
                </dd>
              </div>
              {ev.location && (
                <div>
                  <dt className="folio">Where</dt>
                  <dd className="mt-1.5 font-display text-lg">{ev.location}</dd>
                </div>
              )}
              {ev.eventType && (
                <div>
                  <dt className="folio">Type</dt>
                  <dd className="mt-1.5 font-display text-lg capitalize">
                    {ev.eventType}
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>

        {/* The night, in pictures — inline gallery */}
        {photos.length > 0 && (
          <section className="mt-16 border-t border-foreground/15 pt-10">
            <Kicker left={`The night, in pictures (${photos.length})`} />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((p, i) => (
                <li key={p.url} className="space-y-2">
                  <div className="relative aspect-[4/3] w-full overflow-hidden border border-foreground/15 bg-foreground/5">
                    <Image
                      src={p.url}
                      alt={p.alt ?? ev.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover"
                      priority={i < 2}
                      unoptimized
                    />
                  </div>
                  {p.caption && (
                    <p className="text-xs italic text-muted-foreground">{p.caption}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
