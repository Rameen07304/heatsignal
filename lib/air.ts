import type { City } from "./cities";
import { fetchMany, getJson, localHourNow } from "./weather";

/** US EPA Air Quality Index categories, with the EPA's standard colours and activity guidance. */
export const AQI_BANDS = [
  { max: 50, label: "Good", color: "#22c55e", advice: "Air quality is fine for outdoor activity." },
  { max: 100, label: "Moderate", color: "#eab308", advice: "Fine for most people. Unusually sensitive people should watch for symptoms." },
  { max: 150, label: "Unhealthy for sensitive groups", color: "#f97316", advice: "Children, older adults and people with asthma or heart disease should cut back on hard outdoor activity." },
  { max: 200, label: "Unhealthy", color: "#ef4444", advice: "Everyone should cut back on hard or long outdoor activity. Wear a well-fitted N95 mask outside." },
  { max: 300, label: "Very unhealthy", color: "#a855f7", advice: "Avoid hard outdoor activity. Sensitive groups should stay indoors. Wear an N95 mask outside." },
  { max: Infinity, label: "Hazardous", color: "#991b1b", advice: "Stay indoors with windows closed. Avoid all outdoor exertion." },
] as const;

export type AqiBand = (typeof AQI_BANDS)[number];

export const aqiBand = (aqi: number): AqiBand => AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[5];

/** The US AQI scale ends at 500; the model can extrapolate far past it in dust storms. */
export const formatAqi = (aqi: number) => (aqi > 500 ? "500+" : String(Math.round(aqi)));

/** "Unhealthy" or worse: the level at which the EPA advises everyone to reduce exertion. */
export const UNHEALTHY_AQI = 151;

/** WHO 2021 air quality guideline for PM2.5, 24-hour mean (µg/m³). */
export const WHO_PM25_DAILY = 15;

export interface AirPoint {
  /** Local time, "YYYY-MM-DDTHH:00" — same keys as the weather forecast. */
  time: string;
  /** US AQI, worst of all pollutants (includes desert dust via PM10). */
  aqi: number;
  /** Concentrations in µg/m³. */
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  dust: number;
  uv: number;
}

export interface AirForecast {
  hourly: AirPoint[];
  byTime: Map<string, AirPoint>;
  current: AirPoint | null;
}

const BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";
const VARS =
  "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,dust,uv_index";

interface AirResponse {
  utc_offset_seconds: number;
  hourly?: {
    time: string[];
    us_aqi: (number | null)[];
    pm2_5: (number | null)[];
    pm10: (number | null)[];
    ozone: (number | null)[];
    nitrogen_dioxide: (number | null)[];
    sulphur_dioxide: (number | null)[];
    carbon_monoxide: (number | null)[];
    dust: (number | null)[];
    uv_index: (number | null)[];
  };
}

function toAir(raw: AirResponse): AirForecast {
  const h = raw.hourly;
  const hourly: AirPoint[] = [];
  h?.time.forEach((time, i) => {
    const aqi = h.us_aqi[i];
    if (aqi == null) return; // the model's forecast ends a few days out
    hourly.push({
      time,
      aqi,
      pm25: h.pm2_5[i] ?? 0,
      pm10: h.pm10[i] ?? 0,
      o3: h.ozone[i] ?? 0,
      no2: h.nitrogen_dioxide[i] ?? 0,
      so2: h.sulphur_dioxide[i] ?? 0,
      co: h.carbon_monoxide[i] ?? 0,
      dust: h.dust[i] ?? 0,
      uv: h.uv_index[i] ?? 0,
    });
  });
  const byTime = new Map(hourly.map((p) => [p.time, p]));
  const now = localHourNow(raw.utc_offset_seconds);
  return { hourly, byTime, current: hourly.find((p) => p.time.startsWith(now)) ?? null };
}

/** Three days for many cities: enough for "now" and the 48-hour early warning. */
export async function fetchAirMany(cities: Pick<City, "lat" | "lon">[]): Promise<AirForecast[]> {
  const raw = await fetchMany<AirResponse>(
    (lats, lons) => `${BASE}?latitude=${lats}&longitude=${lons}&hourly=${VARS}&forecast_days=3&timezone=auto`,
    cities,
    "heatsignal-air-v4",
  );
  return raw.map(toAir);
}

export async function fetchAir(lat: number, lon: number): Promise<AirForecast> {
  return toAir(
    await getJson<AirResponse>(`${BASE}?latitude=${lat}&longitude=${lon}&hourly=${VARS}&forecast_days=7&timezone=auto`),
  );
}

/** Past air quality (the model archive starts in mid-2022). */
export async function fetchAirArchive(lat: number, lon: number, start: string, end: string): Promise<AirForecast> {
  return toAir(
    await getJson<AirResponse>(
      `${BASE}?latitude=${lat}&longitude=${lon}&hourly=${VARS}&start_date=${start}&end_date=${end}&timezone=auto`,
    ),
  );
}

/** Dust storm conditions for outdoor workers: desert dust ≥ 100 µg/m³ or PM10 ≥ 150 µg/m³. */
export const isDusty = (a?: { dust: number; pm10: number } | null) => !!a && (a.dust >= 100 || a.pm10 >= 150);
