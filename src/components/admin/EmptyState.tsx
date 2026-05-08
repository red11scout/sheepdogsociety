import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  body: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
}

export function EmptyState({
  icon = "sparkles",
  title,
  body,
  primary,
  secondary,
}: EmptyStateProps) {
  return (
    <div className="border border-dashed border-stone/20 bg-iron/30 p-10 text-center md:p-16">
      <Icon name={icon} size={40} className="mx-auto text-brass" />
      <h3 className="display-xl mt-6 text-2xl text-bone md:text-3xl">{title}</h3>
      <p className="mx-auto mt-3 max-w-md font-pullquote text-base italic leading-relaxed text-stone">
        {body}
      </p>
      {(primary || secondary) && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {primary && (
            <Link
              href={primary.href}
              className="lift inline-flex h-11 items-center gap-2 border border-bone bg-bone px-6 text-sm font-medium text-iron transition-colors hover:bg-stone"
            >
              {primary.label}
              <Icon name="arrow-right" size={14} />
            </Link>
          )}
          {secondary && (
            <Link
              href={secondary.href}
              className="lift inline-flex h-11 items-center gap-2 border border-stone/30 bg-transparent px-6 text-sm font-medium text-stone transition-colors hover:border-brass hover:text-brass"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
