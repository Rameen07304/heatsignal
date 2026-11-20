"use client";

import { useSyncExternalStore } from "react";

const KEY = "heatsignal-field-mode";
const EVENT = "heatsignal-field-mode";

const read = () => {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
};
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/** Field mode: high contrast, larger text, no animation, map off by default. Saved in this browser. */
export function useFieldMode(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => false);
  const set = (next: boolean) => {
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return [on, set];
}
