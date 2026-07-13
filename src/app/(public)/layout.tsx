import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { MobileTabBar } from "@/components/public/mobile-tab-bar";
import { DraftRibbon } from "@/components/studio/DraftRibbon";
import { StudioModeForcer } from "@/components/studio/StudioModeForcer";
import { getStudioConfig } from "@/lib/studio/get";
import { resolveThemeId } from "@/lib/studio/config";
import { themeById, THEME_IDS } from "@/lib/studio/themes";
import { draftMode } from "next/headers";

function cssVars(rec: Record<string, string>) {
  return Object.entries(rec)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, { isEnabled }] = await Promise.all([getStudioConfig(), draftMode()]);
  const theme = themeById(resolveThemeId(config, THEME_IDS));

  return (
    // pb clears the fixed MobileTabBar (52px + safe area) on mobile only.
    <div
      data-site-theme
      className="flex min-h-screen flex-col pb-[calc(52px+env(safe-area-inset-bottom))] lg:pb-0"
    >
      {theme && Object.keys(theme.light).length > 0 && (
        <style>{`
    body:has([data-site-theme]) { ${cssVars(theme.light)} }
    .dark body:has([data-site-theme]) { ${cssVars(theme.dark)} }
  `}</style>
      )}
      {/* Ambient film grain — makes the gold read as light on material.
          Fixed, decorative, non-interactive; sits below the z-50 nav so
          chrome stays crisp. Degrades on small screens (see .nw-grain). */}
      <div className="nw-grain" aria-hidden="true" />
      {isEnabled && <DraftRibbon />}
      {isEnabled && <StudioModeForcer />}
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <MobileTabBar />
    </div>
  );
}
