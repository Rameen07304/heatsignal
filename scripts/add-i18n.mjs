// Add or update translation keys in all six dictionaries at once.
// Usage: node scripts/add-i18n.mjs batch.json
// batch.json: { "key": ["English", "Urdu", "Arabic", "Japanese", "Hindi", "Spanish"], ... }
import fs from "node:fs";

const LANGS = ["en", "ur", "ar", "ja", "hi", "es"];
const batch = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

for (const [i, lang] of LANGS.entries()) {
  const file = new URL(`../lib/i18n/${lang}.ts`, import.meta.url);
  let src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const end = src.lastIndexOf("\n}");
  let body = src.slice(0, end);
  for (const [key, values] of Object.entries(batch)) {
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(key)) throw new Error(`bad key ${key}`);
    const value = values[i];
    if (typeof value !== "string" || !value.trim()) throw new Error(`${lang}.${key} missing`);
    const line = `  ${key}: ${JSON.stringify(value)},`;
    const re = new RegExp(`^  ${key}: .*,$`, "m");
    body = re.test(body) ? body.replace(re, () => line) : `${body}\n${line}`;
  }
  fs.writeFileSync(file, body + src.slice(end));
}
console.log(`${Object.keys(batch).length} keys × ${LANGS.length} languages`);
