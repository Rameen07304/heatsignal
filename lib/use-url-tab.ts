"use client";

import { useEffect, useState } from "react";

/**
 * The active tab, kept in the URL as ?tab= (and opened from a #hash that names a tab). Uses the History API
 * directly, so static pages don't need a Suspense boundary for useSearchParams.
 */
export function useUrlTab<T extends string>(tabs: readonly T[], fallback: T): [T, (t: string) => void] {
  const [tab, setTabState] = useState<T>(fallback);
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromHash = url.hash.slice(1) as T;
    const fromQuery = url.searchParams.get("tab") as T;
    if (tabs.includes(fromHash)) {
      setTabState(fromHash);
      // The browser scrolled before the tab existed; scroll again once it is shown.
      setTimeout(() => document.getElementById(fromHash)?.scrollIntoView({ block: "start" }), 300);
    }
    else if (tabs.includes(fromQuery)) setTabState(fromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first load only
  }, []);
  const setTab = (next: string) => {
    if (!tabs.includes(next as T)) return;
    setTabState(next as T);
    const url = new URL(window.location.href);
    if (next === fallback) url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    url.hash = "";
    window.history.replaceState(window.history.state, "", url);
  };
  return [tab, setTab];
}
