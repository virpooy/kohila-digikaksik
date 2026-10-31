// D-testide täiskäivitaja (algne versioon; run_all.js asendati 31.10 00:58 teise, lib.js-iga ühildumatu failiga).
// Käivita: node /home/claude/pk/audit/D/run_all_D.js <html fail> [teekonnad, nt j1,j3]
// Prindib iga kontrolli PASS/FAIL ja kirjutab D/out/results.json. Väljumiskood 1, kui mõni kontroll kukkus.
const L = require("./lib");
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const file = path.resolve(process.argv[2] || "/home/claude/pk/audit/v34.html");
const only = (process.argv[3] || "").split(",").filter(Boolean);
const J = [
  ["j1", "./j1_new_plan", [{ tag: "desk-light", width: 1280, height: 900 }, { tag: "mob-dark", width: 390, height: 844, mobile: true, dark: true }]],
  ["j2", "./j2_stages", [{ tag: "desk-light", width: 1280, height: 900 }]],
  ["j2m", "./j2_stages", [{ tag: "mob-dark", width: 390, height: 844, mobile: true, dark: true, short: true }]],
  ["j3", "./j3_liik", [{ tag: "desk", width: 1280, height: 900 }]],
  ["j4", "./j4_robust", [{ tag: "desk", width: 1280, height: 900 }]],
  ["j5", "./j5_desk", [{ tag: "desk", width: 1280, height: 900 }]],
  ["j6", "./j6_layout", [{ tag: "all" }]],
];
(async () => {
  if (!fs.existsSync(path.join(__dirname, "fixtures", "Algatamise taotlus Kase tn 7.pdf"))) execFileSync("python3", ["-I", path.join(__dirname, "make_docs.py")], { stdio: "inherit" });
  const port = 8790 + Math.floor(Math.random() * 100);
  const srv = await L.startServer(file, port); const url = `http://localhost:${port}/`;
  const browser = await L.chromium.launch();
  console.log(`Fail: ${file}\nURL: ${url}`);
  for (const [id, mod, variants] of J) {
    if (only.length && !only.includes(id)) continue;
    for (const v of variants) {
      try { await require(mod).run(browser, url, v); }
      catch (e) { L.check(`${id}.${v.tag}.CRASH`, "Testiskript jooksis kokku", false, String(e && e.stack || e).slice(0, 500)); }
    }
  }
  await browser.close(); srv.close();
  const R = L.results, f = R.filter(r => !r.pass);
  fs.writeFileSync(path.join(__dirname, "out", "results.json"), JSON.stringify({ file, at: new Date().toISOString(), total: R.length, failed: f.length, results: R }, null, 1));
  console.log(`\nKOKKU ${R.length} kontrolli · PASS ${R.length - f.length} · FAIL ${f.length}`);
  f.forEach(r => console.log(`  FAIL ${r.id} ${r.name}`));
  process.exit(f.length ? 1 : 0);
})();
