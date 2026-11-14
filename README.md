# HeatSignal

**Is it safe to be outside?** HeatSignal turns free global weather and air-quality forecasts into an hour-by-hour outdoor safety plan for any city — heat stress in summer, smog in winter — and uses Google Gemini to write plain-language alerts in English, Urdu and Arabic.

- **Global monitor:** about 100 of the world's most heat-exposed cities on one map, ranked live, with a count of how many people are under dangerous heat or unhealthy air right now.
- **Safe outdoor hours:** for light, moderate or heavy activity, each hour is marked safe, needing rest breaks, or unsafe, combining heat (WBGT) and smog (PM2.5).
- **AI alerts:** specific to the city's actual numbers, in three languages.
- **Case studies:** the 2015 Karachi and 2024 Sindh heatwaves replayed from archive data.

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

- **WBGT** (`lib/wbgt.ts`): Australian BoM simplified formula, `0.567·T + 0.393·e + 3.94`, corrected for night using measured solar radiation (blends to the ISO 7243 shade formula when there is no sun).
- **Work/rest** (`lib/work-rest.ts`): ACGIH limits from the OSHA Technical Manual, per activity level.
- **Air** (`lib/air.ts`): Open-Meteo Air Quality API (CAMS model), US AQI for PM2.5.
- **Risk** (`lib/risk.ts`): Low < 27, Moderate 27–30, High 30–33, Extreme ≥ 33 °C.
- **Weather** (`lib/weather.ts`): Open-Meteo forecast, archive and geocoding APIs, called from the browser.
- **Alerts** (`app/api/alert/route.ts`): server route that validates input, recomputes WBGT and asks Gemini for a structured, trilingual alert.

## Credits

Weather data by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). Map tiles © OpenStreetMap contributors. Thresholds informed by WHO and NIOSH heat stress guidance. HeatSignal is a decision-support tool, not medical advice.
