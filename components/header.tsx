"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/worker-safety", label: "Worker Safety" },
  { href: "/alerts", label: "Alerts" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
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

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="no-print sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-bold tracking-tight">HeatSignal</span>
            <span className="block text-[10px] text-muted-foreground">Environmental Health Intelligence</span>
          </span>
        </Link>
        <nav className="-mx-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1 text-sm [scrollbar-width:none]">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
                active(href) && "bg-muted text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
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
      </div>
    </header>
  );
}
