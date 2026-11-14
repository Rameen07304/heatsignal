import { wbgt } from "./wbgt";
import { classifyRisk, type RiskLevel } from "./risk";
import type { City } from "./cities";

const HOURLY = "temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation";

export interface HourlyPoint {
  /** Local time at the location, e.g. "2026-06-20T14:00". */
  time: string;
  temp: number;
  rh: number;
  wind: number;
  solar: number;
  wbgt: number;
  risk: RiskLevel;
}

export interface DailySummary {
  date: string;
  maxTemp: number;
  maxWbgt: number;
  risk: RiskLevel;
  /** Local "HH:00" of the day's highest WBGT. */
  peakHour: string;
}

export interface Forecast {
  hourly: HourlyPoint[];
  daily: DailySummary[];
  current: HourlyPoint;
}

interface OpenMeteoResponse {
  utc_offset_seconds: number;
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    wind_speed_10m: (number | null)[];
    shortwave_radiation: (number | null)[];
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo request failed (${res.status})`);
  return res.json();
}

function toPoints({ hourly: h }: OpenMeteoResponse): HourlyPoint[] {
  return h.time.flatMap((time, i) => {
    const temp = h.temperature_2m[i];
    const rh = h.relative_humidity_2m[i];
    if (temp == null || rh == null) return []; // archive lags a few days
    const w = wbgt(temp, rh);
    return [{
      time,
      temp,
      rh,
      wind: h.wind_speed_10m[i] ?? 0,
      solar: h.shortwave_radiation[i] ?? 0,
      wbgt: w,
      risk: classifyRisk(w),
    }];
  });
}

export function summarizeDaily(points: HourlyPoint[]): DailySummary[] {
  const days = new Map<string, HourlyPoint[]>();
  for (const p of points) {
    const date = p.time.slice(0, 10);
    days.set(date, [...(days.get(date) ?? []), p]);
  }
  return [...days].map(([date, pts]) => {
    const peak = pts.reduce((a, b) => (b.wbgt > a.wbgt ? b : a));
    return {
      date,
      maxTemp: Math.max(...pts.map((p) => p.temp)),
      maxWbgt: peak.wbgt,
      risk: peak.risk,
      peakHour: peak.time.slice(11, 16),
    };
  });
}

export async function fetchForecast(lat: number, lon: number): Promise<Forecast> {
  const raw = await getJson<OpenMeteoResponse>(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${HOURLY}&forecast_days=7&timezone=auto`,
  );
  const hourly = toPoints(raw);
  if (!hourly.length) throw new Error("No forecast data for this location");
  // Times are local to the location, so shift "now" by its UTC offset to match.
  const localHour = new Date(Date.now() + raw.utc_offset_seconds * 1000)
    .toISOString()
    .slice(0, 13);
  const current = hourly.find((p) => p.time.startsWith(localHour)) ?? hourly[0];
  return { hourly, daily: summarizeDaily(hourly), current };
}

export async function fetchArchive(
  lat: number,
  lon: number,
  start: string,
  end: string,
): Promise<HourlyPoint[]> {
  const raw = await getJson<OpenMeteoResponse>(
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&hourly=${HOURLY}&timezone=auto`,
  );
  return toPoints(raw);
}

export interface SeasonalAverage {
  avgMaxTemp: number;
  avgMaxWbgt: number;
  years: number;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Mean daily max temp / WBGT for the ±7 days around `date` in each of the previous 5 years. */
export async function fetchSeasonalAverage(
  lat: number,
  lon: number,
  date: string,
): Promise<SeasonalAverage> {
  const [y, m, d] = date.split("-").map(Number);
  const years = [1, 2, 3, 4, 5].map((n) => y - n);
  const perYear = await Promise.all(
    years.map((year) =>
      fetchArchive(
        lat,
        lon,
        iso(new Date(Date.UTC(year, m - 1, d - 7))),
        iso(new Date(Date.UTC(year, m - 1, d + 7))),
      ),
    ),
  );
  const days = perYear.flatMap(summarizeDaily);
  if (!days.length) throw new Error("No historical data for this location");
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    avgMaxTemp: mean(days.map((x) => x.maxTemp)),
    avgMaxWbgt: mean(days.map((x) => x.maxWbgt)),
    years: years.length,
  };
}

interface GeocodingResponse {
  results?: { name: string; country?: string; admin1?: string; latitude: number; longitude: number }[];
}

export interface CityResult extends City {
  region?: string;
}

export async function searchCities(query: string): Promise<CityResult[]> {
  const raw = await getJson<GeocodingResponse>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en`,
  );
  return (raw.results ?? []).map((r) => ({
    name: r.name,
    country: r.country ?? "",
    region: r.admin1,
    lat: Number(r.latitude.toFixed(2)),
    lon: Number(r.longitude.toFixed(2)),
  }));
}
