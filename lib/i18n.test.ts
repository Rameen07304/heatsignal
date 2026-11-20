// Every language must have every English key, no empty strings, and the same {placeholders}.
// Run with: node --experimental-strip-types lib/i18n.test.ts
import assert from "node:assert/strict";
import { LANGUAGES, en, translate } from "./i18n/index.ts";
import { WORLD_CITIES } from "./cities.ts";
import { CITY_NAMES, COUNTRY_CODES, cityName, countryName, placeMatches } from "./places.ts";

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

// Places: every monitored city has Urdu, Arabic, Hindi and Japanese names, and every country an ISO code.
for (const c of WORLD_CITIES) {
  for (const l of ["ur", "ar", "hi", "ja"] as const) {
    const v = CITY_NAMES[c.name]?.[l];
    assert.ok(v && v.trim() && v !== c.name, `${c.name}: missing ${l} name`);
  }
  const code = COUNTRY_CODES[c.country];
  assert.ok(code && /^[A-Z]{2}$/.test(code), `${c.country}: missing ISO code`);
}
assert.equal(cityName("Lahore", "ur"), "لاہور");
assert.equal(cityName("Lahore", "en"), "Lahore");
assert.equal(cityName("Some searched town", "ar"), "Some searched town");
assert.equal(countryName("Pakistan", "en"), "Pakistan");
assert.notEqual(countryName("Pakistan", "ar"), "Pakistan");
assert.equal(countryName("Atlantis", "ar"), "Atlantis");
const lahore = { name: "Lahore", country: "Pakistan" };
assert.ok(placeMatches(lahore, "لاہور", "ur") && placeMatches(lahore, "Lahore", "ur") && placeMatches(lahore, "lah", "ar"));
assert.ok(placeMatches(lahore, countryName("Pakistan", "ur"), "ur"));
assert.ok(!placeMatches(lahore, "Karachi", "ur") && !placeMatches(lahore, "کراچی", "ur"));
console.log(`places: ${WORLD_CITIES.length} cities named in 4 scripts`);
