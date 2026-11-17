import type { CompoundLevel, RiskLevel } from "./risk";

export interface AlertText {
  risk_assessment: string;
  vulnerable_groups: string[];
  actions: string[];
  worker_safety: string[];
}

export interface HeatAlert {
  en: AlertText;
  /** null when translation was not available (e.g. the AI service was down). */
  ur: AlertText | null;
  ar: AlertText | null;
  /** "ai" = written by Gemini; "rules" = HeatSignal's built-in guidance, used when the AI fails. */
  source: "ai" | "rules";
}

export interface AirInput {
  aqi: number;
  pm25: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  dust?: number;
  uv: number;
}

/** Everything an alert is written from. Numbers are computed by HeatSignal, never by the model. */
export interface AlertInput {
  city: string;
  lat: number;
  lon: number;
  temperature: number;
  humidity: number;
  wind?: number;
  solar?: number;
  wbgt: number;
  heatRisk: RiskLevel;
  air?: AirInput;
  score: number | null;
  level: CompoundLevel | null;
}
