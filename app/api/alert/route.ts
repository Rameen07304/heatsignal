import { NextResponse } from "next/server";
import type { AirInput, AlertInput, AlertText, HeatAlert } from "@/lib/alert-types";
import {
  composeAlert,
  generateAlert,
  generateEventReport,
  generateHealthReport,
  MissingKeyError,
  recommendActions,
  translateAlert,
  type EventDetails,
  type HealthDetails,
} from "@/lib/gemini";
import { classifyRisk, compoundBand, compoundRiskScore } from "@/lib/risk";
import { ruleAlert } from "@/lib/rule-alert";
import { wbgt } from "@/lib/wbgt";

// Two model attempts at up to 25 s each; Vercel's default limit is shorter.
export const maxDuration = 60;

type Body = Record<string, unknown>;

const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined;

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "";

const strList = (v: unknown) =>
  Array.isArray(v) ? v.slice(0, 8).map((s) => str(s, 400)).filter(Boolean) : [];

/** Validate the request and recompute every derived number, so the model only sees our figures. */
function parseInput(body: Body): AlertInput | null {
  const weather = (body.weather ?? {}) as Body;
  const aq = (body.airQuality ?? null) as Body | null;
  const city = str(body.city, 100);
  const lat = num(body.lat, -90, 90);
  const lon = num(body.lon, -180, 180);
  const temperature = num(weather.temperature, -90, 70);
  const humidity = num(weather.humidity, 0, 100);
  if (!city || lat == null || lon == null || temperature == null || humidity == null) return null;

  const solar = num(weather.solar, 0, 2000);
  const w = wbgt(temperature, humidity, solar);
  const aqi = num(aq?.aqi, 0, 5000);
  const air: AirInput | undefined =
    aqi == null
      ? undefined
      : {
          aqi,
          pm25: num(aq?.pm25, 0, 5000) ?? 0,
          pm10: num(aq?.pm10, 0, 20000),
          o3: num(aq?.o3, 0, 2000),
          no2: num(aq?.no2, 0, 2000),
          dust: num(aq?.dust, 0, 20000),
          uv: num(aq?.uv, 0, 20) ?? 0,
        };
  const score = air ? compoundRiskScore(w, air.aqi, air.uv) : null;
  return {
    city,
    lat,
    lon,
    temperature,
    humidity,
    wind: num(weather.wind, 0, 500),
    solar,
    wbgt: w,
    heatRisk: classifyRisk(w),
    air,
    score,
    level: score == null ? null : compoundBand(score).level,
  };
}

function parseAlertText(v: unknown): AlertText | null {
  const t = (v ?? {}) as Body;
  const risk_assessment = str(t.risk_assessment, 1500);
  return risk_assessment
    ? {
        risk_assessment,
        vulnerable_groups: strList(t.vulnerable_groups),
        actions: strList(t.actions),
        worker_safety: strList(t.worker_safety),
      }
    : null;
}

const aiUnavailable = (e: unknown) => {
  if (!(e instanceof MissingKeyError)) console.error("AI call failed:", e);
  return e instanceof MissingKeyError
    ? "AI alerts are not configured (set GEMINI_API_KEY or GROQ_API_KEY)."
    : "The AI service is busy or unavailable.";
};

const STAGES = ["full", "compose", "recommend", "translate", "event", "health"];

// Note: in-memory, so each serverless instance counts separately and a cold start resets it.
// Move to Upstash/Vercel KV if the URL is shared widely and quota abuse shows up in the logs.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CALLS = 30; // one pipeline run is 3 calls
const calls = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (calls.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  calls.set(ip, recent);
  if (calls.size > 5000) calls.clear(); // bound memory
  return recent.length > MAX_CALLS;
}

/** Only our own pages may call this: each call spends Gemini quota. */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many alerts requested. Please wait a few minutes." }, { status: 429 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const stage = body.stage ?? "full";
  if (typeof stage !== "string" || !STAGES.includes(stage)) {
    return NextResponse.json({ error: `stage must be one of ${STAGES.join(", ")}` }, { status: 400 });
  }

  // Translator stage works on finished text, not on measurements.
  if (stage === "translate") {
    const en = parseAlertText(body.en);
    if (!en) return NextResponse.json({ error: "Expected { stage: 'translate', en: AlertText }" }, { status: 400 });
    try {
      const t = await translateAlert(en);
      if (!t.ur && !t.ar) throw new Error("Both translations failed");
      return NextResponse.json({ ...t, source: "ai" });
    } catch (e) {
      return NextResponse.json({ error: `${aiUnavailable(e)} Translation is not available.` }, { status: 502 });
    }
  }

  const input = parseInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Expected { city, lat, lon, weather: { temperature, humidity, … }, airQuality?: { aqi, pm25, uv, … } }" },
      { status: 400 },
    );
  }

  if (stage === "health") {
    const h = (body.health ?? {}) as Body;
    const details: HealthDetails = {
      date: str(h.date, 30),
      avgUv: num(h.avgUv, 0, 20),
      uvHours: num(h.uvHours, 0, 24),
      vitD: h.vitD === true,
      nightMin: num(h.nightMin, -90, 70),
      waterL: num(h.waterL, 0, 20),
      recs: strList(h.recs),
    };
    if (!details.date || !details.recs.length) return NextResponse.json({ error: "Expected health: { date, recs }" }, { status: 400 });
    try {
      return NextResponse.json({ ...(await generateHealthReport(input, details)), source: "ai" });
    } catch (e) {
      return NextResponse.json({ error: `${aiUnavailable(e)} The recommendations on this page still apply.` }, { status: 502 });
    }
  }

  if (stage === "event") {
    const e = (body.event ?? {}) as Body;
    const details: EventDetails = {
      type: str(e.type, 60),
      attendance: str(e.attendance, 30),
      date: str(e.date, 20),
      start: str(e.start, 10),
      end: str(e.end, 10),
      rating: str(e.rating, 40),
      betterStart: str(e.betterStart, 10) || undefined,
    };
    if (!details.type || !details.date) return NextResponse.json({ error: "Expected event: { type, attendance, date, start, end, rating }" }, { status: 400 });
    try {
      return NextResponse.json({ ...(await generateEventReport(input, details)), source: "ai" });
    } catch (e) {
      return NextResponse.json({ error: `${aiUnavailable(e)} The checklist on this page still applies.` }, { status: 502 });
    }
  }

  // If the AI fails, every stage falls back to HeatSignal's rule-based guidance, so an alert always goes out.
  const rules = () => ruleAlert(input);
  try {
    if (stage === "compose") {
      return NextResponse.json({ ...(await composeAlert(input)), source: "ai" });
    }
    if (stage === "recommend") {
      const composed = parseAlertText({ ...(body.composed as Body), actions: [], worker_safety: [] });
      if (!composed) return NextResponse.json({ error: "Expected composed: { risk_assessment, vulnerable_groups }" }, { status: 400 });
      return NextResponse.json({ ...(await recommendActions(input, composed)), source: "ai" });
    }
    const alert = await generateAlert(input);
    return NextResponse.json({ ...alert, source: "ai" } satisfies HeatAlert);
  } catch (e) {
    const note = `${aiUnavailable(e)} Showing HeatSignal's built-in guidance instead.`;
    const r = rules();
    if (stage === "compose") {
      return NextResponse.json({ risk_assessment: r.risk_assessment, vulnerable_groups: r.vulnerable_groups, source: "rules", note });
    }
    if (stage === "recommend") {
      return NextResponse.json({ actions: r.actions, worker_safety: r.worker_safety, source: "rules", note });
    }
    return NextResponse.json({ en: r, ur: null, ar: null, source: "rules", note } satisfies HeatAlert & { note: string });
  }
}
