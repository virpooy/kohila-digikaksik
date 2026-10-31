/* Peatükid otsustajale: iga peatükk on küsimus, iga jaotis algab leiupealkirjaga (P1). */

/* ---------- ühised arvutused ---------- */
function goalOf(id) {
  const u = UN(id), t = u && u.target; if (!t) return null;
  const migs = Object.keys(MIGN()), y = t.year, vals = migs.map(m => ({ m, v: popAt(id, y, { ...params(), mig: m }) }));
  const model = popAt(id, y), lo = Math.min(...vals.map(x => x.v)), hi = Math.max(...vals.map(x => x.v)), meet = vals.filter(x => x.v >= t.pop);
  const st = lo >= t.pop ? "ok" : hi >= t.pop ? "warn" : "crit";
  let need = null; if (!isAgg(id) && model < t.pop) { try { need = E.needExtra(ctx, id, t.pop, y, params()); } catch (e) { need = null; } }
  return { t, y, model, lo, hi, meet, st, need, share: model / t.pop, gap: model - t.pop, p26: popAt(id, 2026) };
}
const CAP = {}, PR = { la: 30000, sc: 25000 };
const members = id => isAgg(id) ? ctx.aggregates[id].members : [id];
const invOf = id => { const c = CAP[id] || {}; return E.investNeed(ctx, id, proj(id), { la: c.la, sc: c.sc, priceLa: PR.la, priceSc: PR.sc }); };
const capSt = y => y == null ? "ok" : y <= 2030 ? "crit" : "warn";
const popSeries = (id, p) => { const r = []; for (let y = 2026; y <= 2036; y++) r.push([y, popAt(id, y, p)]); return r; };
const histSeries = id => { const r = []; for (let y = 2015; y <= 2026; y++) r.push([y, D.pop[id].tot[String(y)]]); return r; };
const bandSeries = id => { const r = []; for (let y = 2026; y <= 2036; y++) { const v = Object.keys(MIGN()).map(m => popAt(id, y, { ...params(), mig: m })); r.push([y, Math.min(...v), Math.max(...v)]); } return r; };
const scenTxt = () => esc(MIGN()[S.mig]) + (S.extra ? `, lisaränne ${sg(S.extra)} in/a` : "") + (S.fert ? `, sündimus ${pc(S.fert / 100, 0)}` : "");

/* Rahvaarvu põhijoonis: ajalugu pidev, prognoos katkendjoon, rändemustrite vahemik viirutusega, siht rombiga. */
function popChart(el, id, o = {}) {
  const G = goalOf(id), col = css("--v-" + id.toLowerCase()) || css("--a-work");
  timeChart(el, { series: [{ name: "tegelik", pts: histSeries(id), color: css("--ink"), w: 2, dots: true }, { name: "prognoos", pts: popSeries(id), color: col, w: 2.6, dash: true, end: true }],
    band: bandSeries(id), today: 2026, h: o.h || 280, unit: "elanikku",
    refs: G ? [{ y: G.t.pop, x: G.y, label: `siht ${f0(G.t.pop)} · ${G.y}`, color: css("--loss") }] : [],
    desc: `${UN(id).name}: rahvaarv 2015–2036. 2026: ${f0(popAt(id, 2026))}, 2036 prognoos ${f0(popAt(id, 2036))}.` + (G ? ` Siht ${f0(G.t.pop)} aastaks ${G.y}, prognoos ${f0(G.model)}.` : "") });
  return legend([{ n: "tegelik (Statistikaamet)", c: css("--ink") }, { n: "prognoos: " + MIGN()[S.mig], c: col, k: "d" }, { n: "viie rändemustri vahemik", c: css("--ref"), k: "h" }].concat(G ? [{ n: "arengukava siht (romb)", c: css("--loss"), k: "d" }] : []));
}

/* =============== 1. Ülevaade =============== */
function secLyhivaade(el) {
  const id = S.unit, u = UN(id), G = goalOf(id), P26 = popAt(id, 2026), P36 = popAt(id, 2036);
  const inv = members(id).map(m => ({ m, I: invOf(m) })), short = k => inv.filter(x => x.I["first" + k]), first = k => Math.min(...short(k).map(x => x.I["first" + k]).concat(9999));
  const goals = E.goalsEval(ctx, id, params()), gOk = goals.filter(g => g.st === "ok").length;
  const cards = [];
  cards.push(G ? { st: G.st, k: `Rahvaarv ${G.y} vs siht`, big: `${Math.round(G.share * 100)}% sihist`, txt: `${f0(G.model)} elanikku, siht ${f0(G.t.pop)}. Viie rändemustri järgi ${f0(G.lo)}–${f0(G.hi)}.`, q: G.st === "ok" ? "Kas siht on piisavalt ambitsioonikas?" : `Kas siht vaadata üle või leppida kokku meetmed ${G.need ? "+" + f0(G.need) + " elaniku" : "lisarände"} jaoks aastas?`, a: "eesmargid/siht" }
    : { st: P36 >= P26 ? "ok" : "warn", k: "Rahvaarv 2036", big: f0(P36), txt: `${pc(P36 / P26 - 1)} võrreldes 2026. aastaga (${f0(P26)}). Arvulist sihti ei ole.`, q: "Kas arengukavasse on vaja rahvaarvu sihti?", a: "rahvastik/rahvaarv" });
  ["La", "Sc"].forEach(k => { const f = first(k), n = short(k).length, w = k === "La" ? "Lasteaiakohti" : "Koolikohti";
    cards.push({ st: capSt(f < 9999 ? f : null), k: w + " 2026–2036", big: f < 9999 ? "puudu " + f : "jätkub", txt: f < 9999 ? (isAgg(id) ? `${n} valda ${inv.length}-st jääb kohti puudu.` : `Suurim puudujääk ${f0(inv[0].I["maxGap" + k])} kohta; investeering ${eur(inv[0].I["invest" + k])}.`) : `Vabu kohti 2036: ${f0(inv.reduce((s, x) => s + x.I["surplus" + k], 0))}.`, q: f < 9999 ? `Kas ${k === "La" ? "lasteaia" : "kooli"}kohtade lisamine on eelarvestrateegias?` : "Kas vabu kohti saab pakkuda naabervaldadele?", a: "teenused/kohad" }); });
  if (goals.length) cards.push({ st: gOk === goals.length ? "ok" : gOk >= goals.length / 2 ? "warn" : "crit", k: "Arengukava eesmärgid", big: `${gOk} / ${goals.length}`, txt: "mõõdetavat eesmärki täitub valitud stsenaariumis.", q: "Millised eesmärgid vajavad meetmeid?", a: "eesmargid/seire" });
  const fTitle = (G ? (G.st === "ok" ? `${esc(u.short)} jõuab rahvaarvu sihini` : `${esc(u.short)} ei jõua ${f0(G.t.pop)} elaniku sihini`) : `${esc(u.short)}: rahvaarv ${P36 >= P26 ? "kasvab" : "kahaneb"} ${pc(P36 / P26 - 1, 0)}`) + `; ${first("La") < 9999 || first("Sc") < 9999 ? "kohti jääb puudu" : "lasteaia- ja koolikohti jätkub"}`;
  el.innerHTML = `${ttl(`Lühivaade · ${esc(u.name)} · ${scenTxt()}`, fTitle, "h2")}
  <div class="bcards">${cards.map(c => `<div class="bcard" data-st="${c.st}"><span class="kick">${c.k}</span><span class="glyph st ${c.st}">${GLY[c.st][0]} ${GLY[c.st][1]}</span><span class="big">${c.big}</span><span class="small">${c.txt}</span><span class="bq">${c.q}</span><a class="more" href="#${c.a}">Vaata lähemalt →</a></div>`).join("")}</div>
  <div class="inst">${ttl("Rahvaarv 2015–2036", G ? `Prognoos ${G.y}: ${f0(G.model)} · siht ${f0(G.t.pop)}` : `Prognoos 2036: ${f0(P36)}`)}<div class="chart" id="ovPop"></div><div id="ovLeg"></div></div>
  <p class="note">Kõik arvud arvutab kaksiku mootor avaandmetest; tehisaru ei arvuta ühtegi numbrit. Mudelit ei ole sõltumatult üle vaadatud.</p>
  ${meta("Statistikaamet RV0282U · EHIS · arengukavad · kohortmudel")}`;
  $("#ovLeg").innerHTML = popChart($("#ovPop"), id);
}
function secKuidas(el) {
  el.innerHTML = `${ttl("Kuidas lugeda", "Iga jaotis vastab ühele küsimusele: pealkiri on vastus, joonis näitab, tabel on lahti klõpsatav", "h2")}
  <div class="g2"><div class="panel"><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">
    <li>Vali ülal omavalitsus ja stsenaarium (rändemuster, lisaränne, sündimus). Kõik peatükid arvutuvad uuesti.</li>
    <li>Loe jaotise pealkirja: see on leid. Joonis näitab, kust leid tuleb.</li>
    <li>Viirutatud ala on vahemik, mitte piir. Romb on siht. Punktiirjoon on lävend koos tähendusega.</li>
    <li>Täpsed arvud, metoodika ja allikad on „◆” lingi taga; andmed saab alla laadida.</li></ol></div>
  <div class="panel"><span class="kick">Märgid</span><div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:14px">
    <span class="st ok">● korras</span><span>siht täitub või kohti jätkub</span><span class="st warn">▲ piiri peal</span><span>täitub osas stsenaariumides või puudujääk pärast 2030</span>
    <span class="st crit">■ kriitiline</span><span>ei täitu või puudujääk enne 2031</span><span class="st na">◇ puudub</span><span>andmeid ei ole (puuduv ≠ 0)</span>
    <span>${rel("ametlik")}</span><span>Statistikaamet, MTA, valla dokument</span><span>${rel("tuletatud")}</span><span>arvutatud ametlikest andmetest</span><span>${rel("hinnang")}</span><span>mudeli eeldus</span></div></div></div>
  ${use(["Suurusjärgud ja suunad 5–10 aastaks: rahvaarv, lapsed, kohad, eelarve mõju", "Stsenaariumide võrdlus enne otsust", "Seletuskirja mõjude lõigu mustand"],
    ["Asutuse või aadressi täpsusega planeerimine (andmed on valla tasemel)", "Lõplik eelarveprognoos: ühikukulud on 2023–2025 keskmised", "Üksikisiku otsused: isikuandmeid ei kasutata"],
    ["Rändemustrite vahemik ei ole piir, millest tulemus välja ei lähe", "Asulate prognoos jagab valla prognoosi 2021. aasta osakaaludega", "Viie aasta tagantjärele viga oli kuni 3% (peatükk Arendajale)"])}
  ${meta("Kaksiku ideekavand · magistritöö soovitused P1–P18")}`;
}

/* =============== 2. Eesmärgid =============== */
function secSeire(el) {
  const id = S.unit, u = UN(id), R = E.goalsEval(ctx, id, params());
  if (!R.length) { el.innerHTML = ttl(esc(u.name), "Arengukavas ei ole mõõdetavaid eesmärke, mida mudel saaks hinnata", "h2") + `<p class="note">${esc(u.name)}: arvulist sihti ei ole. Vali ülal teine omavalitsus.</p>`; return; }
  const ok = R.filter(g => g.st === "ok").length, crit = R.filter(g => g.st === "crit");
  const fm = g => g.kind === "share" ? (g.sel * 100).toFixed(1).replace(".", ",") + "%" : g.kind === "growth" ? sg(g.sel) + " in/a" : f0(g.sel);
  const tg = g => g.kind === "share" ? (g.op === "<=" ? "≤ " : "≥ ") + (g.v * 100).toFixed(1).replace(".", ",") + "%" : g.kind === "growth" ? g.lo + "–" + g.hi + " in/a" : f0(g.v);
  el.innerHTML = `${ttl(`${esc(u.name)} · ${R.length} mõõdetavat eesmärki · ${scenTxt()}`, `${ok} eesmärki ${R.length}-st täitub${crit.length ? `; ei täitu: ${crit.map(g => esc(g.label.replace(/^.*?vald /, ""))).slice(0, 2).join("; ")}` : ""}`, "h2")}
  <div class="inst"><div class="chart" id="seireCh"></div>
  ${legend([{ n: "siht = 100%", c: css("--ink") }, { n: "viie rändemustri vahemik", c: css("--ref"), k: "h" }])}<div class="legend"><span>◇ 2026</span><span>● täitub · ▲ piiri peal · ■ ei täitu (valitud stsenaarium)</span></div></div>
  ${more("Täpsed väärtused ja dokumendid", table(["Eesmärk", "Päritolu", "Siht", "Aasta", "2026", "Valitud", "Mustrite vahemik", "Täitub mustrites"], R.map(g => [esc(g.label) + (g.note ? `<br><span class="small dim">${esc(g.note)}</span>` : "") + `<br><span class="small dim">${esc(g.doc)}</span>`, rel(g.liik === "ametlik" ? "ametlik" : "hinnang"), tg(g), g.kind === "growth" ? g.y1 + "–" + g.y2 : g.year, g.now != null ? (g.kind === "share" ? (g.now * 100).toFixed(1).replace(".", ",") + "%" : f0(g.now)) : '<span class="missing">puudub</span>', stTag(g.st, fm(g)), g.kind === "share" ? (g.lo * 100).toFixed(1).replace(".", ",") + "–" + (g.hi * 100).toFixed(1).replace(".", ",") + "%" : f0(g.lo) + "–" + f0(g.hi), g.meet + " / " + g.n]), 2))}
  ${more("Kuidas see on arvutatud", `<p class="note">Iga eesmärk viiakse ühisele skaalale „% sihist” (siht = 100%), et erineva ühikuga eesmärke saaks kõrvuti lugeda. „Ülemmäära” eesmärgi (nt 65+ osakaal kuni X%) puhul on 100% üle hea pool. Vahemik on viie rändemustri tulemus; seis: ● täitub kõigis, ▲ osas, ■ üheski mustris.</p>`)}
  ${meta("Arengukavad · TwinEngine goalsEval", csvBtn("goals", "eesmargid_" + id + ".csv", ["eesmark", "siht", "aasta", "valitud", "protsent_sihist", "taitub_mustrites"], R.map(g => [g.label, g.v != null ? g.v : g.lo + "-" + g.hi, g.year || g.y2, g.sel, Math.round(g.share * 100), g.meet + "/" + g.n])))}`;
  goalRows($("#seireCh"), R.map(g => ({ label: g.label, sub: `${g.liik} · ${g.kind === "growth" ? g.y1 + "–" + g.y2 : g.year}`, share: g.share, lo: g.shareLo, hi: g.shareHi, now: g.shareNow, st: g.st, val: fm(g) })), { desc: `${u.name}: ` + R.map(g => `${g.label} ${Math.round(g.share * 100)}% sihist`).join("; ") });
}
function secSiht(el) {
  const id = S.unit, u = UN(id), G = goalOf(id);
  if (!G) { el.innerHTML = ttl(esc(u.name), "Arengukavas ei ole arvulist rahvaarvu sihti", "h2") + `<p class="note">Rahvaarvu prognoos on peatükis Rahvastik.</p>`; return; }
  const need = G.need, wp = need > 0 && isFinite(need) ? popSeries(id, { ...params(), vx: need }) : null;
  const t = G.st === "ok" ? `Siht ${f0(G.t.pop)} täitub: ${G.y}. aastal ${f0(G.model)} elanikku` : need != null && isFinite(need) ? `Sihini jõudmiseks on vaja ${sg(need)} elanikku aastas rohkem sisserännet (≈ ${f0(need / 2.4)} eluruumi aastas)` : `Siht ${f0(G.t.pop)} jääb ${f0(-G.gap)} elaniku võrra täitmata`;
  el.innerHTML = `${ttl(`Rahvaarvu siht · ${esc(G.t.src || "arengukava")}`, t, "h2")}
  <div class="inst"><div class="chart" id="shCh"></div>${legend([{ n: "tegelik", c: css("--ink") }, { n: "prognoos: " + MIGN()[S.mig], c: css("--a-work"), k: "d" }].concat(wp ? [{ n: `koos lisarändega ${sg(need)} in/a`, c: css("--loss"), k: "d" }] : []).concat([{ n: "siht", c: css("--loss") }]))}</div>
  <div class="callout"><span class="st ${G.st}">${GLY[G.st][0]}</span><span>Viie rändemustri järgi on ${G.y}. aasta rahvaarv ${f0(G.lo)}–${f0(G.hi)}; siht täitub ${G.meet.length} mustris 5-st. „Vajalik lisaränne” on aritmeetika, mitte plaan: see ütleb, kui palju peaks juurde tulema, mitte kuidas.</span></div>
  ${isAgg(id) ? "" : `<p class="note"><a href="#otsused/eelhinnang">Koosta selle sihi kohta seletuskirja mõjude lõik →</a></p>`}
  ${meta("Arengukava · Statistikaamet · TwinEngine needExtra")}`;
  timeChart($("#shCh"), { series: [{ name: "tegelik", pts: histSeries(id), color: css("--ink"), w: 2, dots: true }, { name: "prognoos", pts: popSeries(id), color: css("--a-work"), w: 2.6, dash: true, end: true }].concat(wp ? [{ name: "lisarändega", pts: wp, color: css("--loss"), w: 2.2, dash: true, end: true }] : []),
    band: bandSeries(id), today: 2026, h: 300, unit: "elanikku", refs: [{ y: G.t.pop, x: G.y, label: `siht ${f0(G.t.pop)} · ${G.y}`, color: css("--loss") }], desc: `${u.name}: siht ${f0(G.t.pop)} aastaks ${G.y}; prognoos ${f0(G.model)}.` });
}

/* =============== 3. Rahvastik =============== */
function secRahvaarv(el) {
  const id = S.unit, u = UN(id), P26 = popAt(id, 2026), P36 = popAt(id, 2036), B = bandSeries(id), b36 = B[B.length - 1];
  const rows = histSeries(id).map(h => [h[0], "tegelik", h[1]]).concat(Object.keys(MIGN()).flatMap(m => popSeries(id, { ...params(), mig: m }).slice(1).map(p => [p[0], MIGN()[m], p[1]])));
  el.innerHTML = `${ttl(`Rahvaarv 2015–2036 · ${esc(u.name)}`, `Rahvaarv ${P36 >= P26 ? "kasvab" : "kahaneb"} ${pc(P36 / P26 - 1)}: ${f0(P26)} → ${f0(P36)}; rändemustrite vahemik 2036 ${f0(b36[1])}–${f0(b36[2])}`, "h2")}
  <div class="inst"><div class="chart" id="rpCh"></div><div id="rpLeg"></div></div>
  ${more("Rändemustrid 2036", table(["Rändemuster", "Rahvaarv 2036", "Muutus"], Object.keys(MIGN()).map(m => { const v = popAt(id, 2036, { ...params(), mig: m }); return { cls: m === S.mig ? "tot" : "", cells: [esc(MIGN()[m]) + (m === S.mig ? " (valitud)" : ""), f0(v), pc(v / P26 - 1)] }; })))}
  ${more("Kuidas see on arvutatud", `<p class="note">Üheaastaste vanustega kohortmudel ${rel("tuletatud")}. Rändemuster on omavalitsuse rändejäägi vanusejaotus valitud perioodil, registriparandused välja arvatud ${rel("ametlik")}. Ajalooline keskmine on kahe perioodi keskmine, mitte kõige tõenäolisem tulevik. Rahvaarv kattub põhimudeliga (Raplamaa arengukangas) täpselt; vt Arendajale → testid.</p>`)}
  ${meta("Statistikaamet RV0282U, RV112U, RV49U, RVR02 · kohortmudel", csvBtn("pop", "rahvaarv_" + id + ".csv", ["aasta", "seeria", "rahvaarv"], rows))}`;
  $("#rpLeg").innerHTML = popChart($("#rpCh"), id, { h: 320 });
}
function secVanus(el) {
  const id = S.unit, u = UN(id), Y = [2026, 2031, 2036], bv = E.BANDS.map(([l, i, j]) => ({ l, v: Y.map(y => E.sumG(ageAt(id, y), i, j)) }));
  const up = bv.filter(b => b.v[2] > b.v[0]), dn = bv.filter(b => b.v[2] < b.v[0]), big = bv.slice().sort((a, b) => Math.abs(b.v[2] - b.v[0]) - Math.abs(a.v[2] - a.v[0]))[0];
  el.innerHTML = `${ttl(`Vanuserühmad 2026 → 2036 · ${esc(u.name)}`, `Suurim muutus: ${big.l} ${sg(big.v[2] - big.v[0])} (${pc(big.v[2] / big.v[0] - 1, 0)}); kasvab ${up.length}, kahaneb ${dn.length} rühma`, "h2")}
  <div class="g2"><div class="inst"><span class="kick">Muutus inimestes</span><div class="chart" id="vaCh"></div></div>
  <div class="inst"><span class="kick">Koosseis 2026 ja 2036</span><div class="chart" id="vaSt"></div>${legend([{ n: "0–14", c: css("--a-kid"), k: "b" }, { n: "15–64", c: css("--a-work"), k: "b" }, { n: "65+", c: css("--a-old"), k: "b" }])}</div></div>
  ${more("Täpsed väärtused", table(["Vanuserühm"].concat(Y.map(String), ["Muutus"]), bv.map(b => [b.l].concat(b.v.map(f0), [pc(b.v[2] / b.v[0] - 1)])).concat([{ cls: "tot", cells: ["Kokku"].concat(Y.map(y => f0(popAt(id, y))), [pc(popAt(id, 2036) / popAt(id, 2026) - 1)]) }])))}
  ${meta("Statistikaamet · kohortmudel", csvBtn("age", "vanuseryhmad_" + id + ".csv", ["vanuseruhm"].concat(Y.map(String)), bv.map(b => [b.l].concat(b.v))))}`;
  bars($("#vaCh"), bv.map(b => ({ label: b.l, v: b.v[2] - b.v[0], txt: `${sg(b.v[2] - b.v[0])} (${pc(b.v[2] / b.v[0] - 1, 0)})`, color: b.v[2] >= b.v[0] ? css("--gain") : css("--loss") })), { lw: 70, rw: 120, desc: "Vanuserühmade muutus 2026–2036" });
  const grp = y => { const a = ageAt(id, y); return [{ v: E.sumG(a, 0, 2), color: css("--a-kid"), name: "0–14" }, { v: E.sumG(a, 3, 12), color: css("--a-work"), name: "15–64" }, { v: E.sumG(a, 13, 17), color: css("--a-old"), name: "65+" }]; };
  stack($("#vaSt"), [2026, 2036].map(y => ({ label: String(y), parts: grp(y), txt: Math.round(grp(y)[2].v / E.total(ageAt(id, y)) * 100) + "% 65+" })), { pct: true, lw: 50, rw: 70, desc: "Vanuskoosseis 2026 ja 2036" });
}
const asulaKey = n => String(n || "").replace(/ (alev|alevik|küla|linn)$/i, "").trim();
function secAsulad(el) {
  const id = formUnit(), u = ctx.units[id];
  if (!D.settlements[id]) { el.innerHTML = ttl(esc(u.name), "Asulate andmeid ei ole", "h2"); return; }
  const L = E.settlementLayer(ctx, id, proj(id), 2036), L26 = E.settlementLayer(ctx, id, proj(id), 2026), tot = L.reduce((a, r) => a + r.pk, 0), no = L.filter(r => !r.school).reduce((a, r) => a + r.pk, 0);
  el.innerHTML = `${ttl(`Põhikooliealised asulate kaupa 2036 · ${esc(u.name)}${isAgg(S.unit) ? " (maakonna asemel Kohila)" : ""}`, `${Math.round(no / tot * 100)}% põhikooliealistest elab asulates, kus põhikooli ei ole`, "h2")}
  <div class="inst"><div class="chart" id="asCh"></div>${legend([{ n: "põhikool asulas", c: css("--a-work"), k: "b" }, { n: "põhikooli ei ole", c: css("--a-kid"), k: "b" }])}</div>
  ${more("Täpsed väärtused", table(["Asula", "REL 2021", "Rahvaarv 2026", "Rahvaarv 2036", "Lasteaiaealised 2036", "Põhikooliealised 2036", "Põhikool"], L.map((r, i) => [esc(r.n), f0(r.pop21), f0(L26[i].pop), f0(r.pop), f0(r.la), f0(r.pk), r.school ? "on" : r.other ? "osaliselt" : "ei ole"])))}
  ${more("Kuidas see on arvutatud", `<p class="note">Valla prognoos jagatakse asulatesse 2021. aasta rahvaloenduse osakaalude järgi ${rel("hinnang")}, seega kõik asulad muutuvad sama tempoga. Alla 200 elanikuga asulad on koondatud. Kaksik saab asulate oma trendid Rahvastikuregistrist.${id === "Rae" ? " Soodevahe küla täiskasvanud elanikud on suures osas Tallinna Vangla kinnipeetavad." : ""}</p>`)}
  ${meta("Statistikaamet RL21003 · EHIS · TwinEngine settlementLayer")}`;
  bars($("#asCh"), L.slice().sort((a, b) => b.pk - a.pk).map(r => ({ label: r.n, v: r.pk, txt: f0(r.pk) + (r.school ? " · kool" : r.other ? " · osaliselt" : ""), color: r.school ? css("--a-work") : css("--a-kid") })), { lw: 140, rw: 110, fmt: f0, desc: "Põhikooliealised asulate kaupa 2036" });
}

/* =============== 4. Teenused =============== */
function secKohad(el) {
  const id = S.unit, u = UN(id);
  if (isAgg(id)) {
    const R = members(id).map(m => ({ m, I: invOf(m) }));
    const gap = (I, k) => I["maxGap" + k] > 0.5 ? I["maxGap" + k] : -I["surplus" + k], bs = k => R.map(({ m, I }) => { const v = gap(I, k); return { label: ctx.units[m].short, v, txt: v > 0 ? `puudu ${f0(v)} (${I["first" + k]})` : `vabu ${f0(-v)}`, color: v > 0 ? css("--crit") : css("--ok") }; });
    const sh = R.filter(x => x.I.firstLa || x.I.firstSc);
    el.innerHTML = `${ttl(`${esc(u.name)} · suurim vahe nõudluse ja kohtade vahel 2026–2036`, sh.length ? `Kohti jääb puudu: ${sh.map(x => ctx.units[x.m].short).join(", ")}` : "Kohti jätkub kõigis valdades", "h2")}
    <div class="g2"><div class="inst"><span class="kick">Lasteaed</span><div class="chart" id="kLa"></div></div><div class="inst"><span class="kick">Kool</span><div class="chart" id="kSc"></div></div></div>
    ${legend([{ n: "■ kohti puudu", c: css("--crit"), k: "b" }, { n: "● vabu kohti", c: css("--ok"), k: "b" }])}${meta("EHIS · valla andmed · TwinEngine investNeed")}`;
    bars($("#kLa"), bs("La"), { lw: 80, rw: 110 }); bars($("#kSc"), bs("Sc"), { lw: 80, rw: 110 }); return;
  }
  const I = invOf(id), la = I.rows.map(r => [r.y, r.la]), sc = I.rows.map(r => [r.y, r.sc]), cs = I.capSrc || E.capOf(ctx, id).src || "";
  const t = `${I.firstLa ? "Lasteaiakohti puudu alates " + I.firstLa : "Lasteaiakohti jätkub"}; ${I.firstSc ? "koolikohti puudu alates " + I.firstSc : "koolikohti jätkub"} (kuni 2036)`;
  el.innerHTML = `${ttl(`Nõudlus ja kohad 2026–2036 · ${esc(u.name)} · ${scenTxt()}`, t, "h2")}
  <div class="bcards">${[["La", "Lasteaed", la], ["Sc", "Kool", sc]].map(([k, n, s]) => { const st = capSt(I["first" + k]), c = I["cap" + k], mx = Math.max(...s.map(p => p[1])); return `<div class="bcard" data-st="${st}"><span class="kick">${n}</span><span class="glyph st ${st}">${GLY[st][0]} ${GLY[st][1]}</span><span class="big">${f0(Math.round(mx / c * 100))}%</span><span class="small">suurim täituvus (${f0(mx)} / ${f0(c)} kohta)</span></div>`; }).join("")}</div>
  <div class="inst"><div class="chart" id="kCh"></div>${legend([{ n: "lasteaialapsed (prognoos)", c: css("--a-kid"), k: "d" }, { n: "õpilased (prognoos)", c: css("--a-work"), k: "d" }, { n: "kohtade arv (lävend)", c: css("--ref") }])}</div>
  ${more("Täpsed väärtused", table(["Aasta", "Lasteaialapsed", "Lasteaiakohad", "Vahe", "Õpilased", "Koolikohad", "Vahe"], I.rows.map(r => [r.y, f0(r.la), f0(I.capLa), sg(-r.gapLa), f0(r.sc), f0(I.capSc), sg(-r.gapSc)])))}
  ${more("Kuidas see on arvutatud", `<p class="note">Nõudlus muutub koos 1–6- ja 7–18-aastaste arvuga ${rel("tuletatud")}; baas on 2025/26 õppeaasta laste ja õpilaste arv ${rel("ametlik")}. Kohtade arv: ${esc(cs)}${/hinnang|ajutine|praegune/.test(cs) ? " " + rel("hinnang") : " " + rel("ametlik")}.${id === "Rae" ? " Rae koolikohtade hulgas on Kindluse Kooli juurdeehitus (2027–2028); kuni 2028 on tegelikke kohti ~480 vähem." : ""}</p>`)}
  ${meta("EHIS / HaridusSilm · kohortmudel", csvBtn("edu", "kohad_" + id + ".csv", ["aasta", "lasteaialapsed", "lasteaiakohad", "opilased", "koolikohad"], I.rows.map(r => [r.y, r.la, I.capLa, r.sc, I.capSc])))}`;
  timeChart($("#kCh"), { series: [{ name: "õpilased", pts: sc, color: css("--a-work"), w: 2.4, dash: true, end: true }, { name: "lasteaialapsed", pts: la, color: css("--a-kid"), w: 2.4, dash: true, end: true }], y0: 0, h: 280,
    refs: [{ y: I.capSc, label: `koolikohti ${f0(I.capSc)}`, color: css("--ref"), left: true }, { y: I.capLa, label: `lasteaiakohti ${f0(I.capLa)}`, color: css("--ref"), left: true }], desc: `${u.name}: ${t}` });
}
function secInvest(el) {
  const rows = D.kov.units.map(u => { const I = invOf(u.id), inv = I.investLa + I.investSc; return { u, I, inv, de: E.debtEffect(ctx, u.id, inv), c: CAP[u.id] || {} }; });
  const need = rows.filter(r => r.inv > 0), tot = need.reduce((a, r) => a + r.inv, 0), sel = rows.find(r => r.u.id === formUnit()), P = sel.de.path;
  const lastR = P ? P.rows[P.rows.length - 1].ratio : null, dst = P ? (P.maxRatio > .6 ? "crit" : P.maxRatio > .5 ? "warn" : "ok") : "na";
  el.innerHTML = `${ttl("Investeeringuvajadus ja netovõlakoormus", need.length ? `${need.map(r => esc(r.u.short)).join(", ")}: kohtade lisamiseks kokku ${eur(tot)}` : "Kohti jätkub kõigis omavalitsustes; lisainvesteeringut ei ole vaja", "h2")}
  <div class="inst"><div class="chart" id="ivB"></div><p class="note">Investeering = suurim puudujääk × koha hind (lasteaiakoht ${eur(PR.la)}, koolikoht ${eur(PR.sc)} ${rel("hinnang")}).</p></div>
  <div class="panel">${ttl(`Netovõlakoormus · ${esc(sel.u.name)}${sel.inv > 0 ? " · investeering laenuga" : ""}`, P ? `${stTag(dst)} Netovõlakoormus ${Math.round(P.rows[0].ratio * 100)}% → ${Math.round(lastR * 100)}% (${P.rows[0].y}–${P.rows[P.rows.length - 1].y})` : `<span class="missing">Eelarvestrateegia andmed puuduvad</span>`)}
    ${P ? `<div class="chart" id="ivD"></div>${legend([{ n: sel.inv > 0 ? "koos investeeringuga" : "eelarvestrateegia", c: css("--a-work") }].concat(sel.inv > 0 ? [{ n: "ilma investeeringuta", c: css("--ref"), k: "d" }] : []))}` : `<p class="note">Lisanduv koormus: +${Math.round(sel.de.add * 100)} protsendipunkti põhitegevuse tuludest.</p>`}</div>
  ${more("Muuda kohtade arvu ja hindu", `<form class="form" id="prF" onsubmit="return false"><div class="f"><label for="prLa">Lasteaiakoha hind, €</label><input type="number" id="prLa" step="1000" value="${PR.la}"><small>hinnang</small></div><div class="f"><label for="prSc">Koolikoha hind, €</label><input type="number" id="prSc" step="1000" value="${PR.sc}"><small>hinnang</small></div></form>
    ${table(["Omavalitsus", "Lasteaiakohti", "Puudu alates", "Koolikohti", "Puudu alates", "Investeering", "Netovõlakoormus"], rows.map(({ u, I, inv, de, c }) => ({ cls: u.id === formUnit() ? "tot" : "", cells: [esc(u.name),
      `<input type="number" aria-label="${esc(u.name)} lasteaiakohad" data-cap="${u.id}|la" placeholder="${f0(I.capLa)}" value="${c.la != null ? c.la : ""}" style="width:84px">`, I.firstLa || "–",
      `<input type="number" aria-label="${esc(u.name)} koolikohad" data-cap="${u.id}|sc" placeholder="${f0(I.capSc)}" value="${c.sc != null ? c.sc : ""}" style="width:84px">`, I.firstSc || "–",
      inv > 0 ? eur(inv) : "–", de.before != null ? Math.round(de.before * 100) + "% → " + Math.round(de.after * 100) + "%" : "+" + Math.round(de.add * 100) + " p.p."] })))}
    <p class="note">Tühi väli = andmetes olev kohtade arv.</p>`, !!Object.keys(CAP).length)}
  ${more("Kuidas see on arvutatud", `<p class="note">Investeering kaetakse laenuga (${(ctx.cfg.loan || { rate: 4 }).rate}% intress, ${(ctx.cfg.loan || { years: 20 }).years} aastat, võrdsed põhiosad) ${rel("hinnang")}. Netovõlg on eelarvestrateegiast ${rel("ametlik")}, tulud RR300. 60% on seaduses sätestatud üldine ülemmäär (KOFS § 34); 50% hoiatusjoon on kaksiku kokkulepe.</p>`)}
  ${meta("EHIS · eelarvestrateegiad · RR300 · TwinEngine investNeed, debtEffect")}`;
  bars($("#ivB"), rows.map(r => ({ label: r.u.short, v: r.inv / 1e6, txt: r.inv > 0 ? eur(r.inv) : "kohti jätkub", color: r.inv > 0 ? css("--crit") : css("--ok") })), { lw: 80, rw: 120, desc: "Investeeringuvajadus omavalitsuste kaupa" });
  if (P) timeChart($("#ivD"), { series: [{ name: "koos investeeringuga", pts: P.rows.map(r => [r.y, r.ratio * 100]), color: css("--a-work"), w: 2.6, end: true }].concat(sel.inv > 0 ? [{ name: "ilma", pts: P.rows.map(r => [r.y, r.ratioBase * 100]), color: css("--ref"), dash: true, w: 1.6 }] : []),
    refs: [{ y: 60, label: "60% · seaduse ülemmäär", color: css("--crit"), left: true }, { y: 50, label: "50% · hoiatus (kokkulepe)", color: css("--warn"), left: true }], y0: 0, h: 220, yfmt: v => Math.round(v) + "%", desc: `${sel.u.name} netovõlakoormus` });
  el.onchange = e => { const t = e.target; if (t.dataset.cap) { const [i, k] = t.dataset.cap.split("|"); CAP[i] = CAP[i] || {}; CAP[i][k] = t.value === "" ? null : +t.value; } else if (t.id === "prLa" || t.id === "prSc") PR[t.id === "prLa" ? "la" : "sc"] = +t.value || 0; else return; secInvest(el); };
}
