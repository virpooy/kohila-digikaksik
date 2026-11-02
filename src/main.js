/* Rühmad, marsruut (#rühm/jaotis?valikud), päis, mobiilimenüü, käivitus. Vanad süvalingid suunatakse uutesse kohtadesse. */
const CHS = [
  { v: "ylevaade", t: "Ülevaade", q: "Mis seis on ja kui kindel see on?", c: ["#FFD966", "#9A7400"], sub: [["lyhivaade", "Lühivaade", secLyhivaade], ["kindlus", "Andmete ajakohasus ja kindlus", secKindlus], ["kuidas", "Kuidas lugeda", secKuidas]] },
  { v: "kaart", t: "Kaart ja piirkonnad", q: "Kus inimesed elavad, kus on teenused ja kuidas liigutakse?", c: ["#B9C45A", "#6B7A12"], compact: true, noScen: ["too", "yt", "ligi"], sub: [["atlas", "Piirkonnad", secKaart], ["too", "Tööalased seosed", secMapToo], ["yt", "Ühistransport", secMapYt], ["ligi", "Ligipääs ja koolitee", secMapLigi]] },
  { v: "rahvastik", t: "Rahvastik ja teenused", q: "Kuidas rahvastik muutub ja kas kohti jätkub?", c: ["#FF8FA3", "#C23B5A"], sub: [["rahvaarv", "Rahvaarv", secRahvaarv], ["vanus", "Vanuserühmad", secVanus], ["asulad", "Asulad", secAsulad], ["kohad", "Lasteaia- ja koolikohad", secKohad], ["invest", "Investeering ja võlg", secInvest], ["seire", "Arengukava eesmärgid", secSeire], ["siht", "Rahvaarvu siht", secSiht]] },
  { v: "otsused", t: "Stsenaariumid ja otsused", q: "Mis juhtub, kui …, ja mida otsus muudab?", c: ["#BE8CF5", "#8A4FD1"], sub: [["toolaud", "Stsenaariumide töölaud", secToolaud], ["dp", "Planeeringud", secDp], ["arendus", "Arenduse kalkulaator", secArendus], ["eelhinnang", "Otsuse mõju eelhinnang", secEelhinnang], ["kysi", "Küsi kaksikult", secKysi]] },
  { v: "andmed", t: "Andmed ja metoodika", q: "Kust andmed tulevad, kuidas mudel töötab ja kui täpne see on?", dev: true, c: ["#A3A4CC", "#5A5B8A"], sub: [["allikad", "Allikad", secAllikad], ["tapsus", "Täpsus", secTapsus], ["sonastik", "Andmesõnastik", secSonastik], ["mootor", "Mootor ja testid", secMootor], ["kasutus", "Lubadused ja kasutusjuhud", secKasutus], ["konf", "Konfiguratsioon", secKonf]] }
];
/* vanad peatükid (kuni 01.11.2026) → uued */
const ALIAS = { eesmargid: "rahvastik/seire", teenused: "rahvastik/kohad", planeeringud: "otsused/dp", stsenaariumid: "otsused/toolaud", liikuvus: "kaart/too", kysi: "otsused/kysi", "liikuvus/koolitee": "kaart/ligi", "liikuvus/yt": "kaart/yt", "liikuvus/too": "kaart/too", "kaart/atlas": "kaart/atlas" };
const R = { ch: "ylevaade", sec: "lyhivaade", all: false };
const theme = () => document.documentElement.dataset.theme === "light" ? 1 : 0;
const chCol = ch => ch.c[theme()];
function parseHash() {
  const H = Logic.hashParse(location.hash); let a = H.a, b = H.b; const full = a + (b ? "/" + b : "");
  if (ALIAS[full]) [a, b] = ALIAS[full].split("/");
  else if (!CHS.find(c => c.v === a) && ALIAS[a]) { const [na, nb] = ALIAS[a].split("/"); a = na; if (!b || !CHS.find(c => c.sub.find(s => s[0] === b))) b = nb; }
  let ch = CHS.find(c => c.v === a);
  const owner = id => CHS.find(c => c.sub.find(s => s[0] === id));
  if (b && b !== "koik" && (!ch || !ch.sub.find(s => s[0] === b)) && owner(b)) ch = owner(b);
  if (!ch && owner(a)) { ch = owner(a); b = a; }
  ch = ch || CHS[0];
  R.ch = ch.v; R.sec = (ch.sub.find(s => s[0] === b) || ch.sub[0])[0]; R.all = b === "koik";
  const p = H.p; if (p.u && (ctx.units[p.u] || ctx.aggregates[p.u])) S.unit = p.u; if (p.m && MIGN()[p.m]) S.mig = p.m; if (p.x != null && p.x !== "") S.extra = +p.x || 0; if (p.f != null && p.f !== "") S.fert = +p.f || 0; if (+p.y >= 2026 && +p.y <= 2036) S.year = +p.y;
}
const stateParams = () => ({ u: S.unit, m: S.mig, x: S.extra, f: S.fert, y: S.year });
function syncHash() { const h = Logic.hashBuild(R.ch, R.all ? "koik" : R.sec, stateParams()); if (location.hash !== h) history.replaceState(null, "", h); syncHeader(); }
const link = (ch, sec) => Logic.hashBuild(ch, sec, stateParams());
function nav() {
  $("#nav").innerHTML = CHS.map(c => `${c.dev ? '<span class="sep" aria-hidden="true"></span>' : ""}<a href="${link(c.v)}" style="--ch:${chCol(c)}" ${c.v === R.ch ? 'aria-current="page"' : ""}><i></i>${c.t}</a>`).join("");
  $("#mnav").innerHTML = CHS.map(c => `<div class="mgrp" style="--ch:${chCol(c)}"><a href="${link(c.v)}" class="mg" ${c.v === R.ch ? 'aria-current="page"' : ""}><i></i>${c.t}</a>${c.sub.map(s => `<a href="${link(c.v, s[0])}" ${c.v === R.ch && s[0] === R.sec ? 'aria-current="true"' : ""}>${s[1]}</a>`).join("")}</div>`).join("");
}
function render() {
  projCache.clear(); HATCH = 0;
  const ch = CHS.find(c => c.v === R.ch), i = ch.sub.findIndex(s => s[0] === R.sec), n = CHS.indexOf(ch);
  syncHash(); nav(); $("#scenBar").hidden = !!ch.dev || (!R.all && (ch.noScen || []).includes(R.sec)); /* ajaloolised andmed ja sõiduplaan: stsenaarium ei rakendu */ $("#menuBtn").setAttribute("aria-expanded", "false"); $("#mnav").hidden = true;
  const subs = ch.sub.length > 1 ? `<nav class="k9sub" aria-label="Jaotised">${ch.sub.map(s => `<a href="${link(ch.v, s[0])}" ${!R.all && s[0] === R.sec ? 'aria-current="true"' : ""}>${s[1]}</a>`).join("")}<a href="${link(ch.v, "koik")}" ${R.all ? 'aria-current="true"' : ""}>näita kõiki</a></nav>` : "";
  const prev = !R.all && i > 0 ? ch.sub[i - 1] : null, next = !R.all && i < ch.sub.length - 1 ? ch.sub[i + 1] : null, nch = CHS[n + 1];
  $("#main").innerHTML = `<article class="k9ch${ch.compact ? " compact" : ""}" style="--ch:${chCol(ch)}"><header><span class="kick">${String(n + 1).padStart(2, "0")} · ${ch.t}</span><h1>${ch.q}</h1>${subs}</header>
    ${ch.sub.map(s => `<section class="k9sec${R.all || s[0] === R.sec ? "" : " k9off"}" id="s-${s[0]}" aria-label="${esc(s[1])}"></section>`).join(R.all ? '<hr style="border:0;border-top:1px dashed var(--line);margin:24px 0">' : "")}
    <nav class="k9secnext" aria-label="Eelmine ja järgmine">${prev ? `<a href="${link(ch.v, prev[0])}">← ${prev[1]}</a>` : "<span></span>"}${next ? `<a href="${link(ch.v, next[0])}">${next[1]} →</a>` : nch ? `<a href="${link(nch.v)}">${nch.t} →</a>` : "<span></span>"}</nav></article>`;
  ch.sub.filter(s => R.all || s[0] === R.sec).forEach(s => { const el = $("#s-" + s[0]); try { const r = s[2](el); if (r && r.catch) r.catch(e => { console.error(e); el.innerHTML = `<div class="err">Jaotise „${esc(s[1])}” laadimine ebaõnnestus: ${esc(e.message)}</div>`; }); } catch (e) { console.error(s[0], e); el.innerHTML = `<div class="err">Jaotise „${esc(s[1])}” arvutus ebaõnnestus: ${esc(e.message)}</div><button type="button" class="btn" onclick="location.reload()">Laadi uuesti</button>`; } });
}
function syncHeader() {
  [...$("#unitSeg").children].forEach(x => x.setAttribute("aria-pressed", x.dataset.u === S.unit)); $("#migSel").value = S.mig; $("#extraIn").value = S.extra; $("#fertIn").value = S.fert; $("#yearSel").value = S.year;
  $("#fertOut").textContent = (S.fert > 0 ? "+" : S.fert < 0 ? "−" : "±") + Math.abs(S.fert) + "%";
}
function header() {
  const opts = [...D.kov.aggregates, ...D.kov.units];
  $("#unitSeg").innerHTML = opts.map(u => `<button type="button" data-u="${u.id}" aria-pressed="${u.id === S.unit}" style="--c:var(--v-${u.id.toLowerCase()})"><i></i>${esc(u.short)}</button>`).join("");
  $("#unitSeg").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.unit = b.dataset.u; HI.unit = null; OT.unit = null; LS.set("unit", S.unit); render(); };
  $("#migSel").innerHTML = Object.entries(MIGN()).map(([k, v]) => `<option value="${k}" ${k === S.mig ? "selected" : ""}>${esc(v)}</option>`).join("");
  $("#yearSel").innerHTML = Array.from({ length: 10 }, (_, i) => 2027 + i).map(y => `<option ${y === S.year ? "selected" : ""}>${y}</option>`).join("");
  $("#migSel").onchange = e => { S.mig = e.target.value; render(); };
  $("#yearSel").onchange = e => { S.year = +e.target.value; render(); };
  $("#extraIn").onchange = e => { S.extra = +e.target.value || 0; render(); };
  $("#fertIn").oninput = e => { S.fert = +e.target.value; syncHeader(); };
  $("#fertIn").onchange = () => render();
  $("#themeBtn").onclick = () => { const t = theme() ? "dark" : "light"; document.documentElement.dataset.theme = t; try { localStorage.setItem("kaksik3:theme", t); } catch (e) {} render(); };
  $("#menuBtn").onclick = () => { const o = $("#mnav").hidden; $("#mnav").hidden = !o; $("#menuBtn").setAttribute("aria-expanded", String(o)); };
  $("#brandSub").textContent = "Kohila, Rae ja Raplamaa · avaandmed · mudel " + E.VERSION.split(" ")[0];
}
async function boot() {
  const fail = [];
  try {
    const got = await Promise.all(FILES.map(f => fetch("data/" + f + ".json").then(r => { if (!r.ok) throw new Error("data/" + f + ".json: " + r.status); return r.json(); }).catch(e => { if (f === "commute" || f === "transit") { fail.push(f); return null; } throw e; })));
    D = Object.fromEntries(FILES.map((f, i) => [f, got[i]]));
    ctx = E.build({ kov: D.kov, pop: D.pop, fin: D.fin, edu: D.edu, ext: D.ext, settlements: D.settlements });
    TESTS = E.selfTest(ctx, D.reference);
  } catch (err) { $("#main").innerHTML = `<div class="err">Andmefailide laadimine ebaõnnestus: ${esc(err.message)}. Kui viga jääb, on andmefail puudu.</div><button type="button" class="btn" id="bootRetry">Proovi uuesti</button>`; $("#bootRetry").onclick = () => { $("#main").innerHTML = `<div class="loading">Laadin…</div>`; boot(); }; console.error(err); return; }
  D.fail = fail;
  const u0 = LS.get("unit", null); if (u0 && (ctx.units[u0] || ctx.aggregates[u0])) S.unit = u0;
  header(); parseHash(); render();
  addEventListener("hashchange", () => { const was = R.ch + R.sec; parseHash(); if (was === R.ch + R.sec && !location.hash.includes("koik")) { syncHeader(); } render(); scrollTo({ top: 0 }); const h = $(".k9ch h1"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } });
  let t, w = innerWidth; addEventListener("resize", () => { if (Math.abs(innerWidth - w) < 40) return; w = innerWidth; clearTimeout(t); t = setTimeout(render, 250); });
}
boot();
