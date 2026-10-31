// Ühised abivahendid: server, kontekst (mock + CDN-asendus), klikid, olek, kontrollid, Wordi lugemine.
const http = require("http"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const { installMock } = require("./mock");
const D = __dirname, SHOTS = path.join(D, "shots"), OUT = path.join(D, "out"), FIX = path.join(D, "fixtures");
fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const KEY = "kohila-dp-kontroll-v3";

function startServer(file, port) {
  return new Promise(ok => { const s = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(file)); }).listen(port, () => ok(s)); });
}
// CDN asendus: täpselt samad versioonid npm-ist (D/vendor/cdn), sest jsDelivr/cdnjs on siin keskkonnas blokeeritud (403).
const VENDOR = {
  "/npm/docx@9.5.1/dist/index.iife.js": "docx@9.5.1/dist/index.iife.js",
  "/npm/mammoth@1.8.0/mammoth.browser.min.js": "mammoth@1.8.0/mammoth.browser.min.js",
  "/npm/pdfjs-dist@3.11.174/build/pdf.min.js": "pdfjs-dist@3.11.174/build/pdf.min.js",
  "/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js": "pdfjs-dist@3.11.174/build/pdf.worker.min.js",
  "/ajax/libs/jszip/3.10.1/jszip.min.js": "jszip/jszip.min.js",
};
let cdnMode = "vendor"; // "vendor" | "block"
const cdnHits = [];
async function newCtx(browser, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.width || 1280, height: o.height || 900 }, colorScheme: o.dark ? "dark" : "light",
    isMobile: !!o.mobile, hasTouch: !!o.mobile, deviceScaleFactor: 1, locale: "et-EE", timezoneId: "Europe/Tallinn" });
  await ctx.route(/^https?:\/\/(?!localhost)/, route => route.abort()); // muu väline liiklus maha
  await ctx.route(/^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)\//, route => {
    const u = new URL(route.request().url()); const rel = VENDOR[u.pathname]; cdnHits.push(u.pathname);
    if (cdnMode === "block" || o.blockCdn || !rel) return route.abort();
    route.fulfill({ status: 200, contentType: "application/javascript", headers: { "Access-Control-Allow-Origin": "*" }, body: fs.readFileSync(path.join(D, "vendor/cdn", rel)) });
  });
  if (!o.noMock) await ctx.addInitScript(installMock, { dbSeed: o.dbSeed || [], user: o.user });
  if (o.localS) await ctx.addInitScript(s => { try { if (!localStorage.getItem("kohila-dp-kontroll-v3")) localStorage.setItem("kohila-dp-kontroll-v3", JSON.stringify({ S: s })); } catch (e) {} }, o.localS);
  if (o.uiMode) await ctx.addInitScript(m => { try { localStorage.setItem("kohila-ui-mode", m); } catch (e) {} }, o.uiMode);
  return ctx;
}
function watch(page) {
  const log = { pageErrors: [], consoleErrors: [], dialogs: [] };
  page.on("pageerror", e => log.pageErrors.push(String(e.message || e).slice(0, 300)));
  page.on("console", m => { if (m.type() === "error") log.consoleErrors.push(m.text().slice(0, 300)); });
  log.failedReq = []; page.on("requestfailed", r => { if (!/localhost/.test(r.url()) || true) log.failedReq.push(r.url().slice(0, 120)); });
  page.on("dialog", d => { log.dialogs.push(d.type() + ": " + d.message()); d.dismiss().catch(() => {}); });
  return log;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Nähtav nupp/link, mille tekst algab antud stringiga
async function clickText(page, t, sel = "button,a,summary,label.btn") {
  const ok = await page.evaluate(([t, sel]) => { const el = [...document.querySelectorAll(sel)].find(e => e.offsetParent && e.textContent.replace(/\s+/g, " ").trim().startsWith(t)); if (el) { el.click(); return true; } return false; }, [t, sel]);
  await sleep(350); return ok;
}
async function state(page) { await sleep(450); return page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)).S; } catch (e) { return null; } }, KEY); }
async function mock(page) { return page.evaluate(() => ({ store: window.__mock.store(), prompts: window.__mock.prompts.map(p => p.prompt), downloads: window.__mock.downloads.map(d => ({ filename: d.filename, type: d.type, size: d.size })), writes: window.__mock.writes })); }
async function lastDownload(page) { return page.evaluate(() => window.__mock.downloads.slice(-1)[0] || null); }
async function downloadsSince(page, n) { return page.evaluate(n => window.__mock.downloads.slice(n), n); }
async function nDownloads(page) { return page.evaluate(() => window.__mock.downloads.length); }
async function toastText(page) { return page.evaluate(() => { const t = document.querySelector("#toast"); return t && !t.hidden ? t.textContent : ""; }); }
async function go(page, tab) { await page.evaluate(t => { location.hash = ""; const b = document.querySelector(`#tabs [data-t="${t}"]`) || document.querySelector(`[data-side="${t}"]`); if (b) b.click(); }, tab); await sleep(400); }
async function step(page, k) { await page.evaluate(k => { const b = document.querySelector(`#stepBar [data-step="${k}"]`); if (b) b.click(); }, k); await sleep(300); }
async function txt(page, sel) { return page.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : null; }, sel); }
async function shot(page, name) { const p = path.join(SHOTS, name + ".png"); await page.screenshot({ path: p, fullPage: false }).catch(() => {}); return "D/shots/" + name + ".png"; }
// docx -> document.xml tekst (unzip)
function docxText(b64, name) {
  const f = path.join(OUT, name.replace(/[^\w.-]+/g, "_")); fs.writeFileSync(f, Buffer.from(b64, "base64"));
  const xml = execFileSync("unzip", ["-p", f, "word/document.xml"], { maxBuffer: 1 << 26 }).toString("utf8");
  const paras = xml.split(/<\/w:p>/).map(p => (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, "")).join("")).filter(Boolean);
  const hl = (xml.match(/<w:highlight w:val="yellow"\/>/g) || []).length;
  const unesc = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  return { file: f, text: unesc(paras.join("\n")), paras: paras.map(unesc), highlights: hl, xml };
}
async function setDate(page, sel, v) { const ok = await page.evaluate(([sel, v]) => { const el = [...document.querySelectorAll(sel)].find(e => e.offsetParent) || document.querySelector(sel); if (!el) return false; el.focus(); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); return true; }, [sel, v]); await sleep(300); return ok; }
async function hOverflow(page) { return page.evaluate(() => { const w = document.documentElement.clientWidth; const over = document.documentElement.scrollWidth - w; const offenders = []; if (over > 1) document.querySelectorAll("body *").forEach(e => { if (!e.offsetParent) return; const r = e.getBoundingClientRect(); if (r.right > w + 1 && r.width > 0 && getComputedStyle(e).position !== "fixed") { let p = e.parentElement, clip = false; while (p) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(cs.overflowX)) { clip = true; break; } p = p.parentElement; } if (!clip) offenders.push((e.id ? "#" + e.id : e.tagName.toLowerCase() + "." + [...e.classList].join(".")) + " r=" + Math.round(r.right)); } }); return { over, offenders: offenders.slice(0, 8) }; }); }

// ---- kontrollide register ----
const results = [];
let current = "";
function journey(n) { current = n; console.log("\n=== " + n + " ==="); }
function check(id, name, pass, info) { const r = { j: current, id, name, pass: !!pass, info: info == null ? "" : (typeof info === "string" ? info : JSON.stringify(info)).slice(0, 600) }; results.push(r); console.log(`${r.pass ? "PASS" : "FAIL"}  ${id}  ${name}${r.info ? "  | " + r.info : ""}`); return r.pass; }
function note(s) { console.log("      · " + s); }
module.exports = { chromium, startServer, newCtx, watch, sleep, clickText, state, mock, lastDownload, downloadsSince, nDownloads, toastText, go, step, txt, shot, docxText, setDate, hOverflow, check, journey, note, results, FIX, OUT, SHOTS, KEY, path, fs, cdnHits, setCdn: m => { cdnMode = m; } };
