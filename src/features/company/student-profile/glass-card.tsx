export function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`glass-panel rounded-xl shadow-2xl border border-white/20 ${className}`}
    >
      {children}
    </section>
  );
}
