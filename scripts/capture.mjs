// Screenshots for design review, through Edge's DevTools protocol (no extra packages).
// Emulates the device viewport (no headless window-size floor) and waits in real time.
// Usage: node scripts/capture.mjs <out.png> <url> <width> [mobile] [waitMs]
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [out, url, width = "1440", mobile = "", waitMs = "15000"] = process.argv.slice(2);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9300 + Math.floor(Math.random() * 500);
const edge = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "hs-cap-"))}`, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(500);
  try {
    target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page");
  } catch {}
}
if (!target) throw new Error("Edge did not start");

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

const isMobile = mobile === "mobile";
const w = Number(width);
const h = isMobile ? 844 : 900;
await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: isMobile });
if (isMobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Page.enable");
await send("Page.navigate", { url });
await sleep(Number(waitMs));

const { result } = await send("Runtime.evaluate", {
  expression: "JSON.stringify({h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth})",
  returnByValue: true,
});
const size = JSON.parse(result.value);
const fullH = Math.min(size.h, Number(process.env.MAX_H || 6000));
await send("Emulation.setDeviceMetricsOverride", { width: w, height: fullH, deviceScaleFactor: 1, mobile: isMobile });
await sleep(2500);
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
writeFileSync(out, Buffer.from(shot.data, "base64"));
console.log(`saved ${out} — layout ${size.w}x${size.h}, viewport ${w}`);
ws.close();
edge.kill();
process.exit(0);
