"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cityKey, type City } from "@/lib/cities";
import { searchCities, type CityResult } from "@/lib/weather";
import { useT } from "@/lib/i18n";

const formatPop = (m?: number) =>
  m == null ? null : m >= 1 ? `${m.toFixed(1)} M people` : `${Math.round(m * 1000).toLocaleString("en")} k people`;

/** "Add City" button that opens a geocoding search. */
export function AddCityDialog({
  onAdd,
  monitored,
  label,
  title,
  variant,
  icon = <Plus />,
}: {
  onAdd: (city: City) => void;
  monitored: Set<string>;
  label?: string;
  title?: string;
  variant?: "outline";
  icon?: React.ReactNode;
}) {
  const { t } = useT();
  label ??= t("addCity");
  title ??= t("addCityTitle");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    setError(false);
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      searchCities(q)
        .then((r) => live && setResults(r))
        .catch(() => live && setError(true))
        .finally(() => live && setLoading(false));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);

  const add = (r: CityResult) => {
    onAdd({ name: r.name, country: r.country, lat: r.lat, lon: r.lon, pop: r.pop });
    setQuery("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          {icon} {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("anyTownWorldwide")}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            type="search"
            aria-label={t("cityName")}
            placeholder={t("citySearchPlaceholder")}
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results?.[0]) add(results[0]);
            }}
          />
          {loading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <ul className="max-h-80 overflow-y-auto" aria-live="polite">
          {error && <li className="px-1 py-2 text-sm text-destructive">{t("searchFailed")}</li>}
          {results?.length === 0 && <li className="px-1 py-2 text-sm text-muted-foreground">{t("noPlacesFound")}</li>}
          {results?.map((r) => {
            const already = monitored.has(cityKey(r));
            return (
              <li key={cityKey(r)}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => add(r)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{r.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[r.region, r.country].filter(Boolean).join(", ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">
                    {already ? t("alreadyMonitored") : formatPop(r.pop) ?? ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
