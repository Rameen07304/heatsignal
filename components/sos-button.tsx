"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Hospital, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EMERGENCY_COUNTRIES, emergencyNumbers, serviceLabel } from "@/lib/emergency";
import { useT, type Key } from "@/lib/i18n";
import { KEYS, readJson, writeJson } from "@/lib/device-store";

export const SOS_COUNTRY_KEY = "heatsignal-sos-country";

/** The last country the user looked at, else the region of their browser language (e.g. en-PK → Pakistan). */
function guessCountry(): string {
  try {
    const saved = localStorage.getItem(SOS_COUNTRY_KEY);
    if (saved) return saved;
  } catch {}
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    const name = region && new Intl.DisplayNames(["en"], { type: "region" }).of(region);
    if (name && emergencyNumbers(name)) return name;
  } catch {}
  return "";
}

/** Red SOS button fixed to the bottom corner of every page. */
export function SosButton() {
  const { t } = useT();
  const tr = (k: string) => t(k as Key);
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("");
  useEffect(() => {
    if (!open) return;
    setCountry(guessCountry());
    // Count emergency escalations (dates only, on this device) for the safety measures.
    writeJson(KEYS.sos, [...readJson<string[]>(KEYS.sos, []), new Date().toISOString()].slice(-500));
  }, [open]);
  // Other components (the worker check-in) can open this dialog.
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("heatsignal-sos", show);
    return () => window.removeEventListener("heatsignal-sos", show);
  }, []);

  const numbers = country ? emergencyNumbers(country) : null;
  const pick = (c: string) => {
    setCountry(c);
    try {
      localStorage.setItem(SOS_COUNTRY_KEY, c);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={t("sosTitle")}
          className="no-print fixed bottom-4 end-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 sm:bottom-6 sm:end-6"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-red-600 opacity-30 [animation-duration:2s]" aria-hidden />
          <Phone className="relative h-6 w-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-red-600 dark:text-red-400">{t("sosTitle")}</DialogTitle>
          <DialogDescription>{t("sosIntro")}</DialogDescription>
        </DialogHeader>

        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">{t("country")}</span>
          <select
            value={country}
            onChange={(e) => pick(e.target.value)}
            className="h-10 w-full rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t("chooseCountry")}</option>
            {EMERGENCY_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        {numbers ? (
          <div className="space-y-3">
            <div className="rounded-lg border p-4 text-center">
              <div className="text-sm text-muted-foreground">{serviceLabel(numbers[0].label, tr)}</div>
              <div className="text-5xl font-bold tabular-nums tracking-tight">{numbers[0].number}</div>
              {numbers.slice(1).map((n) => (
                <div key={n.number} className="mt-1 text-sm text-muted-foreground">
                  {serviceLabel(n.label, tr)}: <b className="text-foreground">{n.number}</b>
                </div>
              ))}
            </div>
            <a
              href={`tel:${numbers[0].number}`}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-green-600 text-lg font-semibold text-white hover:bg-green-700"
            >
              <Phone className="h-5 w-5" /> {t("callNumberNow", { number: numbers[0].number })}
            </a>
          </div>
        ) : (
          <p className="rounded-lg border p-4 text-sm">
            {country ? `${t("noNumberYet")} ` : ""}{t("callLocalOr112")}
          </p>
        )}

        <a
          href="https://www.google.com/maps/search/hospital+near+me"
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium hover:bg-muted"
        >
          <Hospital className="h-4 w-4" /> {t("nearestHospital")}
        </a>

        <div className="text-sm">
          <p className="font-semibold">{t("whileYouWait")}</p>
          <ul className="mt-1 list-disc space-y-1 ps-5 text-muted-foreground">
            <li>{t("waitStep1")}</li>
            <li>{t("waitStep2")}</li>
            <li>{t("waitStep3")}</li>
          </ul>
          <Link href="/first-aid" onClick={() => setOpen(false)} className="mt-2 inline-block text-primary underline-offset-2 hover:underline">
            {t("firstAidGuideLink")}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
