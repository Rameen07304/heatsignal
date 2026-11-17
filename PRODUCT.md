# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **The public** — outdoor workers (construction, farm, delivery), parents, older people and their families in hot, polluted cities (Pakistan, the Gulf, South Asia first; any city worldwide). Job: decide whether, when and how long it is safe to be outside today, and what to do about it.
- **Health officials and employers** — public-health and disaster authorities, site supervisors, school and event organisers. Job: see which places are at risk now and in the next 48 hours, issue warnings, and plan work, school and events around them.

It should read as a public service platform people can trust, not a startup demo. A hackathon jury (Future Health Digital Innovation Challenge 2026, Abu Dhabi Department of Health) will also judge it, but the design serves the real users first.

## Product Purpose

HeatSignal is an environmental-health early-warning system. It turns free global forecasts into a compound risk score for heat stress (WBGT), air quality (US AQI) and UV, hour by hour, for 100+ cities, and turns that into action: safe outdoor hours, work–rest schedules, school and event advisories, personal risk checks, first aid, and AI-written alerts in English, Urdu and Arabic. Success is people changing what they do on a dangerous day before they get hurt.

## Positioning

Most warning systems look at temperature alone. HeatSignal watches heat and polluted air together — the combination is more dangerous than either — and tells people the hours that are safe, not just a colour.

## Operating Context

Used on phones outdoors and on laptops in offices. Users check before work, the school run or an event; officials keep the dashboard open and print notices and reports. Languages: English, Urdu and Arabic (right-to-left), partial Japanese, Hindi and Spanish.

## Capabilities and Constraints

- Pages: Dashboard (map, rankings, upcoming risks, city cards), City detail, Compare, Risk Assessment, Safety Advisor, Worker Safety, Trends, First Aid, Case Studies, Alerts (multi-agent pipeline), About.
- Data: Open-Meteo (forecast, air quality, archive, geocoding), Google Gemini for alert text with rule-based fallback. No database; state in the browser.
- Stack: Next.js 14 App Router, TypeScript, Tailwind, Radix primitives, Recharts, Leaflet.
- Risk scales are fixed by the science: WBGT bands (Low < 27, Moderate, High ≥ 30, Extreme ≥ 33 °C), US EPA AQI categories and colours, compound score bands (Low, Moderate, High, Critical, Emergency).
- Printable outputs (site notice, school notice, reports) must work in black and white.

## Brand Commitments

- Name: HeatSignal. Team HeatSignal — Kinnaird College for Women, Lahore.
- The user asked to replace the whole current look, logo included.

## Evidence on Hand

Live data only. Case studies use archived data: Karachi 2015 (~1,200 deaths), Sindh 2024 (52 °C, Jacobabad), Delhi November 2023 smog. No testimonials, partners, endorsements or usage numbers exist — never invent them.

## Product Principles

1. Tell people what to do, not just how bad it is.
2. Show heat and air together; never one without the other.
3. Be honest about uncertainty: model data, heuristic scores and AI text are labelled as such.
4. Work for the most exposed person: low literacy, small phone, bright sun, Urdu or Arabic.
5. A warning must always go out, even when the AI is down.

## Accessibility & Inclusion

Readable in direct sunlight on a phone; colour is never the only signal for risk (always a word or number too); full right-to-left support for Urdu and Arabic; works for low-literacy users through plain words and clear icons.
