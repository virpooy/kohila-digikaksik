/* Brauseri suitsutest: avab kõik jaotised laiusel 1440 (hele) ja 390 (tume), kogub konsoolivead, veateated
   ja horisontaalse kerimise; salvestab ekraanipildid kausta tests/ui/out/.
   Eeldus: leht serveeritakse aadressil BASE (vaikimisi http://localhost:8765/index.html), nt `python3 -m http.server 8765`.
   Kasutus: node tests/ui/smoke.js [rühm]   (nt node tests/ui/smoke.js kaart) */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const BASE = process.env.BASE || "http://localhost:8765/index.html";
const SECS = { ylevaade: ["lyhivaade", "kindlus", "kuidas"], kaart: ["atlas", "too", "yt", "ligi"], rahvastik: ["rahvaarv", "vanus", "asulad", "kohad", "invest", "seire", "siht"], otsused: ["toolaud", "dp", "arendus", "eelhinnang", "kysi"], andmed: ["allikad", "tapsus", "sonastik", "mootor", "kasutus", "konf"] };
const OUT = path.join(__dirname, "out"); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const only = process.argv[2], b = await chromium.launch(); let bad = 0;
  for (const [w, theme, units] of [[1440, "light", ["Kohila", "Rae", "MAAK", "Kehtna"]], [390, "dark", ["Kohila"]]]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } }), errs = [];
    p.on("console", m => { if (m.type() === "error" && !/fonts|TUNNEL|ERR_/.test(m.text())) errs.push(m.text()); });
    p.on("pageerror", e => errs.push(e.message));
    await p.addInitScript(t => localStorage.setItem("kaksik3:theme", t), theme);
    await p.goto(BASE + "#ylevaade"); await p.waitForSelector(".bcards", { timeout: 30000 });
    for (const unit of units) {
      await p.evaluate(u => document.querySelector(`#unitSeg button[data-u="${u}"]`).click(), unit);
      for (const [c, ss] of Object.entries(SECS)) for (const s of ss) {
        if (only && c !== only) continue;
        await p.evaluate(h => location.hash = h, `#${c}/${s}`); await p.waitForTimeout(c === "kaart" ? 1200 : 200);
        const r = await p.evaluate(() => ({ ov: document.documentElement.scrollWidth - innerWidth, err: [...document.querySelectorAll(".err")].map(e => e.textContent.slice(0, 160)), load: !!document.querySelector(".k9sec:not(.k9off) .loading") }));
        if (r.ov > 0 || r.err.length || r.load) { bad++; console.log("✗", w, theme, unit, c + "/" + s, JSON.stringify(r)); }
        if (unit === "Kohila") await p.screenshot({ path: path.join(OUT, `${w}_${c}_${s}.png`), fullPage: true });
      }
    }
    if (errs.length) { bad += errs.length; console.log("✗", w, theme, "konsoolivead:", errs.slice(0, 8)); }
    await p.close();
  }
  await b.close();
  console.log(bad ? `${bad} probleemi` : "UI suitsutest läbitud", "· ekraanipildid:", OUT);
  process.exit(bad ? 1 : 0);
})();
