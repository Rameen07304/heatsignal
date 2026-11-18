"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cityKey } from "@/lib/cities";
import { useT } from "@/lib/i18n";
import { CRITICAL_SCORE } from "@/lib/risk-forecast";
import { formatAqi } from "@/lib/air";
import { useLoaded } from "@/lib/use-cities";
import type { City } from "@/lib/cities";
import type { Conditions } from "@/lib/conditions";

const ENABLED_KEY = "heatsignal-notify";
const ALERTED_KEY = "heatsignal-alerted";
const QUIET_MS = 60 * 60 * 1000;

/** A short two-tone chime, generated — no audio file. */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 660].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
  } catch {}
}

function flashTitle() {
  const original = document.title;
  let n = 0;
  const id = setInterval(() => {
    document.title = n++ % 2 ? original : "🚨 ALERT — HeatSignal";
    if (n > 12) {
      clearInterval(id);
      document.title = original;
    }
  }, 800);
}

function notify(list: { city: City; c: Conditions }[]) {
  if (!list.length || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    for (const { city, c } of list.slice(0, 3)) {
      new Notification("🚨 HeatSignal Alert", {
        body:
          `${city.name} has reached ${c.now.level?.toUpperCase()} environmental risk\n` +
          `Compound Score: ${c.now.score}/100 | WBGT: ${c.now.wbgt.toFixed(1)} °C` +
          (c.now.air ? ` | AQI: ${formatAqi(c.now.air.aqi)}` : ""),
        tag: `heatsignal-${cityKey(city)}`,
      });
    }
  } catch {} // Android Chrome forbids `new Notification` (service workers only); the chime and title still alert

  chime();
  flashTitle();
}

/**
 * Bell in the header. When on, HeatSignal notifies you (sound, browser notification, flashing tab)
 * whenever a monitored city crosses into Critical or Emergency between data refreshes.
 */
export function NotifyButton() {
  const { t } = useT();
  const loaded = useLoaded();
  const [enabled, setEnabled] = useState(false);
  const previous = useRef<Map<string, number> | null>(null);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(ENABLED_KEY) === "1" && Notification.permission === "granted");
    } catch {}
  }, []);

  // Detect crossings into Critical+ since the last refresh.
  useEffect(() => {
    if (!loaded.length) return;
    const scores = new Map(loaded.map(({ city, c }) => [cityKey(city), c.now.score ?? 0]));
    const before = previous.current;
    previous.current = scores;
    if (!enabled || !before) return;
    let alerted: Record<string, number> = {};
    try {
      alerted = JSON.parse(localStorage.getItem(ALERTED_KEY) ?? "{}");
    } catch {}
    const now = Date.now();
    const crossed = loaded.filter(({ city, c }) => {
      const k = cityKey(city);
      return (c.now.score ?? 0) >= CRITICAL_SCORE && (before.get(k) ?? 0) < CRITICAL_SCORE && now - (alerted[k] ?? 0) > QUIET_MS;
    });
    if (!crossed.length) return;
    crossed.forEach(({ city }) => (alerted[cityKey(city)] = now));
    try {
      localStorage.setItem(ALERTED_KEY, JSON.stringify(alerted));
    } catch {}
    notify(crossed);
  }, [loaded, enabled]);

  async function toggle() {
    if (enabled) {
      setEnabled(false);
      try {
        localStorage.setItem(ENABLED_KEY, "0");
      } catch {}
      return;
    }
    if (typeof Notification === "undefined") return alert("This browser does not support notifications.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    setEnabled(true);
    try {
      localStorage.setItem(ENABLED_KEY, "1");
    } catch {}
    // Confirm it works by reporting the cities that are already critical.
    notify(
      loaded
        .filter(({ c }) => (c.now.score ?? 0) >= CRITICAL_SCORE)
        .sort((a, b) => (b.c.now.score ?? 0) - (a.c.now.score ?? 0)),
    );
  }

  return (
    <Button variant="ghost" size="icon" className="shrink-0" aria-pressed={enabled} aria-label={enabled ? t("notifyOn") : t("notifyOff")} title={enabled ? t("notifyOn") : t("notifyOff")} onClick={toggle}>
      {enabled ? <BellRing className="text-primary" /> : <Bell />}
    </Button>
  );
}
