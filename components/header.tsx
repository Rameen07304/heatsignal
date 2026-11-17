"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronDown, Globe, Menu, Moon, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotifyButton } from "@/components/notify-button";
import { LANGUAGES, useT, type Key, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const GROUPS: { label: Key; items: { href: string; label: Key }[] }[] = [
  { label: "monitor", items: [{ href: "/", label: "dashboard" }, { href: "/trends", label: "trends" }] },
  {
    label: "protect",
    items: [
      { href: "/risk-assessment", label: "riskAssessment" },
      { href: "/safety-advisor", label: "safetyAdvisor" },
      { href: "/worker-safety", label: "workerSafety" },
      { href: "/first-aid", label: "firstAid" },
    ],
  },
  {
    label: "intelligence",
    items: [{ href: "/case-studies", label: "caseStudies" }, { href: "/alerts", label: "alerts" }, { href: "/about", label: "about" }],
  },
];

/** Flame with signal waves: heat, broadcast as a warning. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <defs>
        <linearGradient id="hs-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <path
        d="M13 28c-4.4 0-7-3-7-6.8 0-3.6 2.4-5.7 3.9-8.2.9-1.5 1.1-3.3.8-5 3.4 1.6 5.3 4.6 5.1 8 1-.7 1.7-1.9 1.9-3.2 2.1 1.9 3.3 4.6 3.3 7.6C21 24.9 18 28 13 28Z"
        fill="url(#hs-flame)"
      />
      <path d="M22.5 9.5a7 7 0 0 1 0 9.9M25.6 6.4a11.4 11.4 0 0 1 0 16.1" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function LanguageSelect({ className }: { className?: string }) {
  const { lang, setLang, t } = useT();
  return (
    <label className={cn("relative flex items-center", className)}>
      <Globe className="pointer-events-none absolute start-2 h-4 w-4 text-muted-foreground" />
      <span className="sr-only">{t("language")}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="h-9 appearance-none rounded-md border bg-transparent pe-2 ps-7 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="no-print sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-tight">HeatSignal</span>
            <span className="hidden text-[10px] text-muted-foreground sm:block">{t("tagline")}</span>
          </span>
        </Link>

        {/* Desktop: three groups with hover/focus dropdowns. */}
        <nav className="ms-4 hidden flex-1 items-center gap-1 text-sm lg:flex">
          {GROUPS.map((g) => (
            <div key={g.label} className="group relative">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground group-focus-within:text-foreground",
                  g.items.some((i) => active(i.href)) && "bg-muted text-foreground",
                )}
              >
                {t(g.label)} <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
              <div className="invisible absolute start-0 top-full z-50 pt-1 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="glass min-w-48 rounded-lg p-1 shadow-lg">
                  {g.items.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      aria-current={active(i.href) ? "page" : undefined}
                      className={cn("block rounded-md px-3 py-2 hover:bg-muted", active(i.href) && "bg-muted font-medium")}
                    >
                      {t(i.label)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1">
          <LanguageSelect className="hidden lg:flex" />
          <NotifyButton />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Toggle light/dark theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("menu")} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobile menu. */}
      {open && (
        <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t bg-background px-4 pb-4 lg:hidden">
          {GROUPS.map((g) => (
            <div key={g.label} className="pt-3">
              <div className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t(g.label)}</div>
              {g.items.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={active(i.href) ? "page" : undefined}
                  className={cn("block rounded-md px-2 py-2 text-sm hover:bg-muted", active(i.href) && "bg-muted font-medium")}
                >
                  {t(i.label)}
                </Link>
              ))}
            </div>
          ))}
          <LanguageSelect className="mt-4" />
        </div>
      )}
    </header>
  );
}
