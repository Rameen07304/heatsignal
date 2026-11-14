# HeatSignal

Real-time heat-illness early warning. HeatSignal turns free global weather forecasts into a Wet Bulb Globe Temperature (WBGT) risk level for any city and uses Google Gemini to write plain-language alerts in English, Urdu and Arabic.

Team HeatSignal — Kinnaird College for Women, Lahore.

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000. Everything except "Generate Alert" works without a key.

`npm test` runs the WBGT / risk-threshold self-check.

## Deploy to Vercel

Import the repo in Vercel and add `GEMINI_API_KEY` under Project → Settings → Environment Variables. No database is needed. Never commit a real key — `.env.local` is git-ignored.

## How it works

- **WBGT** (`lib/wbgt.ts`): Australian BoM simplified shade formula, `0.567·T + 0.393·e + 3.94`.
- **Risk** (`lib/risk.ts`): Low < 27, Moderate 27–30, High 30–33, Extreme ≥ 33 °C.
- **Weather** (`lib/weather.ts`): Open-Meteo forecast, archive and geocoding APIs, called from the browser.
- **Alerts** (`app/api/alert/route.ts`): server route that validates input, recomputes WBGT and asks Gemini for a structured, trilingual alert.

## Credits

Weather data by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). Map tiles © OpenStreetMap contributors. Thresholds informed by WHO and NIOSH heat stress guidance. HeatSignal is a decision-support tool, not medical advice.
