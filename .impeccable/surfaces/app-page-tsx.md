---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/layout.tsx"]
---

# Surface: Dashboard (app/page.tsx) and the app shell shared by every page

Mode: Operate. Users: the public (outdoor workers, parents, older people) and health officials. Lead page: Dashboard.

## Direction contract

THESIS: The category standard, executed impeccably: a sober public-health data dashboard people trust at a glance. It refuses the dark glowing "AI dashboard" (glass, neon, pulsing glows, gradients) the app had before.

OWN-WORLD: Light by default (used on phones in bright sun and in offices). Slate neutrals, white cards with 1px slate-200 borders and no glow, one blue accent (#2563eb) for actions and selection; risk colours only on data, always with a word or number. Inter at a strict scale, tabular figures. Lucide icons, no emoji.

STORY: The visitor sees which places are dangerous today and in the next 48 hours, understands heat and air together, and opens a city to learn its safe hours or send an alert.

FIRST VIEWPORT: Left side navigation (logo, grouped links, language) and a slim top bar (updated time, notifications, theme). Content: page title + actions; a row of five KPI cards; then the map card (two-thirds) beside a "Highest risk today" table card (one-third); a single compact early-warning alert above the KPIs when cities are rising.

FORM: Canon chosen by the user over three dealt hands; seed:9581a2557378be41. Quality bar: IQAir, Windy, WHO/CDC dashboards, Linear/Vercel.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
