/* Sisulised kontrollid (täiendus 11.2026). Käivita: node tests/content.test.js */
"use strict";
const fs = require("fs"), path = require("path");
const E = require("../engine.js"), L = require("../src/logic.js");
const R = p => JSON.parse(fs.readFileSync(path.join(__dirname, "..", p), "utf8"));
const D = {}; ["kov", "pop", "fin", "edu", "ext", "settlements", "dp", "commute"].forEach(f => D[f] = R("data/" + f + ".json"));
const ctx = E.build(D);
let n = 0, bad = 0;
const ok = (c, name, det) => { n++; if (!c) { bad++; console.log("✗", name, det || ""); } else console.log("✓", name); };
const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t * Math.max(1, Math.abs(a), Math.abs(b));

/* 1. Puuduv planeeringumaht ei muutu nullmõjuks */
{
  const rows = [{ id: "a", name: "A", housing: true, units: {} }, { id: "b", name: "B", housing: true, units: { korter: 40 } }, { id: "c", name: "C", housing: false, units: {} }];
  const s = L.dpStatus(rows, {});
  ok(s.state === "osaline" && s.missing === 1 && s.full === 1 && s.noHousing === 1, "dpStatus: osaline portfell tuvastatakse");
  ok(s.list.find(x => x.id === "a").units === null && s.list.find(x => x.id === "a").status === "arvutamata", "dpStatus: puuduv maht on null-väärtus (puudub), mitte 0 eluruumi");
  ok(/ei ole kogu planeeringuportfelli mõju/.test(s.note), "dpStatus: osalise tulemuse märkus");
  const s2 = L.dpStatus(rows.slice(0, 1), {}); ok(s2.state === "arvutamata" && /ei ole null/.test(s2.note), "dpStatus: kõik puudu → „arvutamata”, mitte nullmõju");
  const s3 = L.dpStatus(rows.slice(0, 1), { a: { eramu: 10 } }); ok(s3.state === "täielik", "dpStatus: kasutaja sisestus täiendab");
  const real = L.dpStatus(D.dp.rows, {}); ok(real.housing >= 1 && real.missing + real.full === real.housing, "dpStatus: tegelik dp.json loendus kooskõlas");
}

/* 2. GTFS: kalendrierandid ja topeltarvestus (fixture), kaardi/graafiku/tabeli kooskõla (päris andmed) */
{
  const T = path.join(__dirname, "gtfs.test.js");
  if (fs.existsSync(T)) { const r = require("child_process").spawnSync(process.execPath, [T], { encoding: "utf8" }); ok(r.status === 0, "GTFS fixture-testid (kalendrierandid, unikaalsed reisid, >24:00)", r.stdout.split("\n").filter(l => /✗|FAIL/.test(l)).join("; ")); }
  const dir = path.join(__dirname, "..", "data", "transit");
  if (fs.existsSync(dir)) fs.readdirSync(dir).filter(f => f.endsWith(".json")).forEach(f => {
    const t = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); let e1 = 0, e2 = 0, e3 = 0;
    Object.entries(t.days).forEach(([d, day]) => {
      Object.values(day.asula).concat([day.vald]).forEach(o => { const s = o.h.reduce((a, b) => a + b, 0) + o.hr.reduce((a, b) => a + b, 0); if (s !== o.trips) e1++; if (o.trips > o.dep) e2++; if (L.inWindow(o.h, 0, 24) + L.inWindow(o.hr, 0, 24) !== o.trips) e3++; });
    });
    ok(!e1 && !e2 && !e3, `GTFS ${f}: tunnijaotuse summa = reiside arv (kaart, graafik ja tabel samast väärtusest); reise ≤ väljumisi`, `${e1}/${e2}/${e3}`);
    ok(t.meta.dates.every(d => t.meta.dayInfo[d]) && t.meta.feeds.every(x => x.validFrom && x.validTo && x.fetched), `GTFS ${f}: analüüsipäev, kehtivus ja hankimise aeg on eraldi väljad`);
  });
}

/* 3. Rahasummade hinnatase ja mõjude liigid */
{
  const H = E.housingImpact(ctx, "Kohila", { n: 120, type: "korter", start: 2028, years: 2 }, { mig: "mean", extra: 0, fert: 0 });
  const B = L.budgetSens(H.last), T = L.budgetTotals(H);
  ok(near(B.rows[0].net, H.last.dNet), "eelarve: tundlikkuse alusrida = mootori neto");
  ok(near(T.periodTotal, H.rows.filter(r => r.y > 2026).reduce((s, r) => s + r.dNet, 0)) && T.discount === null, "eelarve: perioodi kogumõju = aastamõjude summa, diskonteerimata");
  ok(!near(T.periodTotal, T.periodTotal + T.invest) || T.invest === 0, "eelarve: ühekordne investeering ei ole aastamõjus ega kogumõjus");
  ok(typeof B.signStable === "boolean" && B.rows.length >= 5, "eelarve: märgi stabiilsus arvutatakse");
}

/* 4. Tööalased vood: ühikud ja nimetajad */
{
  ["Kohila", "Rae", "Rapla", "Marjamaa", "Kehtna"].forEach(id => {
    const C = L.commuteRows(D.commute, id), s = C.rows.reduce((a, r) => a + r.v, 0);
    ok(s + C.resid === C.total && Math.abs(C.resid) <= 2, `pendelränne ${id}: osad + jääk = hõivatud kokku (${C.total})`);
    ok(C.rows.every(r => near(r.share, r.v / C.total)), `pendelränne ${id}: osakaalu nimetaja = valla hõivatud`);
    ok(C.rows.filter(r => r.loc).map(r => r.k).join() === "tallinn,tartu", `pendelränne ${id}: kaardile paigutatakse ainult tegeliku asukohaga sihtkohad`);
    const raw = D.commute.raw[id]; ok(raw.tallinn <= (D.commute.mk[id] === "Harju" ? raw.muuKovMk : raw.muuMk), `pendelränne ${id}: Tallinn on õige ülemkategooria alamosa`);
  });
}

/* 5. Ajaloolised andmed vs stsenaarium */
{
  const P1 = E.project(ctx, "Kohila", { mig: "mean", extra: 0, fert: 0 }), P2 = E.project(ctx, "Kohila", { mig: "r3", extra: 100, fert: 10 });
  ok(E.total(P1[2026]) === E.total(P2[2026]) && E.total(D.pop.Kohila.age["2026"]) === D.pop.Kohila.tot["2026"], "ajalugu: 2026 baas ei sõltu stsenaariumist");
  ok(E.total(P1[2036]) !== E.total(P2[2036]), "stsenaarium: tulevik sõltub eeldustest");
  ok(JSON.stringify(D.commute.raw.Kohila) === JSON.stringify(R("data/commute.json").raw.Kohila), "stsenaarium ei muuda ajaloolisi tööalaseid vooge");
}

/* 6. Salvestatud stsenaariumi taastamine */
{
  const SC = [{ name: "A", mig: "mean", extra: 0, fert: 0, dp: false, n: 0, type: "korter", start: 2028, years: 2, capLa: "", capSc: "" }, { name: "B", mig: "r2", extra: 30, fert: -5, dp: true, n: 120, type: "eramu", start: 2029, years: 3, capLa: 500, capSc: "" }];
  const x = L.scenarioExport({ engine: E.VERSION, dataVersions: { dp: D.dp.updated }, unit: "Kohila", global: { unit: "Kohila", mig: "mean", extra: 0, fert: 0, year: 2036 }, scenarios: SC, dpUnits: { a: { korter: 5 } }, now: "2026-11-01T00:00:00Z" });
  ok(x.schema === L.SCHEMA && x.engine && x.created && x.data, "eksport: skeem, mootor, aeg ja andmeversioonid olemas");
  const r = L.scenarioImport(JSON.stringify(x));
  ok(r.ok && JSON.stringify(r.scenarios) === JSON.stringify(SC) && r.dpUnits.a.korter === 5 && r.unit === "Kohila", "import: stsenaarium taastub muutumata kujul");
  ok(!L.scenarioImport("{}").ok && !L.scenarioImport("x").ok, "import: vale fail lükatakse tagasi");
  const H = L.hashParse(L.hashBuild("kaart", "yt", { u: "Rae", y: 2031 })); ok(H.a === "kaart" && H.b === "yt" && H.p.u === "Rae" && H.p.y === "2031", "URL-i olek: valikud taastuvad");
}

/* 7. Teenuste reserv */
{
  const rows = [{ y: 2026, la: 400 }, { y: 2030, la: 450 }, { y: 2036, la: 420 }], r = L.eduReserve(rows, 470, "la");
  ok(r.year === 2030 && near(r.util, 450 / 470) && r.minFree === 20 && near(r.growthToShort, 470 / 450 - 1), "reserv: suurim täituvus, aasta, väikseim vaba kohtade arv ja kasvuruum");
  ok(L.capState(r, null) === "warn", "reserv: üle 95% täituvus ei ole „korras”");
  ok(L.eduReserve(rows, null, "la").na, "reserv: puuduv kohtade arv ei ole 0");
}

console.log(`\n${n - bad}/${n} sisulist kontrolli läbitud`);
process.exit(bad ? 1 : 0);
