import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CombinedHour } from "@/lib/conditions";

interface Group {
  icon: string;
  name: string;
  /** Whether this group is at risk under these conditions. */
  when: (h: { wbgt: number; aqi: number; pm25: number; score: number; uv: number }) => boolean;
  why: string;
  advice: string;
}

const GROUPS: Group[] = [
  {
    icon: "👷",
    name: "Outdoor workers",
    when: (h) => h.wbgt >= 28 || h.aqi >= 100,
    why: "WBGT ≥ 28 °C or AQI ≥ 100",
    advice: "Follow the work-rest schedule, drink about 1 litre an hour, and wear an N95 if AQI is over 150.",
  },
  {
    icon: "👴",
    name: "Elderly (65+)",
    when: (h) => h.score >= 40,
    why: "compound score ≥ 40",
    advice: "Stay in the coolest room during the afternoon; family should check in twice a day.",
  },
  {
    icon: "🧒",
    name: "Children",
    when: (h) => h.score >= 50 || h.uv >= 8,
    why: "compound score ≥ 50 or UV ≥ 8",
    advice: "Move play and sport indoors at midday; hats, water and shade on the way to school.",
  },
  {
    icon: "🫁",
    name: "Respiratory conditions",
    when: (h) => h.aqi >= 100 || h.pm25 >= 35,
    why: "AQI ≥ 100 or PM2.5 ≥ 35 µg/m³",
    advice: "Keep inhalers at hand, keep windows closed, and avoid exertion outdoors.",
  },
  {
    icon: "❤️",
    name: "Cardiovascular patients",
    when: (h) => h.wbgt >= 30 && h.aqi >= 75,
    why: "WBGT ≥ 30 °C and AQI ≥ 75",
    advice: "Heat and polluted air together strain the heart: rest indoors and seek care for chest pain.",
  },
  {
    icon: "🤰",
    name: "Pregnant women",
    when: (h) => h.score >= 50,
    why: "compound score ≥ 50",
    advice: "Avoid the hottest hours, drink often, and watch for dizziness or reduced baby movement.",
  },
];

/** The groups flagged for these conditions. */
export function groupsAtRisk(h: CombinedHour) {
  const v = { wbgt: h.wbgt, aqi: h.air?.aqi ?? 0, pm25: h.air?.pm25 ?? 0, score: h.score ?? 0, uv: h.air?.uv ?? 0 };
  return GROUPS.filter((g) => g.when(v));
}

/** Which populations are at risk right now, by fixed rules on the current hour. */
export function VulnerableGroups({ hour, peak }: { hour: CombinedHour; peak?: CombinedHour }) {
  // Judge on today's peak where known, so the panel doesn't go quiet overnight.
  const atRisk = groupsAtRisk(peak ?? hour);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Who is at risk today</CardTitle>
        <CardDescription>
          Based on today’s peak conditions{peak ? ` (${peak.time.slice(11, 16)})` : ""}.{" "}
          {atRisk.length ? `${atRisk.length} of ${GROUPS.length} groups need precautions.` : "No group needs special precautions."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((g) => {
            const on = atRisk.includes(g);
            return (
              <div
                key={g.name}
                className={`rounded-lg border p-3 transition-opacity ${on ? "border-orange-500/50 bg-orange-500/10" : "opacity-50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">{g.icon}</span>
                  <span className="font-semibold">{g.name}</span>
                  <span className={`ml-auto text-[10px] font-semibold uppercase ${on ? "text-orange-500" : "text-muted-foreground"}`}>
                    {on ? "At risk" : "OK"}
                  </span>
                </div>
                <p className="mt-1.5 text-sm">{on ? g.advice : "No special precautions needed today."}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Flagged when {g.why}.</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
