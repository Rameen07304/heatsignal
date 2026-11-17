"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Activity,
  BellRing,
  BookOpen,
  ClipboardCheck,
  HardHat,
  HeartPulse,
  Info,
  LayoutDashboard,
  Menu,
  Moon,
  Sun,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotifyButton } from "@/components/notify-button";
import { LANGUAGES, useT, type Key, type Lang } from "@/lib/i18n";
import { useCities } from "@/lib/use-cities";
import { cn } from "@/lib/utils";

const GROUPS: { label: Key; items: { href: string; label: Key; icon: typeof Activity }[] }[] = [
  {
    label: "monitor",
    items: [
      { href: "/", label: "dashboard", icon: LayoutDashboard },
      { href: "/trends", label: "trends", icon: TrendingUp },
    ],
  },
  {
    label: "protect",
    items: [
      { href: "/risk-assessment", label: "riskAssessment", icon: UserRound },
      { href: "/safety-advisor", label: "safetyAdvisor", icon: ClipboardCheck },
      { href: "/worker-safety", label: "workerSafety", icon: HardHat },
      { href: "/first-aid", label: "firstAid", icon: HeartPulse },
    ],
  },
  {
    label: "intelligence",
    items: [
      { href: "/case-studies", label: "caseStudies", icon: BookOpen },
      { href: "/alerts", label: "alerts", icon: BellRing },
      { href: "/about", label: "about", icon: Info },
    ],
  },
];

/** HeatSignal device: four signal-strength bars in the risk colours, low to high. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 18" className={className} aria-hidden="true">
      <rect x="0" y="12" width="3.6" height="6" rx="1" fill="#16a34a" />
      <rect x="5.4" y="8" width="3.6" height="10" rx="1" fill="#eab308" />
      <rect x="10.8" y="4" width="3.6" height="14" rx="1" fill="#f97316" />
      <rect x="16.2" y="0" width="3.6" height="18" rx="1" fill="#dc2626" />
    </svg>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="HeatSignal home">
      <Logo className="h-[18px] w-5 shrink-0" />
      <span className="text-[17px] font-semibold tracking-tight">HeatSignal</span>
    </Link>
  );
}

function LanguageSelect() {
  const { lang, setLang, t } = useT();
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{t("language")}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="h-9 w-full rounded-md border bg-card px-2 text-sm"
      >
        {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}

function NavLinks() {
  const pathname = usePathname();
  const { t } = useT();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <nav className="space-y-5">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <div className="mb-1 px-2 text-xs font-medium text-muted-foreground">{t(g.label)}</div>
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active(href) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
                    active(href) && "bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Desktop sidebar + top bar, and a drawer on small screens. */
export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useT();
  const { updatedAt } = useCities();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <aside className="no-print fixed inset-y-0 start-0 z-40 hidden w-60 flex-col border-e bg-card lg:flex">
        <div className="flex h-16 items-center px-4"><Brand /></div>
        <div className="flex-1 overflow-y-auto px-3 py-2"><NavLinks /></div>
        <div className="border-t p-3"><LanguageSelect /></div>
      </aside>

      <header className="no-print sticky top-0 z-30 border-b bg-card/95 backdrop-blur lg:ms-60">
        <div className="flex h-14 items-center gap-2 px-4 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("menu")} aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu />
          </Button>
          <div className="lg:hidden"><Brand /></div>
          <p className="ms-auto hidden text-xs text-muted-foreground sm:block">
            {updatedAt ? `Data updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Open-Meteo` : "Loading live data…"}
          </p>
          <div className="ms-auto flex items-center gap-1 sm:ms-3">
            <NotifyButton />
            <Button variant="ghost" size="icon" aria-label="Toggle light/dark theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              <Moon className="dark:hidden" />
              <Sun className="hidden dark:block" />
            </Button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("menu")}>
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between px-4">
              <Brand />
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}><X /></Button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2"><NavLinks /></div>
            <div className="border-t p-3"><LanguageSelect /></div>
          </div>
        </div>
      )}
    </>
  );
}
