import { aqiBand, formatAqi } from "./air";
import type { CombinedHour } from "./conditions";
import { hydrationLitres } from "./personal-risk";
import { classifyRisk } from "./risk";

// Environmental Nutrition Advisor: fixed rules from one day of weather + air data. General wellness
// guidance only; every screen that shows it carries the medical disclaimer.

export type Level4 = "low" | "moderate" | "high" | "very_high";

export interface Sunlight {
  avgUv: number;
  peakUv: number;
  /** Daylight hours with UV ≥ 3, the usual minimum for the skin to make vitamin D. */
  uvHours: number;
  /** Total shortwave radiation for the day, MJ/m². */
  solarMJ: number;
  vitD: boolean;
  /** How likely it is that people here need vitamin D from food or supplements. */
  risk: Level4;
}

export interface AirHealth {
  aqi: number;
  pm25: number;
  respiratory: "low" | "moderate" | "high" | "severe";
  pollutant: string;
  antioxidant: "low" | "moderate" | "high";
  exerciseOk: boolean;
}

export interface HeatHealth {
  wbgt: number;
  dehydration: "low" | "moderate" | "high" | "severe";
  electrolytes: "normal" | "elevated" | "high" | "critical";
  waterL: number;
  sweat: "normal" | "elevated" | "heavy";
}

export interface Skin {
  risk: "low" | "moderate" | "high" | "very_high" | "extreme";
  spf: number;
  /** Minutes until fair skin (Fitzpatrick II) burns unprotected; ~167/UV from a 250 J/m² MED. */
  burnMin: number | null;
}

export interface DayProfile {
  date: string;
  /** null when there is no air-quality (UV) forecast for the day. */
  sun: Sunlight | null;
  air: AirHealth | null;
  heat: HeatHealth;
  skin: Skin | null;
  /** Lowest temperature 22:00–06:00 that night; hot nights spoil sleep. */
  nightMin: number | null;
}

const hourOf = (h: CombinedHour) => Number(h.time.slice(11, 13));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function analyzeSunlight(day: CombinedHour[], lat: number): Sunlight | null {
  // Local hours from the API's own time string, not the browser's clock.
  const uv = day.filter((h) => h.air && hourOf(h) >= 8 && hourOf(h) <= 17).map((h) => h.air!.uv);
  if (!uv.length) return null;
  const avgUv = mean(uv);
  const uvHours = uv.filter((x) => x >= 3).length;
  const peakUv = Math.max(...uv);
  // From usable hours, not the 08–17 average: mornings and evenings drag the mean down even on sunny days.
  const risk: Level4 = uvHours === 0 ? "very_high" : uvHours < 3 ? "high" : peakUv < 5 || Math.abs(lat) > 50 ? "moderate" : "low";
  return {
    avgUv,
    peakUv,
    uvHours,
    solarMJ: (day.reduce((s, h) => s + h.solar, 0) * 3600) / 1e6,
    vitD: uvHours >= 1,
    risk,
  };
}

export function analyzeAir(day: CombinedHour[]): AirHealth | null {
  const withAir = day.filter((h) => h.air);
  if (!withAir.length) return null;
  const worst = withAir.reduce((a, b) => (b.air!.aqi > a.air!.aqi ? b : a)).air!;
  const { aqi, pm25, o3, no2, dust } = worst;
  return {
    aqi,
    pm25,
    respiratory: aqi > 200 ? "severe" : aqi > 150 ? "high" : aqi > 100 ? "moderate" : "low",
    // Thresholds: US 24-h PM2.5 standard, WHO 8-h ozone and 24-h NO2 guidelines, dust-storm level.
    pollutant: dust > 100 ? "Desert dust" : pm25 > 35 ? "PM2.5" : o3 > 100 ? "Ozone" : no2 > 25 ? "NO₂" : "PM2.5",
    antioxidant: aqi > 150 ? "high" : aqi > 75 ? "moderate" : "low",
    exerciseOk: aqi <= 100,
  };
}

export function analyzeHeat(day: CombinedHour[]): HeatHealth {
  const wbgt = Math.max(...day.map((h) => h.wbgt));
  const level = classifyRisk(wbgt);
  return {
    wbgt,
    dehydration: ({ Low: "low", Moderate: "moderate", High: "high", Extreme: "severe" } as const)[level],
    electrolytes: ({ Low: "normal", Moderate: "elevated", High: "high", Extreme: "critical" } as const)[level],
    // Same formula as the personal risk check, for someone mostly indoors.
    waterL: hydrationLitres(wbgt, 0.5, "indoor"),
    sweat: wbgt >= 32 ? "heavy" : wbgt >= 28 ? "elevated" : "normal",
  };
}

export function analyzeSkin(peakUv: number): Skin {
  return {
    risk: peakUv >= 11 ? "extreme" : peakUv >= 8 ? "very_high" : peakUv >= 6 ? "high" : peakUv >= 3 ? "moderate" : "low",
    spf: peakUv >= 8 ? 50 : peakUv >= 6 ? 30 : peakUv >= 3 ? 15 : 0,
    burnMin: peakUv >= 3 ? Math.round(167 / peakUv) : null,
  };
}

/** `hours` is the whole forecast, so tonight's low can reach into tomorrow morning. */
export function dayProfile(hours: CombinedHour[], date: string, lat: number): DayProfile {
  const day = hours.filter((h) => h.time.startsWith(date));
  const i = hours.findIndex((h) => h.time === `${date}T22:00`);
  const night = i < 0 ? [] : hours.slice(i, i + 9);
  const sun = analyzeSunlight(day, lat);
  return {
    date,
    sun,
    air: analyzeAir(day),
    heat: analyzeHeat(day),
    skin: sun && analyzeSkin(sun.peakUv),
    nightMin: night.length ? Math.min(...night.map((h) => h.temp)) : null,
  };
}

/** 0–100 sub-scores for the gauges; 100 is always the healthy end. */
export function healthScores(p: DayProfile) {
  const clamp = (x: number) => Math.round(Math.min(Math.max(x, 0), 1) * 100);
  return {
    sunlight: p.sun && clamp(p.sun.uvHours / 4),
    air: p.air && clamp(1 - p.air.aqi / 300),
    heat: clamp(1 - (p.heat.wbgt - 22) / 13),
    skin: p.sun && clamp(1 - p.sun.peakUv / 11),
  };
}

export type Priority = "essential" | "recommended" | "optional";
export type Category = "supplement" | "hydration" | "protection" | "lifestyle";
export type IconName = "sun" | "shield" | "wind" | "droplets" | "glass" | "umbrella" | "fish" | "zap" | "utensils" | "moon";

export interface Recommendation {
  id: string;
  icon: IconName;
  name: string;
  /** Tied to today's numbers; **double asterisks** mark the figures to emphasise. */
  why: string;
  suggestion: string;
  priority: Priority;
  category: Category;
}

const RANK: Record<Priority, number> = { essential: 0, recommended: 1, optional: 2 };
const n1 = (x: number) => `**${x.toFixed(1)}**`;

/** Most important first. */
export function recommendations(p: DayProfile, city: string): Recommendation[] {
  const { sun, air, heat, skin } = p;
  const recs: Recommendation[] = [];

  if (sun?.risk === "very_high" || sun?.risk === "high") {
    const veryHigh = sun.risk === "very_high";
    recs.push({
      id: "vit-d",
      icon: "sun",
      name: "Vitamin D3",
      why: veryHigh
        ? `UV in ${city} peaks at only ${n1(sun.peakUv)} today, below the UV 3 the skin needs to make useful vitamin D.`
        : `UV in ${city} reaches 3 or more for only **${sun.uvHours} h** today (peak ${n1(sun.peakUv)}). Vitamin D production is limited, especially for darker skin and people who cover up.`,
      suggestion: veryHigh
        ? "600–1,000 IU a day is the usual adult intake (NIH: 600 IU, 800 IU over 70; stay under 4,000 IU). Take it with a meal containing fat. A blood test (25-OH vitamin D) shows whether you need more."
        : "Get 15–20 minutes of midday sun on face and arms when you can, or 600 IU a day from food (oily fish, eggs, fortified milk) or a supplement.",
      priority: veryHigh ? "essential" : "recommended",
      category: "supplement",
    });
  } else if (sun?.risk === "moderate") {
    recs.push({
      id: "vit-d",
      icon: "sun",
      name: "Vitamin D: midday sun",
      why: `UV in ${city} reaches 3 or more for **${sun.uvHours} h** today (peak ${n1(sun.peakUv)}). That is enough with some midday sun, but people who stay indoors or cover up may fall short.`,
      suggestion: "15–30 minutes of midday sun on face and arms, or 600 IU a day if you are mostly indoors.",
      priority: "optional",
      category: "supplement",
    });
  }

  if (air && (air.respiratory === "high" || air.respiratory === "severe")) {
    recs.push({
      id: "respiratory",
      icon: "wind",
      name: "Protect your lungs",
      why: `Air in ${city} reaches US AQI **${formatAqi(air.aqi)}** (${aqiBand(air.aqi).label.toLowerCase()}), mainly ${air.pollutant}. Breathing it for hours inflames the airways and worsens asthma and COPD.`,
      suggestion: "Wear a well-fitted N95 mask outdoors. Keep windows closed; run a HEPA air purifier if you have one. Move exercise indoors.",
      priority: "essential",
      category: "protection",
    });
  }

  if (air && air.antioxidant !== "low") {
    const high = air.antioxidant === "high";
    recs.push({
      id: "antioxidants",
      icon: "shield",
      name: "Fruit and vegetables",
      why: `Polluted air (AQI **${formatAqi(air.aqi)}**, PM2.5 **${Math.round(air.pm25)} µg/m³**) adds oxidative stress. A diet rich in vitamin C and E helps the body cope; supplements have not been shown to protect against pollution.`,
      suggestion: "Eat colourful fruit and vegetables every day: citrus, guava, peppers, tomatoes, leafy greens, plus nuts and seeds for vitamin E.",
      priority: high ? "recommended" : "optional",
      category: "supplement",
    });
  }

  if (heat.electrolytes === "critical" || heat.electrolytes === "high") {
    recs.push({
      id: "electrolytes",
      icon: "droplets",
      name: "Replace salts, not just water",
      why: `Peak WBGT in ${city} is ${n1(heat.wbgt)} °C (${classifyRisk(heat.wbgt).toLowerCase()} heat stress). Heavy sweating loses sodium and potassium that plain water does not replace.`,
      suggestion: "Drink oral rehydration salts (ORS) or an electrolyte drink if you sweat for more than an hour. Eat bananas, yoghurt and some salty food. Limit alcohol and strong caffeine.",
      priority: "essential",
      category: "hydration",
    });
  } else if (heat.electrolytes === "elevated") {
    recs.push({
      id: "electrolytes",
      icon: "droplets",
      name: "Water with a pinch of salt",
      why: `Moderate heat stress in ${city} (peak WBGT ${n1(heat.wbgt)} °C) means more fluid and salt lost in sweat.`,
      suggestion: "Add a pinch of salt and lemon to water, or drink coconut water or lassi, when you are active outdoors.",
      priority: "recommended",
      category: "hydration",
    });
  }

  recs.push({
    id: "water",
    icon: "glass",
    name: "Daily water target",
    why: `At a peak WBGT of ${n1(heat.wbgt)} °C, an adult who is mostly indoors needs about **${heat.waterL} L** a day.`,
    suggestion: `Drink at least ${heat.waterL} L, plus about 0.5 L for every hour outdoors. Drink before you feel thirsty; pale urine means you are drinking enough.`,
    priority: heat.dehydration === "low" ? "optional" : "recommended",
    category: "hydration",
  });

  if (sun && skin && skin.risk !== "low") {
    const strong = skin.risk !== "moderate";
    recs.push({
      id: "sunscreen",
      icon: "umbrella",
      name: strong ? `SPF ${skin.spf}+ sunscreen` : "Sun protection",
      why: `UV in ${city} peaks at ${n1(sun.peakUv)}. Fair skin can burn in about **${skin.burnMin} minutes** unprotected; darker skin takes longer but still ages and can still burn.`,
      suggestion: strong
        ? `Apply SPF ${skin.spf}+ 20 minutes before going out and every 2 hours. Wear a hat, UV400 sunglasses and long sleeves, and keep to shade from 10:00 to 16:00.`
        : "Use SPF 15–30 if you are outside for more than 30 minutes, and wear sunglasses.",
      priority: strong ? "essential" : "recommended",
      category: "protection",
    });
  }

  if (air && heat.dehydration !== "low" && air.respiratory !== "low") {
    recs.push({
      id: "omega3",
      icon: "fish",
      name: "Omega-3 fats",
      why: `${city} has heat stress and polluted air on the same day, and the two together add to inflammation. Some studies suggest omega-3 fats soften the effect of air pollution; the evidence is still limited.`,
      suggestion: "Eat oily fish (sardines, mackerel, salmon) twice a week, or walnuts, flaxseed and chia seeds. Ask a doctor before taking fish-oil capsules, especially if you take blood thinners.",
      priority: "optional",
      category: "supplement",
    });
  }

  if (heat.sweat === "heavy") {
    recs.push({
      id: "magnesium",
      icon: "zap",
      name: "Magnesium and potassium foods",
      why: `Long hours of heavy sweating at WBGT ${n1(heat.wbgt)} °C lose minerals; low levels go with cramps and tiredness.`,
      suggestion: "Eat spinach, lentils (dal), nuts, dates, bananas and yoghurt. Painful cramps in the heat are a warning sign: stop, cool down and rehydrate with ORS.",
      priority: "optional",
      category: "supplement",
    });
  }

  if (heat.dehydration === "high" || heat.dehydration === "severe") {
    recs.push({
      id: "food-safety",
      icon: "utensils",
      name: "Food safety in the heat",
      why: `Bacteria multiply fastest between 5 and 60 °C, and food left out in ${city}'s heat today spoils within an hour or two.`,
      suggestion: "Refrigerate leftovers within an hour. Be careful with cut fruit, dairy and street food left in the sun. Wash hands and fruit with clean water.",
      priority: "optional",
      category: "lifestyle",
    });
  }

  if (p.nightMin != null && p.nightMin >= 20) {
    recs.push({
      id: "sleep",
      icon: "moon",
      name: "Sleep on a hot night",
      why: `Tonight in ${city} stays above **${Math.round(p.nightMin)} °C**. Warm nights cut deep sleep and stop the body recovering from the day's heat.`,
      suggestion: "Aim for a bedroom around 24–26 °C with AC if you have it. Otherwise: cotton sheets, a cool shower before bed, a fan with a damp cloth, and no heavy meals late.",
      priority: p.nightMin >= 25 ? "recommended" : "optional",
      category: "lifestyle",
    });
  }

  return recs.sort((a, b) => RANK[a.priority] - RANK[b.priority]);
}

/** The vitamin D map colours, low → very high need. */
export const VITD_COLORS: Record<Level4, string> = { low: "#16a34a", moderate: "#eab308", high: "#f97316", very_high: "#dc2626" };
export const LEVEL_LABEL: Record<string, string> = {
  low: "Low", moderate: "Moderate", high: "High", very_high: "Very high", severe: "Severe", extreme: "Extreme",
  normal: "Normal", elevated: "Elevated", critical: "Critical", heavy: "Heavy",
};
