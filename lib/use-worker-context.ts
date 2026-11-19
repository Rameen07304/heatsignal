"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CLOTHING, DEFAULT_CONTEXT, type WorkerContext } from "./work-rest";

const KEY = "heatsignal-worker-ctx";
const EVENT = "heatsignal-worker-ctx";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function parse(raw: string): WorkerContext {
  try {
    const v = JSON.parse(raw);
    if (CLOTHING.some((c) => c.key === v?.clothing) && typeof v?.acclimatised === "boolean") return v;
  } catch {}
  return DEFAULT_CONTEXT;
}

/** The crew's clothing and acclimatisation, saved in this browser and shared by every work tool on the page. */
export function useWorkerContext(): [WorkerContext, (ctx: WorkerContext) => void] {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const ctx = useMemo(() => parse(raw), [raw]);
  const set = (next: WorkerContext) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return [ctx, set];
}
