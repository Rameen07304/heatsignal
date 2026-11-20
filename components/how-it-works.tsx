"use client";

import { useEffect, useState } from "react";
import { MessageSquareWarning, SlidersHorizontal, Thermometer, X } from "lucide-react";
import { useT, type Key } from "@/lib/i18n";

const KEY = "heatsignal-hide-how";
const STEPS: { icon: typeof Thermometer; text: Key }[] = [
  { icon: Thermometer, text: "howStep1" },
  { icon: SlidersHorizontal, text: "howStep2" },
  { icon: MessageSquareWarning, text: "howStep3" },
];

/** Three-step explainer for first-time visitors. Hidden for good once dismissed. */
export function HowItWorks() {
  const { t } = useT();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden) return null;

  return (
    <section aria-label={t("howTitle")} className="relative rounded-lg bg-muted/50 p-4">
      <button
        type="button"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
        }}
        className="absolute end-2 top-2 rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={t("dismiss")}
      >
        <X className="h-4 w-4" />
      </button>
      <h2 className="mb-3 pe-10 text-sm font-semibold">{t("howTitle")}</h2>
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, text }, i) => (
          <li key={text} className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">{i + 1}</span>
            <span className="flex items-start gap-2 text-sm">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {t(text)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
