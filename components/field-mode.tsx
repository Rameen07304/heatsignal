"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { BatteryLow, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useFieldMode } from "@/lib/use-field-mode";

type BatteryNav = Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener(t: string, cb: () => void): void }> };

/** Header toggle for field mode, plus a low-battery hint. Field mode forces the dark theme and restores the old one after. */
export function FieldModeToggle() {
  const { t, n } = useT();
  const [on, setOn] = useFieldMode();
  const { theme, setTheme } = useTheme();
  const BEFORE = "heatsignal-theme-before-field";
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);

  useEffect(() => {
    document.documentElement.dataset.field = on ? "on" : "off";
    if (on && theme !== "dark") {
      try {
        localStorage.setItem(BEFORE, theme ?? "system");
      } catch {}
      setTheme("dark");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when field mode changes
  }, [on]);

  useEffect(() => {
    let live = true;
    (navigator as BatteryNav).getBattery?.()
      .then((b) => {
        const read = () => live && setBattery({ level: b.level, charging: b.charging });
        read();
        b.addEventListener("levelchange", read);
        b.addEventListener("chargingchange", read);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  function toggle() {
    if (on) {
      try {
        const prev = localStorage.getItem(BEFORE);
        if (prev) setTheme(prev);
        localStorage.removeItem(BEFORE);
      } catch {}
    }
    setOn(!on);
  }

  const low = battery && !battery.charging && battery.level < 0.2;

  return (
    <>
      {battery && (
        <span className={`hidden items-center gap-1 text-xs sm:flex ${low ? "font-semibold text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`} title={t("battery")}>
          {low && <BatteryLow className="h-4 w-4" aria-hidden />}
          {n(Math.round(battery.level * 100))}%
        </span>
      )}
      {low && !on ? (
        <Button size="sm" variant="outline" className="border-amber-500 text-amber-800 dark:text-amber-300" onClick={toggle}>
          <BatteryLow /> <span className="hidden sm:inline">{t("lowBatteryFieldMode")}</span><span className="sm:hidden">{t("fieldMode")}</span>
        </Button>
      ) : (
        <Button variant="ghost" size="icon" aria-pressed={on} aria-label={on ? t("fieldModeOff") : t("fieldModeOn")} title={on ? t("fieldModeOff") : t("fieldModeOn")} onClick={toggle} className={on ? "bg-primary/15 text-primary" : ""}>
          <HardHat />
        </Button>
      )}
    </>
  );
}
