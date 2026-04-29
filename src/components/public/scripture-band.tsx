// Scripture band — full-width Cormorant-italic block on Iron background
// with a Brass left rule. Per brief §3 + §4: the dominant scripture
// rendering across the public site, used in pull-quotes and footer.
export function ScriptureBand({
  children,
  reference,
  className = "",
}: {
  children: React.ReactNode;
  reference: string;
  className?: string;
}) {
  return (
    <section className={`bg-iron text-bone py-20 px-6 ${className}`}>
      <div className="max-w-3xl mx-auto">
        <blockquote className="font-pullquote italic text-2xl md:text-3xl leading-relaxed border-l-2 border-brass pl-8">
          {children}
          <footer className="mt-6 font-body not-italic text-xs uppercase tracking-[0.18em] text-stone">
            — {reference}
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
