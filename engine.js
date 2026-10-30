/*
 * Kaksiku eelmudeli arvutusmootor (TwinEngine)
 * ---------------------------------------------------------------
 * Referentsimplementatsioon digitaalse kaksiku prognoosimoodulile.
 * Pärineb Raplamaa juhtimiskeskuse (põhimudel v6) arvutusloogikast,
 * mis on siin eraldatud kasutajaliidesest ja tehtud omavalitsusest sõltumatuks.
 *
 * Põhimõtted
 *  - Kõik funktsioonid on puhtad: sisend on andmeobjekt (ctx) ja parameetrid,
 *    väljund on uus objekt. Globaalset olekut ei ole.
 *  - Omavalitsused tulevad konfiguratsioonist (kov.json). Uue omavalitsuse
 *    lisamiseks ei pea koodi muutma.
 *  - Iga funktsiooni sisendid ja väljundid on kirjeldatud massiivis API,
 *    mida kasutajaliides näitab dokumentatsioonina.
 *  - selfTest() kontrollib, et mootor annab Rapla maakonna valdadele samad
 *    tulemused mis põhimudel (reference.json, koostatud tools/rak_reference.js abil
 *    otse põhimudeli lähtekoodist).
 *  - 2.0.0: üheaastaste vanuste kohortmootor (põhimudel v6), kalibreerimine 2023–2025,
 *    rändemustrid registriparandusega (otsus E1).
 *
 * Töötab brauseris (window.TwinEngine) ja Node'is (module.exports).
 */
(function (root) {
  "use strict";

  const VERSION = "2.0.0 (30.10.2026)";
  const G = 18;
  const AGEL = ["0–4","5–9","10–14","15–19","20–24","25–29","30–34","35–39","40–44","45–49","50–54","55–59","60–64","65–69","70–74","75–79","80–84","85+"];
  /* Vanuserühmade suremus (promill), Eesti üldprofiil; tase kalibreeritakse iga omavalitsuse tegelike surmade järgi */
  const MORT = [0.6,0.1,0.1,0.3,0.5,0.6,0.8,1.2,1.8,2.8,4.3,6.8,10.5,15,23,37,62,150].map(v => v / 1000);
  /* Lisarände vanusejaotus (pere sisseränne) */
  const GEN = [.10,.08,.05,.02,0,.08,.16,.15,.11,.07,.05,.04,.03,.02,.02,.01,.01,0];
  const YI = y => y - 2015;
  const sum = a => a.reduce((x, y) => x + (y || 0), 0);
  const sumG = (a, i, j) => { let s = 0; for (let g = i; g <= j; g++) s += a[g]; return s; };
  /* Haridusnõudluse vanuseproksid 5-aastastest rühmadest */
  const laP = a => 0.8 * a[0] + 0.4 * a[1];        // 1–6-aastased
  const pkP = a => 0.6 * a[1] + a[2] + 0.2 * a[3];  // 7–15-aastased
  const gP  = a => 0.6 * a[3];                      // 16–18-aastased

  /* ---------------- Kalibreerimine ---------------- */
  function ageOf(pop, y) { return pop.age[String(y)]; }
  function kCal(pop, a, b) { let D = 0, E = 0; for (let y = a; y <= b; y++) { D += pop.d[YI(y)]; E += ageOf(pop, y).reduce((s, x, g) => s + x * MORT[g], 0); } return D / E; }
  function fertCal(pop, a, b) { let B = 0, W = 0; for (let y = a; y <= b; y++) { B += pop.b[YI(y)]; const p = ageOf(pop, y); W += p[4] + p[5] + p[6] + p[7]; } return B / W; }
  function balance(pop, a, b) { let B = 0, D = 0; for (let y = a; y < b; y++) { B += pop.b[YI(y)]; D += pop.d[YI(y)]; } return (pop.tot[String(b)] - pop.tot[String(a)] - B + D) / (b - a); }
  function regBal(pop, a, b) { let s = 0; for (let y = a; y < b; y++) s += pop.mi[YI(y)] - pop.mo[YI(y)]; return s / (b - a); }

  /* ---------------- Üheaastaste vanuste mootor (põhimudel v6) ----------------
   * Vanused 0..84 ja 85+. Viieaastased rühmad jaotatakse algaastal ühtlaselt (0–4 sünnipõlvkondade järgi)
   * ja kohort liigub igal aastal täpselt ühe aasta võrra. Väljund agregeeritakse tagasi 18 rühmaks. */
  const A1 = 86, GOF = a => a >= 85 ? 17 : Math.floor(a / 5);
  function toSingle(pop, y, P) {
    const S = new Array(A1).fill(0);
    for (let g = 0; g < 17; g++) {
      let w = [1, 1, 1, 1, 1];
      if (g === 0) { const bb = [1, 2, 3, 4, 5].map(i => { const j = YI(y - i); return j >= 0 && j < pop.b.length ? pop.b[j] : null; }); if (bb.every(x => x != null)) w = bb; }
      const ws = sum(w); for (let i = 0; i < 5; i++) S[g * 5 + i] = P[g] * w[i] / ws;
    }
    S[85] = P[17]; return S;
  }
  function toGroups(S) { const P = new Array(G).fill(0); for (let a = 0; a < A1; a++) P[GOF(a)] += S[a]; return P; }
  /** Üks aasta: ellujäämine, vananemine ühe aasta võrra, sünnid (20–39-aastaste järgi või tegelikud B), ränne R (18 rühma, jagatud rühma vanustele). */
  function step1(S, k, f, R, B) {
    const N = new Array(A1).fill(0);
    for (let a = 0; a < A1; a++) { const s = S[a] * (1 - MORT[GOF(a)] * k); if (a < 84) N[a + 1] += s; else N[85] += s; }
    let W = 0; for (let a = 20; a <= 39; a++) W += S[a]; N[0] += B != null ? B : f * W;
    for (let a = 0; a < A1; a++) N[a] = Math.max(0, N[a] + (a >= 85 ? R[17] : R[GOF(a)] / 5));
    return N;
  }
  /** projectFrom: lähteaasta vanusjaotusest; f ja k võivad olla arvud või funktsioonid aastast; BS(y) annab tegelikud sünnid. */
  function projectFrom(pop, start, end, R, f, kf, BS, addFn) {
    let S = toSingle(pop, start, ageOf(pop, start)); const out = { [start]: ageOf(pop, start).slice() };
    for (let y = start; y < end; y++) {
      const Ry = addFn ? addFn(y, R) : R;
      S = step1(S, typeof kf === "function" ? kf(y) : kf, typeof f === "function" ? f(y) : f, Ry, BS ? BS(y) : null); out[y + 1] = toGroups(S);
    }
    return out;
  }
  /** Bilansiline kohordijääk aastas: rühmade ränne, mis sama mootoriga (tegelikud sünnid, perioodi suremus) kordab lõppaasta vanusjaotust. */
  function resid(pop, a, b, k) {
    const P1 = ageOf(pop, b), bs = y => pop.b[YI(y)]; let R = new Array(G).fill(0);
    for (let it = 0; it < 80; it++) {
      const p = projectFrom(pop, a, b, R, 0, k, bs)[b]; let mx = 0;
      R = R.map((x, g) => { const d = (P1[g] - p[g]) / 3; mx = Math.max(mx, Math.abs(d)); return x + d; });
      if (mx < 0.005) break;
    }
    return R;
  }
  /** Kalibreerib ühe omavalitsuse (põhimudel v6): suremustase k (2023–2025), sündimus f ja viis rändemustrit. */
  function calibrate(pop, migV) {
    const C = { k: kCal(pop, 2023, 2025), k1620: kCal(pop, 2016, 2020), k2125: kCal(pop, 2021, 2025) };
    C.f = fertCal(pop, 2023, 2025); C.fOld = fertCal(pop, 2016, 2020); C.fMid = fertCal(pop, 2021, 2025);
    C.r1full = resid(pop, 2016, 2021, C.k1620); C.r2full = resid(pop, 2021, 2026, C.k2125);
    C.korr1 = balance(pop, 2016, 2021) - regBal(pop, 2016, 2021); C.korr2 = balance(pop, 2021, 2026) - regBal(pop, 2021, 2026);
    C.r1 = C.r1full.map((x, g) => x - C.korr1 * GEN[g]); C.r2 = C.r2full.map((x, g) => x - C.korr2 * GEN[g]);
    C.mean = C.r1.map((x, g) => (x + C.r2[g]) / 2);
    const M = migV, mb = (M[2019] + M[2021] + M[2024]) / 3, exc = M[2022] + M[2023] - 2 * mb; C.uaExc = exc;
    C.r2x = C.r2.map((x, g) => x - exc / 5 * GEN[g]);
    const L3 = regBal(pop, 2024, 2026), s2x = sum(C.r2x); C.bal3 = L3; C.r3 = C.r2x.map((x, g) => x + (L3 - s2x) * GEN[g]);
    return C;
  }
  function e0(k) { let l = 1, e = 0; for (let g = 0; g < G; g++) { const m = MORT[g] * k; if (g === G - 1) { e += l / m; break; } const s = Math.pow(1 - m, 5); e += l * (1 - s) / m; l *= s; } return e; }
  function slope(P) { const mx = sum(P.map(p => p[0])) / P.length, my = sum(P.map(p => p[1])) / P.length; return sum(P.map(p => (p[0] - mx) * (p[1] - my))) / sum(P.map(p => (p[0] - mx) ** 2)); }
  /** Piirkonna parameetrid: sündimuse trend (log-lineaarne kalle) ja eluea kasvust tulenev suremuse langus. */
  function regionParams(pops, e0Series) {
    const P = []; for (let y = 2021; y <= 2025; y++) { let B = 0, W = 0; pops.forEach(p => { B += p.b[YI(y)]; const a = ageOf(p, y); W += a[4] + a[5] + a[6] + a[7]; }); P.push([y, Math.log(B / W)]); }
    const fslope = slope(P);
    let D = 0, E = 0; pops.forEach(p => { for (let y = 2023; y <= 2025; y++) { D += p.d[YI(y)]; E += ageOf(p, y).reduce((s, x, g) => s + x * MORT[g], 0); } });
    const kc = D / E, e0m = e0(kc), e0sl = slope(Object.entries(e0Series).map(([y, v]) => [+y, v]));
    const tgt = e0m + e0sl * 10; let lo = 0.3, hi = 1; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (e0(kc * m) > tgt) lo = m; else hi = m; }
    return { fslope, kc, e0m, e0sl, lam: 1 - Math.pow((lo + hi) / 2, 1 / 10) };
  }

  /* ---------------- Konteksti ehitamine ---------------- */
  /**
   * build(data) koostab mudeli konteksti.
   * data = { kov, pop, fin:{FINS,MTA,BUD}, edu, ext, settlements }
   */
  function build(data) {
    const ctx = { data, units: {}, regions: {}, cfg: data.kov.params };
    const U = data.kov.units;
    U.forEach(u => { ctx.units[u.id] = { ...u, cal: calibrate(data.pop[u.id], data.ext.MIGV[u.id]) }; });
    const regs = [...new Set(U.map(u => u.region))];
    regs.forEach(r => {
      const members = U.filter(u => u.region === r).map(u => u.id);
      ctx.regions[r] = { members, ...regionParams(members.map(id => data.pop[id]), data.ext.E0R[ctx.units[members[0]].e0Ref]) };
    });
    ctx.aggregates = {}; (data.kov.aggregates || []).forEach(a => ctx.aggregates[a.id] = a);
    ctx.tax = buildTax(ctx);
    ctx.eduBase = {}; U.forEach(u => ctx.eduBase[u.id] = eduBase(ctx, u.id));
    ctx.uc = {}; U.forEach(u => ctx.uc[u.id] = unitCosts(ctx, u.id));
    return ctx;
  }

  /* ---------------- Projektsioon ---------------- */
  function fertMul(ctx, region, y, p) {
    if (p.fertTr === "down") return Math.exp(ctx.regions[region].fslope * (Math.min(y, 2030) - 2024));
    if (p.fertTr === "sa") { const t = ctx.data.ext.SA.E.tfr; return (t[y] != null ? t[y] : t[2036]) / t[2024]; }
    return 1;
  }
  function mortMul(ctx, region, y, p) { return p.mort === "tr" ? Math.pow(1 - ctx.regions[region].lam, y - 2024) : 1; }
  const DEF = { mig: "mean", extra: 0, fert: 0, fertTr: "const", mort: "const", vx: 0, add: null, start: 2026, end: 2036 };
  /**
   * project(ctx, unitId, params) → { [aasta]: vanusevektor(18) }
   * params.extra = lisaränne piirkonda aastas (jagatakse rahvaarvu järgi), params.vx = lisaränne sellesse omavalitsusse aastas,
   * params.add = { [aasta]: inimesi } ajas muutuv lisaränne (nt elamuarendus).
   */
  function project(ctx, id, params) {
    const p = { ...DEF, ...params }, u = ctx.units[id], reg = ctx.regions[u.region], C = u.cal, pop = ctx.data.pop[id];
    const tot = sum(reg.members.map(m => ctx.data.pop[m].tot[String(p.start)])), share = pop.tot[String(p.start)] / tot;
    const base = (p.R || C[p.mig]).map((x, g) => x + (p.extra * share + p.vx) * GEN[g]);
    const kf = y => C.k * mortMul(ctx, u.region, y, p), ff = y => C.f * (1 + p.fert / 100) * fertMul(ctx, u.region, y, p);
    const addFn = p.add ? (y, R) => { const a = p.add[y + 1] || 0; return a ? R.map((x, g) => x + a * GEN[g]) : R; } : null;
    return projectFrom(pop, p.start, p.end, base, ff, kf, null, addFn);
  }
  /** Agregaadi (nt maakond) projektsioon liikmete summana. */
  function projectAgg(ctx, aggId, params) {
    const m = ctx.aggregates[aggId].members, parts = m.map(id => project(ctx, id, params)), out = {};
    Object.keys(parts[0]).forEach(y => out[y] = new Array(G).fill(0).map((_, g) => sum(parts.map(P => P[y][g]))));
    return out;
  }
  const total = a => sum(a);

  /* ---------------- Haridus ---------------- */
  /** Hariduse baas 2026: lasteaialapsed, põhikooli- ja gümnaasiumiõpilased. Ilma andmeteta omavalitsusel hinnang proksi kaudu. */
  function eduBase(ctx, id) {
    const E = ctx.data.edu, a0 = ageOf(ctx.data.pop[id], ctx.cfg.start);
    if (E.pupils[id]) return { la: E.la[id], pk: E.pupils[id].tot - E.pupils[id].g, g: E.pupils[id].g, src: "andmed" };
    const px = ctx.cfg.eduProxyFrom, b = ageOf(ctx.data.pop[px], ctx.cfg.start), P = E.pupils[px];
    return { la: E.la[px] / laP(b) * laP(a0), pk: (P.tot - P.g) / pkP(b) * pkP(a0), g: P.g / gP(b) * gP(a0), src: "hinnang (osalusmäär " + px + " järgi)" };
  }
  /** Haridusnõudlus valitud aasta vanusevektori järgi. */
  function eduDemand(ctx, id, a) {
    const B = ctx.eduBase[id], a0 = ageOf(ctx.data.pop[id], ctx.cfg.start);
    return { la: B.la * laP(a) / laP(a0), pk: B.pk * pkP(a) / pkP(a0), g: B.g ? B.g * gP(a) / gP(a0) : 0, sc: B.pk * pkP(a) / pkP(a0) + (B.g ? B.g * gP(a) / gP(a0) : 0) };
  }
  const med3 = a => a.slice().sort((x, y) => x - y)[1];
  /** Ühikukulud (€ aastas): lasteaialaps, õpilane, 80+ elanik. RR302 kulude 2023–2025 mediaan. */
  function unitCosts(ctx, id) {
    const F = ctx.data.ext.FUNC, B = ctx.eduBase[id], a0 = ageOf(ctx.data.pop[id], ctx.cfg.start), o80 = a0[16] + a0[17];
    if (F.la[id]) return { la: med3(F.la[id]) * 1000 / B.la, sc: med3(F.kool[id]) * 1000 / (B.pk + B.g), o80: med3(F.eak[id]) * 1000 / o80, src: "RR302" };
    const px = ctx.cfg.eduProxyFrom, q = unitCosts(ctx, px); return { ...q, src: "hinnang (" + px + " ühikukulu)" };
  }

  /* ---------------- Tulumaks ---------------- */
  function buildTax(ctx) {
    const { MTA, BUD, FINS } = ctx.data.fin, pop = ctx.data.pop, T = {};
    const withMta = Object.keys(MTA.tm26);
    withMta.forEach(v => {
      const js26 = sum(MTA.tm26[v]), js25 = sum(MTA.tm25[v].slice(0, 9)), g = js26 / js25;
      const est = MTA.tm26[v].concat(MTA.tm25[v].slice(9).map(x => x * g));
      T[v] = { g, js26, js25, est26: sum(est), src: "MTA kuuandmed" };
    });
    const gAvg = sum(withMta.map(v => T[v].js26)) / sum(withMta.map(v => T[v].js25));
    Object.keys(ctx.units).forEach(v => { if (!T[v]) { const n3 = FINS[v].n3; T[v] = { g: gAvg, est26: n3[n3.length - 1] * 1000 * gAvg, src: "hinnang: RR300 2025 × Raplamaa 2026 kasvutempo" }; } });
    const o65 = v => sumG(ageOf(pop[v], 2026), 13, 17);
    const PEN65 = BUD.Rapla.b26.pens / o65("Rapla");
    const PSHARE = { Rapla: BUD.Rapla.b26.pens / BUD.Rapla.b26.tax, Kohila: BUD.Kohila.pens[2] / BUD.Kohila.tax[2] };
    Object.keys(ctx.units).forEach(v => { if (PSHARE[v] == null) PSHARE[v] = PEN65 * o65(v) / T[v].est26; });
    const PJUMP27 = ((BUD.Rapla.pens[3] / BUD.Rapla.pens[2]) + (BUD.Kohila.pens[3] / BUD.Kohila.pens[2])) / 2;
    return { T, PSHARE, PJUMP27 };
  }
  /** Tulumaksu rida 2017–2036 eurodes. ages(y) annab vanusevektori (ajalugu + projektsioon). */
  function taxSeries(ctx, id, ages, p) {
    const W = ctx.cfg.wageGrowth, out = {}, F = ctx.data.fin.FINS[id].n3;
    for (let i = 0; i < F.length; i++) out[2017 + i] = F[i] * 1000;
    const t = ctx.tax.T[id], ps = ctx.tax.PSHARE[id]; out[2026] = t.est26;
    const w26 = sumG(ages(2026), 4, 12), o26 = sumG(ages(2026), 13, 17); let idx = 1, pidx = 1;
    const wage = p && p.wage != null ? p.wage : W.default, emp = p && p.emp != null ? p.emp : ctx.cfg.employmentBase;
    for (let y = 2027; y <= ctx.cfg.end; y++) {
      const g = 1 + (W[y] != null ? W[y] : wage) / 100; idx *= g; pidx *= (y === 2027 ? ctx.tax.PJUMP27 : g);
      const em = 1 + (emp / ctx.cfg.employmentBase - 1) * Math.min(1, (y - 2026) / 4);
      out[y] = t.est26 * ((1 - ps) * idx * em * sumG(ages(y), 4, 12) / w26 + ps * pidx * sumG(ages(y), 13, 17) / o26);
    }
    return out;
  }
  /** Palgaindeks (2026 = 1), et nominaalsed summad 2026. aasta hindadesse viia. */
  function wageIdx(ctx, y, p) { const W = ctx.cfg.wageGrowth, wage = p && p.wage != null ? p.wage : W.default; let i = 1; for (let t = 2027; t <= y; t++) i *= 1 + (W[t] != null ? W[t] : wage) / 100; return i; }
  const agesFn = (ctx, id, P) => y => y <= ctx.cfg.start ? ageOf(ctx.data.pop[id], y) : P[y];

  /* ---------------- Kasutusjuht: elamuarendus ---------------- */
  const HH = { korter: 2.1, ridaelamu: 2.8, eramu: 3.1 };
  /**
   * housingImpact(ctx, id, inp, params)
   * inp = { n: eluruume, type: korter|ridaelamu|eramu, start: esimene asustamise aasta, years: asustamise kestus,
   *         hh: leibkonna suurus (vaikimisi tüübi järgi), occ: täituvus 0–1, outside: väljastpoolt omavalitsust tulijate osakaal 0–1,
   *         settlement: asula nimi (valikuline), capLa, capSc: kohtade arv (valikuline), priceLa, priceSc: € koha kohta }
   */
  function housingImpact(ctx, id, inp, params) {
    const p = { ...DEF, ...params }, hh = inp.hh || HH[inp.type] || 2.5, occ = inp.occ != null ? inp.occ : 0.95, out = inp.outside != null ? inp.outside : 0.7;
    const years = Math.max(1, inp.years || 1), per = inp.n / years * hh * occ * out, add = {};
    for (let i = 0; i < years; i++) { const y = inp.start + i; if (y > p.start && y <= p.end) add[y] = (add[y] || 0) + per; }
    const base = project(ctx, id, p), scen = project(ctx, id, { ...p, add });
    const tb = taxSeries(ctx, id, agesFn(ctx, id, base), p), ts = taxSeries(ctx, id, agesFn(ctx, id, scen), p);
    const uc = ctx.uc[id], com = ctx.data.ext.COM[id], tlnShare = com ? com.tln / com.t : 0, empRate = 0.75;
    const rows = [];
    for (let y = p.start; y <= p.end; y++) {
      const db = eduDemand(ctx, id, base[y]), ds = eduDemand(ctx, id, scen[y]);
      const dPop = total(scen[y]) - total(base[y]), dLa = ds.la - db.la, dSc = ds.sc - db.sc, dPk = ds.pk - db.pk;
      const dO80 = (scen[y][16] + scen[y][17]) - (base[y][16] + base[y][17]), dW = sumG(scen[y], 4, 12) - sumG(base[y], 4, 12);
      rows.push({ y, added: add[y] || 0, dPop, dLa, dSc, dPk, baseLa: db.la, baseSc: db.sc, scenLa: ds.la, scenSc: ds.sc,
        dTax: ts[y] - tb[y], dTaxR: (ts[y] - tb[y]) / wageIdx(ctx, y, p), dCost: dLa * uc.la + dSc * uc.sc + dO80 * uc.o80, dWorkers: dW * empRate, dTln: dW * empRate * tlnShare });
    }
    const peak = k => rows.reduce((m, r) => r[k] > m[k] ? r : m, rows[0]);
    const capLa = inp.capLa != null ? inp.capLa : ctx.eduBase[id].la, capSc = inp.capSc != null ? inp.capSc : ctx.eduBase[id].pk + ctx.eduBase[id].g;
    const shortLa = Math.max(0, ...rows.map(r => r.scenLa - capLa)), shortSc = Math.max(0, ...rows.map(r => r.scenSc - capSc));
    const shortLaBase = Math.max(0, ...rows.map(r => r.baseLa - capLa)), shortScBase = Math.max(0, ...rows.map(r => r.baseSc - capSc));
    const priceLa = inp.priceLa || 30000, priceSc = inp.priceSc || 25000;
    const firstShort = (k, cap) => { const r = rows.find(r => r[k] > cap); return r ? r.y : null; };
    const st = settlementInfo(ctx, id, inp.settlement);
    return { inp: { ...inp, hh, occ, outside: out }, newcomers: sum(Object.values(add)), rows,
      peakLa: peak("dLa"), peakSc: peak("dSc"), last: rows[rows.length - 1],
      cap: { la: capLa, sc: capSc, shortLa, shortSc, shortLaBase, shortScBase, firstLa: firstShort("scenLa", capLa), firstSc: firstShort("scenSc", capSc), firstLaBase: firstShort("baseLa", capLa), firstScBase: firstShort("baseSc", capSc),
        investLa: Math.max(0, shortLa - shortLaBase) * priceLa, investSc: Math.max(0, shortSc - shortScBase) * priceSc, priceLa, priceSc },
      settlement: st, tlnShare, ucSrc: uc.src, eduSrc: ctx.eduBase[id].src, taxSrc: ctx.tax.T[id].src };
  }

  /* ---------------- Kasutusjuht: investeeringuvajadus ---------------- */
  /** investNeed: võrdleb nõudlust kohtade arvuga aastate kaupa ja annab puudujäägi, esimese puudujäägi aasta ja investeeringu hinnangu. */
  function investNeed(ctx, id, P, cap) {
    const B = ctx.eduBase[id], capLa = cap && cap.la != null ? cap.la : B.la, capSc = cap && cap.sc != null ? cap.sc : B.pk + B.g;
    const priceLa = cap && cap.priceLa || 30000, priceSc = cap && cap.priceSc || 25000, rows = [];
    for (let y = ctx.cfg.start; y <= ctx.cfg.end; y++) { const d = eduDemand(ctx, id, P[y]); rows.push({ y, la: d.la, sc: d.sc, gapLa: d.la - capLa, gapSc: d.sc - capSc }); }
    const maxLa = Math.max(...rows.map(r => r.gapLa)), maxSc = Math.max(...rows.map(r => r.gapSc));
    const fy = k => { const r = rows.find(r => r[k] > 0.5); return r ? r.y : null; };
    return { capLa, capSc, rows, maxGapLa: maxLa, maxGapSc: maxSc, firstLa: fy("gapLa"), firstSc: fy("gapSc"),
      investLa: Math.max(0, maxLa) * priceLa, investSc: Math.max(0, maxSc) * priceSc, priceLa, priceSc,
      surplusLa: -Math.min(...rows.map(r => r.gapLa)), surplusSc: -Math.min(...rows.map(r => r.gapSc)) };
  }
  /** Investeeringu mõju netovõlakoormusele (% põhitegevuse tuludest 2025), kui investeering kaetakse laenuga. */
  function debtEffect(ctx, id, invest) {
    const F = ctx.data.fin.FINS[id].n1, inc = F[F.length - 1] * 1000, B = ctx.data.fin.BUD[id];
    const net = B && B.net ? B.net[B.y.indexOf(2025)] : null;
    return { inc, net, before: net != null ? net / inc : null, after: net != null ? (net + invest) / inc : null, add: invest / inc };
  }

  /* ---------------- Kasutusjuht: siht ja vajalik ränne ---------------- */
  /** needExtra: lisaränne omavalitsusse aastas, mis viib rahvaarvu sihtaastaks sihini. */
  function needExtra(ctx, id, target, year, params) {
    const p = { ...DEF, ...params }, f = x => total(project(ctx, id, { ...p, vx: (p.vx || 0) + x })[year]) - target;
    if (f(0) >= 0) return 0; let lo = 0, hi = 4000; if (f(hi) < 0) return Infinity;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (f(m) >= 0) hi = m; else lo = m; }
    return hi;
  }

  /* ---------------- Asulad ja koolitee ---------------- */
  function settlementInfo(ctx, id, name) {
    const S = ctx.data.settlements && ctx.data.settlements[id]; if (!S || !name) return null;
    const r = S.find(x => x[0] === name); if (!r) return null;
    const sch = (ctx.data.edu.schoolSettlements[id] || []).includes(name);
    return { name, pop21: r[1], hasSchool: sch };
  }
  /** settlementLayer: jaotab valla prognoosi asulatesse REL 2021 osakaalude järgi (eeldus: osakaalud püsivad). */
  function settlementLayer(ctx, id, P, year) {
    const S = ctx.data.settlements[id]; if (!S) return null;
    const T = sum(S.map(r => r[1])), L = sum(S.map(r => r[5])), K = sum(S.map(r => r[6])), d = eduDemand(ctx, id, P[year]), tot = total(P[year]);
    const sch = ctx.data.edu.schoolSettlements[id] || [];
    return S.map(r => ({ n: r[0], pop21: r[1], share: r[1] / T, pop: tot * r[1] / T, la: d.la * r[5] / L, pk: d.pk * r[6] / K, school: sch.includes(r[0]), other: /^Muud/.test(r[0]) }));
  }
  /** schoolAccess: põhikooliealised asulates, kus oma põhikooli ei ole (koolitee vajaduse ülemine hinnang). */
  function schoolAccess(ctx, id, P, year) {
    const L = settlementLayer(ctx, id, P, year); if (!L) return null;
    const out = L.filter(r => !r.school), pkOut = sum(out.map(r => r.pk)), pkAll = sum(L.map(r => r.pk));
    return { pkOut, pkAll, share: pkOut / pkAll, rows: L };
  }

  /* ---------------- Täpsus ---------------- */
  const BANDS = [["0–4", 0, 0], ["5–14", 1, 2], ["15–19", 3, 3], ["20–64", 4, 12], ["65+", 13, 17]];
  /**
   * backtest: rangelt väljaspool valimit. Kalibreerimine ainult 2015–2021 andmetega (suremus 2016–2020,
   * sündimus 2016–2020, ränne 2016–2021), projektsioon 2021→2026 ja võrdlus tegelikuga.
   * Lisaks mehaanika kontroll: tegeliku 2021–2026 rändega peab mudel kordama 2026. aastat.
   */
  function backtest(ctx, id) {
    const pop = ctx.data.pop[id], C = ctx.units[id].cal;
    const P = projectFrom(pop, 2021, 2026, C.r1, C.fOld, C.k1620)[2026];          // valimiväline: ainult 2016–2021 teadmised
    const Q = projectFrom(pop, 2021, 2026, C.r2full, C.fMid, C.k2125)[2026];      // valimisisene: tegelik 2021–2026 ränne
    const act = ageOf(pop, 2026);
    const bands = BANDS.map(([l, i, j]) => { const a = sumG(act, i, j), e = sumG(P, i, j); return { l, act: a, est: e, err: e / a - 1 }; });
    return { act: total(act), oos: total(P), ins: total(Q), errOos: total(P) / total(act) - 1, errIns: total(Q) / total(act) - 1, bands,
      mape: sum(bands.map(b => Math.abs(b.err))) / bands.length };
  }

  /* ---------------- Otsuse mõju eelhinnang ---------------- */
  const fmt = v => { const n = Math.round(v), s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); return (n < 0 ? "−" : "") + s; };
  const sgn = v => (Math.round(v) > 0 ? "+" : "") + fmt(v);
  const eurT = v => { const a = Math.abs(v), s = v < 0 ? "−" : ""; if (a >= 1e6) return s + (a / 1e6).toFixed(2).replace(".", ",") + " mln €"; if (a >= 1e3) return s + fmt(a / 1e3) + " tuh €"; return s + fmt(a) + " €"; };
  /**
   * decision(ctx, type, inp, params) → { rows:[{area, now, effect, note}], text }
   * type: "elamu" (detailplaneering/elamuarendus), "kohad" (lasteaia- või koolikohtade muutus), "siht" (rahvaarvu siht).
   * Väljund on struktureeritud mõjude tabel ja seletuskirja mõjude lõigu mustand.
   */
  function decision(ctx, type, inp, params) {
    const u = ctx.units[inp.unit], id = inp.unit, p = { ...DEF, ...params }, E = ctx.cfg.end;
    const base = project(ctx, id, p), rows = [];
    if (type === "elamu") {
      const H = housingImpact(ctx, id, inp, p), L = H.last, pk = H.peakLa, ps = H.peakSc;
      rows.push({ area: "Rahvastik", now: fmt(total(base[E])) + " (" + E + ", ilma otsuseta)", effect: sgn(L.dPop) + " elanikku aastaks " + E, note: fmt(H.newcomers) + " uut elanikku asustamise ajal (" + H.inp.hh.toString().replace(".", ",") + " in/leibkond, täituvus " + Math.round(H.inp.occ * 100) + "%, väljastpoolt " + Math.round(H.inp.outside * 100) + "%)" });
      const capNote = (first, firstB) => !first ? "Nõudlus mahub olemasolevatesse kohtadesse" : firstB && firstB <= first ? "Kohti jääb puudu juba ilma otsuseta alates " + firstB + ". aastast" : "Otsuse tõttu jääb kohti puudu alates " + first + ". aastast";
      rows.push({ area: "Lasteaiakohad", now: fmt(H.cap.la) + " kohta", effect: sgn(pk.dLa) + " last (tipp " + pk.y + ")", note: capNote(H.cap.firstLa, H.cap.firstLaBase) });
      rows.push({ area: "Koolikohad", now: fmt(H.cap.sc) + " kohta", effect: sgn(ps.dSc) + " õpilast (tipp " + ps.y + ")", note: capNote(H.cap.firstSc, H.cap.firstScBase) });
      rows.push({ area: "Investeeringud", now: "–", effect: eurT(H.cap.investLa + H.cap.investSc), note: "Ainult otsusest tulenev lisapuudujääk × " + eurT(H.cap.priceLa) + " lasteaiakoha ja " + eurT(H.cap.priceSc) + " koolikoha kohta (hinnang)" });
      rows.push({ area: "Tulumaks", now: "–", effect: sgn(L.dTaxR / 1000) + " tuh € aastas (" + E + ")", note: "2026. aasta hindades · " + H.taxSrc });
      rows.push({ area: "Teenuste kulud", now: "–", effect: sgn(L.dCost / 1000) + " tuh € aastas (" + E + ")", note: "2025. aasta hindades · ühikukulud: " + H.ucSrc });
      rows.push({ area: "Liikuvus", now: "–", effect: sgn(L.dTln) + " tööl käijat Tallinnas", note: "REL 2021 pendelrände osakaal " + Math.round(H.tlnShare * 100) + "%" });
      if (H.settlement) rows.push({ area: "Koolitee", now: H.settlement.name, effect: H.settlement.hasSchool ? "Asulas on põhikool" : "Asulas põhikooli ei ole", note: H.settlement.hasSchool ? "Õpilased saavad käia kodukohas" : sgn(ps.dPk) + " põhikooliõpilast vajab transporti" });
      const net = L.dTaxR - L.dCost;
      const text = u.name + " kavandab " + fmt(inp.n) + " eluruumiga " + ({ korter: "korterelamu", ridaelamu: "ridaelamu", eramu: "eramute" }[inp.type] || "elamu") + "arendust" + (H.settlement ? " (asukoht: " + H.settlement.name + ")" : "") + ", mille asustamine algab " + inp.start + ". aastal. " +
        "Mudeli hinnangul lisandub arendusega " + fmt(H.newcomers) + " elanikku ning " + E + ". aastal on valla rahvaarv " + sgn(L.dPop) + " inimese võrra suurem kui ilma arenduseta. " +
        "Lasteaiakohtade nõudlus kasvab tipus " + fmt(pk.dLa) + " lapse ja koolikohtade nõudlus " + fmt(ps.dSc) + " õpilase võrra. " +
        (H.cap.firstLa || H.cap.firstSc ? "Olemasolevatest kohtadest ei piisa" + (H.cap.firstLa ? " lasteaias alates " + H.cap.firstLa + ". aastast" : "") + (H.cap.firstLa && H.cap.firstSc ? " ja" : "") + (H.cap.firstSc ? " koolis alates " + H.cap.firstSc + ". aastast" : "") + ((H.cap.firstLaBase && H.cap.firstLa && H.cap.firstLaBase <= H.cap.firstLa) || (H.cap.firstScBase && H.cap.firstSc && H.cap.firstScBase <= H.cap.firstSc) ? " (puudujääk tekib osaliselt ka ilma arenduseta)" : "") + ". Otsusest tulenev lisainvesteeringu vajadus on hinnanguliselt " + eurT(H.cap.investLa + H.cap.investSc) + ". " : "Olemasolevad lasteaia- ja koolikohad katavad lisanduva nõudluse. ") +
        "Füüsilise isiku tulumaksu laekumine suureneb " + E + ". aastaks umbes " + eurT(L.dTaxR) + " aastas ja teenuste kulud umbes " + eurT(L.dCost) + " aastas (2026. aasta hindades), mis teeb valla eelarvele aastas " + (net >= 0 ? "positiivse mõju " + eurT(net) : "negatiivse mõju " + eurT(-net)) + ". " +
        (H.settlement && !H.settlement.hasSchool ? "Arenduse asukohas (" + H.settlement.name + ") põhikooli ei ole, seega lisandub koolitranspordi vajadus umbes " + fmt(ps.dPk) + " õpilasele. " : "") +
        "Hinnang põhineb kohortmudelil ja valla keskmistel näitajatel; see ei asenda detailset mõjude analüüsi.";
      return { type, rows, text, H };
    }
    if (type === "kohad") {
      const kind = inp.kind || "la", delta = inp.delta || 0, year = inp.year || p.start + 1, B = ctx.eduBase[id];
      const cap0 = kind === "la" ? (inp.cap != null ? inp.cap : B.la) : (inp.cap != null ? inp.cap : B.pk + B.g);
      const uc = ctx.uc[id][kind === "la" ? "la" : "sc"], varShare = inp.varShare != null ? inp.varShare : 0.6, price = inp.price || (kind === "la" ? 30000 : 25000);
      const yrs = []; for (let y = p.start; y <= E; y++) { const d = eduDemand(ctx, id, base[y]), dem = kind === "la" ? d.la : d.sc, cap = cap0 + (y >= year ? delta : 0); yrs.push({ y, dem, cap, util: dem / cap }); }
      const before = yrs.find(r => r.y === Math.max(p.start, year - 1)), after = yrs.find(r => r.y === year), end = yrs[yrs.length - 1];
      const lbl = kind === "la" ? "Lasteaiakohad" : "Koolikohad";
      rows.push({ area: lbl, now: fmt(cap0) + " kohta", effect: sgn(delta) + " kohta alates " + year, note: "Täituvus " + Math.round(before.util * 100) + "% → " + Math.round(after.util * 100) + "%" });
      rows.push({ area: "Nõudlus " + E, now: fmt(yrs[0].dem), effect: fmt(end.dem), note: "Täituvus " + E + ": " + Math.round(end.util * 100) + "%" + (end.util > 1 ? " (puudujääk " + fmt(end.dem - end.cap) + ")" : end.util < 0.85 ? " (vabu kohti " + fmt(end.cap - end.dem) + ")" : "") });
      rows.push({ area: "Investeering", now: "–", effect: delta > 0 ? eurT(delta * price) : "0 €", note: delta > 0 ? eurT(price) + " koha kohta (hinnang)" : "Kohtade vähendamine investeeringut ei vaja" });
      rows.push({ area: "Tegevuskulu", now: "–", effect: sgn(delta * uc * varShare / 1000) + " tuh € aastas", note: "Ühikukulu " + fmt(uc) + " € × muutuvkulu osa " + Math.round(varShare * 100) + "% (hinnang)" });
      const text = u.name + " kavandab " + (delta >= 0 ? "suurendada " : "vähendada ") + (kind === "la" ? "lasteaiakohtade" : "koolikohtade") + " arvu " + fmt(Math.abs(delta)) + " koha võrra alates " + year + ". aastast. " +
        "Praegu on kohti " + fmt(cap0) + " ja nõudlus on mudeli järgi " + fmt(yrs[0].dem) + "; " + E + ". aastaks muutub nõudlus " + fmt(end.dem) + "-ni. Pärast muudatust on täituvus " + year + ". aastal " + Math.round(after.util * 100) + "% ja " + E + ". aastal " + Math.round(end.util * 100) + "%. " +
        (delta > 0 ? "Investeeringuvajadus on hinnanguliselt " + eurT(delta * price) + ". " : "") +
        "Aastane tegevuskulu muutub umbes " + eurT(delta * uc * varShare) + ". Hinnang põhineb kohortmudelil ja valla keskmisel ühikukulul.";
      return { type, rows, text, yrs };
    }
    if (type === "siht") {
      const target = inp.target, year = inp.year || 2035, need = needExtra(ctx, id, target, year, p), scen = isFinite(need) ? project(ctx, id, { ...p, vx: (p.vx || 0) + need }) : base;
      const d0 = eduDemand(ctx, id, base[year]), d1 = eduDemand(ctx, id, scen[year]);
      const wi = wageIdx(ctx, year, p), t0 = taxSeries(ctx, id, agesFn(ctx, id, base), p)[year] / wi, t1 = taxSeries(ctx, id, agesFn(ctx, id, scen), p)[year] / wi;
      const dw = isFinite(need) ? need / 2.4 : null;
      rows.push({ area: "Rahvaarv " + year, now: fmt(total(base[year])) + " (valitud stsenaarium)", effect: "siht " + fmt(target), note: need === 0 ? "Siht täitub ilma lisarändeta" : isFinite(need) ? "Vajab lisarännet " + sgn(need) + " inimest aastas" : "Siht ei ole realistlik (üle 4000 in/a)" });
      if (isFinite(need) && need > 0) {
        rows.push({ area: "Eluruumid", now: "–", effect: "≈ " + fmt(dw) + " eluruumi aastas", note: "2,4 elanikku eluruumi kohta (hinnang)" });
        rows.push({ area: "Lasteaiakohad", now: fmt(d0.la), effect: sgn(d1.la - d0.la) + " last (" + year + ")", note: "Võrreldes valitud stsenaariumiga" });
        rows.push({ area: "Koolikohad", now: fmt(d0.sc), effect: sgn(d1.sc - d0.sc) + " õpilast (" + year + ")", note: "Võrreldes valitud stsenaariumiga" });
        rows.push({ area: "Tulumaks", now: eurT(t0), effect: sgn((t1 - t0) / 1000) + " tuh € aastas", note: "2026. aasta hindades · " + ctx.tax.T[id].src });
      }
      const text = u.name + " arengukava siht on " + fmt(target) + " elanikku aastaks " + year + ". Valitud stsenaariumi järgi on rahvaarv sel aastal " + fmt(total(base[year])) + ". " +
        (need === 0 ? "Siht täitub ilma lisarändeta." : isFinite(need) ? "Sihi saavutamiseks peaks valda lisaks rändama keskmiselt " + fmt(need) + " inimest aastas, mis tähendab umbes " + fmt(dw) + " uut eluruumi aastas. Lasteaiakohtade nõudlus suureneb siis " + fmt(d1.la - d0.la) + " ja koolikohtade nõudlus " + fmt(d1.sc - d0.sc) + " võrra ning tulumaksu laekumine " + eurT(t1 - t0) + " aastas." : "Sihi saavutamiseks vajalik ränne ületab 4000 inimest aastas; siht ei ole mudeli järgi realistlik.");
      return { type, rows, text, need };
    }
    throw new Error("Tundmatu otsuse tüüp: " + type);
  }

  /* ---------------- Enesetest ---------------- */
  /** selfTest(ctx, ref) → [{id, name, ok, detail}] Võrdleb põhimudeliga ja kontrollib sisemist kooskõla. */
  function selfTest(ctx, ref) {
    const R = [], ok = (id, name, cond, detail) => R.push({ id, name, ok: !!cond, detail });
    const V = ctx.aggregates.MAAK.members, near = (a, b, t) => Math.abs(a - b) <= t;
    // T1–T2 projektsioon
    let maxd = 0; Object.keys(ref.SC).forEach(m => V.concat("MAAK").forEach(u => [2031, 2036].forEach(y => {
      const v = u === "MAAK" ? total(projectAgg(ctx, "MAAK", { mig: m })[y]) : total(project(ctx, u, { mig: m })[y]); maxd = Math.max(maxd, Math.abs(v - ref.SC[m][u][y])); })));
    ok("T1", "Rahvaarvu prognoos kattub põhimudeliga (5 rändemustrit × 4 valda + maakond, 2031 ja 2036)", maxd < 1e-6, "suurim erinevus " + maxd.toExponential(1) + " inimest");
    let maxv = 0; V.forEach(u => { const P = project(ctx, u, {})[2036]; P.forEach((x, g) => maxv = Math.max(maxv, Math.abs(x - ref.PROJ2036[u][g]))); });
    ok("T2", "Vanuserühmad 2036 kattuvad põhimudeliga (vaikestsenaarium)", maxv < 1e-3, "suurim erinevus " + maxv.toExponential(1));
    let maxc = 0; V.forEach(u => ["k", "f", "fOld", "fMid", "uaExc", "bal3"].forEach(k => maxc = Math.max(maxc, Math.abs(ctx.units[u].cal[k] - ref.CAL[u][k]))));
    ok("T3", "Kalibreerimisparameetrid (suremus, sündimus, rändeerand) kattuvad", maxc < 1e-9, "suurim erinevus " + maxc.toExponential(1));
    let maxt = 0; V.forEach(u => { const P = project(ctx, u, {}), t = taxSeries(ctx, u, agesFn(ctx, u, P)); [2026, 2030, 2036].forEach(y => maxt = Math.max(maxt, Math.abs(t[y] - ref.tax[u][y]))); });
    ok("T4", "Tulumaksu prognoos kattub põhimudeliga (2026, 2030, 2036)", maxt < 0.01, "suurim erinevus " + maxt.toFixed(4) + " €");
    let maxe = 0; V.forEach(u => { const d = eduDemand(ctx, u, project(ctx, u, {})[2036]); maxe = Math.max(maxe, Math.abs(d.la - ref.edu[u].la), Math.abs(d.sc - ref.edu[u].sc)); });
    ok("T5", "Lasteaia- ja koolinõudlus 2036 kattub põhimudeliga", maxe < 1e-6, "suurim erinevus " + maxe.toExponential(1));
    const rg = ctx.regions.RAPLA; ok("T6", "Piirkonna trendid (sündimuse kalle, eluea kasv) kattuvad", near(rg.fslope, ref.FSLOPE, 1e-12) && near(rg.lam, ref.LAM, 1e-12), "kalle " + rg.fslope.toFixed(5) + ", λ " + rg.lam.toFixed(5));
    // sisemine kooskõla
    let bad = [], maxa = 0; Object.keys(ctx.units).forEach(u => { const pop = ctx.data.pop[u]; Object.keys(pop.age).forEach(y => { const d = pop.tot[y] - sum(pop.age[y]); if (d) { bad.push(u + " " + y + " (" + (d > 0 ? "+" : "") + d + ")"); maxa = Math.max(maxa, Math.abs(d)); } }); });
    ok("T7", "Lähteandmed: vanuserühmade summa erineb rahvaarvust kõige rohkem 3 inimese võrra", maxa <= 3, bad.length ? bad.length + " juhtu, suurim " + maxa + " inimest: " + bad.join(", ") : "kõik summad täpsed");
    const rae = ctx.units.Rae ? project(ctx, "Rae", {}) : null;
    ok("T8", "Pilootvalla (Rae) projektsioon on arvutatav ja positiivne", rae && Object.values(rae).every(a => a.every(x => isFinite(x) && x >= 0)), rae ? "2036: " + fmt(total(rae[2036])) + " elanikku" : "Rae puudub");
    const H = housingImpact(ctx, "Kohila", { n: 120, type: "korter", start: 2028, years: 1, occ: 1, outside: 1, hh: 2 }, {}), r28 = H.rows.find(r => r.y === 2028);
    ok("T9", "Elamuarendus: lisandunud elanikud jõuavad rahvaarvu (240 inimest, 2028)", near(r28.dPop, 240, 0.5), "rahvaarvu muutus " + r28.dPop.toFixed(2));
    let maxi = 0; Object.keys(ctx.units).forEach(u => maxi = Math.max(maxi, Math.abs(backtest(ctx, u).errIns)));
    ok("T10", "Mehaanika: tegeliku 2021–2026 rändega kordab mudel 2026. aastat alla 0,5% veaga", maxi < 0.005, "suurim viga " + (maxi * 100).toFixed(2) + "%");
    let maxs = 0; Object.keys(ctx.units).forEach(u => { const L = settlementLayer(ctx, u, project(ctx, u, {}), 2036); if (L) maxs = Math.max(maxs, Math.abs(sum(L.map(r => r.share)) - 1)); });
    ok("T11", "Asulakiht: osakaalud summeeruvad 100%-ni", maxs < 1e-9, "suurim kõrvalekalle " + maxs.toExponential(1));
    return R;
  }

  /* ---------------- API kirjeldus ---------------- */
  const API = [
    { fn: "build(data)", in: "data = { kov, pop, fin, edu, ext, settlements }", out: "ctx: kalibreeritud omavalitsused, piirkonnad, maksu- ja hariduse baas, ühikukulud", desc: "Ehitab mudeli konteksti. Kutsutakse üks kord andmete laadimisel." },
    { fn: "calibrate(pop, migV)", in: "ühe omavalitsuse rahvastikuandmed; välisrände saldo aastate kaupa", out: "{ k, f, fOld, fMid, r1, mean, r2, r2x, r3, uaExc, bal3 }", desc: "Suremustase, sündimus ja viis rändemustrit (vanuserühmade rändejääk aastas)." },
    { fn: "regionParams(pops, e0Series)", in: "piirkonna omavalitsuste andmed; oodatav eluiga aastate kaupa", out: "{ fslope, kc, e0m, e0sl, lam }", desc: "Sündimuse trend ja suremuse langus piirkonnas." },
    { fn: "project(ctx, id, params)", in: "params = { mig, extra, vx, add, fert, fertTr, mort, start, end }", out: "{ aasta: vanusevektor[18] }", desc: "Kohortprojektsioon ühe aasta sammuga. add lubab ajas muutuvat lisarännet (elamuarendus)." },
    { fn: "projectAgg(ctx, aggId, params)", in: "agregaadi id (nt MAAK)", out: "{ aasta: vanusevektor[18] }", desc: "Liikmete projektsioonide summa." },
    { fn: "eduBase(ctx, id)", in: "omavalitsus", out: "{ la, pk, g, src }", desc: "Lasteaialapsed, põhikooli- ja gümnaasiumiõpilased 2026. Ilma andmeteta proksi kaudu (märgitud src-s)." },
    { fn: "eduDemand(ctx, id, ages)", in: "vanusevektor", out: "{ la, pk, g, sc }", desc: "Lasteaia- ja koolinõudlus vanusestruktuuri muutuse järgi." },
    { fn: "unitCosts(ctx, id)", in: "omavalitsus", out: "{ la, sc, o80, src } € aastas", desc: "Ühikukulud RR302 tegevusalade kuludest." },
    { fn: "taxSeries(ctx, id, ages, params)", in: "vanusevektori funktsioon aasta järgi; { wage, emp }", out: "{ aasta: € }", desc: "Füüsilise isiku tulumaks: palgaosa tööealiste ja palgakasvu, pensioniosa 65+ järgi." },
    { fn: "housingImpact(ctx, id, inp, params)", in: "inp = { n, type, start, years, hh, occ, outside, settlement, capLa, capSc, priceLa, priceSc }", out: "{ rows[aasta]: dPop, dLa, dSc, dTax, dCost, dTln …, cap, settlement }", desc: "Elamuarenduse mõju rahvastikule, teenustele, eelarvele ja liikuvusele." },
    { fn: "investNeed(ctx, id, P, cap)", in: "projektsioon; { la, sc, priceLa, priceSc }", out: "{ rows, maxGapLa, maxGapSc, firstLa, firstSc, investLa, investSc }", desc: "Kohtade puudujääk aastate kaupa ja investeeringu hinnang." },
    { fn: "debtEffect(ctx, id, invest)", in: "investeering €", out: "{ before, after, add }", desc: "Laenuga kaetud investeeringu mõju netovõlakoormusele." },
    { fn: "needExtra(ctx, id, target, year, params)", in: "sihtrahvaarv ja aasta", out: "inimesi aastas", desc: "Lisaränne, mis on vaja sihi saavutamiseks." },
    { fn: "settlementLayer(ctx, id, P, year)", in: "projektsioon ja aasta", out: "[{ n, share, pop, la, pk, school }]", desc: "Valla prognoos asulate kaupa REL 2021 osakaalude järgi." },
    { fn: "schoolAccess(ctx, id, P, year)", in: "projektsioon ja aasta", out: "{ pkOut, pkAll, share, rows }", desc: "Põhikooliealised asulates, kus kooli ei ole." },
    { fn: "backtest(ctx, id)", in: "omavalitsus", out: "{ errOos, errIns, bands[], mape }", desc: "Tagantjärele prognoos 2021→2026 ainult 2021. aastani teada olnud andmetega." },
    { fn: "decision(ctx, type, inp, params)", in: "type = elamu | kohad | siht", out: "{ rows[{area, now, effect, note}], text }", desc: "Otsuse mõju eelhinnang ja seletuskirja mõjude lõigu mustand." },
    { fn: "selfTest(ctx, ref)", in: "reference.json", out: "[{ id, name, ok, detail }]", desc: "Võrdlus põhimudeliga ja sisemise kooskõla kontroll." }
  ];

  const TwinEngine = { VERSION, G, AGEL, MORT, GEN, HH, BANDS, laP, pkP, gP, sum, sumG, calibrate, regionParams, toSingle, toGroups, projectFrom, build, project, projectAgg, total,
    eduBase, eduDemand, unitCosts, taxSeries, wageIdx, agesFn, housingImpact, investNeed, debtEffect, needExtra, settlementLayer, schoolAccess, settlementInfo,
    backtest, decision, selfTest, API, fmt, eurT };
  if (typeof module !== "undefined" && module.exports) module.exports = TwinEngine; else root.TwinEngine = TwinEngine;
})(typeof window !== "undefined" ? window : globalThis);
