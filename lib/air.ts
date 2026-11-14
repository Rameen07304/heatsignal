import type { City } from "./cities";
import { getJson, getJsonCached } from "./weather";

/** US EPA Air Quality Index categories, with the EPA's standard colours and activity guidance. */
export const AQI_BANDS = [
  { max: 50, label: "Good", color: "#22c55e", advice: "Air quality is fine for outdoor activity." },
  { max: 100, label: "Moderate", color: "#eab308", advice: "Fine for most people. Unusually sensitive people should watch for symptoms." },
  { max: 150, label: "Unhealthy for sensitive groups", color: "#f97316", advice: "Children, older adults and people with asthma or heart disease should cut back on hard outdoor activity." },
  { max: 200, label: "Unhealthy", color: "#ef4444", advice: "Everyone should cut back on hard or long outdoor activity. Wear a well-fitted N95 mask outside." },
  { max: 300, label: "Very unhealthy", color: "#a855f7", advice: "Avoid hard outdoor activity. Sensitive groups should stay indoors. Wear an N95 mask outside." },
  { max: Infinity, label: "Hazardous", color: "#9f1239", advice: "Stay indoors with windows closed. Avoid all outdoor exertion." },
] as const;

export type AqiBand = (typeof AQI_BANDS)[number];

export const aqiBand = (aqi: number): AqiBand => AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[5];

/** "Unhealthy" or worse: the level at which the EPA advises everyone to reduce exertion. */
export const UNHEALTHY_AQI = 151;

export interface AirNow {
  aqi: number;
  /** PM2.5 in µg/m³ */
  pm25: number;
}

export interface AirForecast {
  now: AirNow | null;
  /** US AQI keyed by local hour, "YYYY-MM-DDTHH:00" — same keys as the weather forecast. */
  hourly: Map<string, number>;
}

const BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";

interface AirResponse {
  utc_offset_seconds: number;
  current?: { us_aqi_pm2_5: number | null; pm2_5: number | null };
  hourly?: { time: string[]; us_aqi_pm2_5: (number | null)[]; pm2_5: (number | null)[] };
}

const toNow = (c: AirResponse["current"]): AirNow | null =>
  c?.us_aqi_pm2_5 != null && c.pm2_5 != null ? { aqi: c.us_aqi_pm2_5, pm25: c.pm2_5 } : null;

/** Current air quality for many cities in one request; `null` where the model has no data. */
export async function fetchAirNow(cities: Pick<City, "lat" | "lon">[]): Promise<(AirNow | null)[]> {
  const json = await getJsonCached<AirResponse | AirResponse[]>(
    `${BASE}?latitude=${cities.map((c) => c.lat).join(",")}&longitude=${cities.map((c) => c.lon).join(",")}&current=us_aqi_pm2_5,pm2_5&timezone=auto`,
    "heatsignal-air-v2",
  );
  const raw = Array.isArray(json) ? json : [json];
  if (raw.length !== cities.length) throw new Error("Open-Meteo returned an unexpected number of locations");
  return raw.map((r) => toNow(r.current));
}

export async function fetchAir(lat: number, lon: number): Promise<AirForecast> {
  const raw = await getJson<AirResponse>(
    `${BASE}?latitude=${lat}&longitude=${lon}&current=us_aqi_pm2_5,pm2_5&hourly=us_aqi_pm2_5,pm2_5&forecast_days=3&timezone=auto`,
  );
  const hourly = new Map<string, number>();
  raw.hourly?.time.forEach((time, i) => {
    const aqi = raw.hourly!.us_aqi_pm2_5[i];
    if (aqi != null) hourly.set(time, aqi);
  });
  return { now: toNow(raw.current), hourly };
}
