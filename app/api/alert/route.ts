import { NextResponse } from "next/server";
import { generateHeatAlert, MissingKeyError } from "@/lib/gemini";
import { wbgt } from "@/lib/wbgt";
import { classifyRisk } from "@/lib/risk";

// Two model attempts at up to 25 s each; Vercel's default limit is shorter.
export const maxDuration = 60;

const num =(v: unknown, min: number, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined;

// ponytail: no rate limiting — add (e.g. Upstash/Vercel KV) before sharing the URL widely, each call spends Gemini quota.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const weather = (body.weather_data ?? {}) as Record<string, unknown>;
  const city =
    typeof body.city === "string" ? body.city.replace(/[\r\n]+/g, " ").trim().slice(0, 100) : "";
  const lat = num(body.lat, -90, 90);
  const lon = num(body.lon, -180, 180);
  const temperature = num(weather.temperature, -90, 70);
  const humidity = num(weather.humidity, 0, 100);

  if (!city || lat == null || lon == null || temperature == null || humidity == null) {
    return NextResponse.json(
      { error: "Expected { city, lat, lon, weather_data: { temperature, humidity }, risk_level }" },
      { status: 400 },
    );
  }

  // WBGT and risk are recomputed here so the prompt can't disagree with the weather data.
  const w = wbgt(temperature, humidity);
  try {
    const alert = await generateHeatAlert({
      city,
      lat,
      lon,
      temperature,
      humidity,
      wind: num(weather.wind, 0, 500),
      solar: num(weather.solar, 0, 2000),
      wbgt: w,
      risk: classifyRisk(w),
    });
    return NextResponse.json(alert);
  } catch (e) {
    if (e instanceof MissingKeyError) {
      return NextResponse.json(
        { error: "AI alerts are not configured. Add GEMINI_API_KEY to .env.local and restart." },
        { status: 503 },
      );
    }
    console.error("Gemini alert failed:", e);
    return NextResponse.json(
      { error: "The AI service could not generate an alert. Please try again." },
      { status: 502 },
    );
  }
}
