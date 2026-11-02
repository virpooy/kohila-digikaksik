/*
 * Kohila digikaksiku arvutusmootor (TwinEngine)
 * =============================================================================
 * Prognoosimooduli referentsimplementatsioon. Arvutusloogika pärineb Raplamaa
 * juhtimiskeskuse põhimudelist v6 (üheaastased kohordid, registriparandusteta
 * ränne, suremus 2023–2025) ning on siin eraldatud kasutajaliidesest ja tehtud
 * omavalitsusest sõltumatuks.
 *
 * Põhimõtted
 *  - Kõik funktsioonid on puhtad: sisend on kontekst (ctx) ja parameetrid,
 *    väljund on uus objekt. Globaalset olekut ei ole.
 *  - Omavalitsused, piirkonnad ja agregaadid tulevad failist data/kov.json.
 *    Uue omavalitsuse lisamiseks ei pea koodi muutma.
 *  - Avaliku API funktsioonid on kirjeldatud massiivis API (kasutajaliides
 *    näitab seda dokumentatsioonina).
 *  - selfTest() võrdleb mootorit põhimudeliga (data/reference.json) ja
 *    kontrollib sisemist kooskõla. Node'i pariteeditest (tests/parity.test.js)
 *    tõendab, et 3.0.0 annab samad tulemused mis 2.2.0.
 *
 * Töötab brauseris (window.TwinEngine) ja Node'is (module.exports).
 *
 * Muudatuste logi
 *  - 2.0.0  Üheaastaste vanuste kohortmootor (põhimudel v6), kalibreerimine
 *           2023–2025, rändemustrid registriparandusega (otsus E1).
 *  - 2.2.0  Elamuarendus (E2–E8), tasandusfond (E6), võla rada (E10),
 *           mitme arenduse koosmõju, stsenaariumid, eesmärkide seire.
 *  - 3.0.0  Mootor kirjutatud nullist ümber loetavaks (sektsioonid, kommentaarid,
 *           kirjeldavad nimed). Avalik API, väljundite kuju ja kõik arvulised
 *           tulemused on samad mis 2.2.0 (tõestus: tests/parity.test.js).
 *           Ainus sisuline muudatus – vea parandus: otsuse "elamu" seletuskirja
 *           tekst arvutas tulu ja kulu vahe kujul dTaxR − dCost ning jättis
 *           tasandusfondi kao (E6) välja. Nüüd kasutab tekst neto väärtust
 *           dNet = dTaxR − dTf − dCost ja nimetab tasandusfondi kao eraldi.
 *           Pensioniosa (tulumaks) ja enesetesti pilootvallad ei ole enam
 *           koodis nimeliselt kirjas, vaid tuletatakse andmetest.
 *  - 3.0.1  Tulumaksu 2026 hinnang: kuude arv tuleb MTA andmetest (tm26 pikkus),
 *           mitte fikseeritud 9-st, et kuine andmeuuendus ei liidaks hinnangusse
 *           13 kuud. 9 kuu andmetega on tulemus sama (pariteet); enesetest T19.
 */
(function (root) {
  "use strict";

  /* ===========================================================================
   * 1. KONSTANDID
   * ======================================================================== */

  const VERSION = "3.0.1 (02.11.2026)";

  /** Viieaastaste vanuserühmade arv (0–4 … 85+). */
  const G = 18;

  /** Vanuserühmade sildid. */
  const AGEL = ["0–4", "5–9", "10–14", "15–19", "20–24", "25–29", "30–34", "35–39", "40–44",
    "45–49", "50–54", "55–59", "60–64", "65–69", "70–74", "75–79", "80–84", "85+"];

  /** Vanuserühmade suremus (promill → osakaal), Eesti üldprofiil.
   *  Taset korrigeeritakse iga omavalitsuse tegelike surmade järgi (kordaja k). */
  const MORT = [0.6, 0.1, 0.1, 0.3, 0.5, 0.6, 0.8, 1.2, 1.8, 2.8, 4.3, 6.8, 10.5, 15, 23, 37, 62, 150]
    .map(promill => promill / 1000);

  /** Lisarände vanusejaotus (pere sisseränne), summa 1. */
  const GEN = [0.10, 0.08, 0.05, 0.02, 0, 0.08, 0.16, 0.15, 0.11, 0.07, 0.05, 0.04, 0.03, 0.02, 0.02, 0.01, 0.01, 0];

  /** Tagasitesti vanusevahemikud: [silt, esimene rühm, viimane rühm]. */
  const BANDS = [["0–4", 0, 0], ["5–14", 1, 2], ["15–19", 3, 3], ["20–64", 4, 12], ["65+", 13, 17]];

  /** Üheaastaste vanuste arv mootoris: 0..84 ja 85+. */
  const SINGLE_AGES = 86;

  /** Rahvastikuandmete aegrea esimene aasta (pop.b, pop.d, pop.mi, pop.mo indeks 0). */
  const FIRST_DATA_YEAR = 2015;

  /** Maksu- ja Tolliameti kuuandmete aasta. Kasvutempo arvutatakse 2026. aasta
   *  olemasolevatest kuudest (tm26 pikkus) vs 2025 sama periood (3.0.1). */
  const TAX_YEAR = 2026;

  /** Elamuarenduse vaikeväärtused, kui kov.json params.housing puudub (otsused E2–E4).
   *  hh = elanikke eluruumi kohta, kids = laste kordaja eluruumi kohta,
   *  occ = täituvus, outside = väljastpoolt omavalitsust tulijate osa. */
  const HOUSING = {
    hh: { eramu: 3.0, ridaelamu: 2.8, korter: 2.1 },
    kids: { eramu: 1.5, ridaelamu: 1.4, korter: 1.0 },
    occ: 0.95,
    outside: 0.7
  };
  const HH = HOUSING.hh;

  /** Projektsiooni vaikeparameetrid. */
  const DEF = { mig: "mean", extra: 0, fert: 0, fertTr: "const", mort: "const", vx: 0, add: null, start: 2026, end: 2036 };

  /** Tööhõive määr lisanduvate tööealiste puhul (pendelrände hinnang). */
  const EMPLOYMENT_RATE = 0.75;

  /** Rahvaarvu sihi otsingu ülemine piir (inimest aastas). */
  const NEED_MAX = 4000;

  /* ===========================================================================
   * 2. ABIFUNKTSIOONID
   * ======================================================================== */

  /** Aasta → aegrea indeks (2015 = 0). */
  const yearIndex = year => year - FIRST_DATA_YEAR;

  /** Massiivi summa; puuduvad ja nullväärtused loetakse nulliks. */
  const sum = values => values.reduce((acc, v) => acc + (v || 0), 0);

  /** Vanuserühmade from..to (kaasa arvatud) summa. */
  const sumG = (ages, from, to) => {
    let s = 0;
    for (let g = from; g <= to; g++) s += ages[g];
    return s;
  };

  /** Vanusevektori kogusumma (rahvaarv). */
  const total = ages => sum(ages);

  /** Haridusnõudluse vanuseproksid viieaastastest rühmadest. */
  const laP = a => 0.8 * a[0] + 0.4 * a[1];        // 1–6-aastased (lasteaed)
  const pkP = a => 0.6 * a[1] + a[2] + 0.2 * a[3];  // 7–15-aastased (põhikool)
  const gP = a => 0.6 * a[3];                       // 16–18-aastased (gümnaasium)

  /** Kolme arvu mediaan. */
  const median3 = values => values.slice().sort((x, y) => x - y)[1];

  /** Omavalitsuse vanusevektor (18 rühma) antud aastal lähteandmetest. */
  const ageOf = (pop, year) => pop.age[String(year)];

  /** Üheaastane vanus → viieaastase rühma indeks. */
  const groupOfAge = age => age >= 85 ? 17 : Math.floor(age / 5);

  /** Arv või aasta funktsioon → väärtus antud aastal. */
  const valueAt = (numOrFn, year) => typeof numOrFn === "function" ? numOrFn(year) : numOrFn;

  /** Uus nullidega vanusevektor. */
  const zeros = n => new Array(n).fill(0);

  /** Lineaarse regressiooni kalle punktidest [[x, y], …]. */
  function slope(points) {
    const meanX = sum(points.map(p => p[0])) / points.length;
    const meanY = sum(points.map(p => p[1])) / points.length;
    const cov = sum(points.map(p => (p[0] - meanX) * (p[1] - meanY)));
    const varX = sum(points.map(p => (p[0] - meanX) ** 2));
    return cov / varX;
  }

  /** Oodatav eluiga sünnil suremuskordaja k korral (viieaastased rühmad, 85+ avatud). */
  function lifeExpectancy(k) {
    let alive = 1, years = 0;
    for (let g = 0; g < G; g++) {
      const m = MORT[g] * k;
      if (g === G - 1) {
        years += alive / m;
        break;
      }
      const survive5 = Math.pow(1 - m, 5);
      years += alive * (1 - survive5) / m;
      alive *= survive5;
    }
    return years;
  }

  /** Täisarv tuhandeliste tühikutega; miinusmärk on "−" (U+2212). */
  const fmt = v => {
    const n = Math.round(v);
    const digits = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (n < 0 ? "−" : "") + digits;
  };

  /** Märgiga täisarv ("+12", "−3", "0"). */
  const sgn = v => (Math.round(v) > 0 ? "+" : "") + fmt(v);

  /** Eurosumma loetavalt: mln € (2 komakohta), tuh € või €. */
  const eurT = v => {
    const abs = Math.abs(v), sign = v < 0 ? "−" : "";
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2).replace(".", ",") + " mln €";
    if (abs >= 1e3) return sign + fmt(abs / 1e3) + " tuh €";
    return sign + fmt(abs) + " €";
  };

  /* ===========================================================================
   * 3. KOHORTMOOTOR (üheaastased vanused, põhimudel v6)
   * Vanused 0..84 ja 85+. Viieaastased rühmad jaotatakse algaastal ühtlaselt
   * (0–4 sünnipõlvkondade järgi) ja kohort liigub igal aastal täpselt ühe aasta
   * võrra. Väljund agregeeritakse tagasi 18 rühmaks.
   * ======================================================================== */

  /**
   * toSingle: 18 rühma → 86 üheaastast vanust.
   * Sisend: pop (sünnid pop.b), aasta, vanusevektor P. Rühm 0–4 jaotatakse
   * viimase viie aasta sündide järgi, kui need on olemas, muidu ühtlaselt.
   */
  function toSingle(pop, year, P) {
    const S = zeros(SINGLE_AGES);
    for (let g = 0; g < 17; g++) {
      let weights = [1, 1, 1, 1, 1];
      if (g === 0) {
        const births = [1, 2, 3, 4, 5].map(back => {
          const j = yearIndex(year - back);
          return j >= 0 && j < pop.b.length ? pop.b[j] : null;
        });
        if (births.every(b => b != null)) weights = births;
      }
      const weightSum = sum(weights);
      for (let i = 0; i < 5; i++) S[g * 5 + i] = P[g] * weights[i] / weightSum;
    }
    S[85] = P[17];
    return S;
  }

  /** toGroups: 86 üheaastast vanust → 18 rühma. */
  function toGroups(S) {
    const P = zeros(G);
    for (let age = 0; age < SINGLE_AGES; age++) P[groupOfAge(age)] += S[age];
    return P;
  }

  /**
   * Üks projektsiooniaasta: ellujäämine (suremus × k), vananemine ühe aasta
   * võrra, sünnid (20–39-aastaste naisproksi × f või tegelikud sünnid births)
   * ning ränne R (18 rühma; rühma ränne jagatakse viie vanuse vahel, 85+ tervikuna).
   * Negatiivne tulemus lõigatakse nulliks.
   */
  function stepYear(S, k, f, R, births) {
    const N = zeros(SINGLE_AGES);
    for (let age = 0; age < SINGLE_AGES; age++) {
      const survivors = S[age] * (1 - MORT[groupOfAge(age)] * k);
      if (age < 84) N[age + 1] += survivors;
      else N[85] += survivors;
    }
    let women = 0;
    for (let age = 20; age <= 39; age++) women += S[age];
    N[0] += births != null ? births : f * women;
    for (let age = 0; age < SINGLE_AGES; age++) {
      const migration = age >= 85 ? R[17] : R[groupOfAge(age)] / 5;
      N[age] = Math.max(0, N[age] + migration);
    }
    return N;
  }

  /**
   * projectFrom: projektsioon lähteaasta vanusjaotusest.
   * Sisend: pop, start, end, R (ränne 18 rühma), f ja kf (sündimus, suremuskordaja –
   * arv või funktsioon aastast), birthsFn(y) (tegelikud sünnid, valikuline),
   * addFn(y, R) (aastati muutuv ränne, valikuline).
   * Väljund: { [aasta]: vanusevektor(18) }.
   */
  function projectFrom(pop, start, end, R, f, kf, birthsFn, addFn) {
    let S = toSingle(pop, start, ageOf(pop, start));
    const out = { [start]: ageOf(pop, start).slice() };
    for (let y = start; y < end; y++) {
      const migration = addFn ? addFn(y, R) : R;
      S = stepYear(S, valueAt(kf, y), valueAt(f, y), migration, birthsFn ? birthsFn(y) : null);
      out[y + 1] = toGroups(S);
    }
    return out;
  }

  /* ===========================================================================
   * 4. KALIBREERIMINE (otsus E1)
   * ======================================================================== */

  /** Suremuskordaja k: tegelikud surmad / profiili järgi oodatud surmad aastatel from..to. */
  function mortalityLevel(pop, from, to) {
    let deaths = 0, expected = 0;
    for (let y = from; y <= to; y++) {
      deaths += pop.d[yearIndex(y)];
      expected += ageOf(pop, y).reduce((s, x, g) => s + x * MORT[g], 0);
    }
    return deaths / expected;
  }

  /** Sündimus f: sünnid / 20–39-aastased aastatel from..to. */
  function fertilityRate(pop, from, to) {
    let births = 0, women = 0;
    for (let y = from; y <= to; y++) {
      births += pop.b[yearIndex(y)];
      const a = ageOf(pop, y);
      women += a[4] + a[5] + a[6] + a[7];
    }
    return births / women;
  }

  /** Bilansiline rändesaldo aastas: rahvaarvu muutus miinus loomulik iive, perioodil [from, to). */
  function balanceMigration(pop, from, to) {
    let births = 0, deaths = 0;
    for (let y = from; y < to; y++) {
      births += pop.b[yearIndex(y)];
      deaths += pop.d[yearIndex(y)];
    }
    return (pop.tot[String(to)] - pop.tot[String(from)] - births + deaths) / (to - from);
  }

  /** Registreeritud rändesaldo aastas (sisse- miinus väljaränne). Vahe bilansilisega on registriparandus. */
  function registeredMigration(pop, from, to) {
    let s = 0;
    for (let y = from; y < to; y++) s += pop.mi[yearIndex(y)] - pop.mo[yearIndex(y)];
    return s / (to - from);
  }

  /**
   * Bilansiline kohordijääk aastas: rühmade ränne R, mis sama mootoriga
   * (tegelikud sünnid, perioodi suremus k) kordab lõppaasta vanusjaotust.
   * Iteratsioon: R += (tegelik − mudel) / 3, kuni muutus < 0,005 (max 80 korda).
   */
  function cohortResidual(pop, from, to, k) {
    const target = ageOf(pop, to);
    const actualBirths = y => pop.b[yearIndex(y)];
    let R = zeros(G);
    for (let iter = 0; iter < 80; iter++) {
      const modelled = projectFrom(pop, from, to, R, 0, k, actualBirths)[to];
      let maxChange = 0;
      R = R.map((x, g) => {
        const d = (target[g] - modelled[g]) / 3;
        maxChange = Math.max(maxChange, Math.abs(d));
        return x + d;
      });
      if (maxChange < 0.005) break;
    }
    return R;
  }

  /**
   * calibrate(pop, migV): ühe omavalitsuse kalibreerimine (põhimudel v6).
   * Väljund: suremustasemed (k 2023–2025, k1620, k2125), sündimus (f, fOld, fMid),
   * täisjäägid r1full/r2full, registriparandused korr1/korr2 ja viis rändemustrit:
   * r1 (2016–2021), r2 (2021–2026), mean, r2x (2022–23 välisrände erand maha), r3 (2024–2026 tase).
   */
  function calibrate(pop, migV) {
    const C = {
      k: mortalityLevel(pop, 2023, 2025),
      k1620: mortalityLevel(pop, 2016, 2020),
      k2125: mortalityLevel(pop, 2021, 2025)
    };
    C.f = fertilityRate(pop, 2023, 2025);
    C.fOld = fertilityRate(pop, 2016, 2020);
    C.fMid = fertilityRate(pop, 2021, 2025);

    // Kohordijäägid ja registriparandus (bilansiline − registreeritud saldo)
    C.r1full = cohortResidual(pop, 2016, 2021, C.k1620);
    C.r2full = cohortResidual(pop, 2021, 2026, C.k2125);
    C.korr1 = balanceMigration(pop, 2016, 2021) - registeredMigration(pop, 2016, 2021);
    C.korr2 = balanceMigration(pop, 2021, 2026) - registeredMigration(pop, 2021, 2026);
    C.r1 = C.r1full.map((x, g) => x - C.korr1 * GEN[g]);
    C.r2 = C.r2full.map((x, g) => x - C.korr2 * GEN[g]);
    C.mean = C.r1.map((x, g) => (x + C.r2[g]) / 2);

    // Välisrände erand 2022–2023 (Ukraina) võrreldes 2019, 2021, 2024 keskmisega
    const normalLevel = (migV[2019] + migV[2021] + migV[2024]) / 3;
    const excess = migV[2022] + migV[2023] - 2 * normalLevel;
    C.uaExc = excess;
    C.r2x = C.r2.map((x, g) => x - excess / 5 * GEN[g]);

    // Viimase kahe aasta registreeritud tase
    const recent = registeredMigration(pop, 2024, 2026);
    const r2xTotal = sum(C.r2x);
    C.bal3 = recent;
    C.r3 = C.r2x.map((x, g) => x + (recent - r2xTotal) * GEN[g]);
    return C;
  }

  /* ===========================================================================
   * 5. PIIRKONNA PARAMEETRID
   * ======================================================================== */

  /**
   * regionParams(pops, e0Series): piirkonna sündimuse trend ja suremuse langus.
   * fslope = log(sünnid/20–39) kalle 2021–2025; kc = piirkonna suremustase 2023–2025;
   * e0m = selle oodatav eluiga; e0sl = eluea kasv aastas (e0Series); lam = suremuse
   * aastane langus, mis viib 10 aastaga eluea tasemele e0m + 10·e0sl.
   */
  function regionParams(pops, e0Series) {
    const points = [];
    for (let y = 2021; y <= 2025; y++) {
      let births = 0, women = 0;
      pops.forEach(pop => {
        births += pop.b[yearIndex(y)];
        const a = ageOf(pop, y);
        women += a[4] + a[5] + a[6] + a[7];
      });
      points.push([y, Math.log(births / women)]);
    }
    const fslope = slope(points);

    let deaths = 0, expected = 0;
    pops.forEach(pop => {
      for (let y = 2023; y <= 2025; y++) {
        deaths += pop.d[yearIndex(y)];
        expected += ageOf(pop, y).reduce((s, x, g) => s + x * MORT[g], 0);
      }
    });
    const kc = deaths / expected;
    const e0m = lifeExpectancy(kc);
    const e0sl = slope(Object.entries(e0Series).map(([y, v]) => [+y, v]));

    // Poolitusmeetod: kordaja m, mille korral e0(kc·m) = siht
    const target = e0m + e0sl * 10;
    let lo = 0.3, hi = 1;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (lifeExpectancy(kc * mid) > target) lo = mid;
      else hi = mid;
    }
    return { fslope, kc, e0m, e0sl, lam: 1 - Math.pow((lo + hi) / 2, 1 / 10) };
  }

  /* ===========================================================================
   * 6. KONTEKST (build)
   * ======================================================================== */

  /**
   * build(data) → ctx
   * data = { kov, pop, fin: { FINS, MTA, BUD }, edu, ext, settlements }
   * ctx = { data, units: { id: { …kov.json üksus, cal } }, regions, cfg (= kov.params),
   *         aggregates, tax: { T, PSHARE, PJUMP27 }, eduBase, uc }
   */
  function build(data) {
    const ctx = { data, units: {}, regions: {}, cfg: data.kov.params };
    const unitList = data.kov.units;

    unitList.forEach(u => {
      ctx.units[u.id] = { ...u, cal: calibrate(data.pop[u.id], data.ext.MIGV[u.id]) };
    });

    const regionIds = [...new Set(unitList.map(u => u.region))];
    regionIds.forEach(regionId => {
      const members = unitList.filter(u => u.region === regionId).map(u => u.id);
      const e0Series = data.ext.E0R[ctx.units[members[0]].e0Ref];
      ctx.regions[regionId] = { members, ...regionParams(members.map(id => data.pop[id]), e0Series) };
    });

    ctx.aggregates = {};
    (data.kov.aggregates || []).forEach(a => { ctx.aggregates[a.id] = a; });

    ctx.tax = buildTax(ctx);
    ctx.eduBase = {};
    unitList.forEach(u => { ctx.eduBase[u.id] = eduBase(ctx, u.id); });
    ctx.uc = {};
    unitList.forEach(u => { ctx.uc[u.id] = unitCosts(ctx, u.id); });
    return ctx;
  }

  /* ===========================================================================
   * 7. PROJEKTSIOON
   * ======================================================================== */

  /** Sündimuse kordaja aastal y: "down" = piirkonna trend kuni 2030, "sa" = Statistikaameti TFR, muidu 1. */
  function fertilityMultiplier(ctx, regionId, y, p) {
    if (p.fertTr === "down") return Math.exp(ctx.regions[regionId].fslope * (Math.min(y, 2030) - 2024));
    if (p.fertTr === "sa") {
      const tfr = ctx.data.ext.SA.E.tfr;
      return (tfr[y] != null ? tfr[y] : tfr[2036]) / tfr[2024];
    }
    return 1;
  }

  /** Suremuse kordaja aastal y: "tr" = eluea kasvu trend (λ), muidu 1. */
  function mortalityMultiplier(ctx, regionId, y, p) {
    return p.mort === "tr" ? Math.pow(1 - ctx.regions[regionId].lam, y - 2024) : 1;
  }

  /** Lisarände funktsioon addFn(y, R) projektsiooni jaoks parameetritest add/adds (või null). */
  function additionalMigrationFn(p) {
    if (p.adds) {
      return (y, R) => p.adds.reduce((acc, A) => {
        const people = A.add[y + 1] || 0;
        return people ? acc.map((x, g) => x + people * (A.prof || GEN)[g]) : acc;
      }, R);
    }
    if (p.add) {
      return (y, R) => {
        const people = p.add[y + 1] || 0;
        return people ? R.map((x, g) => x + people * (p.addProf || GEN)[g]) : R;
      };
    }
    return null;
  }

  /**
   * project(ctx, unitId, params) → { [aasta]: vanusevektor(18) }
   * params: mig (rändemuster), extra (lisaränne piirkonda aastas, jagatakse rahvaarvu järgi),
   *   vx (lisaränne sellesse omavalitsusse aastas), fert (sündimuse muutus %), fertTr, mort,
   *   add = { [aasta]: inimesi } ajas muutuv lisaränne (addProf = vanusprofiil),
   *   adds = [{ add, prof }] mitu lisarännet korraga, R = oma rändevektor, start, end.
   */
  function project(ctx, id, params) {
    const p = { ...DEF, ...params };
    const unit = ctx.units[id], region = ctx.regions[unit.region], C = unit.cal, pop = ctx.data.pop[id];

    const regionTotal = sum(region.members.map(m => ctx.data.pop[m].tot[String(p.start)]));
    const share = pop.tot[String(p.start)] / regionTotal;
    const migration = (p.R || C[p.mig]).map((x, g) => x + (p.extra * share + p.vx) * GEN[g]);

    const kByYear = y => C.k * mortalityMultiplier(ctx, unit.region, y, p);
    const fByYear = y => C.f * (1 + p.fert / 100) * fertilityMultiplier(ctx, unit.region, y, p);
    return projectFrom(pop, p.start, p.end, migration, fByYear, kByYear, null, additionalMigrationFn(p));
  }

  /** projectAgg(ctx, aggId, params): agregaadi (nt maakond) projektsioon liikmete summana. */
  function projectAgg(ctx, aggId, params) {
    const parts = ctx.aggregates[aggId].members.map(id => project(ctx, id, params));
    const out = {};
    Object.keys(parts[0]).forEach(y => {
      out[y] = zeros(G).map((_, g) => sum(parts.map(P => P[y][g])));
    });
    return out;
  }

  /* ===========================================================================
   * 8. HARIDUS
   * ======================================================================== */

  /**
   * eduBase(ctx, id) → { la, pk, g, src }: lasteaialapsed, põhikooli- ja
   * gümnaasiumiõpilased 2026. Andmeteta omavalitsusel hinnang proksivalla
   * (cfg.eduProxyFrom) osalusmäärade kaudu.
   */
  function eduBase(ctx, id) {
    const E = ctx.data.edu, ages0 = ageOf(ctx.data.pop[id], ctx.cfg.start);
    if (E.pupils[id]) {
      return { la: E.la[id], pk: E.pupils[id].tot - E.pupils[id].g, g: E.pupils[id].g, src: "andmed" };
    }
    const proxy = ctx.cfg.eduProxyFrom;
    const proxyAges = ageOf(ctx.data.pop[proxy], ctx.cfg.start), proxyPupils = E.pupils[proxy];
    return {
      la: E.la[proxy] / laP(proxyAges) * laP(ages0),
      pk: (proxyPupils.tot - proxyPupils.g) / pkP(proxyAges) * pkP(ages0),
      g: proxyPupils.g / gP(proxyAges) * gP(ages0),
      src: "hinnang (osalusmäär " + proxy + " järgi)"
    };
  }

  /** eduDemand(ctx, id, ages) → { la, pk, g, sc }: nõudlus vanusestruktuuri muutuse järgi (sc = pk + g). */
  function eduDemand(ctx, id, ages) {
    const B = ctx.eduBase[id], ages0 = ageOf(ctx.data.pop[id], ctx.cfg.start);
    const la = B.la * laP(ages) / laP(ages0);
    const pk = B.pk * pkP(ages) / pkP(ages0);
    const g = B.g ? B.g * gP(ages) / gP(ages0) : 0;
    return { la, pk, g, sc: pk + g };
  }

  /* ===========================================================================
   * 9. KULUD
   * ======================================================================== */

  /**
   * unitCosts(ctx, id) → { la, sc, o80, src }: ühikukulu € aastas lasteaialapse,
   * õpilase ja 80+ elaniku kohta (RR302 tegevusalade kulude 2023–2025 mediaan).
   * Andmeteta omavalitsusel proksivalla ühikukulud.
   */
  function unitCosts(ctx, id) {
    const F = ctx.data.ext.FUNC, B = ctx.eduBase[id], ages0 = ageOf(ctx.data.pop[id], ctx.cfg.start);
    const over80 = ages0[16] + ages0[17];
    if (F.la[id]) {
      return {
        la: median3(F.la[id]) * 1000 / B.la,
        sc: median3(F.kool[id]) * 1000 / (B.pk + B.g),
        o80: median3(F.eak[id]) * 1000 / over80,
        src: "RR302"
      };
    }
    const proxy = ctx.cfg.eduProxyFrom;
    return { ...unitCosts(ctx, proxy), src: "hinnang (" + proxy + " ühikukulu)" };
  }

  /* ===========================================================================
   * 10. TULUMAKS
   * ======================================================================== */

  /**
   * buildTax(ctx) → { T, PSHARE, PJUMP27 }
   * T[id] = 2026. aasta laekumise hinnang: MTA kuuandmetest (olemasolevate kuude kasvutempo × 2025
   * ülejäänud kuud) või RR300 2025 × MTA valdade keskmine kasvutempo.
   * PSHARE[id] = pensioniosa tulumaksust: 2026. a eelarvest (b26.pens/b26.tax) või
   * eelarvestrateegia 2026. aasta veerust (pens/tax); muidu 65+ elanike arvu järgi
   * eelarves pensioniosa näitavate valdade pension ühe 65+ elaniku kohta.
   * PJUMP27 = pensioniosa hüpe 2027 (eelarvestrateegiate keskmine pens 2027 / 2026).
   */
  function buildTax(ctx) {
    const { MTA, BUD, FINS } = ctx.data.fin, pop = ctx.data.pop;
    const unitIds = Object.keys(ctx.units);
    const T = {};

    // 2026 laekumine MTA kuuandmetest
    const withMta = Object.keys(MTA.tm26);
    withMta.forEach(id => {
      const months = MTA.tm26[id].length;
      const js26 = sum(MTA.tm26[id]);
      const js25 = sum(MTA.tm25[id].slice(0, months));
      const g = js26 / js25;
      const estimate = MTA.tm26[id].concat(MTA.tm25[id].slice(months).map(x => x * g));
      T[id] = { g, js26, js25, est26: sum(estimate), src: "MTA kuuandmed" };
    });
    const gAvg = sum(withMta.map(id => T[id].js26)) / sum(withMta.map(id => T[id].js25));
    unitIds.forEach(id => {
      if (T[id]) return;
      const n3 = FINS[id].n3;
      T[id] = { g: gAvg, est26: n3[n3.length - 1] * 1000 * gAvg, src: "hinnang: RR300 2025 × Raplamaa 2026 kasvutempo" };
    });

    // Pensioniosa
    const over65 = id => sumG(ageOf(pop[id], TAX_YEAR), 13, 17);
    const budgetOf = id => BUD[id] || null;
    const hasBudget26Pension = id => { const B = budgetOf(id); return !!(B && B.b26 && B.b26.pens != null); };
    const strategyColumn = (B, year) => B && B.y && B.pens && B.tax ? B.y.indexOf(year) : -1;

    const pensionRefIds = unitIds.filter(hasBudget26Pension);
    const PEN65 = sum(pensionRefIds.map(id => BUD[id].b26.pens)) / sum(pensionRefIds.map(over65));

    const PSHARE = {};
    unitIds.forEach(id => {
      const B = budgetOf(id), col = strategyColumn(B, TAX_YEAR);
      if (hasBudget26Pension(id)) PSHARE[id] = B.b26.pens / B.b26.tax;
      else if (col >= 0) PSHARE[id] = B.pens[col] / B.tax[col];
    });
    unitIds.forEach(id => {
      if (PSHARE[id] == null) PSHARE[id] = PEN65 * over65(id) / T[id].est26;
    });

    const jumps = unitIds
      .map(id => { const B = budgetOf(id), c26 = strategyColumn(B, TAX_YEAR), c27 = strategyColumn(B, TAX_YEAR + 1);
        return c26 >= 0 && c27 >= 0 ? B.pens[c27] / B.pens[c26] : null; })
      .filter(x => x != null);
    const PJUMP27 = sum(jumps) / jumps.length;

    return { T, PSHARE, PJUMP27 };
  }

  /**
   * taxSeries(ctx, id, ages, params) → { [aasta]: € }, 2017–cfg.end.
   * Ajalugu FINS.n3 järgi, 2026 = T.est26, edasi palgaosa (tööealised 20–64 ×
   * palgaindeks × tööhõive) ja pensioniosa (65+ × pensioniindeks, 2027 hüpe PJUMP27).
   * ages(y) annab vanusevektori; params = { wage, emp } (valikuline).
   */
  function taxSeries(ctx, id, ages, params) {
    const W = ctx.cfg.wageGrowth, out = {}, history = ctx.data.fin.FINS[id].n3;
    for (let i = 0; i < history.length; i++) out[2017 + i] = history[i] * 1000;

    const t = ctx.tax.T[id], pensionShare = ctx.tax.PSHARE[id];
    out[2026] = t.est26;

    const workers26 = sumG(ages(2026), 4, 12), seniors26 = sumG(ages(2026), 13, 17);
    const wage = params && params.wage != null ? params.wage : W.default;
    const emp = params && params.emp != null ? params.emp : ctx.cfg.employmentBase;
    let wageIndex = 1, pensionIndex = 1;
    for (let y = 2027; y <= ctx.cfg.end; y++) {
      const growth = 1 + (W[y] != null ? W[y] : wage) / 100;
      wageIndex *= growth;
      pensionIndex *= (y === 2027 ? ctx.tax.PJUMP27 : growth);
      const employment = 1 + (emp / ctx.cfg.employmentBase - 1) * Math.min(1, (y - 2026) / 4);
      out[y] = t.est26 * ((1 - pensionShare) * wageIndex * employment * sumG(ages(y), 4, 12) / workers26
        + pensionShare * pensionIndex * sumG(ages(y), 13, 17) / seniors26);
    }
    return out;
  }

  /** wageIdx(ctx, y, params): palgaindeks (2026 = 1), et nominaalsummad 2026. a hindadesse viia. */
  function wageIdx(ctx, y, params) {
    const W = ctx.cfg.wageGrowth;
    const wage = params && params.wage != null ? params.wage : W.default;
    let index = 1;
    for (let t = 2027; t <= y; t++) index *= 1 + (W[t] != null ? W[t] : wage) / 100;
    return index;
  }

  /** agesFn(ctx, id, P) → y => vanusevektor: kuni cfg.start lähteandmed, edasi projektsioon P. */
  const agesFn = (ctx, id, P) => y => y <= ctx.cfg.start ? ageOf(ctx.data.pop[id], y) : P[y];

  /* ===========================================================================
   * 11. ELAMUARENDUS (otsused E2–E8)
   * ======================================================================== */

  /** Elamuarenduse eeldused: vaikeväärtused + kov.json params.housing. */
  const housingCfg = ctx => ({ ...HOUSING, ...(ctx.cfg.housing || {}) });

  /**
   * newcomerProfile(ctx, type) → { prof, childScale } (otsus E3)
   * Uustulijate vanusprofiil: GEN, mille laste rühmad (0–19) on skaleeritud suhtega
   * (kids/hh) / keskmine(kids/hh); summa normeeritud 1-le.
   */
  function newcomerProfile(ctx, type) {
    const H = housingCfg(ctx), types = Object.keys(H.hh);
    const kidsPerResident = t => (H.kids[t] || 1) / H.hh[t];
    const average = sum(types.map(kidsPerResident)) / types.length;
    const childScale = H.hh[type] ? kidsPerResident(type) / average : 1;
    const raw = GEN.map((x, g) => g <= 3 ? x * childScale : x);
    const rawTotal = sum(raw);
    return { prof: raw.map(x => x / rawTotal), childScale };
  }

  /**
   * devAdd: ühe arenduse lisanduvad elanikud aastate kaupa ja vanusprofiil.
   * Elanikke aastas = n / years × hh × occ × outside; arvestatakse aastad (start, end].
   * Kui hh on sisestatud, kasutatakse üldist profiili GEN (prof = null, childScale = 1).
   */
  function devAdd(ctx, inp, p) {
    const H = housingCfg(ctx);
    const hh = inp.hh || H.hh[inp.type] || 2.5;
    const occ = inp.occ != null ? inp.occ : H.occ;
    const outside = inp.outside != null ? inp.outside : H.outside;
    const years = Math.max(1, inp.years || 1);
    const perYear = inp.n / years * hh * occ * outside;
    const add = {};
    for (let i = 0; i < years; i++) {
      const y = inp.start + i;
      if (y > p.start && y <= p.end) add[y] = (add[y] || 0) + perYear;
    }
    const profile = newcomerProfile(ctx, inp.type);
    return { add, prof: inp.hh ? null : profile.prof, hh, occ, out: outside, childScale: inp.hh ? 1 : profile.childScale };
  }

  /**
   * devsImpact(ctx, id, devs, params, cap) — mitme arenduse koosmõju (etapp 3).
   * devs = [{ n, type, start, years, hh?, occ?, outside? }]; cap = { la, sc, priceLa, priceSc } (valikuline).
   * Väljund aastate kaupa: rahvastik, lapsed, tulumaks (nominaalne ja 2026. a hindades),
   * täiskulu (RR302), valla piirkulu (E5), tasandusfondi kadu (E6), neto; kohtade puudujääk (E7, E8).
   * Ühe arendusega annab sama tulemuse kui housingImpact.
   */
  function devsImpact(ctx, id, devs, params, capIn) {
    const p = { ...DEF, ...params };
    const parts = devs.map(d => devAdd(ctx, d, p));
    const added = {};
    parts.forEach(part => Object.keys(part.add).forEach(y => { added[y] = (added[y] || 0) + part.add[y]; }));

    const base = project(ctx, id, p);
    const scen = project(ctx, id, { ...p, adds: parts.map(part => ({ add: part.add, prof: part.prof })) });
    const taxBase = taxSeries(ctx, id, agesFn(ctx, id, base), p);
    const taxScen = taxSeries(ctx, id, agesFn(ctx, id, scen), p);

    const uc = ctx.uc[id];
    const marg = (ctx.cfg.margCost || {})[id] || null;              // E5
    const TF = ctx.cfg.tf || { share: 0, cap: {} };                  // E6
    const tfCap = (TF.cap || {})[id];
    const commute = ctx.data.ext.COM[id];
    const tlnShare = commute ? commute.tln / commute.t : 0;

    const rows = [];
    for (let y = p.start; y <= p.end; y++) {
      const db = eduDemand(ctx, id, base[y]), ds = eduDemand(ctx, id, scen[y]);
      const dPop = total(scen[y]) - total(base[y]);
      const dLa = ds.la - db.la, dSc = ds.sc - db.sc, dPk = ds.pk - db.pk;
      const dO80 = (scen[y][16] + scen[y][17]) - (base[y][16] + base[y][17]);
      const dWorkingAge = sumG(scen[y], 4, 12) - sumG(base[y], 4, 12);
      const dTax = taxScen[y] - taxBase[y];
      const dTaxR = dTax / wageIdx(ctx, y, p);
      const dTf = Math.min(tfCap != null ? tfCap : Infinity, Math.max(0, dTaxR) * (TF.share || 0));
      const dCost = dLa * uc.la + dSc * uc.sc + dO80 * uc.o80;
      const dCostMarg = marg ? dLa * marg.la + dSc * marg.sc + dPop * marg.res : null;
      rows.push({
        y, added: added[y] || 0, dPop, dLa, dSc, dPk,
        baseLa: db.la, baseSc: db.sc, scenLa: ds.la, scenSc: ds.sc,
        basePop: total(base[y]), scenPop: total(scen[y]),
        dTax, dTaxR, dTf, dCost, dCostMarg,
        dNet: dTaxR - dTf - dCost,
        dNetMarg: marg ? dTaxR - dTf - dCostMarg : null,
        dWorkers: dWorkingAge * EMPLOYMENT_RATE,
        dTln: dWorkingAge * EMPLOYMENT_RATE * tlnShare
      });
    }

    const peakRow = key => rows.reduce((best, r) => r[key] > best[key] ? r : best, rows[0]);
    const maxShortage = (key, capacity) => Math.max(0, ...rows.map(r => r[key] - capacity));
    const firstShortage = (key, capacity) => { const r = rows.find(x => x[key] > capacity); return r ? r.y : null; };

    const K = capOf(ctx, id, capIn), capLa = K.la, capSc = K.sc, priceLa = K.priceLa, priceSc = K.priceSc;
    const shortLa = maxShortage("scenLa", capLa), shortSc = maxShortage("scenSc", capSc);
    const shortLaBase = maxShortage("baseLa", capLa), shortScBase = maxShortage("baseSc", capSc);

    return {
      newcomers: sum(Object.values(added)),
      rows,
      peakLa: peakRow("dLa"),
      peakSc: peakRow("dSc"),
      last: rows[rows.length - 1],
      parts,
      cap: {
        la: capLa, sc: capSc, src: K.src,
        shortLa, shortSc, shortLaBase, shortScBase,
        firstLa: firstShortage("scenLa", capLa), firstSc: firstShortage("scenSc", capSc),
        firstLaBase: firstShortage("baseLa", capLa), firstScBase: firstShortage("baseSc", capSc),
        investLa: Math.max(0, shortLa - shortLaBase) * priceLa,
        investSc: Math.max(0, shortSc - shortScBase) * priceSc,
        priceLa, priceSc
      },
      tlnShare,
      ucSrc: uc.src,
      margSrc: marg ? "valla piirkulu (kov.json margCost)" : null,
      tf: { share: TF.share || 0, cap: tfCap != null ? tfCap : null },
      eduSrc: ctx.eduBase[id].src,
      taxSrc: ctx.tax.T[id].src
    };
  }

  /**
   * housingImpact(ctx, id, inp, params) — ühe elamuarenduse mõju.
   * inp = { n, type: korter|ridaelamu|eramu, start, years, hh, occ, outside,
   *         settlement, capLa, capSc, priceLa, priceSc }
   * Väljund: devsImpact väljund + inp (täidetud eeldustega), childScale, settlement.
   */
  function housingImpact(ctx, id, inp, params) {
    const R = devsImpact(ctx, id, [inp], params, { la: inp.capLa, sc: inp.capSc, priceLa: inp.priceLa, priceSc: inp.priceSc });
    const part = R.parts[0];
    return {
      ...R,
      inp: { ...inp, hh: part.hh, occ: part.occ, outside: part.out },
      childScale: part.childScale,
      settlement: settlementInfo(ctx, id, inp.settlement)
    };
  }

  /* ===========================================================================
   * 12. STSENAARIUM
   * ======================================================================== */

  /**
   * scenarioRun(ctx, id, sc) — stsenaariumide töölaud.
   * sc = { name, params: { mig, extra, fert }, devs: […], capLa, capSc, capFrom }
   * Väljund: aastate kaupa rahvaarv, lasteaia- ja koolinõudlus, kohad, tulumaks
   * (2026. a hindades), 65+; puudujääk, investeering, sihi täitumine.
   * Kohtade muutus capLa/capSc kehtib alates capFrom (vaikimisi kogu periood).
   */
  function scenarioRun(ctx, id, sc) {
    const p = { ...DEF, ...(sc.params || {}) }, devs = sc.devs || [];
    const P = devs.length
      ? project(ctx, id, { ...p, adds: devs.map(d => { const a = devAdd(ctx, d, p); return { add: a.add, prof: a.prof }; }) })
      : project(ctx, id, p);

    const K0 = capOf(ctx, id), capFrom = sc.capFrom || p.start;
    const capacityAt = (y, suffix) => y >= capFrom && sc["cap" + suffix] != null
      ? sc["cap" + suffix]
      : K0[suffix === "La" ? "la" : "sc"];

    const tax = taxSeries(ctx, id, agesFn(ctx, id, P), p), rows = [];
    for (let y = p.start; y <= p.end; y++) {
      const d = eduDemand(ctx, id, P[y]);
      rows.push({ y, pop: total(P[y]), la: d.la, sc: d.sc, capLa: capacityAt(y, "La"), capSc: capacityAt(y, "Sc"),
        taxR: tax[y] / wageIdx(ctx, y, p), o65: sumG(P[y], 13, 17) });
    }

    const gapLa = Math.max(0, ...rows.map(r => r.la - r.capLa));
    const gapSc = Math.max(0, ...rows.map(r => r.sc - r.capSc));
    const firstGap = key => {
      const capKey = "cap" + (key === "la" ? "La" : "Sc");
      const r = rows.find(x => x[key] > x[capKey] + 0.5);
      return r ? r.y : null;
    };
    const target = ctx.units[id].target, targetRow = target ? rows.find(r => r.y === target.year) : null;
    const newCapacityCost = Math.max(0, (sc.capLa != null ? sc.capLa - K0.la : 0)) * K0.priceLa
      + Math.max(0, (sc.capSc != null ? sc.capSc - K0.sc : 0)) * K0.priceSc;

    return {
      name: sc.name || "",
      rows,
      last: rows[rows.length - 1],
      gapLa, gapSc,
      firstLa: firstGap("la"), firstSc: firstGap("sc"),
      invest: gapLa * K0.priceLa + gapSc * K0.priceSc + newCapacityCost,
      target: target
        ? { pop: target.pop, year: target.year, model: targetRow ? targetRow.pop : null, share: targetRow ? targetRow.pop / target.pop : null }
        : null,
      newcomers: devs.reduce((acc, d) => acc + sum(Object.values(devAdd(ctx, d, p).add)), 0)
    };
  }

  /* ===========================================================================
   * 13. EESMÄRGID
   * ======================================================================== */

  /**
   * goalsEval(ctx, id, params) — arengukava eesmärkide seire (kov.json goals).
   * Iga eesmärgi väärtus kõigi rändemustrite ja valitud stsenaariumi järgi, seis
   * (ok / warn / crit) ja suhe sihti ("% sihist", 1 = täidetud).
   * kind: pop (rahvaarv), share (rühmade a..b osakaal, op >= või <=),
   *       proxy (base × rühmade a..b muutus baseYear'ist), growth (keskmine kasv aastas lo..hi).
   */
  function goalsEval(ctx, id, params) {
    const p = { ...DEF, ...params };
    const aggregate = ctx.aggregates[id];
    const owner = ctx.units[id] || aggregate;
    const goals = (owner && owner.goals) || [];

    const projectMig = mig => aggregate ? projectAgg(ctx, id, { ...p, mig }) : project(ctx, id, { ...p, mig });
    const history = y => aggregate
      ? aggregate.members.reduce((acc, m) => acc.map((x, g) => x + ageOf(ctx.data.pop[m], y)[g]), zeros(G))
      : ageOf(ctx.data.pop[id], y);

    const migs = Object.keys(ctx.cfg.migPatterns);
    const projections = {};
    migs.concat([p.mig]).forEach(m => { if (!projections[m]) projections[m] = projectMig(m); });
    const agesAt = (mig, y) => y <= p.start ? history(y) : projections[mig][y];

    const valueOf = (goal, mig) => {
      if (goal.kind === "pop") return total(agesAt(mig, goal.year));
      if (goal.kind === "share") { const a = agesAt(mig, goal.year); return sumG(a, goal.a, goal.b) / total(a); }
      if (goal.kind === "proxy") return goal.base * sumG(agesAt(mig, goal.year), goal.a, goal.b) / sumG(history(goal.baseYear), goal.a, goal.b);
      if (goal.kind === "growth") return (total(agesAt(mig, goal.y2)) - total(agesAt(mig, goal.y1))) / (goal.y2 - goal.y1);
      return null;
    };
    const isMet = (goal, v) => goal.kind === "growth"
      ? v >= goal.lo && v <= goal.hi
      : goal.op === "<=" ? v <= goal.v : v >= goal.v;
    const isNear = (goal, v) => goal.kind === "growth"
      ? v >= goal.lo * 0.95 && v <= goal.hi * 1.05
      : goal.op === "<=" ? v <= goal.v * 1.05 : v >= goal.v * 0.95;
    /* 1 = siht täidetud; vahemiku ületamine annab samuti alla 1 */
    const shareOfTarget = (goal, v) => goal.kind === "growth"
      ? (v < goal.lo ? v / goal.lo : v > goal.hi ? goal.hi / v : 1)
      : goal.op === "<=" ? goal.v / v : v / goal.v;

    /** Praegune väärtus (cfg.start); growth-eesmärgil puudub. Tundmatu kind arvutatakse nagu proxy (2.2.0 käitumine). */
    const currentValue = goal => {
      const now = history(p.start);
      if (goal.kind === "growth") return null;
      if (goal.kind === "pop") return total(now);
      if (goal.kind === "share") return sumG(now, goal.a, goal.b) / total(now);
      return goal.base * sumG(now, goal.a, goal.b) / sumG(history(goal.baseYear), goal.a, goal.b);
    };

    return goals.map(goal => {
      const vals = {};
      migs.forEach(m => { vals[m] = valueOf(goal, m); });
      const sel = valueOf(goal, p.mig), all = Object.values(vals);
      const st = isMet(goal, sel) ? "ok" : isNear(goal, sel) ? "warn" : "crit";
      const now = currentValue(goal);
      return {
        ...goal, vals, sel,
        lo: Math.min(...all), hi: Math.max(...all),
        now, st,
        meet: all.filter(v => isMet(goal, v)).length,
        n: all.length,
        share: shareOfTarget(goal, sel),
        shareLo: Math.min(...all.map(v => shareOfTarget(goal, v))),
        shareHi: Math.max(...all.map(v => shareOfTarget(goal, v))),
        shareNow: now != null ? shareOfTarget(goal, now) : null
      };
    });
  }

  /* ===========================================================================
   * 14. INVESTEERINGUD JA VÕLG (otsused E7, E8, E10)
   * ======================================================================== */

  /**
   * capOf(ctx, id, o) → { la, sc, priceLa, priceSc, src }
   * Kohtade arv: sisend o → edu.json cap → praegune laste/õpilaste arv (E7).
   * Hind koha kohta: sisend → kov.json prices → 30 000 / 25 000 € (E8).
   */
  function capOf(ctx, id, o) {
    const B = ctx.eduBase[id], configured = (ctx.data.edu.cap || {})[id] || {}, prices = ctx.cfg.prices || {};
    const pick = (key, fallback) => o && o[key] != null ? o[key] : configured[key] != null ? configured[key] : fallback;
    return {
      la: pick("la", B.la),
      sc: pick("sc", B.pk + B.g),
      priceLa: o && o.priceLa || prices.la || 30000,
      priceSc: o && o.priceSc || prices.sc || 25000,
      src: configured.la != null ? configured.src || "edu.json cap" : "praegune laste ja õpilaste arv"
    };
  }

  /**
   * investNeed(ctx, id, P, cap): nõudlus vs kohad aastate kaupa (cfg.start..cfg.end).
   * Väljund: puudujääk, esimene puudujäägi aasta (üle 0,5), investeeringu hinnang, ülejääk.
   */
  function investNeed(ctx, id, P, cap) {
    const K = capOf(ctx, id, cap), capLa = K.la, capSc = K.sc, priceLa = K.priceLa, priceSc = K.priceSc;
    const rows = [];
    for (let y = ctx.cfg.start; y <= ctx.cfg.end; y++) {
      const d = eduDemand(ctx, id, P[y]);
      rows.push({ y, la: d.la, sc: d.sc, gapLa: d.la - capLa, gapSc: d.sc - capSc });
    }
    const maxGapLa = Math.max(...rows.map(r => r.gapLa)), maxGapSc = Math.max(...rows.map(r => r.gapSc));
    const firstYear = key => { const r = rows.find(x => x[key] > 0.5); return r ? r.y : null; };
    return {
      capLa, capSc, capSrc: K.src, rows,
      maxGapLa, maxGapSc,
      firstLa: firstYear("gapLa"), firstSc: firstYear("gapSc"),
      investLa: Math.max(0, maxGapLa) * priceLa, investSc: Math.max(0, maxGapSc) * priceSc,
      priceLa, priceSc,
      surplusLa: -Math.min(...rows.map(r => r.gapLa)),
      surplusSc: -Math.min(...rows.map(r => r.gapSc))
    };
  }

  /**
   * debtPath(ctx, id, invest, o) — otsus E10.
   * Netovõlg, tulud ja tegevustulem eelarvestrateegiast (fin.json BUD) + laen
   * investeeringu katteks aastal o.year (vaikimisi cfg.start), tagasimakse võrdsete
   * põhiosadega o.years aastat, intress o.rate % (eelmise aasta lõpu jäägilt).
   * Väljund: { invest, year, rate, years, doc, st, rows: [{ y, net, ratio, service, princ, intr, resAfter, … }] } või null.
   */
  function debtPath(ctx, id, invest, o) {
    const B = ctx.data.fin.BUD[id];
    if (!B || !B.net || !B.inc) return null;
    const loan = { ...(ctx.cfg.loan || { rate: 4, years: 20 }), ...(o || {}) };
    const loanYear = loan.year || ctx.cfg.start;
    const rows = B.y.map((y, i) => {
      const t = y - loanYear;
      const repaid = t < 0 ? 0 : Math.min(loan.years, t) * invest / loan.years;
      const balance = t < 0 ? 0 : invest - repaid;
      const principal = t >= 1 && t <= loan.years ? invest / loan.years : 0;
      const interest = t >= 1 ? (balance + principal) * loan.rate / 100 : 0;
      const net = B.net[i] + balance;
      return {
        y, lab: B.lab ? B.lab[i] : null, inc: B.inc[i], res: B.res ? B.res[i] : null,
        netBase: B.net[i], net, ratioBase: B.net[i] / B.inc[i], ratio: net / B.inc[i],
        service: principal + interest, princ: principal, intr: interest,
        resAfter: B.res ? B.res[i] - interest : null
      };
    });
    return { invest, year: loanYear, rate: loan.rate, years: loan.years, doc: B.doc, st: B.st || null, rows };
  }

  /**
   * debtEffect(ctx, id, invest): investeeringu mõju netovõlakoormusele laenuaastal.
   * Säilitatud ühilduvuseks; täielik rada väljal path (vt debtPath).
   * Eelarvestrateegiata omavalitsusel tulud FINS.n1 viimasest aastast.
   */
  function debtEffect(ctx, id, invest) {
    const D = debtPath(ctx, id, invest);
    if (!D) {
      const n1 = ctx.data.fin.FINS[id].n1, income = n1[n1.length - 1] * 1000;
      return { inc: income, net: null, before: null, after: null, add: invest / income, path: null };
    }
    const r = D.rows.find(x => x.y === D.year) || D.rows[0];
    return { inc: r.inc, net: r.netBase, before: r.ratioBase, after: r.ratio, add: invest / r.inc, path: D,
      maxRatio: Math.max(...D.rows.map(x => x.ratio)) };
  }

  /* ===========================================================================
   * 15. SIHT JA VAJALIK RÄNNE
   * ======================================================================== */

  /**
   * needExtra(ctx, id, target, year, params) → inimesi aastas
   * Lisaränne omavalitsusse (vx), mis viib rahvaarvu aastaks year sihini target.
   * 0 = siht täitub niigi; Infinity = vaja üle 4000 in/a. Poolitusmeetod, 40 sammu.
   */
  function needExtra(ctx, id, target, year, params) {
    const p = { ...DEF, ...params };
    const gap = extra => total(project(ctx, id, { ...p, vx: (p.vx || 0) + extra })[year]) - target;
    if (gap(0) >= 0) return 0;
    let lo = 0, hi = NEED_MAX;
    if (gap(hi) < 0) return Infinity;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (gap(mid) >= 0) hi = mid;
      else lo = mid;
    }
    return hi;
  }

  /* ===========================================================================
   * 16. ASULAD JA KOOLITEE
   * settlements.json rida: [nimi, rahvaarv 2021, …, lasteaiaealised (5), põhikooliealised (6)]
   * ======================================================================== */

  /** settlementInfo(ctx, id, name) → { name, pop21, hasSchool } või null. */
  function settlementInfo(ctx, id, name) {
    const list = ctx.data.settlements && ctx.data.settlements[id];
    if (!list || !name) return null;
    const row = list.find(r => r[0] === name);
    if (!row) return null;
    const hasSchool = (ctx.data.edu.schoolSettlements[id] || []).includes(name);
    return { name, pop21: row[1], hasSchool };
  }

  /** settlementLayer(ctx, id, P, year): valla prognoos asulatesse REL 2021 osakaalude järgi (osakaalud püsivad). */
  function settlementLayer(ctx, id, P, year) {
    const list = ctx.data.settlements && ctx.data.settlements[id];
    if (!list) return null;
    const popSum = sum(list.map(r => r[1])), laSum = sum(list.map(r => r[5])), pkSum = sum(list.map(r => r[6]));
    const demand = eduDemand(ctx, id, P[year]), popTotal = total(P[year]);
    const schools = ctx.data.edu.schoolSettlements[id] || [];
    return list.map(r => ({
      n: r[0], pop21: r[1], share: r[1] / popSum, pop: popTotal * r[1] / popSum,
      la: demand.la * r[5] / laSum, pk: demand.pk * r[6] / pkSum,
      school: schools.includes(r[0]), other: /^Muud/.test(r[0])
    }));
  }

  /** schoolAccess(ctx, id, P, year): põhikooliealised asulates, kus oma põhikooli ei ole (ülemine hinnang). */
  function schoolAccess(ctx, id, P, year) {
    const layer = settlementLayer(ctx, id, P, year);
    if (!layer) return null;
    const pkOut = sum(layer.filter(r => !r.school).map(r => r.pk)), pkAll = sum(layer.map(r => r.pk));
    return { pkOut, pkAll, share: pkOut / pkAll, rows: layer };
  }

  /* ===========================================================================
   * 17. TAGASITEST
   * ======================================================================== */

  /**
   * backtest(ctx, id): rangelt väljaspool valimit. Kalibreerimine ainult 2015–2021
   * andmetega (suremus ja sündimus 2016–2020, ränne 2016–2021), projektsioon
   * 2021→2026 ja võrdlus tegelikuga (oos). Mehaanika kontroll (ins): tegeliku
   * 2021–2026 rändega peab mudel kordama 2026. aastat.
   */
  function backtest(ctx, id) {
    const pop = ctx.data.pop[id], C = ctx.units[id].cal;
    const outOfSample = projectFrom(pop, 2021, 2026, C.r1full, () => C.fOld, () => C.k1620)[2026];
    const inSample = projectFrom(pop, 2021, 2026, C.r2full, () => C.fMid, () => C.k2125)[2026];
    const actual = ageOf(pop, 2026);
    const bands = BANDS.map(([label, from, to]) => {
      const act = sumG(actual, from, to), est = sumG(outOfSample, from, to);
      return { l: label, act, est, err: est / act - 1 };
    });
    return {
      act: total(actual), oos: total(outOfSample), ins: total(inSample),
      errOos: total(outOfSample) / total(actual) - 1,
      errIns: total(inSample) / total(actual) - 1,
      bands,
      mape: sum(bands.map(b => Math.abs(b.err))) / bands.length
    };
  }

  /* ===========================================================================
   * 18. OTSUSE MÕJU EELHINNANG (decision)
   * ======================================================================== */

  const DWELLING_WORD = { korter: "korterelamu", ridaelamu: "ridaelamu", eramu: "eramute" };

  /** Otsus "elamu": detailplaneering / elamuarendus. */
  function decisionHousing(ctx, unit, inp, p, base) {
    const id = inp.unit, E = ctx.cfg.end;
    const H = housingImpact(ctx, id, inp, p), L = H.last, peakLa = H.peakLa, peakSc = H.peakSc, cap = H.cap;
    const rows = [];

    rows.push({ area: "Rahvastik", now: fmt(total(base[E])) + " (" + E + ", ilma otsuseta)",
      effect: sgn(L.dPop) + " elanikku aastaks " + E,
      note: fmt(H.newcomers) + " uut elanikku asustamise ajal (" + H.inp.hh.toString().replace(".", ",") + " in/leibkond, täituvus "
        + Math.round(H.inp.occ * 100) + "%, väljastpoolt " + Math.round(H.inp.outside * 100) + "%)" });

    // Kas kohtade arv on sisestatud või konfiguratsioonis; muidu eeldus "kohti = 2026 lapsi"
    const capConfigured = cap.src && !cap.src.startsWith("praegune");
    const capDefault = { la: inp.capLa == null && !capConfigured, sc: inp.capSc == null && !capConfigured };
    const capDefaultNote = k => capDefault[k]
      ? ". Kohtade arv ei ole sisestatud: eeldatud on, et kohti on täpselt nii palju kui 2026. aastal lapsi või õpilasi" : "";
    const capNote = (first, firstBase, k) => (!first
      ? "Nõudlus mahub olemasolevatesse kohtadesse"
      : firstBase && firstBase <= first
        ? "Kohti jääb puudu juba ilma otsuseta alates " + firstBase + ". aastast"
        : "Otsuse tõttu jääb kohti puudu alates " + first + ". aastast") + capDefaultNote(k);

    rows.push({ area: "Lasteaiakohad", now: fmt(cap.la) + " kohta", effect: sgn(peakLa.dLa) + " last (tipp " + peakLa.y + ")",
      note: capNote(cap.firstLa, cap.firstLaBase, "la") });
    rows.push({ area: "Koolikohad", now: fmt(cap.sc) + " kohta", effect: sgn(peakSc.dSc) + " õpilast (tipp " + peakSc.y + ")",
      note: capNote(cap.firstSc, cap.firstScBase, "sc") });
    rows.push({ area: "Investeeringud", now: "–", effect: eurT(cap.investLa + cap.investSc),
      note: "Ainult otsusest tulenev lisapuudujääk × " + eurT(cap.priceLa) + " lasteaiakoha ja " + eurT(cap.priceSc) + " koolikoha kohta (hinnang)" });
    rows.push({ area: "Tulumaks", now: "–", effect: sgn(L.dTaxR / 1000) + " tuh € aastas (" + E + ")",
      note: "2026. aasta hindades · " + H.taxSrc });
    rows.push({ area: "Teenuste kulud", now: "–", effect: sgn(L.dCost / 1000) + " tuh € aastas (" + E + ")",
      note: "Teenusemahu arvestuslik maksumus: ühikukulu on RR302 2023–2025 nominaalne mediaan, hinnaindeksiga korrigeerimata (ligikaudu 2024. aasta hinnatase) · ühikukulud: " + H.ucSrc });
    rows.push({ area: "Liikuvus", now: "–", effect: sgn(L.dTln) + " tööl käijat Tallinnas",
      note: "REL 2021 pendelrände osakaal " + Math.round(H.tlnShare * 100) + "%" });
    if (H.settlement) {
      rows.push({ area: "Koolitee", now: H.settlement.name,
        effect: H.settlement.hasSchool ? "Asulas on põhikool" : "Asulas põhikooli ei ole",
        note: H.settlement.hasSchool ? "Õpilased saavad käia kodukohas" : sgn(peakSc.dPk) + " põhikooliõpilast vajab transporti" });
    }

    // Seletuskirja tekst. 3.0.0: neto = dNet (tulumaks − tasandusfondi kadu − kulu).
    const net = L.dNet;
    const shortageText = () => {
      const alsoWithout = (cap.firstLaBase && cap.firstLa && cap.firstLaBase <= cap.firstLa)
        || (cap.firstScBase && cap.firstSc && cap.firstScBase <= cap.firstSc);
      return "Olemasolevatest kohtadest ei piisa"
        + (cap.firstLa ? " lasteaias alates " + cap.firstLa + ". aastast" : "")
        + (cap.firstLa && cap.firstSc ? " ja" : "")
        + (cap.firstSc ? " koolis alates " + cap.firstSc + ". aastast" : "")
        + (alsoWithout ? " (puudujääk tekib osaliselt ka ilma arenduseta)" : "")
        + ". Otsusest tulenev lisainvesteeringu vajadus on hinnanguliselt " + eurT(cap.investLa + cap.investSc) + ". ";
    };
    const text = unit.name + " kavandab " + fmt(inp.n) + " eluruumiga " + (DWELLING_WORD[inp.type] || "elamu") + "arendust"
        + (H.settlement ? " (asukoht: " + H.settlement.name + ")" : "") + ", mille asustamine algab " + inp.start + ". aastal. "
      + "Mudeli hinnangul lisandub arendusega " + fmt(H.newcomers) + " elanikku ning " + E + ". aastal on valla rahvaarv "
        + sgn(L.dPop) + " inimese võrra suurem kui ilma arenduseta. "
      + "Lasteaiakohtade nõudlus kasvab tipus " + fmt(peakLa.dLa) + " lapse ja koolikohtade nõudlus " + fmt(peakSc.dSc) + " õpilase võrra. "
      + (cap.firstLa || cap.firstSc ? shortageText() : "Olemasolevad lasteaia- ja koolikohad katavad lisanduva nõudluse. ")
      + (capDefault.la || capDefault.sc
        ? "Kohtade tegelikku arvu ei ole sisestatud; arvutus eeldab, et kohti on täpselt nii palju kui 2026. aastal lapsi ja õpilasi, seega näitab iga nõudluse kasv puudujääki. "
        : "")
      + "Füüsilise isiku tulumaksu laekumine suureneb " + E + ". aastaks umbes " + eurT(L.dTaxR) + " aastas (2026. aasta palgatasemel). "
      + "Lisanduva teenusemahu arvestuslik maksumus on umbes " + eurT(L.dCost) + " aastas; see põhineb 2023–2025 nominaalsel ühikukulul (ligikaudu 2024. aasta hinnatase) ega ole eelarveprognoos. "
      + "Tasandusfondist kaob umbes " + eurT(L.dTf) + " aastas. "
      + "Tulu ja kulu vahe on seega suurusjärk: " + (net >= 0 ? "umbes +" + eurT(net) : "umbes −" + eurT(-net)) + " aastas. "
      + (H.settlement && !H.settlement.hasSchool
        ? "Arenduse asukohas (" + H.settlement.name + ") põhikooli ei ole, seega lisandub koolitranspordi vajadus umbes " + fmt(peakSc.dPk) + " õpilasele. "
        : "")
      + "Uute elanike vanusjaotus on mudeli pere sisserände profiil ja eeldab, et nad jäävad paikseks. Hinnang põhineb kohortmudelil ja valla keskmistel näitajatel; see ei asenda detailset mõjude analüüsi.";
    return { type: "elamu", rows, text, H };
  }

  /** Otsus "kohad": lasteaia- või koolikohtade arvu muutus. */
  function decisionPlaces(ctx, unit, inp, p, base) {
    const id = inp.unit, E = ctx.cfg.end, B = ctx.eduBase[id];
    const kind = inp.kind || "la", isLa = kind === "la";
    const delta = inp.delta || 0, year = inp.year || p.start + 1;
    const cap0 = isLa ? (inp.cap != null ? inp.cap : B.la) : (inp.cap != null ? inp.cap : B.pk + B.g);
    const unitCost = ctx.uc[id][isLa ? "la" : "sc"];
    const varShare = inp.varShare != null ? inp.varShare : 0.6;
    const price = inp.price || (isLa ? 30000 : 25000);   // 2.2.0: ei kasuta kov.json prices

    const yrs = [];
    for (let y = p.start; y <= E; y++) {
      const d = eduDemand(ctx, id, base[y]), dem = isLa ? d.la : d.sc, cap = cap0 + (y >= year ? delta : 0);
      yrs.push({ y, dem, cap, util: dem / cap });
    }
    const before = yrs.find(r => r.y === Math.max(p.start, year - 1)), after = yrs.find(r => r.y === year), end = yrs[yrs.length - 1];

    const rows = [];
    rows.push({ area: isLa ? "Lasteaiakohad" : "Koolikohad", now: fmt(cap0) + " kohta", effect: sgn(delta) + " kohta alates " + year,
      note: "Täituvus " + Math.round(before.util * 100) + "% → " + Math.round(after.util * 100) + "%" });
    rows.push({ area: "Nõudlus " + E, now: fmt(yrs[0].dem), effect: fmt(end.dem),
      note: "Täituvus " + E + ": " + Math.round(end.util * 100) + "%"
        + (end.util > 1 ? " (puudujääk " + fmt(end.dem - end.cap) + ")" : end.util < 0.85 ? " (vabu kohti " + fmt(end.cap - end.dem) + ")" : "") });
    rows.push({ area: "Investeering", now: "–", effect: delta > 0 ? eurT(delta * price) : "0 €",
      note: delta > 0 ? eurT(price) + " koha kohta (hinnang)" : "Kohtade vähendamine investeeringut ei vaja" });
    rows.push({ area: "Tegevuskulu", now: "–", effect: sgn(delta * unitCost * varShare / 1000) + " tuh € aastas",
      note: "Ühikukulu " + fmt(unitCost) + " € (RR302 2023–2025 nominaalne mediaan, ligikaudu 2024. a hinnatase) × muutuvkulu osa " + Math.round(varShare * 100) + "% (hinnang)" });

    const text = unit.name + " kavandab " + (delta >= 0 ? "suurendada " : "vähendada ") + (isLa ? "lasteaiakohtade" : "koolikohtade")
        + " arvu " + fmt(Math.abs(delta)) + " koha võrra alates " + year + ". aastast. "
      + "Praegu on kohti " + fmt(cap0) + " ja nõudlus on mudeli järgi " + fmt(yrs[0].dem) + "; " + E + ". aastaks muutub nõudlus "
        + fmt(end.dem) + "-ni. Pärast muudatust on täituvus " + year + ". aastal " + Math.round(after.util * 100) + "% ja " + E + ". aastal "
        + Math.round(end.util * 100) + "%. "
      + (delta > 0 ? "Investeeringuvajadus on hinnanguliselt " + eurT(delta * price) + ". " : "")
      + "Aastane tegevuskulu muutub umbes " + eurT(delta * unitCost * varShare)
        + " (2023–2025 nominaalne ühikukulu, ligikaudu 2024. aasta hinnatase). Hinnang põhineb kohortmudelil ja valla keskmisel ühikukulul.";
    return { type: "kohad", rows, text, yrs };
  }

  /** Otsus "siht": rahvaarvu siht ja selleks vajalik lisaränne. */
  function decisionTarget(ctx, unit, inp, p, base) {
    const id = inp.unit, target = inp.target, year = inp.year || 2035;
    const need = needExtra(ctx, id, target, year, p), feasible = isFinite(need);
    const scen = feasible ? project(ctx, id, { ...p, vx: (p.vx || 0) + need }) : base;
    const d0 = eduDemand(ctx, id, base[year]), d1 = eduDemand(ctx, id, scen[year]);
    const wi = wageIdx(ctx, year, p);
    const tax0 = taxSeries(ctx, id, agesFn(ctx, id, base), p)[year] / wi;
    const tax1 = taxSeries(ctx, id, agesFn(ctx, id, scen), p)[year] / wi;
    const dwellings = feasible ? need / 2.4 : null;   // 2,4 elanikku eluruumi kohta

    const rows = [];
    rows.push({ area: "Rahvaarv " + year, now: fmt(total(base[year])) + " (valitud stsenaarium)", effect: "siht " + fmt(target),
      note: need === 0 ? "Siht täitub ilma lisarändeta"
        : feasible ? "Vajab lisarännet " + sgn(need) + " inimest aastas väljastpoolt valda (pererände koosseis, jäävad paikseks). Rahvastikubilansi tulemus, mitte hinnang meetmega saavutatavale rändele"
          : "Siht ei ole realistlik (üle 4000 in/a)" });
    if (feasible && need > 0) {
      rows.push({ area: "Eluruumid", now: "–", effect: "≈ " + fmt(dwellings) + " eluruumi aastas", note: "2,4 elanikku eluruumi kohta (hinnang)" });
      rows.push({ area: "Lasteaiakohad", now: fmt(d0.la), effect: sgn(d1.la - d0.la) + " last (" + year + ")", note: "Võrreldes valitud stsenaariumiga" });
      rows.push({ area: "Koolikohad", now: fmt(d0.sc), effect: sgn(d1.sc - d0.sc) + " õpilast (" + year + ")", note: "Võrreldes valitud stsenaariumiga" });
      rows.push({ area: "Tulumaks", now: eurT(tax0), effect: sgn((tax1 - tax0) / 1000) + " tuh € aastas", note: "2026. aasta hindades · " + ctx.tax.T[id].src });
    }

    const text = unit.name + " arengukava siht on " + fmt(target) + " elanikku aastaks " + year + ". Valitud stsenaariumi järgi on rahvaarv sel aastal "
        + fmt(total(base[year])) + ". "
      + (need === 0
        ? "Siht täitub ilma lisarändeta. Valitud rändemuster on ajaloolise perioodi muster, mitte kõige tõenäolisem tulevik."
        : feasible
          ? "Sihi saavutamiseks peaks valda lisaks rändama keskmiselt " + fmt(need) + " inimest aastas väljastpoolt valda, eeldusel et nad on mudeli pererände koosseisuga ja jäävad paikseks. See on rahvastikubilansi tulemus, mitte hinnang meetmega saavutatavale rändele. Selline ränne tähendab umbes "
            + fmt(dwellings) + " uut eluruumi aastas. Lasteaiakohtade nõudlus suureneb siis " + fmt(d1.la - d0.la) + " ja koolikohtade nõudlus "
            + fmt(d1.sc - d0.sc) + " võrra ning tulumaksu laekumine " + eurT(tax1 - tax0) + " aastas."
          : "Sihi saavutamiseks vajalik ränne ületab 4000 inimest aastas; siht ei ole mudeli järgi realistlik.");
    return { type: "siht", rows, text, need };
  }

  /**
   * decision(ctx, type, inp, params) → { type, rows: [{ area, now, effect, note }], text, … }
   * type: "elamu" (detailplaneering/elamuarendus; lisaks H), "kohad" (kohtade muutus; lisaks yrs),
   *       "siht" (rahvaarvu siht; lisaks need). inp.unit = omavalitsuse id.
   * Väljund: mõjude tabel ja seletuskirja mõjude lõigu mustand.
   */
  function decision(ctx, type, inp, params) {
    const unit = ctx.units[inp.unit], p = { ...DEF, ...params };
    const base = project(ctx, inp.unit, p);
    if (type === "elamu") return decisionHousing(ctx, unit, inp, p, base);
    if (type === "kohad") return decisionPlaces(ctx, unit, inp, p, base);
    if (type === "siht") return decisionTarget(ctx, unit, inp, p, base);
    throw new Error("Tundmatu otsuse tüüp: " + type);
  }

  /* ===========================================================================
   * 19. ENESETEST (selfTest)
   * ======================================================================== */

  /**
   * selfTest(ctx, ref) → [{ id, name, ok, detail }]
   * T1–T6b: võrdlus põhimudeliga (reference.json); T7–T19: sisemine kooskõla.
   * Testitavad üksused tuletatakse andmetest: agregaat = esimene kov.json agregaat,
   * pilootvald agregaadis (pilot) ja pilootvald väljaspool agregaati.
   */
  function selfTest(ctx, ref) {
    const results = [];
    const check = (id, name, cond, detail) => results.push({ id, name, ok: !!cond, detail });
    const near = (a, b, tol) => Math.abs(a - b) <= tol;
    const maxAbs = values => values.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

    const aggId = Object.keys(ctx.aggregates)[0];
    const members = ctx.aggregates[aggId].members;
    const allIds = Object.keys(ctx.units);
    const pilotIn = members.find(id => ctx.units[id].pilot) || members[0];
    const pilotOut = allIds.find(id => ctx.units[id].pilot && !members.includes(id)) || null;
    const pilotInName = ctx.units[pilotIn].short;
    const region = ctx.regions[ctx.units[members[0]].region];

    // T1: rahvaarv kõigi rändemustritega (liikmed + agregaat, 2031 ja 2036)
    const d1 = [];
    Object.keys(ref.SC).forEach(mig => members.concat(aggId).forEach(u => [2031, 2036].forEach(y => {
      const v = u === aggId ? total(projectAgg(ctx, aggId, { mig })[y]) : total(project(ctx, u, { mig })[y]);
      d1.push(v - ref.SC[mig][u][y]);
    })));
    const max1 = maxAbs(d1);
    check("T1", "Rahvaarvu prognoos kattub põhimudeliga (5 rändemustrit × 4 valda + maakond, 2031 ja 2036)", max1 < 1e-6,
      "suurim erinevus " + max1.toExponential(1) + " inimest");

    // T2: vanuserühmad 2036 vaikestsenaariumiga
    const d2 = [];
    members.forEach(u => project(ctx, u, {})[2036].forEach((x, g) => d2.push(x - ref.PROJ2036[u][g])));
    const max2 = maxAbs(d2);
    check("T2", "Vanuserühmad 2036 kattuvad põhimudeliga (vaikestsenaarium)", max2 < 1e-3, "suurim erinevus " + max2.toExponential(1));

    // T3: kalibreerimisparameetrid
    const calKeys = ["k", "k1620", "k2125", "f", "fOld", "fMid", "uaExc", "bal3", "korr1", "korr2"];
    const d3 = [];
    members.forEach(u => calKeys.forEach(k => d3.push(ctx.units[u].cal[k] - ref.CAL[u][k])));
    const max3 = maxAbs(d3);
    check("T3", "Kalibreerimisparameetrid (suremus kolmel perioodil, sündimus, rändeerand, registriparandus) kattuvad", max3 < 1e-9,
      "suurim erinevus " + max3.toExponential(1));

    // T4: tulumaks 2026, 2030, 2036
    const d4 = [];
    members.forEach(u => {
      const tax = taxSeries(ctx, u, agesFn(ctx, u, project(ctx, u, {})));
      [2026, 2030, 2036].forEach(y => d4.push(tax[y] - ref.tax[u][y]));
    });
    const max4 = maxAbs(d4);
    check("T4", "Tulumaksu prognoos kattub põhimudeliga (2026, 2030, 2036)", max4 < 0.01, "suurim erinevus " + max4.toFixed(4) + " €");

    // T5: haridusnõudlus 2036
    const d5 = [];
    members.forEach(u => {
      const d = eduDemand(ctx, u, project(ctx, u, {})[2036]);
      d5.push(d.la - ref.edu[u].la, d.sc - ref.edu[u].sc);
    });
    const max5 = maxAbs(d5);
    check("T5", "Lasteaia- ja koolinõudlus 2036 kattub põhimudeliga", max5 < 1e-6, "suurim erinevus " + max5.toExponential(1));

    // T6: piirkonna trendid
    check("T6", "Piirkonna trendid (sündimuse kalle, eluea kasv) kattuvad",
      near(region.fslope, ref.FSLOPE, 1e-12) && near(region.lam, ref.LAM, 1e-12),
      "kalle " + region.fslope.toFixed(5) + ", λ " + region.lam.toFixed(5));

    // T6b: tagasitest
    if (ref.bt) {
      const d6 = [];
      members.forEach(u => { const b = backtest(ctx, u); d6.push(b.ins - ref.bt[u].ins, b.oos - ref.bt[u].oos); });
      const max6 = maxAbs(d6);
      check("T6b", "Tagasitest 2021→2026 kattub põhimudeliga", max6 < 1e-6, "suurim erinevus " + max6.toExponential(1) + " inimest");
    }

    // T7: lähteandmete vanuserühmade summa vs rahvaarv
    const mismatches = [];
    let max7 = 0;
    allIds.forEach(u => {
      const pop = ctx.data.pop[u];
      Object.keys(pop.age).forEach(y => {
        const diff = pop.tot[y] - sum(pop.age[y]);
        if (diff) {
          mismatches.push(u + " " + y + " (" + (diff > 0 ? "+" : "") + diff + ")");
          max7 = Math.max(max7, Math.abs(diff));
        }
      });
    });
    check("T7", "Lähteandmed: vanuserühmade summa erineb rahvaarvust kõige rohkem 3 inimese võrra", max7 <= 3,
      mismatches.length ? mismatches.length + " juhtu, suurim " + max7 + " inimest: " + mismatches.join(", ") : "kõik summad täpsed");

    // T8: pilootvald väljaspool agregaati
    const pilotProj = pilotOut ? project(ctx, pilotOut, {}) : null;
    check("T8", "Pilootvalla (" + (pilotOut ? ctx.units[pilotOut].short : "–") + ") projektsioon on arvutatav ja positiivne",
      pilotProj && Object.values(pilotProj).every(a => a.every(x => isFinite(x) && x >= 0)),
      pilotProj ? "2036: " + fmt(total(pilotProj[2036])) + " elanikku" : "pilootvald puudub");

    // T9: elamuarenduse lisandunud elanikud jõuavad rahvaarvu
    const H9 = housingImpact(ctx, pilotIn, { n: 120, type: "korter", start: 2028, years: 1, occ: 1, outside: 1, hh: 2 }, {});
    const row2028 = H9.rows.find(r => r.y === 2028);
    check("T9", "Elamuarendus: lisandunud elanikud jõuavad rahvaarvu (240 inimest, 2028)", near(row2028.dPop, 240, 0.5),
      "rahvaarvu muutus " + row2028.dPop.toFixed(2));

    // T10: kalibreerimise kontroll (tagasitest valimis)
    const max10 = maxAbs(allIds.map(u => backtest(ctx, u).errIns));
    check("T10", "Kalibreerimise kontroll: 2021–2026 bilansilise rändega kordab mudel 2026. aastat alla 0,5% veaga (ootuspärane, ei tõenda prognoosi täpsust)",
      max10 < 0.005, "suurim viga " + (max10 * 100).toFixed(2) + "%");

    // T11: asulakihi osakaalud
    const d11 = [];
    allIds.forEach(u => {
      const layer = settlementLayer(ctx, u, project(ctx, u, {}), 2036);
      if (layer) d11.push(sum(layer.map(r => r.share)) - 1);
    });
    const max11 = maxAbs(d11);
    check("T11", "Asulakiht: osakaalud summeeruvad 100%-ni", max11 < 1e-9, "suurim kõrvalekalle " + max11.toExponential(1));

    // T12: kõik stsenaariumid igal aastal ja vanuserühmas
    let max12 = 0, n12 = 0;
    if (ref.proj) Object.keys(ref.proj).forEach(key => {
      const [mig, fertTr, mort] = key.split("|");
      Object.keys(ref.proj[key]).forEach(u => {
        const P = project(ctx, u, { mig, fertTr, mort });
        Object.keys(ref.proj[key][u]).forEach(y => ref.proj[key][u][y].forEach((x, g) => {
          max12 = Math.max(max12, Math.abs(P[y][g] - x));
          n12++;
        }));
      });
    });
    check("T12", "Kõik 10 stsenaariumi (5 rändemustrit × sündimuse ja eluea trend) kattuvad põhimudeli v6-ga igal aastal ja vanuserühmas",
      n12 > 0 && max12 < 1e-6, n12 + " väärtust, suurim erinevus " + max12.toExponential(1));

    // T13: uute elanike arv vs mõjukangas (100 eluruumi, 72% arvesse → 187,2)
    const hhCfg = (ctx.cfg.housing || HOUSING).hh;
    const housing = (n, type) => housingImpact(ctx, pilotIn, { n, type, start: 2028, years: 2, occ: 1, outside: 0.72 }, {});
    const newcomers = housing(40, "eramu").newcomers + housing(20, "ridaelamu").newcomers + housing(40, "korter").newcomers;
    const newcomersRef = (40 * hhCfg.eramu + 20 * hhCfg.ridaelamu + 40 * hhCfg.korter) * 0.72;
    check("T13", "Elamuarendus: uute elanike arv kattub mõjukangaga samade eeldustega (100 eluruumi, 72% arvesse)",
      near(newcomers, newcomersRef, 1e-9) && near(newcomersRef, 187.2, 1e-9),
      "kaksik " + newcomers.toFixed(1) + ", mõjukangas 187,2");

    // T14: tasandusfond (E6), piirkulu (E5), neto
    const H14 = housing(40, "korter"), TF = ctx.cfg.tf || {}, marg = (ctx.cfg.margCost || {})[pilotIn];
    const tfCap = (TF.cap || {})[pilotIn] != null ? TF.cap[pilotIn] : Infinity;
    const tfOk = H14.rows.every(r => near(r.dTf, Math.min(tfCap, Math.max(0, r.dTaxR) * (TF.share || 0)), 1e-9));
    const margOk = !marg || H14.rows.every(r => near(r.dCostMarg, r.dLa * marg.la + r.dSc * marg.sc + r.dPop * marg.res, 1e-9)
      && near(r.dNet, r.dTaxR - r.dTf - r.dCost, 1e-9));
    check("T14", "Tasandusfondi kadu (E6), piirkulu (E5) ja neto arvutuvad otsuste järgi", tfOk && margOk,
      "tasandusfond " + Math.round((TF.share || 0) * 100) + "% lisanduvast tulumaksust, piirkulu "
        + (marg ? marg.la + " / " + marg.sc + " / " + marg.res + " €" : "puudub"));

    // T15: võla rada (E10)
    const D0 = debtPath(ctx, pilotIn, 0), D1 = debtPath(ctx, pilotIn, 1e6);
    const loanRow = D1 ? D1.rows.find(r => r.y === D1.year) : null;
    const debtOk = D0 && D1
      && D0.rows.every(r => near(r.net, r.netBase, 1e-6))
      && near(loanRow.net - loanRow.netBase, 1e6, 1e-6)
      && D1.rows.every(r => r.net >= r.netBase - 1e-6);
    check("T15", "Võla rada (E10): ilma investeeringuta võrdub eelarvestrateegiaga, laen lisandub võlale ja väheneb põhiosamaksetega", debtOk,
      D1 ? "1 mln € laen " + D1.year + ": teeninduskulu järgmisel aastal " + fmt(D1.rows.find(r => r.y === D1.year + 1).service) + " €"
        : "eelarvestrateegia puudub");

    // T16: mitme arenduse koosmõju
    {
      const dev1 = { n: 40, type: "eramu", start: 2028, years: 2 }, dev2 = { n: 60, type: "korter", start: 2029, years: 3 };
      const H1 = housingImpact(ctx, pilotIn, dev1, {}), H2 = housingImpact(ctx, pilotIn, dev2, {});
      const both = devsImpact(ctx, pilotIn, [dev1, dev2], {}), one = devsImpact(ctx, pilotIn, [dev1], {});
      const same = one.rows.every((r, i) => Math.abs(r.dPop - H1.rows[i].dPop) < 1e-9 && Math.abs(r.dNet - H1.rows[i].dNet) < 1e-9);
      const additive = both.rows.every((r, i) =>
        Math.abs(r.dPop - H1.rows[i].dPop - H2.rows[i].dPop) < 0.05 * Math.max(1, Math.abs(r.dPop)));
      check("T16", "Mitme arenduse koosmõju: üks arendus = housingImpact, kaks arendust ≈ summa (erinevus alla 5%)", same && additive,
        "uusi elanikke " + fmt(both.newcomers) + " = " + fmt(H1.newcomers) + " + " + fmt(H2.newcomers)
          + "; 2036 " + sgn(both.last.dPop) + " vs " + sgn(H1.last.dPop + H2.last.dPop));
    }

    // T17: stsenaariumide töölaud
    {
      const S0 = scenarioRun(ctx, pilotIn, { params: {} }), P0 = project(ctx, pilotIn, {});
      const dev = { n: 100, type: "korter", start: 2028, years: 2 };
      const S1 = scenarioRun(ctx, pilotIn, { params: {}, devs: [dev] }), H = housingImpact(ctx, pilotIn, dev, {});
      const equalBase = S0.rows.every(r => Math.abs(r.pop - total(P0[r.y])) < 1e-9);
      const equalDiff = Math.abs(S1.last.pop - S0.last.pop - H.last.dPop) < 1e-6;
      check("T17", "Stsenaarium ilma arendusteta = põhiprojektsioon; arendusega vahe = housingImpact", equalBase && equalDiff,
        "2036: " + fmt(S0.last.pop) + " → " + fmt(S1.last.pop));
    }

    // T18: eesmärkide seire
    {
      const goal = goalsEval(ctx, pilotIn, {}).find(x => x.kind === "pop");
      const pop2035 = total(project(ctx, pilotIn, {})[2035]);
      const aggGoal = goalsEval(ctx, aggId, {}).find(x => x.kind === "pop");
      const aggPop2035 = total(projectAgg(ctx, aggId, {})[2035]);
      check("T18", "Eesmärkide seire: rahvaarvu eesmärgi väärtus = projektsioon (" + pilotInName + " ja maakond), seis arvutub kõigi mustritega",
        goal && Math.abs(goal.sel - pop2035) < 1e-9 && aggGoal && Math.abs(aggGoal.sel - aggPop2035) < 1e-9 && goal.n === 5,
        goal ? pilotInName + " " + fmt(goal.sel) + " / " + fmt(goal.v) + " (" + Math.round(goal.share * 100) + "% sihist), "
          + goal.meet + "/" + goal.n + " mustrit" : "eesmärk puudub");
    }

    // T19: tulumaksu hinnang kunstliku lisakuuga (kuine MTA uuendus)
    {
      const fin = ctx.data.fin, id = Object.keys(fin.MTA.tm26)[0];
      const tm26 = fin.MTA.tm26[id], tm25 = fin.MTA.tm25[id], n = tm26.length + 1;
      const tm26x = tm26.concat([tm25[n - 1]]);
      const T = buildTax({ ...ctx, data: { ...ctx.data, fin: { ...fin, MTA: { ...fin.MTA, tm26: { ...fin.MTA.tm26, [id]: tm26x } } } } }).T[id];
      const g = sum(tm26x) / sum(tm25.slice(0, n));
      const months = tm26x.concat(tm25.slice(n).map(x => x * g));
      check("T19", "Tulumaksu hinnang: lisandunud kuu korral koosneb 2026. aasta hinnang 12 kuust (" + n + " kuud 2026 + " + (12 - n) + " kuud 2025 × kasvutempo)",
        tm25.length === 12 && months.length === 12 && Math.abs(T.est26 - sum(months)) < 1e-6 && Math.abs(T.g - g) < 1e-12,
        id + ": " + months.length + " kuud, hinnang " + fmt(T.est26) + " €");
    }
    return results;
  }

  /* ===========================================================================
   * 20. API KIRJELDUS (kasutajaliidese dokumentatsioon)
   * ======================================================================== */

  const API = [
    { fn: "build(data)", in: "data = { kov, pop, fin, edu, ext, settlements }", out: "ctx: kalibreeritud omavalitsused, piirkonnad, maksu- ja hariduse baas, ühikukulud", desc: "Ehitab mudeli konteksti. Kutsutakse üks kord andmete laadimisel." },
    { fn: "calibrate(pop, migV)", in: "ühe omavalitsuse rahvastikuandmed; välisrände saldo aastate kaupa", out: "{ k, f, fOld, fMid, r1, mean, r2, r2x, r3, uaExc, bal3 }", desc: "Suremustase (2023–2025), sündimus ja viis rändemustrit: bilansiline kohordijääk üheaastaste vanuste mootoriga, registriparandus maha arvatud (põhimudel v6)." },
    { fn: "regionParams(pops, e0Series)", in: "piirkonna omavalitsuste andmed; oodatav eluiga aastate kaupa", out: "{ fslope, kc, e0m, e0sl, lam }", desc: "Sündimuse trend ja suremuse langus piirkonnas." },
    { fn: "project(ctx, id, params)", in: "params = { mig, extra, vx, add, fert, fertTr, mort, start, end }", out: "{ aasta: vanusevektor[18] }", desc: "Kohortprojektsioon ühe aasta sammuga. add lubab ajas muutuvat lisarännet (elamuarendus)." },
    { fn: "projectAgg(ctx, aggId, params)", in: "agregaadi id (nt MAAK)", out: "{ aasta: vanusevektor[18] }", desc: "Liikmete projektsioonide summa." },
    { fn: "eduBase(ctx, id)", in: "omavalitsus", out: "{ la, pk, g, src }", desc: "Lasteaialapsed, põhikooli- ja gümnaasiumiõpilased 2026. Ilma andmeteta proksi kaudu (märgitud src-s)." },
    { fn: "eduDemand(ctx, id, ages)", in: "vanusevektor", out: "{ la, pk, g, sc }", desc: "Lasteaia- ja koolinõudlus vanusestruktuuri muutuse järgi." },
    { fn: "unitCosts(ctx, id)", in: "omavalitsus", out: "{ la, sc, o80, src } € aastas", desc: "Ühikukulud RR302 tegevusalade kuludest." },
    { fn: "taxSeries(ctx, id, ages, params)", in: "vanusevektori funktsioon aasta järgi; { wage, emp }", out: "{ aasta: € }", desc: "Füüsilise isiku tulumaks: palgaosa tööealiste ja palgakasvu, pensioniosa 65+ järgi." },
    { fn: "goalsEval(ctx, id, params)", in: "omavalitsus või maakond, stsenaarium", out: "[{ label, sel, vals, st, share, meet }]", desc: "Arengukava mõõdetavate eesmärkide seire kõigi rändemustritega (kov.json goals)." },
    { fn: "devsImpact(ctx, id, devs, params, cap)", in: "arenduste loend (nagu housingImpact inp), kohad", out: "sama kuju nagu housingImpact, koosmõju", desc: "Mitme detailplaneeringu koosmõju (planeeringukontrolli DP-d koos)." },
    { fn: "scenarioRun(ctx, id, sc)", in: "{ params:{mig, extra, fert}, devs[], capLa, capSc, capFrom }", out: "{ rows[aasta]: pop, la, sc, capLa, capSc, taxR; gapLa, gapSc, invest, target }", desc: "Stsenaariumide töölaud: rändemuster, arendused ja kohtade muutus koos." },
    { fn: "housingImpact(ctx, id, inp, params)", in: "inp = { n, type, start, years, hh, occ, outside, settlement, capLa, capSc, priceLa, priceSc }", out: "{ rows[aasta]: dPop, dLa, dSc, dTax, dTaxR, dTf, dCost, dCostMarg, dNet, dNetMarg, dTln …, cap, settlement, childScale }", desc: "Elamuarenduse mõju rahvastikule, teenustele, eelarvele ja liikuvusele." },
    { fn: "investNeed(ctx, id, P, cap)", in: "projektsioon; { la, sc, priceLa, priceSc }", out: "{ rows, maxGapLa, maxGapSc, firstLa, firstSc, investLa, investSc }", desc: "Kohtade puudujääk aastate kaupa ja investeeringu hinnang." },
    { fn: "debtPath(ctx, id, invest, o)", in: "investeering €; o = { year, rate, years }", out: "{ rows: [{ y, net, ratio, service, princ, intr, resAfter }] }", desc: "Võla rada eelarvestrateegia järgi koos investeeringu laenu, tagasimakse ja intressiga (otsus E10)." },
    { fn: "debtEffect(ctx, id, invest)", in: "investeering €", out: "{ before, after, add, path, maxRatio }", desc: "Laenuga kaetud investeeringu mõju netovõlakoormusele esimesel prognoosiaastal; täielik rada väljal path." },
    { fn: "newcomerProfile(ctx, type)", in: "elamutüüp", out: "{ prof, childScale }", desc: "Uustulijate vanusprofiil: laste osa skaleeritud mõjukanga laste kordaja järgi (otsus E3)." },
    { fn: "capOf(ctx, id, o)", in: "valikuline kohtade arv ja hinnad", out: "{ la, sc, priceLa, priceSc, src }", desc: "Kohtade arv ja investeeringu hinnad: sisend → edu.json cap → praegune arv (otsused E7, E8)." },
    { fn: "needExtra(ctx, id, target, year, params)", in: "sihtrahvaarv ja aasta", out: "inimesi aastas", desc: "Lisaränne, mis on vaja sihi saavutamiseks." },
    { fn: "settlementLayer(ctx, id, P, year)", in: "projektsioon ja aasta", out: "[{ n, share, pop, la, pk, school }]", desc: "Valla prognoos asulate kaupa REL 2021 osakaalude järgi." },
    { fn: "schoolAccess(ctx, id, P, year)", in: "projektsioon ja aasta", out: "{ pkOut, pkAll, share, rows }", desc: "Põhikooliealised asulates, kus kooli ei ole." },
    { fn: "backtest(ctx, id)", in: "omavalitsus", out: "{ errOos, errIns, bands[], mape }", desc: "Tagantjärele prognoos 2021→2026 ainult 2021. aastani teada olnud andmetega." },
    { fn: "decision(ctx, type, inp, params)", in: "type = elamu | kohad | siht", out: "{ rows[{area, now, effect, note}], text }", desc: "Otsuse mõju eelhinnang ja seletuskirja mõjude lõigu mustand." },
    { fn: "selfTest(ctx, ref)", in: "reference.json", out: "[{ id, name, ok, detail }]", desc: "Võrdlus põhimudeliga ja sisemise kooskõla kontroll." }
  ];

  /* ===========================================================================
   * 21. EKSPORT
   * ======================================================================== */

  const TwinEngine = {
    VERSION, G, AGEL, MORT, GEN, HH, BANDS,
    laP, pkP, gP, sum, sumG,
    calibrate, regionParams, toSingle, toGroups, projectFrom,
    build, project, projectAgg, total,
    eduBase, eduDemand, unitCosts, taxSeries, wageIdx, agesFn,
    housingImpact, devsImpact, scenarioRun, goalsEval, newcomerProfile, capOf,
    investNeed, debtPath, debtEffect, needExtra,
    settlementLayer, schoolAccess, settlementInfo,
    backtest, decision, selfTest, API, fmt, eurT
  };
  if (typeof module !== "undefined" && module.exports) module.exports = TwinEngine;
  else root.TwinEngine = TwinEngine;
})(typeof window !== "undefined" ? window : globalThis);
