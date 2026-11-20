"use client";

import { useState } from "react";
import { Building2, Check, FileDown, Link2, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { City } from "@/lib/cities";
import type { Conditions } from "@/lib/conditions";
import { globalCsv, globalReport } from "@/lib/report";
import { useT } from "@/lib/i18n";

/** Exports for public-health teams: a printable summary, raw data for Excel or GIS, and a link to share. */
export function OfficialsMenu({ rows }: { rows: { city: City; c: Conditions }[] }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const ready = rows.length > 0;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Building2 /> {t("forHealthOfficials")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("forHealthOfficials")}</DialogTitle>
          <DialogDescription>
            Today’s conditions for all {rows.length || ""} monitored cities, ready for a briefing or your own tools.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button variant="outline" className="h-auto justify-start py-3 text-left" disabled={!ready} onClick={() => globalReport(rows)}>
            <FileDown />
            <span>
              <span className="block font-medium">{t("pdfReport")}</span>
              <span className="block text-xs font-normal text-muted-foreground">{t("pdfReportIntro")}</span>
            </span>
          </Button>
          <Button variant="outline" className="h-auto justify-start py-3 text-left" disabled={!ready} onClick={() => globalCsv(rows)}>
            <Sheet />
            <span>
              <span className="block font-medium">{t("csvData")}</span>
              <span className="block text-xs font-normal text-muted-foreground">{t("csvDataIntro")}</span>
            </span>
          </Button>
          <Button variant="outline" className="h-auto justify-start py-3 text-left" onClick={copyLink}>
            {copied ? <Check /> : <Link2 />}
            <span>
              <span className="block font-medium">{copied ? t("linkCopied") : t("copyDashboardLink")}</span>
              <span className="block text-xs font-normal text-muted-foreground">{t("copyDashboardLinkIntro")}</span>
            </span>
          </Button>
        </div>
        {!ready && <p className="text-xs text-muted-foreground">{t("exportsUnlock")}</p>}
      </DialogContent>
    </Dialog>
  );
}
