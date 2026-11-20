import type { StatusLevel } from "./worker-status";

/**
 * Everything the worker tools keep stays in this browser's localStorage: nothing is sent anywhere.
 * Reads and writes never throw (private mode, blocked storage, quota).
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  window.dispatchEvent(new Event(STORE_EVENT));
}

/** Fired after any write, so other components on the page can re-read. */
export const STORE_EVENT = "heatsignal-store";

export const KEYS = {
  consent: "heatsignal-checkin-consent",
  /** The worker's own answers (this device only). */
  myCheckIn: "heatsignal-checkin-me",
  /** Status level only, by crew ID: what the crew board may see. Never symptoms or heart rate. */
  statuses: "heatsignal-checkin-status",
  crew: "heatsignal-crew",
  timer: "heatsignal-break-timer",
  sos: "heatsignal-sos-log",
} as const;

export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

export type StatusMap = Record<string, { level: StatusLevel; date: string }>;

/** Today's check-in statuses by crew ID. */
export const todaysStatuses = (): StatusMap =>
  Object.fromEntries(Object.entries(readJson<StatusMap>(KEYS.statuses, {})).filter(([, s]) => s.date === today()));

/** Small-cell suppression: counts of 1–4 could identify a worker. */
export const isSmallCell = (n: number) => n > 0 && n < 5;

/** Today's shift timer log (Task: break and water timer). */
export interface TimerLog {
  date: string;
  /** Shift start, ms since epoch; null when no shift is running. */
  started: number | null;
  breaksDue: number;
  breaksTaken: number;
  breaksSkipped: number;
  waterReminders: number;
  waterDrunk: number;
}
export const emptyTimer = (): TimerLog => ({ date: today(), started: null, breaksDue: 0, breaksTaken: 0, breaksSkipped: 0, waterReminders: 0, waterDrunk: 0 });

/** Today's log (yesterday's is dropped). */
export const todaysTimer = (): TimerLog => {
  const log = readJson<TimerLog | null>(KEYS.timer, null);
  return log?.date === today() ? log : emptyTimer();
};

/** Share of due breaks taken and of water reminders answered, 0–100, or null before any were due. */
export function adherence(log: TimerLog) {
  const pct = (done: number, due: number) => (due > 0 ? Math.round((Math.min(done, due) / due) * 100) : null);
  return { breaks: pct(log.breaksTaken, log.breaksDue), water: pct(log.waterDrunk, log.waterReminders) };
}
