/* Avaandmete automaatne uuendus (etapp 5). Käivitab GitHub Actions kord kuus (.github/workflows/andmed.yml).
   1) Maksu- ja Tolliamet: omavalitsustele üle kantud tulumaks kuude kaupa → data/fin.json MTA.tm26 / tm25
   2) Statistikaamet RR302: tegevusalade kulud 3 viimast aastat → data/ext.json FUNC (la, kool, eak, vesi)
   Muudab ainult neid välju. Pärast uuendust jooksevad enesetestid; kui need ei läbi, uuendust ei salvestata (töövoog ebaõnnestub).
   Kasutus: node tools/update_open_data.js [--dry] */
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "..", "data"), dry = process.argv.includes("--dry");
const kov = JSON.parse(fs.readFileSync(path.join(DIR, "kov.json"))), units = kov.units.map(u => ({ id: u.id, name: u.name }));
const log = [];

/* --- MTA --- */
const num = s => { const t = String(s || "").replace(/\s| /g, "").replace(",", "."); return t === "" ? null : +t; };
function parseMta(csv, names) {
  /* Rida: kood;Omavalitsus;jaan <aasta>;jaan <eelmine>;veebr <aasta>;… ;kokku <aasta>;kokku <eelmine>. Tühjad lahtrid = kuu pole veel laekunud. */
  const out = {};
  csv.split(/\r?\n/).forEach(l => { const v = l.split(";"); const n = (v[1] || "").trim(); if (!names.includes(n)) return;
    const cur = [], prev = []; for (let m = 0; m < 12; m++) { const a = num(v[2 + 2 * m]), b = num(v[3 + 2 * m]); if (a != null) cur.push(a); if (b != null) prev.push(b); }
    out[n] = { cur, prev }; });
  return out;
}
async function mta(fin) {
  const page = await fetch("https://www.emta.ee/eraklient/amet-uudised-ja-kontakt/uudised-pressiinfo-statistika/statistika-ja-avaandmed").then(r => r.text());
  const year = new Date().getFullYear(), re = new RegExp(`href="([^"]+)"[^>]*>[^<]*tulumaksu koondandmed ${year}[^<]*\\|\\s*csv`, "i"), m = page.match(re);
  if (!m) { log.push("MTA: " + year + ". aasta csv linki ei leitud"); return false; }
  const csv = await fetch(m[1].replace(/&amp;/g, "&")).then(r => r.text());
  const P = parseMta(csv, units.map(u => u.name)); let ch = 0;
  if (year !== 2026) { log.push("MTA: aasta " + year + " – mootori väljad on tm26/tm25, vajab mootori uuendust; jätan muutmata"); return false; }
  units.forEach(u => { const r = P[u.name]; if (!r || !r.cur.length) return; const old = JSON.stringify([fin.MTA.tm26[u.id], fin.MTA.tm25[u.id]]);
    fin.MTA.tm26[u.id] = r.cur; if (r.prev.length === 12) fin.MTA.tm25[u.id] = r.prev; if (old !== JSON.stringify([fin.MTA.tm26[u.id], fin.MTA.tm25[u.id]])) { ch++; log.push(`MTA ${u.id}: ${r.cur.length} kuud`); } });
  return ch > 0;
}

/* --- Statistikaamet RR302 --- */
const RR = "https://andmed.stat.ee/api/v1/et/stat/RR302", IND = { la: ["71"], kool: ["72"], eak: ["87"], vesi: ["34", "41"] };
async function rr302(ext) {
  const meta = await fetch(RR).then(r => r.json()), V = c => meta.variables.find(v => v.code === c);
  const yrs = V("Aasta").values.slice(-3), reg = V("Piirkond/Haldusüksus"), code = {};
  units.forEach(u => { const i = reg.valueTexts.findIndex(t => t.replace(/^\.+/, "") === u.name); if (i >= 0) code[u.id] = reg.values[i]; });
  const q = { query: [{ code: "Aasta", selection: { filter: "item", values: yrs } }, { code: "Piirkond/Haldusüksus", selection: { filter: "item", values: Object.values(code) } }, { code: "Näitaja", selection: { filter: "item", values: [...new Set(Object.values(IND).flat())] } }], response: { format: "json-stat2" } };
  const r = await fetch(RR, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(q) }).then(x => x.json());
  const dims = r.id.map(d => Object.keys(r.dimension[d].category.index)), size = r.size, at = (a, b, c) => r.value[(a * size[1] + b) * size[2] + c];
  const iY = dims[0], iR = dims[1], iN = dims[2]; let ch = 0;
  Object.entries(code).forEach(([id, c]) => Object.entries(IND).forEach(([k, inds]) => {
    const arr = iY.map((y, a) => Math.round(inds.reduce((s, n) => s + (at(a, iR.indexOf(c), iN.indexOf(n)) || 0), 0) * 10) / 10);
    if (JSON.stringify(ext.FUNC[k][id]) !== JSON.stringify(arr)) { ext.FUNC[k][id] = arr; ch++; log.push(`RR302 ${id} ${k}: ${yrs.join("–")} ${arr.join(" / ")}`); } }));
  return ch > 0;
}

if (require.main === module) (async () => {
  const fin = JSON.parse(fs.readFileSync(path.join(DIR, "fin.json"))), ext = JSON.parse(fs.readFileSync(path.join(DIR, "ext.json")));
  let a = false, b = false;
  try { a = await mta(fin); } catch (e) { log.push("MTA viga: " + e.message); }
  try { b = await rr302(ext); } catch (e) { log.push("RR302 viga: " + e.message); }
  if (!dry) { if (a) fs.writeFileSync(path.join(DIR, "fin.json"), JSON.stringify(fin)); if (b) fs.writeFileSync(path.join(DIR, "ext.json"), JSON.stringify(ext)); }
  console.log(log.join("\n") || "Muudatusi ei ole: MTA ja RR302 on ajakohased");
})();
module.exports = { parseMta };
