"use client";

import { useT, type Key } from "@/lib/i18n";

/** Translated page title and intro, for pages that are server components (they export metadata). */
export function PageHeading({ title, intro }: { title: Key; intro?: Key }) {
  const { t } = useT();
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t(title)}</h1>
      {intro && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t(intro)}</p>}
    </div>
  );
}
