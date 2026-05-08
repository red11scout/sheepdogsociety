import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { HintTooltip } from "./HintTooltip";

interface AdminPageIntroProps {
  kicker: string;
  title: string;
  description: string;
  hint?: string;
  primary?: { label: string; href: string; icon?: IconName };
}

/**
 * Brand-styled page header for admin pages that don't use the shadcn
 * AdminPageHeader. Section-mark kicker + display-xl title + plain-English
 * description + optional HintTooltip + optional primary CTA. Consistent
 * with encouragements, members, dashboard.
 */
export function AdminPageIntro({
  kicker,
  title,
  description,
  hint,
  primary,
}: AdminPageIntroProps) {
  return (
    <header className="mb-10">
      <div className="flex items-center gap-4">
        <span className="section-mark text-brass">§ {kicker}</span>
        <div className="hairline flex-1" />
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="display-xl text-3xl text-bone md:text-4xl">{title}</h1>
            {hint && <HintTooltip hint={hint} />}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone/80">
            {description}
          </p>
        </div>
        {primary && (
          <Link
            href={primary.href}
            className="lift group inline-flex h-11 items-center gap-2 border border-bone bg-bone px-5 text-sm font-medium text-ink transition-colors hover:bg-stone"
          >
            {primary.icon && <Icon name={primary.icon} size={14} />}
            {primary.label}
            <Icon
              name="arrow-right"
              size={14}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        )}
      </div>
    </header>
  );
}
