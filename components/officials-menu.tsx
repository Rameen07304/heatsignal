"use client";

import { useState } from "react";
import { Building2, Check, FileDown, Link2, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { City } from "@/lib/cities";
import type { Conditions } from "@/lib/conditions";
import { globalCsv, globalReport } from "@/lib/report";

/** Exports for public-health teams: a printable summary, raw data for Excel or GIS, and a link to share. */
export function OfficialsMenu({ rows }: { rows: { city: City; c: Conditions }[] }) {
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
          <Building2 /> For health officials
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>For health officials</DialogTitle>
          <DialogDescription>
            Today’s conditions for all {rows.length || ""} monitored cities, ready for a briefing or your own tools.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button variant="outline" className="h-auto justify-start py-3 text-left" disabled={!ready} onClick={() => globalReport(rows)}>
            <FileDown />
            <span>
              <span className="block font-medium">PDF report</span>
              <span className="block text-xs font-normal text-muted-foreground">Ranked cities, 48-hour outlook and a response guide by risk level</span>
            </span>
          </Button>
          <Button variant="outline" className="h-auto justify-start py-3 text-left" disabled={!ready} onClick={() => globalCsv(rows)}>
            <Sheet />
            <span>
              <span className="block font-medium">CSV data</span>
              <span className="block text-xs font-normal text-muted-foreground">Every city’s readings, for Excel or GIS</span>
            </span>
          </Button>
          <Button variant="outline" className="h-auto justify-start py-3 text-left" onClick={copyLink}>
            {copied ? <Check /> : <Link2 />}
            <span>
              <span className="block font-medium">{copied ? "Link copied" : "Copy dashboard link"}</span>
              <span className="block text-xs font-normal text-muted-foreground">Send the live dashboard to your team</span>
            </span>
          </Button>
        </div>
        {!ready && <p className="text-xs text-muted-foreground">Exports unlock once the live data has loaded.</p>}
      </DialogContent>
    </Dialog>
  );
}
