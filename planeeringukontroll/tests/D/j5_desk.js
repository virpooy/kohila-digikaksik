// Teekond 5: töölaud ja registri tahvel mitme planeeringuga eri etappides — loendurid, märgid, tähtajad ja tuled
// peavad klappima iga planeeringu enda vaatega. Kell on fikseeritud: 31.10.2026 12:00 (Eesti aeg).
const L = require("./lib");
const NOW = "2026-10-31T12:00:00+02:00";
const base = (name, meta, dates, extra) => ({ v: 2, name, meta: { taotleja: "", asukoht: "Kohila alev, Kohila vald", kataster: "", pindala: "", eesmark: "", juhtotstarve: "", juhtotstarveUus: "", yp: "2024", ypv: 2, ypmuutmine: "ei", ksh: "ei", akt: "korraldus", eelh: "antud", liik: "tava", ...meta }, dates, checks: {}, content: {}, drafts: {}, analysis: {}, notices: {}, tasks: [], events: [], ext: {}, confirm: {}, refOk: {}, judge: {}, ev: {}, evp: {}, log: [], pii: "", docs: [], updatedAt: "2026-10-30T10:00:00.000Z", updatedBy: "u-kolleeg", ...(extra || {}) });
const SEED = [
  { id: "dp-t1", ...base("P1 Taotlus üle tähtaja", {}, { taotlus: "2026-09-20" }) },
  { id: "dp-t2", ...base("P2 Algatatud, teade läheneb", {}, { taotlus: "2026-09-25", algatamine: "2026-10-22", kshTeade: "2026-10-23" }) },
  { id: "dp-t3", ...base("P3 Väljapanek lõppenud", { arvamused: "osa" }, { taotlus: "2026-01-10", algatamine: "2026-02-01", algatamiseAT: "2026-02-05", algatamiseTeade: "2026-02-10", algatamiseIsikud: "2026-02-10", kshTeade: "2026-02-05", kooskolastusViimane: "2026-08-20", vastuvotmine: "2026-09-01", valjapanekTeade: "2026-09-05", valjapanekAlgus: "2026-09-10", valjapanekLopp: "2026-09-29" }) },
  { id: "dp-t4", ...base("P4 Kehtestatud", {}, { taotlus: "2025-01-10", algatamine: "2025-02-01", vastuvotmine: "2025-09-01", valjapanekAlgus: "2025-09-10", valjapanekLopp: "2025-09-30", kehtestamine: "2026-06-01", kehtestamiseAT: "2026-06-05" }) },
  { id: "dp-t5", ...base("P5 ÜP-d muutev eelnõu väljapanek", { liik: "ypm", ypmuutmine: "jah", akt: "otsus" }, { taotlus: "2026-05-01", algatamine: "2026-05-20", y_evAlgus: "2026-09-25", y_evLopp: "2026-10-25" }) },
  { id: "dp-t6", ...base("P6 DP muutmine, algatamise tähtaeg", { liik: "dpm" }, { taotlus: "2026-09-01" }) },
  { id: "dp-t7", ...base("P7 Teade hilines, seisab muidu", {}, { taotlus: "2025-12-20", algatamine: "2026-01-05", algatamiseAT: "2026-03-01", algatamiseTeade: "2026-01-20", algatamiseIsikud: "2026-01-20", kshTeade: "2026-01-10" }, { events: [{ id: "e1", d: "2026-10-20", t: "Koosolek koostajaga", st: "vv" }] }) },
  { id: "dp-t8", ...base("P8 Ülesanne üle tähtaja", {}, { taotlus: "2026-10-15" }, { tasks: [{ n: 1, t: "Kooskõlastuse küsimine", org: "Päästeamet", due: "2026-10-20", st: "alg", created: "2026-10-16" }] }) },
];
async function deskData(p) {
  return p.evaluate(() => {
    const items = [...document.querySelectorAll("#deskBody .dk-item")].map(a => ({ plan: a.querySelector(".dk-txt .muted").innerText.split(" · ")[0], t: a.querySelector(".dk-t").innerText, badge: a.querySelector(".dk-b").className.replace("dk-b ", "") }));
    const plans = [...document.querySelectorAll("#deskBody .dk-plan")].map(b => ({ name: b.querySelector("b").innerText, lamp: b.querySelector(".lamp").className.replace("lamp ", ""), sub: b.querySelector("small").innerText }));
    const soon = [...document.querySelectorAll("#deskBody .dk-soon > div")].map(d => d.innerText.replace(/\s+/g, " "));
    return { title: document.querySelector(".dk-title")?.innerText, items, plans, soon, more: document.querySelector("#deskMore")?.innerText || "", side: document.querySelector('[data-side="toolaud"] .sbadge')?.innerText || "0" };
  });
}
async function regData(p) {
  await p.evaluate(() => { const b = document.querySelector('[data-rview="table"]'); b && b.click(); }); await L.sleep(400);
  return p.evaluate(() => ({
    chips: [...document.querySelectorAll("#regBody .chips .chip")].map(c => c.innerText.replace(/\s+/g, " ")),
    rows: [...document.querySelectorAll("#regBody tbody tr")].map(tr => { const td = tr.querySelectorAll("td"); return { name: td[1].querySelector("b").innerText, lamp: td[0].querySelector(".lamp").className.replace("lamp ", ""), lampT: td[0].innerText.replace(/\s+/g, " "), etapp: td[2].innerText, next: td[3].innerText.replace(/\s+/g, " ") }; }),
    dl: [...document.querySelectorAll("#regBody .list .item .title")].map(x => x.innerText)
  }));
}
async function boardData(p) {
  await p.evaluate(() => { const b = document.querySelector('[data-rview="board"]'); b && b.click(); }); await L.sleep(400);
  return p.evaluate(() => Object.fromEntries([...document.querySelectorAll("#regBoard .bcol")].map(c => [c.getAttribute("aria-label"), [...c.querySelectorAll(".bcard .n")].map(n => n.innerText)])));
}
async function planView(p, id) {
  await p.evaluate(id => { const b = document.querySelector(`[data-ropen="${id}"]`) || document.querySelector(`[data-bopen="${id}"]`); b && b.click(); }, id); await L.sleep(900);
  const out = { hash: await p.evaluate(() => location.hash) };
  out.tabs = await p.evaluate(() => [...document.querySelectorAll("#tabs .chev")].map(b => b.innerText.replace(/\s+/g, " ")));
  out.stages = {};
  for (const t of ["algatamine", "vastuvotmine", "kehtestamine"]) {
    await L.go(p, t); await L.step(p, "dates");
    out.stages[t] = await p.evaluate(() => ({ sum: document.querySelector("#stRuleSum").innerText, bad: [...document.querySelectorAll("#stRules .item.bad .title")].map(x => x.innerText) }));
  }
  out.pipe = await p.evaluate(() => document.querySelector("#pipeWrap summary").innerText.replace(/\s+/g, " "));
  out.ov = await p.evaluate(() => document.querySelector("#ovDeadlines").innerText);
  return out;
}
async function run(browser, url, v) {
  const T = s => `J5.${s}`;
  L.journey("J5 töölaud ja register");
  const real = L.fs.readdirSync(L.path.join(__dirname, "..", "dpdata", "dp")).map(f => { const d = JSON.parse(L.fs.readFileSync(L.path.join(__dirname, "..", "dpdata", "dp", f))); return { id: f.replace(/\.json$/, ""), ...(d.data || d) }; });
  const ctx = await L.newCtx(browser, { ...v, dbSeed: [...SEED, ...real] }); const p = await ctx.newPage(); const log = L.watch(p);
  await p.clock.setFixedTime(new Date(NOW));
  await p.goto(url + "#toolaud"); await L.sleep(1500);
  const blank0 = await p.evaluate(() => ({ items: document.querySelectorAll("#deskBody .dk-item, #deskBody .dk-plan").length, txt: document.querySelector("#deskBody").innerText.length, hash: location.hash }));
  L.check(T("00"), "Lehe avamine/uuesti laadimine aadressiga #toolaud näitab töölauda (mitte tühja lehte)", blank0.txt > 50, { ...blank0, shot: await L.shot(p, "j5_desk_initial") });
  await L.go(p, "register"); await L.go(p, "toolaud");
  const D0 = await deskData(p);
  await L.shot(p, "j5_desk");
  L.check(T("01"), "Töölaud näitab kõiki registri planeeringuid (8 + 3 päris) ja kohalikku", D0.plans.length >= 11, D0.plans.map(x => x.name));
  const dupLocal = D0.plans.filter(x => /Uus detailplaneering|Nimetu/.test(x.name));
  L.check(T("02"), "Tühja „Uus detailplaneering” ei kuvata töölaual menetlusena", !dupLocal.length, dupLocal);
  await L.go(p, "register");
  const R0 = await regData(p); const B0 = await boardData(p);
  await L.shot(p, "j5_board");
  const byName = n => R0.rows.find(r => r.name.startsWith(n)) || {};
  const dByName = n => D0.plans.find(r => r.name.startsWith(n)) || {};
  // lambid töölaual vs registris
  const lampDiff = R0.rows.map(r => ({ n: r.name, reg: r.lamp, desk: (D0.plans.find(x => x.name === r.name) || {}).lamp })).filter(x => x.desk && x.desk !== x.reg);
  L.check(T("03"), "Iga planeeringu tuli on töölaual ja registris sama", !lampDiff.length, lampDiff);
  // ootuspärased tuled
  const exp = { P1: "bad", P2: "risk", P3: "bad", P4: "ok", P6: "risk", P8: "bad" };
  const lampBad = Object.entries(exp).filter(([k, s]) => byName(k).lamp !== s).map(([k, s]) => `${k}: oodati ${s}, saadi ${byName(k).lamp} (${byName(k).lampT})`);
  L.check(T("04"), "Tuled vastavad tähtaegadele (P1 üle, P2 14 p sees, P3 üle, P4 kehtestatud, P6 täna, P8 ülesanne üle)", !lampBad.length, lampBad);
  // tahvli veerud
  const col = n => Object.entries(B0).find(([c, ns]) => ns.some(x => x.startsWith(n)))?.[0];
  const colExp = { P1: "Taotlus", P2: "Algatatud · koostamisel", P3: "Arutelu", P4: "Kehtestatud", P8: "Taotlus" };
  const colBad = Object.entries(colExp).filter(([k, c]) => !String(col(k) || "").startsWith(c)).map(([k, c]) => `${k}: oodati ${c}, saadi ${col(k)}`);
  L.check(T("05"), "Tahvli veerg vastab planeeringu etapile", !colBad.length, { colBad, B0 });
  // chips
  const chip = re => (R0.chips.find(c => re.test(c)) || "").match(/(\d+)/)?.[1];
  const nKeht = R0.rows.filter(r => /Kehtestatud/.test(r.etapp)).length;
  L.check(T("06"), "„Menetluses” = registri kirjed − kehtestatud", +chip(/^Menetluses/) === R0.rows.length - nKeht, { chips: R0.chips, rows: R0.rows.length, nKeht });
  // iga planeeringu oma vaade vs registri rida
  const incons = [];
  for (const id of ["dp-t1", "dp-t2", "dp-t3", "dp-t5", "dp-t6", "dp-t7"]) {
    await L.go(p, "register"); await p.evaluate(() => { const b = document.querySelector('[data-rview="table"]'); b && b.click(); }); await L.sleep(300);
    const r = (await regData(p)).rows.find(x => x.name === SEED.find(s => s.id === id).name);
    const pv = await planView(p, id);
    const badRules = Object.values(pv.stages).flatMap(s => s.bad);
    const overPipe = /(\d+) hilinenud/.exec(pv.pipe)?.[1] || "0";
    incons.push({ id, reg: `${r.lamp} ${r.lampT}`, next: r.next, planBad: badRules, pipe: pv.pipe.slice(0, 160) });
    if (id === "dp-t7") L.check(T("07"), "P7: registri tuli arvestab ka juba toimunud, kuid hilinenud teatega (r1a rikkumine plaani vaates)", !(r.lamp === "ok" && badRules.length), { reg: r.lampT, planBad: badRules });
    if (id === "dp-t3") L.check(T("08"), "P3: registri „Järgmine tähtaeg” = kontrolliraja järgmine samm", (() => { const d = /(\d\d\.\d\d\.\d{4})/.exec(r.next)?.[1]; return d && pv.pipe.includes(d); })(), { reg: r.next, pipe: pv.pipe });
    if (id === "dp-t6") L.check(T("09"), "P6 (DP muutmine): algatamise 60 p tähtaeg (31.10.2026 laupäev → 02.11.2026) on sama registris ja plaanis", /02\.11\.2026/.test(r.next) && /02\.11\.2026/.test(pv.pipe), { reg: r.next, pipe: pv.pipe });
    if (id === "dp-t5") L.check(T("10"), "P5 (ÜP-d muutev): registri järgmine tähtaeg = plaani kontrolliraja järgmine", (() => { const d = /(\d\d\.\d\d\.\d{4})/.exec(r.next)?.[1]; return !d || pv.pipe.includes(d); })(), { reg: r.next, pipe: pv.pipe });
  }
  L.note("plaanid: " + JSON.stringify(incons).slice(0, 1500));
  // registri tulemused sõltumatud sellest, milline planeering on avatud (STAGES muteerub liigi järgi)
  await planView(p, "dp-t5"); await L.go(p, "register"); const RA = await regData(p);
  await planView(p, "dp-t1"); await L.go(p, "register"); const RB = await regData(p);
  await planView(p, "dp-t6"); await L.go(p, "register"); const RC = await regData(p);
  const diff = RA.rows.map((r, i) => ({ n: r.name, a: r.lampT + " / " + r.next, b: RB.rows[i].lampT + " / " + RB.rows[i].next, c: RC.rows[i].lampT + " / " + RC.rows[i].next })).filter(x => x.a !== x.b || x.a !== x.c);
  L.check(T("11"), "Registri tuled ja tähtajad ei sõltu sellest, milline planeering (tava/ÜP/DPM) on avatud", !diff.length && JSON.stringify(RA.chips) === JSON.stringify(RB.chips) && JSON.stringify(RA.chips) === JSON.stringify(RC.chips), { diff, chips: [RA.chips, RB.chips, RC.chips] });
  // töölaua „Tee ära” vs külgmenüü märk
  await L.go(p, "toolaud"); const D1 = await deskData(p);
  const nBad = D1.items.filter(x => x.badge === "bad").length;
  L.check(T("12"), "Külgmenüü „Töölaud” märk = kiireloomuliste (punaste) tööde arv", (D1.more ? true : +D1.side === nBad), { side: D1.side, nBadShown: nBad, more: D1.more, title: D1.title });
  L.check(T("13"), "Töölaua pealkirja arv klapib „Tee ära” loendiga", (() => { const n = +(/(\d+)/.exec(D1.title || "")?.[1] || 0); const tot = +(/\((\d+)\)/.exec(D1.more)?.[1] || D1.items.length); return n <= tot && n > 0; })(), { title: D1.title, more: D1.more, items: D1.items.length });
  // kehtestatud planeering ei tohi tekitada „Tee ära” ülesandeid ega ületatud tähtaegu
  await p.evaluate(() => { const b = document.querySelector("#deskMore"); b && b.click(); }); await L.sleep(300);
  const Dall = await deskData(p);
  const p4 = Dall.items.filter(x => x.plan.startsWith("P4"));
  L.check(T("20"), "Kehtestatud planeering (P4) ei tekita töölaual punaseid „Tee ära” tähtaegu", !p4.length, p4.map(x => `${x.badge}: ${x.t}`));
  const p4reg = R0.rows.find(r => r.name.startsWith("P4")) || {};
  L.check(T("21"), "Registri tähtajaloend ja „Tähtaeg ületatud” ei sisalda kehtestatud planeeringu (P4) tähtaegu", !R0.dl.some(t => /P4 Kehtestatud/.test(t)), { chips: R0.chips, p4: R0.dl.filter(t => /P4/.test(t)) });
  // järgmised 14 päeva: kõik kuupäevad 31.10–14.11
  const soonBad = D1.soon.filter(s => { const m = /^(\d\d)\.(\d\d)/.exec(s); if (!m) return true; const d = `2026-${m[2]}-${m[1]}`; return d < "2026-10-31" || d > "2026-11-14"; });
  L.check(T("14"), "„Järgmised 14 päeva” sisaldab ainult 31.10–14.11 tähtaegu", !soonBad.length, D1.soon);
  // päris kirjed avanevad vigadeta
  for (const r of real) { await L.go(p, "register"); await planView(p, r.id); }
  const bad = await p.evaluate(() => { const t = document.body.innerText; return (t.match(/.{0,30}(undefined|NaN|Invalid Date).{0,30}/g) || []).slice(0, 3); });
  L.check(T("15"), "Päris kirjed (3) avanevad registrist vigadeta", !log.pageErrors.length && !bad.length, { err: log.pageErrors.slice(0, 3), bad });
  // otsing
  await L.go(p, "toolaud"); await p.locator("#deskQ").fill("P3"); await L.sleep(300);
  const q = await deskData(p);
  L.check(T("16"), "Töölaua otsing filtreerib ja fookus jääb väljale", q.plans.length === 1 && await p.evaluate(() => document.activeElement && document.activeElement.id === "deskQ"), q.plans.map(x => x.name));
  // registri eemaldamise kinnitus pika tabeli korral
  await L.go(p, "register"); await p.evaluate(() => { const b = document.querySelector('[data-rview="table"]'); b && b.click(); }); await L.sleep(300);
  await p.evaluate(() => window.scrollTo(0, 0));
  const vis = await p.evaluate(async () => { const b = document.querySelector("[data-rdel]"); b.scrollIntoView({ block: "center" }); b.click(); await new Promise(r => setTimeout(r, 200)); const c = document.querySelector("#regDelConfirm"); const r = c.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, shown: !c.hidden }; });
  await L.shot(p, "j5_register_delete_confirm");
  L.check(T("18"), "Registri „Eemalda” kinnitusrida on nähtav seal, kus kasutaja klõpsas (11 rea tabel)", vis.shown && vis.top >= 0 && vis.bottom <= vis.vh, vis);
  await p.evaluate(() => document.querySelector("#regDelNo").click());
  const errs = log.pageErrors.concat(log.consoleErrors.filter(e => !/ERR_FAILED/.test(e)));
  L.check(T("17"), "Konsoolis vigu ei olnud", !errs.length, errs);
  await ctx.close();
  // tagasitulev kasutaja: kohalik planeering olemas, aadress ilma #-ta → avaneb töölaud
  { const S0 = { example: false, regId: "dp-t2", name: "P2 Algatatud, teade läheneb", meta: SEED[1].meta, dates: SEED[1].dates, docs: [{ id: "d1", name: "taotlus.txt", st: "alg", type: "taotlus", text: "Detailplaneeringu algatamise taotlus Kohila alevis, pikk tekst ".repeat(3), chars: 180 }], drafts: {}, checks: {}, content: {}, analysis: {}, notices: {}, tasks: [], events: [] };
    const c2 = await L.newCtx(browser, { ...v, dbSeed: SEED, localS: S0 }); const p2 = await c2.newPage(); await p2.clock.setFixedTime(new Date(NOW));
    await p2.goto(url); await L.sleep(1500);
    const st = await p2.evaluate(() => ({ hash: location.hash, tab: [...document.querySelectorAll("section.panel")].filter(x => !x.hidden).map(x => x.dataset.tab), desk: document.querySelector("#deskBody").innerText.length, main: document.querySelector("main").innerText.trim().length }));
    const sh = await L.shot(p2, "j5_returning_user");
    L.check(T("19"), "Tagasitulev kasutaja (kohalik planeering olemas) näeb avamisel sisu, mitte tühja lehte", st.main > 50, { ...st, sh });
    await c2.close(); }
}
module.exports = { run, SEED, NOW };
