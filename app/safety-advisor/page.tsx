"use client";

import { useState } from "react";
import { Check, Copy, FileDown, Loader2, Printer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CityPicker } from "@/components/city-picker";
import { CompoundChart } from "@/components/compound-chart";
import { ErrorState } from "@/components/error-state";
import { formatAqi } from "@/lib/air";
import { alertBody, postAlert } from "@/lib/alert-client";
import { WORLD_CITIES, type City } from "@/lib/cities";
import type { CombinedHour, Conditions } from "@/lib/conditions";
import { emergencyLine } from "@/lib/emergency";
import type { EventReport } from "@/lib/gemini";
import { useT } from "@/lib/i18n";
import { esc, openPrintable } from "@/lib/report";
import { EVENT, SCHOOL, STATUS_COLOR, hourReason, hourStatus, worstStatus, type Status } from "@/lib/safety";
import { hoursOf, useCityConditions, worstHour } from "@/lib/use-city-conditions";
import { cn, formatDay } from "@/lib/utils";

const SELECT = "h-9 rounded-md border bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-muted-foreground">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function DayPicker({ c, value, onChange, max = 7 }: { c: Conditions; value: string; onChange: (d: string) => void; max?: number }) {
  return (
    <Field label="Day">
      <select className={SELECT} value={value} onChange={(e) => onChange(e.target.value)}>
        {c.days.slice(0, max).map((d, i) => (
          <option key={d.date} value={d.date}>{i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatDay(d.date)}</option>
        ))}
      </select>
    </Field>
  );
}

// ------------------------------------------------------------------------------------------------
// School safety
// ------------------------------------------------------------------------------------------------

const SCHOOL_TYPES = {
  primary: { label: "Primary (5–11)", note: "Young children overheat faster and won’t ask for water: teachers must offer it." },
  secondary: { label: "Secondary (12–17)", note: "Watch PE and sports closely; teenagers often push through warning signs." },
  university: { label: "University", note: "Students manage themselves: publish the advisory and adjust outdoor classes and sport." },
} as const;
type SchoolType = keyof typeof SCHOOL_TYPES;

function SchoolSafety() {
  const [city, setCity] = useState<City>(WORLD_CITIES.find((c) => c.name === "Lahore")!);
  const [type, setType] = useState<SchoolType>("primary");
  const [day, setDay] = useState<string | null>(null);
  const result = useCityConditions(city);
  const c = result.data;
  const date = day && c?.days.some((d) => d.date === day) ? day : c?.days[0].date;
  const hours = c && date ? hoursOf(c, date).filter((h) => { const x = Number(h.time.slice(11, 13)); return x >= 7 && x < 15; }) : [];
  const status = worstStatus(hours);
  const s = SCHOOL[status];
  const worst = worstHour(hours);

  const advice = [
    status >= 1 && `Set up drinking-water points in every playground and corridor; ${type === "primary" ? "offer a cup of water to every child every 20–30 minutes" : "remind students to drink every 20–30 minutes"}.`,
    status >= 1 && "Move PE, assemblies and sports to the coolest hours or indoors.",
    status >= 2 && "Keep classrooms ventilated and shaded; close curtains on the sunny side.",
    (worst?.air?.aqi ?? 0) > 100 && `Air quality is poor (AQI up to ${formatAqi(worst!.air!.aqi)}): keep windows closed and send children with asthma indoors.`,
    "Watch for signs of heat illness in children: unusual tiredness, headache, dizziness, nausea, flushed or very pale skin, confusion.",
    "Bring a child inside at once if they feel unwell, and call a parent; call an ambulance for confusion or fainting.",
    status === 0 && "Normal outdoor activities are fine; keep water available as usual.",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end gap-4">
        <CityPicker value={city} onChange={setCity} />
        <Field label="School type">
          <select className={SELECT} value={type} onChange={(e) => setType(e.target.value as SchoolType)}>
            {Object.entries(SCHOOL_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        {c && date && <DayPicker c={c} value={date} onChange={setDay} max={3} />}
      </div>

      {result.loading && <Skeleton className="h-80 w-full rounded-lg" />}
      {result.error && <ErrorState message="Couldn’t load conditions." onRetry={result.retry} />}

      {c && date && hours.length > 0 && (
        <>
          <div className="no-print flex justify-end">
            <Button onClick={() => window.print()}><Printer /> Print school notice</Button>
          </div>
          <div className="site-card overflow-hidden rounded-lg border-2 bg-card" style={{ borderColor: STATUS_COLOR[status] }}>
            <div className="p-5 text-white" style={{ backgroundColor: STATUS_COLOR[status] }}>
              <div className="text-xs font-semibold uppercase tracking-widest opacity-90">School outdoor activity status</div>
              <div className="text-4xl font-black">{s.name}</div>
              <div className="mt-1">{s.text}</div>
              <div className="mt-2 text-sm opacity-95">
                {city.name}{city.country ? `, ${city.country}` : ""} · {formatDay(date)} · school day 07:00–15:00 · {SCHOOL_TYPES[type].label}
              </div>
            </div>
            <div className="space-y-5 p-5">
              <div>
                <h3 className="mb-2 font-bold uppercase tracking-wide">Hour by hour</h3>
                <div className="space-y-1">
                  {hours.map((h) => {
                    const st = hourStatus(h);
                    return (
                      <div key={h.time} className="flex items-center gap-3 text-sm">
                        <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{h.time.slice(11, 16)}</span>
                        <div className="flex h-7 flex-1 items-center rounded px-2 text-xs font-semibold text-white" style={{ backgroundColor: STATUS_COLOR[st] }}>
                          {SCHOOL[st].hour}
                        </div>
                        <span className="hidden w-48 shrink-0 text-xs text-muted-foreground sm:block">{hourReason(h)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-bold uppercase tracking-wide">What to do</h3>
                <ul className="list-disc space-y-1 ps-5 text-sm">{advice.map((a) => <li key={a}>{a}</li>)}</ul>
                <p className="mt-2 text-sm text-muted-foreground">{SCHOOL_TYPES[type].note}</p>
                <p className="mt-2 text-xs font-semibold">Emergency: {emergencyLine(city.country)}</p>
              </div>
            </div>
            <p className="border-t px-5 py-2 text-xs text-muted-foreground">
              HeatSignal · Cancelled if compound ≥ 70, WBGT ≥ 32 °C or AQI ≥ 200; restricted at 50 / 30 °C / 150; modified at 35 / 28 °C / 100.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Event safety
// ------------------------------------------------------------------------------------------------

const EVENT_TYPES = ["Sports / marathon", "Concert / festival", "Construction", "Religious gathering", "Military / training", "Other outdoor"];
const ATTENDANCE = ["Under 100", "100–1,000", "1,000–10,000", "10,000+"];
const PHYSICAL = new Set(["Sports / marathon", "Construction", "Military / training"]);

/** Same-length window on the same day (05:00–23:00) with the lowest status, then lowest peak WBGT. */
function bestWindow(day: CombinedHour[], length: number) {
  let best: { start: number; status: Status; wbgt: number } | null = null;
  for (let s = 5; s + length <= 23; s++) {
    const w = day.filter((h) => { const x = Number(h.time.slice(11, 13)); return x >= s && x < s + length; });
    if (w.length < length) continue;
    const cand = { start: s, status: worstStatus(w), wbgt: Math.max(...w.map((h) => h.wbgt)) };
    if (!best || cand.status < best.status || (cand.status === best.status && cand.wbgt < best.wbgt - 0.3)) best = cand;
  }
  return best;
}

function EventSafety() {
  const [city, setCity] = useState<City>(WORLD_CITIES.find((c) => c.name === "Abu Dhabi")!);
  const [day, setDay] = useState<string | null>(null);
  const [start, setStart] = useState(9);
  const [end, setEnd] = useState(13);
  const [type, setType] = useState(EVENT_TYPES[0]);
  const [attendance, setAttendance] = useState(ATTENDANCE[2]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<(EventReport & { source: string }) | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const result = useCityConditions(city);
  const c = result.data;
  const date = day && c?.days.some((d) => d.date === day) ? day : c?.days[0].date;
  const dayHours = c && date ? hoursOf(c, date) : [];
  const slot = dayHours.filter((h) => { const x = Number(h.time.slice(11, 13)); return x >= start && x < end; });
  const status = worstStatus(slot);
  const worst = worstHour(slot);
  const maxAqi = Math.max(0, ...slot.map((h) => h.air?.aqi ?? 0));
  const maxWbgt = slot.length ? Math.max(...slot.map((h) => h.wbgt)) : 0;
  const big = attendance === ATTENDANCE[2] || attendance === ATTENDANCE[3];
  const best = slot.length ? bestWindow(dayHours, end - start) : null;
  const better = best && best.start !== start && (best.status < status || best.wbgt < maxWbgt - 1) ? best : null;

  const checklist = [
    (status >= 1 || big) && "Medical tent with cooling equipment (ice, water, shade, fans)",
    status >= 1 && "Water stations every 200 metres",
    maxWbgt >= 28 && "Shade structures or misting fans",
    (big || status >= 2) && "PA system for emergency announcements",
    maxAqi > 100 && `N95 masks available (AQI up to ${formatAqi(maxAqi)})`,
    better && `Modified schedule: start at ${hh(better.start)} instead of ${hh(start)}`,
    status >= 1 && PHYSICAL.has(type) && "Mandatory 15-minute breaks every hour",
    (big || status >= 2) && "On-site ambulance",
    "Briefing for staff and volunteers on the signs of heat illness",
  ].filter(Boolean) as string[];

  async function generate() {
    if (!worst || !date) return;
    setLoading(true);
    setReportError(null);
    setReport(null);
    try {
      setReport(
        await postAlert<EventReport & { source: string }>(
          alertBody(city, worst, {
            stage: "event",
            event: { type, attendance, date: formatDay(date), start: hh(start), end: hh(end), rating: EVENT[status], betterStart: better ? hh(better.start) : undefined },
          }),
        ),
      );
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const reportText = (r: EventReport) =>
    [
      `Event Safety Report — ${type}, ${city.name}, ${date && formatDay(date)} ${hh(start)}–${hh(end)}`,
      `Rating: ${EVENT[status]}`,
      "",
      r.summary,
      "",
      "Risks:", ...r.risks.map((x) => `• ${x}`),
      "", "Precautions:", ...r.precautions.map((x) => `• ${x}`),
      "", "Schedule:", ...r.schedule.map((x) => `• ${x}`),
      "", "Emergency plan:", ...r.emergency_plan.map((x) => `• ${x}`),
      "", `Emergency: ${emergencyLine(city.country)}`,
    ].join("\n");

  function printReport(r: EventReport) {
    const list = (h: string, xs: string[]) => `<h2>${esc(h)}</h2><ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    openPrintable(
      `Event Safety Report — ${type}`,
      `${city.name}${city.country ? `, ${city.country}` : ""} · ${date ? formatDay(date) : ""} ${hh(start)}–${hh(end)} · ${attendance} people · Rating: ${EVENT[status]}`,
      `<section><h2>Summary</h2><p>${esc(r.summary)}</p></section>${list("Risks", r.risks)}${list("Precautions", r.precautions)}${list("Schedule", r.schedule)}${list("Emergency plan", r.emergency_plan)}<p><b>Emergency: ${esc(emergencyLine(city.country))}</b></p>`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <CityPicker value={city} onChange={setCity} />
        {c && date && <DayPicker c={c} value={date} onChange={setDay} />}
        <Field label="Starts">
          <select className={SELECT} value={start} onChange={(e) => { const s = Number(e.target.value); setStart(s); if (end <= s) setEnd(Math.min(s + 2, 24)); }}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hh(h)}</option>)}
          </select>
        </Field>
        <Field label="Ends">
          <select className={SELECT} value={end} onChange={(e) => setEnd(Number(e.target.value))}>
            {Array.from({ length: 24 - start }, (_, i) => start + 1 + i).map((h) => <option key={h} value={h}>{hh(h)}</option>)}
          </select>
        </Field>
        <Field label="Event type">
          <select className={SELECT} value={type} onChange={(e) => setType(e.target.value)}>
            {EVENT_TYPES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Expected attendance">
          <select className={SELECT} value={attendance} onChange={(e) => setAttendance(e.target.value)}>
            {ATTENDANCE.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
      </div>

      {result.loading && <Skeleton className="h-80 w-full rounded-lg" />}
      {result.error && <ErrorState message="Couldn’t load conditions." onRetry={result.retry} />}

      {c && date && slot.length > 0 && (
        <>
          <div className="rounded-lg p-5 text-white" style={{ backgroundColor: STATUS_COLOR[status] }}>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-90">Event risk rating</div>
            <div className="text-4xl font-black">{EVENT[status]}</div>
            <div className="mt-1 text-sm opacity-95">
              Worst hour {worst?.time.slice(11, 16)}: {worst && hourReason(worst)}
              {!slot.some((h) => h.air) && " · air-quality forecast not available this far ahead"}
            </div>
          </div>

          {better && (
            <p className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sm">
              <b>Recommended change:</b> consider starting at <b>{hh(better.start)}</b> instead of {hh(start)} — the same{" "}
              {end - start}-hour window would peak at WBGT {better.wbgt.toFixed(1)} °C instead of {maxWbgt.toFixed(1)} °C
              {better.status < status ? ` (rating: ${EVENT[better.status]})` : ""}.
            </p>
          )}

          <Card>
            <CardHeader><CardTitle>Risk during the event</CardTitle></CardHeader>
            <CardContent>
              <CompoundChart height={280} data={slot.map((h) => ({ time: h.time, wbgt: h.wbgt, aqi: h.air?.aqi, score: h.score ?? undefined }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Required precautions</CardTitle>
              <CardDescription>Tick them off as you arrange them.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {checklist.map((item) => (
                  <li key={item}>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={checked.has(item)}
                        onChange={() => setChecked((s) => { const n = new Set(s); if (n.has(item)) n.delete(item); else n.add(item); return n; })}
                      />
                      <span className={cn(checked.has(item) && "text-muted-foreground line-through")}>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-semibold">Emergency: {emergencyLine(city.country)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Event Safety Report</CardTitle>
                <CardDescription>A detailed write-up for organisers, by Gemini, from the numbers above.</CardDescription>
              </div>
              <Button onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate Event Safety Report
              </Button>
            </CardHeader>
            {(report || reportError) && (
              <CardContent className="space-y-3 text-sm">
                {reportError && <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3">{reportError}</p>}
                {report && (
                  <>
                    <p className="leading-relaxed">{report.summary}</p>
                    {([["Risks", report.risks], ["Precautions", report.precautions], ["Schedule", report.schedule], ["Emergency plan", report.emergency_plan]] as const).map(([h, xs]) => (
                      <div key={h}>
                        <h4 className="font-semibold">{h}</h4>
                        <ul className="list-disc space-y-0.5 ps-5">{xs.map((x) => <li key={x}>{x}</li>)}</ul>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(reportText(report)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }}>
                        {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy report"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => printReport(report)}><FileDown /> Download as PDF</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">AI-generated — review before sharing.</p>
                  </>
                )}
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default function SafetyAdvisorPage() {
  const { t } = useT();
  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-3xl font-bold tracking-tight">{t("safetyAdvisor")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Should outdoor activities go ahead? Today’s advisory for schools, and a risk check with a precautions list for
          outdoor events up to a week ahead.
        </p>
      </div>
      <Tabs defaultValue="school">
        <TabsList className="no-print">
          <TabsTrigger value="school">School safety</TabsTrigger>
          <TabsTrigger value="event">Event safety</TabsTrigger>
        </TabsList>
        <TabsContent value="school"><SchoolSafety /></TabsContent>
        <TabsContent value="event"><EventSafety /></TabsContent>
      </Tabs>
    </div>
  );
}
