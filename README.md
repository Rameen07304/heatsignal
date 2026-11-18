# HeatSignal — Environmental Health Intelligence

**Is it safe to be outside?** HeatSignal monitors compound climate-health risk — heat stress, air quality and UV together — for 100+ cities worldwide, turns it into hour-by-hour safe-work plans, and sends AI-written alerts in English, Urdu and Arabic.

Built by Team HeatSignal, Kinnaird College for Women, Lahore, for the Future Health Digital Innovation Challenge 2026 (Abu Dhabi Department of Health).

## What it does

- **Dashboard** — 101 heat-exposed cities (plus any you add) on one map, with heat, air and compound-risk gauges, a 24-hour outlook, and counts of people under dangerous heat or unhealthy air.
- **Compound risk score** — WBGT, US AQI and UV combined into one 0–100 index, with a penalty when heat and bad air strike together.
- **City detail** — current conditions, a 7-day compound timeline, who is at risk, safe outdoor hours, daily forecast, and a downloadable AI alert.
- **Worker safety** — ACGIH work–rest cycles by work type, a shift planner with break schedule, water target and PPE, and a printable site notice.
- **Agentic alerts** — a visible pipeline: Risk Analyzer (rules) → Alert Composer → Action Recommender → Translator (Gemini) → delivery, with alert history.
- **Case studies** — Karachi 2015, Sindh 2024 and Delhi 2023 replayed from archive data: when HeatSignal would have warned, and what it would have advised.
- **48-hour early warning** — a banner on every page when a city is forecast to cross into High or Critical risk it hasn't reached today, plus an "Upcoming risks" section and a global risk leaderboard.
- **Personal risk assessment** — age, activity, health conditions and access to cooling turn today's conditions into a personal score, advice and a daily water target.
- **Safety advisor** — school outdoor-activity status for the school day, and event risk checks with precautions, a better start time and an AI event safety report.
- **Trends** — the hottest season of the last five years for any city: extreme heat days, average peak WBGT and a simple projection.
- **First aid** — a step-by-step heat-illness decision guide with emergency numbers by country.
- **Compare and reports** — two cities side by side; printable city and global reports.
- **Notifications and languages** — opt-in browser alerts when a city turns Critical; interface in English, Urdu, Arabic (right-to-left), with Japanese, Hindi and Spanish navigation.
- **Always an alert** — if Gemini is unavailable, a rule-based alert is sent instead.

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000. Everything except AI-written alerts works without a key (rule-based alerts still work).

- `npm test` — self-check of the WBGT, compound-score and work–rest logic.
- `node scripts/case-normals.ts` — regenerates `lib/case-normals.json` (5-year normals for the case studies).

## Deploy to Vercel

Import the repo in Vercel and add `GEMINI_API_KEY` under Project → Settings → Environment Variables. No database is needed. Never commit a real key — `.env.local` is git-ignored.

## How it works

- **WBGT** (`lib/wbgt.ts`): Australian BoM formula `0.567·T + 0.393·e + 3.94` in sunshine, blended to the ISO 7243 shade formula as solar radiation falls (the BoM formula alone overstates night-time heat stress).
- **Risk and compound score** (`lib/risk.ts`): WBGT bands, US EPA AQI bands, WHO UV bands, and the compound score. The compound score is HeatSignal's own index, not a clinical standard.
- **Data** (`lib/weather.ts`, `lib/air.ts`): Open-Meteo forecast, air-quality, archive and geocoding APIs, called from the browser in 50-city batches and cached for 15 minutes.
- **Work–rest** (`lib/work-rest.ts`): ACGIH limits from the OSHA Technical Manual.
- **Alerts** (`app/api/alert/route.ts`, `lib/gemini.ts`, `lib/rule-alert.ts`): the server validates input, recomputes every number, and asks Gemini only to write and translate.

## Credits

Weather and air-quality data by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0; air quality from Copernicus CAMS). Map tiles © Esri (World Light/Dark Gray Canvas; sources Esri, HERE, Garmin, OpenStreetMap contributors). Thresholds from WHO, NIOSH, ACGIH/OSHA and US EPA. HeatSignal is a decision-support tool, not medical advice.
