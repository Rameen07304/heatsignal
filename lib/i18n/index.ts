import { ar } from "./ar";
import { en, type Dict, type Key } from "./en";
import { es } from "./es";
import { hi } from "./hi";
import { ja } from "./ja";
import { ur } from "./ur";

export type { Dict, Key };
export { en };

export const LANGUAGES = [
  { code: "en", label: "English", dict: en as Dict, rtl: false, locale: "en-GB" },
  { code: "ur", label: "اردو", dict: ur, rtl: true, locale: "ur-PK" },
  // Latin digits keep readings consistent with the WBGT, AQI and °C values on charts and maps.
  { code: "ar", label: "العربية", dict: ar, rtl: true, locale: "ar-u-nu-latn" },
  { code: "ja", label: "日本語", dict: ja, rtl: false, locale: "ja-JP" },
  { code: "hi", label: "हिन्दी", dict: hi, rtl: false, locale: "hi-IN-u-nu-latn" },
  { code: "es", label: "Español", dict: es, rtl: false, locale: "es-419" },
] as const;
export type Lang = (typeof LANGUAGES)[number]["code"];

export const isLang = (l: unknown): l is Lang => LANGUAGES.some((x) => x.code === l);
export const langInfo = (lang: Lang) => LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

export type Vars = Record<string, string | number>;

/** Translate a key into `lang`, filling {placeholders}. Usable on the server too (rule-based alerts). */
export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const text = langInfo(lang).dict[key] || en[key];
  return text.replace(/\{(\w+)\}/g, (_, v) => String(vars?.[v] ?? ""));
}

/** Translation key for a risk level name ("Low", "Extreme", …). */
export const levelKey = (level: string) => level.toLowerCase() as Key;
