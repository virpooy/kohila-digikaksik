/* Rae avalike andmete lisamine (31.10.2026). Allikad: docs/andmed/rae-avalikud-andmed.md.
   Õpilased on 2023/24 kohta; baasaasta 2026 jaoks korrutatakse vanuserühma osalusmääraga (sama laP/pkP/gP nagu mootoris). */
const fs = require("fs"), E = require("../engine.js");
const pop = JSON.parse(fs.readFileSync("data/pop.json"));
const D = n => JSON.parse(fs.readFileSync("data/" + n + ".json"));
const kov = D("kov"), edu = D("edu"), ext = D("ext"), fin = D("fin");
const ctx = E.build({ kov, pop, fin, edu, ext, settlements: D("settlements") });
const ageOf = y => pop.Rae.age[String(y)];
const a24 = ageOf(2024), a26 = ageOf(2026);
const pk24 = 3627, g24 = 259;
const pk26 = Math.round(pk24 * E.pkP(a26) / E.pkP(a24)), g26 = Math.round(g24 * E.gP(a26) / E.gP(a24));
console.log("põhikool 2023/24", pk24, "→ 2025/26 hinnang", pk26, "| gümnaasium", g24, "→", g26);
edu.pupils.Rae = { tot: pk26 + g26, g: g26, src: "Rae arengukava 2024–2030 lisa 1 (2023/24: põhikool 3627, gümnaasium 259), viidud 2025/26-sse vanuserühmade osalusmääraga", y: "2023/24→2025/26" };
edu.la.Rae = 1946;
edu.cap.Rae = { la: 2360, sc: 3641 + 288 + 155 + 324, src: "Rae arengukava 2024–2030 lisa 1 + Kindluse Kooli juurdeehitus (eelarvestrateegias); kuni 2028 tegelik kohtade arv väiksem" };
ext.FUNC.la.Rae = [18789.2, 24727.7, 23173.4];
ext.FUNC.kool.Rae = [21423.2, 22962.2, 23462.4];
ext.FUNC.eak.Rae = [641.1, 401.0, 440.5];
ext.FUNC.vesi.Rae = [60, 60, 0];
fin.MTA.tm26.Rae = [4275475, 4011720, 4080779, 4313821, 4368018, 4080496, 4222355, 4181676, 4121052];
fin.MTA.tm25.Rae = [4365408, 3718375, 3981060, 4067295, 4229461, 3922194, 4034317, 4052449, 3986819, 4284892, 3948675, 4061218];
const inc = [72051569, 76951328, 80255765, 84530100, 89906361, 94960222], res = [8137599, 6813495, 7509647, 8219679, 9858423, 10748388];
fin.BUD.Rae = { doc: "Eelarvestrateegia 2027–2030", act: "Seletuskiri 2026 (volikogule kinnitamiseks); 2025 täitmine, 2026 eeldatav", st: "eelnõu", url: "https://www.rae.ee/sites/default/files/documents/2026-08/Rae%20valla%20eelarvestrateegia%202027-2030%20seletuskiri.pdf",
  y: [2025, 2026, 2027, 2028, 2029, 2030], lab: ["täitmine", "eeldatav", "prognoos", "prognoos", "prognoos", "prognoos"], inc, res, cost: inc.map((x, i) => x - res[i]),
  capex: [8223761, 7636658, 11340000, 12470000, 11130000, 8330000], lIn: [23330900, 6900000, 10200000, 9300000, 9300000, 7000000],
  debt: [37977432, 38197432, 40986003, 43229672, 45370836, 44178596], net: [35135185, 36161681, 40157211, 42406002, 43652465, 42377506],
  tax: [48524437, 49076594, 50806880, 54368150, 58716663, 63415619] };
kov.units.find(u => u.id === "Rae").edu = "andmed";
const W = (n, o) => fs.writeFileSync("data/" + n + ".json", n === "kov" ? JSON.stringify(o, null, 2) + "\n" : JSON.stringify(o));
W("edu", edu); W("ext", ext); W("fin", fin); /* kov.json: Rae "edu": "andmed" muudetud käsitsi, et vormingut säilitada */
