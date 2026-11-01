/* Uurimispäring GitHub Actionsis: väljund kirjutatakse failidesse out/, mis lükatakse harusse "uuring". */
const fs = require("fs"); fs.mkdirSync("out", { recursive: true });
const w = (f, s) => fs.writeFileSync("out/" + f, typeof s === "string" ? s : JSON.stringify(s, null, 1));
(async () => {
  const get = async (u, o) => { try { const r = await fetch(u, o); return { st: r.status, h: Object.fromEntries(r.headers), body: o && o.method === "HEAD" ? "" : await r.text() }; } catch (e) { return { st: "ERR " + e.message }; } };
  for (const t of ["RL21163", "RL21162", "RL21164", "RL21165", "RL21161", "RL21460", "RL21461", "RL21450"]) { const r = await get("https://andmed.stat.ee/api/v1/et/stat/" + t); w("meta_" + t + ".json", r.st + "\n" + (r.body || "").slice(0, 60000)); }
  for (const q of ["töökoha", "pendel", "elukoha ja töökoha"]) { const r = await get("https://andmed.stat.ee/api/v1/et/stat?query=" + encodeURIComponent(q)); w("q_" + q.replace(/ /g, "_") + ".json", r.st + "\n" + (r.body || "").slice(0, 60000)); }
  const feeds = ["https://eu-gtfs.remix.com/raplamaa.zip", "https://eu-gtfs.remix.com/harjumaa.zip", "https://eu-gtfs.remix.com/elron.zip", "https://eu-gtfs.remix.com/tallinn.zip", "https://peatus.ee/gtfs/gtfs.zip"];
  const res = []; for (const f of feeds) { const r = await get(f, { method: "HEAD" }); res.push([f, r.st, r.h && r.h["content-length"], r.h && r.h["last-modified"]]); } w("gtfs_head.json", res);
})();
