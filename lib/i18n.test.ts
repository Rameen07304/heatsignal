// Every language must have every English key, no empty strings, and the same {placeholders}.
// Run with: node --experimental-strip-types lib/i18n.test.ts
import assert from "node:assert/strict";
import { LANGUAGES, en, translate } from "./i18n/index.ts";

const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const keys = Object.keys(en) as (keyof typeof en)[];

for (const { code, dict } of LANGUAGES) {
  const extra = Object.keys(dict).filter((k) => !(k in en));
  assert.deepEqual(extra, [], `${code}: keys not in English: ${extra.join(", ")}`);
  for (const k of keys) {
    const v = (dict as Record<string, string | undefined>)[k];
    assert.ok(typeof v === "string" && v.trim() !== "", `${code}.${k} is missing or empty`);
    assert.equal(holes(v), holes(en[k]), `${code}.${k} placeholders differ from English`);
  }
}

assert.equal(translate("en", "moreWarnings", { n: 3 }), "+3 more");
assert.equal(translate("ur", "moreWarnings", { n: 3 }), "+3 مزید");

console.log(`i18n: ${LANGUAGES.length} languages × ${keys.length} keys checked`);
