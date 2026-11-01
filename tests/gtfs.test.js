/* GTFS-töötluse testid väikese näidisvoo peal (tests/fixtures/gtfs_mini). Käivitus: node tests/gtfs.test.js */
"use strict";
const path = require("path");
const fs = require("fs");
const G = require("../tools/gtfs.js");

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
  const MON = "2026-11-02", TUE = "2026-11-03", WED = "2026-11-04";

  // abifunktsioonid
  eq("toSec 25:20", G.toSec("25:20:00"), 91200);
  eq("fmt 25:20", G.fmt(91200), "01:20");
  eq("asulaKey", G.asulaKey("Kohila alev"), "Kohila");
  eq("kuupäevad algavad järgmisest esmaspäevast", [o.meta.dates[0], o.meta.dates.length], [MON, 14]);
  eq("kehtivus", [o.meta.feeds[0].validFrom, o.meta.feeds[0].validTo], ["2026-11-01", "2026-11-30"]);
  eq("dayInfo", [o.meta.dayInfo[WED].wd, o.meta.dayInfo[WED].exceptions, o.meta.dayInfo[MON].exceptions], ["K", 1, 0]);

  // (1) calendar_dates eemaldamine ja lisamine
  eq("(1) E: Aküla reisid (t1)", D(MON).asula["Aküla"].trips, 1);
  eq("(1) T: lisandub rong t4", [D(TUE).asula["Aküla"].trips, D(TUE).asula["Aküla"].hr[9]], [2, 1]);
  eq("(1) K: t1 eemaldatud", [D(WED).asula["Aküla"].trips, D(WED).asula["Aküla"].dep], [0, 0]);
  eq("(1) K: tühja päeva ajad null", [D(WED).asula["Aküla"].first, D(WED).asula["Aküla"].tln.firstArr], [null, null]);

  // (2) sama reis kahes sama asula peatuses: trips 1, dep 2
  eq("(2) Aküla dep/trips", [D(MON).asula["Aküla"].dep, D(MON).asula["Aküla"].trips], [2, 1]);
  eq("(2) tunnijaotus reisi esimese väljumise järgi", D(MON).asula["Aküla"].h[7], 1);
  eq("(2) Tallinna otseühendus", D(MON).asula["Aküla"].tln, { trips: 1, firstArr: "08:00", minMin: 55, am7_9: 1 });
  eq("(2) keskus ja kool", [D(MON).asula["Aküla"].keskus.trips, D(MON).asula["Aküla"].kool], [1, { arrBy0815: "07:20", arrFirst: "07:20", ret: 1 }]);

  // (3) reisi viimane peatus ei ole väljumine
  eq("(3) A1 väljumisi E (t2 lõpeb A1-s)", D(MON).stop["mini:A1"].dep, 1);
  eq("(3) K1 väljumised E (t1, t2; t3 lõpeb)", [D(MON).stop["mini:K1"].dep, D(MON).stop["mini:K1"].first, D(MON).stop["mini:K1"].last, D(MON).stop["mini:K1"].gapMax], [2, "07:20", "16:40", 560]);

  // (4) üle 24:00 ajad
  eq("(4) B1 tund 1", [D(MON).stop["mini:B1"].h[1], D(MON).stop["mini:B1"].first], [1, "01:20"]);
  eq("(4) Bküla asula tund 1", D(MON).asula["Bküla"].h[1], 1);

  // (5) otseühenduse puudumine
  eq("(5) Bküla → Tallinn puudub", D(MON).asula["Bküla"].tln, { trips: 0, firstArr: null, minMin: null, am7_9: 0 });
  eq("(5) Bküla kool: keskusse enne 08:15 ei jõua", D(MON).asula["Bküla"].kool, { arrBy0815: null, arrFirst: null, ret: 0 });
  eq("(5) gapMax ühe väljumisega = null", D(MON).asula["Bküla"].gapMax, null);
  eq("kool: hiliseim saabumine ≤08:15 ja varaseim", D(MON).asula["Cküla"].kool, { arrBy0815: "08:10", arrFirst: "06:20", ret: 0 });
  eq("keskusasula enda keskus/kool null", [D(MON).asula["Kesk"].keskus, D(MON).asula["Kesk"].kool], [null, null]);

  // vald, struktuur
  eq("vald T: unikaalsed reisid", [D(TUE).vald.trips, D(TUE).vald.dep], [7, 9]);
  eq("Tallinna ja kasutamata peatus ei ole valla peatuste hulgas", o.stops.map((s) => s.id).sort(), ["mini:A1", "mini:A2", "mini:B1", "mini:C1", "mini:K1"]);
  eq("bussipeatusel pole hr-i", [D(MON).stop["mini:B1"].hr, D(MON).stop["mini:B1"].h.length], [undefined, 24]);
  eq("liiniliigid", [o.routes["mini:R3"].m, o.routes["mini:R1"].m, o.routes["mini:R1"].op], ["rail", "bus", "Testivedaja"]);
  eq("kuju lõigatud ja lihtsustatud", [o.routeShapes["mini:R1"], o.shapes["mini:S1"].length < 10], [["mini:S1"], true]);
  eq("CSV jutumärgid", G.parseCsvLine('a,"b, c",d'), ["a", "b, c", "d"]);

  console.log(`\n${n - fail}/${n} testi korras`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
