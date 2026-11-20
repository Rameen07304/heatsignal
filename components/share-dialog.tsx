"use client";

import { useState } from "react";
import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { aqiBand, formatAqi } from "@/lib/air";
import type { City } from "@/lib/cities";
import type { CombinedHour } from "@/lib/conditions";
import { compoundBand } from "@/lib/risk";
import { useT } from "@/lib/i18n";

/** The WhatsApp-style message for one city's conditions. */
export function riskMessage(city: City, h: CombinedHour) {
  return [
    `⚠️ ${city.name} health alert`,
    "",
    h.score != null ? `Risk level: ${h.level} (${h.score}/100)` : `Heat stress: ${h.risk}`,
    `Temperature: ${h.temp.toFixed(0)}°C, heat stress (WBGT) ${h.wbgt.toFixed(1)}°C`,
    h.air ? `Air quality: AQI ${formatAqi(h.air.aqi)} (${aqiBand(h.air.aqi).label})` : null,
    "",
    h.score != null ? `${compoundBand(h.score).description}.` : null,
  ]
    .filter((l) => l != null)
    .join("\n");
}

/**
 * Share a warning where people actually see it. WhatsApp comes first: it is how health messages travel in the
 * Gulf and South Asia. `path` is a site path such as "/city/31.55/74.35"; the dialog adds the origin.
 */
export function ShareDialog({
  title,
  text,
  path,
  label,
  size = "sm",
  variant = "outline",
  iconOnly = false,
  className,
}: {
  title: string;
  text: string;
  path: string;
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  iconOnly?: boolean;
  className?: string;
}) {
  const { t } = useT();
  label ??= t("share");
  const [copied, setCopied] = useState(false);
  const url = () => `${location.origin}${path}`;
  const message = () => `${text}\n\nLive conditions: ${url()}`;
  const open = (href: string) => window.open(href, "_blank", "noopener,noreferrer");
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size={iconOnly ? "icon" : size} variant={variant} className={className} aria-label={iconOnly ? `${label}: ${title}` : undefined}>
          <Share2 /> {!iconOnly && label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("shareThisWarning")}</DialogTitle>
          <DialogDescription>{t("shareIntro")}</DialogDescription>
        </DialogHeader>
        <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-sans text-xs text-muted-foreground">{text}</pre>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => open(`https://wa.me/?text=${encodeURIComponent(message())}`)}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#25D366] text-sm font-semibold text-[#073b1d] hover:brightness-95"
          >
            <MessageCircle className="h-4 w-4" /> Share on WhatsApp
          </button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={copy}>
              {copied ? <Check /> : <Link2 />} {copied ? t("linkCopied") : t("copyLink")}
            </Button>
            <Button
              variant="outline"
              onClick={() => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text.split("\n")[0])}&url=${encodeURIComponent(url())}`)}
            >
              <span aria-hidden className="font-bold">X</span> Post on X
            </Button>
          </div>
          {canShare && (
            <Button variant="outline" onClick={() => navigator.share({ title, text, url: url() }).catch(() => {})}>
              <Share2 /> More apps…
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
