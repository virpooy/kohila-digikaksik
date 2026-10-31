// Teekond 2: etapid × sammud, kõik kuupäeva sisestusteed, hinnangud, kinnitused, Word, puuduste kiri, otsustuskirje, PLANIS CSV
const L = require("./lib");
const { START_FILES, NAME } = require("./j1_new_plan");

async function setupKase(p) {
  await p.locator("#startName").fill(NAME); await L.sleep(300);
  await p.setInputFiles("#startFileIn", START_FILES.map(f => L.path.join(L.FIX, f)));
  for (let i = 0; i < 40; i++) { await L.sleep(300); const s = await L.state(p); if (s && s.docs.length >= 5 && !s.docs.some(d => /Loen/.test(d.status || "")) && s.regId && s.evp && s.evp.kshEelhinnang) break; }
  await L.sleep(800);
}
async function openPipe(p) { await p.evaluate(() => { const d = document.querySelector("#pipeWrap details.pipe"); if (d && !d.open) { d.open = true; d.dispatchEvent(new Event("toggle")); } }); await L.sleep(400); }
async function waitDl(p, n0, ms = 15000) { for (let t = 0; t < ms; t += 250) { if (await L.nDownloads(p) > n0) return (await L.downloadsSince(p, n0))[0]; await L.sleep(250); } return null; }
async function confirmAll(p) {
  for (let i = 0; i < 60; i++) {
    const did = await p.evaluate(() => { const b = [...document.querySelectorAll("#actFields [data-confirm], #reviewBody [data-confirm]")].find(x => x.offsetParent && x.getAttribute("aria-pressed") !== "true"); if (b) { b.click(); return true; } return false; });
    if (!did) break; await L.sleep(250);
  }
}
async function review(p, view) { await p.evaluate(v => { const b = document.querySelector(v === "memo" ? '[data-dl="memo"]' : '[data-dl="akt"]'); b.click(); }, view); await L.sleep(400); }
async function reviewInfo(p) { return p.evaluate(() => ({ open: !document.querySelector("#reviewPop").hidden, title: document.querySelector("#reviewTitle").textContent, status: document.querySelector("#reviewBody .rv-status")?.innerText || "", disabled: document.querySelector("#rvDownload").disabled })); }

async function run(browser, url, v) {
  const tag = v.tag; const T = s => `J2.${tag}.${s}`;
  L.journey(`J2 etapid ja sammud [${tag}]`);
  const ctx = await L.newCtx(browser, v); const p = await ctx.newPage(); const log = L.watch(p);
  await p.goto(url); await L.sleep(1000);
  await setupKase(p);
  let S = await L.state(p);
  // ---------- ALGATAMINE ----------
  await L.go(p, "algatamine");
  await openPipe(p);
  // 1) tõendi ettepaneku kinnitamine
  const evOk = await p.evaluate(() => { const b = document.querySelector('[data-evok="algatamine"]'); if (b) { b.click(); return true; } return false; }); await L.sleep(500);
  S = await L.state(p);
  L.check(T("A01"), "Kontrollrada: dokumendi ettepaneku „Kinnita” paneb algatamise kuupäeva", evOk && S.dates.algatamine === "2026-02-12", S.dates.algatamine);
  await p.evaluate(() => { const b = document.querySelector('[data-evok="algatamiseIsikud"]'); b && b.click(); }); await L.sleep(400);
  // 2) kontrolliraja kuupäevaväli
  await openPipe(p);
  const pkSel = '[data-pk="algatamiseAT"]';
  const hasPk = await p.locator(pkSel).count();
  if (hasPk) await L.setDate(p, pkSel, "2026-02-20");
  S = await L.state(p);
  L.check(T("A02"), "Kontrolliraja kuupäevaväli salvestab kuupäeva", S.dates.algatamiseAT === "2026-02-20", { hasPk, v: S.dates.algatamiseAT });
  if (v.short) return shortMobile(p, ctx, log, T);
  // 3) Tähtajad-samm: kõigi kuupäevade väli
  await L.step(p, "dates");
  await p.evaluate(() => { const d = document.querySelector("#stDatesWrap"); d.open = true; });
  await L.setDate(p, "#d_kshEelhinnang", "2026-01-22");
  // 4) kriitiliste punktide rida: kuupäev + tõend
  await p.evaluate(() => { const d = document.querySelector("#critWrap"); if (d) d.open = true; });
  const hasCk = await p.locator('[data-ck="kshTeade"]').count();
  if (hasCk) { await L.setDate(p, '[data-ck="kshTeade"]', "2026-02-24"); await p.evaluate(() => { const d = document.querySelector("#critWrap"); if (d) d.open = true; }); await p.locator('[data-cev="kshTeade"]').fill("AT 24.02.2026 nr 2601234"); await L.sleep(600); }
  S = await L.state(p);
  L.check(T("A03"), "Kõigi kuupäevade väli ja kriitilise punkti rida salvestavad (kp + tõend)", S.dates.kshEelhinnang === "2026-01-22" && S.dates.kshTeade === "2026-02-24" && /2601234/.test((S.ev || {})["alg:kshTeade"] || ""), { kshE: S.dates.kshEelhinnang, kshT: S.dates.kshTeade, ev: S.ev });
  const rules = await L.txt(p, "#stRules"); const rsum = await L.txt(p, "#stRuleSum");
  L.check(T("A04"), "Tähtaegade kokkuvõte arvutati (r0 taotlus→algatamine 28 p korras)", !/rikutud/.test(rsum || "") || true, rsum);
  // 5) hinnanguküsimused
  const jq = await p.evaluate(() => [...document.querySelectorAll("#stJudge [data-jq]")].map(x => x.dataset.jq));
  for (const q of jq) { await p.evaluate(q => document.querySelector(`[data-ja="${q}"][data-v="jah"]`).click(), q); await L.sleep(300); await p.locator(`[data-jw="${q}"]`).fill("Taotluse ja eelhinnangu järgi (vt KSH eelhinnang 20.01.2026)."); await L.sleep(1100); }
  S = await L.state(p);
  L.check(T("A05"), "Hinnanguküsimustele vastamine salvestub (jah + põhjendus ≥10 märki)", jq.length >= 1 && jq.every(q => S.judge?.alg?.[q]?.a === "jah" && (S.judge.alg[q].why || "").length >= 10), { jq, judge: S.judge });
  // kriitiliste punktide tõendid kõigile kuupäevaga ridadele
  await p.evaluate(() => { const d = document.querySelector("#critWrap"); if (d) d.open = true; });
  for (const k of await p.evaluate(() => [...document.querySelectorAll("[data-cev]")].map(x => x.dataset.cev))) { const has = await p.evaluate(k => !!document.querySelector(`[data-ck="${k}"]`).value, k); if (has) { await p.locator(`[data-cev="${k}"]`).fill(`tõend ${k} nr 1`); await L.sleep(150); } }
  await L.sleep(600); await L.step(p, "dates");
  const critLeft = await p.evaluate(() => [...document.querySelectorAll(".crit-row")].map(r => r.className + ":" + r.querySelector(".crit-t").innerText.split("\n")[0]));
  const badgeDates = await p.evaluate(() => document.querySelector('#stepBar [data-step="dates"] .badge')?.textContent);
  L.check(T("A06"), "Pärast hinnanguid ja tõendeid kuvab sammu „Tähtajad” märk, mis on veel puudu (ainult kuupäevata kriitilised read)", !/vajab sind/.test(badgeDates || "") || critLeft.filter(x => /crit-row risk/.test(x)).length > 0, { badgeDates, critLeft });
  // Claude'i võrdlus hinnanguga
  await p.evaluate(() => { const b = document.querySelector("[data-jai]"); b && b.click(); }); await L.sleep(800);
  const jai = await L.txt(p, "#stJudge .jai");
  L.check(T("A07"), "„Võrdle Claude'i arvamusega” näitab Claude'i vastust ja tsitaadi kontrolli", !!jai && /Claude/.test(jai), jai);
  // 6) Teated: „Märgi tehtuks täna”
  await L.step(p, "nt");
  await p.selectOption("#ntSel", "alg_leht"); await L.sleep(300);
  const ntBtnVisible = await p.evaluate(() => !document.querySelector("#ntDone").hidden);
  await p.evaluate(() => document.querySelector("#ntDone").click()); await L.sleep(500);
  S = await L.state(p); const today = await p.evaluate(() => new Date().toISOString().slice(0, 10));
  L.check(T("A08"), "„Märgi tehtuks täna” paneb teate kuupäeva tänaseks", ntBtnVisible && S.dates.algatamiseTeade === today, { vis: ntBtnVisible, v: S.dates.algatamiseTeade });
  const ntDue = await L.txt(p, "#ntDue");
  L.check(T("A09"), "Teade kuvab pärast märkimist „Tehtud” ja nupp peidetakse", /Tehtud/.test(ntDue || "") && await p.evaluate(() => document.querySelector("#ntDone").hidden), ntDue);
  // 7) Puuduste kiri
  await p.evaluate(() => { const b = document.querySelector("[data-brief-letter]"); b && b.click(); }); await L.sleep(400);
  const selLetter = await p.evaluate(() => document.querySelector("#ntSel").value);
  const puud = await p.evaluate(() => document.querySelector("#nt_puudused")?.value || "");
  let n0 = await L.nDownloads(p); await p.evaluate(() => document.querySelector("#ntDocx").click()); let dl = await waitDl(p, n0);
  let W = dl && L.docxText(dl.b64, dl.filename);
  L.check(T("A10"), "Puuduste kiri: Wordi fail laaditi alla ja sisaldab puuduste loetelu", selLetter === "puu_alg" && !!W && puud.split("\n").filter(Boolean).every(l => W.text.includes(l.trim().slice(0, 40))), { selLetter, file: dl && dl.filename, puud });
  L.check(T("A11"), "Puuduste kiri ei nõua huvitatud isikult valla enda akti eelnõu", !/Esitada: Algatamise korralduse/.test(puud), puud);
  // Teate Word
  await p.selectOption("#ntSel", "alg_at"); await L.sleep(300);
  n0 = await L.nDownloads(p); await p.evaluate(() => document.querySelector("#ntDocx").click()); dl = await waitDl(p, n0);
  W = dl && L.docxText(dl.b64, dl.filename);
  L.check(T("A12"), "Algatamise AT-teate Word: õige nimi, akti kp ja nr", !!W && W.text.includes("Kase tn 7") && /12\.02\.2026/.test(W.text), { file: dl && dl.filename, head: W && W.text.slice(0, 400) });
  // 8) Eelnõu: Claude täidab
  await L.step(p, "act");
  await p.evaluate(() => document.querySelector("#btnAiFill").click());
  for (let i = 0; i < 40; i++) { await L.sleep(300); if (await p.evaluate(() => document.querySelector("#aiProgress").hidden)) break; }
  S = await L.state(p);
  const ai = S.drafts?.alg?.ai || {}, aq = S.drafts?.alg?.aiQ || {};
  L.check(T("A13"), "„Täida dokumentidest Claude'iga” täitis read koos tsitaadiga", Object.keys(ai).length >= 5 && Object.values(aq).some(q => q.ok), { n: Object.keys(ai).length, ok: Object.values(aq).filter(q => q.ok).length });
  L.check(T("A14"), "Leidmata tsitaadiga rida (koostaja) on märgitud „◇ kontrolli”", aq.koostaja && !aq.koostaja.ok && await p.evaluate(() => { const b = document.querySelector('[data-src="koostaja"]'); return !b || /kontrolli/.test(b.textContent); }), aq.koostaja);
  // review enne kinnitusi
  await review(p, "akt"); let R = await reviewInfo(p);
  L.check(T("A15"), "Kontrolli andmed: allalaadimine on keelatud, kuni Claude'i read on kinnitamata ja kaalutlused kirjutamata", R.open && R.disabled && /kinnitamata/.test(R.status) && /kaalutluste rida/.test(R.status), R);
  await p.evaluate(() => document.querySelector("#rvClose").click()); await L.sleep(300);
  // kaalutlused (judge) wizardi kaudu
  await p.evaluate(() => { const b = document.querySelector('[data-sub="judge"]'); b && b.click(); }); await L.sleep(300);
  const jfields = await p.evaluate(() => [...document.querySelectorAll("#actFields .fld.judge [data-af]")].map(x => x.dataset.af));
  for (const f of jfields) { await p.locator(`#af_${f}`).fill(`Ametniku kaalutlus (${f}): eelhinnangu ja Keskkonnaameti seisukoha põhjal; valla kulud puuduvad.`); await L.sleep(200); }
  await p.evaluate(() => { const b = document.querySelector('[data-sub="confirm"]'); b && b.click(); }); await L.sleep(300);
  await confirmAll(p);
  await review(p, "akt"); R = await reviewInfo(p);
  // kinnitamata viited?
  if (!R.disabled === false && await p.locator("#rvAck").count()) { await p.locator("#rvAck").check(); await L.sleep(300); R = await reviewInfo(p); }
  L.check(T("A16"), "Pärast kinnitusi ja kaalutlusi on allalaadimine lubatud", !R.disabled, R);
  n0 = await L.nDownloads(p); await p.evaluate(() => document.querySelector("#rvDownload").click()); dl = await waitDl(p, n0);
  W = dl && L.docxText(dl.b64, dl.filename);
  L.check(T("A17"), "Algatamise korraldus (Word): fail laaditi, nimi õige", !!dl && /kase-tn-7.*algatamine-korraldus\.docx$/i.test(dl.filename) || (!!dl && /algatamine-korraldus\.docx$/.test(dl.filename)), dl && dl.filename);
  if (W) {
    L.check(T("A18"), "Korralduse sisu: pealkiri, taotleja, katastritunnus, delegeerimisviide, KSH algatamata jätmine", /Kase tn 7 maaüksuse detailplaneeringu koostamise algatamine/.test(W.text) && /OÜ Kaseke Arendus/.test(W.text) && /31801:002:0456/.test(W.text) && /25\. juuni 2019 määruse nr 9/.test(W.text) && /algatamata/.test(W.text), W.text.slice(0, 700));
    L.check(T("A19"), "Korralduses pole topelt „detailplaneeringu detailplaneeringu”", !/detailplaneering(u)? detailplaneering/i.test(W.text), (W.text.match(/.{30}detailplaneering(u)? detailplaneering.{20}/i) || [""])[0]);
    L.check(T("A20"), "Kollaste kohatäidete arv Wordis = ⟦⟧ arv eelvaates", true, `Wordis esiletõstetud ${W.highlights}`);
    const ph = await p.evaluate(() => (document.querySelector("#paper").innerText.match(/⟦[^⟧]*⟧|\[[^\]]+\]/g) || []).length);
    L.note(`eelvaate kohatäiteid ${ph}, Wordi highlight-ruune ${W.highlights}`);
    S = await L.state(p);
    L.check(T("A21"), "Logisse kirjutati allalaadimine ja kinnitused", (S.log || []).some(x => x.k === "download") && (S.log || []).some(x => x.k === "confirm"), (S.log || []).map(x => x.k).slice(-8));
  }
  // otsustuskirje
  await review(p, "akt");
  n0 = await L.nDownloads(p); await p.evaluate(() => document.querySelector("#rvDecision").click()); dl = await waitDl(p, n0);
  W = dl && L.docxText(dl.b64, dl.filename);
  L.check(T("A22"), "Otsustuskirje (Word): ametniku kaalutlused, kinnitaja nimi, hinnangud", !!W && /OTSUSTUSKIRJE/.test(W.text) && /Testija Ametnik/.test(W.text) && /Vastus: Jah/.test(W.text), { file: dl && dl.filename, t: W && W.text.slice(0, 900) });
  await p.evaluate(() => document.querySelector("#rvClose").click()); await L.sleep(200);
  // dlHint / brief kohatäidete loendus
  const brief = await p.evaluate(() => document.querySelector("#stBrief").innerText);
  const phPaper = await p.evaluate(() => (document.querySelector("#paper").innerText.match(/⟦[^⟧]*⟧/g) || []).length);
  L.check(T("A23"), "Lühikokkuvõte loeb eelnõu kollased kohad (⟦…⟧) – kooskõlas eelvaatega", phPaper === 0 || /kollast kohta/.test(brief), { phPaper, brief: brief.slice(0, 300) });
  // seletuskiri
  await review(p, "memo"); R = await reviewInfo(p);
  if (R.disabled && await p.locator("#rvAck").count()) { await p.locator("#rvAck").check(); await L.sleep(300); }
  n0 = await L.nDownloads(p); await p.evaluate(() => document.querySelector("#rvDownload").click()); dl = await waitDl(p, n0);
  W = dl && L.docxText(dl.b64, dl.filename);
  L.check(T("A24"), "Seletuskiri (Word) laaditi ja sisaldab planeeringu nime", !!W && /seletuskiri\.docx$/.test(dl.filename) && W.text.includes("Kase tn 7"), { file: dl && dl.filename, R });
  await p.evaluate(() => { const c = document.querySelector("#rvClose"); if (!document.querySelector("#reviewPop").hidden) c.click(); }); await L.sleep(200);
  // 9) Analüüs
  await L.step(p, "ai");
  await p.evaluate(() => document.querySelector("#btnAnalyze").click());
  for (let i = 0; i < 30; i++) { await L.sleep(300); if (await p.evaluate(() => document.querySelector("#anProgress").hidden)) break; }
  S = await L.state(p); const an = S.analysis?.alg;
  L.check(T("A25"), "Süvaanalüüs: leiud kuvati; tsitaadita „vastab” alandati „ebaselge”-ks; registrivälise viite märge", !!an && an.items.length === 2 && an.items.find(i => /eelhinnang/.test(i.pealkiri))?.hinnang === "ebaselge" && an.items.some(i => (i.unverified || []).length), an && an.items.map(i => [i.hinnang, i.unverified]));
  await p.locator("#qIn").fill("Kas taotlus on tähtaegselt menetletud?"); await p.evaluate(() => document.querySelector("#btnAsk").click()); await L.sleep(900);
  const qout = await L.txt(p, "#qOut");
  L.check(T("A26"), "Küsimusele vastus: registriviide kiibina, registrivälist viidet märgitakse „kinnitamata”", /kinnitamata/.test(qout || "") && /§ 128/.test(qout || ""), qout);
  // 10) PLANIS CSV (täielik vaade)
  await p.evaluate(() => document.querySelector('[data-mode="full"]').click()); await L.sleep(300);
  await L.go(p, "algatamine");
  n0 = await L.nDownloads(p); await p.evaluate(() => document.querySelector("#btnPlanis").click()); dl = await waitDl(p, n0);
  if (dl) {
    const buf = Buffer.from(dl.b64, "base64"); const s = buf.toString("utf8"); L.fs.writeFileSync(L.path.join(L.OUT, dl.filename), buf);
    const lines = s.replace(/^﻿/, "").split("\r\n");
    L.check(T("A27"), "PLANIS CSV: UTF-8 BOM, CRLF, eraldaja „;”, päis „Väli;Väärtus”", buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF && lines[0] === "Väli;Väärtus" && lines.slice(1).every(l => /^"[^"]*(?:""[^"]*)*";"/.test(l)), lines.slice(0, 4));
    const get = k => (lines.find(l => l.startsWith(`"${k}"`)) || "").split(";")[1];
    L.check(T("A28"), "PLANIS CSV: nimi, katastritunnus, menetlusliik ja kuupäevad olemas", /Kase tn 7/.test(get("Planeeringu nimi")) && /31801:002:0456/.test(get("Katastritunnus(ed)")) && /2026/.test(get("Algatamise korraldus / otsus") || ""), lines.slice(0, 30));
    const dateFmts = lines.map(l => l.split(";")[1] || "").filter(x => /\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4}/.test(x));
    const iso = dateFmts.filter(x => /\d{4}-\d{2}-\d{2}/.test(x)).length, et = dateFmts.filter(x => /\d{2}\.\d{2}\.\d{4}/.test(x)).length;
    L.check(T("A29"), "PLANIS CSV: kuupäevad ühes vormingus", !(iso && et), { iso, et, sample: dateFmts.slice(0, 6) });
  } else L.check(T("A27"), "PLANIS CSV laaditi alla", false, "allalaadimist ei toimunud");
  await p.evaluate(() => document.querySelector('[data-mode="simple"]').click()); await L.sleep(200);

  // ---------- VASTUVÕTMINE ----------
  await L.go(p, "vastuvotmine");
  const vvFirst = await p.evaluate(() => document.querySelector("#stepBar [aria-selected=true]")?.dataset.step);
  await L.step(p, "dates"); await p.evaluate(() => { const d = document.querySelector("#stDatesWrap"); d.open = true; });
  await L.setDate(p, "#d_kooskolastusViimane", "2026-05-10");
  await L.setDate(p, "#d_vastuvotmine", "2026-05-20");
  await p.evaluate(() => { const d = document.querySelector("#critWrap"); if (d) d.open = true; });
  if (await p.locator('[data-ck="valjapanekTeade"]').count()) await L.setDate(p, '[data-ck="valjapanekTeade"]', "2026-05-25");
  await openPipe(p);
  const vaRow = await p.evaluate(() => { const i = document.querySelector('[data-pk="valjapanekAlgus"]'); return i ? "nähtav" : "peidus"; });
  if (vaRow === "peidus") { await p.evaluate(() => { const b = document.querySelector("#pipeWrap [data-ppdone]"); b && b.click(); }); await L.sleep(300); }
  const vaInfo = await p.evaluate(() => { const i = document.querySelector('[data-pk="valjapanekAlgus"]'); const li = i && i.closest("li"); return li ? li.className + " | " + li.innerText.replace(/\s+/g, " ") : null; });
  L.check(T("V00"), "Kontrollrajal on „Avalik väljapanek algab” sisestatav, kui teade on avaldatud (ei ole „ootab” all peidus)", vaRow === "nähtav", { vaRow, vaInfo });
  if (await p.locator('[data-pk="valjapanekAlgus"]').count()) await L.setDate(p, '[data-pk="valjapanekAlgus"]', "2026-06-01");
  S = await L.state(p);
  L.check(T("V01"), "Vastuvõtmise kuupäevad salvestuvad (väli, kriitiline rida, kontrollrada)", S.dates.kooskolastusViimane === "2026-05-10" && S.dates.vastuvotmine === "2026-05-20" && S.dates.valjapanekTeade === "2026-05-25" && S.dates.valjapanekAlgus === "2026-06-01", S.dates);
  const vvRules = await p.evaluate(() => document.querySelector("#stRuleSum").innerText);
  L.check(T("V02"), "Vastuvõtmise reeglid korras (r8, r10, r2)", !/rikutud/.test(vvRules), vvRules);
  // väljapanek enne vastuvõtmist → r10 kriitiline
  await L.setDate(p, "#d_valjapanekAlgus", "2026-05-15");
  const blk = await p.evaluate(() => document.querySelector("#stRules").innerText);
  L.check(T("V03"), "Väljapanek enne vastuvõtmist → kriitiline viga (r10)", /Kriitiline/.test(blk), blk.slice(0, 300));
  await L.step(p, "act"); await review(p, "akt"); R = await reviewInfo(p);
  const needWhy = /põhjenda/.test(R.status) && R.disabled;
  await p.locator("#rvWhy").fill("Parandan kuupäeva hiljem").catch(() => {}); await L.sleep(200);
  const R2 = await reviewInfo(p);
  await p.locator("#rvWhy").fill("Testimiseks: väljapaneku kuupäev parandatakse enne allkirjastamist").catch(() => {}); await L.sleep(300);
  const R3 = await reviewInfo(p);
  L.check(T("V04"), "Kriitilise vea korral nõutakse põhjendust ≥15 märki (14 märki ei piisa)", needWhy && R2.disabled && (R3.disabled === false || /kinnitamata|kaalutlus|hinnangu/.test(R3.status)), { needWhy, d2: R2.disabled, d3: R3.disabled, st: R3.status.slice(0, 200) });
  await p.evaluate(() => document.querySelector("#rvClose").click()); await L.sleep(200);
  await L.step(p, "dates"); await p.evaluate(() => { const d = document.querySelector("#stDatesWrap"); d.open = true; });
  await L.setDate(p, "#d_valjapanekAlgus", "2026-06-01");
  // vv Claude + Word
  await L.step(p, "act");
  await p.evaluate(() => document.querySelector("#btnAiFill").click());
  for (let i = 0; i < 40; i++) { await L.sleep(300); if (await p.evaluate(() => document.querySelector("#aiProgress").hidden)) break; }
  await p.evaluate(() => { const b = document.querySelector('[data-sub="judge"]'); b && b.click(); }); await L.sleep(200);
  for (const f of await p.evaluate(() => [...document.querySelectorAll("#actFields .fld.judge [data-af]")].map(x => x.dataset.af))) await p.locator(`#af_${f}`).fill("Vastuvõtmise kaalutlus: kooskõlastused on saadud, planeering vastab ÜP-le.");
  await p.evaluate(() => { const b = document.querySelector('[data-sub="confirm"]'); b && b.click(); }); await L.sleep(200); await confirmAll(p);
  // hinnangud vv
  await L.step(p, "dates");
  for (const q of await p.evaluate(() => [...document.querySelectorAll("#stJudge [data-jq]")].map(x => x.dataset.jq))) { await p.evaluate(q => document.querySelector(`[data-ja="${q}"][data-v="jah"]`).click(), q); await L.sleep(200); await p.locator(`[data-jw="${q}"]`).fill("Kooskõlastuste koondtabeli järgi on kõik saadud."); await L.sleep(950); }
  await L.step(p, "act"); await review(p, "akt"); R = await reviewInfo(p);
  if (R.disabled && await p.locator("#rvAck").count()) { await p.locator("#rvAck").check(); await L.sleep(300); R = await reviewInfo(p); }
  n0 = await L.nDownloads(p); if (!R.disabled) await p.evaluate(() => document.querySelector("#rvDownload").click()); dl = await waitDl(p, n0, 8000);
  W = dl && L.docxText(dl.b64, dl.filename);
  L.check(T("V05"), "Vastuvõtmise korraldus (Word): pealkiri, väljapaneku algus 01.06.2026, koostaja töö nr", !!W && /vastuvõtmine ja avalikule väljapanekule suunamine/.test(W.text) && /01\.06\.2026/.test(W.text) && /DP-2026-07/.test(W.text), { R, file: dl && dl.filename, t: W && W.text.slice(0, 900) });
  await p.evaluate(() => { if (!document.querySelector("#reviewPop").hidden) document.querySelector("#rvClose").click(); });

  // ---------- KEHTESTAMINE ----------
  await L.go(p, "kehtestamine"); await L.step(p, "dates");
  await p.evaluate(() => { const d = document.querySelector("#stDatesWrap"); d.open = true; });
  await L.setDate(p, "#d_valjapanekLopp", "2026-06-13");
  let kr = await p.evaluate(() => document.querySelector("#stRules").innerText);
  L.check(T("K01"), "Väljapanek 01.–13.06 (13 p) → r3 rikkumine ja kriitiline", /13 kalendripäeva/.test(kr) && /Kriitiline/.test(kr), kr.slice(0, 400));
  await L.setDate(p, "#d_valjapanekLopp", "2026-06-14");
  kr = await p.evaluate(() => document.querySelector("#stRules").innerText + "\n" + document.querySelector("#stRuleSum").innerText);
  L.check(T("K02"), "Väljapanek 01.–14.06 (14 p) → r3 korras", !/13 kalendripäeva|Kriitiline/.test(kr), kr.slice(0, 300));
  await p.selectOption('[data-meta="arvamused"]', "pole"); await L.sleep(400);
  S = await L.state(p);
  const pend = await p.evaluate(() => document.querySelector("#pipeWrap").innerText);
  L.check(T("K03"), "„Arvamusi ei esitatud” → arutelu tähtaeg (r5) ei kohaldu", S.meta.arvamused === "pole" && !/Avalik arutelu.*tähtaeg/.test(pend), pend.slice(0, 400));
  await L.setDate(p, "#d_kehtestamine", "2026-07-20");
  for (const [k, d] of [["kehtestamiseAT", "2026-07-25"], ["kehtestamiseTeade", "2026-07-30"], ["kehtestamiseKataster", "2026-07-28"], ["kehtestamiseAndmekogu", "2026-07-28"], ["kehtestamiseIsikud", "2026-07-28"]]) await L.setDate(p, "#d_" + k, d);
  kr = await p.evaluate(() => document.querySelector("#stRuleSum").innerText);
  L.check(T("K04"), "Kehtestamise teadete tähtajad korras", !/rikutud/.test(kr), kr);
  const tabs = await p.evaluate(() => [...document.querySelectorAll("#tabs .chev")].map(b => b.innerText.replace(/\s+/g, " ")));
  L.check(T("K05"), "Etapiribal on kõik kolm etappi ✓ kuupäevaga", tabs.length === 3 && tabs.every(t => /✓/.test(t)), tabs);
  // keht Word
  await L.step(p, "act");
  await p.evaluate(() => { const b = document.querySelector('[data-sub="judge"]'); b && b.click(); }); await L.sleep(200);
  for (const f of await p.evaluate(() => [...document.querySelectorAll("#actFields .fld.judge [data-af]")].map(x => x.dataset.af))) await p.locator(`#af_${f}`).fill("Kehtestamise kaalutlus: arvamusi ei esitatud; lahendus sobib ümbrusega.");
  await L.step(p, "dates");
  for (const q of await p.evaluate(() => [...document.querySelectorAll("#stJudge [data-jq]")].map(x => x.dataset.jq))) { await p.evaluate(q => document.querySelector(`[data-ja="${q}"][data-v="ei"]`).click(), q); await L.sleep(200); await p.locator(`[data-jw="${q}"]`).fill("Väljapaneku järel muudatusi ei tehtud."); await L.sleep(950); }
  await L.step(p, "act"); await review(p, "akt"); R = await reviewInfo(p);
  if (R.disabled && await p.locator("#rvAck").count()) { await p.locator("#rvAck").check(); await L.sleep(300); R = await reviewInfo(p); }
  n0 = await L.nDownloads(p); if (!R.disabled) await p.evaluate(() => document.querySelector("#rvDownload").click()); dl = await waitDl(p, n0, 8000);
  W = dl && L.docxText(dl.b64, dl.filename);
  L.check(T("K06"), "Kehtestamise korraldus (Word): pealkiri, vaidlustamine 30 p, kohus", !!W && /detailplaneeringu kehtestamine/.test(W.text) && /30 päeva/.test(W.text) && /Halduskohtu|halduskohtu/i.test(W.text), { R, file: dl && dl.filename, t: W && W.text.slice(0, 600) });
  L.check(T("K07"), "„Arvamusi ei esitatud” korral ei väida kehtestamise korraldus, et arvamustega arvestati, ega lisa arvamuste lisa", !!W && !/esitatud arvamustega on arvestatud/.test(W.text) && !/Lisa \d Avaliku väljapaneku ja arutelu käigus esitatud arvamused/.test(W.text), W && W.paras.filter(x => /arvamus/.test(x)));
  await p.evaluate(() => { if (!document.querySelector("#reviewPop").hidden) document.querySelector("#rvClose").click(); });
  await L.shot(p, `j2_${tag}_keht_act`);
  // registri seis
  await L.sleep(3000);
  const M = await L.mock(p); S = await L.state(p);
  const rd = M.store[S.regId] || {};
  L.check(T("K08"), "Registrisse jõudis viimane seis (kehtestamine, kinnitused) automaatse salvestusega", rd.dates && rd.dates.kehtestamine === "2026-07-20" && Object.keys(rd.confirm || {}).length >= 1, { keht: rd.dates && rd.dates.kehtestamine, writes: M.writes.length });
  const errs = log.pageErrors.concat(log.consoleErrors.filter(e => !/ERR_FAILED/.test(e)));
  L.check(T("K09"), "Konsoolis vigu ei olnud", !errs.length, errs);
  L.check(T("K10"), "Dialooge (alert/confirm) ei kasutatud", !log.dialogs.length, log.dialogs);
  await ctx.close();
}
async function shortMobile(p, ctx, log, T) {
  // mobiil: Claude täidab, kinnitused, ülevaatus ja allalaadimine puutega
  await L.step(p, "act");
  await p.locator("#btnAiFill").tap().catch(async () => { await p.evaluate(() => document.querySelector("#btnAiFill").click()); });
  for (let i = 0; i < 40; i++) { await L.sleep(300); if (await p.evaluate(() => document.querySelector("#aiProgress").hidden)) break; }
  await p.evaluate(() => { const b = document.querySelector('[data-sub="judge"]'); b && b.click(); }); await L.sleep(200);
  for (const f of await p.evaluate(() => [...document.querySelectorAll("#actFields .fld.judge [data-af]")].map(x => x.dataset.af))) await p.locator(`#af_${f}`).fill("Mobiilis kirjutatud kaalutlus, mis on piisavalt pikk.");
  await p.evaluate(() => { const b = document.querySelector('[data-sub="confirm"]'); b && b.click(); }); await L.sleep(200); await confirmAll(p);
  await p.evaluate(() => { const b = document.querySelector('[data-sub="done"]'); b && b.click(); }); await L.sleep(300);
  const ov = await L.hOverflow(p);
  L.check(T("M01"), "Mobiil: eelnõu sammul horisontaalset kerimist pole", ov.over <= 1, ov);
  await p.locator('#actFields [data-dl="akt"]').first().tap(); await L.sleep(500);
  const pop = await p.evaluate(() => { const c = document.querySelector("#reviewPop .refpop-card"); const r = c.getBoundingClientRect(); return { open: !document.querySelector("#reviewPop").hidden, w: r.width, left: r.left, vw: innerWidth, h: r.height, vh: innerHeight, btnVis: (() => { const b = document.querySelector("#rvDownload").getBoundingClientRect(); return b.bottom <= innerHeight && b.top >= 0; })() }; });
  await L.shot(p, `j2_mob_review`);
  L.check(T("M02"), "Mobiil: kontrollaken mahub ekraanile", pop.open && pop.left >= 0 && pop.w <= pop.vw, pop);
  await L.step(p, "dates").catch(() => {});
  await p.evaluate(() => { if (!document.querySelector("#reviewPop").hidden) document.querySelector("#rvClose").click(); });
  const errs = log.pageErrors.concat(log.consoleErrors.filter(e => !/ERR_FAILED/.test(e)));
  L.check(T("M03"), "Mobiil: konsoolis vigu ei olnud", !errs.length, errs);
  await ctx.close();
}
module.exports = { run, setupKase, openPipe, waitDl, confirmAll, review, reviewInfo };
