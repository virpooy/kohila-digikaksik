// Teekond 6: paigutus (horisontaalne kerimine), hele/tume, 1280 px ja 390 px, klaviatuur, puuteala suurus, kontrast
const L = require("./lib");
const { setupKase } = require("./j2_stages");
const { SEED, NOW } = require("./j5_desk");
const VIEWS = [["toolaud", null], ["register", null], ["algatamine", "docs"], ["algatamine", "dates"], ["algatamine", "act"], ["algatamine", "nt"], ["algatamine", "ai"], ["vastuvotmine", "dates"], ["kehtestamine", "act"], ["kaik", null], ["dokumendid", null], ["alus", null]];
function lum(c) { const m = c.match(/[\d.]+/g); if (!m) return 1; const [r, g, b] = m.slice(0, 3).map(x => { x = x / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
async function contrast(p) {
  const pairs = await p.evaluate(() => {
    const bgOf = el => { while (el) { const c = getComputedStyle(el).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; el = el.parentElement; } return getComputedStyle(document.body).backgroundColor; };
    const out = []; const seen = new Set();
    document.querySelectorAll("main *, header.top *, #tabs *").forEach(el => {
      if (!el.offsetParent || !el.childNodes.length) return; const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1); if (!own) return;
      const cs = getComputedStyle(el); if (cs.visibility === "hidden" || +cs.opacity < 0.5) return;
      const key = cs.color + "|" + bgOf(el) + "|" + el.className; if (seen.has(key)) return; seen.add(key);
      out.push({ sel: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ").join(".") : ""), fg: cs.color, bg: bgOf(el), size: parseFloat(cs.fontSize), bold: +cs.fontWeight >= 700, txt: el.textContent.trim().slice(0, 30) });
    });
    return out;
  });
  return pairs.map(x => { const a = lum(x.fg), b = lum(x.bg); const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); return { ...x, r: Math.round(r * 100) / 100 }; }).filter(x => x.r < ((x.size >= 18.6 || (x.size >= 14 && x.bold)) ? 3 : 4.5) && !/rgba\([^)]*, 0\.\d+\)/.test(x.fg));
}
async function run(browser, url) {
  L.journey("J6 paigutus, teemad, klaviatuur, puutealad");
  const combos = [{ tag: "1280-hele", width: 1280, height: 900 }, { tag: "1280-tume", width: 1280, height: 900, dark: true }, { tag: "390-hele", width: 390, height: 844, mobile: true }, { tag: "390-tume", width: 390, height: 844, mobile: true, dark: true }];
  for (const c of combos) {
    const ctx = await L.newCtx(browser, { ...c, dbSeed: SEED }); const p = await ctx.newPage(); const log = L.watch(p);
    await p.clock.setFixedTime(new Date(NOW));
    await p.goto(url); await L.sleep(900); await setupKase(p);
    const over = [], lowC = [];
    for (const [t, s] of VIEWS) {
      await L.go(p, t); if (s) await L.step(p, s);
      if (t === "register") { await p.evaluate(() => { const b = document.querySelector('[data-rview="table"]'); b && b.click(); }); await L.sleep(300); }
      const o = await L.hOverflow(p); if (o.over > 1) over.push({ v: t + (s ? "/" + s : ""), ...o });
      if (/tume|hele/.test(c.tag) && ["toolaud", "algatamine"].includes(t) && (!s || s === "dates" || s === "act")) { const lc = await contrast(p); lowC.push(...lc.map(x => ({ v: t + (s ? "/" + s : ""), ...x }))); }
      if (["toolaud", "register"].includes(t) || s === "act" || s === "dates") await L.shot(p, `j6_${c.tag}_${t}${s ? "_" + s : ""}`);
    }
    // registri tahvel
    await L.go(p, "register"); await p.evaluate(() => { const b = document.querySelector('[data-rview="board"]'); b && b.click(); }); await L.sleep(300);
    const ob = await L.hOverflow(p); if (ob.over > 1) over.push({ v: "register/tahvel", ...ob }); await L.shot(p, `j6_${c.tag}_board`);
    L.check(`J6.${c.tag}.01`, `${c.tag}: ühelgi vaatel pole lehe horisontaalset kerimist`, !over.length, over);
    const uniq = []; const sk = new Set(); lowC.forEach(x => { const k = x.sel + x.fg + x.bg; if (!sk.has(k)) { sk.add(k); uniq.push(x); } });
    L.check(`J6.${c.tag}.02`, `${c.tag}: teksti kontrast ≥ 4.5:1 (suur tekst 3:1) töölaual ja algatamise sammudel`, !uniq.length, uniq.slice(0, 8).map(x => `${x.v} ${x.sel} „${x.txt}” ${x.r}:1 (${x.fg} / ${x.bg})`));
    if (c.mobile) {
      // puutealad
      const small = [];
      for (const [t, s] of [["toolaud", null], ["algatamine", "dates"], ["algatamine", "act"], ["register", null]]) {
        await L.go(p, t); if (s) await L.step(p, s);
        small.push(...await p.evaluate(v => [...document.querySelectorAll("main button, main a[href], main select, main input:not([type=hidden]), main summary, #tabs button, header.top button, header.top label.btn, #pipeWrap button, #pipeWrap input")].filter(e => e.offsetParent && getComputedStyle(e).visibility !== "hidden").map(e => { const r = e.getBoundingClientRect(); return { v, el: e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : "") + (e.dataset.step ? `[data-step=${e.dataset.step}]` : "") + (e.dataset.ja ? "[data-ja]" : ""), h: Math.round(r.height), w: Math.round(r.width), txt: (e.innerText || e.value || e.getAttribute("aria-label") || "").trim().slice(0, 20) }; }).filter(x => x.h > 0 && (x.h < 24 || x.w < 24)), t + (s ? "/" + s : "")));
      }
      const u = []; const ks = new Set(); small.forEach(x => { const k = x.el + x.txt; if (!ks.has(k)) { ks.add(k); u.push(x); } });
      L.check(`J6.${c.tag}.03`, `${c.tag}: puutealad vähemalt 24×24 px (WCAG 2.2 AA)`, !u.length, `${u.length} elementi: ` + u.slice(0, 12).map(x => `${x.v} ${x.el} „${x.txt}” ${x.w}×${x.h}`).join("; "));
      // menüü avamine mobiilis
      await L.go(p, "algatamine");
      await p.evaluate(() => document.querySelector("#mobMenu, #sideToggle") && (document.querySelector(".mob-bar #mobMenu").offsetParent ? document.querySelector("#mobMenu") : document.querySelector("#sideToggle")).click()); await L.sleep(400);
      const side = await p.evaluate(() => { const s = document.querySelector("#side").getBoundingClientRect(); return { open: document.body.classList.contains("side-open"), left: Math.round(s.left), w: Math.round(s.width) }; });
      await L.shot(p, `j6_${c.tag}_menu`);
      await p.evaluate(() => { const a = document.querySelector('[data-side="register"]'); a && a.click(); }); await L.sleep(400);
      const after = await p.evaluate(() => ({ open: document.body.classList.contains("side-open"), hash: location.hash }));
      L.check(`J6.${c.tag}.04`, `${c.tag}: külgmenüü avaneb ja sulgub pärast valikut`, side.open && side.left >= 0 && !after.open && after.hash === "#register", { side, after });
    }
    const errs = log.pageErrors.concat(log.consoleErrors.filter(e => !/ERR_FAILED/.test(e)));
    L.check(`J6.${c.tag}.05`, `${c.tag}: konsoolis vigu ei olnud`, !errs.length, errs);
    await ctx.close();
  }
  // ---- klaviatuur (1280 hele) ----
  const ctx = await L.newCtx(browser, { width: 1280, height: 900 }); const p = await ctx.newPage(); L.watch(p);
  await p.goto(url); await L.sleep(1000);
  const seq = [];
  for (let i = 0; i < 120; i++) { await p.keyboard.press("Tab"); const f = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); return { id: e.id, tag: e.tagName.toLowerCase(), t: (e.innerText || e.value || e.getAttribute("aria-label") || "").trim().slice(0, 25), dstep: e.dataset.step || "", dt: e.dataset.t || "", ring: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== "none" || e.type === "date" || (() => { const fb = cs.borderTopColor + cs.backgroundColor; e.blur(); const cb = getComputedStyle(e); const nb = cb.borderTopColor + cb.backgroundColor; e.focus(); return fb !== nb && parseFloat(cs.borderTopWidth) > 0; })() }; }); if (f) seq.push(f); }
  const has = pred => seq.some(pred);
  L.check("J6.kb.01", "Klaviatuur: etapi vahelehed, nimeväli ja „Salvesta menetlusregistrisse” on Tab-iga kättesaadavad", has(x => x.dt === "algatamine") && has(x => x.id === "startName"), seq.slice(0, 30).map(x => x.id || x.t).join(" › "));
  L.check("J6.kb.02", "Klaviatuur: dokumentide lisamine (lohistamisala / „+ Lisa dokument”) on Tab-iga kättesaadav", has(x => /startFileIn|startDrop|planFileIn|stFileIn/.test(x.id) || /Lisa dokument|Lohista/.test(x.t)), seq.map(x => x.id || x.tag + ":" + x.t).filter(Boolean).slice(0, 40).join(" › "));
  const upl = await p.evaluate(() => ["#startDrop", "#stDrop", 'label[for="planFileIn"]', "#startFileIn", "#stFileIn", "#planFileIn"].map(s => { const e = document.querySelector(s); return e ? `${s}: tabIndex=${e.tabIndex}, hidden=${e.hidden}` : s + ": puudub"; }));
  L.note("üleslaadimise elemendid: " + upl.join("; "));
  const noRing = seq.filter(x => !x.ring);
  L.check("J6.kb.03", "Klaviatuur: fookus on nähtav (outline või box-shadow) kõigil fookustatud elementidel", !noRing.length, noRing.slice(0, 10).map(x => `${x.tag}#${x.id} ${x.t}`));
  // ülevaate aken: Esc sulgeb, fookus ei põgene taha
  await setupKase(p); await L.go(p, "algatamine"); await L.step(p, "act");
  await p.evaluate(() => { const b = document.querySelector('[data-sub="done"]'); b && b.click(); }); await L.sleep(200);
  await p.evaluate(() => document.querySelector('#actFields [data-dl="akt"]').focus()); await p.keyboard.press("Enter"); await L.sleep(400);
  const opened = await p.evaluate(() => !document.querySelector("#reviewPop").hidden);
  let escaped = 0; for (let i = 0; i < 60; i++) { await p.keyboard.press("Tab"); if (await p.evaluate(() => !document.querySelector("#reviewPop").contains(document.activeElement))) { escaped++; break; } }
  await p.keyboard.press("Escape"); await L.sleep(300);
  const closed = await p.evaluate(() => document.querySelector("#reviewPop").hidden);
  L.check("J6.kb.04", "Kontrollaken: Enter avab, Esc sulgeb", opened && closed, { opened, closed });
  L.check("J6.kb.05", "Kontrollaken (aria-modal): Tab ei vii fookust akna taha", !escaped, { escaped });
  await ctx.close();
}
module.exports = { run };
