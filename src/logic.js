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
    return res.util >= 0.95 ? "warn" : "ok";
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
    const L = [["sama", "samas omavalitsuses", null], ["tallinn", "Tallinnas", "tallinn"], ["tartu", "Tartus", "tartu"], ["muuKovMk", C.mk[id] === "Harju" ? "mujal Harjumaal (v.a Tallinn)" : "mujal Raplamaal", null], ["muuMk", "muus maakonnas (v.a Tallinn, Tartu)", null], ["valismaa", "välismaal", null], ["teadmata", "teadmata", null]];
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

  return { SCHEMA, NA, isNA, dpStatus, eduReserve, stress, capState, budgetSens, budgetTotals, commuteRows, haversine, nearest, ytHourly, inWindow, scenarioExport, scenarioImport, hashParse, hashBuild };
})();
if (typeof module !== "undefined") module.exports = Logic;
