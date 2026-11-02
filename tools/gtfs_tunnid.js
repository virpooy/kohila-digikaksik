/* Ühistranspordi väljumised tundide kaupa asula järgi → data/transit_tunnid.json.
   Käivitatakse GitHub Actionsis (.github/workflows/gtfs.yml), sest GTFS-failid ei ole kõigist keskkondadest kättesaadavad.
   Kasutus: node tools/gtfs_tunnid.js <kaust> [AAAA-KK-PP]
     <kaust> sisaldab lahtipakitud GTFS-voogusid alamkaustades (raplamaa/, harjumaa/, elron/, tallinn/) ja faili allikad.json
     ({ voog: { url, loetud } }). Kuupäev on analüüsipäev; vaikimisi esimene teisipäev alates homsest, mis ei ole riigipüha
     ja jääb kõigi voogude kehtivusaega.
   Reeglid: sama mis data/transit.json — peatused 1,2 km raadiuses asula keskpunktist (data/geo.json), ainult otseühendused,
   Tallinna kesklinn = 2,5 km Vabaduse väljakust, vallakeskus = 1 km valla keskusasula keskpunktist.
   Iga reis loetakse asulas üks kord (esimene asula peatus, kus saab peale minna). Isikuandmeid pole. */
"use strict";
const fs = require("fs"), path = require("path"), readline = require("readline");

const R_ASULA = 1200, R_TALLINN = 2500, R_KESKUS = 1000;
const TALLINN = [59.4339, 24.7445];                         /* Vabaduse väljak */
const KESKUS = { Kohila: "Kohila", Rae: "Jüri", Rapla: "Rapla", Kehtna: "Kehtna", "Märjamaa": "Märjamaa" };
const PYHAD = ["01-01", "02-24", "05-01", "06-23", "06-24", "08-20", "12-24", "12-25", "12-26"]; /* teisipäevale võivad sattuda ainult kindla kuupäevaga pühad */

function dist(a, b) { const k = Math.PI / 180, dLa = (b[0] - a[0]) * k, dLo = (b[1] - a[1]) * k * Math.cos((a[0] + b[0]) / 2 * k); return 6371000 * Math.hypot(dLa, dLo); }
function csvLine(s) { const out = []; let cur = "", q = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; } out.push(cur); return out; }
function readCsv(file) {
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(l => l.length);
  const h = csvLine(lines[0]).map(x => x.trim()); return lines.slice(1).map(l => { const v = csvLine(l), o = {}; h.forEach((k, i) => o[k] = (v[i] || "").trim()); return o; });
}
async function streamCsv(file, fn) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, "utf8"), crlfDelay: Infinity }); let h = null;
  for await (const raw of rl) { const l = h ? raw : raw.replace(/^﻿/, ""); if (!l) continue; const v = csvLine(l); if (!h) { h = {}; v.forEach((k, i) => h[k.trim()] = i); continue; } fn(v, h); }
}
const sec = t => { if (!t) return null; const [a, b, c] = t.split(":").map(Number); return a * 3600 + b * 60 + (c || 0); };
const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, "");
const iso = s => s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6, 8);

function loadFeed(dir) {
  const stops = readCsv(path.join(dir, "stops.txt")), trips = readCsv(path.join(dir, "trips.txt")), routes = readCsv(path.join(dir, "routes.txt"));
  if (!stops || !trips || !routes || !fs.existsSync(path.join(dir, "stop_times.txt"))) return null;
  const cal = readCsv(path.join(dir, "calendar.txt")) || [], cd = readCsv(path.join(dir, "calendar_dates.txt")) || [], fi = (readCsv(path.join(dir, "feed_info.txt")) || [])[0] || {};
  let lo = null, hi = null; for (const c of cal) { if (!lo || c.start_date < lo) lo = c.start_date; if (!hi || c.end_date > hi) hi = c.end_date; }
  for (const c of cd) if (c.exception_type === "1") { if (!lo || c.date < lo) lo = c.date; if (!hi || c.date > hi) hi = c.date; }
  return { dir, stops, trips, routes, cal, cd, alates: fi.feed_start_date || lo, kuni: fi.feed_end_date || hi, versioon: fi.feed_version || null };
}
function services(f, day) {
  const wd = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(iso(day) + "T12:00:00Z").getUTCDay()], s = new Set();
  for (const c of f.cal) if (c[wd] === "1" && c.start_date <= day && day <= c.end_date) s.add(c.service_id);
  for (const c of f.cd) if (c.date === day) { if (c.exception_type === "1") s.add(c.service_id); else s.delete(c.service_id); }
  return s;
}
function pickDay(feeds, given) {
  if (given) return given.replace(/-/g, "");
  const d = new Date(); d.setUTCDate(d.getUTCDate() + 1);
  for (let i = 0; i < 400; i++, d.setUTCDate(d.getUTCDate() + 1)) {
    const s = ymd(d); if (d.getUTCDay() !== 2 || PYHAD.includes(iso(s).slice(5))) continue;
    if (feeds.every(f => f.alates && f.kuni && f.alates <= s && s <= f.kuni)) return s;
  }
  throw new Error("Ühtegi teisipäeva, mis jääks kõigi voogude kehtivusaega, ei leitud");
}

async function main() {
  const root = process.argv[2]; if (!root) throw new Error("Kasutus: node tools/gtfs_tunnid.js <kaust> [AAAA-KK-PP]");
  const repo = path.join(__dirname, ".."), geo = JSON.parse(fs.readFileSync(path.join(repo, "data/geo.json"), "utf8"));
  const allikad = JSON.parse(fs.readFileSync(path.join(root, "allikad.json"), "utf8"));
  const names = Object.keys(allikad), feeds = [];
  for (const n of names) { const f = loadFeed(path.join(root, n)); if (!f) throw new Error("Voog puudub või on vigane: " + n + " (osalisi andmeid ei salvestata)"); f.name = n; feeds.push(f); }
  const day = pickDay(feeds, process.argv[3]);
  const places = geo.place.map(p => ({ ...p, keskus: geo.place.find(q => q.n === KESKUS[p.v] && q.v === p.v) || null }));
  const H = () => new Array(24).fill(0);
  const res = places.map(p => ({ asula: p.n, vald: p.v, peatused: new Set(), val: H(), rong: H(), tln: H(), kesk: H(), minT: null, minK: null, keskusPuudub: !p.keskus }));
  const stopOut = new Map();                                     /* nimi|lat|lon → { n, ll, val } */
  const log = [];

  for (const f of feeds) {
    const sv = services(f, day), rType = new Map(f.routes.map(r => [r.route_id, +r.route_type])), trip = new Map();
    for (const t of f.trips) if (sv.has(t.service_id)) trip.set(t.trip_id, { rong: f.name === "elron" || rType.get(t.route_id) === 2 || (rType.get(t.route_id) >= 100 && rType.get(t.route_id) < 200) });
    const role = new Map();                                       /* stop_id → { asulad:[i], tln, kesk:Set(i) } */
    for (const s of f.stops) {
      const ll = [+s.stop_lat, +s.stop_lon]; if (!isFinite(ll[0]) || !isFinite(ll[1])) continue;
      const r = { asulad: [], tln: dist(ll, TALLINN) <= R_TALLINN, kesk: new Set(), s };
      places.forEach((p, i) => { if (dist(ll, p.ll) <= R_ASULA) r.asulad.push(i); if (p.keskus && dist(ll, p.keskus.ll) <= R_KESKUS) r.kesk.add(i); });
      if (r.asulad.length || r.tln || r.kesk.size) role.set(s.stop_id, r);
    }
    /* koonda reisid: ainult huvipakkuvad peatused */
    const legs = new Map(), last = new Map(); let n = 0;
    await streamCsv(path.join(f.dir, "stop_times.txt"), (v, h) => {
      n++; const tid = v[h.trip_id]; if (!trip.has(tid)) return; const q = +v[h.stop_sequence]; if (!(last.get(tid) >= q)) last.set(tid, q);
      const r = role.get(v[h.stop_id]); if (!r) return;
      let a = legs.get(tid); if (!a) legs.set(tid, a = []);
      a.push({ seq: +v[h.stop_sequence], dep: sec(v[h.departure_time]), arr: sec(v[h.arrival_time]), pick: h.pickup_type == null ? "0" : v[h.pickup_type], drop: h.drop_off_type == null ? "0" : v[h.drop_off_type], r });
    });
    let reise = 0;
    for (const [tid, a] of legs) {
      a.sort((x, y) => x.seq - y.seq); const t = trip.get(tid), done = new Set();
      for (let k = 0; k < a.length; k++) {
        const st = a[k]; if (st.pick === "1" || st.dep == null || st.seq === last.get(tid)) continue; /* lõpp-peatusest ei väljuta */
        const hour = Math.floor(st.dep / 3600) % 24;
        const key = st.r.s.stop_name + "|" + (+st.r.s.stop_lat).toFixed(4) + "|" + (+st.r.s.stop_lon).toFixed(4);
        if (st.r.asulad.length) { let o = stopOut.get(key); if (!o) stopOut.set(key, o = { n: st.r.s.stop_name, ll: [+(+st.r.s.stop_lat).toFixed(5), +(+st.r.s.stop_lon).toFixed(5)], val: 0 }); o.val++; }
        for (const i of st.r.asulad) {
          if (done.has(i)) continue; done.add(i); reise++;
          const R = res[i]; R.peatused.add(key); R.val[hour]++; if (t.rong) R.rong[hour]++;
          let bestT = null, bestK = null;
          for (let m = k + 1; m < a.length; m++) {
            const e = a[m]; if (e.drop === "1" || e.arr == null) continue; if (e.r.asulad.includes(i)) continue;
            if (e.r.tln && bestT == null) bestT = (e.arr - st.dep) / 60;
            if (e.r.kesk.has(i) && bestK == null) bestK = (e.arr - st.dep) / 60;
          }
          if (bestT != null) { R.tln[hour]++; R.minT = R.minT == null ? bestT : Math.min(R.minT, bestT); }
          if (bestK != null) { R.kesk[hour]++; R.minK = R.minK == null ? bestK : Math.min(R.minK, bestK); }
        }
      }
    }
    log.push(`${f.name}: ${f.stops.length} peatust, ${trip.size} reisi analüüsipäeval, ${n} stop_times rida, ${reise} asula-väljumist; kehtib ${f.alates}–${f.kuni}`);
  }
  /* asula, mis on ise vallakeskus: ühendust iseendaga ei arvestata → null */
  const rows = res.map((R, i) => {
    const isK = places[i].keskus && places[i].keskus.n === R.asula, sum = a => a.reduce((x, y) => x + y, 0);
    return [R.asula, R.vald, R.peatused.size, R.val, R.rong, R.tln, R.minT == null ? null : Math.round(R.minT),
      isK || R.keskusPuudub ? null : R.kesk, isK || R.keskusPuudub || R.minK == null ? null : Math.round(R.minK), sum(R.val)];
  });
  const out = {
    _doc: "Ühistranspordi väljumised asula kaupa tundide (0–23) järgi analüüsipäeval. Allikas: Transpordiameti GTFS (Elron ja maakonnaliinid; vt allikad). " +
      "Peatused 1,2 km raadiuses asula keskpunktist (data/geo.json). Iga reis loetakse asulas üks kord. Ainult otseühendused (ümberistumisteta). " +
      "Tallinna kesklinn = 2,5 km Vabaduse väljakust; vallakeskus = 1 km valla keskusasula keskpunktist. Kommertsliinid ei ole andmetes. " +
      "null = ei kohaldu või puudub (nt vallakeskus ise; ühendust ei leitud — min_* puhul), mitte 0. Tunnid kohaliku aja järgi; pärast keskööd väljuvad reisid (GTFS 24:00+) on liidetud tunnile h−24.",
    analyysipaev: iso(day), analyysipaev_selgitus: "tavaline tööpäev (teisipäev), mille sõiduplaani loeti; see ei ole andmete uuendamise kuupäev",
    loetud: new Date().toISOString().slice(0, 10),
    allikad: feeds.map(f => ({ voog: f.name, url: allikad[f.name].url, loetud: allikad[f.name].loetud, kehtib_alates: f.alates ? iso(f.alates) : null, kehtib_kuni: f.kuni ? iso(f.kuni) : null, versioon: f.versioon })),
    fields: ["asula", "vald", "peatusi", "valjumised_tunnis", "neist_rongid_tunnis", "otse_tallinna_tunnis", "min_tallinna", "otse_vallakeskusesse_tunnis", "min_vallakeskusesse", "valjumisi_kokku"],
    rows,
    peatused: [...stopOut.values()].sort((a, b) => b.val - a.val).map(s => [s.n, s.ll, s.val]),
    peatused_fields: ["nimi", "lat_lon", "valjumisi_analyysipaeval"]
  };
  fs.writeFileSync(process.env.GTFS_OUT || path.join(repo, "data/transit_tunnid.json"), JSON.stringify(out) + "\n");
  console.log(log.join("\n"));
  console.log(`Analüüsipäev ${iso(day)}; ${rows.length} asulat, ${out.peatused.length} peatust.`);
  /* võrdlus olemasoleva data/transit.json-iga (ainult logisse) */
  try {
    const old = JSON.parse(fs.readFileSync(path.join(repo, "data/transit.json"), "utf8")), m = new Map(old.rows.map(r => [r[1] + "|" + r[0], r]));
    const diff = rows.map(r => { const o = m.get(r[1] + "|" + r[0]); return o ? `${r[0]} ${o[3]}→${r[9]}` : null; }).filter(Boolean);
    console.log("Väljumisi kokku (transit.json " + old.date + " → uus): " + diff.slice(0, 15).join("; ") + (diff.length > 15 ? " …" : ""));
  } catch (e) { console.log("Võrdlus transit.json-iga ei õnnestunud: " + e.message); }
}
if (require.main === module) main().catch(e => { console.error("VIGA: " + e.message); process.exit(1); });
module.exports = { csvLine, dist, services, pickDay };
