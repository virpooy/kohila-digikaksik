/* Kaart ja piirkonnad: üks kaardikomponent neljas režiimis.
   piirkonnad = rahvastik, haridusasutused, planeeringud · too = tööalased seosed · yt = ühistranspordi pakkumine · ligi = ligipääs ja koolitee.
   Kaart, graafik ja tabel kasutavad samu andmeid ja samu funktsioone (Logic), et tulemus oleks kooskõlas. */
const MAPL = { maakate: true, teed: true, kylad: true, koolid: true, dp: true, peatused: false, liinid: true };
const MAP = { cache: {}, sel: null, view: {}, ind: "popY", lig: "kool" };
const YT = { cur: null, date: null, bus: true, rail: true, from: 0, to: 24, dest: "all", thr: 10 };
const FLOW = { n: 10, anim: false, sel: null };
const INSTCAP = { /* Rae arengukava 2024–2030 lisa 1 lk 34 (2023/24), ametlik; põhikoolikohad */
  "jüri gümnaasium": [916, "Rae arengukava 2024–2030 lisa 1 (põhikool; gümnaasiumis lisaks 288)"], "lagedi kool": [349, "Rae arengukava 2024–2030 lisa 1"], "vaida põhikool": [216, "Rae arengukava 2024–2030 lisa 1"],
  "peetri kool": [648, "Rae arengukava 2024–2030 lisa 1 (Peetri Lasteaed-Põhikool)"], "järveküla kool": [648, "Rae arengukava 2024–2030 lisa 1"], "kindluse kool": [864, "Rae arengukava 2024–2030 lisa 1; juurdeehitus +155 (2027) ja +324 (2028)"] };
const nrm = s => String(s || "").toLowerCase().replace(/[^a-zõäöüšž0-9]/g, "");
async function getJSON(path) { if (!MAP.cache[path]) MAP.cache[path] = fetch(path).then(r => r.ok ? r.json().then(d => ({ ok: true, d })) : { ok: false, err: path + ": " + r.status }).catch(e => ({ ok: false, err: path + ": " + e.message })); const r = await MAP.cache[path]; if (!r.ok) delete MAP.cache[path]; return r; }
const flatPts = f => { const r = []; for (let i = 0; i < f.length; i += 2) r.push([f[i], f[i + 1]]); return r; };
const pip = (lon, lat, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c; } return c; };

/* ---------- sektsioonid ---------- */
const secKaart = el => mapView(el, "piirkonnad");
const secMapToo = el => mapView(el, "too");
const secMapYt = el => mapView(el, "yt");
const secMapLigi = el => mapView(el, "ligi");

async function mapView(el, mode) {
  const vid = isAgg(S.unit) ? "Kohila" : S.unit, need = mode === "too" ? ["data/map/region.json"] : ["data/map/" + vid + ".json"].concat(mode === "yt" || mode === "ligi" || mode === "piirkonnad" ? ["data/transit/" + vid + ".json"] : []);
  const pending = need.filter(p => !MAP.cache[p]);
  if (pending.length) el.innerHTML = `<div class="loading" role="status">Laadin kaardiandmeid… <span class="dim">(${need.map(p => p.replace("data/", "")).join(", ")})</span></div>`;
  const got = await Promise.all(need.map(getJSON)); if (!el.isConnected) return;
  const fail = got.map((g, i) => g.ok ? null : need[i]).filter(Boolean);
  const main = got[0];
  if (!main.ok && mode !== "too") { el.innerHTML = `${ttl("Kaart", "Kaardiandmeid ei õnnestunud laadida", "h2")}<div class="err">${esc(main.err)}</div><button type="button" class="btn" id="mapRetry">Proovi uuesti</button>`; $("#mapRetry").onclick = () => mapView(el, mode); return; }
  if (main.ok && main.d.date) MAP.osmDate = main.d.date;
  const ctxM = { el, mode, vid, M: main.ok ? main.d : null, T: mode !== "too" && got[1] && got[1].ok ? got[1].d : null, R: mode === "too" && main.ok ? main.d : null, fail };
  if (mode === "yt" || mode === "ligi" || mode === "piirkonnad") { YT.cur = ctxM.T; if (ctxM.T && (!YT.date || !ctxM.T.days[YT.date])) YT.date = ctxM.T.meta.dates.find(d => ctxM.T.meta.dayInfo[d].wd === "T") || ctxM.T.meta.dates[0]; }
  try { buildMap(ctxM); } catch (e) { console.error(e); el.innerHTML = `<div class="err">Kaardi joonistamine ebaõnnestus: ${esc(e.message)}</div><button type="button" class="btn" id="mapRetry">Proovi uuesti</button>`; $("#mapRetry").onclick = () => mapView(el, mode); }
}

/* ---------- andmekihid (sama funktsioon kaardile, graafikule ja tabelile) ---------- */
function places(c) {
  const { vid, M } = c, P0 = D.geo.place.filter(p => p.v === vid);
  const cnt = {}; (M ? M.kylad : []).forEach(k => cnt[asulaKey(k.n)] = (cnt[asulaKey(k.n)] || 0) + 1);
  c.dupKeys = new Set(Object.keys(cnt).filter(k => cnt[k] > 1));
  const fromOSM = M ? M.kylad.map(k => ({ n: cnt[asulaKey(k.n)] > 1 ? k.n : asulaKey(k.n), key: asulaKey(k.n), full: k.n, ll: [k.p[1], k.p[0]], rings: k.rings.map(flatPts) })) : [];
  if (!fromOSM.length) return P0.map(p => ({ n: p.n, full: p.n, ll: p.ll, rings: null }));
  return fromOSM;
}
function popLayer(c, Y) {
  const { vid } = c; if (!D.settlements[vid]) return null;
  const base = { ...params(), mig: "mean", extra: 0, fert: 0 }, P = proj(vid), PB = proj(vid, base);
  const LY = E.settlementLayer(ctx, vid, P, Y), L26 = E.settlementLayer(ctx, vid, P, 2026), LB = E.settlementLayer(ctx, vid, PB, Y), REL = D.settlements[vid];
  const m = new Map(); const dup = c.dupKeys || new Set();
  LY.forEach((r, i) => { const rr = REL[i]; m.set(dup.has(asulaKey(r.n)) ? r.n : asulaKey(r.n), { n: r.n, other: r.other, school: r.school, pop21: rr[1], k21: rr[2], w21: rr[3], o21: rr[4], popY: r.pop, pop26: L26[i].pop, la: r.la, pk: r.pk, base: LB[i].pop, series: null, i }); });
  return { m, Y, spark: n => { const o = m.get(n); if (!o) return null; const out = []; for (let y = 2026; y <= 2036; y++) out.push([y, E.settlementLayer(ctx, vid, P, y)[o.i].pop]); return out; } };
}
const IND = {
  pop21: { n: "Rahvaarv 31.12.2021 (REL)", u: "inimest", kind: "ametlik", v: o => o.pop21, size: o => o.pop21 },
  popY: { n: "Rahvaarv valitud aastal (prognoos)", u: "inimest", kind: "mudel", v: o => o.popY, size: o => o.popY },
  dAbs: { n: "Muutus 2026 → valitud aasta", u: "inimest", kind: "mudel", v: o => o.popY - o.pop26, size: o => Math.abs(o.popY - o.pop26), div: true },
  dPct: { n: "Muutus 2026 → valitud aasta, %", u: "%", kind: "mudel", v: o => o.popY / o.pop26 - 1, size: o => o.popY, div: true, pct: true },
  kids: { n: "Lasteaia- ja põhikooliealised (prognoos)", u: "last", kind: "mudel", v: o => o.la + o.pk, size: o => o.la + o.pk },
  old21: { n: "65+ osakaal 31.12.2021 (REL)", u: "%", kind: "ametlik", v: o => o.o21 / o.pop21, size: o => o.pop21, seq: true, pct: true },
  scen: { n: "Valitud stsenaarium vs baas (ajalooline keskmine)", u: "inimest", kind: "mudel", v: o => o.popY - o.base, size: o => Math.abs(o.popY - o.base), div: true }
};
function instList(c) {
  const { vid, M } = c, src = M && M.inst && M.inst.length ? M.inst.map(x => ({ n: x.n, t: x.t, ll: [x.p[1], x.p[0]], addr: x.addr, osm: x.osm })) : D.geo.inst.filter(x => x.v === vid).map(x => ({ n: x.n, t: x.t, ll: x.ll, addr: null, osm: null }));
  const EI = (D.edu.inst || []).filter(x => x.v === vid);
  return src.map(x => { const k = nrm(x.n), e = EI.find(q => nrm(q.n) === k || nrm(q.n).includes(k) || k.includes(nrm(q.n))), cap = INSTCAP[x.n.toLowerCase()] || null;
    return { ...x, id: "i:" + x.n, ehis: e || null, cap: cap ? cap[0] : null, capSrc: cap ? cap[1] : null }; });
}
const dpStage = s => /kehtest/.test(s) ? ["kehtestatud", 1] : /vastu/.test(s) ? ["vastu võetud", .75] : /algat/.test(s) ? ["algatatud", .25] : /ellu/.test(s) ? ["elluviimisel", 1] : ["menetluses", .5];
function ytAgg(T, sel) { /* valitud päev ja filtrid → üks objekt, mida kasutavad kaart, graafik ja tabel */
  const day = T && T.days[YT.date]; if (!day) return null;
  const f = o => { if (!o) return null; const h = YT.bus ? (o.h || []) : [], hr = YT.rail ? (o.hr || []) : [], w = a => Logic.inWindow(a.length ? a : new Array(24).fill(0), YT.from, YT.to); return { o, bus: w(h), rail: w(hr), n: w(h) + w(hr), h: h.length ? h : new Array(24).fill(0), hr: hr.length ? hr : new Array(24).fill(0) }; };
  return { day, f, sel: sel ? f(sel.kind === "stop" ? day.stop[sel.id] : sel.kind === "asula" ? day.asula[sel.id] : day.vald) : f(day.vald) };
}

/* ---------- ehitus ---------- */
function buildMap(c) {
  const { el, mode, vid, M, T, R } = c, Y = S.year, PL = mode === "too" ? [] : places(c), POP = mode === "too" ? null : popLayer(c, Y);
  const INST = mode === "too" ? [] : instList(c), DP = mode === "too" ? [] : dpOf(vid), dps = Logic.dpStatus(DP, LS.get("dpUnits", {}));
  if (MAP.sel && MAP.sel.vid !== vid) MAP.sel = null;
  const titles = { piirkonnad: "Kus inimesed elavad ja kus on teenused?", too: "Kus elanikud töötavad? (2021)", yt: "Milline on ühistranspordi pakkumine?", ligi: "Kui kaugel on kool, lasteaed ja peatus?" };
  /* leiupealkiri */
  let find = "";
  if (mode === "piirkonnad" && POP) { const arr = [...POP.m.values()].filter(o => !o.other), I = IND[MAP.ind], top = arr.slice().sort((a, b) => I.v(b) - I.v(a))[0];
    find = `${esc(I.n)}: suurim ${esc(asulaKey(top.n))} (${I.pct ? pc(I.v(top)) : f0(I.v(top))}${I.pct ? "" : " " + I.u})`; }
  if (mode === "too") { const C = D.commute, rows = Logic.commuteRows(C, vid), t = rows.rows.find(r => r.k === "tallinn"), s = rows.rows.find(r => r.k === "sama"); find = `${esc(ctx.units[vid].short)}: Tallinnas töötas ${pct(t.share)} ja oma vallas ${pct(s.share)} ${f0(rows.total)} hõivatust (31.12.2021)`; }
  if (mode === "yt") { const A = ytAgg(T); find = A ? `${esc(ctx.units[vid].short)}: ${fmtD(YT.date)} (${T.meta.dayInfo[YT.date].wd}) väljub valla peatustest ${f0(A.sel.n)} reisi ajavahemikus ${YT.from}–${YT.to}; ${Object.values(A.day.asula).filter(o => (YT.bus ? Logic.inWindow(o.h, YT.from, YT.to) : 0) + (YT.rail ? Logic.inWindow(o.hr, YT.from, YT.to) : 0) < YT.thr).length} asulas alla ${YT.thr} reisi` : "Ühistranspordi andmed puuduvad"; }
  if (mode === "ligi") find = "Kaugus on linnulennuline asula keskpunktist; ühistranspordiühendused sõiduplaani järgi (otseühendused)";
  const kick = `${esc(ctx.units[vid].name)}${isAgg(S.unit) ? " (maakonna asemel)" : ""} · ${mode === "too" ? "REL 2021" : "stsenaarium: " + scenTxt() + " · aasta " + Y}`;
  el.innerHTML = `${ttl(kick, titles[mode] + (find ? `<br><span style="font-size:.78em;font-weight:600">${find}</span>` : ""), "h2")}
  ${c.fail.length ? `<div class="callout"><span class="st na">◇</span><span>Osa andmeid jäi laadimata (${c.fail.map(esc).join(", ")}). Kaart töötab olemasolevate andmetega. <button type="button" class="btn ghost sm" id="mapRetry2">Proovi uuesti</button></span></div>` : ""}
  ${mode === "piirkonnad" && dps.state !== "pole" && dps.state !== "täielik" ? `<div class="callout"><span class="st warn">▲</span><span><b>${dps.label}.</b> ${dps.note}</span></div>` : ""}
  <div class="atl" id="atl">
    <div class="mapcol">
      <div class="maptools">
        <label class="srch"><span class="sr">Otsi kaardilt</span><input type="search" id="mapQ" list="mapQL" placeholder="Otsi asulat, kooli, peatust, planeeringut…"></label><datalist id="mapQL"></datalist>
        <button type="button" class="btn ghost sm" id="mapFit" title="Mahuta valitud objektid vaatesse">Mahuta valitud</button>
        <button type="button" class="btn ghost sm" id="mapFs">Täisekraan</button>
        <button type="button" class="btn ghost sm" id="mapClr">Tühjenda filtrid</button>
        <button type="button" class="btn ghost sm" id="mapSvgDl">Salvesta kaart (SVG)</button>
      </div>
      <div class="mapbox" id="mapBox" tabindex="0" role="application" aria-label="Kaart. Suumimiseks + ja −, liigutamiseks nooleklahvid, algvaade 0. Objektid on ka otsingus ja tabelis kaardi all.">
        <svg id="mapSvg" aria-hidden="true"><defs><marker id="arrH" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto-start-reverse"><path d="M0,0L10,5L0,10Z" fill="context-stroke"/></marker></defs><g id="mBase"></g><g id="mTop"></g></svg>
        <div class="mapctl"><button type="button" data-z="1.6" aria-label="Suurenda">+</button><button type="button" data-z="0.625" aria-label="Vähenda">−</button><button type="button" data-z="0" aria-label="Algvaade">⟲</button></div>
        <div class="mapscale" id="mapScale"></div><div class="mapattr">${mode === "too" ? "© OpenStreetMapi kaastöötajad · Statistikaamet RL21163" : "© OpenStreetMapi kaastöötajad" + (T ? " · Transpordiamet GTFS" : "")}</div>
        <div class="maphint" id="mapHint">Suumimiseks klõpsa kaardil või hoia Ctrl all</div>
      </div>
    </div>
    <aside class="atlside">
      <details class="pnl" ${innerWidth < 900 ? "" : "open"}><summary>Kihid, filtrid ja legend</summary><div class="in" id="mapCtl"></div></details>
      <details class="pnl" id="selPnl" ${innerWidth < 900 && !MAP.sel ? "" : "open"}><summary>Valitud objekt</summary><div class="in" id="mapInfo"></div></details>
    </aside>
  </div>
  <div class="g2 maplink"><div class="inst"><span class="kick" id="mapChartT"></span><div class="chart" id="mapChart"></div><div id="mapChartL"></div></div><div class="inst" id="mapTbl"></div></div>
  <div id="mapNote"></div>
  ${meta(mode === "too" ? ["commute", "osm"] : mode === "yt" ? ["gtfs", "osm"] : mode === "ligi" ? ["osm", "gtfs", "rel21"] : ["rel21", "model", "osm", "edu", "dp"])}`;
  if ($("#mapRetry2")) $("#mapRetry2").onclick = () => { c.fail.forEach(p => delete MAP.cache[p]); mapView(el, mode); };

  /* ---------- projektsioon ---------- */
  const box = $("#mapBox"), svg = $("#mapSvg"), W = W_(box);
  let outl, v0;
  if (mode === "too") { const ids = { Kohila: "Kohila vald", Rae: "Rae vald", Rapla: "Rapla vald", Marjamaa: "Märjamaa vald", Kehtna: "Kehtna vald" }; c.kovOf = id => R && R.kov.find(k => k.n === ids[id]);
    outl = R ? c.kovOf(vid).rings.map(flatPts) : []; v0 = [23.6, 58.2, 27.0, 59.55]; }
  else { outl = M ? M.outline.map(flatPts) : [D.geo.vald[vid].map(p => [p[1], p[0]])]; const ol = outl.flat(); v0 = [Math.min(...ol.map(p => p[0])), Math.min(...ol.map(p => p[1])), Math.max(...ol.map(p => p[0])), Math.max(...ol.map(p => p[1]))]; }
  const kc = Math.cos((v0[1] + v0[3]) / 2 * Math.PI / 180), Hmax = Math.min(680, Math.max(380, W * (W < 600 ? 1.2 : .7)));
  const pad = 16, S0 = Math.min((W - 2 * pad) / ((v0[2] - v0[0]) * kc), (Hmax - 2 * pad) / (v0[3] - v0[1])), H = W < 600 ? Math.round(Math.min(Hmax, Math.max(340, W * 1.05))) : Math.round(Math.min(Hmax, (v0[3] - v0[1]) * S0 + 2 * pad));
  const cx = (v0[0] + v0[2]) / 2, cy = (v0[1] + v0[3]) / 2, X = lon => W / 2 + (lon - cx) * kc * S0, Y_ = lat => H / 2 - (lat - cy) * S0;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
  const pth = (f, close) => { let s = ""; for (let i = 0; i < f.length; i += 2) s += (i ? "L" : "M") + X(f[i]).toFixed(1) + "," + Y_(f[i + 1]).toFixed(1); return s + (close ? "Z" : ""); };
  const many = (arr, close) => arr.map(f => pth(f, close)).join(""), NS = 'vector-effect="non-scaling-stroke"', ringP = r => pth(r.flat(), true);

  /* ---------- aluskiht ---------- */
  let g = `<rect x="${-W * 4}" y="${-H * 4}" width="${W * 9}" height="${H * 9}" fill="var(--m-land)"/>`;
  if (mode === "too") {
    if (R) { g += `<path d="${R.kov.map(k => many(k.rings, true)).join("")}" fill="var(--m-land)" stroke="var(--m-border)" stroke-width=".7" ${NS}/><path d="${R.mk.map(k => many(k.rings, true)).join("")}" fill="none" stroke="var(--m-case)" stroke-width="1.6" ${NS}/>`;
      ["Kohila", "Rae", "Rapla", "Marjamaa", "Kehtna"].forEach(id => { const k = c.kovOf(id); if (k) g += `<path d="${many(k.rings, true)}" fill="${id === vid ? "var(--m-built)" : "var(--m-wood)"}" stroke="var(--ink)" stroke-width="${id === vid ? 2 : 1}" stroke-opacity=".7" ${NS}/>`; }); }
  } else if (M) {
    if (MAPL.maakate) g += `<path d="${many(M.wood, true)}" fill="var(--m-wood)"/><path d="${many(M.wet, true)}" fill="var(--m-wet)"/><path d="${many(M.built, true)}" fill="var(--m-built)"/>`;
    g += `<path d="${many(M.water, true)}" fill="var(--m-water)"/><path d="${M.stream.map(s => pth(s.g)).join("")}" fill="none" stroke="var(--m-river)" stroke-width=".8" ${NS}/><path d="${M.river.map(s => pth(s.g)).join("")}" fill="none" stroke="var(--m-river)" stroke-width="2" ${NS}/>`;
    if (MAPL.kylad) g += `<path d="${M.kylad.map(k => many(k.rings, true)).join("")}" fill="none" stroke="var(--m-border)" stroke-width=".9" stroke-dasharray="3 3" ${NS}/>`;
    if (MAPL.teed) { const Rr = M.roads, mi = Rr[4], ti = Rr[3], mj = Rr[0].concat(Rr[1]), se = Rr[2];
      g += `<path d="${many(mi)}" fill="none" stroke="var(--m-road2)" stroke-width=".8" ${NS}/><path d="${many(ti.concat(se, mj))}" fill="none" stroke="var(--m-case)" stroke-width="3.6" stroke-linecap="round" ${NS}/>`;
      g += `<path d="${many(ti)}" fill="none" stroke="var(--m-road)" stroke-width="2" stroke-linecap="round" ${NS}/><path d="${many(se)}" fill="none" stroke="var(--m-road)" stroke-width="2.6" stroke-linecap="round" ${NS}/>`;
      g += `<path d="${many(mj)}" fill="none" stroke="var(--m-case)" stroke-width="5.4" stroke-linecap="round" ${NS}/><path d="${many(mj)}" fill="none" stroke="var(--m-major)" stroke-width="3.6" stroke-linecap="round" ${NS}/>`;
      g += `<path d="${many(M.rail)}" fill="none" stroke="var(--m-rail)" stroke-width="3" ${NS}/><path d="${many(M.rail)}" fill="none" stroke="var(--m-land)" stroke-width="1.6" stroke-dasharray="5 5" ${NS}/>`; }
    if (mode === "yt" && T && MAPL.liinid) { const used = new Set(); Object.values(ytAgg(T).day.stop).forEach(s => (s.routes || []).forEach(r => { const rt = T.routes[r]; if (rt && ((rt.m === "rail" && YT.rail) || (rt.m !== "rail" && YT.bus))) (T.routeShapes[r] || []).forEach(sh => used.add(sh + "|" + rt.m)); }));
      let bus = "", rail = ""; used.forEach(k => { const [sh, m] = k.split("|"), f = T.shapes[sh]; if (f) { if (m === "rail") rail += pth(f); else bus += pth(f); } });
      g += `<path d="${bus}" fill="none" stroke="var(--a-work)" stroke-width="2.2" stroke-opacity=".55" ${NS}/><path d="${rail}" fill="none" stroke="var(--a-old)" stroke-width="2.6" stroke-opacity=".7" ${NS}/>`; }
  }
  if (mode !== "too") { g += `<path d="M${-W * 4},${-H * 4}h${W * 9}v${H * 9}h${-W * 9}Z${outl.map(ringP).join("")}" fill="var(--bg)" fill-opacity=".62" fill-rule="evenodd"/>`;
    g += `<path d="${outl.map(ringP).join("")}" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-opacity=".75" ${NS}/>`; }
  $("#mBase").innerHTML = g;

  /* ---------- vaade ---------- */
  const key = mode + vid + W; const view = MAP.view[key] || (MAP.view[key] = { k: 1, tx: 0, ty: 0 });
  const sx = x => x * view.k + view.tx, sy = y => y * view.k + view.ty, SX = lon => sx(X(lon)), SY = lat => sy(Y_(lat));
  const selIs = (kind, id) => MAP.sel && MAP.sel.kind === kind && MAP.sel.id === id;
  const setSel = s => { MAP.sel = s ? { ...s, vid } : null; drawTop(); info(); linked(); if (s && $("#selPnl")) $("#selPnl").open = true; };
  c.api = { setSel };

  /* ---------- otsing ---------- */
  const SEARCH = [];
  PL.forEach(p => SEARCH.push(["Asula: " + p.n, { kind: "asula", id: p.n }]));
  INST.forEach(x => SEARCH.push([(x.t === "L" ? "Lasteaed: " : x.t === "V" ? "Kolledž: " : "Kool: ") + x.n, { kind: "inst", id: x.id }]));
  DP.forEach(d => SEARCH.push(["Planeering: " + d.name, { kind: "dp", id: d.id }]));
  if (T && (mode === "yt" || mode === "ligi")) T.stops.forEach(s => SEARCH.push(["Peatus: " + s.n + (s.asula ? " (" + s.asula + ")" : ""), { kind: "stop", id: s.id }]));
  if (mode === "too") ["Kohila", "Rae", "Rapla", "Marjamaa", "Kehtna"].forEach(id => SEARCH.push(["Vald: " + ctx.units[id].name, { kind: "vald", id }]));
  $("#mapQL").innerHTML = SEARCH.map(s => `<option value="${esc(s[0])}">`).join("");
  $("#mapQ").addEventListener("change", e => { const v = e.target.value.trim().toLowerCase(), hit = SEARCH.find(s => s[0].toLowerCase() === v) || SEARCH.find(s => s[0].toLowerCase().includes(v)); if (hit) { if (hit[1].kind === "vald") { S.unit = hit[1].id; render(); return; } setSel(hit[1]); fit(); } else { e.target.setCustomValidity("Ei leitud"); e.target.reportValidity(); setTimeout(() => e.target.setCustomValidity(""), 1500); } });

  /* ---------- objektide asukohad ---------- */
  const llOf = s => { if (!s) return null; if (s.kind === "asula") { const p = PL.find(q => q.n === s.id); return p && p.ll; } if (s.kind === "inst") { const x = INST.find(q => q.id === s.id); return x && x.ll; }
    if (s.kind === "stop" && T) { const x = T.stops.find(q => q.id === s.id); return x && x.ll; } if (s.kind === "dp") { const d = DP.find(q => q.id === s.id), p = d && (PL.find(q => q.n === asulaKey(d.asula)) || PL.find(q => asulaKey(d.asula).includes(q.n))); return p && p.ll; }
    if (s.kind === "vald" && R) { const k = c.kovOf(s.id); return k && [k.p[1], k.p[0]]; } return null; };

  /* ---------- pealmine kiht ---------- */
  function drawTop() {
    $("#mBase").setAttribute("transform", `translate(${view.tx.toFixed(2)},${view.ty.toFixed(2)}) scale(${view.k.toFixed(4)})`);
    const boxes = [], free = (x, y, w, h) => { if (x < 2 || y < 2 || x + w > W - 2 || y + h > H - 18) return false; if (boxes.some(b => x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + h > b[1])) return false; boxes.push([x, y, w, h]); return true; };
    let t = "", labs = "", hl = "";
    const vis = (x, y) => x > -30 && x < W + 30 && y > -30 && y < H + 30;
    if (mode === "piirkonnad" || mode === "ligi") {
      /* asula ringid: pindala ∝ väärtus */
      const I = IND[MAP.ind], arr = POP ? [...POP.m.values()].filter(o => !o.other) : [], mxS = Math.max(1, ...arr.map(o => mode === "ligi" ? o.popY : I.size(o)));
      const Rmax = Math.min(26, W / 30) * Math.min(1.8, Math.sqrt(view.k));
      const col = (o, p) => { if (mode === "ligi") return ligCol(o, p); if (I.div) { const v = I.v(o); return v > 0 ? "var(--gain)" : v < 0 ? "var(--loss)" : "var(--ref)"; } if (I.seq) { const v = I.v(o); return v > .25 ? "var(--a-old)" : v > .18 ? "var(--warn)" : "var(--a-work)"; } return "var(--a-work)"; };
      const items = PL.map(p => { const o = POP && POP.m.get(p.n); return { p, o, x: SX(p.ll[1]), y: SY(p.ll[0]) }; }).sort((a, b) => ((b.o && b.o.popY) || 0) - ((a.o && a.o.popY) || 0));
      items.forEach(it => { const { p, o, x, y } = it; if (!vis(x, y)) return;
        const sv = o && !o.other ? (mode === "ligi" ? o.popY : I.size(o)) : null, r = sv != null && sv > 0 ? Math.max(3, Rmax * Math.sqrt(sv / mxS)) : 3.5; it.r = r;
        const val = o && !o.other ? (mode === "ligi" ? ligVal(p) : I.v(o)) : null, sel = selIs("asula", p.n);
        const tip = `<b>${esc(p.n)}</b><br>` + (o && !o.other ? (mode === "ligi" ? ligTip(p) : `${esc(I.n)}: <b>${I.pct ? pc(val) : (I.div ? sg(val) : f0(val))}</b>${I.pct ? "" : " " + I.u}${I.kind === "mudel" ? "<br><i>tuletatud valla prognoosist</i>" : ""}`) : "koondatud reale „Muud külad” (alla 200 elaniku 2021)") + "<br><i>klõpsa: üksikasjad</i>";
        if (mode === "ligi" && sv == null) { const cc = ligCol(null, p); t += `<circle cx="${x}" cy="${y}" r="5" fill="${cc}" fill-opacity=".7" stroke="${cc}" data-tip="${esc(`<b>${esc(p.n)}</b><br>` + ligTip(p))}" data-sel="asula|${esc(p.n)}" style="cursor:pointer"/>`; }
        else if (sv != null) t += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col(o, p)}" fill-opacity=".38" stroke="${col(o, p)}" stroke-width="1.3" data-tip="${esc(tip)}" data-sel="asula|${esc(p.n)}" style="cursor:pointer"/>`;
        else t += `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--m-land)" stroke="var(--dim)" stroke-width="1.2" data-tip="${esc(tip)}" data-sel="asula|${esc(p.n)}" style="cursor:pointer"/>`;
        if (sel) hl += `<circle cx="${x}" cy="${y}" r="${r + 5}" fill="none" stroke="var(--focus)" stroke-width="3"/>`;
        boxes.push([x - r, y - r, 2 * r, 2 * r]); });
      if (mode === "ligi" && MAP.sel && MAP.sel.kind === "asula") { const p = PL.find(q => q.n === MAP.sel.id); if (p) { const a = ligNear(p); [["k", "var(--ink)"], ["l", "var(--a-kid)"], ["s", "var(--a-work)"]].forEach(([k, cc]) => { const n = a[k]; if (n) t += `<line x1="${SX(p.ll[1])}" y1="${SY(p.ll[0])}" x2="${SX(n.o.ll[1])}" y2="${SY(n.o.ll[0])}" stroke="${cc}" stroke-width="2" stroke-dasharray="4 3" data-tip="${esc("linnulend " + (n.d / 1000).toFixed(1).replace(".", ",") + " km")}"/>`; }); } }
      if (MAPL.koolid || mode === "ligi") INST.forEach(q => { const x = SX(q.ll[1]), y = SY(q.ll[0]); if (!vis(x, y)) return; const sel = selIs("inst", q.id), tip = `<b>${esc(q.n)}</b><br>${q.t === "L" ? "lasteaed" : q.t === "V" ? "kolledž" : "kool"}${q.addr ? " · " + esc(q.addr) : ""}<br><i>asukoht: OpenStreetMap</i>`;
        t += q.t === "L" ? `<path d="M${x},${y - 7}L${x + 7},${y + 5.5}L${x - 7},${y + 5.5}Z" fill="var(--a-kid)" stroke="var(--surf)" stroke-width="1.5" data-tip="${esc(tip)}" data-sel="inst|${esc(q.id)}" style="cursor:pointer"/>` : `<rect x="${x - 5.5}" y="${y - 5.5}" width="11" height="11" fill="var(--ink)" stroke="var(--surf)" stroke-width="1.5" data-tip="${esc(tip)}" data-sel="inst|${esc(q.id)}" style="cursor:pointer"/>`;
        if (sel) hl += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="var(--focus)" stroke-width="3"/>`; boxes.push([x - 7, y - 7, 14, 14]); });
      if (mode === "piirkonnad" && MAPL.dp) DP.forEach((d, i) => { const ll = llOf({ kind: "dp", id: d.id }); if (!ll) return; const x = SX(ll[1]) + 12 + i * 5, y = SY(ll[0]) - 12, [st, fill] = dpStage(d.stage), stt = dps.list.find(q => q.id === d.id), sel = selIs("dp", d.id);
        const tip = `<b>${esc(d.name)}</b><br>${esc(d.stage)} · ${stt.status === "arvutamata" ? "eluruumid sisestamata – mõju arvutamata" : stt.status === "arvutatud" ? stt.units + " eluruumi" : "elamuid ei kavandata"}<br><i>asukoht ligikaudne: asula keskpunkt (planeeringu ala polügooni ei ole)</i>`;
        t += `<path d="M${x},${y - 8}L${x + 8},${y}L${x},${y + 8}L${x - 8},${y}Z" fill="var(--loss)" fill-opacity="${fill}" stroke="var(--loss)" stroke-width="2" stroke-dasharray="${stt.status === "arvutamata" ? "3 2" : "none"}" data-tip="${esc(tip)}" data-sel="dp|${esc(d.id)}" style="cursor:pointer"/>`;
        if (sel) hl += `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="var(--focus)" stroke-width="3"/>`; boxes.push([x - 9, y - 9, 18, 18]); });
      /* sildid */
      items.forEach(o => { if (o.r == null) return; const big = o.o && o.o.popY > mxS * .3, fs = big ? 13 : o.o && !o.o.other ? 11.5 : 10.5, w = o.p.n.length * fs * .56, h = fs + 2, cls = o.o && !o.o.other ? "m-lab" : "m-kyla";
        if (!(o.o && !o.o.other) && view.k < 1.6 && !selIs("asula", o.p.n)) return;
        const cand = [[o.x + o.r + 4, o.y - h / 2], [o.x - o.r - 4 - w, o.y - h / 2], [o.x - w / 2, o.y - o.r - h - 2], [o.x - w / 2, o.y + o.r + 2]], cc = cand.find(([x, y]) => free(x, y, w, h));
        if (cc) labs += `<text x="${cc[0]}" y="${cc[1] + fs - 1}" class="${cls}" style="font-size:${fs}px;${big ? "font-weight:700" : ""}${cls === "m-kyla" ? ";font-style:normal" : ""}" pointer-events="none">${esc(o.p.n)}</text>`; });
    }
    if (mode === "yt" && T) {
      const A = ytAgg(T), mx = Math.max(1, ...T.stops.map(s => { const a = A.f(A.day.stop[s.id]); return a ? a.n : 0; }));
      T.stops.forEach(s => { const a = A.f(A.day.stop[s.id]); if (!a || !a.n) return; const rail = s.modes.includes("rail"); if ((rail && !YT.rail && !s.modes.includes("bus")) || (!rail && !YT.bus)) return;
        const x = SX(s.ll[1]), y = SY(s.ll[0]); if (!vis(x, y)) return; const r = Math.max(2.5, 11 * Math.sqrt(a.n / mx) * Math.min(1.6, Math.sqrt(view.k))), sel = selIs("stop", s.id);
        const tip = `<b>${esc(s.n)}</b> (${rail ? "rongipeatus" : "bussipeatus"})${s.asula ? "<br>" + esc(s.asula) : ""}<br>${fmtD(YT.date)}, ${YT.from}–${YT.to}: <b>${a.n}</b> väljumist (sõiduplaan)`;
        t += rail ? `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" fill="var(--a-old)" fill-opacity=".75" stroke="var(--surf)" data-tip="${esc(tip)}" data-sel="stop|${esc(s.id)}" style="cursor:pointer"/>` : `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--a-work)" fill-opacity=".65" stroke="var(--surf)" data-tip="${esc(tip)}" data-sel="stop|${esc(s.id)}" style="cursor:pointer"/>`;
        if (sel) hl += `<circle cx="${x}" cy="${y}" r="${r + 5}" fill="none" stroke="var(--focus)" stroke-width="3"/>`; boxes.push([x - r, y - r, 2 * r, 2 * r]); });
      PL.forEach(p => { const a = A.f(A.day.asula[p.key || p.n]), x = SX(p.ll[1]), y = SY(p.ll[0]); if (!vis(x, y)) return; const n = a ? a.n : 0, low = n < YT.thr;
        t += `<circle cx="${x}" cy="${y}" r="5" fill="${low ? "var(--surf)" : "var(--ink)"}" stroke="${low ? "var(--crit)" : "var(--ink)"}" stroke-width="2" data-tip="${esc(`<b>${esc(p.n)}</b><br>${a ? `${n} reisi (${YT.from}–${YT.to})` : "asula piires peatusi ei ole"}${low ? `<br>alla lävendi ${YT.thr} (kokkulepe)` : ""}`)}" data-sel="asula|${esc(p.n)}" style="cursor:pointer"/>`;
        if (selIs("asula", p.n)) hl += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="var(--focus)" stroke-width="3"/>`;
        const w = p.n.length * 6.3; if ((view.k > 1.5 || (a && a.n > 20)) && free(x + 7, y - 7, w, 13)) labs += `<text x="${x + 7}" y="${y + 4}" class="m-lab" style="font-size:11px" pointer-events="none">${esc(p.n)}</text>`; boxes.push([x - 5, y - 5, 10, 10]); });
    }
    if (mode === "too") {
      const C = D.commute, flows = [], ids = ["Kohila", "Rae", "Rapla", "Marjamaa", "Kehtna"];
      ids.forEach(id => { const k = c.kovOf(id); if (!k) return; ["tallinn", "tartu"].forEach(d => flows.push({ id, d, v: C.parts[id][d], from: [k.p[1], k.p[0]], to: C.loc[d].ll })); });
      const show = flows.sort((a, b) => b.v - a.v).slice(0, FLOW.n), mx = Math.max(...flows.map(f => f.v));
      show.forEach(f => { const x1 = SX(f.from[1]), y1 = SY(f.from[0]), x2 = SX(f.to[1]), y2 = SY(f.to[0]), dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, bend = .18, mxp = (x1 + x2) / 2 - dy * bend, myp = (y1 + y2) / 2 + dx * bend;
        const w = 1.5 + 13 * Math.sqrt(f.v / mx), on = f.id === vid, sel = FLOW.sel === f.id + "|" + f.d, sh = (C.parts[f.id][f.d] / C.raw[f.id].kokku);
        const tip = `<b>${esc(ctx.units[f.id].name)} → ${esc(C.loc[f.d].n)}</b><br>${f0(f.v)} hõivatut (${pct(sh)} valla ${f0(C.raw[f.id].kokku)} hõivatust)<br>REL 31.12.2021 · elukoht–töökoht, mitte reiside arv<br><i>joon näitab seost, mitte marsruuti</i>`;
        t += `<path d="M${x1},${y1}Q${mxp},${myp} ${x2},${y2}" fill="none" stroke="${on ? "var(--loss)" : "var(--ref)"}" stroke-opacity="${on ? .85 : .45}" stroke-width="${w}" stroke-linecap="round" marker-end="url(#arrH)" class="${FLOW.anim ? "flowanim" : ""}" data-tip="${esc(tip)}" data-sel="flow|${f.id}|${f.d}" style="cursor:pointer"/>`;
        if (sel) hl += `<path d="M${x1},${y1}Q${mxp},${myp} ${x2},${y2}" fill="none" stroke="var(--focus)" stroke-width="${w + 5}" stroke-opacity=".5" pointer-events="none"/>`; });
      ids.forEach(id => { const k = c.kovOf(id); if (!k) return; const x = SX(k.p[0]), y = SY(k.p[1]), s = C.parts[id].sama, r = 3 + 12 * Math.sqrt(s / 3300), on = id === vid;
        t += `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--a-work)" fill-opacity="${on ? .7 : .35}" stroke="var(--ink)" stroke-width="${on ? 2 : 1}" data-tip="${esc(`<b>${esc(ctx.units[id].name)}</b><br>oma vallas töötas ${f0(s)} (${pct(s / C.raw[id].kokku)})`)}" data-sel="vald|${id}" style="cursor:pointer"/>`;
        if (free(x + r + 3, y - 7, ctx.units[id].short.length * 7, 14)) labs += `<text x="${x + r + 3}" y="${y + 4}" class="m-lab" style="font-size:12px;${on ? "font-weight:700" : ""}" pointer-events="none">${esc(ctx.units[id].short)}</text>`; });
      ["tallinn", "tartu"].forEach(d => { const L = C.loc[d], x = SX(L.ll[1]), y = SY(L.ll[0]); t += `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="var(--ink)" data-tip="${esc(`<b>${L.n}</b><br>${L.note}`)}"/><text x="${x + 9}" y="${y + 5}" class="m-lab" style="font-size:13px;font-weight:700">${L.n}</text>`; });
    }
    $("#mTop").innerHTML = hl + t + labs;
    const mpp = 111320 / (S0 * view.k), nice = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000].find(m => m / mpp > 70) || 50000;
    $("#mapScale").innerHTML = `<span style="width:${(nice / mpp).toFixed(0)}px"></span>${nice >= 1000 ? nice / 1000 + " km" : nice + " m"}`;
  }

  /* ---------- ligipääs (linnulend keskpunktist + sõiduplaani otseühendused) ---------- */
  const STOPS = T ? T.stops : [];
  function ligNear(p) { return { k: Logic.nearest(p.ll, INST, o => o.t === "K"), l: Logic.nearest(p.ll, INST, o => o.t === "L"), s: Logic.nearest(p.ll, STOPS, o => o.modes.includes("bus")), r: Logic.nearest(p.ll, STOPS, o => o.modes.includes("rail")) }; }
  const LIG = { kool: ["Kaugus lähima koolini (linnulend)", "km"], lasteaed: ["Kaugus lähima lasteaiani (linnulend)", "km"], peatus: ["Kaugus lähima bussipeatuseni (linnulend)", "km"], tln: ["Kiireim otseühendus Tallinna kesklinna", "min"], kool815: ["Viimane otseühendus vallakeskusesse kella 8.15-ks", "kell"] };
  function ligVal(p) { const a = ligNear(p), d = T && T.days[YT.date] && T.days[YT.date].asula[p.key || p.n];
    return MAP.lig === "kool" ? a.k && a.k.d / 1000 : MAP.lig === "lasteaed" ? a.l && a.l.d / 1000 : MAP.lig === "peatus" ? a.s && a.s.d / 1000 : MAP.lig === "tln" ? d && d.tln && d.tln.minMin : d && d.kool && d.kool.arrBy0815; }
  const ligFmt = v => v == null ? "puudub" : MAP.lig === "kool815" ? v : MAP.lig === "tln" ? v + " min" : v.toFixed(1).replace(".", ",") + " km";
  function ligCol(o, pp) { const p = pp || PL.find(q => q.n === asulaKey(o.n)); if (!p) return "var(--ref)"; const v = ligVal(p); if (v == null) return "var(--dim)";
    if (MAP.lig === "kool815") return "var(--ok)"; const lim = MAP.lig === "tln" ? [45, 70] : MAP.lig === "peatus" ? [1, 2.5] : [3, 7]; return v <= lim[0] ? "var(--ok)" : v <= lim[1] ? "var(--warn)" : "var(--crit)"; }
  const ligTip = p => `${esc(LIG[MAP.lig][0])}: <b>${ligFmt(ligVal(p))}</b>${MAP.lig === "kool815" && ligVal(p) == null ? " (otseühendust ei ole)" : ""}<br><i>${/km/.test(LIG[MAP.lig][1]) ? "linnulend asula keskpunktist" : "sõiduplaan " + fmtD(YT.date) + ", otseühendus"}</i>`;

  /* ---------- juhtpaneel ---------- */
  function controls() {
    const chip = (k, t) => `<button type="button" data-l="${k}" aria-pressed="${MAPL[k]}">${t}</button>`;
    const yearSel = `<div class="f"><label for="mYear">Aasta</label><select id="mYear">${Array.from({ length: 11 }, (_, i) => 2026 + i).map(y => `<option ${y === S.year ? "selected" : ""}>${y}</option>`).join("")}</select><small>sama aasta kehtib päises</small></div>`;
    const dateSel = T ? `<div class="f"><label for="mDate">Analüüsipäev</label><select id="mDate">${T.meta.dates.map(d => `<option value="${d}" ${d === YT.date ? "selected" : ""}>${fmtD(d)} ${T.meta.dayInfo[d].wd}${T.meta.dayInfo[d].exceptions ? " (erand)" : ""}</option>`).join("")}</select><small>sõiduplaan kehtib ${fmtD(T.meta.feeds[0].validFrom)}–${fmtD(T.meta.feeds[0].validTo)}; andmed hangitud ${fmtD(String(T.meta.built).slice(0, 10))}</small></div>` : `<p class="small"><span class="missing">GTFS-andmed puuduvad</span></p>`;
    let h = "";
    if (mode === "piirkonnad") h = `<div class="f"><label for="mInd">Näitaja</label><select id="mInd">${Object.entries(IND).map(([k, v]) => `<option value="${k}" ${k === MAP.ind ? "selected" : ""}>${esc(v.n)}</option>`).join("")}</select></div>${yearSel}
      <div class="tabs" role="group" aria-label="Kaardikihid">${chip("maakate", "Mets ja hoonestus")}${chip("teed", "Teed ja raudtee")}${chip("kylad", "Külade piirid")}${chip("koolid", "Koolid ja lasteaiad")}${chip("dp", "Planeeringud")}</div>`;
    if (mode === "yt") h = `${dateSel}<div class="tabs" role="group" aria-label="Liik"><button type="button" data-yt="bus" aria-pressed="${YT.bus}">Buss</button><button type="button" data-yt="rail" aria-pressed="${YT.rail}">Rong</button>${chip("liinid", "Liinid")}</div>
      <div class="form" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="f"><label for="mFrom">Alates, kell</label><select id="mFrom">${Array.from({ length: 24 }, (_, i) => `<option ${i === YT.from ? "selected" : ""}>${i}</option>`).join("")}</select></div><div class="f"><label for="mTo">Kuni, kell</label><select id="mTo">${Array.from({ length: 24 }, (_, i) => i + 1).map(i => `<option ${i === YT.to ? "selected" : ""}>${i}</option>`).join("")}</select></div></div>
      <div class="f"><label for="mThr">Lävend, reisi päevas/vahemikus</label><input type="number" id="mThr" min="1" max="200" value="${YT.thr}"><small>kokkuleppeline ja muudetav, mitte teenuse kvaliteedi norm</small></div>
      <div class="f"><label for="mDest">Sihtkoht tabelis</label><select id="mDest">${[["all", "kõik väljumised"], ["tln", "Tallinna kesklinn (otse)"], ["keskus", "vallakeskus (otse)"]].map(([k, t]) => `<option value="${k}" ${k === YT.dest ? "selected" : ""}>${t}</option>`).join("")}</select><small>ümberistumisega teekondi ei arvutata</small></div>`;
    if (mode === "ligi") h = `<div class="f"><label for="mLig">Näitaja</label><select id="mLig">${Object.entries(LIG).map(([k, v]) => `<option value="${k}" ${k === MAP.lig ? "selected" : ""}>${v[0]}</option>`).join("")}</select></div>${dateSel}`;
    if (mode === "too") h = `<div class="f"><label for="mN">Näidatavaid voogusid</label><select id="mN">${[2, 4, 6, 10].map(n => `<option ${n === FLOW.n ? "selected" : ""}>${n}</option>`).join("")}</select><small>kokku 10 paigutatavat voogu (5 valda × Tallinn, Tartu)</small></div>
      <button type="button" class="btn ghost sm" id="mAnim" aria-pressed="${FLOW.anim}">${FLOW.anim ? "Peata suunamärgid" : "Näita liikuvaid suunamärke"}</button><small class="dim">Animatsioon näitab ainult suunda, mitte kiirust ega liiklust.</small>`;
    $("#mapCtl").innerHTML = h + `<div class="maplegend" id="mapLeg"></div>`;
    $("#mapCtl").onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.l) { MAPL[b.dataset.l] = !MAPL[b.dataset.l]; buildMap(c); } if (b.dataset.yt) { YT[b.dataset.yt] = !YT[b.dataset.yt]; buildMap(c); } if (b.id === "mAnim") { FLOW.anim = !FLOW.anim; buildMap(c); } };
    $("#mapCtl").onchange = e => { const t = e.target; if (t.id === "mInd") MAP.ind = t.value; if (t.id === "mYear") { S.year = +t.value; syncHash(); } if (t.id === "mDate") YT.date = t.value; if (t.id === "mFrom") YT.from = +t.value; if (t.id === "mTo") YT.to = +t.value; if (t.id === "mThr") YT.thr = Math.max(1, +t.value || 10); if (t.id === "mDest") YT.dest = t.value; if (t.id === "mLig") MAP.lig = t.value; if (t.id === "mN") FLOW.n = +t.value; if (YT.to <= YT.from) YT.to = YT.from + 1; buildMap(c); };
    legendBox();
  }
  function legendBox() {
    let h = "";
    if (mode === "piirkonnad") { const I = IND[MAP.ind], arr = POP ? [...POP.m.values()].filter(o => !o.other) : [], mx = Math.max(1, ...arr.map(o => I.size(o))), Rmax = Math.min(26, W / 30);
      const ks = [mx, mx / 4, mx / 16].map(v => Math.round(v)), sw = ks.map(v => `<svg width="${2 * Rmax + 4}" height="${2 * Rmax + 4}" aria-hidden="true"><circle cx="${Rmax + 2}" cy="${Rmax + 2}" r="${Math.max(3, Rmax * Math.sqrt(v / mx))}" fill="none" stroke="var(--mut)"/></svg>`);
      h += `<span class="kick">${esc(I.n)} ${rel(I.kind)}</span><div class="sizekey">${ks.map((v, i) => `<span>${sw[i]}${I.pct ? f0(v) + " in" : f0(v)}</span>`).join("")}</div><small>Ringi pindala ∝ ${I.div && !I.pct ? "muutuse suurus" : I.pct ? "rahvaarv; värv = näitaja" : I.u}</small>`;
      if (I.div) h += `<span><i class="sw" style="background:var(--gain)"></i>kasv</span><span><i class="sw" style="background:var(--loss)"></i>kahanemine</span>`;
      if (I.seq) h += `<span><i class="sw" style="background:var(--a-work)"></i>alla 18%</span><span><i class="sw" style="background:var(--warn)"></i>18–25%</span><span><i class="sw" style="background:var(--a-old)"></i>üle 25%</span>`;
      h += `<span><svg width="14" height="14"><circle cx="7" cy="7" r="3.5" fill="none" stroke="var(--dim)"/></svg>alla 200 elaniku (koondatud)</span><span><svg width="14" height="14"><rect x="2" y="2" width="10" height="10" fill="var(--ink)"/></svg>kool</span><span><svg width="14" height="14"><path d="M7,1L13,12H1Z" fill="var(--a-kid)"/></svg>lasteaed</span>
        <span><svg width="16" height="16"><path d="M8,1L15,8L8,15L1,8Z" fill="var(--loss)" fill-opacity=".25" stroke="var(--loss)" stroke-width="1.5" stroke-dasharray="3 2"/></svg>planeering, mõju arvutamata (täidis = menetluse etapp)</span>`; }
    if (mode === "yt") h += `<span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="var(--a-work)"/></svg>bussipeatus (pindala ∝ väljumised)</span><span><svg width="14" height="14"><rect x="2" y="2" width="10" height="10" fill="var(--a-old)"/></svg>rongipeatus</span><span><svg width="14" height="14"><circle cx="7" cy="7" r="4" fill="var(--surf)" stroke="var(--crit)" stroke-width="2"/></svg>asula alla lävendi</span><span><i class="sw" style="background:var(--a-work);height:3px"></i>liinide geomeetria (GTFS shapes)</span><small>Sõiduplaanijärgne pakkumine, mitte reisijate arv ega reaalaeg.</small>`;
    if (mode === "ligi") h += `<span><i class="sw" style="background:var(--ok)"></i>${MAP.lig === "kool815" ? "ühendus olemas" : "lähedal"}</span><span><i class="sw" style="background:var(--warn)"></i>keskmine</span><span><i class="sw" style="background:var(--crit)"></i>kaugel</span><span><i class="sw" style="background:var(--dim)"></i>puudub</span><small>Piirid on kaksiku kokkulepe (kool/lasteaed 3 ja 7 km, peatus 1 ja 2,5 km, Tallinn 45 ja 70 min). Valitud asulast näidatakse linnulennujooned lähimate objektideni.</small>`;
    if (mode === "too") h += `<span><svg width="30" height="12"><path d="M2,6L26,6" stroke="var(--loss)" stroke-width="4" marker-end="url(#arrH)"/></svg>väljaminev seos: elukoht → töökoht (laius ∝ hõivatute arv)</span><span><svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="var(--a-work)" fill-opacity=".6"/></svg>töötab oma vallas</span><span class="missing">sissetulev pendelränne: puudub (RL21163 on elukoha järgi)</span>`;
    $("#mapLeg").innerHTML = h;
  }

  /* ---------- valitud objekti paneel ---------- */
  function info() {
    const box2 = $("#mapInfo"), s = MAP.sel;
    if (!s) { box2.innerHTML = `<p class="small mut">Klõpsa kaardil objektil, vali tabelist või otsi.</p>`; return; }
    const dl = rows => `<dl class="mapdl">${rows.filter(Boolean).map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>`, close = `<button type="button" class="btn ghost sm" id="mapSelX">Tühista valik</button>`;
    let h = "";
    if (s.kind === "asula") { const p = PL.find(q => q.n === s.id), o = POP && POP.m.get(s.id), a = p && ligNear(p), yd = T && T.days[YT.date] && T.days[YT.date].asula[(p && p.key) || s.id];
      const insts = p && p.rings ? INST.filter(q => p.rings.some(r => pip(q.ll[1], q.ll[0], r))) : [], stops = T ? T.stops.filter(q => q.asula === s.id) : [], dpl = DP.filter(d => asulaKey(d.asula) === s.id);
      h = `<h3>${esc(s.id)}</h3><span class="small mut">${esc(p ? p.full : s.id)} · ${esc(ctx.units[vid].name)}</span>` + dl([
        o && !o.other ? [`Rahvaarv 31.12.2021`, `${f0(o.pop21)} ${rel("ametlik")}`] : ["Rahvaarv", `<span class="missing">puudub</span> (alla 200 elaniku, koondatud)`],
        o && !o.other ? [`Prognoos ${Y}`, `${f0(o.popY)} ${rel("mudel")}`] : null,
        o && !o.other ? [`Muutus 2026→${Y}`, `${sg(o.popY - o.pop26)} (${pc(o.popY / o.pop26 - 1)})`] : null,
        o && !o.other ? ["Vanus 2021", `0–17: ${f0(o.k21)} · 18–64: ${f0(o.w21)} · 65+: ${f0(o.o21)}`] : null,
        o && !o.other ? [`Lapsed ${Y}`, `lasteaiaealisi ${f0(o.la)}, põhikooliealisi ${f0(o.pk)} ${rel("mudel")}`] : null,
        ["Põhikool asulas", o ? (o.school ? "on" : "ei ole (ei tõenda halba ligipääsu)") : "puudub"],
        ["Haridusasutused asulas", insts.length ? insts.map(q => esc(q.n)).join("<br>") : "ei ole"],
        a && a.k ? ["Lähim kool", `${esc(a.k.o.n)} · ${(a.k.d / 1000).toFixed(1).replace(".", ",")} km linnulennult`] : null,
        ["Peatused", stops.length ? `${stops.length} (${stops.slice(0, 4).map(q => esc(q.n)).join(", ")}${stops.length > 4 ? "…" : ""})` : T ? "asula piires ei ole" : '<span class="missing">puudub</span>'],
        yd ? [`Reise ${fmtD(YT.date)}`, `${yd.trips} (väljumisi peatustest ${yd.dep})${yd.tln ? `; Tallinna otse ${yd.tln.trips}${yd.tln.minMin != null ? ", kiireim " + yd.tln.minMin + " min" : ""}` : ""}`] : null,
        dpl.length ? ["Planeeringud", dpl.map(d => esc(d.name)).join("<br>")] : null]) +
        (o && !o.other ? `<div class="chart" id="mapSpark"></div>` : "") +
        `<p class="small mut">Asula prognoos on tuletatud valla prognoosist 2021. aasta osakaaluga (mitte sõltumatu asulaprognoos). ${srcBtn("rel21")} ${srcBtn("model")}</p>
        <p class="small"><a href="#rahvastik/asulad">Asulad rahvastikuvaates →</a> · <a href="#kaart/yt">Ühistransport →</a></p>` + close; }
    if (s.kind === "inst") { const q = INST.find(x => x.id === s.id); if (!q) { MAP.sel = null; return info(); } const e = q.ehis;
      h = `<h3>${esc(q.n)}</h3>` + dl([["Liik", q.t === "L" ? "lasteaed" : q.t === "V" ? "kolledž" : "kool"], ["Aadress", q.addr ? esc(q.addr) : '<span class="missing">puudub</span>'], ["Asukoht", `OpenStreetMap ${q.osm ? `<a href="https://www.openstreetmap.org/${esc(q.osm)}" target="_blank" rel="noopener">${esc(q.osm)}</a>` : ""} ${rel("ametlik")}`],
        ["Õpilasi", e && e.p != null ? `${f0(e.p)} ${rel(e.s === "hinnang" ? "hinnang" : "ametlik")} (${esc(e.s)})` : '<span class="missing">puudub</span>'],
        ["Lapsi", e && e.l != null ? `${f0(e.l)} ${rel(e.s === "hinnang" ? "hinnang" : "ametlik")} (${esc(e.s)}${e.s === "hinnang" ? ", kohtade arvu järgi" : ""})` : '<span class="missing">puudub</span>'],
        ["Kohti", q.cap ? `${f0(q.cap)} ${rel("ametlik")}<br><span class="small">${esc(q.capSrc)}</span>` : '<span class="missing">puudub</span>'],
        ["Täituvus", q.cap && e && e.p ? pct(e.p / q.cap) : '<span class="missing">ei saa arvutada</span>'], ["Vaatlusperiood", e ? "2025/26 õppeaasta" : "–"]]) +
        `<p class="small mut">Valla nõudlust asutuste vahel ei jaotata: selleks puudub põhjendatud meetod ja elukohajärgne koolikoht.</p>` + close; }
    if (s.kind === "dp") { const d = DP.find(x => x.id === s.id), st = dps.list.find(x => x.id === s.id), U = LS.get("dpUnits", {}), u = { ...d.units, ...(U[d.id] || {}) }, ll = llOf(s), [stg] = dpStage(d.stage);
      const devs = dpDevs(vid).filter(x => x.dp === d.name), Hh = devs.length ? E.devsImpact(ctx, vid, devs, params()) : null, near = ll ? [Logic.nearest(ll, INST, o => o.t === "K"), Logic.nearest(ll, INST, o => o.t === "L"), T ? Logic.nearest(ll, STOPS) : null] : [];
      const SC = LS.get("scen:" + vid, null), inSc = SC ? SC.filter(x => x.dp).map(x => x.name.split(":")[0]) : ["B", "C (vaikimisi)"];
      h = `<h3>${esc(d.name)}</h3>` + dl([["Seisund", `${esc(d.stage)} (${stg})${Object.entries(d.dates || {}).map(([k, v]) => `<br><span class="small">${esc(k)} ${fmtD(v)}</span>`).join("")}`], ["Allikas", `planeeringukontroll, eksport ${fmtD(D.dp.updated)}`], ["Asukoht", `${esc(d.asula)} · <b>ligikaudne</b> (asula keskpunkt; ala polügooni ei ole)`],
        ["Eluruumid", st.status === "arvutatud" ? ["eramu", "ridaelamu", "korter"].filter(t => +u[t] > 0).map(t => `${t} ${u[t]}`).join(", ") + ` ${rel(U[d.id] ? "eeldus" : "ametlik")}` : d.housing ? '<span class="missing">sisestamata</span>' : "elamuid ei kavandata"],
        ["Asustamine", st.status === "arvutatud" ? `${u.start || d.start || 2028}, ${u.years || d.years || 2} a ${rel(U[d.id] ? "eeldus" : "hinnang")}` : "–"],
        ["Modelleeritud mõju", Hh ? `${f0(Hh.newcomers)} uut elanikku; lapsi tipul ${sg(Hh.peakLa.dLa)}, õpilasi ${sg(Hh.peakSc.dSc)} ${rel("mudel")}` : d.housing ? '<b class="st warn">▲ arvutamata</b> – eluruumide arv puudub' : "–"],
        ["Aktiivses stsenaariumis", inSc.length ? "töölaual: " + inSc.map(esc).join(", ") : "ei"],
        ["Lähedal (linnulend)", near.filter(Boolean).map(n => `${esc(n.o.n)} ${(n.d / 1000).toFixed(1).replace(".", ",")} km`).join("<br>") || "–"]]) +
        (Hh ? `<button type="button" class="btn sm" id="dpOpen">Ava otsuste vaates</button> ` : "") + `<a class="small" href="#otsused/dp">Sisesta eluruumid →</a> ` + close; }
    if (s.kind === "stop" && T) { const q = T.stops.find(x => x.id === s.id), A = ytAgg(T, s), o = A && A.sel && A.sel.o;
      h = `<h3>${esc(q.n)}</h3><span class="small mut">${q.modes.map(m => m === "rail" ? "rong" : "buss").join(", ")}${q.asula ? " · " + esc(q.asula) : ""}</span>` + dl([
        ["Liinid", o ? o.routes.map(r => T.routes[r] ? esc((T.routes[r].s || "") + " " + T.routes[r].l) : esc(r)).join("<br>") : '<span class="missing">sel päeval ei teenindata</span>'],
        [`Väljumisi ${fmtD(YT.date)}`, o ? `${o.dep} (valitud vahemikus ${A.sel.n})` : "0"], ["Esimene / viimane", o ? `${o.first || "–"} / ${o.last || "–"}` : "–"], ["Suurim paus 5–23", o && o.gapMax != null ? o.gapMax + " min" : "–"]]) + close; }
    if (s.kind === "flow") { const [id, d] = s.id.split("|"), C = D.commute; h = `<h3>${esc(ctx.units[id].name)} → ${esc(C.loc[d].n)}</h3>` + dl([["Hõivatuid", `${f0(C.parts[id][d])} ${rel("ametlik")}`], ["Osakaal", `${pct(C.parts[id][d] / C.raw[id].kokku)} (nimetaja: valla hõivatud kokku ${f0(C.raw[id].kokku)})`], ["Allikas", "REL 2021, RL21163, 31.12.2021"], ["Detailsus", "elukoht: omavalitsus; töökoht: Tallinn/Tartu kategooria"], ["Piirang", "elukoha–töökoha seos, mitte igapäevaste reiside arv; joon ei ole marsruut"]]) + close; }
    if (s.kind === "vald") { setTimeout(() => { S.unit = s.id; render(); }); h = ""; }
    box2.innerHTML = h;
    const x = $("#mapSelX"); if (x) x.onclick = () => setSel(null);
    const op = $("#dpOpen"); if (op) op.onclick = () => { const d = DP.find(q => q.id === s.id), U = LS.get("dpUnits", {}), u = { ...d.units, ...(U[d.id] || {}) }, t = ["korter", "ridaelamu", "eramu"].sort((a, b) => (+u[b] || 0) - (+u[a] || 0))[0];
      Object.assign(HI, { unit: vid, n: ["eramu", "ridaelamu", "korter"].reduce((a, k) => a + (+u[k] || 0), 0), type: t, start: +(u.start || d.start || 2028), years: +(u.years || d.years || 2), settlement: "" }); OT.type = "elamu"; OT.unit = vid; location.hash = "#otsused/eelhinnang"; };
    const sp = $("#mapSpark"); if (sp && POP) { const ser = POP.spark(s.id); timeChart(sp, { series: [{ name: "rahvaarv", pts: ser, color: css("--a-work"), w: 2, dash: true, end: true }], h: 130, unit: "elanikku", desc: "Asula rahvaarvu prognoos 2026–2036" }); }
  }

  /* ---------- kaardiga seotud graafik ja tabel ---------- */
  function linked() {
    const sel = MAP.sel, CT = $("#mapChartT"), CH = $("#mapChart"), CL = $("#mapChartL"), TB = $("#mapTbl"), NT = $("#mapNote");
    if (mode === "piirkonnad") { const I = IND[MAP.ind], arr = POP ? [...POP.m.entries()].filter(([, o]) => !o.other).map(([k, o]) => ({ k, o, v: I.v(o) })).sort((a, b) => b.v - a.v) : [];
      CT.innerHTML = `${esc(I.n)} · asulad (≥ 200 elanikku 2021)`; if (!arr.length) { CH.innerHTML = `<p class="note"><span class="missing">puudub</span> – asulate andmeid ei ole</p>`; } else
      bars(CH, arr.slice(0, 18).map(r => ({ label: r.k, v: r.v, txt: I.pct ? pc(r.v) : I.div ? sg(r.v) : f0(r.v), color: sel && sel.kind === "asula" && sel.id === r.k ? css("--focus") : I.div ? (r.v >= 0 ? css("--gain") : css("--loss")) : css("--a-work"), sel: "asula|" + r.k })), { lw: 120, rw: 80, desc: I.n });
      CL.innerHTML = arr.length > 18 ? `<p class="small mut">Näidatud 18 suurimat; kõik on tabelis.</p>` : "";
      TB.innerHTML = more(`Tabel: kõik asulad (${arr.length})`, table(["Asula", "2021 (REL)", "2026", String(Y), "Muutus", "Muutus %", "Lapsi " + Y, "65+ 2021", "Baasist"], arr.slice().sort((a, b) => a.k.localeCompare(b.k, "et")).map(r => ({ cls: sel && sel.id === r.k ? "tot" : "", cells: [`<button type="button" class="linkbtn" data-sel="asula|${esc(r.k)}">${esc(r.k)}</button>`, f0(r.o.pop21), f0(r.o.pop26), f0(r.o.popY), sg(r.o.popY - r.o.pop26), pc(r.o.popY / r.o.pop26 - 1), f0(r.o.la + r.o.pk), pct(r.o.o21 / r.o.pop21), sg(r.o.popY - r.o.base)] }))) + `<p class="note">2021 = ametlik (REL); 2026 ja ${Y} = valla prognoos jaotatud 2021. aasta osakaaluga ${rel("mudel")}. „Baasist” = valitud stsenaarium miinus ajalooline keskmine ilma lisarände ja sündimuse muutuseta.</p>`, !!sel) + csvBtn("asulad", "asulad_" + vid + "_" + Y + ".csv", ["asula", "rahvaarv_2021", "prognoos_2026", "prognoos_" + Y, "lapsed_" + Y, "65pluss_2021", "erinevus_baasist"], arr.map(r => [r.k, r.o.pop21, r.o.pop26, r.o.popY, r.o.la + r.o.pk, r.o.o21, r.o.popY - r.o.base]));
      NT.innerHTML = use(["Asulate rahvastiku suurusjärk ja paiknemine", "Planeeringute, koolide ja lasteaedade paiknemine"], ["Asulate erinevad kasvutempod: asulaprognoos jagab valla prognoosi", "Planeeringu täpne asukoht: ala polügooni ei ole"], ["Alla 200 elanikuga asulad on koondatud", "Ringi pindala vastab väärtusele", "Valla koondarvestuses piisavad kohad ei tähenda, et kõigis piirkondades on kool lähedal"]); }
    if (mode === "yt") { const A = ytAgg(T, sel && sel.kind === "stop" ? sel : sel && sel.kind === "asula" ? { kind: "asula", id: (PL.find(q => q.n === sel.id) || {}).key || sel.id } : null);
      if (!A) { CT.textContent = "Väljumised tunni kaupa"; CH.innerHTML = `<p class="note"><span class="missing">puudub</span> – ühistranspordi andmeid ei ole</p>`; TB.innerHTML = ""; return; }
      const name = sel && sel.kind === "stop" ? T.stops.find(q => q.id === sel.id).n : sel && sel.kind === "asula" ? sel.id : ctx.units[vid].name;
      CT.innerHTML = `Väljumised tunni kaupa · ${esc(name)} · ${fmtD(YT.date)} (${T.meta.dayInfo[YT.date].wd})`;
      hourChart(CH, A.sel ? A.sel : { h: new Array(24).fill(0), hr: new Array(24).fill(0) }, sel && sel.kind === "stop" ? "väljumist" : "reisi");
      CL.innerHTML = legend([{ n: "buss", c: css("--a-work"), k: "b" }, { n: "rong", c: css("--a-old"), k: "b" }]) + `<p class="small mut">${sel && sel.kind === "stop" ? "Peatuse väljumised" : "Unikaalsed reisid (sama reis mitme peatusega loetakse üks kord)"}; tausttoon = valitud ajavahemik ${YT.from}–${YT.to}. Kokku vahemikus: <b>${A.sel ? A.sel.n : 0}</b>.</p>`;
      const rows = PL.map(p => ({ p, a: A.f(A.day.asula[p.key || p.n]) })).sort((a, b) => (b.a ? b.a.n : -1) - (a.a ? a.a.n : -1));
      const dCol = YT.dest === "tln" ? ["Otse Tallinna (päev)", "Kiireim, min", "Saabub 7–9"] : YT.dest === "keskus" ? ["Otse vallakeskusesse (päev)", "Kiireim, min", "Saabub 7–9"] : ["Esimene", "Viimane", "Suurim paus, min"];
      TB.innerHTML = more(`Tabel: asulad (${rows.length})`, table(["Asula", `Reise ${YT.from}–${YT.to}`, "Väljumisi päevas", "Reise päevas", "Hommik 6–9", "Õhtu 15–19"].concat(dCol), rows.map(({ p, a }) => { const o = a && a.o, dd = o && (YT.dest === "tln" ? o.tln : YT.dest === "keskus" ? o.keskus : null);
        return { cls: sel && sel.id === p.n ? "tot" : "", cells: [`<button type="button" class="linkbtn" data-sel="asula|${esc(p.n)}">${esc(p.n)}</button>${a && a.n < YT.thr ? ' <span class="st warn">▲</span>' : ""}`, a ? a.n : '<span class="missing">peatus puudub</span>', o ? o.dep : "–", o ? o.trips : "–", o ? o.am : "–", o ? o.pm : "–"].concat(YT.dest === "all" ? [o ? o.first || "–" : "–", o ? o.last || "–" : "–", o && o.gapMax != null ? o.gapMax : "–"] : [dd ? dd.trips : (o ? "keskus" : "–"), dd && dd.minMin != null ? dd.minMin : "–", dd ? dd.am7_9 : "–"]) }; })) +
        `<p class="note">„Väljumisi” = peatumised valla peatustes; „reise” = unikaalsed reisid. Otseühendus = sama reis jõuab sihtkohta; ümberistumisi ei arvutata. Lävend ${YT.thr} on kokkulepe; kasutatavust mõjutavad ka väljumiste jaotus, suund ja tagasisõit.</p>`, !!sel) + csvBtn("yt", "uhistransport_" + vid + "_" + YT.date + ".csv", ["asula", "reisid_vahemikus", "valjumised_paevas", "reisid_paevas", "tallinna_otse", "keskusesse_otse"], rows.map(({ p, a }) => [p.n, a ? a.n : "", a ? a.o.dep : "", a ? a.o.trips : "", a && a.o.tln ? a.o.tln.trips : "", a && a.o.keskus ? a.o.keskus.trips : ""]));
      NT.innerHTML = use(["Sõiduplaanijärgse pakkumise võrdlus asulate ja kellaaegade kaupa", "Otseühenduste olemasolu Tallinna ja vallakeskusesse"], ["Reisijate arv, täituvus, hilinemised, reaalaeg (GTFS neid ei sisalda)", "Ümberistumisega teekonnad"], ["Kommertsliinid (nt kaugbussid) võivad andmetest puududa", "Asula = peatused asula OSM-piirides; piirist väljas olev peatus ei kuulu asulale", "Andmepaki hankimise aeg, kehtivus ja analüüsipäev on eri asjad"]); }
    if (mode === "ligi") { const rows = PL.map(p => { const a = ligNear(p), d = T && T.days[YT.date] && T.days[YT.date].asula[p.key || p.n], o = POP && POP.m.get(p.n); return { p, a, d, o, v: ligVal(p) }; });
      const srt = rows.filter(r => r.v != null && MAP.lig !== "kool815").sort((a, b) => b.v - a.v);
      CT.innerHTML = esc(LIG[MAP.lig][0]);
      if (MAP.lig === "kool815") { const yes = rows.filter(r => r.v != null).length; CH.innerHTML = `<p class="note"><b>${yes}</b> asulast ${rows.length}-st on ${fmtD(YT.date)} otseühendus vallakeskusesse kella 8.15-ks (sõiduplaani järgi).</p>`; }
      else bars(CH, srt.slice(0, 18).map(r => ({ label: r.p.n, v: r.v, txt: ligFmt(r.v), color: sel && sel.id === r.p.n ? css("--focus") : css("--a-work"), sel: "asula|" + r.p.n })), { lw: 120, rw: 80, fmt: v => ligFmt(v), desc: LIG[MAP.lig][0] });
      const pkNo = rows.filter(r => r.o && !r.o.other && !r.o.school).reduce((s, r) => s + r.o.pk, 0);
      CL.innerHTML = `<p class="small mut">Põhikoolita asulates elab ${Y}. aastal umbes ${f0(pkNo)} põhikooliealist ${rel("mudel")}. See ei näita, millises koolis lapsed õpivad, ega tõenda halba ligipääsu.</p>`;
      TB.innerHTML = more(`Tabel: asulad (${rows.length})`, table(["Asula", "Lähim kool, km", "Lähim lasteaed, km", "Bussipeatus, km", "Rongipeatus, km", "Tallinna otse, kiireim min", "Keskusesse 8.15-ks", "Tagasi 13–18"], rows.map(r => ({ cls: sel && sel.id === r.p.n ? "tot" : "", cells: [`<button type="button" class="linkbtn" data-sel="asula|${esc(r.p.n)}">${esc(r.p.n)}</button>`, r.a.k ? (r.a.k.d / 1000).toFixed(1).replace(".", ",") : "–", r.a.l ? (r.a.l.d / 1000).toFixed(1).replace(".", ",") : "–", r.a.s ? (r.a.s.d / 1000).toFixed(1).replace(".", ",") : "–", r.a.r ? (r.a.r.d / 1000).toFixed(1).replace(".", ",") : "–", r.d && r.d.tln && r.d.tln.minMin != null ? r.d.tln.minMin : "–", r.d && r.d.kool ? r.d.kool.arrBy0815 || "ei" : '<span class="missing">puudub</span>', r.d && r.d.kool ? r.d.kool.ret : "–"] }))), !!sel);
      NT.innerHTML = `<div class="panel"><span class="kick">Meetodid</span><dl class="mapdl"><dt>Linnulend ${rel("mudel")}</dt><dd>sirgjooneline kaugus asula keskpunktist (OSM sildipunkt) lähima objektini. Kirjeldab keskpunkti, mitte kõigi elanike ligipääsu.</dd><dt>Teedevõrgu teekond</dt><dd><span class="missing">ei ole arvutatud</span> – vajab marsruutimisteenust (nt OSRM või GraphHopper teedevõrgu andmetega).</dd><dt>Sõiduplaanipõhine ${rel("ametlik")}</dt><dd>GTFS otseühendused (sama reis), ${fmtD(YT.date)}; ümberistumisega teekondi ja kõndi peatuseni ei arvestata.</dd></dl></div>`; }
    if (mode === "too") { const C = D.commute, R2 = Logic.commuteRows(C, vid);
      CT.innerHTML = `${esc(ctx.units[vid].name)}: töökoha asukoht · nimetaja ${f0(R2.total)} hõivatut (REL 31.12.2021)`;
      bars(CH, R2.rows.map(r => ({ label: r.n + (r.loc ? " ◆" : ""), v: r.v, txt: `${f0(r.v)} · ${pct(r.share)}`, color: FLOW.sel === vid + "|" + r.loc ? css("--focus") : r.loc ? css("--loss") : r.k === "sama" ? css("--a-work") : css("--ref"), sel: r.loc ? "flow|" + vid + "|" + r.loc : null })), { lw: 190, rw: 110, fmt: f0, desc: "Töökoha asukoht" });
      CL.innerHTML = `<p class="small mut">◆ = kaardil voojoonena. ¹ v.a Tallinn ja Tartu. Ülejäänud kategooriatel puudub täpne sihtkoht, seetõttu neid kaardile ei paigutata.${R2.resid ? ` Osade summa erineb kogusummast ${R2.resid} võrra (Statistikaameti ümardus).` : ""}</p>`;
      TB.innerHTML = more("Tabel: kõik viis valda", table(["Vald", "Hõivatuid"].concat(R2.rows.map(r => r.n)), ["Kohila", "Rae", "Rapla", "Marjamaa", "Kehtna"].map(id => { const q = Logic.commuteRows(C, id); return { cls: id === vid ? "tot" : "", cells: [esc(ctx.units[id].name), f0(q.total)].concat(q.rows.map(r => `${f0(r.v)} <span class="dim">${pct(r.share)}</span>`)) }; }))) + csvBtn("commute", "tookoht_REL2021.csv", ["vald", "kokku"].concat(R2.rows.map(r => r.k)), ["Kohila", "Rae", "Rapla", "Marjamaa", "Kehtna"].map(id => [id, C.raw[id].kokku].concat(Logic.commuteRows(C, id).rows.map(r => r.v))));
      NT.innerHTML = use(["Kui suur osa elanikest töötab Tallinnas, Tartus, oma vallas või mujal", "Valdade võrdlus"], ["Igapäevaste reiside arv ega liiklus", "Täpne sihtomavalitsus (v.a Tallinn ja Tartu)", "Sissetulev pendelränne (andmed puuduvad)"], ["Andmed on 31.12.2021 seisuga", "Ajaloolisi voogusid stsenaariumid ei muuda", "Kui ajaloolist osakaalu kasutatakse tuleviku hindamiseks (nt elamuarenduse „tööl Tallinnas”), on tulemus mudelihinnang"]); }
    TB.querySelectorAll && [CH, TB].forEach(n => n.querySelectorAll("[data-sel]").forEach(b => b.addEventListener("click", () => pick(b.dataset.sel))));
  }
  function hourChart(el2, o, unit) {
    const W2 = W_(el2), H2 = 200, m = { l: 34, r: 8, t: 10, b: 24 }, bw = (W2 - m.l - m.r) / 24, mx = Math.max(1, ...o.h.map((v, i) => v + o.hr[i])), Yh = v => H2 - m.b - v / mx * (H2 - m.t - m.b);
    let g2 = `<rect x="${m.l + YT.from * bw}" y="${m.t}" width="${(YT.to - YT.from) * bw}" height="${H2 - m.t - m.b}" fill="var(--ok-s)"/>`;
    [0, Math.round(mx / 2), mx].forEach(v => g2 += `<line class="gl" x1="${m.l}" x2="${W2 - m.r}" y1="${Yh(v)}" y2="${Yh(v)}"/><text x="${m.l - 5}" y="${Yh(v) + 4}" text-anchor="end">${v}</text>`);
    for (let i = 0; i < 24; i++) { const b = o.h[i] || 0, r = o.hr[i] || 0, x = m.l + i * bw + 1; if (b) g2 += `<rect x="${x}" y="${Yh(b)}" width="${bw - 2}" height="${Yh(0) - Yh(b)}" fill="var(--a-work)" data-tip="${esc(`kell ${i}–${i + 1}: buss ${b}, rong ${r} ${unit}`)}"/>`; if (r) g2 += `<rect x="${x}" y="${Yh(b + r)}" width="${bw - 2}" height="${Yh(b) - Yh(b + r)}" fill="var(--a-old)" data-tip="${esc(`kell ${i}–${i + 1}: buss ${b}, rong ${r} ${unit}`)}"/>`;
      if (i % 3 === 0) g2 += `<text x="${m.l + i * bw + bw / 2}" y="${H2 - 6}" text-anchor="middle">${i}</text>`; }
    el2.innerHTML = `<svg viewBox="0 0 ${W2} ${H2}" role="img" aria-label="${esc("Väljumised tunni kaupa: " + o.h.map((v, i) => i + ": " + (v + (o.hr[i] || 0))).filter((x, i) => o.h[i] + (o.hr[i] || 0)).join(", "))}">${g2}</svg>`;
  }
  function pick(v) { if (!v) return; const [kind, ...rest] = v.split("|"); if (kind === "flow") { FLOW.sel = rest.join("|"); MAP.sel = { kind: "flow", id: rest.join("|"), vid }; drawTop(); info(); linked(); return; } setSel({ kind, id: rest.join("|") }); }

  /* ---------- suum, lohistamine, mahutamine, täisekraan ---------- */
  const clamp = () => { view.k = Math.max(1, Math.min(16, view.k)); const mxx = W * .4; view.tx = Math.min(mxx, Math.max(W - W * view.k - mxx, view.tx)); view.ty = Math.min(H * .4, Math.max(H - H * view.k - H * .4, view.ty)); if (view.k === 1) { view.tx = 0; view.ty = 0; } };
  let raf = 0; const redraw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawTop(); }); };
  const zoomAt = (f, px, py) => { const k0 = view.k; view.k = Math.max(1, Math.min(16, view.k * f)); const r = view.k / k0; view.tx = px - (px - view.tx) * r; view.ty = py - (py - view.ty) * r; clamp(); redraw(); };
  function fit() { const s = MAP.sel; if (!s) { view.k = 1; clamp(); redraw(); return; } const pts = [llOf(s)].filter(Boolean); if (s.kind === "asula") { const p = PL.find(q => q.n === s.id), a = p && ligNear(p); if (a) [a.k, a.l, a.s].filter(Boolean).forEach(n => pts.push(n.o.ll)); }
    if (s.kind === "flow") { const [id, d] = s.id.split("|"), k = c.kovOf(id); pts.push([k.p[1], k.p[0]], D.commute.loc[d].ll); }
    if (!pts.length) return; const xs = pts.map(p => X(p[1])), ys = pts.map(p => Y_(p[0])), bw2 = Math.max(80, Math.max(...xs) - Math.min(...xs)), bh = Math.max(80, Math.max(...ys) - Math.min(...ys));
    view.k = Math.max(1, Math.min(8, Math.min(W / (bw2 * 1.6), H / (bh * 1.6)))); const mxp = (Math.max(...xs) + Math.min(...xs)) / 2, myp = (Math.max(...ys) + Math.min(...ys)) / 2; view.tx = W / 2 - mxp * view.k; view.ty = H / 2 - myp * view.k; clamp(); redraw(); }
  const local = e => { const b = svg.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; };
  box.querySelector(".mapctl").onclick = e => { const b = e.target.closest("button"); if (!b) return; const z = +b.dataset.z; if (!z) { view.k = 1; clamp(); redraw(); } else zoomAt(z, W / 2, H / 2); };
  box.addEventListener("wheel", e => { if (!(e.ctrlKey || e.metaKey || document.activeElement === box || document.fullscreenElement)) { const h = $("#mapHint"); h.classList.add("on"); clearTimeout(h._t); h._t = setTimeout(() => h.classList.remove("on"), 1300); return; } e.preventDefault(); const [px, py] = local(e); zoomAt(Math.exp(-e.deltaY * .0022), px, py); }, { passive: false });
  const ptr = new Map(); let moved = 0, pinch = null;
  box.addEventListener("pointerdown", e => { if (e.target.closest(".mapctl")) return; box.setPointerCapture(e.pointerId); ptr.set(e.pointerId, local(e)); moved = 0; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } box.classList.add("drag"); });
  box.addEventListener("pointermove", e => { if (!ptr.has(e.pointerId)) return; const p = local(e), o = ptr.get(e.pointerId);
    if (ptr.size === 2) { ptr.set(e.pointerId, p); const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoomAt(d / pinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch = d; moved += 10; return; }
    view.tx += p[0] - o[0]; view.ty += p[1] - o[1]; moved += Math.abs(p[0] - o[0]) + Math.abs(p[1] - o[1]); ptr.set(e.pointerId, p); clamp(); redraw(); });
  const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; if (!ptr.size) box.classList.remove("drag");
    if (e.type === "pointerup" && moved < 6) { const tg = document.elementFromPoint(e.clientX, e.clientY), sl = tg && tg.closest && tg.closest("[data-sel]"); if (sl) pick(sl.getAttribute("data-sel")); } };
  box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
  box.addEventListener("keydown", e => { const st = 60; if (e.key === "+" || e.key === "=") zoomAt(1.5, W / 2, H / 2); else if (e.key === "-") zoomAt(1 / 1.5, W / 2, H / 2); else if (e.key === "0") { view.k = 1; clamp(); redraw(); }
    else if (e.key.startsWith("Arrow")) { view.tx += e.key === "ArrowLeft" ? st : e.key === "ArrowRight" ? -st : 0; view.ty += e.key === "ArrowUp" ? st : e.key === "ArrowDown" ? -st : 0; clamp(); redraw(); } else if (e.key === "Escape") setSel(null); else return; e.preventDefault(); });
  $("#mapFit").onclick = fit;
  $("#mapClr").onclick = () => { Object.assign(MAPL, { maakate: true, teed: true, kylad: true, koolid: true, dp: true, liinid: true }); Object.assign(YT, { bus: true, rail: true, from: 0, to: 24, dest: "all", thr: 10 }); MAP.ind = "popY"; MAP.lig = "kool"; FLOW.n = 10; FLOW.anim = false; FLOW.sel = null; MAP.sel = null; delete MAP.view[key]; buildMap(c); };
  const atl = $("#atl"); $("#mapFs").onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else if (atl.requestFullscreen) atl.requestFullscreen().catch(() => atl.classList.toggle("fsfake")); else atl.classList.toggle("fsfake"); };
  $("#mapSvgDl").onclick = () => { const leg = $("#mapLeg").innerText.replace(/\s+\n/g, "\n").trim().split("\n").slice(0, 12), Hh = H + 30 + leg.length * 16;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" font-family="sans-serif" font-size="12"><style>${[...document.styleSheets].map(ss => { try { return [...ss.cssRules].map(r => r.cssText).filter(t => /^:root|^\.m-|^\.chart/.test(t)).join("\n"); } catch (e) { return ""; } }).join("\n")}</style><rect width="100%" height="100%" fill="${css("--bg")}"/>${svg.innerHTML}<text x="8" y="${H + 18}" font-weight="700" fill="${css("--ink")}">${esc(ttlText())}</text>${leg.map((l, i) => `<text x="8" y="${H + 34 + i * 16}" fill="${css("--mut")}">${esc(l)}</text>`).join("")}<text x="${W - 8}" y="${H - 8}" text-anchor="end" fill="${css("--ink")}">${esc(box.querySelector(".mapattr").textContent)}</text></svg>`;
    dlText(`kaart_${mode}_${vid}.svg`, s.replace(/var\(--([\w-]+)\)/g, (m0, v) => css("--" + v) || m0), "image/svg+xml"); };
  const ttlText = () => `${ctx.units[vid].name} · ${titles[mode]} · ${mode === "too" ? "REL 2021" : scenTxt().replace(/<[^>]+>/g, "") + " · " + Y}`;
  if (!MAP.fsBound) { MAP.fsBound = true; document.addEventListener("fullscreenchange", () => { const s2 = document.querySelector(".k9sec:not(.k9off)"); if (s2) render(); }); }

  controls(); drawTop(); info(); linked();
}
