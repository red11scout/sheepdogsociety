import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Icon } from "@/components/icons/Icon";
import { format } from "date-fns";

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
  const isPast =
    ev.isPast || (end ? end < new Date() : start < new Date());
  const photos = (ev.photos as Array<{ url: string; alt?: string; caption?: string }> | null) ?? [];
  const recap = ev.recap ?? "";

  return (
    <article className="bg-bone">
      <header className="bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-12 md:py-28">
          <div className="flex items-center gap-4">
            <span className="section-mark">§ Gathering</span>
            <div className="hairline flex-1" />
          </div>
          <h1 className="display-xl mt-10 text-[clamp(2.25rem,6vw,5rem)] text-foreground">
            {ev.title}
          </h1>

          <dl className="mt-12 grid gap-6 border-t border-bone/15 pt-8 md:grid-cols-3">
            <div>
              <dt className="section-mark text-stone/60">When</dt>
              <dd className="mt-2 font-display text-lg text-foreground">
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
                <dt className="section-mark text-stone/60">Where</dt>
                <dd className="mt-2 font-display text-lg text-foreground">
                  {ev.location}
                </dd>
              </div>
            )}
            {ev.eventType && (
              <div>
                <dt className="section-mark text-stone/60">Type</dt>
                <dd className="mt-2 font-display text-lg text-foreground capitalize">
                  {ev.eventType}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-20 md:px-12 md:py-28">
        {/* Description (always shown — pre-event copy) */}
        {ev.description ? (
          <p className="font-display text-lg leading-[1.7] text-iron whitespace-pre-line">
            {ev.description}
          </p>
        ) : (
          <p className="font-pullquote text-xl italic text-iron/60">
            More details coming soon.
          </p>
        )}

        {/* Recap (only for past events that have one) */}
        {isPast && recap && (
          <section className="mt-16 border-t border-iron/15 pt-12">
            <div className="flex items-center gap-3">
              <span className="section-mark text-brass">§ Recap</span>
              <div className="hairline flex-1" />
            </div>
            <div className="mt-6 space-y-5">
              {recap.split(/\n\n+/).map((p, i) => (
                <p
                  key={i}
                  className="font-display text-lg leading-[1.7] text-iron"
                >
                  {p}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* RSVP / back nav (skip RSVP for past events) */}
        <div className="mt-16 flex flex-wrap items-center gap-4 border-t border-iron/15 pt-8">
          {!isPast && ev.registrationUrl && (
            <a
              href={ev.registrationUrl}
              target="_blank"
              rel="noreferrer"
              className="lift inline-flex h-12 items-center gap-3 bg-brass px-6 text-sm font-medium uppercase tracking-[0.18em] text-iron transition-colors hover:bg-gold"
            >
              RSVP
              <Icon name="arrow-up-right" size={16} />
            </a>
          )}
          <Link
            href="/events"
            className="section-mark text-brass hover:opacity-70"
          >
            ← All gatherings
          </Link>
        </div>
      </div>

      {/* Photo gallery — only renders when there are photos. Full-bleed
       *  out of the prose container so the images get the room they need. */}
      {photos.length > 0 && (
        <section className="bg-bone">
          <div className="mx-auto max-w-7xl px-6 pb-24 md:px-12 md:pb-32">
            <div className="flex items-center gap-3">
              <span className="section-mark text-brass">
                § The night, in pictures ({photos.length})
              </span>
              <div className="hairline flex-1" />
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((p, i) => (
                <li key={p.url} className="space-y-2">
                  <div className="relative aspect-[4/3] w-full overflow-hidden border border-iron/10 bg-iron/5">
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
                    <p className="text-xs italic text-iron/60">{p.caption}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
