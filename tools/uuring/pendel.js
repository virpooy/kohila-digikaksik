/* RL21163 (REL 2021): hõivatud elukoha (KOV) ja töökoha asukoha kategooria järgi, mehed ja naised kokku. */
const fs = require("fs"); fs.mkdirSync("out", { recursive: true });
const KOV = { Kohila: "00710317000001", Rae: "00370653000001", Rapla: "00710668000001", Marjamaa: "00710502000001", Kehtna: "00710293000001" };
(async () => {
  const q = { query: [{ code: "Sugu", selection: { filter: "item", values: ["1"] } }, { code: "Elukoht", selection: { filter: "item", values: Object.values(KOV) } }, { code: "Töökoha asukoht", selection: { filter: "all", values: ["*"] } }], response: { format: "json-stat2" } };
  const r = await fetch("https://andmed.stat.ee/api/v1/et/stat/RL21163", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(q) });
  const t = await r.text(); fs.writeFileSync("out/rl21163.json", t); console.log(r.status, t.length);
  const m = await (await fetch("https://andmed.stat.ee/api/v1/et/stat/RL21163")).text(); fs.writeFileSync("out/rl21163_meta.json", m);
})();
