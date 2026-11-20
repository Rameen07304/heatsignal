"use client";

import { useEffect, useRef, useState } from "react";
import { Coffee, Droplets, Play, SkipForward, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CombinedHour } from "@/lib/conditions";
import { nextBreak } from "@/lib/crew";
import { KEYS, adherence, todaysTimer, writeJson, type TimerLog } from "@/lib/device-store";
import { useT } from "@/lib/i18n";
import { INTENSITIES, type Intensity, type WorkerContext } from "@/lib/work-rest";

const WATER_EVERY_MS = 20 * 60 * 1000;

type WakeLock = { release(): Promise<void> };
type WakeNav = Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLock> } };

/** Beep, vibrate and (if allowed) show a notification. Each part is best effort. */
function remind(title: string, body: string) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
  try {
    navigator.vibrate?.([300, 150, 300]);
  } catch {}
  try {
    if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, icon: "/pwa-icon/192" });
  } catch {}
}

/** "HH:MM" today on this device. ponytail: assumes the worker's phone is in the site's time zone. */
const atToday = (hhmm: string) => {
  const d = new Date();
  d.setHours(Number(hhmm.slice(0, 2)), Number(hhmm.slice(3, 5)), 0, 0);
  return d;
};

/** Shift timer: countdown to the next rest break, water reminders every 20 minutes, and today's adherence. */
export function BreakTimer({ hours, now, ctx }: { hours: CombinedHour[]; now: CombinedHour; ctx: WorkerContext }) {
  const { t, n } = useT();
  const [work, setWork] = useState<Intensity>("heavy");
  const [log, setLog] = useState<TimerLog | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const wake = useRef<WakeLock | null>(null);
  const lastDue = useRef<string>("");

  useEffect(() => setLog(todaysTimer()), []);
  const update = (patch: Partial<TimerLog>) =>
    setLog((l) => {
      const next = { ...(l ?? todaysTimer()), ...patch };
      writeJson(KEYS.timer, next);
      return next;
    });

  const running = log?.started != null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Keep the screen on during the shift; the lock is dropped when the tab is hidden, so take it again on return.
  useEffect(() => {
    if (!running) return;
    const take = async () => {
      try {
        if (document.visibilityState === "visible") wake.current = (await (navigator as WakeNav).wakeLock?.request("screen")) ?? null;
      } catch {}
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      document.removeEventListener("visibilitychange", take);
      wake.current?.release().catch(() => {});
      wake.current = null;
    };
  }, [running]);

  const from = Math.max(0, hours.findIndex((h) => h.time === now.time));
  const nb = nextBreak({ id: "me", work, ...ctx }, hours.slice(from), new Date(clock).getMinutes());
  const target = nb.includes(":") ? atToday(nb) : null;
  const msLeft = target ? target.getTime() - clock : null;

  // Count due breaks and water reminders while the shift runs.
  useEffect(() => {
    if (!log?.started) return;
    const dueKey = nb === "now" ? `${new Date(clock).getHours()}` : "";
    if (dueKey && lastDue.current !== dueKey) {
      lastDue.current = dueKey;
      update({ breaksDue: log.breaksDue + 1 });
      remind(t("breakDueTitle"), t("breakDueBody"));
    }
    const reminders = Math.floor((clock - log.started) / WATER_EVERY_MS);
    if (reminders > log.waterReminders) {
      update({ waterReminders: reminders });
      remind(t("waterDueTitle"), t("waterDueBody"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on each tick
  }, [clock]);

  function start() {
    try {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    } catch {}
    lastDue.current = "";
    update({ started: Date.now() });
  }

  const a = log ? adherence(log) : { breaks: null, water: null };
  const mmss = (ms: number) => {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h ? t("inHoursMinutes", { h, m }) : t("inMinutesSeconds", { m, s: String(s % 60).padStart(2, "0") });
  };
  const big = "h-14 flex-1 min-w-[9rem] text-base";

  return (
    <Card className="no-print">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5 text-primary" /> {t("breakTimer")}</CardTitle>
        <CardDescription>{t("breakTimerIntro")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={work} onValueChange={(v) => setWork(v as Intensity)}>
            <TabsList>{INTENSITIES.map((i) => <TabsTrigger key={i.key} value={i.key}>{t(i.labelKey)}</TabsTrigger>)}</TabsList>
          </Tabs>
          {running ? (
            <Button variant="outline" onClick={() => update({ started: null })}><Square /> {t("stopShift")}</Button>
          ) : (
            <Button onClick={start}><Play /> {t("startShift")}</Button>
          )}
        </div>

        {running && (
          <>
            <div className="rounded-lg border-2 p-4 text-center" role="timer" aria-live="off">
              <div className="text-sm text-muted-foreground">{t("nextBreak")}</div>
              <div className="text-4xl font-black tabular-nums" dir="ltr">
                {nb === "now" ? t("breakNow") : nb === "stopped" ? t("stopped") : msLeft != null ? mmss(msLeft) : t("noBreakNeeded")}
              </div>
              {target && <div className="text-sm text-muted-foreground" dir="ltr">{nb}</div>}
              {nb === "now" && <p className="mt-1 font-semibold text-destructive">{t("breakDueBody")}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className={big} onClick={() => update({ breaksTaken: (log?.breaksTaken ?? 0) + 1 })}><Coffee /> {t("breakTaken")}</Button>
              <Button className={big} variant="outline" onClick={() => update({ waterDrunk: (log?.waterDrunk ?? 0) + 1 })}><Droplets /> {t("drankWater")}</Button>
              <Button className={big} variant="outline" onClick={() => update({ breaksSkipped: (log?.breaksSkipped ?? 0) + 1 })}><SkipForward /> {t("skipped")}</Button>
            </div>
          </>
        )}

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground">{t("breakAdherence")}</dt>
            <dd className="text-2xl font-bold tabular-nums">{a.breaks == null ? "–" : `${n(a.breaks)}%`}</dd>
            <dd className="text-xs text-muted-foreground">{t("ofDue", { done: log?.breaksTaken ?? 0, due: log?.breaksDue ?? 0 })}</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground">{t("waterAdherence")}</dt>
            <dd className="text-2xl font-bold tabular-nums">{a.water == null ? "–" : `${n(a.water)}%`}</dd>
            <dd className="text-xs text-muted-foreground">{t("ofDue", { done: log?.waterDrunk ?? 0, due: log?.waterReminders ?? 0 })}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
