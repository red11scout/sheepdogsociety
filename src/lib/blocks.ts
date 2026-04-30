import { z } from "zod";

/**
 * Block schema — typed JSONB for the `pages` table. Eight block types,
 * validated as a discriminated union on every save. Phase D ships the
 * contract; the public `<BlockRenderer />` and admin `<BlockEditor />`
 * land in a follow-up phase that consumes this file.
 *
 * Adding a block type is a three-step PR:
 *   1. Add a new z.object below.
 *   2. Append it to `Block` and to `BLOCK_TYPES`.
 *   3. Add a renderer to `src/components/blocks/<name>.tsx`.
 */

const blockBase = {
  id: z.string().uuid(),
};

export const HeroBlock = z.object({
  ...blockBase,
  type: z.literal("hero"),
  eyebrow: z.string().max(40).optional(),
  headline: z.string().min(1).max(160),
  subhead: z.string().max(280).optional(),
  ctaLabel: z.string().max(40).optional(),
  ctaHref: z.string().max(240).optional(),
  secondaryCtaLabel: z.string().max(40).optional(),
  secondaryCtaHref: z.string().max(240).optional(),
  imageUrl: z.string().max(500).optional(),
  align: z.enum(["left", "center"]).default("left"),
  archetype: z.enum(["watch", "field_card", "verse_mark"]).default("watch"),
});

export const FeatureGridBlock = z.object({
  ...blockBase,
  type: z.literal("feature_grid"),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  features: z
    .array(
      z.object({
        icon: z.string().max(40).optional(), // Icon name from src/components/icons/Icon.tsx
        title: z.string().max(80),
        body: z.string().max(280),
      })
    )
    .max(12),
});

export const TestimonialBlock = z.object({
  ...blockBase,
  type: z.literal("testimonial"),
  quote: z.string().min(1).max(800),
  attribution: z.string().max(80),
  role: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
});

export const CTABlock = z.object({
  ...blockBase,
  type: z.literal("cta"),
  headline: z.string().min(1).max(160),
  body: z.string().max(280).optional(),
  primaryLabel: z.string().min(1).max(40),
  primaryHref: z.string().min(1).max(240),
  secondaryLabel: z.string().max(40).optional(),
  secondaryHref: z.string().max(240).optional(),
  variant: z.enum(["solid", "soft"]).default("soft"),
});

export const RichTextBlock = z.object({
  ...blockBase,
  type: z.literal("rich_text"),
  /** Tiptap JSONContent. The compiled HTML lives on `pages` only at render time. */
  doc: z.unknown(),
  maxWidthCh: z.number().min(45).max(85).default(72),
});

export const FAQBlock = z.object({
  ...blockBase,
  type: z.literal("faq"),
  eyebrow: z.string().max(40).optional(),
  headline: z.string().max(160).optional(),
  items: z
    .array(
      z.object({
        question: z.string().min(1).max(200),
        answer: z.string().min(1).max(2000),
      })
    )
    .max(50),
});

export const StatRowBlock = z.object({
  ...blockBase,
  type: z.literal("stat_row"),
  stats: z
    .array(
      z.object({
        value: z.string().min(1).max(20), // "247" or "12+"
        label: z.string().min(1).max(40),
      })
    )
    .min(2)
    .max(4),
});

export const VerseCalloutBlock = z.object({
  ...blockBase,
  type: z.literal("verse_callout"),
  /** Verse text. May be empty if the page wants only the reference rendered. */
  verse: z.string().max(1200).optional(),
  reference: z.string().min(1).max(80), // "Acts 20:28"
  translation: z.string().max(20).default("ESV"),
});

export const Block = z.discriminatedUnion("type", [
  HeroBlock,
  FeatureGridBlock,
  TestimonialBlock,
  CTABlock,
  RichTextBlock,
  FAQBlock,
  StatRowBlock,
  VerseCalloutBlock,
]);

export const BlockArray = z.array(Block);

export type Block = z.infer<typeof Block>;
export type BlockType = Block["type"];

/** Display metadata for the admin "+ Add block" picker. */
export const BLOCK_TYPES: ReadonlyArray<{
  type: BlockType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    type: "hero",
    label: "Hero",
    description: "Page-opening statement. Big headline, optional CTA.",
    icon: "watchtower",
  },
  {
    type: "feature_grid",
    label: "Feature grid",
    description: "Two to four columns of icons + short copy.",
    icon: "table",
  },
  {
    type: "stat_row",
    label: "Stat row",
    description: "Two to four numbers with one-word labels.",
    icon: "compass",
  },
  {
    type: "verse_callout",
    label: "Scripture callout",
    description: "A verse, set apart in italic on a brass rule.",
    icon: "scroll",
  },
  {
    type: "rich_text",
    label: "Long-form text",
    description: "Editorial paragraphs in the Tiptap editor.",
    icon: "pen",
  },
  {
    type: "testimonial",
    label: "Testimonial",
    description: "One quote, one name, one city.",
    icon: "brothers",
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Plain answers. Stacked accordion-style.",
    icon: "help",
  },
  {
    type: "cta",
    label: "Call to action",
    description: "End-of-page band. Headline + button.",
    icon: "arrow-right",
  },
];

/** Convenience for server actions that save a page: throw if any block fails validation. */
export function parseBlocks(value: unknown): Block[] {
  return BlockArray.parse(value);
}
