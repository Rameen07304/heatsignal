"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { riskMessage, ShareDialog } from "@/components/share-dialog";
import { SOS_COUNTRY_KEY } from "@/components/sos-button";
import { groupsAtRisk } from "@/components/vulnerable-groups";
import { hourToInput, loadHistory } from "@/lib/alert-client";
import { cityHref, cityKey, type City } from "@/lib/cities";
import type { CombinedHour, Conditions } from "@/lib/conditions";
import { useT } from "@/lib/i18n";
import { cityReport } from "@/lib/report";
import { ruleAlert } from "@/lib/rule-alert";
import { useCities } from "@/lib/use-cities";

const SIX_HOURS = 6 * 60 * 60 * 1000;

export const compareHref = (a: City, b: City) =>
  `/compare/${a.lat}/${a.lon}/${b.lat}/${b.lon}?n1=${encodeURIComponent(a.name)}&c1=${encodeURIComponent(a.country)}&n2=${encodeURIComponent(b.name)}&c2=${encodeURIComponent(b.country)}`;

/** "Download Report", "Share" and "Compare with…" for the city page. */
export function CityActions({ city, c, peak }: { city: City; c: Conditions; peak?: CombinedHour }) {
  const { t } = useT();
  const router = useRouter();
  const { cities } = useCities();
  const options = cities.filter((o) => cityKey(o) !== cityKey(city)).sort((a, b) => a.name.localeCompare(b.name));
  const [other, setOther] = useState("");

  // The SOS button offers the emergency number of the last city viewed.
  useEffect(() => {
    try {
      if (city.country) localStorage.setItem(SOS_COUNTRY_KEY, city.country);
    } catch {}
  }, [city.country]);

  function report() {
    // Use an AI alert generated for this city in the last 6 hours if there is one; otherwise the rule-based text.
    const recent = loadHistory().find(
      (e) => e.lat === city.lat && e.lon === city.lon && Date.now() - Date.parse(e.at) < SIX_HOURS && e.alert.source === "ai",
    );
    const advisory = recent ? { text: recent.alert.en, source: "ai" as const } : { text: ruleAlert(hourToInput(city, c.now)), source: "rules" as const };
    cityReport(city, c, groupsAtRisk(peak ?? c.now), advisory);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ShareDialog size="default" title={`${city.name} health alert`} text={riskMessage(city, c.now)} path={cityHref(city)} />
      <Button variant="outline" onClick={report}>
        <FileDown /> {t("downloadReport")}
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">
            <GitCompare /> {t("compare")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compare {city.name} with…</DialogTitle>
            <DialogDescription>Pick a monitored city to see the two side by side.</DialogDescription>
          </DialogHeader>
          <select
            aria-label="City to compare with"
            className="h-10 rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={other}
            onChange={(e) => setOther(e.target.value)}
          >
            <option value="">Choose a city…</option>
            {options.map((o) => <option key={cityKey(o)} value={cityKey(o)}>{o.name}, {o.country}</option>)}
          </select>
          <Button
            disabled={!other}
            onClick={() => {
              const b = options.find((o) => cityKey(o) === other);
              if (b) router.push(compareHref(city, b));
            }}
          >
            Compare
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
