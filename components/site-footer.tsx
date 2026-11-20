"use client";

import { useT } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useT();
  return (
    <footer className="no-print mx-auto max-w-[1400px] border-t px-4 pb-24 pt-6 text-xs text-muted-foreground lg:px-8">
      {t("footerData")}{" "}
      <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
        Open-Meteo
      </a>{" "}
      (CC BY 4.0). {t("footerDisclaimer")}
    </footer>
  );
}
