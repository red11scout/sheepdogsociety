import type { ScriptureParagraph } from "@/lib/bible/books";

/**
 * Renders parsed scripture paragraphs with superscript verse numbers and
 * #v{N} anchor ids. Server component. The text is API-verbatim — never
 * edited, never AI-generated (CLAUDE.md hard rule). Verse numbers are
 * aria-hidden visual apparatus (the reading flow stays unbroken scripture
 * for screen readers); anchors still serve deep links. Untagged lead
 * segments (psalm superscriptions) render italic, no number, no anchor.
 */
export function Scripture({ paragraphs }: { paragraphs: ScriptureParagraph[] }) {
  return (
    <div className="scripture-body">
      {paragraphs.map((paragraph, pi) => (
        <p key={pi}>
          {paragraph.segments.map((segment, si) =>
            segment.verse === null ? (
              <em key={si} className="text-muted-foreground">
                {segment.text}{" "}
              </em>
            ) : (
              <span
                key={si}
                id={`v${segment.verse}`}
                className="verse-anchor scroll-mt-28"
              >
                <span aria-hidden="true" className="verse-num">
                  {segment.verse}
                </span>
                {segment.text}{" "}
              </span>
            )
          )}
        </p>
      ))}
    </div>
  );
}
