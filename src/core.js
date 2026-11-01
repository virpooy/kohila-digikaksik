/* Kohila digikaksik 3 · tuum: olek, andmed, vorming, marsruut, joonised.
   Põhimõtted (magistritöö P1–P18, docs/uuringud/tekst-ja-graafika.md, kov-rakendus-alus):
   leiupealkiri + joonis; tekst joonisel annotatsioonina; tabel ja metoodika <details> taga;
   siht = romb ja „% sihist”; prognoos katkendjoon, vahemik viirutus; seis = kuju + värv + sõna;
   igal arvul ühik, aasta ja päritolumärgis; puuduv = „puudub”. Kõik numbrid tulevad mootorist. */
"use strict";
const E = window.TwinEngine;
const FILES = ["kov", "pop", "fin", "edu", "ext", "settlements", "dictionary", "usecases", "reference", "geo", "transit", "dp", "commute"];
const S = { unit: "Kohila", mig: "mean", extra: 0, fert: 0, year: 2036 };
let D, ctx, TESTS;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

/* ---------- vorming (eesti) ---------- */
const f0 = v => v == null || !isFinite(v) ? "puudub" : E.fmt(v);
const sg = v => v == null || !isFinite(v) ? "puudub" : (Math.round(v) > 0 ? "+" : Math.round(v) < 0 ? "−" : "±") + E.fmt(Math.abs(v));
const pc = (v, d = 1) => v == null || !isFinite(v) ? "puudub" : (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v * 100).toFixed(d).replace(".", ",") + "%";
const pct = (v, d = 0) => (v * 100).toFixed(d).replace(".", ",") + "%";
const eur = v => v == null ? "puudub" : E.eurT(v);
const mln = v => (v / 1e6).toFixed(2).replace(".", ",") + " mln €";
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const rel = k => { const p = PROV[k] || PROV.hinnang; return `<span class="k9rel ${p[1]}" title="${esc(p[2])}">${p[0]} ${p[1]}</span>`; };
const GLY = { ok: ["●", "korras", "--ok"], warn: ["▲", "piiri peal", "--warn"], crit: ["■", "kriitiline", "--crit"], na: ["◇", "puudub", "--dim"] };
const stTag = (st, word) => `<span class="st ${st}">${GLY[st][0]} ${esc(word || GLY[st][1])}</span>`;

/* ---------- abi ---------- */
const isAgg = id => !!ctx.aggregates[id];
const UN = id => isAgg(id) ? ctx.aggregates[id] : ctx.units[id];
const unitColor = id => css("--v-" + String(id).toLowerCase().replace("marjamaa", "marjamaa").replace("maak", "maak")) || UN(id).color;
const params = () => ({ mig: S.mig, extra: S.extra, fert: S.fert });
const MIGN = () => D.kov.params.migPatterns;
const projCache = new Map();
function proj(id, p) { p = p || params(); const k = id + "|" + JSON.stringify(p); if (!projCache.has(k)) { projCache.set(k, isAgg(id) ? E.projectAgg(ctx, id, p) : E.project(ctx, id, p)); if (projCache.size > 400) projCache.clear(); } return projCache.get(k); }
const ageAt = (id, y, p) => y <= 2026 ? D.pop[id].age[String(y)] : proj(id, p)[y];
const popAt = (id, y, p) => E.total(ageAt(id, y, p));
function eduAt(id, y, p) { if (isAgg(id)) { const r = { la: 0, sc: 0, pk: 0 }; ctx.aggregates[id].members.forEach(m => { const d = E.eduDemand(ctx, m, ageAt(m, y, p)); r.la += d.la; r.sc += d.sc; r.pk += d.pk; }); return r; } return E.eduDemand(ctx, id, ageAt(id, y, p)); }
const formUnit = () => isAgg(S.unit) ? "Kohila" : S.unit;
const LS = { get(k, d) { try { const v = localStorage.getItem("kaksik3:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem("kaksik3:" + k, JSON.stringify(v)); } catch (e) {} } };

/* ---------- plokkide abifunktsioonid ---------- */
const ttl = (kick, h, tag = "h3") => `<div class="ttl"><span class="kick">${kick}</span><${tag}>${h}</${tag}></div>`;
const more = (title, inner, open) => `<details class="more"${open ? " open" : ""}><summary>${title}</summary><div class="in">${inner}</div></details>`;
const meta = (src, extra) => `<div class="meta"><span class="srcs">Allikad: ${Array.isArray(src) ? src.map(srcBtn).join(" ") : src} <span class="dim">· mootor ${esc(E.VERSION.split(" ")[0])}</span></span>${extra || ""}</div>`;
const legend = items => `<div class="legend">${items.map(i => `<span><i class="${i.k || ""}" style="--c:${i.c}"></i>${esc(i.n)}</span>`).join("")}</div>`;
const table = (head, rows, numFrom = 1) => `<div class="tw"><table><thead><tr>${head.map((h, i) => `<th${i >= numFrom ? ' class="n"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr${r.cls ? ` class="${r.cls}"` : ""}>${(r.cells || r).map((c, i) => `<td${i >= numFrom ? ' class="n"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const use = (ok, no, mind) => `<div class="k9use"><div style="--c:var(--ok)"><b>${GLY.ok[0]} Milleks sobib</b><ul>${ok.map(x => `<li>${x}</li>`).join("")}</ul></div><div style="--c:var(--crit)"><b>${GLY.crit[0]} Milleks ei sobi</b><ul>${no.map(x => `<li>${x}</li>`).join("")}</ul></div><div style="--c:var(--warn)"><b>${GLY.warn[0]} Pea meeles</b><ul>${mind.map(x => `<li>${x}</li>`).join("")}</ul></div></div>`;

/* ---------- CSV allalaadimine (artefaktis downloads-võimekus, mujal link) ---------- */
const CSV = {};
const csvBtn = (key, name, head, rows) => { CSV[key] = { name, text: [head].concat(rows).map(r => r.map(v => typeof v === "number" ? String(Math.round(v * 100) / 100).replace(".", ",") : '"' + String(v).replace(/"/g, '""') + '"').join(";")).join("\n") }; return `<button type="button" class="btn ghost sm" data-csv="${key}">Lae andmed alla (CSV)</button>`; };
let DL = null;
if (window.claude && typeof window.claude.use === "function") window.claude.use("downloads").then(d => { DL = d; }).catch(() => {});
async function dlText(name, text, mime, btn) {
  if (DL) { try { await DL.save({ filename: name, data: text }); return true; } catch (err) { if (btn && (!err || err.code !== "declined")) btn.textContent = "Allalaadimine pole siin saadaval"; return false; } }
  if (window.claude) { if (btn) btn.textContent = "Allalaadimine pole siin saadaval"; return false; }
  const url = URL.createObjectURL(new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" })), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); return true;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-csv]"); if (!b || !CSV[b.dataset.csv]) return;
  const c = CSV[b.dataset.csv]; dlText(c.name, "\ufeff" + c.text, "text/csv", b);
});

/* ---------- hõpikvihje (dataviz: hover vaikimisi) ---------- */
const TIP = { el: null };
document.addEventListener("pointermove", e => {
  const t = e.target.closest && e.target.closest("[data-tip]"), el = TIP.el || (TIP.el = $("#tip"));
  if (!el) return;
  if (!t) { el.style.display = "none"; return; }
  el.innerHTML = t.getAttribute("data-tip"); el.style.display = "block";
  const w = el.offsetWidth, h = el.offsetHeight; el.style.left = Math.min(innerWidth - w - 8, e.clientX + 14) + "px"; el.style.top = Math.max(8, e.clientY - h - 12) + "px";
});

/* ---------- joonised ---------- */
let HATCH = 0;
const hatchDef = col => { const id = "h" + (++HATCH); return [id, `<defs><pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${col}" opacity=".08"/><line x1="0" y1="0" x2="0" y2="6" stroke="${col}" stroke-width="1.2" opacity=".45"/></pattern></defs>`]; };
const rhomb = (x, y, r, fill, stroke) => `<path d="M${x},${y - r}L${x + r},${y}L${x},${y + r}L${x - r},${y}Z" fill="${fill}" stroke="${stroke || fill}" stroke-width="1.6"/>`;
const glyphMark = (st, x, y, c) => st === "ok" ? `<circle cx="${x}" cy="${y}" r="6.5" fill="${c}"/>` : st === "warn" ? `<path d="M${x},${y - 7}L${x + 7.5},${y + 6}L${x - 7.5},${y + 6}Z" fill="${c}"/>` : `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="${c}"/>`;
const W_ = el => Math.max(300, Math.round(el.clientWidth || el.parentElement.clientWidth || 640));

/* Ajajoonis k9: ajalugu pidev, prognoos katkendjoon, vahemik viirutus, „täna” õmblus, siht romb, lävend punktiir koos tähendusega.
   o = { series:[{name, pts:[[x,y]], color, w, dash, end, op}], band:[[x,lo,hi]], today, refs:[{y,label,color,x?,left?}], y0, h, yfmt, desc, unit } */
function timeChart(el, o) {
  const W = W_(el), H = o.h || 260, m = { l: 58, r: 16, t: 18, b: 28 }, refs = o.refs || [];
  const xs = o.series.flatMap(s => s.pts.map(p => p[0])), ys = o.series.flatMap(s => s.pts.map(p => p[1])).concat(refs.map(r => r.y), (o.band || []).flatMap(b => [b[1], b[2]]));
  const x0 = Math.min(...xs), x1 = Math.max(...xs); let y0 = o.y0 != null ? o.y0 : Math.min(...ys), y1 = Math.max(...ys); if (y0 === y1) { y0 -= 1; y1 += 1; }
  const raw = (y1 - y0) / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(k => k * mag).find(k => k >= raw), yMax = y1;
  y0 = Math.floor(y0 / st) * st; y1 = Math.ceil(y1 / st) * st; if (refs.length && y1 - yMax < st * .35) y1 += st;
  const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r), Y = y => H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b), fmt = o.yfmt || f0;
  let g = "";
  for (let v = y0; v <= y1 + 1e-9; v += st) g += `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${m.l - 7}" y="${Y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  if (y0 > 0) g += `<text x="${m.l + 5}" y="${H - m.b - 6}" style="font-size:10.5px">telg ei alga nullist</text>`;
  const xstep = x1 - x0 > 12 ? 5 : x1 - x0 > 6 ? 2 : 1;
  for (let x = Math.ceil(x0 / xstep) * xstep; x <= x1; x += xstep) g += `<text x="${X(x)}" y="${H - 8}" text-anchor="middle">${x}</text>`;
  if (o.band && o.band.length) { const [hid, def] = hatchDef(o.bandColor || css("--ref")); g += def + `<polygon points="${o.band.map(b => X(b[0]).toFixed(1) + "," + Y(b[2]).toFixed(1)).concat(o.band.slice().reverse().map(b => X(b[0]).toFixed(1) + "," + Y(b[1]).toFixed(1))).join(" ")}" fill="url(#${hid})" stroke="${o.bandColor || css("--ref")}" stroke-opacity=".35"/>`; }
  if (o.today) g += `<line x1="${X(o.today)}" x2="${X(o.today)}" y1="${m.t - 6}" y2="${H - m.b}" stroke="${css("--line2")}" stroke-dasharray="2 3"/><text x="${X(o.today) + 4}" y="${m.t - 6}" style="font-size:10.5px">täna</text>`;
  refs.forEach(r => {
    g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(r.y)}" y2="${Y(r.y)}" stroke="${r.color}" stroke-width="1.4" stroke-dasharray="${r.x != null ? "6 4" : "2 3"}"/>`;
    if (r.x != null) g += `<line x1="${X(r.x)}" x2="${X(r.x)}" y1="${Y(r.y)}" y2="${H - m.b}" stroke="${r.color}" stroke-dasharray="2 3" opacity=".6"/>` + rhomb(X(r.x), Y(r.y), 6, css("--surf"), r.color);
    g += r.left ? `<text x="${m.l + 5}" y="${Y(r.y) - 6}" style="fill:${r.color}">${esc(r.label)}</text>` : `<text x="${(r.x != null ? Math.min(X(r.x) - 10, W - m.r) : W - m.r)}" y="${Y(r.y) - 8}" text-anchor="end" style="fill:${r.color};font-weight:500">${esc(r.label)}</text>`;
  });
  o.series.forEach(s => {
    const d = s.pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join("");
    g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.w || 2}" ${s.dash ? 'stroke-dasharray="6 4"' : ""} stroke-linejoin="round" stroke-linecap="round" opacity="${s.op || 1}"/>`;
    if (s.dots) s.pts.forEach(p => g += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="2.2" fill="${s.color}"/>`);
    if (s.end) { const p = s.pts[s.pts.length - 1]; g += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="4" fill="${css("--surf")}" stroke="${s.color}" stroke-width="2"/><text x="${X(p[0]) - 7}" y="${Y(p[1]) - 9}" text-anchor="end" class="t-lab" style="font-weight:600">${fmt(p[1])}</text>`; }
  });
  /* hõpikvihje: püstriba aasta kohta */
  const years = [...new Set(xs)].sort((a, b) => a - b), bw = (W - m.l - m.r) / Math.max(1, years.length - 1);
  years.forEach(y => { const tip = `<b>${y}</b><br>` + o.series.filter(s => s.name).map(s => { const p = s.pts.find(q => q[0] === y); return p ? `${esc(s.name)}: <b>${fmt(p[1])}</b>${o.unit ? " " + o.unit : ""}` : ""; }).filter(Boolean).join("<br>") + (o.band ? (b => b ? `<br>vahemik: <b>${fmt(b[1])}–${fmt(b[2])}</b>` : "")(o.band.find(b => b[0] === y)) : "");
    g += `<rect x="${X(y) - bw / 2}" y="${m.t}" width="${bw}" height="${H - m.t - m.b}" fill="transparent" data-tip="${esc(tip)}"/>`; });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.desc || "joonis")}">${g}</svg>`;
}

/* Horisontaalsed tulbad nullist; väärtus alati paremas veerus. rows:{label, v, color, txt, tip} */
function bars(el, rows, o = {}) {
  const W = W_(el), rh = o.rh || 28, lw = Math.min(o.lw || 150, W * .36), rw = o.rw || 100, top = 4, H = top + rows.length * rh + 4;
  const vs = rows.map(r => r.v), mn = Math.min(0, ...vs), mx = Math.max(0, ...vs), sp = (mx - mn) || 1, X = v => lw + 10 + (v - mn) / sp * (W - lw - 18 - rw);
  let g = `<line x1="${X(0)}" x2="${X(0)}" y1="0" y2="${H}" stroke="${css("--line2")}"/>`;
  rows.forEach((r, i) => { const y = top + i * rh, a = X(Math.min(0, r.v)), w = Math.max(2, Math.abs(X(r.v) - X(0)));
    g += `<text x="${lw}" y="${y + rh / 2 + 4}" text-anchor="end" class="t-lab">${esc(r.label)}</text>${r.sel ? `<rect x="0" y="${y}" width="${W}" height="${rh}" fill="transparent" data-sel="${esc(r.sel)}" style="cursor:pointer"/>` : ""}<rect x="${a}" y="${y + 6}" width="${w}" height="${rh - 12}" rx="3" fill="${r.color || css("--a-work")}" opacity="${r.op || .9}"${r.sel ? ` data-sel="${esc(r.sel)}" style="cursor:pointer"` : ""} data-tip="${esc(r.tip || `<b>${esc(r.label)}</b>: ${esc(r.txt != null ? r.txt : (o.fmt || sg)(r.v))}`)}"/><text x="${W - 4}" y="${y + rh / 2 + 4}" text-anchor="end" class="t-lab">${esc(r.txt != null ? r.txt : (o.fmt || sg)(r.v))}</text>`; });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.desc || "tulbad")}">${g}</svg>`;
}

/* Kosk: tulud rohelised, kulud punased, vahesummad täistoonis (dataviz: waterfall). */
function waterfall(el, steps, o = {}) {
  const W = W_(el), rh = 32, lw = Math.min(140, W * .36), rw = 92, top = 4; let run = 0;
  const seg = steps.map(s => { if (s.total) return { ...s, a: 0, b: run }; const a = run; run += s.v; return { ...s, a, b: run }; });
  const all = seg.flatMap(s => [s.a, s.b]).concat(0), mn = Math.min(...all), mx = Math.max(...all), sp = (mx - mn) || 1, X = v => lw + 10 + (v - mn) / sp * (W - lw - 18 - rw), H = top + seg.length * rh + 4, fmt = o.fmt || (v => sg(v / 1000) + " tuh €");
  let g = `<line x1="${X(0)}" x2="${X(0)}" y1="0" y2="${H}" stroke="${css("--line2")}"/>`;
  seg.forEach((s, i) => { const y = top + i * rh, l = Math.min(s.a, s.b), r = Math.max(s.a, s.b), v = s.total ? s.b : s.v, c = v >= 0 ? css("--gain") : css("--loss");
    g += `<text x="${lw}" y="${y + rh / 2 + 4}" text-anchor="end" class="t-lab" style="${s.total ? "font-weight:700" : ""}">${esc(s.label)}</text><rect x="${X(l)}" y="${y + 7}" width="${Math.max(2, X(r) - X(l))}" height="${rh - 14}" rx="3" fill="${c}" opacity="${s.total ? 1 : .5}" data-tip="${esc(`<b>${esc(s.label)}</b>: ${fmt(v)}`)}"/>`;
    if (i < seg.length - 1 && !seg[i + 1].total) g += `<line x1="${X(s.b)}" x2="${X(s.b)}" y1="${y + rh - 7}" y2="${y + rh + 7}" stroke="${css("--dim")}" stroke-dasharray="2 2"/>`;
    g += `<text x="${W - 4}" y="${y + rh / 2 + 4}" text-anchor="end" class="t-lab" style="${s.total ? "font-weight:700" : ""}">${fmt(v)}</text>`; });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.desc || "kosk")}">${g}</svg>`;
}

/* Sihiread ühisel skaalal „% sihist” (P3, P11, P18). rows:{label, sub, share, lo, hi, now, st, val} */
function goalRows(el, rows, o = {}) {
  const W = W_(el), narrow = W < 600, lw = narrow ? 0 : Math.min(320, W * .38), rh = narrow ? 66 : 48, top = 26, H = top + rows.length * rh + 6;
  const all = rows.flatMap(r => [r.share, r.lo, r.hi, r.now != null ? r.now : 1, 1]).filter(v => v != null), a = Math.max(0, Math.floor(Math.min(...all) * 10 - .5) / 10), b = Math.max(1.1, Math.ceil(Math.max(...all) * 10 + .5) / 10);
  const x0 = narrow ? 12 : lw + 18, x1 = W - 64, X = v => x0 + (v - a) / (b - a) * (x1 - x0);
  let g = `<rect x="${X(1)}" y="${top - 8}" width="${X(b) - X(1)}" height="${H - top}" fill="var(--ok-s)"/>`;
  for (let v = Math.ceil(a * 10) / 10; v <= b + 1e-9; v += .1) g += `<line class="gl" x1="${X(v)}" x2="${X(v)}" y1="${top - 8}" y2="${H}"/><text x="${X(v)}" y="14" text-anchor="middle">${Math.round(v * 100)}%</text>`;
  g += `<line x1="${X(1)}" x2="${X(1)}" y1="${top - 10}" y2="${H}" stroke="${css("--ink")}" stroke-width="2"/>`;
  const [hid, def] = hatchDef(css("--ref")); g += def;
  rows.forEach((r, i) => { const y = top + i * rh + (narrow ? 42 : rh / 2), c = css(GLY[r.st][2]);
    g += narrow ? `<text x="12" y="${y - 22}" class="t-lab" style="font-family:var(--f-body);font-size:13px">${esc(r.label)}</text>` : `<text x="${lw}" y="${y - 3}" text-anchor="end" class="t-lab" style="font-family:var(--f-body);font-size:13px">${esc(r.label.length > 46 ? r.label.slice(0, 45) + "…" : r.label)}</text><text x="${lw}" y="${y + 13}" text-anchor="end" style="font-size:10.5px">${esc(r.sub || "")}</text>`;
    g += `<line class="ax" x1="${x0}" x2="${x1}" y1="${y}" y2="${y}"/>`;
    if (r.lo != null) g += `<rect x="${X(r.lo)}" y="${y - 6}" width="${Math.max(2, X(r.hi) - X(r.lo))}" height="12" rx="3" fill="url(#${hid})" stroke="${css("--ref")}" stroke-opacity=".5"/>`;
    if (r.now != null) g += rhomb(X(r.now), y, 6, css("--surf"), css("--ink")).replace("<path", `<path data-tip="${esc("2026: " + Math.round(r.now * 100) + "% sihist")}"`);
    g += glyphMark(r.st, X(r.share), y, c).replace(/^<(\w+)/, `<$1 data-tip="${esc(`<b>${esc(r.label)}</b><br>${esc(r.val || "")} · ${Math.round(r.share * 100)}% sihist`)}"`);
    g += `<text x="${W - 4}" y="${y + 4}" text-anchor="end" style="fill:${c};font-weight:600">${Math.round(r.share * 100)}%</text>`; });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.desc || "eesmärgid")}">${g}</svg>`;
}

/* Virnastatud tulbad (100% või kogus). rows:{label, parts:[{v,color,name}], txt} */
function stack(el, rows, o = {}) {
  const W = W_(el), rh = o.rh || 28, lw = Math.min(o.lw || 120, W * .32), rw = o.rw || 70, H = 4 + rows.length * rh + 4, tot = r => r.parts.reduce((s, q) => s + q.v, 0), mx = o.pct ? 1 : Math.max(...rows.map(tot)) || 1, X = v => lw + 10 + v / mx * (W - lw - 18 - rw);
  let g = "";
  rows.forEach((r, i) => { const y = 4 + i * rh, T = tot(r); let acc = 0; g += `<text x="${lw}" y="${y + rh / 2 + 4}" text-anchor="end" class="t-lab">${esc(r.label)}</text>`;
    r.parts.forEach(q => { const v = o.pct ? q.v / T : q.v, x = X(acc); acc += v; if (v > 0) g += `<rect x="${x}" y="${y + 6}" width="${Math.max(0, X(acc) - x - 2)}" height="${rh - 12}" fill="${q.color}" opacity="${q.op || .9}" data-tip="${esc(`<b>${esc(r.label)}</b> · ${esc(q.name || "")}: ${o.pct ? Math.round(v * 100) + "%" : f0(q.v)}`)}"/>`; });
    g += `<text x="${W - 4}" y="${y + rh / 2 + 4}" text-anchor="end" class="t-lab">${esc(r.txt != null ? r.txt : f0(T))}</text>`; });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.desc || "tulbad")}">${g}</svg>`;
}

/* Soojuskaart seisu lävenditega (P10: värv + arv lahtris). */
function heat(el, rl, cl, val, o = {}) {
  const W = W_(el), lw = Math.min(o.lw || 100, W * .28), ch = 32, top = 22, cw = (W - lw - 10) / cl.length, H = top + rl.length * ch + 4, lvl = o.lvl || (v => Math.abs(v) < .03 ? "ok" : Math.abs(v) < .08 ? "warn" : "crit");
  let g = cl.map((c, j) => `<text x="${lw + 10 + j * cw + cw / 2}" y="14" text-anchor="middle">${esc(c)}</text>`).join("");
  rl.forEach((r, i) => { const y = top + i * ch; g += `<text x="${lw}" y="${y + ch / 2 + 4}" text-anchor="end" class="t-lab">${esc(r)}</text>`;
    cl.forEach((c, j) => { const v = val(i, j), s = lvl(v), col = css(GLY[s][2]), x = lw + 10 + j * cw; g += `<rect x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" rx="4" fill="${col}" opacity=".2" data-tip="${esc(`${esc(r)} · ${esc(c)}: ${pc(v)} (${GLY[s][1]})`)}"/><text x="${x + cw / 2}" y="${y + ch / 2 + 4}" text-anchor="middle" style="fill:${col};font-weight:600">${GLY[s][0]} ${pc(v)}</text>`; }); });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.desc || "soojuskaart")}">${g}</svg>`;
}
