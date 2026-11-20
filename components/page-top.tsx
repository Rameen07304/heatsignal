/**
 * Answer-first page top: title and one-line purpose, the single most important result, then 1–3 actions.
 * Everything else goes below, in tabs or collapsible sections.
 */
export function PageTop({
  title,
  intro,
  icon,
  answer,
  actions,
  aside,
}: {
  title: React.ReactNode;
  intro?: React.ReactNode;
  icon?: React.ReactNode;
  /** The answer card (flag, verdict, score…). */
  answer?: React.ReactNode;
  /** Primary action buttons. */
  actions?: React.ReactNode;
  /** Controls next to the title, e.g. a site picker. */
  aside?: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {icon}
            {title}
          </h1>
          {intro && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{intro}</p>}
        </div>
        {aside}
      </div>
      {answer}
      {actions && <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap [&>*]:h-12 [&>*]:justify-center [&>*]:text-base">{actions}</div>}
    </section>
  );
}

/** A collapsible "Learn more" or detail section; closed unless `open`. */
export function Section({ title, open, children, id }: { title: React.ReactNode; open?: boolean; children: React.ReactNode; id?: string }) {
  return (
    <details id={id} open={open} className="group scroll-mt-20 rounded-lg bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="space-y-4 px-4 pb-4">{children}</div>
    </details>
  );
}
