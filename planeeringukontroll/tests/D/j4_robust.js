// Teekond 4: töökindlus — tühjad olekud, pikad/erimärgiga nimed, vigased kuupäevad, dokumentide kustutamine,
// kahe planeeringu vahetamine, uuesti laadimine, registri ümbernimetamine/kustutamine, db- ja võrgutõrked, keskööl „täna”
const L = require("./lib");
const { setupKase, waitDl, openPipe } = require("./j2_stages");
const ALLTABS = ["toolaud", "register", "kaik", "dokumendid", "alus"];

async function badText(p) { return p.evaluate(() => { const t = document.querySelector("main").innerText + document.querySelector("header.top").innerText + document.querySelector("#tabs").innerText; const m = t.match(/.{0,30}(undefined|NaN|\[object Object\]|Invalid Date).{0,30}/g); return m ? m.slice(0, 5) : []; }); }
async function regOpen(p, id) { await p.evaluate(id => { const a = document.querySelector('[data-side="register"]'); a && a.click(); }, id); await L.sleep(500); await p.evaluate(() => { const b = document.querySelector('[data-rview="table"]'); b && b.click(); }); await L.sleep(400); await p.evaluate(id => { const b = document.querySelector(`[data-ropen="${id}"]`); b && b.click(); }, id); await L.sleep(900); }

async function run(browser, url, v) {
  const T = s => `J4.${s}`;
  L.journey("J4 töökindlus");
  // ---------- 1. tühjad olekud ----------
  { const ctx = await L.newCtx(browser, v); const p = await ctx.newPage(); const log = L.watch(p);
    await p.goto(url); await L.sleep(1000);
    const bad = [];
    for (const t of ALLTABS) { await L.go(p, t); const b = await badText(p); if (b.length) bad.push(t + ": " + b.join(" | ")); }
    for (const t of ["algatamine", "vastuvotmine", "kehtestamine"]) { await L.go(p, t); for (const s of ["docs", "dates", "act", "nt", "ai"]) { await L.step(p, s); const b = await badText(p); if (b.length) bad.push(`${t}/${s}: ${b.join(" | ")}`); } }
    L.check(T("01"), "Tühi rakendus: kõik vaated avanevad, tekstis pole undefined/NaN/Invalid Date", !bad.length && !log.pageErrors.length, { bad, err: log.pageErrors });
    // tühjad nupud
    await L.go(p, "algatamine"); await L.step(p, "act");
    await p.evaluate(() => document.querySelector("#btnAiFill").click()); await L.sleep(400);
    const t1 = await L.toastText(p);
    await L.step(p, "ai"); await p.evaluate(() => document.querySelector("#btnAnalyze").click()); await L.sleep(400);
    const t2 = await L.toastText(p);
    L.check(T("02"), "Tühjal planeeringul „Täida Claude'iga” ja „Süvaanalüüs” annavad selge teate", /Lisa enne/.test(t1) && /Lisa enne/.test(t2), { t1, t2 });
    // registrisse tühja nimega
    await L.go(p, "algatamine"); await p.evaluate(() => document.querySelector("#btnStartReg").click()); await L.sleep(400);
    L.check(T("03"), "Nimeta planeeringut ei salvestata registrisse (teade „Kirjuta enne planeeringu nimi”)", /nimi/.test(await L.toastText(p)) && !Object.keys((await L.mock(p)).store).length, await L.toastText(p));
    await ctx.close(); }

  // ---------- 2. pikk ja erimärkidega nimi ----------
  { const ctx = await L.newCtx(browser, v); const p = await ctx.newPage(); const log = L.watch(p);
    await p.goto(url); await L.sleep(900);
    const NAME = `<img src=x onerror=alert(1)> "Õunapuu" & Šokolaadi 'tee' 12/3 maaüksuse ` + "väga pika nimega ".repeat(14) + "detailplaneering";
    await p.locator("#startName").fill(NAME); await L.sleep(300);
    await p.setInputFiles("#startFileIn", [L.path.join(L.FIX, "Lepa taotlus.txt")]); await L.sleep(4000);
    let S = await L.state(p);
    L.check(T("04"), "Erimärgid nimes ei käivita skripti (XSS) ja nimi salvestub muutmata", !log.dialogs.length && S.name === NAME, { dialogs: log.dialogs, len: S.name.length });
    const ov = []; for (const t of ["algatamine", "toolaud", "register"]) { await L.go(p, t); const o = await L.hOverflow(p); if (o.over > 1) ov.push({ t, ...o }); }
    await L.shot(p, "j4_longname_register");
    await L.go(p, "toolaud"); await L.shot(p, "j4_longname_desk");
    L.check(T("05"), "~300-märgine nimi ei tekita horisontaalset kerimist (töölaud, register, etapp)", !ov.length, ov);
    await L.go(p, "algatamine"); await L.step(p, "dates");
    for (const q of await p.evaluate(() => [...document.querySelectorAll("#stJudge [data-jq]")].map(x => x.dataset.jq))) { await p.evaluate(q => document.querySelector(`[data-ja="${q}"][data-v="teadmata"]`).click(), q); await L.sleep(200); await p.locator(`[data-jw="${q}"]`).fill("Testimiseks: materjalid puudulikud."); await L.sleep(950); }
    await L.step(p, "act");
    await p.evaluate(() => { const b = document.querySelector('[data-sub="done"]'); b && b.click(); }); await L.sleep(200);
    await p.evaluate(() => document.querySelector('#actFields [data-dl="akt"]').click()); await L.sleep(400);
    await p.evaluate(() => { const b = document.querySelector("#rvAck"); if (b && !b.checked) b.click(); }); await L.sleep(300);
    const dis = await p.evaluate(() => document.querySelector("#rvDownload").disabled);
    // kaalutlused, et saaks alla laadida
    if (dis) { for (const f of await p.evaluate(() => [...document.querySelectorAll("#reviewBody textarea[data-rvf][placeholder]")].filter(x => !x.value).map(x => x.dataset.rvf))) { await p.locator(`[data-rvf="${f}"]`).fill("Kaalutlus testimiseks, piisavalt pikk."); await L.sleep(800); } }
    for (let i = 0; i < 20; i++) { const did = await p.evaluate(() => { const b = [...document.querySelectorAll("#reviewBody [data-confirm]")].find(x => x.getAttribute("aria-pressed") !== "true"); if (b) { b.click(); return true; } return false; }); if (!did) break; await L.sleep(250); }
    await p.evaluate(() => { const b = document.querySelector("#rvAck"); if (b && !b.checked) b.click(); }); await L.sleep(300);
    const n0 = await L.nDownloads(p); await p.evaluate(() => document.querySelector("#rvDownload").click()); const dl = await waitDl(p, n0, 8000);
    const W = dl && L.docxText(dl.b64, "longname.docx");
    L.check(T("06"), "Erimärgiga nimi: Wordi failinimi on puhastatud ja dokumendis on nimi õigesti", !!dl && !/[<>"'&\/]/.test(dl.filename) && dl.filename.length < 120 && W.text.includes(`"Õunapuu" & Šokolaadi 'tee' 12/3`), { file: dl && dl.filename, st: await p.evaluate(() => document.querySelector("#reviewBody .rv-status").innerText) });
    await p.evaluate(() => { if (!document.querySelector("#reviewPop").hidden) document.querySelector("#rvClose").click(); });
    const errs = log.pageErrors.concat(log.consoleErrors.filter(e => !/ERR_FAILED/.test(e)));
    L.check(T("07"), "Pika nimega teekonnal konsoolis vigu ei olnud", !errs.length, errs);
    await ctx.close(); }

  // ---------- 3. vigased kuupäevad ----------
  { const ctx = await L.newCtx(browser, v); const p = await ctx.newPage(); const log = L.watch(p);
    await p.goto(url); await L.sleep(900); await setupKase(p);
    await L.go(p, "algatamine"); await L.step(p, "dates"); await p.evaluate(() => { document.querySelector("#stDatesWrap").open = true; });
    // 5-kohaline aasta (date-väli lubab seda klaviatuurilt)
    await p.locator("#d_algatamine").click(); await p.keyboard.type("12022026"); await L.sleep(100);
    await p.locator("#d_algatamine").press("Tab"); await L.sleep(300);
    let S = await L.state(p); L.note("klaviatuurilt sisestatud: " + S.dates.algatamine);
    await L.setDate(p, "#d_algatamine", "20266-02-12");
    S = await L.state(p);
    const r = await p.evaluate(() => document.querySelector("#stRules").innerText + "\n" + document.querySelector("#stRuleSum").innerText + "\n" + document.querySelector("#pipeWrap").innerText);
    const bad = await badText(p);
    L.check(T("08"), "5-kohalise aastaga kuupäev (20266-02-12) lükatakse tagasi või märgitakse vigaseks kuupäevaks (mitte tähtaja rikkumiseks)", S.dates.algatamine !== "20266-02-12" || /vale kuupäev|vigane|kontrolli kuupäeva/i.test(r), { saved: S.dates.algatamine, bad, rules: r.slice(0, 300) });
    await L.go(p, "toolaud"); const dk = await badText(p); await L.shot(p, "j4_baddate_desk");
    L.check(T("09"), "5-kohaline aasta ei murra töölauda (NaN, „-NaN päeva”)", !dk.length, dk);
    await L.go(p, "algatamine"); await L.step(p, "dates"); await p.evaluate(() => { document.querySelector("#stDatesWrap").open = true; });
    await L.setDate(p, "#d_algatamine", "2026-02-12");
    // kehtestamine enne vastuvõtmist
    await L.go(p, "kehtestamine"); await L.step(p, "dates"); await p.evaluate(() => { document.querySelector("#stDatesWrap").open = true; });
    await L.go(p, "vastuvotmine"); await L.step(p, "dates"); await p.evaluate(() => { document.querySelector("#stDatesWrap").open = true; });
    await L.setDate(p, "#d_vastuvotmine", "2026-05-20");
    await L.go(p, "kehtestamine"); await L.step(p, "dates"); await p.evaluate(() => { document.querySelector("#stDatesWrap").open = true; });
    await L.setDate(p, "#d_valjapanekLopp", "2026-04-01");
    const kc = await p.evaluate(() => document.querySelector("#stRules").innerText + document.querySelector("#pipeWrap").innerText);
    L.check(T("10"), "Väljapaneku lõpp enne vastuvõtmist märgitakse vastuoluks", /varasem|vastuolus/.test(kc), kc.slice(0, 300));
    // kehtestamine enne vastuvõtmist
    await L.setDate(p, "#d_kehtestamine", "2026-03-01");
    const kc2 = await p.evaluate(() => document.querySelector("#stRules").innerText + "\n" + document.querySelector("#pipeWrap").innerText + "\n" + document.querySelector("#tabs").innerText);
    L.check(T("11"), "Kehtestamise kuupäev enne vastuvõtmist märgitakse veaks", /varasem|vastuolus|järjekord vale/.test(kc2) && /Kehtestamise korraldus[^\n]*\n?[^\n]*(varasem|vastuolus)|kehtestami[^\n]*varasem/i.test(kc2), kc2.slice(0, 500));
    await ctx.close(); }

  // ---------- 4. dokumentide kustutamine ja kordused ----------
  { const ctx = await L.newCtx(browser, v); const p = await ctx.newPage(); const log = L.watch(p);
    await p.goto(url); await L.sleep(900); await setupKase(p);
    await L.go(p, "algatamine"); await L.step(p, "docs");
    const before = await p.evaluate(() => document.querySelector("#stDocCount").innerText);
    await L.go(p, "dokumendid");
    const id = (await L.state(p)).docs.find(d => d.type === "alg_akt").id;
    await p.evaluate(id => document.querySelector(`[data-del="${id}"]`).click(), id); await L.sleep(500);
    let S = await L.state(p);
    const toast = await L.toastText(p);
    L.check(T("12"), "Dokumendi „Eemalda” ei küsi kinnitust ega paku tagasivõtmist", false, { toast, docs: S.docs.length, note: "eemaldatakse kohe, toast: " + toast });
    await L.go(p, "algatamine"); await openPipe(p);
    const ev = await p.evaluate(() => document.querySelector("#pipeWrap").innerText);
    L.check(T("13"), "Kustutatud dokumendi kuupäevaettepanek (algatamine 12.02.2026) kaob kontrollrajalt", !/Algatamise korraldus Kase tn 7\.txt/.test(ev), (ev.match(/.{0,80}Algatamise korraldus Kase tn 7\.txt.{0,20}/) || [""])[0]);
    // kordus
    await L.go(p, "algatamine"); await L.step(p, "docs");
    await p.setInputFiles("#stFileIn", [L.path.join(L.FIX, "Algatamise taotlus Kase tn 7.pdf")]); await L.sleep(2500);
    const tidy = await p.evaluate(() => document.querySelector("#stTidy").innerText);
    await p.evaluate(() => { const b = document.querySelector("[data-tidy-dups]"); b && b.click(); }); await L.sleep(400);
    S = await L.state(p);
    L.check(T("14"), "Sama faili teist korda lisades pakutakse korduse eemaldamist ja see töötab", /kordust/.test(tidy) && S.docs.filter(d => d.name === "Algatamise taotlus Kase tn 7.pdf").length === 1, tidy.slice(0, 200));
    // skaneeritud pdf
    await p.setInputFiles("#stFileIn", [L.path.join(L.FIX, "Skaneeritud kiri.pdf")]); await L.sleep(2500);
    S = await L.state(p); const sc = S.docs.find(d => d.name === "Skaneeritud kiri.pdf");
    L.check(T("15"), "Tekstita (skaneeritud) PDF märgitakse loetamatuks", sc && /Tekst puudub/.test(sc.status || ""), sc && sc.status);
    await ctx.close(); }

  // ---------- 5. kaks planeeringut, kiire vahetus, registri muutused ----------
  { const ctx = await L.newCtx(browser, v); const p = await ctx.newPage(); const log = L.watch(p);
    await p.goto(url); await L.sleep(900); await setupKase(p);
    const A = (await L.state(p)).regId;
    // plaan B
    await L.go(p, "algatamine"); await p.evaluate(() => document.querySelector("#btnNew").click()); await L.sleep(500);
    await p.locator("#startName").fill("Lepa maaüksuse detailplaneering");
    await p.setInputFiles("#startFileIn", [L.path.join(L.FIX, "Lepa taotlus.txt")]);
    for (let i = 0; i < 30; i++) { await L.sleep(300); const s = await L.state(p); if (s.regId && s.regId !== A) break; }
    await L.sleep(800);
    let S = await L.state(p); const B = S.regId;
    L.check(T("16"), "Teine planeering (B) on registris eraldi kirjena", !!B && B !== A && Object.keys((await L.mock(p)).store).length === 2, { A, B });
    await regOpen(p, A); S = await L.state(p);
    L.check(T("17"), "Vahetus B→A: A andmed, B dokumente pole segunenud", S.regId === A && S.docs.length === 5 && !S.docs.some(d => /Lepa/.test(d.name)) && /Prillimäe/.test(S.meta.asukoht), { n: S.docs.length, as: S.meta.asukoht });
    // muuda A ja vaheta 1 s jooksul B-le
    await L.go(p, "vastuvotmine"); await L.step(p, "dates"); await p.evaluate(() => { document.querySelector("#stDatesWrap").open = true; });
    await L.setDate(p, "#d_vastuvotmine", "2026-05-20");
    await L.sleep(500);
    await regOpen(p, B); await L.sleep(4000);
    await regOpen(p, A); S = await L.state(p);
    const remoteA = (await L.mock(p)).store[A];
    await p.reload(); await L.sleep(1500); await regOpen(p, A); const S18 = await L.state(p);
    L.check(T("18"), "Kuupäev, mis sisestati ~1 s enne teise planeeringu avamist, ei kao (A: vastuvõtmine 20.05.2026; register ja pärast uuesti laadimist)", remoteA.dates.vastuvotmine === "2026-05-20" && S18.dates.vastuvotmine === "2026-05-20", { enneReloadi: S.dates.vastuvotmine || null, register: remoteA.dates.vastuvotmine || null, parastReloadi: S18.dates.vastuvotmine || null });
    // sama „Alusta uut” kaudu
    await L.go(p, "algatamine"); await p.evaluate(() => { const c = document.querySelector("#metaCard"); if (c.classList.contains("min")) document.querySelector("#metaToggle").click(); });
    await p.locator("#f_pindala").fill("2,0 ha"); await L.sleep(500);
    await p.evaluate(() => document.querySelector("#btnNew").click()); await L.sleep(4000);
    const remoteA2 = (await L.mock(p)).store[A];
    L.check(T("19"), "Muudatus (pindala 2,0 ha), millele järgneb kohe „Alusta uut planeeringut”, jõuab registrisse", remoteA2.meta.pindala === "2,0 ha", { register: remoteA2.meta.pindala });
    // kolleegi muudatus + oma muudatus (viimane kirjutaja võidab?)
    await regOpen(p, A); await L.sleep(500);
    await p.evaluate(A => { const r = window.__mock.store()[A]; r.dates = { ...r.dates, arutelu: "2026-08-01" }; r.updatedAt = new Date(Date.now() + 1000).toISOString(); r.updatedBy = "u-kolleeg"; window.__mock.putRemote(A, r); }, A);
    await L.sleep(800);
    const banner = await p.evaluate(() => document.querySelector("#regStatus").innerText);
    await L.go(p, "algatamine"); await p.evaluate(() => { const c = document.querySelector("#metaCard"); if (c.classList.contains("min")) document.querySelector("#metaToggle").click(); });
    await p.locator("#f_eesmark").fill("muudetud eesmärk"); await L.sleep(4000);
    const remoteA3 = (await L.mock(p)).store[A];
    L.check(T("20"), "Kolleegi muudatus kuvatakse („… muutis seda planeeringut”, „Laadi muudatused”)", /muutis/.test(banner), banner);
    L.check(T("21"), "Oma muudatus pärast kolleegi muudatust ei kirjuta kolleegi kuupäeva üle (arutelu 01.08.2026 säilib)", remoteA3.dates.arutelu === "2026-08-01", { arutelu: remoteA3.dates.arutelu || null, eesmark: remoteA3.meta.eesmark });
    // ümbernimetamine
    await p.evaluate(() => document.querySelector('[data-side="register"]').click()); await L.sleep(400);
    await p.evaluate(() => { const b = document.querySelector('[data-rview="table"]'); b && b.click(); }); await L.sleep(300);
    await p.evaluate(B => document.querySelector(`[data-rren="${B}"]`).click(), B); await L.sleep(400);
    await p.locator(`[data-rname="${B}"]`).fill("Lepa 2 maaüksuse detailplaneering"); await p.locator(`[data-rname="${B}"]`).press("Enter"); await L.sleep(800);
    L.check(T("22"), "Registris ümbernimetamine (Enter) muudab teise planeeringu nime", (await L.mock(p)).store[B].name === "Lepa 2 maaüksuse detailplaneering", (await L.mock(p)).store[B].name);
    await p.evaluate(A => document.querySelector(`[data-rren="${A}"]`).click(), A); await L.sleep(300);
    await p.locator(`[data-rname="${A}"]`).fill("   "); await p.evaluate(A => document.querySelector(`[data-rsave="${A}"]`).click(), A); await L.sleep(400);
    L.check(T("23"), "Tühja nimega ümbernimetamine keelatakse", /tühi/.test(await L.toastText(p)) && (await L.mock(p)).store[A].name.trim().length > 0, await L.toastText(p));
    await p.evaluate(() => { const b = document.querySelector("[data-rcancel]"); b && b.click(); }); await L.sleep(300);
    await p.evaluate(A => document.querySelector(`[data-rren="${A}"]`).click(), A); await L.sleep(300);
    await p.locator(`[data-rname="${A}"]`).fill("Kase tn 7a maaüksuse detailplaneering"); await p.evaluate(A => document.querySelector(`[data-rsave="${A}"]`).click(), A); await L.sleep(800);
    S = await L.state(p);
    L.check(T("24"), "Avatud planeeringu ümbernimetamine registris muudab ka avatud planeeringu nime", S.name === "Kase tn 7a maaüksuse detailplaneering" && (await L.mock(p)).store[A].name === S.name, { local: S.name });
    // kustutamine
    await p.evaluate(B => document.querySelector(`[data-rdel="${B}"]`).click(), B); await L.sleep(300);
    const conf = await p.evaluate(() => !document.querySelector("#regDelConfirm").hidden ? document.querySelector("#regDelText").textContent : null);
    await p.evaluate(() => document.querySelector("#regDelYes").click()); await L.sleep(800);
    L.check(T("25"), "Eemaldamine küsib lehesisest kinnitust (mitte window.confirm) ja eemaldab kirje", !!conf && !(await L.mock(p)).store[B] && !log.dialogs.length, { conf, dialogs: log.dialogs });
    const confVisible = await p.evaluate(() => { const e = document.querySelector("#regDelConfirm"); return e ? e.getBoundingClientRect().top : null; });
    L.note("kinnitusrea asukoht (top px): " + confVisible);
    await p.evaluate(A => document.querySelector(`[data-rdel="${A}"]`).click(), A); await L.sleep(300);
    await p.evaluate(() => document.querySelector("#regDelYes").click()); await L.sleep(800);
    S = await L.state(p);
    L.check(T("26"), "Avatud planeeringu eemaldamine registrist: kohalik koopia jääb, regId kustub", !S.regId && S.docs.length >= 5, { regId: S.regId, docs: S.docs.length });
    await L.go(p, "algatamine"); await p.evaluate(() => document.querySelector("#btnNew").click()); await L.sleep(300);
    L.check(T("27"), "Pärast eemaldamist küsib „Alusta uut” kinnitust (andmed pole enam registris)", await p.evaluate(() => !document.querySelector("#confirmNew").hidden));
    await p.evaluate(() => document.querySelector("#btnNewNo").click());
    await ctx.close(); }

  // ---------- 6. db ja võrgu tõrked ----------
  { const ctx = await L.newCtx(browser, v); const p = await ctx.newPage(); const log = L.watch(p);
    await p.goto(url); await L.sleep(900); await setupKase(p);
    const A = (await L.state(p)).regId;
    await p.evaluate(() => { window.__mock.fail.set = "unavailable"; });
    await L.go(p, "algatamine"); await p.evaluate(() => { const c = document.querySelector("#metaCard"); if (c.classList.contains("min")) document.querySelector("#metaToggle").click(); });
    await p.locator("#f_pindala").fill("3,3 ha"); await L.sleep(3300);
    const t = await L.toastText(p); const st = await p.evaluate(() => document.querySelector("#regStatus").innerText);
    L.check(T("28"), "Registri kirjutusviga: kasutaja näeb teadet", /ebaõnnestus/.test(t) || /ebaõnnestus/.test(st), { toast: t, status: st });
    L.check(T("29"), "Registri kirjutusviga: olekurida ei väida „salvestatud”", !/salvestatud/.test(st), st);
    await p.evaluate(() => { window.__mock.fail.set = null; }); await L.sleep(7000);
    L.check(T("30"), "Pärast ühenduse taastumist jõuab salvestamata muudatus registrisse ilma uue muudatuseta („proovin hiljem uuesti”)", (await L.mock(p)).store[A].meta.pindala === "3,3 ha", (await L.mock(p)).store[A].meta.pindala);
    // lugemisõigus
    await p.evaluate(() => { window.__mock.fail.set = "invalid_argument"; });
    await p.locator("#f_pindala").fill("4,4 ha"); await L.sleep(3300);
    L.check(T("31"), "Kirjutusõiguse puudumisel (invalid_argument) teade „pole … kirjutamise õigust”", /õigust/.test(await L.toastText(p)) || /lugemisõigus/.test(await p.evaluate(() => document.querySelector("#regStatus").innerText)), await L.toastText(p));
    await p.evaluate(() => { window.__mock.fail.set = null; });
    // Claude'i tõrge
    await p.evaluate(() => { window.__mock.sampleFail = "rate_limited"; });
    await L.step(p, "act"); await p.evaluate(() => document.querySelector("#btnAiFill").click()); await L.sleep(1500);
    const aiErr = await p.evaluate(() => document.querySelector("#aiError").innerText);
    L.check(T("32"), "Claude'i päringu tõrge (rate_limited) kuvatakse eesti keeles", /Liiga palju päringuid/.test(aiErr), aiErr);
    await p.evaluate(() => { window.__mock.sampleFail = null; });
    // allalaadimise tõrge
    await p.evaluate(() => { window.__mock.fail.download = "quota"; });
    await L.step(p, "nt"); await p.evaluate(() => document.querySelector("#ntDocx").click()); await L.sleep(1500);
    L.check(T("33"), "Allalaadimise tõrge: teade „Faili ei salvestatud”", /ei salvestatud/.test(await L.toastText(p)), await L.toastText(p));
    await p.evaluate(() => { window.__mock.fail.download = null; });
    await ctx.close(); }
  { // Wordi teek ei laadi (jsDelivr blokeeritud algusest)
    const ctx = await L.newCtx(browser, { ...v, blockCdn: true }); const p = await ctx.newPage(); const log = L.watch(p);
    await p.goto(url); await L.sleep(900);
    await p.locator("#startName").fill("Tõrke maaüksuse detailplaneering");
    await p.setInputFiles("#startFileIn", [L.path.join(L.FIX, "Algatamise taotlus Kase tn 7.pdf"), L.path.join(L.FIX, "Lepa taotlus.txt")]); await L.sleep(3000);
    const S = await L.state(p); const pdf = S.docs.find(d => /\.pdf$/.test(d.name));
    L.check(T("34a"), "PDF-teegi (pdf.js) laadimise tõrge: failil on selge olek", pdf && /lugemisteeki/.test(pdf.status || ""), pdf && pdf.status);
    await L.go(p, "algatamine"); await L.step(p, "nt");
    await p.evaluate(() => document.querySelector("#ntDocx").click()); await L.sleep(1500);
    const t1 = await L.toastText(p);
    L.check(T("34"), "Wordi teegi (docx@9.5.1) laadimise tõrge teates eristatav (teate Word)", /teeki/.test(t1), t1);
    await ctx.close(); }
  { // snapshot-viga algusest
    const ctx = await L.newCtx(browser, v); await ctx.addInitScript(() => { window.__failSnap = 1; });
    const p = await ctx.newPage(); const log = L.watch(p);
    await p.addInitScript(() => { const iv = setInterval(() => { if (window.__mock) { window.__mock.fail.snapshot = "unavailable"; clearInterval(iv); } }, 1); });
    await p.goto(url); await L.sleep(1500);
    await L.go(p, "register"); const rb = await p.evaluate(() => document.querySelector("#regBody").innerText);
    L.check(T("35"), "Register ei ühendu: teade ja kohalik planeering on näha", /ei õnnestunud ühendust/.test(rb), rb.slice(0, 200));
    await ctx.close(); }

  // ---------- 7. keskööl „täna” ----------
  { const ctx = await L.newCtx(browser, v); const p = await ctx.newPage(); const log = L.watch(p);
    await p.clock.setFixedTime(new Date("2026-11-15T00:30:00+02:00"));
    await p.goto(url); await L.sleep(900); await setupKase(p);
    await L.go(p, "algatamine"); await openPipe(p);
    await p.evaluate(() => { const b = document.querySelector('[data-evok="algatamine"]'); b && b.click(); }); await L.sleep(300);
    await L.step(p, "nt"); await p.selectOption("#ntSel", "alg_at"); await L.sleep(200);
    await p.evaluate(() => document.querySelector("#ntDone").click()); await L.sleep(500);
    const S = await L.state(p);
    L.check(T("36"), "„Märgi tehtuks täna” kell 00:30 Eesti aja järgi (15.11.2026) salvestab 15.11.2026", S.dates.algatamiseAT === "2026-11-15", { saved: S.dates.algatamiseAT, local: "2026-11-15" });
    await ctx.close(); }

  // ---------- 8. reload: vahekaart ja samm ----------
  { const ctx = await L.newCtx(browser, v); const p = await ctx.newPage(); const log = L.watch(p);
    await p.goto(url); await L.sleep(900); await setupKase(p);
    await L.go(p, "kehtestamine"); await L.step(p, "nt");
    await p.reload(); await L.sleep(1200);
    const where = await p.evaluate(() => ({ h: location.hash, step: document.querySelector("#stepBar [aria-selected=true]")?.dataset.step }));
    L.check(T("37"), "Uuesti laadimisel jääb avatuks sama etapp (#kehtestamine)", where.h === "#kehtestamine", where);
    await ctx.close(); }
}
module.exports = { run };
