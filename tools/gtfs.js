/* Ühistranspordi andmetöötlus (GTFS) Kohila digikaksiku jaoks.
 * Laeb Transpordiameti GTFS-voogud (Remix), arvutab 14 päeva kohta väljumised peatuste, asulate ja valla kaupa
 * ning otseühendused Tallinna kesklinna ja vallakeskusesse. Väljund: data/transit/<vald>.json.
 * Ainult Node'i standardteek; stop_times ja shapes loetakse ridahaaval (readline).
 * Käivitus: node tools/gtfs.js [--dir <lahtipakitud voogude kaust>] [--out data/transit] [--start YYYY-MM-DD] [--vallad Kohila,Rae]
 * Vt docs/gtfs.md. */
"use strict";
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const FEEDS = [
  { name: "raplamaa", url: "https://eu-gtfs.remix.com/raplamaa.zip" },
  { name: "harjumaa", url: "https://eu-gtfs.remix.com/harjumaa.zip" },
  { name: "elron", url: "https://eu-gtfs.remix.com/elron.zip" },
  { name: "tallinn", url: "https://eu-gtfs.remix.com/tallinn.zip" },
];
const VALLAD = ["Kohila", "Rae", "Rapla", "Marjamaa", "Kehtna"];
const CENTRES = { Kohila: "Kohila alev", Rae: "Jüri alevik", Rapla: "Rapla linn", Marjamaa: "Märjamaa alev", Kehtna: "Kehtna alevik" };
const TLN = { lat: 59.4337, lon: 24.7449, r: 2500 };
const WD = ["P", "E", "T", "K", "N", "R", "L"]; // getUTCDay(): 0 = pühapäev

/* ---------- abifunktsioonid ---------- */
function parseCsvLine(line) {
  if (line.indexOf('"') < 0) return line.split(",");
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur); return out;
}
function header(line) { return parseCsvLine(line.replace(/^﻿/, "").trim()).map((s) => s.trim()); }
function readCsv(file) {
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const h = header(lines[0] || ""); const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const v = parseCsvLine(lines[i]); const o = {};
    h.forEach((k, j) => (o[k] = v[j] === undefined ? "" : v[j].trim()));
    rows.push(o);
  }
  return rows;
}
async function streamCsv(file, onRow) {
  if (!fs.existsSync(file)) return false;
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  let h = null;
  for await (const line of rl) {
    if (!h) { h = header(line); const idx = {}; h.forEach((k, i) => (idx[k] = i)); h = idx; continue; }
    if (!line) continue;
    onRow(parseCsvLine(line), h);
  }
  return true;
}
/** GTFS aeg "HH:MM:SS" (HH võib olla ≥ 24) → sekundid teenusepäeva algusest; tühi → null. */
function toSec(s) {
  if (!s) return null; const m = /^\s*(\d+):(\d\d)(?::(\d\d))?\s*$/.exec(s); if (!m) return null;
  return +m[1] * 3600 + +m[2] * 60 + (m[3] ? +m[3] : 0);
}
/** Kellaaeg HH:MM (üle 24:00 ajad näidatakse järgmise ööpäeva kellaajana). */
function fmt(sec) {
  if (sec == null) return null; const m = Math.floor(sec / 60); const h = Math.floor(m / 60) % 24;
  return String(h).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}
const hourOf = (sec) => Math.floor(sec / 3600) % 24;
const ymd = (s) => s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6, 8); // 20261102 → 2026-11-02
const compact = (d) => d.replace(/-/g, "");
function addDays(d, n) { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
function weekday(d) { return new Date(d + "T00:00:00Z").getUTCDay(); }
function pointInRings(lon, lat, rings) { // paaris-paaritu reegel üle kõigi rõngaste (augud arvestatud)
  let ins = false;
  for (const r of rings) for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function ringsBbox(rings) {
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of rings) for (let i = 0; i < r.length; i += 2) { b[0] = Math.min(b[0], r[i]); b[1] = Math.min(b[1], r[i + 1]); b[2] = Math.max(b[2], r[i]); b[3] = Math.max(b[3], r[i + 1]); }
  return b;
}
const inBbox = (lon, lat, b) => lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3];
function distM(lat1, lon1, lat2, lon2) {
  const R = 6371000, r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const asulaKey = (n) => n.replace(/ (alev|alevik|küla|linn)$/i, "").trim();
function modeOf(t) { t = +t; if (t === 2 || (t >= 100 && t <= 117)) return "rail"; if (t === 3 || (t >= 700 && t <= 716)) return "bus"; return null; }
/** Douglas-Peucker meetrites (lokaalne tasaprojektsioon). pts = lame [lon,lat,...]. */
function simplify(pts, tolM) {
  const n = pts.length / 2; if (n <= 2) return pts.slice();
  const lat0 = pts[1] * Math.PI / 180, kx = 111320 * Math.cos(lat0), ky = 110540;
  const X = (i) => pts[2 * i] * kx, Y = (i) => pts[2 * i + 1] * ky;
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1; const st = [[0, n - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = -1, mi = -1;
    const ax = X(a), ay = Y(a), dx = X(b) - ax, dy = Y(b) - ay, L2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      let t = L2 ? ((X(i) - ax) * dx + (Y(i) - ay) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(X(i) - ax - t * dx, Y(i) - ay - t * dy); if (d > md) { md = d; mi = i; }
    }
    if (md > tolM) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  const out = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(+pts[2 * i].toFixed(5), +pts[2 * i + 1].toFixed(5));
  return out;
}
/** Lõikab joone bbox'i: hoiab lõigu esimesest kuni viimase kasti jääva punktini (+1 punkt mõlemal pool). */
function clipToBbox(pts, b) {
  let f = -1, l = -1;
  for (let i = 0; i < pts.length; i += 2) if (inBbox(pts[i], pts[i + 1], b)) { if (f < 0) f = i; l = i; }
  if (f < 0) return null;
  return pts.slice(Math.max(0, f - 2), Math.min(pts.length, l + 4));
}
function gapMaxMin(secs) {
  const c = secs.filter((s) => s >= 5 * 3600 && s <= 23 * 3600).sort((a, b) => a - b);
  if (c.length < 2) return null; let g = 0;
  for (let i = 1; i < c.length; i++) g = Math.max(g, c[i] - c[i - 1]);
  return Math.round(g / 60);
}
/** Ajaaken teenusepäeva aegade järgi (25:10 ei ole hommik, vaid öö). */
const inWin = (sec, h0, h1) => sec >= h0 * 3600 && sec < h1 * 3600;

/* ---------- teenuskalender ---------- */
function serviceActive(feed, sid, date) {
  const D = compact(date); let on = false; const c = feed.calendar.get(sid);
  if (c && c.start <= D && D <= c.end && c.days[weekday(date)]) on = true;
  const ex = feed.exceptions.get(sid + "|" + D);
  if (ex === 1) on = true; else if (ex === 2) on = false;
  return on;
}
function feedValidity(feed) {
  let lo = null, hi = null;
  for (const c of feed.calendar.values()) { if (!lo || c.start < lo) lo = c.start; if (!hi || c.end > hi) hi = c.end; }
  for (const [k, t] of feed.exceptions) if (t === 1) { const d = k.split("|").pop(); if (!lo || d < lo) lo = d; if (!hi || d > hi) hi = d; }
  return { validFrom: lo && ymd(lo), validTo: hi && ymd(hi) };
}
/** 14 järjestikust päeva alates ehituskuupäevale järgnevast esmaspäevast; välja jäetakse päevad, mis mõne voo kehtivusest välja jäävad. */
function pickDates(built, feeds, n = 14) {
  let d = addDays(built, 1); while (weekday(d) !== 1) d = addDays(d, 1);
  const all = []; for (let i = 0; i < n; i++) all.push(addDays(d, i));
  const ok = [], dropped = [];
  for (const x of all) (feeds.every((f) => f.validFrom && f.validFrom <= x && x <= f.validTo) ? ok : dropped).push(x);
  return { dates: ok, dropped };
}

/* ---------- voo laadimine ---------- */
function loadFeed(dir, name) {
  const f = { name, dir, stops: [], stopIdx: new Map(), routes: new Map(), trips: new Map(), calendar: new Map(), exceptions: new Map(), agencies: new Map(), feedInfo: null };
  for (const a of readCsv(path.join(dir, "agency.txt")) || []) f.agencies.set(a.agency_id || "", a.agency_name || null);
  const firstAg = f.agencies.size === 1 ? [...f.agencies.values()][0] : null;
  for (const r of readCsv(path.join(dir, "routes.txt")) || [])
    f.routes.set(r.route_id, { s: r.route_short_name || null, l: r.route_long_name || null, m: modeOf(r.route_type), type: r.route_type, op: (r.agency_id ? f.agencies.get(r.agency_id) : firstAg) || null });
  for (const t of readCsv(path.join(dir, "trips.txt")) || [])
    f.trips.set(t.trip_id, { route: t.route_id, svc: t.service_id, shape: t.shape_id || null });
  for (const c of readCsv(path.join(dir, "calendar.txt")) || [])
    f.calendar.set(c.service_id, { start: c.start_date, end: c.end_date, days: [c.sunday, c.monday, c.tuesday, c.wednesday, c.thursday, c.friday, c.saturday].map((x) => x === "1") });
  f.exByDate = new Map();
  for (const c of readCsv(path.join(dir, "calendar_dates.txt")) || []) {
    f.exceptions.set(c.service_id + "|" + c.date, +c.exception_type);
    f.exByDate.set(c.date, (f.exByDate.get(c.date) || 0) + 1);
  }
  const fi = readCsv(path.join(dir, "feed_info.txt"));
  if (fi && fi[0]) f.feedInfo = fi[0];
  for (const s of readCsv(path.join(dir, "stops.txt")) || []) {
    const lat = parseFloat(s.stop_lat), lon = parseFloat(s.stop_lon);
    if (s.location_type && s.location_type !== "0") continue;
    f.stopIdx.set(s.stop_id, f.stops.length);
    f.stops.push({ id: name + ":" + s.stop_id, n: s.stop_name || null, lat: isFinite(lat) ? lat : null, lon: isFinite(lon) ? lon : null });
  }
  Object.assign(f, feedValidity(f));
  return f;
}

/** Klassifitseerib peatused: vald, asula, Tallinna kesklinn, vallakeskus. */
function classifyStops(feeds, maps, centres) {
  const geo = Object.entries(maps).map(([id, m]) => ({
    id, outline: m.outline, ob: ringsBbox(m.outline),
    kylad: m.kylad.map((k) => ({ n: k.n, key: asulaKey(k.n), rings: k.rings, b: ringsBbox(k.rings) })),
  }));
  for (const f of feeds) for (const s of f.stops) {
    s.muni = null; s.asula = null; s.asulaName = null; s.tln = false; s.centre = false;
    if (s.lat == null) continue;
    s.tln = distM(s.lat, s.lon, TLN.lat, TLN.lon) <= TLN.r;
    for (const g of geo) {
      if (!inBbox(s.lon, s.lat, g.ob) || !pointInRings(s.lon, s.lat, g.outline)) continue;
      s.muni = g.id;
      for (const k of g.kylad) if (inBbox(s.lon, s.lat, k.b) && pointInRings(s.lon, s.lat, k.rings)) { s.asula = k.key; s.asulaName = k.n; break; }
      s.centre = s.asulaName === centres[g.id];
      break;
    }
  }
}

/** Kaks läbimist üle stop_times: 1) vallaga seotud reisid, 2) nende reiside kõik peatumised. */
async function loadStopTimes(f, warn) {
  const file = path.join(f.dir, "stop_times.txt");
  const touch = new Set();
  await streamCsv(file, (v, h) => { const si = f.stopIdx.get(v[h.stop_id]); if (si !== undefined && f.stops[si].muni) touch.add(v[h.trip_id]); });
  const rows = new Map(); let noTime = 0;
  await streamCsv(file, (v, h) => {
    const tid = v[h.trip_id]; if (!touch.has(tid)) return;
    const si = f.stopIdx.get(v[h.stop_id]); if (si === undefined) return;
    const arr = toSec(v[h.arrival_time]), dep = toSec(v[h.departure_time]);
    if (arr == null && dep == null) noTime++;
    let r = rows.get(tid); if (!r) rows.set(tid, (r = []));
    r.push({ seq: +v[h.stop_sequence], si, arr: arr == null ? dep : arr, dep: dep == null ? arr : dep,
      pu: h.pickup_type !== undefined ? v[h.pickup_type] : "", dr: h.drop_off_type !== undefined ? v[h.drop_off_type] : "" });
  });
  for (const r of rows.values()) r.sort((a, b) => a.seq - b.seq);
  f.tripRows = rows;
  if (noTime) warn.push(`${f.name}: ${noTime} vallaga seotud peatumisel puudub kellaaeg (GTFS mitte-ajapunkt); need ei loe väljumiseks ega saabumiseks, aega ei tuletata.`);
}
async function loadShapes(f, bboxes) {
  const need = new Set();
  for (const tid of f.tripRows.keys()) { const t = f.trips.get(tid); if (t && t.shape) need.add(t.shape); }
  const raw = new Map();
  await streamCsv(path.join(f.dir, "shapes.txt"), (v, h) => {
    const id = v[h.shape_id]; if (!need.has(id)) return;
    let a = raw.get(id); if (!a) raw.set(id, (a = []));
    a.push([+v[h.shape_pt_sequence], +v[h.shape_pt_lon], +v[h.shape_pt_lat]]);
  });
  f.shapes = new Map();
  for (const [id, a] of raw) { a.sort((x, y) => x[0] - y[0]); const flat = []; for (const p of a) flat.push(p[1], p[2]); f.shapes.set(id, flat); }
}

/* ---------- arvutus ---------- */
function emptyAgg() { return { dep: 0, trips: new Set(), firstDep: new Map(), tln: new Map(), kesk: new Map(), ret: new Set() }; }
/** Ühe reisi panus: väljumised ja otseühendused. ev = reisi read; stopsOf = peatuste massiiv. */
function tripEvents(rows, stops, muni) {
  const lastSeqIdx = rows.length - 1; const out = [];
  rows.forEach((r, i) => {
    const s = stops[r.si];
    if (s.muni !== muni || i >= lastSeqIdx || r.pu === "1" || r.dep == null) return;
    out.push({ i, r, s });
  });
  return out;
}
/** Otseühendus: viimasest grupi väljumisest (millele järgneb sihtpeatus) esimese sihtpeatuseni. */
function directTo(rows, stops, deps, isDest) {
  for (let d = deps.length - 1; d >= 0; d--) {
    const j = deps[d].i;
    for (let k = j + 1; k < rows.length; k++) {
      const r = rows[k];
      if (isDest(stops[r.si]) && r.dr !== "1" && r.arr != null) return { dep: deps[d].r.dep, arr: r.arr };
    }
  }
  return null;
}
function finishConn(m) {
  if (!m) return null; let firstArr = null, minS = null, am = 0;
  for (const c of m.values()) {
    if (firstArr == null || c.arr < firstArr) firstArr = c.arr;
    const d = c.arr - c.dep; if (minS == null || d < minS) minS = d;
    if (inWin(c.arr, 7, 9)) am++;
  }
  return { trips: m.size, firstArr: fmt(firstArr), minMin: minS == null ? null : Math.round(minS / 60), am7_9: am };
}
function finishAgg(a, mode, isCentre) {
  const h = new Array(24).fill(0), hr = new Array(24).fill(0), secs = [];
  let am = 0, pm = 0;
  for (const [tid, x] of a.firstDep) { (x.m === "rail" ? hr : h)[hourOf(x.t)]++; secs.push(x.t); if (inWin(x.t, 6, 9)) am++; if (inWin(x.t, 15, 19)) pm++; }
  const sorted = secs.slice().sort((p, q) => p - q);
  const o = { dep: a.dep, trips: a.trips.size, h, hr, first: fmt(sorted[0] ?? null), last: fmt(sorted.length ? sorted[sorted.length - 1] : null), gapMax: gapMaxMin(secs), am, pm, tln: finishConn(a.tln) };
  if (isCentre) { o.keskus = null; o.kool = null; }
  else {
    o.keskus = finishConn(a.kesk);
    let arrBy = null; for (const c of a.kesk.values()) if (c.arr <= 8 * 3600 + 15 * 60 && (arrBy == null || c.arr < arrBy)) arrBy = c.arr;
    o.kool = { arrBy0815: fmt(arrBy), ret: a.ret.size };
  }
  return o;
}

/** Ühe valla väljundfail. ctx = { feeds, maps, centres, dates, built, feedMeta, warnings, dupes } */
function buildMunicipality(ctx, muni) {
  const { feeds, dates } = ctx; const map = ctx.maps[muni];
  const centreKey = asulaKey(ctx.centres[muni]);
  const b0 = map.bbox || ringsBbox(map.outline);
  const bb = [b0[0] - 0.052, b0[1] - 0.027, b0[2] + 0.052, b0[3] + 0.027]; // ~3 km
  const stopsOut = new Map(), routes = {}, routeShapes = {}, shapes = {}, days = {};
  const asulaKeys = [...new Set(map.kylad.map((k) => asulaKey(k.n)))].sort((a, b) => a.localeCompare(b, "et"));
  for (const f of feeds) for (const s of f.stops) if (s.muni === muni) stopsOut.set(s.id, { id: s.id, n: s.n, ll: [+s.lat.toFixed(5), +s.lon.toFixed(5)], asula: s.asula, modes: new Set() });
  const dupes = {};
  for (const date of dates) {
    const stopAgg = new Map(); const asula = new Map(asulaKeys.map((k) => [k, emptyAgg()])); const vald = emptyAgg();
    const seen = new Map(); // dubleeritud reiside tuvastus eri voogude vahel
    for (const f of feeds) for (const [tid, rows] of f.tripRows) {
      const t = f.trips.get(tid); if (!t || !serviceActive(f, t.svc, date)) continue;
      const route = f.routes.get(t.route); const mode = route ? route.m : null;
      const evs = tripEvents(rows, f.stops, muni); if (!evs.length) continue;
      if (!mode) { ctx.warnings.add(`${f.name}: liini ${t.route} route_type ${route ? route.type : "?"} ei ole buss ega rong; jäetud välja.`); continue; }
      const sig = mode + "|" + (route.s || "") + "|" + evs.map((e) => e.r.dep + "@" + e.s.n).join(",");
      const prev = seen.get(sig); if (prev && prev !== f.name) { dupes[f.name] = (dupes[f.name] || 0) + 1; continue; }
      seen.set(sig, f.name);
      const gTid = f.name + ":" + tid, gRid = f.name + ":" + t.route;
      if (!routes[gRid]) routes[gRid] = { s: route.s, l: route.l, m: mode, op: route.op };
      if (t.shape) { const gS = f.name + ":" + t.shape; const rs = (routeShapes[gRid] = routeShapes[gRid] || []); if (!rs.includes(gS)) rs.push(gS); if (!(gS in shapes)) { const raw = f.shapes && f.shapes.get(t.shape); const c = raw && clipToBbox(raw, bb); shapes[gS] = c ? simplify(c, 10) : null; } }
      // peatused (liik märgitakse ka ainult saabumisega peatustele)
      for (const r of rows) { const so = stopsOut.get(f.stops[r.si].id); if (so) so.modes.add(mode); }
      for (const e of evs) {
        let a = stopAgg.get(e.s.id); if (!a) stopAgg.set(e.s.id, (a = { dep: 0, h: new Array(24).fill(0), hr: new Array(24).fill(0), routes: new Set(), secs: [] }));
        a.dep++; (mode === "rail" ? a.hr : a.h)[hourOf(e.r.dep)]++; a.routes.add(gRid); a.secs.push(e.r.dep);
      }
      // asulad + vald
      const groups = new Map();
      for (const e of evs) { if (e.s.asula) { let g = groups.get(e.s.asula); if (!g) groups.set(e.s.asula, (g = [])); g.push(e); } }
      const addGroup = (agg, ev, isCentre) => {
        agg.dep += ev.length; agg.trips.add(gTid); agg.firstDep.set(gTid, { t: ev[0].r.dep, m: mode });
        const tl = directTo(rows, f.stops, ev, (s) => s.tln); if (tl) agg.tln.set(gTid, tl);
        if (!isCentre) {
          const evNc = ev.filter((e) => !e.s.centre);
          const kc = directTo(rows, f.stops, evNc, (s) => s.centre && s.muni === muni); if (kc) agg.kesk.set(gTid, kc);
        }
      };
      for (const [k, ev] of groups) { const ag = asula.get(k); if (ag) addGroup(ag, ev, k === centreKey); }
      addGroup(vald, evs, false);
      // tagasisõit: keskusest 13:00–17:59 väljuv reis, mis peatub hiljem (mahaminek lubatud) asulas / mujal vallas
      const cdep = evs.find((e) => e.s.centre && inWin(e.r.dep, 13, 18));
      if (cdep) for (let k = cdep.i + 1; k < rows.length; k++) {
        const s = f.stops[rows[k].si]; if (s.muni !== muni || s.centre || rows[k].dr === "1") continue;
        if (s.asula && asula.has(s.asula)) asula.get(s.asula).ret.add(gTid);
        vald.ret.add(gTid);
      }
    }
    const dStop = {};
    for (const [id, a] of stopAgg) {
      const so = a.secs.slice().sort((p, q) => p - q); const md = stopsOut.get(id).modes;
      dStop[id] = { dep: a.dep, h: md.has("bus") ? a.h : undefined, hr: md.has("rail") ? a.hr : undefined, routes: [...a.routes].sort(), first: fmt(so[0]), last: fmt(so[so.length - 1]), gapMax: gapMaxMin(a.secs) };
    }
    const dAs = {}; for (const [k, a] of asula) dAs[k] = finishAgg(a, null, k === centreKey);
    days[date] = { stop: dStop, asula: dAs, vald: finishAgg(vald, null, false) };
  }
  ctx.dupes[muni] = dupes;
  // ainult peatused, kus perioodil peatub mõni reis (vood sisaldavad kogu riikliku peatuseregistri)
  const stops = [...stopsOut.values()].filter((s) => s.modes.size).map((s) => ({ ...s, modes: [...s.modes].sort() }));
  for (const k of Object.keys(shapes)) if (shapes[k] == null) { delete shapes[k]; for (const r of Object.values(routeShapes)) { const i = r.indexOf(k); if (i >= 0) r.splice(i, 1); } }
  const dayInfo = {}; for (const d of dates) dayInfo[d] = { wd: WD[weekday(d)], exceptions: feeds.reduce((s, f) => s + (f.exByDate.get(compact(d)) || 0), 0) };
  return {
    _doc: DOC(muni, ctx.centres[muni]), schema: 1,
    meta: { built: ctx.built, vald: muni, feeds: ctx.feedMeta, dates, dayInfo,
      dest: { tln: `Tallinna kesklinn: peatused kuni ${TLN.r / 1000} km Vabaduse väljakust (${TLN.lat}, ${TLN.lon}).`, keskus: `Vallakeskus: peatused OSM-i asustusüksuse „${ctx.centres[muni]}” polügoonis.` },
      dupTrips: dupes, warnings: [...ctx.warnings] },
    stops, routes, shapes, routeShapes, days,
  };
}
function DOC(muni, centre) {
  return `${muni} valla ühistransport GTFS-sõiduplaanide järgi (Transpordiamet/Remix). ` +
    "Väljumine (dep) = peatumine valla peatuses, millele samas reisis järgneb veel peatus ja kus pealeminek pole keelatud (pickup_type≠1). " +
    "Reis (trips) = unikaalne trip_id, mis väljub vähemalt korra asula/valla peatusest; sama reis mitme peatusega loetakse üks kord. " +
    "h/hr = bussi/rongi väljumised tunni kaupa (asulal ja vallal reisi esimese väljumise järgi); üle 24:00 ajad loetakse ööpäeva tunni järgi (25:10 → tund 1) sama teenusepäeva alla, ajaaknad (am, pm, 07–09, ≤08:15, 05–23) aga teenusepäeva aja järgi (25:10 ei ole hommik). " +
    "first/last = esimene/viimane väljumine (HH:MM); gapMax = suurim vahe minutites järjestikuste väljumiste vahel kell 05:00–23:00 (null, kui väljumisi alla kahe). am = reisid 06:00–08:59, pm = 15:00–18:59. " +
    "tln/keskus = otseühendused (sama reis, hilisem peatus, ümberistumiseta): trips = reiside arv, firstArr = varaseim saabumine, minMin = lühim sõiduaeg minutites asula viimasest väljumispeatusest esimese sihtpeatuseni, am7_9 = saabumised 07:00–08:59. " +
    `Vallakeskus = ${centre}; keskusasula enda keskus/kool = null. Valla tasemel arvestatakse keskusesse sõitu keskusest väljaspool asuvatest peatustest. ` +
    "kool.arrBy0815 = varaseim otsesaabumine keskusesse kuni 08:15 (null, kui sellist ei ole); kool.ret = reisid keskusest 13:00–17:59, mis peatuvad hiljem selles asulas. " +
    "stops = ainult peatused, kus perioodil peatub mõni reis. Peatuse päevaandmetes on h ainult bussipeatusel ja hr ainult rongipeatusel (vt stops[].modes). Päeval puuduv peatus days.stop all = sel päeval väljumisi ei ole. Kõik asulad on igas päevas olemas; 0 tähendab, et sõiduplaanis sel päeval väljumisi ei ole. Puuduv/teadmata väärtus = null. " +
    "Teenus kuupäeval D: calendar nädalapäev ja start≤D≤end, siis calendar_dates 1 lisab, 2 eemaldab. Asula = OSM asustusüksus, võti ilma sõnadeta alev/alevik/küla/linn (nt Hageri alevik ja Hageri küla → Hageri). " +
    "Kommertsliinid ja tellimusvedu võivad puududa; GTFS ei näita sõitjate arvu, täituvust ega hilinemisi.";
}

/* ---------- kogu töövoog ---------- */
async function prepare(feedDirs, maps, centres) {
  const feeds = feedDirs.map((x) => loadFeed(x.dir, x.name));
  classifyStops(feeds, maps, centres);
  const warn = [];
  for (const f of feeds) { await loadStopTimes(f, warn); await loadShapes(f); }
  return { feeds, warnings: new Set(warn) };
}
async function buildAll({ feedDirs, maps, centres, built, start, feedMeta }) {
  const { feeds, warnings } = await prepare(feedDirs, maps, centres);
  let dates, dropped = [];
  if (start) { dates = []; for (let i = 0; i < 14; i++) dates.push(addDays(start, i)); }
  else ({ dates, dropped } = pickDates(built.slice(0, 10), feeds));
  if (dropped.length) warnings.add(`Päevad ${dropped.join(", ")} jäävad mõne voo kehtivusest välja ja on välja jäetud.`);
  const fm = feeds.map((f) => ({ name: f.name, ...(feedMeta && feedMeta[f.name]), validFrom: f.validFrom, validTo: f.validTo,
    feedInfo: f.feedInfo ? { publisher: f.feedInfo.feed_publisher_name || null, version: f.feedInfo.feed_version || null, start: f.feedInfo.feed_start_date ? ymd(f.feedInfo.feed_start_date) : null, end: f.feedInfo.feed_end_date ? ymd(f.feedInfo.feed_end_date) : null } : null }));
  const ctx = { feeds, maps, centres, dates, built, feedMeta: fm, warnings, dupes: {} };
  const out = {}; for (const m of Object.keys(maps)) out[m] = buildMunicipality(ctx, m);
  return out;
}

async function download(feed, dir) {
  const { execFileSync } = require("child_process");
  const r = await fetch(feed.url);
  if (!r.ok) throw new Error(`${feed.url}: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(dir, { recursive: true }); const zip = path.join(dir, "feed.zip"); fs.writeFileSync(zip, buf);
  execFileSync("unzip", ["-o", "-q", zip, "-d", dir]);
  return { url: feed.url, lastModified: r.headers.get("last-modified") ? new Date(r.headers.get("last-modified")).toISOString() : null, fetched: new Date().toISOString(), bytes: buf.length };
}

async function main() {
  const args = process.argv.slice(2); const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const root = path.join(__dirname, ".."); const outDir = opt("--out") || path.join(root, "data/transit");
  const vallad = opt("--vallad") ? opt("--vallad").split(",") : VALLAD;
  const work = opt("--dir") || path.join(require("os").tmpdir(), "gtfs");
  const feedMeta = {}; const feedDirs = [];
  for (const f of FEEDS) {
    const dir = path.join(work, f.name);
    if (opt("--dir")) feedMeta[f.name] = { url: f.url, lastModified: null, fetched: null };
    else feedMeta[f.name] = await download(f, dir);
    feedDirs.push({ name: f.name, dir });
  }
  const maps = {}; for (const v of vallad) maps[v] = JSON.parse(fs.readFileSync(path.join(root, "data/map", v + ".json"), "utf8"));
  for (const k of Object.keys(feedMeta)) delete feedMeta[k].bytes;
  const out = await buildAll({ feedDirs, maps, centres: CENTRES, built: new Date().toISOString(), start: opt("--start"), feedMeta });
  fs.mkdirSync(outDir, { recursive: true });
  for (const [m, o] of Object.entries(out)) {
    const file = path.join(outDir, m + ".json"); fs.writeFileSync(file, JSON.stringify(o));
    const last = o.meta.dates[0] && o.days[o.meta.dates[0]];
    const withSvc = last ? Object.values(last.asula).filter((a) => a.trips > 0).length : 0;
    const sz = fs.statSync(file).size;
    console.log(`${m}: peatusi ${o.stops.length}, teenusega asulaid ${withSvc}/${Object.keys(last ? last.asula : {}).length} (${o.meta.dates[0]}), valla reise ${last ? last.vald.trips : "-"}, liine ${Object.keys(o.routes).length}, kujusid ${Object.keys(o.shapes).length}, ${(sz / 1024).toFixed(0)} kB, päevi ${o.meta.dates.length} ${o.meta.dates[0]}…${o.meta.dates[o.meta.dates.length - 1]}, duplikaate ${JSON.stringify(o.meta.dupTrips)}`);
  }
  const o0 = Object.values(out)[0];
  console.log("Vood: " + o0.meta.feeds.map((f) => `${f.name} ${f.validFrom}…${f.validTo} (LM ${f.lastModified})`).join("; "));
  if (o0.meta.warnings.length) console.log("HOIATUSED: " + o0.meta.warnings.join(" | "));
}

module.exports = { parseCsvLine, readCsv, streamCsv, toSec, fmt, hourOf, gapMaxMin, pointInRings, distM, asulaKey, modeOf, simplify, clipToBbox,
  serviceActive, feedValidity, pickDates, loadFeed, classifyStops, prepare, buildMunicipality, buildAll, CENTRES, TLN };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
