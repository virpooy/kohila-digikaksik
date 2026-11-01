/* Kaardi aluskiht OpenStreetMapist (Overpass API) → data/map.json.
   Käivitatakse GitHub Actionsis (.github/workflows/kaart.yml), sest Overpass ei ole kõigist keskkondadest kättesaadav.
   Kihid: valla piir, külade/asulate piirid, teed (5 klassi), raudtee ja peatused, veekogud ja jõed, mets, märgala, hoonestatud ala.
   Geomeetria lihtsustatakse (Douglas–Peucker) ja koordinaadid ümardatakse 5 kohani (~1 m). © OpenStreetMapi kaastöötajad, ODbL. */
"use strict";
const fs = require("fs"), path = require("path");
const VALLAD = (process.argv[2] ? process.argv[2].split(",") : ["Kohila", "Rae", "Rapla", "Marjamaa", "Kehtna"]).map(id => [id, { Marjamaa: "Märjamaa" }[id] ? "Märjamaa vald" : id + " vald"]);
const EP = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
const log = (...a) => console.log(...a);

async function op(q) {
  let last;
  for (let round = 0; round < 3; round++) for (const ep of EP) {
    try {
      const r = await fetch(ep, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "kohila-digikaksik (github.com/virpooy/kohila-digikaksik)" }, body: "data=" + encodeURIComponent(q) });
      if (!r.ok) throw new Error(ep + " " + r.status);
      const j = await r.json(); if (j.remark && /error|timed out/i.test(j.remark)) throw new Error(j.remark); return j;
    } catch (e) { last = e; log("  päring ebaõnnestus:", e.message); await new Promise(s => setTimeout(s, 5000 * (round + 1))); }
  }
  throw last;
}

/* ---------- geomeetria ---------- */
const r5 = v => Math.round(v * 1e5) / 1e5;
function dp(pts, tol, k) { /* pts [[lon,lat]], tol meetrites */
  if (pts.length < 3) return pts;
  const t = tol / 111320, keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let mx = 0, mi = -1; const ax = pts[a][0] * k, ay = pts[a][1], bx = pts[b][0] * k, by = pts[b][1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) { const px = pts[i][0] * k, py = pts[i][1]; let d; if (!L) d = Math.hypot(px - ax, py - ay); else { const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)); d = Math.hypot(px - ax - u * dx, py - ay - u * dy); } if (d > mx) { mx = d; mi = i; } }
    if (mx > t) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  return pts.filter((_, i) => keep[i]);
}
const flat = pts => pts.flatMap(p => [r5(p[0]), r5(p[1])]);
const ringArea = (r, k) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] * k) * r[i][1] - (r[i][0] * k) * r[j][1]; return Math.abs(s / 2) * 111320 * 111320; };
function stitch(ways) { /* ways: [[lon,lat]...] → suletud rõngad */
  const segs = ways.filter(w => w.length > 1).map(w => w.slice()), rings = [], key = p => p[0].toFixed(7) + "," + p[1].toFixed(7);
  while (segs.length) {
    let cur = segs.shift();
    for (let guard = 0; guard < 5000 && key(cur[0]) !== key(cur[cur.length - 1]); guard++) {
      const end = key(cur[cur.length - 1]), i = segs.findIndex(s => key(s[0]) === end || key(s[s.length - 1]) === end);
      if (i < 0) break; const s = segs.splice(i, 1)[0]; cur = cur.concat((key(s[0]) === end ? s : s.reverse()).slice(1));
    }
    if (cur.length > 3) rings.push(cur);
  }
  return rings;
}
const geomOf = w => (w.geometry || []).filter(Boolean).map(p => [p.lon, p.lat]);
function polys(el) { /* way või multipolygon-relatsioon → {outer:[rings], inner:[rings]} */
  if (el.type === "way") { const g = geomOf(el); return g.length > 3 ? { outer: [g], inner: [] } : null; }
  const m = el.members || [], o = stitch(m.filter(x => x.type === "way" && x.role !== "inner").map(geomOf)), i = stitch(m.filter(x => x.type === "way" && x.role === "inner").map(geomOf));
  return o.length ? { outer: o, inner: i } : null;
}
function inside(pt, ring) { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; }
const centroid = r => { let a = 0, x = 0, y = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += f; x += (r[j][0] + r[i][0]) * f; y += (r[j][1] + r[i][1]) * f; } return a ? [x / (3 * a), y / (3 * a)] : r[0]; };
/* sildipunkt: rõnga sees, võimalikult kaugel servast (lihtne ruudustikuotsing) */
function labelPt(r, k) {
  const c = centroid(r); let best = inside(c, r) ? c : null, bd = -1;
  const xs = r.map(p => p[0]), ys = r.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const dist = p => { let m = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const ax = r[j][0] * k, ay = r[j][1], bx = r[i][0] * k, by = r[i][1], px = p[0] * k, py = p[1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, u = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; m = Math.min(m, Math.hypot(px - ax - u * dx, py - ay - u * dy)); } return m; };
  if (best) bd = dist(best);
  for (let i = 1; i < 12; i++) for (let j = 1; j < 12; j++) { const p = [x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * j / 12]; if (inside(p, r)) { const d = dist(p); if (d > bd) { bd = d; best = p; } } }
  return best || c;
}

const RC = { motorway: 1, trunk: 1, primary: 2, secondary: 3, tertiary: 4, unclassified: 5, residential: 5, living_street: 5 };

async function vald(id, name) {
  log(`${name}: piir`);
  const B = await op(`[out:json][timeout:120];relation["boundary"="administrative"]["admin_level"="7"]["name"="${name}"];out geom;`);
  const rel = B.elements[0]; if (!rel) throw new Error(name + ": piiri ei leitud");
  const P = polys(rel), outer = P.outer.sort((a, b) => b.length - a.length), k = Math.cos(outer[0][0][1] * Math.PI / 180);
  const all = outer.flat(), lons = all.map(p => p[0]), lats = all.map(p => p[1]), m = 0.03;
  const bb = [Math.min(...lats) - m * .55, Math.min(...lons) - m, Math.max(...lats) + m * .55, Math.max(...lons) + m]; /* s,w,n,e */
  const bbox = bb.map(v => v.toFixed(5)).join(",");
  const inV = p => outer.some(r => inside(p, r));

  log(`${name}: teed, raudtee, vesi, piirid`);
  const A = await op(`[out:json][timeout:240][bbox:${bbox}];(
    way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street)(_link)?$"];
    way["railway"="rail"]; node["railway"~"^(station|halt)$"]; node["public_transport"="station"]["train"="yes"];
    way["waterway"~"^(river|canal|stream)$"]; way["natural"="water"]; relation["natural"="water"];
    relation["boundary"="administrative"]["admin_level"~"^(8|9|10)$"];);out geom;`);
  log(`${name}: maakate`);
  const C = await op(`[out:json][timeout:300][bbox:${bbox}];(
    way["landuse"~"^(residential|industrial|commercial|retail)$"]; relation["landuse"~"^(residential|industrial|commercial|retail)$"];
    way["natural"="wood"]; way["landuse"="forest"]; relation["natural"="wood"]; relation["landuse"="forest"];
    way["natural"="wetland"]; relation["natural"="wetland"];);out geom;`);

  const out = { name, bbox: [bb[1], bb[0], bb[3], bb[2]].map(r5), outline: outer.map(r => flat(dp(r, 15, k))), kylad: [], roads: [[], [], [], [], []], refs: [], rail: [], stations: [], river: [], stream: [], water: [], wood: [], wet: [], built: [] };
  const seenSt = new Set();
  for (const e of A.elements) {
    const t = e.tags || {};
    if (e.type === "node") { if (t.name && !seenSt.has(t.name)) { seenSt.add(t.name); out.stations.push({ n: t.name, p: [r5(e.lon), r5(e.lat)] }); } continue; }
    if (e.type === "way" && t.highway) { const c = RC[t.highway.replace("_link", "")]; const g = dp(geomOf(e), c <= 3 ? 6 : 10, k); if (g.length > 1) out.roads[c - 1].push(flat(g)); if (c <= 3 && t.ref && !t.highway.endsWith("_link")) out.refs.push({ r: t.ref, p: flat([g[Math.floor(g.length / 2)]]) }); continue; }
    if (e.type === "way" && t.railway === "rail") { const g = dp(geomOf(e), 6, k); if (g.length > 1) out.rail.push(flat(g)); continue; }
    if (e.type === "way" && t.waterway) { const g = dp(geomOf(e), 8, k); if (g.length > 1) (t.waterway === "stream" ? out.stream : out.river).push({ n: t.name || "", g: flat(g) }); continue; }
    if (t.natural === "water") { const P2 = polys(e); if (P2) P2.outer.forEach(r => { if (ringArea(r, k) > 800) out.water.push(flat(dp(r, 6, k))); }); continue; }
    if (t.boundary === "administrative" && t.name) {
      const P2 = polys(e); if (!P2) continue; const r = P2.outer.sort((a, b) => ringArea(b, k) - ringArea(a, k))[0], lp = labelPt(r, k);
      if (!inV(lp) || ringArea(r, k) > 0.9 * outer.reduce((s, q) => s + ringArea(q, k), 0)) continue;
      out.kylad.push({ n: t.name, lvl: +t.admin_level, kind: t["designation"] || t["place"] || "", p: [r5(lp[0]), r5(lp[1])], rings: P2.outer.map(q => flat(dp(q, 12, k))) });
    }
  }
  /* kui eri tasemetel on sama nimega piir, jäta madalaim tase */
  const byN = new Map(); out.kylad.forEach(x => { const o = byN.get(x.n); if (!o || x.lvl > o.lvl) byN.set(x.n, x); }); out.kylad = [...byN.values()].sort((a, b) => a.n.localeCompare(b.n, "et"));
  for (const e of C.elements) {
    const t = e.tags || {}, P2 = polys(e); if (!P2) continue;
    const kind = t.natural === "wetland" ? "wet" : (t.natural === "wood" || t.landuse === "forest") ? "wood" : "built", minA = kind === "built" ? 1500 : 20000, tol = kind === "built" ? 8 : 20;
    P2.outer.forEach(r => { if (ringArea(r, k) > minA) { const g = dp(r, tol, k); if (g.length > 3) out[kind].push(flat(g)); } });
  }
  log(`${name}: külasid ${out.kylad.length}, teid ${out.roads.map(r => r.length).join("/")}, raudteed ${out.rail.length}, jaamu ${out.stations.length}, jõgesid ${out.river.length}, veekogusid ${out.water.length}, metsi ${out.wood.length}, märgalasid ${out.wet.length}, hoonestatud ${out.built.length}`);
  return out;
}

async function region() {
  /* Eesti maakonnad ja omavalitsused (lihtsustatud ~300 m) voogude ja piirkondliku vaate jaoks */
  log("Eesti: maakonnad ja omavalitsused");
  const R = await op(`[out:json][timeout:600];area["ISO3166-1"="EE"][admin_level=2]->.ee;(relation["boundary"="administrative"]["admin_level"~"^(6|7)$"](area.ee););out geom;`);
  const out = { _doc: "Eesti maakonnad (admin_level 6) ja omavalitsused (7), OpenStreetMap, lihtsustatud ~300 m. p = sildipunkt.", attr: "© OpenStreetMapi kaastöötajad (ODbL)", date: new Date().toISOString().slice(0, 10), mk: [], kov: [] };
  for (const e of R.elements) { const t = e.tags || {}; if (!t.name) continue; const P = polys(e); if (!P) continue; const k = Math.cos(58.7 * Math.PI / 180);
    const big = P.outer.sort((a, b) => ringArea(b, k) - ringArea(a, k)), lp = labelPt(big[0], k);
    (t.admin_level === "6" ? out.mk : out.kov).push({ n: t.name, ehak: t["ref:ehak"] || t["EHAK:code"] || null, p: [r5(lp[0]), r5(lp[1])], rings: big.filter(r => ringArea(r, k) > 2e6).map(r => flat(dp(r, 300, k))) }); }
  const f = path.join(__dirname, "..", "data", "map", "region.json"); fs.writeFileSync(f, JSON.stringify(out)); log(`data/map/region.json maakondi ${out.mk.length}, omavalitsusi ${out.kov.length}, ${Math.round(fs.statSync(f).size / 1024)} kB`);
}
if (process.argv[2] === "region") { fs.mkdirSync(path.join(__dirname, "..", "data", "map"), { recursive: true }); region().catch(e => { console.log("viga:", e.message); process.exit(1); }); } else
(async () => {
  const dir = path.join(__dirname, "..", "data", "map"); fs.mkdirSync(dir, { recursive: true });
  for (const [id, name] of VALLAD) {
    const res = { _doc: "Kaardi aluskiht OpenStreetMapist (tools/osm_kaart.js). Koordinaadid [lon,lat,lon,lat,…], 5 komakohta, lihtsustatud. Teeklassid: 1 põhimaantee, 2 tugimaantee, 3 kõrvalmaantee, 4 ühendustee, 5 kohalik tänav/tee.", attr: "© OpenStreetMapi kaastöötajad (ODbL)", date: new Date().toISOString().slice(0, 10), ...(await vald(id, name)) };
    const f = path.join(dir, id + ".json"); fs.writeFileSync(f, JSON.stringify(res)); log(`data/map/${id}.json ${Math.round(fs.statSync(f).size / 1024)} kB`);
    await new Promise(s => setTimeout(s, 3000));
  }
})().catch(e => { console.log("viga:", e.message); process.exit(1); });
