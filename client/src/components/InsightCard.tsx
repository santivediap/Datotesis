interface Props {
  title: string;
  finding: string;
  goldenRule: string;
}

export default function InsightCard({ title, finding, goldenRule }: Props) {
  return (
    <article className="glass-card p-6 flex flex-col gap-6 h-full snap-in">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="status-dot text-accent-emerald bg-accent-emerald" />
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            {title}
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-2">
        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
          EL_HALLAZGO
        </p>
        <p className="text-foreground text-[17px] leading-[1.55] tracking-[-0.011em] font-medium">
          {finding}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
          REGLA_DE_ORO
        </p>
        <div className="gradient-border p-5">
          <p className="text-foreground text-[15px] leading-snug tracking-[-0.015em] font-semibold">
            <span className="text-primary mr-1">“</span>
            {goldenRule}
            <span className="text-primary ml-0.5">”</span>
          </p>
        </div>
      </section>

      <footer className="mt-auto pt-4 border-t border-border flex items-center justify-between font-mono text-[10px] text-muted-foreground tracking-wider">
        <span>SOURCE · GEMINI_v2</span>
        <span className="flex items-center gap-1.5">
          <span className="status-dot text-primary bg-primary" />
          VERIFICADO
        </span>
      </footer>
    </article>
  );
}
