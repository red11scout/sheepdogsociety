import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { MobileTabBar } from "@/components/public/mobile-tab-bar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // pb clears the fixed MobileTabBar (52px + safe area) on mobile only.
    <div className="flex min-h-screen flex-col pb-[calc(52px+env(safe-area-inset-bottom))] lg:pb-0">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <MobileTabBar />
    </div>
  );
}
