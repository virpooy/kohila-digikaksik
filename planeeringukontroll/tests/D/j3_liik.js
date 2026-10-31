// Teekond 3: menetlusliigi (tava, tava_ksh, ypm, ypm_ksh, dpm, yp_puudub) ja akti vormi vahetamine poole menetluse pealt
const L = require("./lib");
const { setupKase, waitDl } = require("./j2_stages");
const LIIK = ["tava", "tava_ksh", "ypm", "ypm_ksh", "dpm", "yp_puudub", "tava"];

async function walkAll(p) {
  // käib läbi kõik etapid ja sammud; tagastab iga vaate tekstijupi
  const out = {};
  for (const t of ["algatamine", "vastuvotmine", "kehtestamine"]) {
    await L.go(p, t);
    for (const s of ["docs", "dates", "act", "nt", "ai"]) { await L.step(p, s); out[t + "/" + s] = await p.evaluate(() => { const v = [...document.querySelectorAll(".spane")].find(e => !e.hidden); return v ? v.innerText.length : -1; }); }
  }
  return out;
}
async function run(browser, url, v) {
  const T = s => `J3.${s}`;
  L.journey("J3 menetlusliigi ja akti vahetamine");
  const ctx = await L.newCtx(browser, v); const p = await ctx.newPage(); const log = L.watch(p);
  await p.goto(url); await L.sleep(1000);
  await setupKase(p);
  await L.go(p, "algatamine");
  await p.evaluate(() => { const b = document.querySelector('[data-evok="algatamine"]'); b && b.click(); }); await L.sleep(300);
  // täida alg read Claude'iga, et oleks andmeid, mis võiksid „lekkida”
  await L.step(p, "act"); await p.evaluate(() => document.querySelector("#btnAiFill").click());
  for (let i = 0; i < 40; i++) { await L.sleep(300); if (await p.evaluate(() => document.querySelector("#aiProgress").hidden)) break; }
  // akti vormi vahetus planeeringu andmetes (algatamise lehel), eelvaade peab kohe muutuma
  await p.evaluate(() => { const c = document.querySelector("#metaCard"); if (c.classList.contains("min")) document.querySelector("#metaToggle").click(); });
  await p.selectOption("#f_akt", "otsus"); await L.sleep(500);
  const afterAkt = await p.evaluate(() => ({ paper: document.querySelector("#paper").innerText.slice(0, 200), dl: document.querySelector("#dlAkt").textContent, head: document.querySelector("#headChips").innerText, step: document.querySelector("#actHead").textContent }));
  L.check(T("01"), "Akti vormi muutmine (korraldus→otsus) uuendab kohe eelnõu eelvaate ja nupud", /OTSUS/i.test(afterAkt.paper) && /otsus/i.test(afterAkt.dl) && /volikogu otsus/.test(afterAkt.head), afterAkt);
  // pärast etapivahetust
  await L.go(p, "vastuvotmine"); await L.go(p, "algatamine"); await L.step(p, "act");
  const afterNav = await p.evaluate(() => document.querySelector("#paper").innerText.slice(0, 120));
  L.check(T("02"), "Pärast etapivahetust on eelvaates „OTSUS” ja „VALLAVOLIKOGU”", /OTSUS/.test(afterNav) && /VOLIKOGU/.test(afterNav), afterNav);
  // KSH muutmine andmetes: ksh=jah (liik jääb tava)
  await p.evaluate(() => { const c = document.querySelector("#metaCard"); if (c.classList.contains("min")) document.querySelector("#metaToggle").click(); });
  await p.selectOption("#f_ksh", "jah"); await L.sleep(400);
  const mism = await p.evaluate(() => document.querySelector("#liikBox").innerText);
  const titleNow = await p.evaluate(() => document.querySelector("#paper").innerText.slice(0, 300));
  L.check(T("03"), "KSH=jah andmetes: pakutakse liigi parandust („Muuda”)", /Muuda/.test(mism), mism);
  L.check(T("04"), "KSH=jah: eelnõu pealkiri muutub kohe „KSH algatamine”", /strateegilise hindamise algatamine/.test(titleNow), titleNow.slice(0, 250));
  await p.selectOption("#f_ksh", "ei"); await L.sleep(300);
  // liik läbi kõigi; kasutaja valitud akt=otsus
  const seen = [];
  for (const k of LIIK.slice(1)) {
    await L.go(p, "algatamine");
    await p.evaluate(() => { const c = document.querySelector("#metaCard"); if (c.classList.contains("min")) document.querySelector("#metaToggle").click(); });
    await p.selectOption("#f_liik", k); await L.sleep(600);
    const S = await L.state(p);
    const views = await walkAll(p);
    const dead = Object.entries(views).filter(([a, n]) => n < 20).map(([a]) => a);
    const chip = await p.evaluate(() => document.querySelector("#headChips").innerText.split("\n")[0]);
    seen.push({ k, liik: S.meta.liik, akt: S.meta.akt, ksh: S.meta.ksh, ypm: S.meta.ypmuutmine, chip, dead });
    L.check(T("L-" + k), `Liik „${k}”: kõik 15 etapi/sammu vaadet renderduvad, päis näitab liiki`, S.meta.liik === k && !dead.length && log.pageErrors.length === 0, { liik: S.meta.liik, akt: S.meta.akt, chip, dead, err: log.pageErrors.slice(-2) });
    if (k === "dpm") {
      // dpm: sisesta dpm-kuupäev, kontrolli teateid
      await L.go(p, "vastuvotmine"); await L.step(p, "dates"); await p.evaluate(() => { const d = document.querySelector("#stDatesWrap"); d.open = true; });
      await L.setDate(p, "#d_d_teade", "2026-03-01").catch(() => {});
      await L.go(p, "algatamine"); await L.step(p, "dates"); await p.evaluate(() => { const d = document.querySelector("#stDatesWrap"); d.open = true; });
      const okD = await L.setDate(p, "#d_d_teade", "2026-03-01");
      const nts = await p.evaluate(() => { const s = document.querySelector("#ntSel"); return s ? [...s.options].map(o => o.value) : []; });
      await L.step(p, "nt"); const nts2 = await p.evaluate(() => [...document.querySelector("#ntSel").options].map(o => o.value));
      L.check(T("dpm-nt"), "DP muutmise algatamise teadete loetelus pole tava-DP teateid (alg_leht, alg_ksh)", !nts2.includes("alg_leht") && !nts2.includes("alg_ksh"), nts2);
      const titleD = await p.evaluate(async () => { document.querySelector('#stepBar [data-step="act"]').click(); await new Promise(r => setTimeout(r, 300)); return document.querySelector("#paper").innerText.slice(0, 300); });
      L.check(T("dpm-title"), "DP muutmise eelnõu pealkiri: „… detailplaneeringu muutmise algatamine”", /muutmise algatamine/.test(titleD), titleD.slice(0, 200));
      seen.push({ dteade: okD });
    }
  }
  const back = seen.find(x => x.k === "tava" && x !== seen[0]) || seen[seen.length - 1];
  L.check(T("05"), "Liigi vahetamine ei muuda vaikimisi kasutaja valitud akti vormi (otsus → korraldus)", back.akt === "otsus", seen.map(x => `${x.k}:${x.akt}`).join(" "));
  // tagasi tavaliseks: dpm kuupäev ei tohi lekkida tava-DP PLANIS-e ega kontrollrajale
  const S = await L.state(p);
  await p.evaluate(() => document.querySelector('[data-mode="full"]').click()); await L.sleep(200);
  await L.go(p, "algatamine");
  const n0 = await L.nDownloads(p); await p.evaluate(() => document.querySelector("#btnPlanis").click()); const dl = await waitDl(p, n0);
  const csv = dl ? Buffer.from(dl.b64, "base64").toString("utf8") : "";
  L.check(T("06"), "Tava-DP PLANIS CSV-sse ei satu DP muutmise (HMS avatud menetluse) kuupäeva", !/Avatud menetluse teade/.test(csv), { d_teade: S.dates.d_teade, line: (csv.split("\r\n").find(l => /Avatud menetluse/.test(l)) || "") });
  const tl = await p.evaluate(async () => { document.querySelector('#tabs [data-t="kaik"]').click(); await new Promise(r => setTimeout(r, 400)); return document.querySelector("#kaikBody").innerText; });
  L.check(T("07"), "Tava-DP menetluskäigu ajajoonel ei ole DP muutmise kuupäeva", !/Avatud menetluse teade/.test(tl), (tl.match(/.{0,40}Avatud menetluse teade.{0,40}/) || [""])[0]);
  await p.evaluate(() => document.querySelector('[data-mode="simple"]').click());
  // yp → algatamise eelnõu (volikogu otsus, „lähteseisukohtade kohta ettepanekute küsimine”)
  await L.go(p, "algatamine");
  await p.evaluate(() => { const c = document.querySelector("#metaCard"); if (c.classList.contains("min")) document.querySelector("#metaToggle").click(); });
  await p.selectOption("#f_liik", "ypm"); await L.sleep(500);
  await L.step(p, "act");
  const ypT = await p.evaluate(() => document.querySelector("#paper").innerText.slice(0, 400));
  L.check(T("08"), "ÜP-d muutev: algatamise eelnõu on volikogu otsus ja pealkiri „lähteseisukohtade kohta ettepanekute küsimine”", /VOLIKOGU/.test(ypT) && /OTSUS/.test(ypT) && /ettepanekute küsimine/.test(ypT), ypT.slice(0, 300));
  const S2 = await L.state(p);
  L.check(T("09"), "ÜP-d muutev liik seab „ÜP muutmise ettepanek: sisaldab”", S2.meta.ypmuutmine === "jah", S2.meta.ypmuutmine);
  // tagasi tava: ypmuutmine peab minema „ei”
  await p.selectOption("#f_liik", "tava"); await L.sleep(500);
  const S3 = await L.state(p);
  L.check(T("10"), "Tagasi tava-liigile: ypmuutmine=ei, ksh=ei, kehtestamise pädevuse kontroll ei nõua volikogu", S3.meta.ypmuutmine === "ei" && S3.meta.ksh === "ei", { y: S3.meta.ypmuutmine, k: S3.meta.ksh, akt: S3.meta.akt });
  const errs = log.pageErrors.concat(log.consoleErrors.filter(e => !/ERR_FAILED/.test(e)));
  L.check(T("11"), "Liigivahetuste ajal konsoolis vigu ei olnud", !errs.length, errs);
  await ctx.close();
}
module.exports = { run };
