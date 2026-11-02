/* Kasutajaliidese arvutusabi (puhtad funktsioonid, ilma DOM-ita). Mootori numbreid ei muudeta: siin ainult
   koondatakse, märgistatakse ja kontrollitakse mootori väljundeid. Node'is: require("./src/logic.js"). */
const Logic = (function () {
  "use strict";
  const SCHEMA = "kohila-digikaksik/stsenaarium/1";

  /* ---------- puuduv väärtus ---------- */
  /** NA(reason): puuduv väärtus koos põhjusega. Ei ole kunagi 0. */
  const NA = reason => ({ na: true, reason: reason || "andmed puuduvad" });
  const isNA = v => v == null || (typeof v === "object" && v.na === true) || (typeof v === "number" && !isFinite(v));

  /* ---------- planeeringute sisendite seis ---------- */
  /** dpStatus(rows, overrides): mitu planeeringut on täielike ja mitu puudulike mahtudega. Puuduv maht ei ole null. */
  function dpStatus(rows, overrides) {
    const U = overrides || {}, out = { n: rows.length, housing: 0, full: 0, missing: 0, noHousing: 0, list: [] };
    rows.forEach(d => {
      const u = Object.assign({}, d.units || {}, U[d.id] || {}), n = ["eramu", "ridaelamu", "korter"].reduce((s, t) => s + (+u[t] > 0 ? +u[t] : 0), 0);
      const st = !d.housing ? "elamuid ei kavandata" : n > 0 ? "arvutatud" : "arvutamata";
      if (!d.housing) out.noHousing++; else { out.housing++; if (n > 0) out.full++; else out.missing++; }
      out.list.push({ id: d.id, name: d.name, status: st, units: n > 0 ? n : null });
    });
    out.state = out.housing === 0 ? "pole" : out.missing === 0 ? "täielik" : out.full === 0 ? "arvutamata" : "osaline";
    out.label = { pole: "Planeeringutes eluruume ei kavandata", "täielik": "Planeeringute mõju arvutatud", osaline: "Planeeringute mõju osaliselt arvutatud", arvutamata: "Planeeringute mõju arvutamata" }[out.state];
    out.note = out.state === "osaline" ? `${out.full} planeeringul ${out.housing}-st on eluruumide arv sisestatud; tulemus ei ole kogu planeeringuportfelli mõju.`
      : out.state === "arvutamata" ? `Ühelgi ${out.housing} elamuplaneeringust ei ole eluruumide arvu; nende mõju ei ole tulemustes (ei ole null, vaid arvutamata).` : "";
    return out;
  }

  /* ---------- teenuste reserv ja tundlikkus ---------- */
  /** eduReserve(rows, cap, k): suurim täituvus, selle aasta, väikseim vaba kohtade arv ja nõudluse kasv, mille juures tekib puudujääk. */
  function eduReserve(rows, cap, k) {
    if (isNA(cap) || !cap) return { na: true, reason: "kohtade arv puudub" };
    let mx = -Infinity, y = null; rows.forEach(r => { if (r[k] > mx) { mx = r[k]; y = r.y; } });
    return { maxDem: mx, year: y, util: mx / cap, minFree: cap - mx, growthToShort: cap / mx - 1 };
  }
  /** stress(rows, cap, k, shocks): nõudluse muutus % → täituvus ja puudujääk (stressistsenaarium, mitte tõenäosus). */
  const stress = (rows, cap, k, shocks) => shocks.map(s => { const mx = Math.max(...rows.map(r => r[k])) * (1 + s); return { s, util: mx / cap, short: Math.max(0, mx - cap) }; });
  /** seisund: kohtade piisavus koondarvestuses. */
  function capState(res, firstShort) {
    if (res.na) return "na";
    if (firstShort) return firstShort <= 2030 ? "crit" : "warn";
    return res.util >= 0.9 ? "warn" : "ok"; // ≥ 90%: reserv väike (kaksiku kokkulepe)
  }

  /* ---------- eelarve tundlikkus ---------- */
  /** budgetSens(L, variants): kas netomõju märk püsib eelduste põhjendatud muutuse korral. L = housingImpact().last */
  function budgetSens(L) {
    const net = (tax, tf, cost) => L.dTaxR * tax - L.dTf * tf - L.dCost * cost;
    const v = [
      { k: "alus", d: "mudeli eeldused", net: L.dNet },
      { k: "kulu+10", d: "kulud 10% suuremad", net: net(1, 1, 1.1) },
      { k: "kulu-10", d: "kulud 10% väiksemad", net: net(1, 1, 0.9) },
      { k: "tulu-10", d: "tulumaks 10% väiksem (nt madalam palk või hõive)", net: net(0.9, 0.9, 1) },
      { k: "tulu+10", d: "tulumaks 10% suurem", net: net(1.1, 1.1, 1) }
    ];
    if (L.dNetMarg != null) v.push({ k: "piir", d: "piirkulu täiskulu asemel", net: L.dNetMarg });
    const pos = v.filter(x => x.net > 0).length, neg = v.filter(x => x.net < 0).length;
    return { rows: v, signStable: pos === 0 || neg === 0, min: Math.min(...v.map(x => x.net)), max: Math.max(...v.map(x => x.net)) };
  }
  /** budgetTotals(rows): aastane mõju ja perioodi kogumõju (nominaal, diskonteerimata); ühekordne investeering eraldi. */
  function budgetTotals(H) {
    const r = H.rows.filter(x => x.y > 2026), tot = r.reduce((s, x) => s + x.dNet, 0);
    return { annualLast: H.last.dNet, period: [r[0].y, r[r.length - 1].y], periodTotal: tot, invest: (H.cap.investLa || 0) + (H.cap.investSc || 0), discount: null };
  }

  /* ---------- pendelränne ---------- */
  /** commuteRows(C, id): mittekattuvad osad koos nimetajaga; ainult Tallinn ja Tartu on kaardil paigutatavad. */
  function commuteRows(C, id) {
    const p = C.parts[id], t = C.raw[id].kokku;
    const L = [["sama", "samas omavalitsuses", null], ["tallinn", "Tallinnas", "tallinn"], ["tartu", "Tartus", "tartu"], ["muuKovMk", C.mk[id] === "Harju" ? "mujal Harjumaal (v.a Tallinn)" : "mujal Raplamaal", null], ["muuMk", "muus maakonnas¹", null], ["valismaa", "välismaal", null], ["teadmata", "teadmata", null]];
    return { total: t, rows: L.map(([k, n, loc]) => ({ k, n, v: p[k], share: p[k] / t, loc })), resid: p.jaak };
  }

  /* ---------- kaugus ---------- */
  const haversine = (a, b) => { const R = 6371000, t = Math.PI / 180, dLa = (b[0] - a[0]) * t, dLo = (b[1] - a[1]) * t, x = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const nearest = (pt, list, f) => { let best = null; list.forEach(o => { if (f && !f(o)) return; const d = haversine(pt, o.ll); if (!best || d < best.d) best = { o, d }; }); return best; };

  /* ---------- ühistransport: kaart, graafik ja tabel samast allikast ---------- */
  /** ytHourly(day, sel, mode): tunnijaotus valitud asula/peatuse/valla kohta; buss ja rong eraldi. */
  function ytHourly(day, sel) {
    if (!day) return null; const o = sel.kind === "stop" ? day.stop[sel.id] : sel.kind === "asula" ? day.asula[sel.id] : day.vald;
    if (!o) return null; const h = o.h || new Array(24).fill(0), hr = o.hr || new Array(24).fill(0);
    return { bus: h, rail: hr, sum: h.reduce((a, b) => a + b, 0) + hr.reduce((a, b) => a + b, 0), obj: o };
  }
  const inWindow = (arr, from, to) => arr.slice(from, to).reduce((a, b) => a + b, 0);

  /* ---------- ühistransport: reisipõhine arvutus (data/transit skeem 2) ----------
     Üks funktsioon annab kaardi, graafiku, tabeli, detailipaneeli ja ekspordi arvud. Ajad on minutid teenusepäeva algusest
     (GTFS 24:15 = 1455, 25:00 = 1500); need kuuluvad sama teenusepäeva hilisõhtusse, mitte sama kuupäeva varahommikusse. */
  /** hm(min): "HH:MM"; üle südaöö lisatakse „(+1)”. */
  const hm = m => m == null ? null : String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0") + (m >= 1440 ? " (+1)" : "");
  /** parseHM("08:15") → 495; "24:15" → 1455. */
  const parseHM = s => { const m = /^\s*(\d{1,2}):(\d\d)\s*$/.exec(String(s || "")); return m ? +m[1] * 60 + +m[2] : null; };
  /** Peatuste indeksid: A = asula territooriumil (OSM-polügoon), B = otsinguraadiuses punktist (linnulend). */
  const stopsInAsula = (T, name) => new Set(T.stops.map((s, i) => s.asula === name ? i : -2).filter(i => i >= 0));
  const stopsNear = (T, ll, r) => T.stops.map((s, i) => ({ i, s, d: haversine(ll, s.ll) })).filter(x => x.d <= r).sort((a, b) => a.d - b.d);
  const modeOk = (m, opt) => !((m === "rail" && opt.rail === false) || (m !== "rail" && opt.bus === false));
  /** ytConns(T, date, O, Dst, opt): reisid, mis väljuvad peatustest O (Set). Iga reis loetakse üks kord, ka mitme O peatusega.
      Ilma sihita (Dst = null): t = reisi esimene väljumine O-st. Sihiga: otseühendus = sama reis peatub hiljem Dst peatuses
      (mahaminek lubatud); t = viimane O väljumine enne esimest sellist sihtpeatust, arr = saabumine sinna.
      Tagastab { list: [{ ti, t, arr, r, m, d, h, from, to }], ev: [O väljumiste ajad; sihiga ainult need, millele järgneb sihtpeatus] } või null, kui päeva pole. */
  function ytConns(T, date, O, Dst, opt) {
    const day = T && T.days[date]; if (!day || !day.t) return null; opt = opt || {};
    const list = [], ev = [];
    for (const ti of day.t) {
      const tr = T.trips[ti], rt = T.routes[tr.r], m = rt ? rt.m : null; if (!modeOk(m, opt)) continue;
      const s = tr.s; let first = null, lastO = null, hit = null;
      for (let i = 0; i < s.length; i += 4) {
        const k = s[i];
        if (O.has(k) && !(s[i + 3] & 1) && s[i + 2] != null) { if (!Dst) ev.push(s[i + 2]); if (first == null) first = i; lastO = i; continue; }
        if (Dst && hit == null && lastO != null && Dst.has(k) && !(s[i + 3] & 2) && s[i + 1] != null) hit = [lastO, i];
      }
      if (first == null) continue;
      if (Dst && hit) { let after = false; for (let i = s.length - 4; i >= 0; i -= 4) { const k = s[i]; if (Dst.has(k) && !O.has(k) && !(s[i + 3] & 2)) after = true; else if (after && O.has(k) && !(s[i + 3] & 1) && s[i + 2] != null) ev.push(s[i + 2]); } } // sihiga: ainult väljumised, millele järgneb sihtpeatus
      if (!Dst) list.push({ ti, t: s[first + 2], arr: null, r: tr.r, m, d: tr.d, h: tr.h, from: s[first], to: null });
      else if (hit) list.push({ ti, t: s[hit[0] + 2], arr: s[hit[1] + 1], r: tr.r, m, d: tr.d, h: tr.h, from: s[hit[0]], to: s[hit[1]] });
    }
    list.sort((a, b) => a.t - b.t); ev.sort((a, b) => a - b);
    return { list, ev };
  }
  const inWin = (t, from, to) => t >= from * 60 && t < to * 60;
  /** ytStats(C, from, to): kogu päev ja valitud ajavahemik [from, to) tundides (to ≤ 28) eraldi; tunnijaotus teenusepäeva tunni järgi. */
  function ytStats(C, from, to) {
    if (!C) return null; const L = C.list, W = L.filter(c => inWin(c.t, from, to)), nh = Math.max(24, ...L.map(c => Math.floor(c.t / 60) + 1));
    const bus = new Array(nh).fill(0), rail = new Array(nh).fill(0); L.forEach(c => (c.m === "rail" ? rail : bus)[Math.floor(c.t / 60)]++);
    return { day: L.length, win: W.length, depDay: C.ev.length, depWin: C.ev.filter(t => inWin(t, from, to)).length, bus, rail,
      first: L.length ? L[0].t : null, last: L.length ? L[L.length - 1].t : null, firstWin: W.length ? W[0].t : null, lastWin: W.length ? W[W.length - 1].t : null,
      am: L.filter(c => inWin(c.t, 6, 9)).length, pm: L.filter(c => inWin(c.t, 15, 19)).length };
  }
  /** gapMax(times, from, to): suurim vahe (min) järjestikuste väljumiste vahel ajavahemikus [from, to); vahemiku algus enne esimest ja
      lõpp pärast viimast väljumist ei ole pausid. Alla kahe väljumise → null. Kasutada ühe suuna (ühe sihtkoha) väljumistega. */
  function gapMax(times, from, to) {
    const t = times.filter(x => inWin(x, from, to)).sort((a, b) => a - b); if (t.length < 2) return null;
    let g = 0; for (let i = 1; i < t.length; i++) g = Math.max(g, t[i] - t[i - 1]); return g;
  }
  /** ytStopCounts: väljumised peatuse kaupa (kaardi peatusemärgid) ühe läbimisega; sihiga ainult väljumised, millele samas reisis
      järgneb sihtpeatus. Tagastab { day: [], win: [], routes: [Set] } peatuste indeksite järgi. */
  function ytStopCounts(T, date, Dst, opt, from, to) {
    const n = T.stops.length, day = new Array(n).fill(0), win = new Array(n).fill(0), routes = Array.from({ length: n }, () => new Set()), D = T.days[date]; opt = opt || {};
    if (!D || !D.t) return { day, win, routes };
    for (const ti of D.t) {
      const tr = T.trips[ti], rt = T.routes[tr.r]; if (!modeOk(rt ? rt.m : null, opt)) continue;
      const s = tr.s; let destAfter = !Dst;
      for (let i = s.length - 4; i >= 0; i -= 4) {
        const k = s[i];
        if (Dst && Dst.has(k) && !(s[i + 3] & 2)) destAfter = true;
        else if (k >= 0 && destAfter && !(s[i + 3] & 1) && s[i + 2] != null) { day[k]++; if (inWin(s[i + 2], from, to)) win[k]++; routes[k].add(tr.r); }
      }
    }
    return { day, win, routes };
  }
  /** dayCheck: kas O-st jõuab otseühendusega sihtkohta Dst hiljemalt arriveBy ja samal teenusepäeval tagasi pärast returnAfter. */
  function dayCheck(T, date, O, Dst, arriveBy, returnAfter, opt) {
    const go = ytConns(T, date, O, Dst, opt), back = ytConns(T, date, Dst, O, opt); if (!go || !back) return null;
    const ok = go.list.filter(c => c.arr <= arriveBy).sort((a, b) => b.arr - a.arr || b.t - a.t), bk = back.list.filter(c => c.t >= returnAfter);
    return { go: ok[0] || null, goAlt: ok.slice(1, 3), wait: ok[0] ? arriveBy - ok[0].arr : null, back: bk.slice(0, 3), backWait: bk[0] ? bk[0].t - returnAfter : null,
      nGo: go.list.length, nBack: back.list.length };
  }

  /* ---------- stsenaariumi eksport ja import ---------- */
  function scenarioExport(o) {
    return { schema: SCHEMA, created: o.now || new Date().toISOString(), engine: o.engine, data: o.dataVersions, unit: o.unit, global: o.global, scenarios: o.scenarios, dpUnits: o.dpUnits || {}, storage: "Fail on ainus jagatav koopia; brauserisse salvestatu jääb ainult sellesse seadmesse." };
  }
  function scenarioImport(txt) {
    let j; try { j = typeof txt === "string" ? JSON.parse(txt) : txt; } catch (e) { return { ok: false, err: "fail ei ole JSON" }; }
    if (!j || j.schema !== SCHEMA) return { ok: false, err: "tundmatu skeem (" + (j && j.schema) + ")" };
    if (!Array.isArray(j.scenarios) || !j.scenarios.length || j.scenarios.length > 3) return { ok: false, err: "stsenaariume peab olema 1–3" };
    const keys = ["name", "mig", "extra", "fert", "dp", "n", "type", "start", "years", "capLa", "capSc"];
    const sc = j.scenarios.map(s => Object.fromEntries(keys.map(k => [k, s[k] === undefined ? (k === "dp" ? false : "") : s[k]])));
    return { ok: true, unit: j.unit, global: j.global || {}, scenarios: sc, dpUnits: j.dpUnits || {}, engine: j.engine, created: j.created, data: j.data };
  }

  /* ---------- URL-i olek (ei sisalda isikuandmeid) ---------- */
  function hashParse(h) {
    const [path, q] = String(h || "").replace(/^#/, "").split("?"), [a, b] = path.split("/"), p = {};
    (q || "").split("&").filter(Boolean).forEach(kv => { const [k, v] = kv.split("="); p[decodeURIComponent(k)] = decodeURIComponent(v || ""); });
    return { a: a || "", b: b || "", p };
  }
  const hashBuild = (a, b, p) => "#" + a + (b ? "/" + b : "") + (p && Object.keys(p).length ? "?" + Object.entries(p).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&") : "");

  return { SCHEMA, NA, isNA, dpStatus, eduReserve, stress, capState, budgetSens, budgetTotals, commuteRows, haversine, nearest, ytHourly, inWindow, hm, parseHM, stopsInAsula, stopsNear, ytConns, ytStats, ytStopCounts, gapMax, dayCheck, scenarioExport, scenarioImport, hashParse, hashBuild };
})();
if (typeof module !== "undefined") module.exports = Logic;
