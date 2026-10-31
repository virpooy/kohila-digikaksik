/* Kaart (atlas): OpenStreetMapi aluskiht (data/map.json) + kaksiku kihid. Suum, lohistamine, klaviatuur, valitud asula paneel. */
const MAPL = { maakate: true, teed: true, kylad: true, asulad: true, yt: false, koolid: true, dp: true };
const MAP = { data: null, loading: null, sel: null, view: null };
const loadMap = () => MAP.loading || (MAP.loading = fetch("data/map.json").then(r => r.ok ? r.json() : null).catch(() => null).then(j => (MAP.data = j)));

function secKaart(el) {
  const vid = isAgg(S.unit) ? "Kohila" : S.unit;
  if (!D.geo.vald[vid]) { el.innerHTML = ttl("Kaart", "Kaart on Kohila ja Rae valla kohta", "h2") + `<p class="note">Vali ülal Kohila või Rae.</p>`; return; }
  if (!MAP.done) { el.innerHTML = `<div class="loading">Laadin kaardikihte…</div>`; loadMap().then(() => { MAP.done = true; if (el.isConnected) secKaart(el); }); return; }
  const M = MAP.data && MAP.data.vald[vid];
  const P = D.geo.place.filter(p => p.v === vid), I = D.geo.inst.filter(x => x.v === vid), T = new Map(D.transit.rows.filter(r => r[1] === vid).map(r => [r[0], r]));
  const L = D.settlements[vid] ? E.settlementLayer(ctx, vid, proj(vid), 2036) : [], L26 = D.settlements[vid] ? E.settlementLayer(ctx, vid, proj(vid), 2026) : [];
  const setOf = n => { const i = L.findIndex(x => asulaKey(x.n) === n); return i < 0 ? null : { r: L[i], r26: L26[i] }; };
  const DP = dpOf(vid), weak = P.filter(p => T.get(p.n) && T.get(p.n)[3] < 10).length;
  if (MAP.sel && !P.find(p => p.n === MAP.sel)) MAP.sel = null;
  el.innerHTML = `${ttl(`${esc(ctx.units[vid].name)} · asulad, koolid, ühistransport ja planeeringud`, `${weak} asulas ${P.length}-st on tööpäeval alla 10 bussi- või rongiväljumise`, "h2")}
  <div class="atl">
    <div class="mapbox" id="mapBox" tabindex="0" role="application" aria-label="${esc(ctx.units[vid].name)} kaart. Suumimiseks + ja −, liigutamiseks nooleklahvid, algvaade 0.">
      <svg id="mapSvg" aria-hidden="true"><g id="mBase"></g><g id="mTop"></g></svg>
      <div class="mapctl"><button type="button" data-z="1.6" aria-label="Suurenda">+</button><button type="button" data-z="0.625" aria-label="Vähenda">−</button><button type="button" data-z="0" aria-label="Algvaade">⟲</button></div>
      <div class="mapscale" id="mapScale"></div><div class="maphint" id="mapHint">Suumimiseks klõpsa kaardil või hoia Ctrl all</div>
    </div>
    <aside class="panel atlside">
      <span class="kick">Kihid</span>
      <div class="tabs" id="mapL" role="group" aria-label="Kaardikihid">${[["maakate", "Mets ja hoonestus"], ["teed", "Teed ja raudtee"], ["kylad", "Külade piirid"], ["asulad", "Rahvaarv 2036"], ["yt", "Ühistransport"], ["koolid", "Koolid ja lasteaiad"], ["dp", "Planeeringud"]].map(([k, t]) => `<button type="button" data-l="${k}" aria-pressed="${MAPL[k]}">${t}</button>`).join("")}</div>
      <div id="mapInfo"></div>
      <div class="maplegend">
        ${MAPL.asulad ? `<span><svg width="22" height="16"><circle cx="8" cy="8" r="7" fill="var(--a-work)" fill-opacity=".35" stroke="var(--a-work)"/></svg>ringi suurus: elanikke 2036 ${rel("hinnang")}</span>` : ""}
        ${MAPL.yt ? `<span><svg width="22" height="16"><circle cx="8" cy="8" r="6" fill="var(--a-work)"/></svg>tume = palju otseühendusi Tallinna</span><span><svg width="22" height="16"><circle cx="8" cy="8" r="6" fill="var(--crit)"/></svg>ühistranspordita</span>` : ""}
        ${MAPL.koolid ? `<span><svg width="22" height="16"><rect x="3" y="3" width="10" height="10" fill="var(--ink)" stroke="var(--surf)" stroke-width="1.5"/></svg>kool</span><span><svg width="22" height="16"><path d="M8,2L14,13H2Z" fill="var(--a-kid)" stroke="var(--surf)" stroke-width="1.5"/></svg>lasteaed</span>` : ""}
        ${MAPL.dp ? `<span><svg width="22" height="16"><path d="M8,1L15,8L8,15L1,8Z" fill="var(--loss)" stroke="var(--surf)" stroke-width="1.5"/></svg>menetluses detailplaneering</span>` : ""}
        ${MAPL.teed ? `<span><svg width="22" height="16"><line x1="1" y1="8" x2="21" y2="8" stroke="var(--m-case)" stroke-width="6"/><line x1="1" y1="8" x2="21" y2="8" stroke="var(--m-major)" stroke-width="3.5"/></svg>põhi- ja tugimaantee</span><span><svg width="22" height="16"><line x1="1" y1="8" x2="21" y2="8" stroke="var(--m-rail)" stroke-width="3"/><line x1="1" y1="8" x2="21" y2="8" stroke="var(--m-land)" stroke-width="1.6" stroke-dasharray="4 4"/></svg>raudtee · <b style="font-family:var(--f-num)">●</b> jaam</span>` : ""}
      </div>
    </aside>
  </div>
  ${M ? "" : `<div class="callout"><span class="st na">◇</span><span>Kaardi aluskiht (<code>data/map.json</code>) <span class="missing">puudub</span>; näitan lihtsustatud piiri.</span></div>`}
  ${meta(esc((MAP.data && MAP.data.attr) || D.geo.attr) + (MAP.data ? " · kaardikiht " + esc(MAP.data.date) : "") + " · Transpordiameti GTFS " + esc(D.transit.date) + " · planeeringukontroll " + esc(D.dp.updated))}`;
  $("#mapL").onclick = e => { const b = e.target.closest("button"); if (b) { MAPL[b.dataset.l] = !MAPL[b.dataset.l]; secKaart(el); } };

  /* ---------- projektsioon ---------- */
  const box = $("#mapBox"), svg = $("#mapSvg"), W = W_(box);
  const outl = M ? M.outline.map(f => { const r = []; for (let i = 0; i < f.length; i += 2) r.push([f[i], f[i + 1]]); return r; }) : [D.geo.vald[vid].map(p => [p[1], p[0]])];
  const bb = M ? M.bbox : (a => [Math.min(...a.map(p => p[0])), Math.min(...a.map(p => p[1])), Math.max(...a.map(p => p[0])), Math.max(...a.map(p => p[1]))])(outl[0]);
  const ol = outl.flat(), v0 = [Math.min(...ol.map(p => p[0])), Math.min(...ol.map(p => p[1])), Math.max(...ol.map(p => p[0])), Math.max(...ol.map(p => p[1]))];
  const kc = Math.cos((v0[1] + v0[3]) / 2 * Math.PI / 180), Hmax = Math.min(680, Math.max(360, W * (W < 600 ? 1.15 : .72)));
  const pad = 14, S0 = Math.min((W - 2 * pad) / ((v0[2] - v0[0]) * kc), (Hmax - 2 * pad) / (v0[3] - v0[1])), H = Math.round(Math.min(Hmax, (v0[3] - v0[1]) * S0 + 2 * pad));
  const cx = (v0[0] + v0[2]) / 2, cy = (v0[1] + v0[3]) / 2, X = lon => W / 2 + (lon - cx) * kc * S0, Y = lat => H / 2 - (lat - cy) * S0;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
  const pth = (f, close) => { let s = ""; for (let i = 0; i < f.length; i += 2) s += (i ? "L" : "M") + X(f[i]).toFixed(1) + "," + Y(f[i + 1]).toFixed(1); return s + (close ? "Z" : ""); };
  const many = (arr, close) => arr.map(f => pth(f, close)).join("");
  const NS = 'vector-effect="non-scaling-stroke"';

  /* ---------- aluskiht (joonistatakse üks kord, suum = transform) ---------- */
  let g = `<rect x="${-W * 4}" y="${-H * 4}" width="${W * 9}" height="${H * 9}" fill="var(--m-land)"/>`;
  if (M) {
    if (MAPL.maakate) g += `<path d="${many(M.wood, true)}" fill="var(--m-wood)"/><path d="${many(M.wet, true)}" fill="var(--m-wet)"/><path d="${many(M.built, true)}" fill="var(--m-built)"/>`;
    g += `<path d="${many(M.water, true)}" fill="var(--m-water)"/>`;
    g += `<path d="${M.stream.map(s => pth(s.g)).join("")}" fill="none" stroke="var(--m-river)" stroke-width=".8" ${NS}/><path d="${M.river.map(s => pth(s.g)).join("")}" fill="none" stroke="var(--m-river)" stroke-width="2" ${NS}/>`;
    if (MAPL.kylad) g += `<path d="${M.kylad.map(k => many(k.rings, true)).join("")}" fill="none" stroke="var(--m-border)" stroke-width=".9" stroke-dasharray="3 3" ${NS}/>`;
    if (MAPL.teed) {
      const R = M.roads, mi = R[4], ti = R[3], mj = R[0].concat(R[1]), se = R[2];
      g += `<path d="${many(mi)}" fill="none" stroke="var(--m-road2)" stroke-width=".8" ${NS}/>`;
      g += `<path d="${many(ti.concat(se, mj))}" fill="none" stroke="var(--m-case)" stroke-width="3.6" stroke-linecap="round" ${NS}/>`;
      g += `<path d="${many(ti)}" fill="none" stroke="var(--m-road)" stroke-width="2" stroke-linecap="round" ${NS}/><path d="${many(se)}" fill="none" stroke="var(--m-road)" stroke-width="2.6" stroke-linecap="round" ${NS}/>`;
      g += `<path d="${many(mj)}" fill="none" stroke="var(--m-case)" stroke-width="5.4" stroke-linecap="round" ${NS}/><path d="${many(mj)}" fill="none" stroke="var(--m-major)" stroke-width="3.6" stroke-linecap="round" ${NS}/>`;
      g += `<path d="${many(M.rail)}" fill="none" stroke="var(--m-rail)" stroke-width="3" ${NS}/><path d="${many(M.rail)}" fill="none" stroke="var(--m-land)" stroke-width="1.6" stroke-dasharray="5 5" ${NS}/>`;
    }
  }
  /* väljaspool valda: kate, mis jätab valla esile */
  g += `<path d="M${-W * 4},${-H * 4}h${W * 9}v${H * 9}h${-W * 9}Z${outl.map(r => pth(r.flatMap(p => p), true)).join("")}" fill="var(--bg)" fill-opacity=".62" fill-rule="evenodd"/>`;
  g += `<path d="${outl.map(r => pth(r.flatMap(p => p), true)).join("")}" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-opacity=".75" ${NS}/>`;
  $("#mBase").innerHTML = g;

  /* ---------- pealmine kiht ekraanikoordinaatides ---------- */
  const inV = (lon, lat) => outl.some(r => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c; } return c; });
  const ST = M ? M.stations.filter(s => inV(s.p[0], s.p[1])) : [], REFS = M ? M.refs.filter(r => inV(r.p[0], r.p[1])) : [];
  const mxT = Math.max(1, ...[...T.values()].map(r => r[4])), mxP = Math.max(1, ...P.map(p => (setOf(p.n) || { r: { pop: 0 } }).r.pop));
  const view = MAP.view && MAP.view.vid === vid && MAP.view.W === W ? MAP.view : { vid, W, k: 1, tx: 0, ty: 0 }; MAP.view = view;
  const sx = x => x * view.k + view.tx, sy = y => y * view.k + view.ty;
  function top() {
    $("#mBase").setAttribute("transform", `translate(${view.tx.toFixed(2)},${view.ty.toFixed(2)}) scale(${view.k.toFixed(4)})`);
    const boxes = [], free = (x, y, w, h) => { if (x < 2 || y < 2 || x + w > W - 2 || y + h > H - 2) return false; if (boxes.some(b => x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + h > b[1])) return false; boxes.push([x, y, w, h]); return true; };
    let t = "", labs = "";
    /* jaamad ja teenumbrid */
    if (M && MAPL.teed) {
      ST.forEach(s => { const x = sx(X(s.p[0])), y = sy(Y(s.p[1])); if (x < 0 || x > W || y < 0 || y > H) return; t += `<circle cx="${x}" cy="${y}" r="4.5" fill="var(--m-land)" stroke="var(--ink)" stroke-width="2" data-tip="${esc("<b>" + esc(s.n) + "</b><br>raudteejaam")}"/>`; boxes.push([x - 5, y - 5, 10, 10]); if (view.k >= 2.5) { const w = s.n.length * 6.3; if (free(x - w / 2, y + 7, w, 13)) labs += `<text x="${x}" y="${y + 18}" text-anchor="middle" class="m-kyla" style="font-style:normal;font-weight:600">${esc(s.n)}</text>`; } });
      const seen = new Set(); REFS.forEach(r => { const x = sx(X(r.p[0])), y = sy(Y(r.p[1])), key = r.r + Math.round(x / 140) + "," + Math.round(y / 140); if (seen.has(key)) return; const w = 8 + r.r.length * 7; if (!free(x - w / 2, y - 8, w, 16)) return; seen.add(key);
        t += `<rect x="${x - w / 2}" y="${y - 8}" width="${w}" height="16" rx="3" fill="var(--m-major)" stroke="var(--m-case)"/><text x="${x}" y="${y + 4}" text-anchor="middle" class="m-ref">${esc(r.r)}</text>`; });
    }
    /* asulad */
    const items = P.map(p => { const s = setOf(p.n), tr = T.get(p.n), pp = s ? s.r.pop : null; return { p, s, tr, pp, x: sx(X(p.ll[1])), y: sy(Y(p.ll[0])) }; }).sort((a, b) => (b.pp || 0) - (a.pp || 0));
    items.forEach(o => { const { p, tr, pp, x, y } = o; if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return;
      const r = MAPL.asulad && pp ? 4 + 16 * Math.sqrt(pp / mxP) * Math.min(1.6, Math.sqrt(view.k)) : 4.5; o.r = r;
      const none = MAPL.yt && tr && tr[3] === 0, col = none ? "var(--crit)" : "var(--a-work)", op = MAPL.yt && tr ? .25 + .75 * Math.sqrt(tr[4] / mxT) : MAPL.asulad ? .28 : .9;
      const tip = `<b>${esc(p.n)}</b>${pp ? `<br>${f0(pp)} elanikku 2036 (hinnang)` : ""}${tr ? `<br>${tr[3]} väljumist päevas · otse Tallinna ${tr[4]}` : ""}<br><i>klõpsa: üksikasjad</i>`;
      if (MAPL.asulad || MAPL.yt || !M) t += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" fill-opacity="${op}" stroke="${p.n === MAP.sel ? "var(--focus)" : col}" stroke-width="${p.n === MAP.sel ? 3 : 1.2}" data-tip="${esc(tip)}" data-sel="${esc(p.n)}" style="cursor:pointer"/>`;
      boxes.push([x - r, y - r, 2 * r, 2 * r]); });
    if (MAPL.koolid) I.forEach(q => { const x = sx(X(q.ll[1])), y = sy(Y(q.ll[0])); t += q.t === "K" ? `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="var(--ink)" stroke="var(--surf)" stroke-width="1.5" data-tip="${esc("<b>" + esc(q.n) + "</b><br>kool")}"/>` : `<path d="M${x},${y - 6.5}L${x + 6.5},${y + 5}L${x - 6.5},${y + 5}Z" fill="var(--a-kid)" stroke="var(--surf)" stroke-width="1.5" data-tip="${esc("<b>" + esc(q.n) + "</b><br>lasteaed")}"/>`; boxes.push([x - 6, y - 6, 12, 12]); });
    if (MAPL.dp) DP.forEach((d, i) => { const pl = P.find(p => p.n === asulaKey(d.asula)) || P.find(p => asulaKey(d.asula).includes(p.n)); if (!pl) return; const x = sx(X(pl.ll[1])) + 10 + i * 4, y = sy(Y(pl.ll[0])) - 10;
      t += rhomb(x, y, 7.5, "var(--loss)", "var(--surf)").replace("<path", `<path data-tip="${esc(`<b>${esc(d.name)}</b><br>${esc(d.stage)}${Object.keys(d.units).length ? "" : "<br>eluruumide arv puudub"}`)}"`); boxes.push([x - 8, y - 8, 16, 16]); });
    /* sildid: asulad tähtsuse järgi, siis külad (kui ruumi on) */
    items.forEach(o => { if (o.r == null) return; const big = o.pp && o.pp > mxP * .3, fs = big ? 13.5 : o.pp && o.pp > mxP * .08 ? 12 : 11, w = o.p.n.length * fs * .56, h = fs + 2, cls = o.pp ? "m-lab" : "m-kyla";
      const cand = [[o.x + o.r + 4, o.y - h / 2, "start"], [o.x - o.r - 4 - w, o.y - h / 2, "start"], [o.x - w / 2, o.y - o.r - h - 2, "start"], [o.x - w / 2, o.y + o.r + 2, "start"]];
      const c = cand.find(([x, y]) => free(x, y, w, h)); if (c) labs += `<text x="${c[0]}" y="${c[1] + fs - 1}" class="${cls}" style="font-size:${fs}px;${big ? "font-weight:700" : ""}${cls === "m-kyla" ? ";font-style:normal" : ""}">${esc(o.p.n)}</text>`; });
    if (M && MAPL.kylad && (view.k >= 1.4 || W > 1000)) M.kylad.forEach(k => { if (P.find(p => p.n === asulaKey(k.n))) return; const x = sx(X(k.p[0])), y = sy(Y(k.p[1])), w = k.n.length * 6.2; if (free(x - w / 2, y - 7, w, 13)) labs += `<text x="${x}" y="${y + 4}" text-anchor="middle" class="m-kyla">${esc(asulaKey(k.n))}</text>`; });
    $("#mTop").innerHTML = labs + t;
    /* mõõtkava */
    const mpp = 111320 / (S0 * view.k), nice = [100, 200, 500, 1000, 2000, 5000, 10000].find(m => m / mpp > 70) || 10000;
    $("#mapScale").innerHTML = `<span style="width:${(nice / mpp).toFixed(0)}px"></span>${nice >= 1000 ? nice / 1000 + " km" : nice + " m"}`;
  }
  function info() {
    const p = P.find(q => q.n === MAP.sel), box2 = $("#mapInfo");
    if (!p) { box2.innerHTML = `<p class="small mut">Klõpsa asulal, et näha selle andmeid.</p>`; return; }
    const s = setOf(p.n), tr = T.get(p.n), ins = I.filter(q => Math.hypot((q.ll[1] - p.ll[1]) * kc, q.ll[0] - p.ll[0]) < .02), dps = DP.filter(d => asulaKey(d.asula) === p.n || asulaKey(d.asula).includes(p.n));
    box2.innerHTML = `<div class="detail"><h3>${esc(p.n)}</h3><dl class="mapdl">
      ${s ? `<dt>Elanikke 2026 → 2036</dt><dd>${f0(s.r26.pop)} → ${f0(s.r.pop)} ${rel("hinnang")}</dd><dt>Lasteaiaealisi 2036</dt><dd>${f0(s.r.la)}</dd><dt>Põhikooliealisi 2036</dt><dd>${f0(s.r.pk)}</dd><dt>Põhikool asulas</dt><dd>${s.r.school ? "on" : s.r.other ? "osaliselt" : '<span class="st warn">▲ ei ole</span>'}</dd>` : `<dt>Elanikud</dt><dd><span class="missing">puudub</span> (asula on koondreas)</dd>`}
      ${tr ? `<dt>Väljumisi tööpäeval</dt><dd>${tr[3]}${tr[3] < 10 ? ' <span class="st warn">▲</span>' : ""}</dd><dt>Otse Tallinna kesklinna</dt><dd>${tr[4]}${tr[6] != null ? ` · kiireim ${tr[6]} min` : ""}</dd>` : `<dt>Ühistransport</dt><dd><span class="missing">puudub</span></dd>`}
      ${ins.length ? `<dt>Lähedal</dt><dd>${ins.map(q => esc(q.n)).join("<br>")}</dd>` : ""}
      ${dps.length ? `<dt>Planeeringud</dt><dd>${dps.map(d => esc(d.name) + " · " + esc(d.stage)).join("<br>")}</dd>` : ""}</dl>
      <button type="button" class="btn ghost sm" id="mapSelX">Sulge</button></div>`;
    $("#mapSelX").onclick = () => { MAP.sel = null; info(); top(); };
  }
  top(); info();

  /* ---------- suum ja lohistamine ---------- */
  const clamp = () => { view.k = Math.max(1, Math.min(14, view.k)); const mx = W * .4; view.tx = Math.min(mx, Math.max(W - W * view.k - mx, view.tx)); view.ty = Math.min(H * .4, Math.max(H - H * view.k - H * .4, view.ty)); if (view.k === 1) { view.tx = 0; view.ty = 0; } };
  let raf = 0; const redraw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; top(); }); };
  const zoomAt = (f, px, py) => { const k0 = view.k; view.k = Math.max(1, Math.min(14, view.k * f)); const r = view.k / k0; view.tx = px - (px - view.tx) * r; view.ty = py - (py - view.ty) * r; clamp(); redraw(); };
  const local = e => { const b = svg.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; };
  box.querySelector(".mapctl").onclick = e => { const b = e.target.closest("button"); if (!b) return; const z = +b.dataset.z; if (!z) { view.k = 1; clamp(); redraw(); } else zoomAt(z, W / 2, H / 2); };
  box.addEventListener("wheel", e => { if (!(e.ctrlKey || e.metaKey || document.activeElement === box)) { const h = $("#mapHint"); h.classList.add("on"); clearTimeout(h._t); h._t = setTimeout(() => h.classList.remove("on"), 1300); return; } e.preventDefault(); const [px, py] = local(e); zoomAt(Math.exp(-e.deltaY * .0022), px, py); }, { passive: false });
  const pts = new Map(); let moved = 0, pinch = null;
  box.addEventListener("pointerdown", e => { if (e.target.closest(".mapctl")) return; box.setPointerCapture(e.pointerId); pts.set(e.pointerId, local(e)); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } box.classList.add("drag"); });
  box.addEventListener("pointermove", e => { if (!pts.has(e.pointerId)) return; const p = local(e), o = pts.get(e.pointerId);
    if (pts.size === 2) { pts.set(e.pointerId, p); const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoomAt(d / pinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch = d; moved += 10; return; }
    view.tx += p[0] - o[0]; view.ty += p[1] - o[1]; moved += Math.abs(p[0] - o[0]) + Math.abs(p[1] - o[1]); pts.set(e.pointerId, p); clamp(); redraw(); });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) box.classList.remove("drag");
    if (e.type === "pointerup" && moved < 6) { const t = document.elementFromPoint(e.clientX, e.clientY), s = t && t.closest && t.closest("[data-sel]"); if (s) { MAP.sel = s.dataset.sel; info(); top(); } } };
  box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
  box.addEventListener("keydown", e => { const st = 60; if (e.key === "+" || e.key === "=") zoomAt(1.5, W / 2, H / 2); else if (e.key === "-") zoomAt(1 / 1.5, W / 2, H / 2); else if (e.key === "0") { view.k = 1; clamp(); redraw(); }
    else if (e.key.startsWith("Arrow")) { view.tx += e.key === "ArrowLeft" ? st : e.key === "ArrowRight" ? -st : 0; view.ty += e.key === "ArrowUp" ? st : e.key === "ArrowDown" ? -st : 0; clamp(); redraw(); } else return; e.preventDefault(); });
}
