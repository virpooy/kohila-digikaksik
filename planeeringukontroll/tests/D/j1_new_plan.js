// Teekond 1: uus planeering — nimi → dokumendid → liigituvastus → andmete automaattäide → register → taasavamine
const L = require("./lib");
const START_FILES = ["Algatamise taotlus Kase tn 7.pdf", "KSH eelhinnang Kase tn 7.docx", "Algatamise korraldus Kase tn 7.txt", "Teavituskiri algatamisest.txt", "Planeeringuala piiri skeem.pdf"];
const EXPECT = { "Algatamise taotlus Kase tn 7.pdf": "taotlus", "KSH eelhinnang Kase tn 7.docx": "ksh_eelhinnang", "Algatamise korraldus Kase tn 7.txt": "alg_akt", "Teavituskiri algatamisest.txt": "teav_alg", "Planeeringuala piiri skeem.pdf": "skeem" };
const NAME = "Kase tn 7 maaüksuse detailplaneering";

async function run(browser, url, v) {
  const tag = v.tag;
  L.journey(`J1 uus planeering [${tag}]`);
  const ctx = await L.newCtx(browser, v); const p = await ctx.newPage(); const log = L.watch(p);
  await p.goto(url); await L.sleep(1200);
  L.check(`J1.${tag}.01`, "Tühi algus avab Algatamise lehe ja alustamise kaardi", await p.evaluate(() => location.hash === "" && !document.querySelector("#startCard").hidden && !document.querySelector('[data-tab="ylevaade"]').hidden));
  // nimi
  await p.locator("#startName").fill(NAME); await L.sleep(400);
  const nmSync = await p.evaluate(() => [document.querySelector("#projName").value, document.querySelector("#f_name").value]);
  L.check(`J1.${tag}.02`, "Nimi sünkroonub päise ja andmekaardi väljaga", nmSync.every(x => x === "Kase tn 7 maaüksuse detailplaneering"), nmSync);
  // dokumendid
  await p.setInputFiles("#startFileIn", START_FILES.map(f => L.path.join(L.FIX, f)));
  for (let i = 0; i < 40; i++) { await L.sleep(300); const s = await L.state(p); if (s && s.docs.length >= 5 && !s.docs.some(d => /Loen/.test(d.status || "")) && s.regId) break; }
  await L.sleep(1500);
  let S = await L.state(p);
  const types = Object.fromEntries(S.docs.map(d => [d.name, d.type]));
  const wrong = Object.entries(EXPECT).filter(([n, t]) => types[n] !== t).map(([n, t]) => `${n}: oodati ${t}, saadi ${types[n]}`);
  L.check(`J1.${tag}.03`, "Kõik 5 dokumenti loetud (PDF, DOCX, TXT) ja tekst olemas", S.docs.length === 5 && S.docs.every(d => d.chars > 40), S.docs.map(d => `${d.name}:${d.chars}`));
  L.check(`J1.${tag}.04`, "Dokumendi liik tuvastati õigesti", !wrong.length, wrong);
  L.check(`J1.${tag}.05`, "Andmed täitusid: kataster, asukoht, pindala, taotleja, taotluse kp", S.meta.kataster === "31801:002:0456" && /Prillimäe/.test(S.meta.asukoht) && /1,8 ha/.test(S.meta.pindala) && /Kaseke/.test(S.meta.taotleja) && S.dates.taotlus === "2026-01-15", { meta: S.meta, taotlus: S.dates.taotlus });
  L.check(`J1.${tag}.06`, "Kasutaja kirjutatud nime ei kirjutatud üle", S.name === NAME, S.name);
  const M1 = await L.mock(p);
  L.check(`J1.${tag}.07`, "Planeering salvestus automaatselt registrisse (db.set)", !!S.regId && !!M1.store[S.regId] && M1.store[S.regId].name === NAME, { regId: S.regId, keys: Object.keys(M1.store) });
  L.check(`J1.${tag}.08`, "Isikukood, telefon ja e-post ei läinud Claude'ile", !M1.prompts.some(x => /48512304215|5123 4567|mari\.maasikas@example\.com/.test(x)), `${M1.prompts.length} päringut`);
  L.check(`J1.${tag}.09`, "Registrisse ei salvestatud failide teksti", !JSON.stringify(M1.store[S.regId] || {}).includes("Natura 2000"));
  const evp = S.evp || {};
  L.check(`J1.${tag}.10`, "Akti päisest pakuti algatamise kuupäev 12.02.2026 (tsitaadiga)", (evp.algatamine || []).some(x => x.v === "2026-02-12" && x.ok), evp.algatamine);
  L.check(`J1.${tag}.11`, "Teavituskirjast pakuti isikute teavitamise kuupäev 19.02.2026", (evp.algatamiseIsikud || []).some(x => x.v === "2026-02-19"), evp.algatamiseIsikud);
  L.check(`J1.${tag}.12`, "Claude'i tsitaadita kuupäevaettepanek on märgitud nõrgaks (ok=false)", (evp.algatamiseAT || []).every(x => !x.ok), evp.algatamiseAT);
  const sc = await L.shot(p, `j1_${tag}_after_upload`);
  // startCard peidetakse pärast registrisse lisamist
  L.check(`J1.${tag}.13`, "Alustamise kaart kaob pärast registrisse salvestamist", await p.evaluate(() => document.querySelector("#startCard").hidden), sc);
  // laadi uuesti
  await p.reload(); await L.sleep(1500);
  const S2 = await L.state(p);
  L.check(`J1.${tag}.14`, "Pärast lehe uuesti laadimist on andmed alles (nimi, docs, meta, regId)", S2.name === NAME && S2.docs.length === 5 && S2.regId === S.regId && S2.meta.kataster === S.meta.kataster, { n: S2.docs.length, name: S2.name });
  // uus tühi planeering, siis ava registrist
  await L.go(p, "algatamine"); await L.sleep(200);
  await p.evaluate(() => document.querySelector("#btnNew").click()); await L.sleep(600);
  const S3 = await L.state(p);
  L.check(`J1.${tag}.15`, "„Alusta uut” registris olevalt planeeringult ei küsi kinnitust ja alustab tühjalt", !S3.regId && S3.docs.length === 0, { name: S3.name });
  await p.evaluate(() => { const a = document.querySelector('[data-side="register"]'); a && a.click(); }); await L.sleep(800);
  // tabelivaade
  await p.evaluate(() => { const b = document.querySelector('[data-rview="table"]'); b && b.click(); }); await L.sleep(500);
  const hasRow = await p.evaluate(n => [...document.querySelectorAll("#regBody tbody tr")].some(tr => tr.innerText.includes(n)), NAME);
  L.check(`J1.${tag}.16`, "Planeering on registri tabelis", hasRow, await L.shot(p, `j1_${tag}_register`));
  await p.evaluate(id => { const b = document.querySelector(`[data-ropen="${id}"]`); b && b.click(); }, S.regId); await L.sleep(1200);
  const S4 = await L.state(p);
  L.check(`J1.${tag}.17`, "Registrist avamine taastab andmed ja failide teksti (samas brauseris)", S4.regId === S.regId && S4.name === NAME && S4.docs.length === 5 && S4.docs.every(d => d.chars > 40 && d.text), S4.docs.map(d => `${d.name}:${d.chars}:${(d.text || "").length}`));
  L.check(`J1.${tag}.18`, "Avamine viis õigesse etappi (algatamine sisestamata → Algatamine)", await p.evaluate(() => location.hash === "#algatamine"), await p.evaluate(() => location.hash));
  const errs = log.pageErrors.concat(log.consoleErrors.filter(e => !/ERR_FAILED/.test(e)));
  L.check(`J1.${tag}.19`, "Konsoolis vigu ei olnud (pageerror / console.error)", !errs.length, errs);
  L.check(`J1.${tag}.20`, "Rakendus ei kasutanud window.alert/confirm/prompt", !log.dialogs.length, log.dialogs);
  await ctx.close();
  return { regId: S.regId };
}
module.exports = { run, START_FILES, NAME };
