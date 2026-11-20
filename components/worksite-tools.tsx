"use client";

import { useEffect, useState } from "react";
import { ClipboardList, FileDown, Hospital, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareDialog } from "@/components/share-dialog";
import { UNHEALTHY_AQI, formatAqi } from "@/lib/air";
import { cityKey, type City } from "@/lib/cities";
import type { CombinedHour } from "@/lib/conditions";
import { emergencyLine } from "@/lib/emergency";
import { esc, openPrintable } from "@/lib/report";
import { useCities } from "@/lib/use-cities";
import { hourRanges, litresPerHour, workRegimen } from "@/lib/work-rest";
import { useWorkerContext } from "@/lib/use-worker-context";
import { useT, type Key } from "@/lib/i18n";

const read = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

// ---- Employer checklist -------------------------------------------------------------------------

interface Item {
  id: string;
  text: string;
}

/** Today's employer checklist, built from the site's forecast. Ticks are kept in this browser, per site and day. */
export function EmployerChecklist({ city, today }: { city: City; today: CombinedHour[] }) {
  const [ctx] = useWorkerContext();
  const { t } = useT();
  const tr = (k: string) => t(k as Key);
  const peak = today.reduce<CombinedHour | null>((b, h) => (!b || h.wbgt > b.wbgt ? h : b), null);
  const heavyStops = hourRanges(today, (h) => workRegimen(h.wbgt, "heavy", ctx).workMin < 60);
  const water = Math.max(8 * 0.95, today.filter((h) => +h.time.slice(11, 13) >= 7 && +h.time.slice(11, 13) < 15).reduce((s, h) => s + litresPerHour(workRegimen(h.wbgt, "heavy", ctx)), 0));
  const maxAqi = Math.max(0, ...today.map((h) => h.air?.aqi ?? 0));

  // Items have fixed ids so ticks survive a language change.
  const required: Item[] = [
    { id: "notice", text: t("ckPostNotice") },
    { id: "shade", text: t("ckShade") },
    { id: "water", text: t("ckWater", { n: Math.ceil(water) }) },
    { id: "buddies", text: t("ckBuddies") },
    { id: "brief", text: t("ckBrief") },
    { id: "emergency", text: t("ckEmergencyPlan", { line: emergencyLine(city.country, tr) }) },
    ...(maxAqi >= UNHEALTHY_AQI ? [{ id: "masks", text: t("ckMasks", { aqi: formatAqi(maxAqi) }) }] : []),
  ];
  const recommended: Item[] = [
    heavyStops.length
      ? { id: "move", text: t("ckMoveHeavy", { ranges: heavyStops.map((r) => `${r.from}–${r.to}`).join(", ") }) }
      : { id: "move", text: t("ckScheduleCool") },
    { id: "ors", text: t("ckOrs") },
    { id: "pace", text: t("ckPace") },
    { id: "new", text: t("ckWatchNew") },
    { id: "cooling", text: t("ckCooling") },
  ];

  const key = `heatsignal-checklist-${cityKey(city)}-${today[0]?.time.slice(0, 10) ?? ""}`;
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => setDone(read<string[]>(key, [])), [key]);
  const toggle = (item: string) => {
    const next = done.includes(item) ? done.filter((d) => d !== item) : [...done, item];
    setDone(next);
    write(key, next);
  };
  const total = required.length + recommended.length;

  const asText = () =>
    [
      `${t("checklistTitleFor", { city: city.name })}${peak ? ` (${t("peakWbgtToday", { wbgt: peak.wbgt.toFixed(1) })})` : ""}`,
      "",
      `${t("requiredToday")}:`,
      ...required.map((r) => `☐ ${r.text}`),
      "",
      `${t("recommended")}:`,
      ...recommended.map((r) => `☐ ${r.text}`),
    ].join("\n");

  function print() {
    const list = (title: string, xs: Item[]) => `<h2>${esc(title)}</h2><ul style="list-style:none;padding:0">${xs.map((x) => `<li style="margin:6px 0">☐ ${esc(x.text)}</li>`).join("")}</ul>`;
    openPrintable(
      t("checklistTitleFor", { city: city.name }),
      peak ? t("peakWbgtAt", { wbgt: peak.wbgt.toFixed(1), time: peak.time.slice(11, 16) }) : "",
      list(t("requiredToday"), required) + list(t("recommended"), recommended),
    );
  }

  const Row = ({ item }: { item: Item }) => (
    <li>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" checked={done.includes(item.id)} onChange={() => toggle(item.id)} />
        <span className={done.includes(item.id) ? "text-muted-foreground line-through" : ""}>{item.text}</span>
      </label>
    </li>
  );

  return (
    <Card className="no-print">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> {t("employerChecklist")}</CardTitle>
          <CardDescription>{t("checklistProgress", { city: city.name, done: done.filter((d) => [...required, ...recommended].some((i) => i.id === d)).length, total })}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShareDialog title={t("checklistTitleFor", { city: city.name })} text={asText()} path="/worker-safety" />
          <Button size="sm" variant="outline" onClick={print}><FileDown /> {t("print")}</Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 text-sm lg:grid-cols-2">
        <div>
          <h3 className="mb-1 font-semibold">{t("requiredToday")}</h3>
          <ul>{required.map((r) => <Row key={r.id} item={r} />)}</ul>
        </div>
        <div>
          <h3 className="mb-1 font-semibold">{t("recommended")}</h3>
          <ul>{recommended.map((r) => <Row key={r.id} item={r} />)}</ul>
          <a
            href="https://www.google.com/maps/search/hospital+near+me"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-primary underline-offset-2 hover:underline"
          >
            <Hospital className="h-4 w-4" /> {t("nearestHospital")}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Incident log -------------------------------------------------------------------------------

const KEY = "heatsignal-incidents";
const TYPES = ["Heat exhaustion", "Heatstroke", "Dehydration", "Fainting", "Breathing problem", "Other"];
export const INDUSTRY_NAMES = ["Construction", "Agriculture", "Delivery and logistics", "Oil and gas", "Tourism and events", "Sanitation", "Security and traffic", "Other"];
const TIMES = ["Morning", "Midday", "Afternoon", "Evening", "Night"];
/** Stored values stay English (so old reports still count); shown through these keys. */
const OPTION_KEY: Record<string, Key> = {
  "Heat exhaustion": "incHeatExhaustion",
  Heatstroke: "incHeatstroke",
  Dehydration: "incDehydration",
  Fainting: "incFainting",
  "Breathing problem": "incBreathing",
  Other: "incOther",
  Construction: "indConstruction",
  Agriculture: "indAgriculture",
  "Delivery and logistics": "indDelivery",
  "Oil and gas": "indOilGas",
  "Tourism and events": "indTourism",
  Sanitation: "indSanitation",
  "Security and traffic": "indSecurity",
  Morning: "todMorning",
  Midday: "todMidday",
  Afternoon: "todAfternoon",
  Evening: "todEvening",
  Night: "todNight",
};

interface Incident {
  id: string;
  date: string;
  city: string;
  type: string;
  industry: string;
  time: string;
}

/** Incidents logged in this browser in the last 7 days. */
export function incidentsThisWeek(): Incident[] {
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  return read<Incident[]>(KEY, []).filter((i) => i.date >= weekAgo);
}

const SELECT = "h-10 w-full rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Anonymous heat-incident log. Health departments need incident counts to justify heat rules.
 * Note: kept in this browser only; a shared log would need a backend and consent rules.
 */
export function IncidentLog({ city }: { city: City }) {
  const { cities } = useCities();
  const { t } = useT();
  const shown = (n: number) => (n > 0 && n < 5 ? t("fewerThan5") : String(n));
  const [list, setList] = useState<Incident[]>([]);
  const [form, setForm] = useState({ city: city.name, date: "", type: TYPES[0], industry: INDUSTRY_NAMES[0], time: TIMES[1] });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setList(read<Incident[]>(KEY, []));
    setForm((f) => ({ ...f, date: f.date || new Date().toISOString().slice(0, 10) }));
  }, []);
  useEffect(() => setForm((f) => ({ ...f, city: city.name })), [city.name]);

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const week = list.filter((i) => i.date >= weekAgo);
  const byType = TYPES.map((type) => [type, week.filter((i) => i.type === type).length] as const).filter(([, n]) => n > 0);
  const names = Array.from(new Set([city.name, ...cities.map((c) => c.name)])).sort();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = [{ id: crypto.randomUUID(), ...form }, ...list].slice(0, 500);
    setList(next);
    write(KEY, next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function clear() {
    setList([]);
    write(KEY, []);
  }

  const field = (label: string, el: React.ReactNode) => (
    <label className="space-y-1 text-xs text-muted-foreground">
      <span className="block">{label}</span>
      {el}
    </label>
  );
  const opts = (xs: string[]) => xs.map((x) => <option key={x} value={x}>{OPTION_KEY[x] ? t(OPTION_KEY[x]) : x}</option>);

  return (
    <Card className="no-print">
      <CardHeader>
        <CardTitle>{t("reportIncident")}</CardTitle>
        <CardDescription>{t("reportIncidentIntro", { n: shown(week.length) })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {field(t("city"), <select className={SELECT} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{opts(names)}</select>)}
          {field(t("date"), <input type="date" className={SELECT} value={form.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, date: e.target.value })} required />)}
          {field(t("whatHappened"), <select className={SELECT} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{opts(TYPES)}</select>)}
          {field(t("industry"), <select className={SELECT} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>{opts(INDUSTRY_NAMES)}</select>)}
          {field(t("timeOfDay"), <select className={SELECT} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>{opts(TIMES)}</select>)}
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
            <Button type="submit">{t("submitReport")}</Button>
            {saved && <span className="text-sm text-muted-foreground" role="status">{t("savedThanks")}</span>}
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-5">
            {t("reportsNeverDiscipline")}
          </p>
        </form>

        {list.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("thisWeekByType")}</h3>
              <Button size="sm" variant="ghost" onClick={clear}><Trash2 /> {t("clearAll")}</Button>
            </div>
            {byType.length ? (
              <ul className="divide-y rounded-md border text-sm">
                {byType.map(([type, n]) => (
                  <li key={type} className="flex justify-between gap-x-3 px-3 py-2">
                    <span>{t(OPTION_KEY[type])}</span>
                    <span className="tabular-nums text-muted-foreground">{shown(n)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noReports7d")}</p>
            )}
            <p className="text-xs text-muted-foreground">{t("countsBelow5Hidden")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
