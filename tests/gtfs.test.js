/* GTFS-töötluse ja reisipõhise arvutuse testid väikese näidisvoo peal (tests/fixtures/gtfs_mini). Käivitus: node tests/gtfs.test.js */
"use strict";
const path = require("path");
const fs = require("fs");
const G = require("../tools/gtfs.js");
const L = require("../src/logic.js");

let fail = 0, n = 0;
function eq(name, got, exp) {
  n++; const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) { fail++; console.log(`VIGA  ${name}: saadi ${JSON.stringify(got)}, oodati ${JSON.stringify(exp)}`); } else console.log(`OK    ${name}`);
}

(async () => {
  const dir = path.join(__dirname, "fixtures/gtfs_mini");
  const map = JSON.parse(fs.readFileSync(path.join(dir, "map.json"), "utf8"));
  const out = await G.buildAll({ feedDirs: [{ name: "mini", dir }], maps: { Test: map }, centres: { Test: "Kesk alev" },
    built: "2026-11-01T12:00:00Z", feedMeta: { mini: { url: "fixture", lastModified: null, fetched: null } } });
  const o = out.Test;
  const D = (d) => o.days[d];
  const MON = "2026-11-02", TUE = "2026-11-03", WED = "2026-11-04", SUN = "2026-11-08";
  const si = (id) => o.stops.findIndex((s) => s.id === "mini:" + id);
  const set = (...ids) => new Set(ids.map((x) => (typeof x === "number" ? x : si(x))));
  const AK = "Aküla küla", AA = "Aküla alevik";

  // abifunktsioonid
  eq("toSec 25:20", G.toSec("25:20:00"), 91200);
  eq("fmt 25:20", G.fmt(91200), "01:20");
  eq("asulaKey", G.asulaKey("Kohila alev"), "Kohila");
  eq("hm 24:15 ja 25:00 (järgmine päev)", [L.hm(1455), L.hm(1500), L.parseHM("24:15")], ["00:15 (+1)", "01:00 (+1)", 1455]);
  eq("skeem 2", o.schema, 2);
  eq("kuupäevad algavad järgmisest esmaspäevast", [o.meta.dates[0], o.meta.dates.length], [MON, 14]);
  eq("kehtivus", [o.meta.feeds[0].validFrom, o.meta.feeds[0].validTo], ["2026-11-01", "2026-11-30"]);
  eq("dayInfo", [o.meta.dayInfo[WED].wd, o.meta.dayInfo[WED].exceptions, o.meta.dayInfo[MON].exceptions], ["K", 1, 0]);

  // (1) calendar_dates eemaldamine ja lisamine
  eq("(1) E: Aküla küla reisid (t1)", D(MON).asula[AK].trips, 1);
  eq("(1) T: lisandub rong t4", [D(TUE).asula[AK].trips, D(TUE).asula[AK].hr[9]], [2, 1]);
  eq("(1) K: t1 eemaldatud", [D(WED).asula[AK].trips, D(WED).asula[AK].dep], [0, 0]);
  eq("(1) K: tühja päeva ajad null", [D(WED).asula[AK].first, D(WED).asula[AK].tln.firstArr], [null, null]);

  // (2) sama reis kahes sama asula peatuses: trips 1, dep 2
  eq("(2) Aküla küla dep/trips", [D(MON).asula[AK].dep, D(MON).asula[AK].trips], [2, 1]);
  eq("(2) tunnijaotus reisi esimese väljumise järgi", D(MON).asula[AK].h[7], 1);
  eq("(2) Tallinna otseühendus", D(MON).asula[AK].tln, { trips: 1, firstArr: "08:00", minMin: 55, am7_9: 1 });
  eq("(2) keskus ja kool", [D(MON).asula[AK].keskus.trips, D(MON).asula[AK].kool], [1, { arrBy0815: "07:20", arrFirst: "07:20", ret: 1 }]);

  // (3) reisi viimane peatus ei ole väljumine (arvutus reisimustritest)
  const cA1 = L.ytConns(o, MON, set("A1"), null), cK1 = L.ytConns(o, MON, set("K1"), null), sK1 = L.ytStats(cK1, 0, 24);
  eq("(3) A1 väljumisi E (t2 lõpeb A1-s)", cA1.ev.length, 1);
  eq("(3) K1 väljumised E (t1, t2; t3, t5–t7 lõpevad)", [sK1.depDay, L.hm(sK1.first), L.hm(sK1.last), L.gapMax(cK1.ev, 5, 23)], [2, "07:20", "16:40", 560]);

  // (4) üle 24:00 ajad: teenusepäeva hilisõhtu, mitte sama kuupäeva varahommik
  const sB = L.ytStats(L.ytConns(o, MON, set("B1"), null), 6, 24), sB28 = L.ytStats(L.ytConns(o, MON, set("B1"), null), 6, 28);
  eq("(4) B1 25:20 ei ole vahemikus 6–24, on vahemikus 6–28", [sB.day, sB.win, sB28.win, L.hm(sB.first)], [1, 0, 1, "01:20 (+1)"]);
  eq("(4) tunnijaotus teenusepäeva tunnis 25 (mitte tunnis 1)", [sB.bus.length, sB.bus[25], sB.bus[1]], [26, 1, 0]);
  eq("(4) generaatori koondväli: tund 1 (ajalooline kuju)", D(MON).asula["Bküla küla"].h[1], 1);

  // (5) otseühenduse puudumine
  eq("(5) Bküla → Tallinn puudub", D(MON).asula["Bküla küla"].tln, { trips: 0, firstArr: null, minMin: null, am7_9: 0 });
  eq("(5) Bküla kool: keskusse enne 08:15 ei jõua", D(MON).asula["Bküla küla"].kool, { arrBy0815: null, arrFirst: null, ret: 0 });
  eq("(5) gapMax ühe väljumisega = null", D(MON).asula["Bküla küla"].gapMax, null);
  eq("kool: hiliseim saabumine ≤08:15 ja varaseim", D(MON).asula["Cküla küla"].kool, { arrBy0815: "08:10", arrFirst: "06:20", ret: 0 });
  eq("keskusasula enda keskus/kool null", [D(MON).asula["Kesk alev"].keskus, D(MON).asula["Kesk alev"].kool], [null, null]);

  // (6) asula võti = täisnimi: sama põhinimega alevik ja küla on eraldi (Hageri juhtum)
  eq("(6) Aküla küla ja Aküla alevik eraldi (alevik: t8, t10 ja piiripeatuse t11)", [D(SUN).asula[AK].trips, D(SUN).asula[AA].trips], [1, 3]);
  eq("(6) peatused eri asulates", [o.stops[si("A1")].asula, o.stops[si("A3")].asula], [AK, AA]);
  eq("(6) piiril olev peatus kuulub täpselt ühte asulasse (pool-avatud reegel)", [o.stops[si("E1")].asula, o.meta.kylad.filter((k) => k.stops).map((k) => k.n + ":" + k.stops).sort()], [AA, ["Aküla alevik:2", "Aküla küla:2", "Bküla küla:1", "Cküla küla:1", "Kesk alev:1"]]);

  // (7) piiriväline peatus ja topeltarvestus
  eq("(7) piiriväline peatus on andmetes, asulata", [o.stops[si("O1")].out, o.stops[si("O1")].asula], [true, null]);
  const near = L.stopsNear(o, [59.0, 24.15], 2000).map((x) => x.s.id);
  eq("(7) otsinguraadius leiab piirivälise peatuse", near, ["mini:O1"]);
  const cB = L.ytConns(o, SUN, set("O1", "A3", "A1"), null);
  eq("(7) sama reis mitmes lähestikku peatuses loetakse üks kord", [cB.list.length, cB.ev.length, cB.list.map((c) => c.t)], [2, 4, [390, 1455]]);

  // (8) Tallinna kesklinna tsoon ühe sündmusena; otseühendus ja tagasisõit
  const t8 = o.trips.find((t) => t.id === "mini:t8");
  eq("(8) t8 muster: väljas, alevik, küla, Tallinn (tsoon −1)", t8.s, [si("O1"), 390, 390, 2, si("A3"), 400, 400, 0, si("A1"), 410, 410, 0, -1, 460, 460, 0]);
  const dc = L.dayCheck(o, SUN, set("A3"), new Set([-1]), 480, 900);
  eq("(8) tööpäeva kontroll: minek ja tagasi", [dc.go.t, dc.go.arr, dc.wait, dc.back[0].t, dc.back[0].arr, dc.backWait], [400, 460, 20, 965, 1010, 65]);
  eq("(8) liiga vara: sobivat otseühendust ei leitud (null, mitte 0)", L.dayCheck(o, SUN, set("A3"), new Set([-1]), 420, 900).go, null);
  const toT = L.ytConns(o, MON, set("A1", "A2", "K1"), new Set([-1]));
  eq("(8) sihiga väljumised: ainult need, millele järgneb sihtpeatus (t2 K1 → A1 ei loe)", [toT.list.length, toT.ev.length], [1, 3]);
  const toK = L.ytConns(o, MON, set("C1"), set("K1"));
  eq("(9) suunatud paus: Cküla → keskus", [toK.list.map((c) => c.t), L.gapMax(toK.list.map((c) => c.t), 5, 23)], [[360, 460, 480], 100]);
  const fromK = L.ytConns(o, MON, set("K1"), set("C1"));
  eq("(9) vastassuunda ei liideta (keskus → Cküla puudub)", fromK.list.length, 0);

  // (10) reisipõhine arvutus = generaatori koondväärtused (kõik päevad ja asulad)
  let bad = 0;
  for (const d of o.meta.dates) for (const [k, a] of Object.entries(D(d).asula)) { const c = L.ytConns(o, d, L.stopsInAsula(o, k), null); if (c.list.length !== a.trips || c.ev.length !== a.dep) bad++; }
  eq("(10) reisid ja väljumised = days.asula", bad, 0);

  // vald, struktuur
  eq("vald T: unikaalsed reisid", [D(TUE).vald.trips, D(TUE).vald.dep], [7, 9]);
  eq("Tallinna ja kasutamata peatus ei ole peatuste hulgas; piiriväline on", o.stops.map((s) => s.id).sort(), ["mini:A1", "mini:A2", "mini:A3", "mini:B1", "mini:C1", "mini:E1", "mini:K1", "mini:O1"]);
  eq("liiniliigid", [o.routes["mini:R3"].m, o.routes["mini:R1"].m, o.routes["mini:R1"].op], ["rail", "bus", "Testivedaja"]);
  eq("kuju lõigatud ja lihtsustatud", [o.routeShapes["mini:R1"], o.shapes["mini:S1"].length < 10], [["mini:S1"], true]);
  eq("CSV jutumärgid", G.parseCsvLine('a,"b, c",d'), ["a", "b, c", "d"]);

  console.log(`\n${n - fail}/${n} testi korras`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
