"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isLang, langInfo, translate, type Key, type Lang, type Vars } from "./i18n/index";

export { LANGUAGES, levelKey, translate, type Key, type Lang } from "./i18n/index";

const STORAGE_KEY = "heatsignal-lang";

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Vars) => string;
  /** Number in the current language, e.g. n(33.456, 1) → "33.5". */
  n: (x: number, digits?: number) => string;
  /** Date in the current language, e.g. "Fri 20 Nov". */
  date: (d: string | Date, opts?: Intl.DateTimeFormatOptions) => string;
  /** Time of day (24-hour) in the current language. */
  time: (d: Date) => string;
  locale: string;
}

const make = (lang: Lang, setLang: (l: Lang) => void): I18n => {
  const locale = langInfo(lang).locale;
  return {
    lang,
    setLang,
    locale,
    t: (key, vars) => translate(lang, key, vars),
    n: (x, digits = 0) =>
      new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(x),
    date: (d, opts = { weekday: "short", day: "numeric", month: "short" }) =>
      // Bare "YYYY-MM-DD" dates are local calendar days; read them at noon so no time zone shifts the day.
      new Intl.DateTimeFormat(locale, opts).format(typeof d === "string" ? new Date(`${d.slice(0, 10)}T12:00`) : d),
    time: (d) => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(d),
  };
};

const Ctx = createContext<I18n>(make("en", () => {}));

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLang(saved)) setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = langInfo(lang).rtl ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo(
    () =>
      make(lang, (l) => {
        setLangState(l);
        try {
          localStorage.setItem(STORAGE_KEY, l);
        } catch {}
      }),
    [lang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
