---
name: HeatSignal
description: A sober public-health data dashboard for compound heat, air-quality and UV risk.
colors:
  primary: "hsl(221 83% 53%)"
  primary-foreground: "hsl(0 0% 100%)"
  background: "hsl(210 40% 98%)"
  foreground: "hsl(222 47% 11%)"
  card: "hsl(0 0% 100%)"
  elevated: "hsl(210 40% 96%)"
  muted: "hsl(210 40% 96%)"
  muted-foreground: "hsl(215 19% 35%)"
  border: "hsl(214 32% 91%)"
  destructive: "hsl(0 72% 51%)"
  dark-background: "hsl(222 47% 7%)"
  dark-foreground: "hsl(210 40% 96%)"
  dark-card: "hsl(222 40% 10%)"
  dark-elevated: "hsl(217 33% 15%)"
  dark-muted-foreground: "hsl(215 20% 70%)"
  dark-border: "hsl(217 28% 20%)"
  dark-primary: "hsl(217 91% 64%)"
  risk-low: "#22c55e"
  risk-moderate: "#eab308"
  risk-high: "#f97316"
  risk-critical: "#ef4444"
  risk-emergency: "#a855f7"
  aqi-hazardous: "#991b1b"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "tnum"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    size: "36px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "40px"
  risk-pill:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  tabs-list:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    padding: "4px"
    height: "36px"
  tabs-trigger-active:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "4px 12px"
  nav-item:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
  nav-item-active:
    backgroundColor: "hsl(221 83% 53% / 0.1)"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
---

# Design System: HeatSignal

## Overview

**Creative North Star: "The Public Health Bulletin"**

HeatSignal is the category standard executed carefully: a light, slate-and-white data dashboard that a parent on a phone in bright sun and a health official at a desk both trust at a glance. Everything that is not data stays quiet (white cards, hairline slate borders, one blue accent) so that the only strong colour on screen is the risk colour sitting on a number or a word.

Density is moderate and tabular. Pages open with a title and actions, then a row of KPI cards, then cards holding maps, tables and time-aligned charts. Figures use Inter's tabular numerals everywhere so columns of temperatures, AQI values and scores line up without effort. Dark mode exists as an opt-in toggle; light is the default and the reference.

The system explicitly rejects the dark, glowing "AI dashboard" the product had before: no glass, no glow, no gradients used as decoration, no emoji icons.

**Key Characteristics:**
- Light by default; slate neutrals, white cards, 1px slate borders.
- One blue accent for actions, links and selection.
- Risk colours appear only on data and always beside a word or number.
- Inter at a small, strict scale with tabular figures.
- Lucide line icons at 16px; no emoji.
- Flat surfaces with at most a whisper shadow.

## Colors

A cool slate neutral field with a single blue accent, plus a fixed set of risk colours that belong to the science, not the brand.

### Primary
- **Signal Blue** (`primary`): buttons, links, the active nav item tint (10% fill with blue text), focus rings, caret and text selection (18% tint). Never used to encode risk. In dark mode it lifts to `dark-primary`.

### Neutral
- **Paper Slate** (`background`): the page field behind cards.
- **Card White** (`card`): every card, the sidebar, the top bar, inputs, pills.
- **Cool Wash** (`elevated` / `muted`): tab rails, hover fills, skeleton blocks, map background, gauge tracks.
- **Ink Slate** (`foreground`): body text, chart lines (the data line is drawn in ink, not in colour).
- **Quiet Slate** (`muted-foreground`): labels, captions, axis ticks, table headers, KPI labels.
- **Hairline Slate** (`border`): all borders, table rules, chart gridlines.
- **Alarm Red** (`destructive`): destructive actions only.

### Risk scale (fixed by the science)
- **Low / Good** (`risk-low`), **Moderate** (`risk-moderate`), **High / Unhealthy for sensitive groups** (`risk-high`), **Extreme / Critical / Unhealthy** (`risk-critical`), **Emergency / Very unhealthy** (`risk-emergency`), **Hazardous AQI** (`aqi-hazardous`). The bands come from WBGT, US EPA AQI and WHO UV thresholds in `lib/risk.ts` and `lib/air.ts`; do not restyle them.

### Named Rules
**The Colour Carries Data Rule.** Risk colours appear only on data marks (pill dots, gauge arcs, map markers, chart band fills at 10% opacity, the peak dot, legend swatches) and always next to the word or number they encode. Colour reinforces; the word or number carries the meaning.

**The One Accent Rule.** Blue is the only non-data hue in the interface. If something needs emphasis and is not data, use weight or Ink Slate, not a new colour.

**The Brand Bars Exception.** The wordmark's four signal bars (green, yellow, orange, red, low to high) are the one place risk hues appear without a value; they are the logo, not a pattern to reuse.

**The Severity Notice Rule.** The early-warning alert is the only tinted surface: a pale amber (High) or pale red (Critical) panel with a matching border and a warning icon, always carrying a sentence that states the city, the hours and the level.

## Typography

**Display Font:** Inter (with system-ui, sans-serif)
**Body Font:** Inter
**Label/Mono Font:** Inter, tabular figures

**Character:** One neutral grotesque at a tight scale; hierarchy comes from size and weight steps, not from typeface contrast. Headings are slightly tightened (-0.025em).

### Hierarchy
- **Display** (700, 30px, tight): page titles. The dashboard title is 600 and steps from 24px on phones to 30px.
- **Headline** (600, 18px): section headings inside a page ("Highest risk today", "Monitored cities").
- **Metric** (600, 24px, tabular): KPI card values. Large readouts in the conditions panel go to 48px (600-700); gauge centres scale with the ring.
- **Title** (600, 16px, leading 1): card titles.
- **Body** (400, 14px): descriptions, table cells, nav links, alert text.
- **Label** (500, 12px, Quiet Slate): KPI labels, nav group names, table headers, pill text, captions, footer.

### Named Rules
**The Tabular Figures Rule.** `font-variant-numeric: tabular-nums` is set on `body`; every number in the product lines up in columns. Never switch to proportional figures for data.

**The Signage Exception.** Printed notices (the worker site card and the safety-advisor printout) keep bold uppercase section headings with wide tracking, because posted safety notices follow signage convention. On screen, headings stay in sentence case.

## Layout

A fixed 240px left sidebar (logo, grouped nav, language select at the foot) on screens 1024px and wider, beside a sticky 56px top bar showing the data timestamp, notifications and the theme toggle. Below 1024px the sidebar becomes a 288px drawer (max 85vw) opened from a menu button.

Content sits in a centred column up to 1400px wide with 16px side padding (32px at 1024px+) and 24px vertical padding. Page sections stack 32px apart. Card grids use 12px gaps: KPIs run 2 columns on phones, 3 at 768px, 5 at 1280px; the dashboard pairs a two-thirds map card with a one-third ranking table. Charts stack as time-aligned panels sharing one x-axis.

**The Shrinkable Cell Rule.** Every grid child gets `min-width: 0` (`.grid > *`), so a wide table or long word shrinks to its track instead of pushing the page past a phone screen. Tables scroll horizontally inside their card.

## Elevation & Depth

Flat, with tonal layering: Paper Slate page, white cards, 1px Hairline borders. Cards carry only a whisper shadow; real shadows are reserved for things that float above the page (dialog, mobile drawer). Dark mode replaces shadow with lighter card tones.

### Shadow Vocabulary
- **Whisper** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): resting cards.
- **Tab lift** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): the active tab chip.
- **Float** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): dialogs.
- **Drawer** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): mobile nav drawer.

### Named Rules
**The No Glow Rule.** No coloured shadows, glows, blurs-as-material or decorative gradients. Depth is border plus tone.

## Shapes

Gently rounded rectangles: 8px on cards, dialogs and alerts; 6px on buttons, inputs, nav items and tab rails; 4px on tab chips; full pills for risk badges and dots. Borders are always 1px Hairline Slate. Icons are Lucide line icons at 16px (20px for the alert warning).

## Components

### Buttons
Plain and compact.
- **Shape:** 6px radius, 36px tall (32px small), 14px medium text, 16px icons with an 8px gap.
- **Primary:** Signal Blue fill, white text; hover drops to 90% opacity.
- **Outline:** hairline border, transparent fill; hover fills Cool Wash.
- **Ghost / icon:** no border, 36px square for icons; hover fills Cool Wash.
- **Focus:** 2px blue ring with 2px offset. Disabled at 50% opacity.

### Risk pills
The signature data chip.
- **Style:** white pill, hairline border, 12px medium Ink text, 8px coloured dot in front.
- **Content:** always a word (risk level, AQI category) or a number plus a word (compound score in semibold tabular figures, then the level).

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Card White on Paper Slate.
- **Shadow Strategy:** Whisper (see Elevation).
- **Border:** 1px Hairline Slate.
- **Internal Padding:** 16px.

### KPI cards
A card with a 14px Quiet Slate label, a 24px semibold tabular value, and an optional 12px truncated caption.

### Inputs / Fields
- **Style:** 40px tall, white fill, hairline border, 6px radius, 14px text, Quiet Slate placeholder.
- **Focus:** 2px blue ring.
- **Disabled:** 50% opacity.

### Tabs
Segmented control: Cool Wash rail (36px, 4px padding), active chip turns to the page colour with Ink text and Tab lift.

### Tables
14px tabular cells (10px vertical padding), 12px medium Quiet Slate headers, hairline row rules, Cool Wash hover at 50%. No zebra striping.

### Navigation
Sidebar groups with a 12px Quiet Slate group label, 14px links with a 16px Lucide icon. Hover fills Cool Wash; the active link takes a 10% blue tint, blue text and medium weight.

### Gauge ring
A single SVG arc on a Cool Wash track, round cap, in the band colour; the value sits bold and tabular in the centre with label and category word below. The arc animates in over 700ms.

### Compound chart
Three time-aligned panels (compound score, heat, air) sharing one x-axis. Risk bands are 10% colour fills behind an Ink line; gridlines are dashed Hairline; a dashed line marks now and events; the peak gets a band-coloured dot ringed in card colour.

### Early-warning alert
One compact tinted panel above page content (see The Severity Notice Rule). Shows three warnings on desktop and one on phones, with an expand link, a "View details" link in blue, and per-row dismiss.

## Do's and Don'ts

### Do:
- **Do** keep light as the default theme; dark is a toggle, not the reference.
- **Do** pair every risk colour with its word or number (pill dot plus label, arc plus value, legend swatch plus band name).
- **Do** use Signal Blue only for actions, links, focus and selection.
- **Do** set numbers in tabular figures and keep the type scale to the six roles above.
- **Do** use Lucide line icons at 16px.
- **Do** let grid cells shrink (`min-width: 0`) and let tables scroll inside their card.
- **Do** keep uppercase bold section headings on printed notices, and only there.
- **Do** honour `prefers-reduced-motion`: all animation and transitions switch off.

### Don't:
- **Don't** use glass, glow, coloured shadows or decorative gradients.
- **Don't** use emoji as icons.
- **Don't** put risk colours on chrome, headings, buttons or backgrounds (the wordmark and the early-warning alert are the only exceptions).
- **Don't** convey risk by colour alone.
- **Don't** restyle or re-band the risk scales; they are fixed by WBGT, EPA AQI and WHO UV thresholds.
- **Don't** add a second accent hue.
