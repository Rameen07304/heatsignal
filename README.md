# HeatSignal

Real-time environmental health intelligence for 100+ cities worldwide. HeatSignal combines heat stress, air pollution and UV into one risk score and turns it into plain advice. Weather apps tell you the temperature. HeatSignal tells you what it means for your body and what to do about it.

**Live:** [heatsignal-rho.vercel.app](https://heatsignal-rho.vercel.app)

## The problem

Extreme heat kills more people than any other type of weather. The danger isn't temperature alone: it's heat, humidity, air pollution and UV together. 38 °C in humid Karachi is far more dangerous than 38 °C in dry Riyadh, and in South Asia the smog season follows straight after summer. Most warning systems look at one number. The people most exposed (construction workers, farm labourers, delivery riders, older people without cooling) are the least likely to get a warning they can act on.

## What it does

- **Compound risk score.** WBGT heat stress (45%), US AQI (40%) and UV (15%) in one 0–100 score. When heat and bad air hit together, a penalty raises the score by up to 1.5×.
- **Dashboard.** 101 cities on one map, a global ranking, and a "Check your city" search for any town in the world.
- **City detail.** Current conditions, a 7-day timeline, who is at risk, safe outdoor hours, and a downloadable alert.
- **Health Advisor.** Food, supplement, water and protection advice from the day's actual conditions: vitamin D when UV is too low, electrolytes in heat stress, lung protection and antioxidant-rich food in smog. Includes a global vitamin D map.
- **Worker Safety.** Work–rest cycles (ACGIH limits from the OSHA Technical Manual) for light, moderate and heavy work, a shift planner, water targets and a printable site notice.
- **Personal Risk Assessment.** Age, health conditions, activity and access to cooling give a personal score and daily water target.
- **Safety Advisor.** Go / adjust / postpone checks for school activities and outdoor events up to a week ahead, with a printable report.
- **48-hour early warning.** A banner on every page when a city is forecast to reach High or Critical risk, plus opt-in browser notifications.
- **AI alerts.** A visible pipeline: a rule-based Risk Analyzer computes the numbers, then Gemini agents write the alert, recommend actions and translate. If Gemini is down, built-in rules write the alert, so a warning always goes out.
- **Case studies.** Karachi 2015, Sindh 2024 and Delhi 2023 replayed from archived data.
- **Trends, Compare, First Aid.** Five-year summer trends, two cities side by side, and a heat-illness decision guide with emergency numbers by country.
- **Languages.** English, Urdu and Arabic (right-to-left), with Japanese, Hindi and Spanish navigation.

## How it works

### WBGT (Wet Bulb Globe Temperature)

In sunshine, the Australian Bureau of Meteorology simplified formula:

```
WBGT = 0.567 × T + 0.393 × e + 3.94
e    = (RH / 100) × 6.105 × exp(17.27 × T / (237.7 + T))
```

That formula assumes full sun, so at night it overstates heat stress. HeatSignal blends towards the ISO 7243 shade formula (`0.7 × Tw + 0.3 × T`, wet-bulb temperature from Stull 2011) as measured solar radiation falls to zero.

### Compound risk score

```
base    = 0.45 × min(WBGT / 40, 1) + 0.40 × min(AQI / 300, 1) + 0.15 × min(UV / 11, 1)
penalty = 1 + 0.5 × heat × air      when heat > 0.5 and air > 0.4   (up to 1.5×)
score   = min(100, round(100 × base × penalty))
```

Studies of heat and air pollution find the two together raise mortality more than either alone: heat makes people breathe faster and deeper, taking in more polluted air. The weights and penalty are our design choices; the input thresholds (WBGT bands, US EPA AQI categories, WHO UV index) are the standard ones.

### Data sources

All data comes from [Open-Meteo](https://open-meteo.com/) (CC BY 4.0, no API key needed):

- Forecast API: temperature, humidity, wind, solar radiation
- Air Quality API (Copernicus CAMS): PM2.5, PM10, ozone, NO₂, SO₂, CO, dust, US AQI, UV index
- Archive API (ERA5): history for trends and case studies
- Geocoding API: city search

The 101 cities are fetched in batches of 50 and cached for 15 minutes, to stay inside the free quota.

## Tech stack

- **Framework:** Next.js 15 (App Router), React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS with shadcn/ui-style components (Radix primitives)
- **Maps:** Leaflet (react-leaflet), Esri grey basemap
- **Charts:** Recharts
- **State:** React context (`lib/use-cities.tsx`) shares city data across pages
- **AI:** Google Gemini (`gemini-flash-lite-latest`, falling back to `gemini-flash-latest`)
- **Deployment:** Vercel

## Project structure

```
app/
├── page.tsx                      Dashboard: map, rankings, city cards
├── city/[lat]/[lon]/             One city in detail
├── compare/[lat1]/[lon1]/...     Two cities side by side
├── health-advisor/               Nutrition, hydration and protection advice
├── worker-safety/                Work–rest cycles and site notice
├── risk-assessment/              Personal risk calculator
├── safety-advisor/               School and event decisions
├── trends/                       Five-year summer trends
├── first-aid/                    Heat-illness guide and emergency numbers
├── alerts/                       AI alert pipeline and history
├── case-studies/                 Past events replayed
├── about/                        Project, science and credits
└── api/alert/route.ts            Server route that calls Gemini
components/                       UI: map, gauges, charts, planners, alerts
lib/
├── cities.ts                     The 101 default cities
├── weather.ts, air.ts            Open-Meteo requests and caching
├── wbgt.ts                       WBGT and wet-bulb formulas
├── risk.ts                       Risk bands and compound score
├── work-rest.ts                  ACGIH work–rest limits
├── health-advisor.ts             Health Advisor analyzers and rules
├── personal-risk.ts              Personal risk model
├── rule-alert.ts                 Rule-based alert (AI fallback)
├── gemini.ts                     Gemini prompts
├── i18n.tsx                      Translations
└── wbgt.test.ts                  Self-checks (npm test)
scripts/
├── case-normals.ts               Regenerates lib/case-normals.json
└── capture.mjs                   Page screenshots for review
```

## Getting started

```bash
git clone https://github.com/Rameen07304/heatsignal.git
cd heatsignal
npm install

# Only needed for AI features
cp .env.example .env.local
# then add your GEMINI_API_KEY to .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app works without a Gemini key. Alerts then come from the built-in rules, and the AI health and event reports are hidden.

- `npm test` runs the self-checks for the WBGT, compound score, work–rest, personal risk and Health Advisor logic.
- To deploy, import the repo into Vercel and add `GEMINI_API_KEY` under Project → Settings → Environment Variables.

## Team

Built for the **Future Health Digital Innovation Challenge 2026** (Abu Dhabi Department of Health × Hack2Skill) by Team HeatSignal, Kinnaird College for Women, Lahore.

| Name | Role |
|------|------|
| Rameen Fatima | Lead Developer & System Design |
| [Teammate 2] | [Role] |
| [Teammate 3] | [Role] |

HeatSignal is a decision-support tool, not medical advice.

## License

[MIT](LICENSE)
