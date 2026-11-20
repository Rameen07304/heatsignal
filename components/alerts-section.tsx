"use client";

import { Section } from "@/components/page-top";
import { useT, type Key } from "@/lib/i18n";

/** A translated collapsible section, for use inside server-rendered pages. */
export function AlertsSection({ title, open, children }: { title: Key; open?: boolean; children: React.ReactNode }) {
  const { t } = useT();
  return (
    <Section title={t(title)} open={open}>
      {children}
    </Section>
  );
}
