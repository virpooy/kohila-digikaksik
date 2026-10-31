/* Planeeringud, stsenaariumid, otsused, liikuvus, küsi kaksikult. */

/* =============== 5. Planeeringud ja arendused =============== */
const dpOf = vid => D.dp.rows.filter(d => (d.vald || "").startsWith(D.kov.units.find(x => x.id === vid).name.split(" ")[0]));
function dpDevs(vid) { const U = LS.get("dpUnits", {}); return dpOf(vid).flatMap(d => { const u = { ...d.units, ...(U[d.id] || {}) }, st = +(U[d.id] && U[d.id].start) || d.start || 2028, yrs = +(U[d.id] && U[d.id].years) || d.years || 2; return ["eramu", "ridaelamu", "korter"].filter(t => +u[t] > 0).map(t => ({ n: +u[t], type: t, start: st, years: yrs, dp: d.name })); }); }
const budgetSteps = (L, marg) => { const s = [{ label: "Tulumaks", v: L.dTaxR }, { label: "Tasandusfond", v: -L.dTf }]; if (marg && L.dNetMarg != null) s.push({ label: "Piirkulu", v: -L.dCostMarg }, { label: "Neto piirkuluga", total: true }, { label: "Muu täiskulu", v: -(L.dCost - L.dCostMarg) }, { label: "Neto täiskuluga", total: true }); else s.push({ label: "Täiskulu", v: -L.dCost }, { label: "Neto täiskuluga", total: true }); return s; };
function impactCharts(H, a, b) {
  timeChart($(a), { series: [{ name: "õpilasi juurde", pts: H.rows.map(r => [r.y, r.dSc]), color: css("--a-work"), w: 2.4, dash: true, end: true }, { name: "lasteaialapsi juurde", pts: H.rows.map(r => [r.y, r.dLa]), color: css("--a-kid"), w: 2.4, dash: true, end: true }], y0: 0, h: 220, desc: `Lisanduv nõudlus: õpilasi tipul ${sg(H.peakSc.dSc)}, lasteaialapsi ${sg(H.peakLa.dLa)}` });
  waterfall($(b), budgetSteps(H.last, true), { desc: `Eelarve mõju 2036: neto täiskuluga ${sg(H.last.dNet / 1000)} tuh €` });
}
function secDp(el) {
  const vid = formUnit(), rows = dpOf(vid), U = LS.get("dpUnits", {}), devs = dpDevs(vid), H = devs.length ? E.devsImpact(ctx, vid, devs, params()) : null;
  el.innerHTML = `${ttl(`Menetluses detailplaneeringud · ${esc(ctx.units[vid].name)} · planeeringukontroll ${esc(D.dp.updated)}`, H ? `${rows.length} planeeringut lisavad koos ${f0(H.newcomers)} elanikku; õpilasi tipul ${sg(H.peakSc.dSc)}, lasteaialapsi ${sg(H.peakLa.dLa)}` : `${rows.length} planeeringut; eluruumide arv on sisestamata, seega koosmõju ei saa arvutada`, "h2")}
  ${H ? `<div class="g2"><div class="inst"><span class="kick">Lisanduv nõudlus</span><div class="chart" id="dpA"></div>${legend([{ n: "õpilased", c: css("--a-work"), k: "d" }, { n: "lasteaialapsed", c: css("--a-kid"), k: "d" }])}</div><div class="inst"><span class="kick">Eelarve 2036 · tuh € aastas</span><div class="chart" id="dpB"></div></div></div>` : `<div class="callout"><span class="st na">◇</span><span>Sisesta iga planeeringu eluruumide arv allpool või planeeringukontrollis. <span class="missing">Puuduv ei ole null</span>: seni ei näita kaksik planeeringute mõju.</span></div>`}
  <div class="g3">${rows.length ? rows.map(d => { const u = { ...d.units, ...(U[d.id] || {}) }; return `<div class="panel" style="gap:8px"><span class="kick">${esc(d.asula)} · ${esc(d.stage)}</span><h3>${esc(d.name)}</h3><span class="small mut">${esc(d.goal)}</span>
    ${d.housing ? `<form class="form" data-dp="${esc(d.id)}" onsubmit="return false" style="grid-template-columns:repeat(3,1fr)">${["eramu", "ridaelamu", "korter"].map(t => `<div class="f"><label for="dp${d.id}${t}">${t}</label><input type="number" min="0" id="dp${d.id}${t}" data-k="${t}" value="${u[t] || ""}" placeholder="puudub"></div>`).join("")}
    <div class="f"><label for="dp${d.id}start">Asustamine algab</label><input type="number" id="dp${d.id}start" data-k="start" value="${u.start || d.start || 2028}"></div><div class="f"><label for="dp${d.id}years">Kestus, a</label><input type="number" id="dp${d.id}years" data-k="years" value="${u.years || d.years || 2}"></div></form>` : `<span class="st na">◇ eluruume ei kavandata</span>`}</div>`; }).join("") : `<p class="note">Selle valla planeeringuid planeeringukontrollis ei ole.</p>`}</div>
  ${more("Kuidas see on arvutatud", `<p class="note">Planeeringud tulevad planeeringukontrollist (<code>tools/pk_export.py</code> → <code>data/dp.json</code>). Siin sisestatud eluruumide arv salvestub ainult sinu brauserisse ${rel("hinnang")}. Koosmõju arvutab <code>devsImpact</code>: kõik arendused samas projektsioonis, igaühel oma vanuseprofiil.</p>`)}
  ${meta("Planeeringukontroll · TwinEngine devsImpact")}`;
  el.querySelectorAll("form[data-dp]").forEach(f => f.addEventListener("change", e => { const k = e.target.dataset.k, U2 = LS.get("dpUnits", {}); U2[f.dataset.dp] = U2[f.dataset.dp] || {}; U2[f.dataset.dp][k] = e.target.value === "" ? null : +e.target.value; LS.set("dpUnits", U2); secDp(el); }));
  if (H) impactCharts(H, "#dpA", "#dpB");
}
const HI = { unit: null, n: 120, type: "korter", start: 2028, years: 2, hh: "", occ: 95, outside: 70, settlement: "", capLa: "", capSc: "" };
function hiInputs() { const id = HI.unit || formUnit(); return { n: +HI.n, type: HI.type, start: +HI.start, years: +HI.years, hh: HI.hh ? +HI.hh : null, occ: +HI.occ / 100, outside: +HI.outside / 100, settlement: HI.settlement || null, capLa: HI.capLa !== "" ? +HI.capLa : null, capSc: HI.capSc !== "" ? +HI.capSc : null, priceLa: PR.la, priceSc: PR.sc, unit: id }; }
function secArendus(el) {
  const id = HI.unit || formUnit(); HI.unit = id; const sets = D.settlements[id] || [], cap = E.capOf(ctx, id);
  if (HI.settlement && !sets.find(s => s[0] === HI.settlement)) HI.settlement = "";
  el.innerHTML = `${ttl("Elamuarenduse mõju", "Sisesta arendus: kaksik arvutab uued elanikud, lapsed, kohad ja mõju valla eelarvele", "h2")}
  <form class="form panel" id="hiF" onsubmit="return false">
    <div class="f"><label for="hiU">Omavalitsus</label><select id="hiU" data-k="unit">${D.kov.units.map(u => `<option value="${u.id}" ${u.id === id ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></div>
    <div class="f"><label for="hiN">Eluruume</label><input type="number" id="hiN" data-k="n" min="1" step="10" value="${HI.n}"></div>
    <div class="f"><label for="hiT">Elamutüüp</label><select id="hiT" data-k="type">${[["korter", "korterelamu"], ["ridaelamu", "ridaelamu"], ["eramu", "eramud"]].map(([k, t]) => `<option value="${k}" ${k === HI.type ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    <div class="f"><label for="hiS">Asustamine algab</label><input type="number" id="hiS" data-k="start" min="2027" max="2036" value="${HI.start}"></div>
    <div class="f"><label for="hiY">Kestus, a</label><input type="number" id="hiY" data-k="years" min="1" max="8" value="${HI.years}"></div>
    <div class="f"><label for="hiA">Asula</label><select id="hiA" data-k="settlement"><option value="">täpsustamata</option>${sets.map(s => `<option ${s[0] === HI.settlement ? "selected" : ""}>${esc(s[0])}</option>`).join("")}</select></div>
    <details class="more" style="grid-column:1/-1"><summary>Täpsemad eeldused</summary><div class="in form">
      <div class="f"><label for="hiH">Elanikke leibkonnas</label><input type="number" id="hiH" data-k="hh" step="0.1" placeholder="${String((ctx.cfg.housing || { hh: E.HH }).hh[HI.type]).replace(".", ",")}" value="${HI.hh}"><small>tühi = tüübi vaikeväärtus (hinnang)</small></div>
      <div class="f"><label for="hiO">Täituvus, %</label><input type="number" id="hiO" data-k="occ" min="10" max="100" value="${HI.occ}"></div>
      <div class="f"><label for="hiX">Tulijad väljastpoolt valda, %</label><input type="number" id="hiX" data-k="outside" min="0" max="100" value="${HI.outside}"><small>vallasisene kolimine elanikke ei lisa</small></div>
      <div class="f"><label for="hiCL">Lasteaiakohti</label><input type="number" id="hiCL" data-k="capLa" placeholder="${f0(cap.la)}" value="${HI.capLa}"></div>
      <div class="f"><label for="hiCS">Koolikohti</label><input type="number" id="hiCS" data-k="capSc" placeholder="${f0(cap.sc)}" value="${HI.capSc}"></div></div></details>
  </form><div id="hiR" class="k9sec"></div>`;
  $("#hiF").addEventListener("input", e => { const k = e.target.dataset.k; if (!k) return; HI[k] = e.target.value; if (k === "unit" || k === "type") secArendus(el); else hiResult(); });
  hiResult();
}
function hiResult() {
  const inp = hiInputs(), H = E.housingImpact(ctx, inp.unit, inp, params()), L = H.last, inv = H.cap.investLa + H.cap.investSc;
  const nst = L.dNet >= 0 ? "ok" : (L.dNetMarg != null && L.dNetMarg >= 0) ? "warn" : "crit";
  const cards = [{ st: "ok", k: "Uusi elanikke", big: f0(H.newcomers), txt: `2036: ${sg(L.dPop)} võrreldes arenduseta` },
    { st: capSt(H.cap.firstLa), k: "Lasteaialapsi, tipp " + H.peakLa.y, big: sg(H.peakLa.dLa), txt: H.cap.firstLa ? "kohti puudu alates " + H.cap.firstLa : "kohti jätkub" },
    { st: capSt(H.cap.firstSc), k: "Õpilasi, tipp " + H.peakSc.y, big: sg(H.peakSc.dSc), txt: H.cap.firstSc ? "kohti puudu alates " + H.cap.firstSc : "kohti jätkub" },
    { st: nst, k: "Eelarvele 2036, aastas", big: sg(L.dNet / 1000) + " tuh €", txt: L.dNetMarg != null ? `täiskuluga; piirkuluga ${sg(L.dNetMarg / 1000)} tuh €` : "täiskuluga" }];
  $("#hiR").innerHTML = `<div class="bcards">${cards.map(c => `<div class="bcard" data-st="${c.st}"><span class="kick">${c.k}</span><span class="glyph st ${c.st}">${GLY[c.st][0]} ${GLY[c.st][1]}</span><span class="big">${c.big}</span><span class="small">${c.txt}</span></div>`).join("")}</div>
  ${H.settlement && !H.settlement.hasSchool ? `<div class="callout"><span class="st warn">▲</span><span>${esc(H.settlement.name)}: põhikooli ei ole, umbes ${f0(H.peakSc.dPk)} õpilast vajab koolitransporti.</span></div>` : ""}
  ${inv ? `<div class="callout"><span class="st crit">■</span><span>Kohtade puudujäägi katmiseks on vaja investeerida umbes ${eur(inv)} ${rel("hinnang")}.</span></div>` : ""}
  <div class="g2"><div class="inst"><span class="kick">Lisanduv nõudlus</span><div class="chart" id="hiA2"></div>${legend([{ n: "õpilased", c: css("--a-work"), k: "d" }, { n: "lasteaialapsed", c: css("--a-kid"), k: "d" }])}</div>
  <div class="inst"><span class="kick">Eelarve 2036 · tuh € aastas</span><div class="chart" id="hiB2"></div><p class="note">Piirkulu = valla tegelik lisakulu üksiku arenduse puhul; täiskulu = keskmine kulu lapse kohta.</p></div></div>
  ${more("Täpsed väärtused aastate kaupa", table(["Aasta", "Lisandub", "Rahvaarv", "Lasteaed", "Kool", "Tulumaks", "Tasandusfond", "Täiskulu", "Piirkulu", "Neto"], H.rows.filter(r => r.y > 2026).map(r => [r.y, r.added ? f0(r.added) : "–", sg(r.dPop), sg(r.dLa), sg(r.dSc), sg(r.dTaxR / 1000), sg(-r.dTf / 1000), sg(-r.dCost / 1000), r.dCostMarg != null ? sg(-r.dCostMarg / 1000) : '<span class="missing">puudub</span>', sg(r.dNet / 1000)])) + `<p class="note">Rahasummad tuh € aastas.</p>`)}
  ${more("Kuidas see on arvutatud", `<p class="note">Tulumaks on 2026. aasta palgatasemel ${rel("tuletatud")}. Kulud on 2023–2025 ühikukulu järgi (${esc(H.ucSrc)}) ${rel("tuletatud")}; eelarve mõju on suurusjärk. Uute elanike vanusejaotus on pere sisserände profiil, laste osa × ${H.childScale.toFixed(2).replace(".", ",")} ${rel("hinnang")}. Tasandusfondist kaob ${Math.round(H.tf.share * 100)}% lisanduvast tulumaksust${H.tf.cap != null ? ", kõige rohkem " + eur(H.tf.cap) + " aastas" : ""}. Tööl Tallinnas 2036: ${sg(L.dTln)} (REL 2021). Haridusandmed: ${esc(H.eduSrc)}. Tulumaks: ${esc(H.taxSrc)}.</p>`)}
  ${meta("TwinEngine housingImpact", csvBtn("hi", "elamuarendus_" + inp.unit + ".csv", ["aasta", "lisandub", "rahvaarv", "lasteaed", "kool", "tulumaks_eur", "tasandusfond_eur", "taiskulu_eur", "piirkulu_eur", "neto_eur"], H.rows.filter(r => r.y > 2026).map(r => [r.y, r.added || 0, r.dPop, r.dLa, r.dSc, r.dTaxR, -r.dTf, -r.dCost, r.dCostMarg != null ? -r.dCostMarg : "", r.dNet])))}`;
  impactCharts(H, "#hiA2", "#hiB2");
}
/* =============== 6. Stsenaariumid =============== */
const SCN_DEF = () => [{ name: "A: praegune suund", mig: "mean", extra: 0, fert: 0, dp: false, n: 0, type: "korter", start: 2028, years: 2, capLa: "", capSc: "" },
  { name: "B: planeeringud ellu", mig: "mean", extra: 0, fert: 0, dp: true, n: 0, type: "korter", start: 2028, years: 2, capLa: "", capSc: "" },
  { name: "C: kiire kasv", mig: "r2", extra: 50, fert: 0, dp: true, n: 120, type: "korter", start: 2028, years: 2, capLa: "", capSc: "" }];
const SLOG = [];
function secToolaud(el) {
  const vid = formUnit(), SC = LS.get("scen:" + vid, SCN_DEF()), cols = [css("--ink"), css("--a-work"), css("--loss")], nDp = dpDevs(vid).length;
  const run = sc => E.scenarioRun(ctx, vid, { name: sc.name, params: { mig: sc.mig, extra: +sc.extra || 0, fert: +sc.fert || 0 }, devs: (sc.dp ? dpDevs(vid) : []).concat(+sc.n > 0 ? [{ n: +sc.n, type: sc.type, start: +sc.start, years: +sc.years }] : []), capLa: sc.capLa !== "" ? +sc.capLa : null, capSc: sc.capSc !== "" ? +sc.capSc : null });
  const RS = SC.map(run), best = RS.reduce((m, r, i) => r.last.pop > RS[m].last.pop ? i : m, 0), worst = RS.reduce((m, r, i) => r.last.pop < RS[m].last.pop ? i : m, 0);
  const fld = (i, k, lab, inp) => `<div class="f"><label for="sc${i}${k}">${lab}</label>${inp}</div>`;
  el.innerHTML = `${ttl(`Stsenaariumide töölaud · ${esc(ctx.units[vid].name)}${isAgg(S.unit) ? " (töölaud arvutab ühe valla kohta)" : ""}`, `Rahvaarv 2036: ${esc(SC[worst].name.split(":")[0])} ${f0(RS[worst].last.pop)} kuni ${esc(SC[best].name.split(":")[0])} ${f0(RS[best].last.pop)}; vahe ${f0(RS[best].last.pop - RS[worst].last.pop)} elanikku`, "h2")}
  <div class="g3">${SC.map((sc, i) => `<form class="panel form" data-i="${i}" onsubmit="return false" style="border-top:4px solid ${cols[i]};grid-template-columns:1fr 1fr">
    <div class="f" style="grid-column:1/-1"><label for="sc${i}name">Nimi</label><input type="text" id="sc${i}name" data-k="name" value="${esc(sc.name)}"></div>
    ${fld(i, "mig", "Rändemuster", `<select id="sc${i}mig" data-k="mig">${Object.entries(MIGN()).map(([k, v]) => `<option value="${k}" ${k === sc.mig ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`)}
    ${fld(i, "extra", "Lisaränne, in/a", `<input type="number" id="sc${i}extra" data-k="extra" step="10" value="${sc.extra}">`)}
    ${fld(i, "fert", "Sündimus, %", `<input type="number" id="sc${i}fert" data-k="fert" step="5" value="${sc.fert}">`)}
    <div class="f"><label style="display:flex;gap:6px;align-items:center;color:var(--ink)"><input type="checkbox" data-k="dp" ${sc.dp ? "checked" : ""} style="width:auto"> Planeeringud (${nDp})</label></div>
    ${fld(i, "n", "Lisaarendus, eluruume", `<input type="number" id="sc${i}n" data-k="n" step="10" value="${sc.n}">`)}
    ${fld(i, "type", "Tüüp", `<select id="sc${i}type" data-k="type">${["korter", "ridaelamu", "eramu"].map(t => `<option ${t === sc.type ? "selected" : ""}>${t}</option>`).join("")}</select>`)}
    ${fld(i, "capLa", "Lasteaiakohti", `<input type="number" id="sc${i}capLa" data-k="capLa" placeholder="${f0(E.capOf(ctx, vid).la)}" value="${sc.capLa}">`)}
    ${fld(i, "capSc", "Koolikohti", `<input type="number" id="sc${i}capSc" data-k="capSc" placeholder="${f0(E.capOf(ctx, vid).sc)}" value="${sc.capSc}">`)}
  </form>`).join("")}</div>
  <div class="g2"><div class="inst"><span class="kick">Rahvaarv</span><div class="chart" id="scP"></div>${legend(SC.map((sc, i) => ({ n: sc.name, c: cols[i], k: "d" })))}</div>
  <div class="inst"><span class="kick">Õpilased (pidev) ja lasteaialapsed (katkend) vs kohad</span><div class="chart" id="scE"></div></div></div>
  <div class="panel">${ttl("Võrdlus 2036", "Põhinäitajad kõrvuti")}<div class="chart" id="scC"></div>
  ${SLOG.length ? `<span class="kick">Muudatuste logi</span><div class="k9log">${SLOG.map(x => `<span>${x}</span>`).join("")}</div>` : ""}</div>
  ${more("Täpsed väärtused", table(["Stsenaarium", "Rahvaarv 2036", "Uusi elanikke arendustest", "Arengukava siht", "Lasteaed / kohti", "Kool / kohti", "Investeering", "Tulumaks 2036"], RS.map((r, i) => [esc(SC[i].name), f0(r.last.pop), f0(r.newcomers), r.target ? Math.round(r.target.share * 100) + "% sihist" : '<span class="missing">puudub</span>', f0(r.last.la) + " / " + f0(r.last.capLa), f0(r.last.sc) + " / " + f0(r.last.capSc), eur(r.invest), eur(r.last.taxR)])))}
  <p class="note">Stsenaariumid salvestuvad ainult sinu brauserisse.</p>
  ${meta("TwinEngine scenarioRun", csvBtn("scen", "stsenaariumid_" + vid + ".csv", ["stsenaarium", "aasta", "rahvaarv", "lasteaed", "kool", "lasteaiakohad", "koolikohad", "tulumaks_eur"], RS.flatMap((r, i) => r.rows.map(x => [SC[i].name, x.y, x.pop, x.la, x.sc, x.capLa, x.capSc, x.taxR]))))}`;
  el.querySelectorAll("form[data-i]").forEach(f => f.addEventListener("change", e => { const i = +f.dataset.i, k = e.target.dataset.k; if (!k) return; const before = RS[i].last.pop; SC[i][k] = e.target.type === "checkbox" ? e.target.checked : e.target.value; LS.set("scen:" + vid, SC);
    const after = run(SC[i]).last.pop, now = new Date(); SLOG.unshift(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} ${esc(SC[i].name.split(":")[0])} · ${k} → ${esc(String(SC[i][k]))} · 2036 ${after >= before ? "▲" : "▼"} ${f0(after)}`); SLOG.length = Math.min(SLOG.length, 12); secToolaud(el); }));
  const T = RS[0].target;
  timeChart($("#scP"), { series: RS.map((r, i) => ({ name: SC[i].name, pts: r.rows.map(x => [x.y, x.pop]), color: cols[i], w: 2.4, dash: true, end: true })), refs: T ? [{ y: T.pop, x: T.year, label: "siht " + f0(T.pop), color: css("--loss") }] : [], h: 260, desc: RS.map((r, i) => `${SC[i].name}: 2036 ${f0(r.last.pop)}`).join("; ") });
  timeChart($("#scE"), { series: RS.flatMap((r, i) => [{ name: SC[i].name.split(":")[0] + " kool", pts: r.rows.map(x => [x.y, x.sc]), color: cols[i], w: 2 }, { name: SC[i].name.split(":")[0] + " lasteaed", pts: r.rows.map(x => [x.y, x.la]), color: cols[i], w: 1.6, dash: true }]), refs: [{ y: RS[0].last.capSc, label: "koolikohti " + f0(RS[0].last.capSc), color: css("--ref"), left: true }, { y: RS[0].last.capLa, label: "lasteaiakohti " + f0(RS[0].last.capLa), color: css("--ref"), left: true }], y0: 0, h: 260, desc: "Haridusnõudlus stsenaariumide kaupa" });
  const metrics = [["Rahvaarv", r => r.last.pop, f0], ["Õpilasi", r => r.last.sc, f0], ["Lasteaialapsi", r => r.last.la, f0], ["Tulumaks, mln €", r => r.last.taxR / 1e6, v => v.toFixed(2).replace(".", ",")], ["Investeering, mln €", r => r.invest / 1e6, v => v.toFixed(2).replace(".", ",")]];
  const box = $("#scC"), W = W_(box), lw = Math.min(150, W * .32), bh = 12, gh = RS.length * (bh + 3) + 12, Hh = metrics.length * gh + 6; let g = "";
  metrics.forEach(([lab, f, fm], j) => { const vs = RS.map(f), mx = Math.max(...vs.map(Math.abs)) || 1, y0 = 4 + j * gh; g += `<text x="${lw}" y="${y0 + gh / 2}" text-anchor="end" class="t-lab">${lab}</text>`;
    vs.forEach((v, i) => { const w = (W - lw - 90) * Math.abs(v) / mx, y = y0 + i * (bh + 3); g += `<rect x="${lw + 10}" y="${y}" width="${Math.max(1.5, w)}" height="${bh}" rx="2" fill="${cols[i]}" opacity=".85" data-tip="${esc(`<b>${esc(SC[i].name)}</b><br>${lab}: ${fm(v)}`)}"/><text x="${lw + 16 + w}" y="${y + bh - 2}" style="font-size:10.5px">${fm(v)}</text>`; }); });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Stsenaariumide võrdlus 2036">${g}</svg>`;
}

/* =============== 7. Otsused =============== */
const OT = { type: "elamu", unit: null, kind: "la", delta: 40, year: 2028, target: null, tyear: 2035 };
function secEelhinnang(el) {
  const id = OT.unit || formUnit(); OT.unit = id; const u = ctx.units[id];
  if (OT.target == null || OT.lastUnit !== id) { OT.target = u.target ? u.target.pop : Math.round(popAt(id, 2026) * 1.1 / 100) * 100; OT.lastUnit = id; }
  let form = "";
  if (OT.type === "elamu") form = `<p class="small mut">${f0(HI.n)} eluruumi, ${HI.type}, asustamine ${HI.start}–${+HI.start + +HI.years - 1}${HI.settlement ? ", " + esc(HI.settlement) : ""} · <a href="#planeeringud/arendus">muuda arendust</a></p>`;
  if (OT.type === "kohad") form = `<form class="form" id="otF" onsubmit="return false"><div class="f"><label for="otK">Asutus</label><select id="otK" data-k="kind"><option value="la" ${OT.kind === "la" ? "selected" : ""}>lasteaed</option><option value="sc" ${OT.kind === "sc" ? "selected" : ""}>kool</option></select></div>
    <div class="f"><label for="otD">Kohtade muutus</label><input type="number" id="otD" data-k="delta" step="10" value="${OT.delta}"><small>negatiivne = vähendamine</small></div><div class="f"><label for="otY">Alates aastast</label><input type="number" id="otY" data-k="year" min="2027" max="2036" value="${OT.year}"></div></form>`;
  if (OT.type === "siht") form = `<form class="form" id="otF" onsubmit="return false"><div class="f"><label for="otT">Rahvaarvu siht</label><input type="number" id="otT" data-k="target" step="100" value="${OT.target}"></div><div class="f"><label for="otTy">Sihtaasta</label><input type="number" id="otTy" data-k="tyear" min="2028" max="2036" value="${OT.tyear}"></div></form>`;
  el.innerHTML = `${ttl("Otsuse mõju eelhinnang", "Vali otsus: kaksik arvutab mõjud ja kirjutab seletuskirja mõjude lõigu mustandi", "h2")}
  <div class="panel"><div style="display:flex;flex-wrap:wrap;gap:10px 18px;align-items:end"><div class="f" style="min-width:180px"><label for="otU">Omavalitsus</label><select id="otU">${D.kov.units.map(x => `<option value="${x.id}" ${x.id === id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
    <div class="f"><label>Otsuse liik</label><div class="tabs" id="otTabs" role="group" aria-label="Otsuse liik">${[["elamu", "Elamuarendus / detailplaneering"], ["kohad", "Lasteaia- või koolikohtade muutus"], ["siht", "Arengukava rahvaarvu siht"]].map(([k, t]) => `<button type="button" data-t="${k}" aria-pressed="${OT.type === k}">${t}</button>`).join("")}</div></div></div>${form}</div>
  <div id="otR" class="k9sec"></div>`;
  $("#otTabs").onclick = e => { const b = e.target.closest("button"); if (b) { OT.type = b.dataset.t; secEelhinnang(el); } };
  $("#otU").onchange = e => { OT.unit = e.target.value; HI.unit = e.target.value; secEelhinnang(el); };
  const f = $("#otF"); if (f) f.addEventListener("input", e => { const k = e.target.dataset.k; if (k) { OT[k] = e.target.type === "number" ? +e.target.value : e.target.value; otResult(); } });
  otResult();
}
function otResult() {
  const id = OT.unit, u = ctx.units[id]; let R;
  try {
    if (OT.type === "elamu") { const inp = hiInputs(); inp.unit = id; if (HI.unit !== id) inp.settlement = null; R = E.decision(ctx, "elamu", inp, params()); }
    if (OT.type === "kohad") R = E.decision(ctx, "kohad", { unit: id, kind: OT.kind, delta: OT.delta, year: OT.year, cap: CAP[id] ? CAP[id][OT.kind] : null }, params());
    if (OT.type === "siht") R = E.decision(ctx, "siht", { unit: id, target: OT.target, year: OT.tyear }, params());
  } catch (err) { $("#otR").innerHTML = `<div class="err">Arvutus ebaõnnestus: ${esc(err.message)}</div>`; return; }
  let head = "", draw = () => {};
  if (OT.type === "elamu") { const H = R.H, L = H.last;
    head = `${ttl("Mõju", `${sg(L.dPop)} elanikku aastaks 2036; eelarvele ${sg(L.dNet / 1000)} tuh € aastas täiskuluga${L.dNetMarg != null ? `, ${sg(L.dNetMarg / 1000)} piirkuluga` : ""}`, "h2")}<div class="g2"><div class="inst"><div class="chart" id="otA"></div>${legend([{ n: "õpilased", c: css("--a-work"), k: "d" }, { n: "lasteaialapsed", c: css("--a-kid"), k: "d" }])}</div><div class="inst"><div class="chart" id="otB"></div></div></div>`;
    draw = () => impactCharts(H, "#otA", "#otB"); }
  if (OT.type === "kohad") { const Y = R.yrs, end = Y[Y.length - 1], k = OT.kind === "la" ? "Lasteaed" : "Kool";
    head = `${ttl(`${k} · nõudlus ja kohad`, `Täituvus ${end.y}: ${Math.round(end.util * 100)}%${end.util > 1 ? ", puudu " + f0(end.dem - end.cap) + " kohta" : end.util < .85 ? ", vabu " + f0(end.cap - end.dem) + " kohta" : ""}`, "h2")}<div class="inst"><div class="chart" id="otA"></div>${legend([{ n: "nõudlus (prognoos)", c: css("--a-work"), k: "d" }, { n: "kohad pärast otsust", c: css("--ref") }])}</div>`;
    draw = () => timeChart($("#otA"), { series: [{ name: "kohad", pts: Y.map(r => [r.y, r.cap]), color: css("--ref"), w: 2.2 }, { name: "nõudlus", pts: Y.map(r => [r.y, r.dem]), color: css("--a-work"), w: 2.6, dash: true, end: true }], y0: 0, h: 240, desc: `${k}: kohti ${f0(Y[0].cap)} → ${f0(end.cap)}, nõudlus ${f0(Y[0].dem)} → ${f0(end.dem)}` }); }
  if (OT.type === "siht") { const need = R.need, y = OT.tyear, b = popSeries(id), w = isFinite(need) && need > 0 ? popSeries(id, { ...params(), vx: need }) : null;
    head = `${ttl(`Rahvaarv ja siht ${f0(OT.target)} (${y})`, need === 0 ? "Siht täitub ilma lisarändeta" : isFinite(need) ? `Sihini jõudmiseks on vaja ${sg(need)} elanikku aastas lisarännet (≈ ${f0(need / 2.4)} eluruumi aastas)` : "Siht ei ole realistlik: vaja oleks üle 4000 inimese aastas", "h2")}<div class="inst"><div class="chart" id="otA"></div>${legend([{ n: "valitud stsenaarium", c: css("--a-work"), k: "d" }].concat(w ? [{ n: "koos vajaliku lisarändega", c: css("--loss"), k: "d" }] : []))}</div>`;
    draw = () => timeChart($("#otA"), { series: [{ name: "valitud", pts: b, color: css("--a-work"), w: 2.6, dash: true, end: true }].concat(w ? [{ name: "lisarändega", pts: w, color: css("--loss"), w: 2.2, dash: true, end: true }] : []), refs: [{ y: OT.target, x: y, label: `siht ${f0(OT.target)} · ${y}`, color: css("--loss") }], h: 260, desc: `${u.name}: siht ${f0(OT.target)}` }); }
  $("#otR").innerHTML = `${head}
  ${table(["Valdkond", "Praegu", "Mõju", "Selgitus"], R.rows.map(r => [`<b>${esc(r.area)}</b>`, esc(r.now), esc(r.effect), `<span class="mut small">${esc(r.note)}</span>`]), 9)}
  <div class="panel"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><h3>Seletuskirja mõjude lõik (mustand)</h3><button class="btn" id="cpB" type="button">Kopeeri tekst</button></div>
  <div class="kysi-a" id="otTx">${esc(R.text)}</div><p class="note">Mustand. Ametnik vaatab teksti üle ja vastutab selle eest; arvud on kaksiku mootorist.</p></div>
  ${meta("TwinEngine decision")}`;
  draw();
  $("#cpB").onclick = async () => { const b = $("#cpB"); try { await navigator.clipboard.writeText($("#otTx").textContent); b.textContent = "Kopeeritud"; } catch (e) { const r = document.createRange(); r.selectNodeContents($("#otTx")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Tekst valitud, vajuta Ctrl+C"; } setTimeout(() => b.textContent = "Kopeeri tekst", 2200); };
}

/* =============== 8. Liikuvus =============== */
function secToo(el) {
  const cats = [["same", "sama vald", css("--a-work")], ["tln", "Tallinn", css("--loss")], ["oth", "muu Eesti", css("--ref")], ["abr", "välismaa", css("--a-kid")]];
  const C = id => { const c = D.ext.COM[id]; return { same: c.same, tln: c.tln, abr: c.abr, oth: c.t - c.same - c.tln - c.abr, t: c.t }; };
  const id = formUnit(), ord = D.kov.units.slice().sort((a, b) => C(b.id).tln / C(b.id).t - C(a.id).tln / C(a.id).t), ck = C(id);
  el.innerHTML = `${ttl("Kus hõivatud elanikud töötavad · rahvaloendus 2021", `${esc(ctx.units[id].short)}: Tallinnas töötab ${Math.round(ck.tln / ck.t * 100)}%, oma vallas ${Math.round(ck.same / ck.t * 100)}%`, "h2")}
  <div class="inst"><div class="chart" id="toC"></div>${legend(cats.map(([, n, c]) => ({ n, c, k: "b" })))}</div>
  ${more("Täpsed väärtused", table(["Omavalitsus", "Hõivatuid", "Sama vald", "Tallinn", "Muu Eesti", "Välismaa"], ord.map(u => { const c = C(u.id); return [esc(u.name), f0(c.t), f0(c.same), f0(c.tln), f0(c.oth), f0(c.abr)]; })))}
  ${meta("Statistikaamet RL21163 " + rel("ametlik"))}`;
  stack($("#toC"), ord.map(u => { const c = C(u.id); return { label: u.short + (u.id === id ? " ◂" : ""), parts: cats.map(([k, n, col]) => ({ v: c[k], color: col, name: n, op: u.id === id ? .95 : .55 })), txt: Math.round(c.tln / c.t * 100) + "% Tln" }; }), { pct: true, lw: 90, rw: 70, desc: "Töökoha asukoht omavalitsuste kaupa" });
}
function secYt(el) {
  const id = formUnit(), TR = D.transit.rows.filter(r => r[1] === id);
  if (!TR.length) { el.innerHTML = ttl(esc(ctx.units[id].name), "Ühistranspordi andmeid ei ole", "h2") + `<p class="note"><span class="missing">puudub</span> · Kohila ja Rae kohta on andmed olemas.</p>`; return; }
  el.innerHTML = `${ttl(`Ühistransport tööpäeval · ${esc(ctx.units[id].name)} · GTFS ${esc(D.transit.date)}`, `${TR.filter(r => r[4] > 0).length} asulast ${TR.length}-st on otseühendus Tallinna kesklinna; ${TR.filter(r => r[3] < 10).length} asulas alla 10 väljumise päevas`, "h2")}
  <div class="inst"><div class="chart" id="ytC"></div>${legend([{ n: "10 või rohkem väljumist", c: css("--a-work"), k: "b" }, { n: "alla 10 väljumise", c: css("--loss"), k: "b" }])}<p class="note">Lävend 10 väljumist päevas on kaksiku kokkulepe (umbes iga 1,5 tunni järel).</p></div>
  ${more("Täpsed väärtused", table(["Asula", "Peatusi", "Väljumisi", "Otse Tallinna kesklinna", "Tallinnas kl 7–9", "Kiireim, min", "Otse vallakeskusesse", "Kiireim, min"], TR.map(r => [esc(r[0]), r[2], r[3], r[4], r[5], r[6] == null ? '<span class="missing">puudub</span>' : r[6], r[7], r[8] == null ? '<span class="missing">puudub</span>' : r[8]])))}
  ${more("Kuidas see on arvutatud", `<p class="note">${esc(D.transit._doc)}</p>`)}
  ${meta("Transpordiamet GTFS · © OpenStreetMap")}`;
  bars($("#ytC"), TR.slice().sort((x, y) => y[3] - x[3]).slice(0, 25).map(r => ({ label: r[0], v: r[3], txt: `${r[3]} · Tln ${r[4]}${r[6] != null ? " · " + r[6] + " min" : ""}`, color: r[3] < 10 ? css("--loss") : css("--a-work") })), { lw: 110, rw: 150, fmt: f0, desc: "Väljumisi päevas asulate kaupa" });
}
function secKoolitee(el) {
  const id = formUnit(), A = E.schoolAccess(ctx, id, proj(id), 2026), A36 = E.schoolAccess(ctx, id, proj(id), 2036);
  if (!A) { el.innerHTML = ttl(esc(ctx.units[id].name), "Asulate andmeid ei ole", "h2"); return; }
  const nos = A.rows.map((r, i) => ({ r, r36: A36.rows[i] })).filter(x => !x.r.school).sort((a, b) => b.r36.pk - a.r36.pk);
  el.innerHTML = `${ttl("Koolitee · põhikooliealised asulates, kus põhikooli ei ole", `${esc(ctx.units[id].short)}: ${f0(A.pkOut)} last 2026 (${Math.round(A.share * 100)}%), ${f0(A36.pkOut)} aastal 2036`, "h2")}
  <div class="inst"><div class="chart" id="ktC"></div>${legend([{ n: "2026", c: css("--ref"), k: "b" }, { n: "2036 (prognoos)", c: css("--a-kid"), k: "b" }])}</div>
  ${more("Täpsed väärtused", table(["Asula", "Põhikool", "2026", "2036"], A.rows.map((r, i) => [esc(r.n), r.school ? "on" : r.other ? "osaliselt" : "ei ole", f0(r.pk), f0(A36.rows[i].pk)]), 2))}
  ${more("Kuidas see on arvutatud", `<p class="note">Ülemine hinnang ${rel("hinnang")}: osa õpilasi käib teise valla või erakoolis ja osa koolita asulatest asub kooli lähedal. Koondrida „Muud külad” loetakse koolita asulaks.${D.edu.schoolNotes[id] ? " " + esc(D.edu.schoolNotes[id]) : ""}</p>`)}
  ${meta("REL 2021 · EHIS · TwinEngine schoolAccess")}`;
  const box = $("#ktC"), W = W_(box), lw = 140, rh = 28, Hh = 6 + nos.length * rh + 4, mx = Math.max(1, ...nos.map(x => Math.max(x.r.pk, x.r36.pk))), X = v => lw + 10 + v / mx * (W - lw - 10 - 100);
  let g = ""; nos.forEach((x, i) => { const y = 6 + i * rh + rh / 2, tip = esc(`<b>${esc(x.r.n)}</b><br>2026: ${f0(x.r.pk)} · 2036: ${f0(x.r36.pk)}`);
    g += `<text x="${lw}" y="${y + 4}" text-anchor="end" class="t-lab">${esc(x.r.n)}</text><line x1="${X(Math.min(x.r.pk, x.r36.pk))}" x2="${X(Math.max(x.r.pk, x.r36.pk))}" y1="${y}" y2="${y}" stroke="${css("--line2")}" stroke-width="3"/><circle cx="${X(x.r.pk)}" cy="${y}" r="5.5" fill="${css("--ref")}" data-tip="${tip}"/><circle cx="${X(x.r36.pk)}" cy="${y}" r="5.5" fill="${css("--surf")}" stroke="${css("--a-kid")}" stroke-width="2.5" data-tip="${tip}"/><text x="${W - 4}" y="${y + 4}" text-anchor="end" class="t-lab">${f0(x.r.pk)} → ${f0(x.r36.pk)}</text>`; });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Põhikooliealised koolita asulates 2026 ja 2036">${g}</svg>`;
}

/* =============== 9. Küsi kaksikult =============== */
let SAMPLE = null, SAMPLE_TRIED = false;
const KYSI = { log: [] };
function kysiTools() {
  const r1 = v => Math.round(v * 10) / 10;
  return [
    { name: "rahvastik", description: "Rahvaarv ja vanuserühmad omavalitsuses 2026, 2031, 2036 valitud rändemustriga. Sisend: omavalitsus (Rapla, Kohila, Marjamaa, Kehtna, Rae, MAAK), muster (r1, mean, r2, r2x, r3).", inputSchema: { type: "object", properties: { omavalitsus: { type: "string" }, muster: { type: "string" } } },
      execute: i => { const id = ctx.units[i.omavalitsus] || ctx.aggregates[i.omavalitsus] ? i.omavalitsus : S.unit, m = MIGN()[i.muster] ? i.muster : S.mig, out = {}; [2026, 2031, 2036].forEach(y => { const a = ageAt(id, y, { ...params(), mig: m }); out[y] = { kokku: Math.round(E.total(a)), "0-14": Math.round(E.sumG(a, 0, 2)), "15-64": Math.round(E.sumG(a, 3, 12)), "65+": Math.round(E.sumG(a, 13, 17)) }; }); return { omavalitsus: id, muster: MIGN()[m], aastad: out }; } },
    { name: "eesmargid", description: "Arengukava mõõdetavate eesmärkide seis: valitud stsenaariumi väärtus, % sihist, mitmes rändemustris täitub.", inputSchema: { type: "object", properties: { omavalitsus: { type: "string" } } },
      execute: i => E.goalsEval(ctx, ctx.units[i.omavalitsus] || ctx.aggregates[i.omavalitsus] ? i.omavalitsus : S.unit, params()).map(g => ({ eesmark: g.label, liik: g.liik, valitud: r1(g.sel), protsent_sihist: Math.round(g.share * 100), taitub_mustrites: g.meet + "/" + g.n, seis: g.st })) },
    { name: "haridus", description: "Lasteaia- ja koolinõudlus ning kohtade arv 2026–2036.", inputSchema: { type: "object", properties: { omavalitsus: { type: "string" } } },
      execute: i => { const id = ctx.units[i.omavalitsus] ? i.omavalitsus : formUnit(), I = invOf(id); return { omavalitsus: id, lasteaiakohti: Math.round(I.capLa), koolikohti: Math.round(I.capSc), puudu_lasteaed_alates: I.firstLa, puudu_kool_alates: I.firstSc, aastad: I.rows.filter(r => [2026, 2030, 2036].includes(r.y)).map(r => ({ aasta: r.y, lasteaed: Math.round(r.la), kool: Math.round(r.sc) })) }; } },
    { name: "arendus", description: "Elamuarenduse mõju: uued elanikud, lapsed, eelarve 2036 (täiskulu ja piirkulu).", inputSchema: { type: "object", properties: { omavalitsus: { type: "string" }, eluruume: { type: "number" }, tyyp: { type: "string", enum: ["korter", "ridaelamu", "eramu"] }, algus: { type: "number" } }, required: ["eluruume"] },
      execute: i => { const id = ctx.units[i.omavalitsus] ? i.omavalitsus : formUnit(), H = E.housingImpact(ctx, id, { n: +i.eluruume, type: i.tyyp || "korter", start: +i.algus || 2028, years: 2 }, params()); return { uusi_elanikke: Math.round(H.newcomers), rahvaarv_2036_lisandub: Math.round(H.last.dPop), lasteaialapsi_tipp: Math.round(H.peakLa.dLa), opilasi_tipp: Math.round(H.peakSc.dSc), neto_2036_taiskulu_eur: Math.round(H.last.dNet), neto_2036_piirkulu_eur: H.last.dNetMarg != null ? Math.round(H.last.dNetMarg) : null, kohti_puudu_lasteaed: H.cap.firstLa, kohti_puudu_kool: H.cap.firstSc }; } },
    { name: "uhistransport", description: "Ühistranspordi otseühendused asula kaupa (tööpäev): väljumisi, otse Tallinna kesklinna, kiireim sõiduaeg.", inputSchema: { type: "object", properties: { asula: { type: "string" } } },
      execute: i => { const F = D.transit.fields, R = D.transit.rows.filter(r => !i.asula || r[0].toLowerCase().startsWith(String(i.asula).toLowerCase().slice(0, 4))); return R.slice(0, 15).map(r => Object.fromEntries(F.map((k, j) => [k, r[j]]))); } },
    { name: "planeeringud", description: "Menetluses detailplaneeringud planeeringukontrollist: nimi, asula, etapp, eluruumid.", inputSchema: { type: "object", properties: {} },
      execute: () => D.dp.rows.map(d => ({ nimi: d.name, asula: d.asula, etapp: d.stage, elamuehitus: d.housing, eluruumid: Object.keys(d.units).length ? d.units : "sisestamata" })) }
  ];
}
function secKysi(el) {
  if (!SAMPLE_TRIED && window.claude && typeof window.claude.use === "function") { SAMPLE_TRIED = true; window.claude.use("sample").then(x => { SAMPLE = x; secKysi(el); }).catch(() => {}); }
  const ex = ["Kas Kohila jõuab 10 000 elanikuni ja mida 200 korterit muudaks?", "Millistes Kohila asulates on kõige vähem bussiühendusi?", "Kas Rae koolikohtadest piisab aastani 2036?"];
  el.innerHTML = `${ttl("Küsi kaksikult · AI-analüütiku prototüüp", "Küsi tavakeeles: vastus tuleb ainult kaksiku arvutustest", "h2")}
  ${SAMPLE ? `<form id="kyF" class="panel" onsubmit="return false" style="flex-direction:row;flex-wrap:wrap;align-items:end"><div class="f" style="flex:1;min-width:220px"><label for="kyQ">Küsimus</label><input type="text" id="kyQ" placeholder="${esc(ex[0])}"></div><button class="btn" id="kyB" type="submit">Küsi</button></form>
    <div class="tabs" id="kyEx">${ex.map(q => `<button type="button">${esc(q)}</button>`).join("")}</div>`
  : `<div class="callout"><span class="st na">◇</span><span>Küsimustele vastamine töötab ainult Claude'i keskkonnas avatud lehel. Kaksiku muud osad töötavad ilma selleta.</span></div>`}
  <div class="k9sec" id="kyO">${KYSI.log.map(x => `<div class="detail"><b>${esc(x.q)}</b><div class="kysi-a">${esc(x.a)}</div>${x.tools ? `<span class="small dim">Kasutatud tööriistad: ${esc(x.tools)}</span>` : ""}</div>`).join("")}</div>
  ${use(["Kiire küsimus ilma menüüdes otsimata", "Mitme peatüki info ühes vastuses"], ["Ametlik vastus: kontrolli number vastavast peatükist", "Küsimused, mille kohta kaksikul andmeid ei ole"], ["Keelemudel ei arvuta ise: iga number tuleb tööriista vastusest", "Kui tööriist vastust ei anna, peab analüütik ütlema „ei tea”", `Valitud stsenaarium: ${scenTxt()}`])}
  ${meta("Tööriistad: rahvastik, eesmärgid, haridus, arendus, ühistransport, planeeringud")}`;
  if (!SAMPLE) return;
  $("#kyEx").onclick = e => { const b = e.target.closest("button"); if (b) { $("#kyQ").value = b.textContent; $("#kyF").requestSubmit(); } };
  $("#kyF").onsubmit = async e => { e.preventDefault(); const q = $("#kyQ").value.trim(); if (!q) return; const used = [], b = $("#kyB"); b.disabled = true; b.textContent = "Arvutan…";
    const tools = kysiTools().map(t => ({ ...t, execute: inp => { used.push(t.name); return t.execute(inp || {}); } }));
    const sys = `Sa oled Kohila ja Rae valla digikaksiku analüütik. Vasta eesti keeles, lühidalt (kuni 6 lauset), lihtsas keeles vallaametnikule. KÕIK numbrid pead võtma tööriistade vastustest; ära arvuta, hinda ega oleta ise ühtegi numbrit. Kui tööriistad vastust ei anna, ütle "ei tea" ja mis andmed puuduvad. Nimeta, millise rändemustri või eelduse järgi number on. Vaikimisi omavalitsus: ${S.unit}, rändemuster: ${S.mig}.`;
    try { const r = await SAMPLE([{ role: "user", content: sys + "\n\nKüsimus: " + q }], { tools, modelTier: "default", cache: false }); KYSI.log.unshift({ q, a: r.text, tools: [...new Set(used)].join(", ") }); }
    catch (err) { KYSI.log.unshift({ q, a: err && err.code === "not_granted" ? "Analüütikut ei lubatud selles vaates kasutada." : "Vastust ei saanud (" + (err && (err.code || err.message)) + ").", tools: "" }); }
    secKysi(el); };
}
