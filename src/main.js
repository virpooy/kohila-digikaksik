/* Peatükid, marsruut (räsi #peatükk/jaotis), päis, käivitus. */
const CHS = [
  { v: "ylevaade", t: "Ülevaade", q: "Mis seis on?", c: ["#FFD966", "#9A7400"], sub: [["lyhivaade", "Lühivaade", secLyhivaade], ["kuidas", "Kuidas lugeda", secKuidas]] },
  { v: "kaart", t: "Kaart", q: "Kus asulad, koolid ja planeeringud asuvad?", c: ["#B9C45A", "#6B7A12"], sub: [["atlas", "Kaart", secKaart]] },
  { v: "eesmargid", t: "Eesmärgid", q: "Kas arengukava eesmärgid täituvad?", c: ["#FF8A5B", "#C2501F"], sub: [["seire", "Kõik eesmärgid", secSeire], ["siht", "Rahvaarvu siht", secSiht]] },
  { v: "rahvastik", t: "Rahvastik", q: "Kuidas rahvastik muutub?", c: ["#FF8FA3", "#C23B5A"], sub: [["rahvaarv", "Rahvaarv", secRahvaarv], ["vanus", "Vanuserühmad", secVanus], ["asulad", "Asulad", secAsulad]] },
  { v: "teenused", t: "Teenused", q: "Kas lasteaia- ja koolikohti jätkub?", c: ["#8FD0FF", "#1F6FB2"], sub: [["kohad", "Nõudlus ja kohad", secKohad], ["invest", "Investeering ja võlg", secInvest]] },
  { v: "planeeringud", t: "Planeeringud", q: "Mida planeeringud ja arendused muudavad?", c: ["#E08A3C", "#A85A14"], sub: [["dp", "Menetluses planeeringud", secDp], ["arendus", "Arenduse kalkulaator", secArendus]] },
  { v: "stsenaariumid", t: "Stsenaariumid", q: "Mis juhtub, kui …?", c: ["#BE8CF5", "#8A4FD1"], sub: [["toolaud", "Töölaud", secToolaud]] },
  { v: "otsused", t: "Otsused", q: "Mida otsus muudab?", c: ["#F3E2A6", "#7A6A1E"], sub: [["eelhinnang", "Mõju eelhinnang", secEelhinnang]] },
  { v: "liikuvus", t: "Liikuvus", q: "Kuidas elanikud liiguvad?", c: ["#9FB8F5", "#3E5BA9"], sub: [["too", "Töökohad", secToo], ["yt", "Ühistransport", secYt], ["koolitee", "Koolitee", secKoolitee]] },
  { v: "kysi", t: "Küsi kaksikult", q: "Mida tahad teada?", c: ["#7FD8D0", "#0E7C72"], sub: [["kysi", "Küsimus", secKysi]] },
  { v: "andmed", t: "Arendajale", q: "Kuidas mudel töötab ja kui täpne see on?", dev: true, c: ["#A3A4CC", "#5A5B8A"], sub: [["tapsus", "Täpsus", secTapsus], ["kasutus", "Lubadused ja kasutusjuhud", secKasutus], ["sonastik", "Andmesõnastik", secSonastik], ["mootor", "Mootor ja testid", secMootor], ["konf", "Konfiguratsioon", secKonf]] }
];
const R = { ch: "ylevaade", sec: "lyhivaade", all: false };
const theme = () => document.documentElement.dataset.theme === "light" ? 1 : 0;
const chCol = ch => ch.c[theme()];
function parseHash() {
  const [a, b] = location.hash.slice(1).split("/"), ch = CHS.find(c => c.v === a) || CHS[0];
  R.ch = ch.v; R.sec = (ch.sub.find(s => s[0] === b) || ch.sub[0])[0]; R.all = b === "koik";
}
function nav() {
  $("#nav").innerHTML = CHS.map(c => `${c.dev ? '<span class="sep" aria-hidden="true"></span>' : ""}<a href="#${c.v}" style="--ch:${chCol(c)}" ${c.v === R.ch ? 'aria-current="page"' : ""}><i></i>${c.t}</a>`).join("");
}
function render() {
  projCache.clear(); HATCH = 0;
  const ch = CHS.find(c => c.v === R.ch), i = ch.sub.findIndex(s => s[0] === R.sec), n = CHS.indexOf(ch);
  nav(); $("#scenBar").hidden = !!ch.dev;
  const subs = ch.sub.length > 1 ? `<nav class="k9sub" aria-label="Jaotised">${ch.sub.map(s => `<a href="#${ch.v}/${s[0]}" ${!R.all && s[0] === R.sec ? 'aria-current="true"' : ""}>${s[1]}</a>`).join("")}<a href="#${ch.v}/koik" ${R.all ? 'aria-current="true"' : ""}>näita kõiki</a></nav>` : "";
  const prev = !R.all && i > 0 ? ch.sub[i - 1] : null, next = !R.all && i < ch.sub.length - 1 ? ch.sub[i + 1] : null, nch = CHS[n + 1];
  $("#main").innerHTML = `<article class="k9ch" style="--ch:${chCol(ch)}"><header><span class="kick">${String(n + 1).padStart(2, "0")} · ${ch.t}${ch.dev ? " · arendajale" : ""}</span><h1>${ch.q}</h1>${subs}</header>
    ${ch.sub.map(s => `<section class="k9sec${R.all || s[0] === R.sec ? "" : " k9off"}" id="s-${s[0]}" aria-label="${esc(s[1])}"></section>`).join(R.all ? '<hr style="border:0;border-top:1px dashed var(--line);margin:24px 0">' : "")}
    <nav class="k9secnext" aria-label="Eelmine ja järgmine">${prev ? `<a href="#${ch.v}/${prev[0]}">← ${prev[1]}</a>` : "<span></span>"}${next ? `<a href="#${ch.v}/${next[0]}">${next[1]} →</a>` : nch ? `<a href="#${nch.v}">${nch.t}: ${nch.q} →</a>` : "<span></span>"}</nav></article>`;
  ch.sub.filter(s => R.all || s[0] === R.sec).forEach(s => { const el = $("#s-" + s[0]); try { s[2](el); } catch (e) { console.error(s[0], e); el.innerHTML = `<div class="err">Jaotise „${esc(s[1])}” arvutus ebaõnnestus: ${esc(e.message)}</div>`; } });
}
function header() {
  const opts = [...D.kov.aggregates, ...D.kov.units];
  $("#unitSeg").innerHTML = opts.map(u => `<button type="button" data-u="${u.id}" aria-pressed="${u.id === S.unit}" style="--c:var(--v-${u.id.toLowerCase()})"><i></i>${esc(u.short)}</button>`).join("");
  $("#unitSeg").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.unit = b.dataset.u; [...$("#unitSeg").children].forEach(x => x.setAttribute("aria-pressed", x.dataset.u === S.unit)); HI.unit = null; OT.unit = null; LS.set("unit", S.unit); render(); };
  $("#migSel").innerHTML = Object.entries(MIGN()).map(([k, v]) => `<option value="${k}" ${k === S.mig ? "selected" : ""}>${esc(v)}</option>`).join("");
  $("#migSel").onchange = e => { S.mig = e.target.value; render(); };
  $("#extraIn").onchange = e => { S.extra = +e.target.value || 0; render(); };
  $("#fertIn").oninput = e => { S.fert = +e.target.value; $("#fertOut").textContent = (S.fert > 0 ? "+" : S.fert < 0 ? "−" : "±") + Math.abs(S.fert) + "%"; };
  $("#fertIn").onchange = () => render();
  $("#themeBtn").onclick = () => { const t = theme() ? "dark" : "light"; document.documentElement.dataset.theme = t; try { localStorage.setItem("kaksik3:theme", t); } catch (e) {} render(); };
  const pass = TESTS.filter(t => t.ok).length;
  $("#brandSub").textContent = `Andmed ${DATA_DATE} · mootor ${E.VERSION.split(" ")[0]} · testid ${pass}/${TESTS.length}`;
}
async function boot() {
  try {
    const got = await Promise.all(FILES.map(f => fetch("data/" + f + ".json").then(r => { if (!r.ok) throw new Error("data/" + f + ".json: " + r.status); return r.json(); })));
    D = Object.fromEntries(FILES.map((f, i) => [f, got[i]]));
    ctx = E.build({ kov: D.kov, pop: D.pop, fin: D.fin, edu: D.edu, ext: D.ext, settlements: D.settlements });
    TESTS = E.selfTest(ctx, D.reference);
  } catch (err) { $("#main").innerHTML = `<div class="err">Andmefailide laadimine ebaõnnestus: ${esc(err.message)}. Värskenda lehte; kui viga jääb, on andmefail puudu.</div>`; console.error(err); return; }
  const u0 = LS.get("unit", null); if (u0 && (ctx.units[u0] || ctx.aggregates[u0])) S.unit = u0;
  header(); parseHash(); render();
  addEventListener("hashchange", () => { parseHash(); render(); scrollTo({ top: 0 }); const h = $(".k9ch h1"); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } });
  let t, w = innerWidth; addEventListener("resize", () => { if (Math.abs(innerWidth - w) < 40) return; w = innerWidth; clearTimeout(t); t = setTimeout(render, 250); });
}
boot();
