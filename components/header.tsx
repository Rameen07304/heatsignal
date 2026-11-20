"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Activity,
  BellRing,
  BookOpen,
  ClipboardCheck,
  ChevronDown,
  Factory,
  HardHat,
  HeartPulse,
  Info,
  LayoutDashboard,
  Menu,
  Moon,
  Pill,
  Sun,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldModeToggle } from "@/components/field-mode";
import { InstallApp } from "@/components/install-app";
import { NotifyButton } from "@/components/notify-button";
import { LANGUAGES, useT, type Key, type Lang } from "@/lib/i18n";
import { useCities } from "@/lib/use-cities";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: Key; icon: typeof Activity };

/** Worker-first order for Challenge 7. */
const MAIN: NavItem[] = [
  { href: "/", label: "dashboard", icon: LayoutDashboard },
  { href: "/worker-safety", label: "workerSafety", icon: HardHat },
  { href: "/workforce-risk", label: "workforceRisk", icon: Factory },
  { href: "/alerts", label: "alerts", icon: BellRing },
  { href: "/first-aid", label: "firstAid", icon: HeartPulse },
  { href: "/case-studies", label: "caseStudies", icon: BookOpen },
  { href: "/about", label: "about", icon: Info },
];
const MORE: NavItem[] = [
  { href: "/health-advisor", label: "healthAdvisor", icon: Pill },
  { href: "/trends", label: "trends", icon: TrendingUp },
  { href: "/safety-advisor", label: "safetyAdvisor", icon: ClipboardCheck },
  { href: "/risk-assessment", label: "riskAssessment", icon: UserRound },
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
  const list = (items: NavItem[]) => (
    <ul className="space-y-0.5">
      {items.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm lg:py-1.5 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
              active(href) && "bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(label)}
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <nav className="space-y-3">
      {list(MAIN)}
      <details className="group" open={MORE.some((i) => active(i.href)) || undefined}>
        <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-md px-2 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground lg:py-1.5 [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
          {t("more")}
        </summary>
        <div className="mt-0.5">{list(MORE)}</div>
      </details>
    </nav>
  );
}

function ago(d: Date, now: number, t: ReturnType<typeof useT>["t"]) {
  const min = Math.max(0, Math.round((now - d.getTime()) / 60_000));
  return min < 1 ? t("justNow") : min < 60 ? t("minutesAgo", { n: min }) : t("hoursAgo", { n: Math.round(min / 60) });
}

/** Desktop sidebar + top bar, and a drawer on small screens. */
export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { t, time } = useT();
  const { updatedAt, data, staleSince } = useCities();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  const stamp = staleSince ?? updatedAt;
  const dataTime = stamp ? time(stamp) : "";
  const failed = !updatedAt && Object.values(data).some((d) => d instanceof Error);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

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
          {(offline || staleSince) && (
            <span role="status" className="ms-auto rounded-full border border-amber-500/50 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
              {offline ? t("offline") : t("noConnection")}{dataTime && <> · <span className="hidden sm:inline">{t("showingDataFrom")} </span>{dataTime}</>}
            </span>
          )}
          <p className={`${offline || staleSince ? "ms-3" : "ms-auto"} hidden text-xs text-muted-foreground sm:block`}>
            {updatedAt ? <span title={updatedAt.toLocaleString()}>{t("updatedAgo", { ago: ago(updatedAt, now, t) })} · Open-Meteo</span> : failed ? t("liveDataUnavailable") : t("loadingLiveData")}
          </p>
          <div className="ms-auto flex items-center gap-1 sm:ms-3">
            <FieldModeToggle />
            <InstallApp />
            <NotifyButton />
            <Button variant="ghost" size="icon" aria-label={t("toggleTheme")} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              <Moon className="dark:hidden" />
              <Sun className="hidden dark:block" />
            </Button>
          </div>
        </div>
      </header>

      {/* Radix gives the drawer Escape-to-close, a focus trap and focus return. */}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col bg-card shadow-xl focus:outline-none lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">{t("menu")}</DialogPrimitive.Title>
            <div className="flex h-14 items-center justify-between px-4">
              <Brand />
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon" aria-label={t("closeMenu")}><X /></Button>
              </DialogPrimitive.Close>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2"><NavLinks /></div>
            <div className="border-t p-3"><LanguageSelect /></div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
