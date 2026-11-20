"use client";

import { AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Amber note above health advice. `children` is page-specific text; the default covers supplements. */
export function MedicalDisclaimer({ children }: { children?: React.ReactNode }) {
  const { t } = useT();
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm" role="note">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        {t("disclaimerTitle")}
      </p>
      <p className="mt-1 text-muted-foreground">{children ?? t("disclaimerSupplements")}</p>
    </div>
  );
}
