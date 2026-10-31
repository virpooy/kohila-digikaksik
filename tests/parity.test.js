/*
 * Pariteeditest: mootor 3.0.0 (engine.js) annab samad tulemused mis 2.2.0.
 *
 * Oraakel: tests/golden_v2.json, koostatud skriptiga tests/golden_gen.js mootorist
 * tests/engine_v2_2_0.js. Siin arvutatakse samad kutsed samade parameetritega
 * (funktsioon compute peegeldab golden_gen.js-i rida-realt) ja võrreldakse sügavuti:
 *  - arvud: suhteline vahe ≤ 1e-9 (nulli lähedal absoluutne ≤ 1e-9),
 *  - sõned, tõeväärtused ja null: täpne võrdsus, samad võtmed.
 * Ainus lubatud erinevus: decision.elamu.text (3.0.0 veaparandus – neto sisaldab
 * tasandusfondi kadu). Selle kohta kontrollitakse, et uus tekst = vana tekst, kuhu
 * on lisatud tasandusfondi lause ja neto on asendatud väärtusega dNet.
 *
 * Kasutus: node tests/parity.test.js   (väljumiskood 1, kui midagi ei klapi)
 * Ka moodulina: require("./tests/parity.test.js").run() → { ok, groups, failures }
 */
"use strict";
const fs = require("fs"), path = require("path");

const ROOT = path.join(__dirname, "..");
const readData = n => JSON.parse(fs.readFileSync(path.join(ROOT, "data", n + ".json")));
const TOL = 1e-9;

/** Arvutab kõik golden_gen.js kirjed antud mootoriga (sama järjekord ja parameetrid). */
function compute(E) {
  const D = readData;
  const ctx = E.build({ kov: D("kov"), pop: D("pop"), fin: D("fin"), edu: D("edu"), ext: D("ext"), settlements: D("settlements") });
  const U = Object.keys(ctx.units), M = ["r1", "mean", "r2", "r2x", "r3"], out = {};
  const strip = o => JSON.parse(JSON.stringify(o, (k, v) => typeof v === "function" ? undefined : v));
  out.cal = {}; U.forEach(id => out.cal[id] = ctx.units[id].cal);
  out.regions = ctx.regions; out.taxCtx = ctx.tax; out.eduBase = ctx.eduBase; out.uc = ctx.uc;
  out.project = {}; U.forEach(id => M.forEach(m => [{ mig: m }, { mig: m, extra: 40, fert: 10 }, { mig: m, fertTr: "down", mort: "tr", vx: 25 }].forEach((p, i) => out.project[id + "|" + m + "|" + i] = E.project(ctx, id, p))));
  out.projectAgg = {}; M.forEach(m => out.projectAgg[m] = E.projectAgg(ctx, "MAAK", { mig: m, extra: 20 }));
  out.tax = {}; U.forEach(id => out.tax[id] = E.taxSeries(ctx, id, E.agesFn(ctx, id, E.project(ctx, id, {})), {}));
  out.edu = {}; U.forEach(id => { const P = E.project(ctx, id, {}); out.edu[id] = [2026, 2030, 2036].map(y => E.eduDemand(ctx, id, P[y])); });
  out.housing = {}; U.forEach(id => ["korter", "ridaelamu", "eramu"].forEach(t => out.housing[id + "|" + t] = strip(E.housingImpact(ctx, id, { n: 120, type: t, start: 2028, years: 2, settlement: null }, { mig: "r2" }))));
  out.housing2 = strip(E.housingImpact(ctx, "Kohila", { n: 80, type: "korter", start: 2029, years: 3, hh: 2.4, occ: 0.9, outside: 0.6, settlement: "Urge küla", capLa: 450, capSc: 950 }, {}));
  out.devs = strip(E.devsImpact(ctx, "Kohila", [{ n: 40, type: "eramu", start: 2028, years: 2 }, { n: 60, type: "korter", start: 2029, years: 3 }], {}));
  out.scen = strip(E.scenarioRun(ctx, "Kohila", { params: { mig: "r2", extra: 30 }, devs: [{ n: 100, type: "korter", start: 2028, years: 2 }], capLa: 500, capSc: 1100, capFrom: 2029 }));
  out.goals = {}; U.concat(["MAAK"]).forEach(id => out.goals[id] = strip(E.goalsEval(ctx, id, {})));
  out.invest = {}; U.forEach(id => out.invest[id] = strip(E.investNeed(ctx, id, E.project(ctx, id, {}), {})));
  out.debt = {}; U.forEach(id => { out.debt[id] = strip(E.debtPath(ctx, id, 1e6)); out.debt[id + "|eff"] = strip(E.debtEffect(ctx, id, 2e6)); });
  out.need = {}; ["Kohila", "Rapla", "Kehtna"].forEach(id => out.need[id] = E.needExtra(ctx, id, ctx.units[id].target.pop, 2035, {}));
  out.settle = {}; U.forEach(id => { const P = E.project(ctx, id, {}); out.settle[id] = strip(E.settlementLayer(ctx, id, P, 2036)); out.settle[id + "|acc"] = strip(E.schoolAccess(ctx, id, P, 2036)); });
  out.backtest = {}; U.forEach(id => out.backtest[id] = strip(E.backtest(ctx, id)));
  out.decision = { elamu: strip(E.decision(ctx, "elamu", { unit: "Kohila", n: 120, type: "korter", start: 2028, years: 2 }, {})), kohad: strip(E.decision(ctx, "kohad", { unit: "Kohila", kind: "la", delta: 40, year: 2028 }, {})), siht: strip(E.decision(ctx, "siht", { unit: "Kohila", target: 10000, year: 2035 }, {})) };
  out.selfTest = E.selfTest(ctx, D("reference")).map(t => [t.id, t.ok]);
  // Sama serialiseerimine nagu golden-failil (Infinity/NaN → null, funktsioonid välja)
  return JSON.parse(JSON.stringify(out));
}

/** Sügav võrdlus; kogub erinevused ja suurima absoluut-/suhtelise vahe. */
function deepCompare(a, b, where, stats, failures, skip) {
  if (skip && skip(where)) return;
  const fail = msg => failures.push(where + ": " + msg);
  if (typeof a === "number" && typeof b === "number") {
    const abs = Math.abs(a - b), rel = abs / Math.max(Math.abs(a), Math.abs(b), Number.MIN_VALUE);
    stats.n++;
    stats.maxAbs = Math.max(stats.maxAbs, abs);
    if (Math.max(Math.abs(a), Math.abs(b)) > TOL) stats.maxRel = Math.max(stats.maxRel, rel);
    const ok = abs <= TOL || rel <= TOL;
    if (!ok) fail("arv " + a + " ≠ " + b + " (abs " + abs.toExponential(2) + ", rel " + rel.toExponential(2) + ")");
    return;
  }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    stats.n++;
    if (a !== b) fail(JSON.stringify(a) + " ≠ " + JSON.stringify(b));
    return;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return fail("massiiv vs objekt");
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  if (JSON.stringify(ka) !== JSON.stringify(kb)) {
    const onlyA = ka.filter(k => !kb.includes(k)), onlyB = kb.filter(k => !ka.includes(k));
    fail("võtmed erinevad (ainult uues: " + onlyA.join(",") + "; ainult vanas: " + onlyB.join(",") + ")");
  }
  ka.filter(k => kb.includes(k)).forEach(k => deepCompare(a[k], b[k], where + "." + k, stats, failures, skip));
}

/** Võrdleb arvutatud väljundit kuldfailiga rühmade kaupa. */
function compareAll(actual, golden, skip) {
  const groups = {}, failures = [];
  const keys = [...new Set(Object.keys(golden).concat(Object.keys(actual)))];
  keys.forEach(g => {
    const stats = { n: 0, maxAbs: 0, maxRel: 0 };
    if (!(g in actual)) failures.push(g + ": rühm puudub uues väljundis");
    else if (!(g in golden)) failures.push(g + ": rühm puudub kuldfailis");
    else deepCompare(actual[g], golden[g], g, stats, failures, skip);
    groups[g] = stats;
  });
  return { groups, failures };
}

/** decision.elamu.text: oodatav uus tekst tuletatakse vanast tekstist ja kuldväärtustest. */
function checkHousingText(E, actual, golden) {
  const failures = [];
  const oldText = golden.decision.elamu.text, newText = actual.decision.elamu.text;
  const L = golden.decision.elamu.H.last;
  const signedEur = v => v >= 0 ? "umbes +" + E.eurT(v) : "umbes −" + E.eurT(-v);
  const oldNet = L.dTaxR - L.dCost, newNet = L.dNet;
  const oldTail = "Tulu ja kulu vahe on seega suurusjärk: " + signedEur(oldNet) + " aastas. ";
  const newTail = "Tasandusfondist kaob umbes " + E.eurT(L.dTf) + " aastas. "
    + "Tulu ja kulu vahe on seega suurusjärk: " + signedEur(newNet) + " aastas. ";
  if (!oldText.includes(oldTail)) failures.push("decision.elamu.text: vana tekst ei sisalda oodatud neto lauset (dTaxR − dCost)");
  if (!newText.includes("Tasandusfondist kaob umbes " + E.eurT(L.dTf) + " aastas.")) failures.push("decision.elamu.text: tasandusfondi lause puudub");
  if (Math.abs(newNet - (L.dTaxR - L.dTf - L.dCost)) > 1e-6) failures.push("decision.elamu.text: dNet ≠ dTaxR − dTf − dCost");
  const expected = oldText.replace(oldTail, newTail);
  if (newText !== expected) failures.push("decision.elamu.text: uus tekst ≠ vana tekst + tasandusfondi lause + neto dNet\n  uus:     " + newText + "\n  oodatud: " + expected);
  return { failures, oldNet, newNet, dTf: L.dTf };
}

function run(opts) {
  const quiet = opts && opts.quiet;
  const log = (...a) => { if (!quiet) console.log(...a); };
  const golden = JSON.parse(fs.readFileSync(path.join(__dirname, "golden_v2.json")));
  const failures = [];

  // 0) Rakmete kontroll: compute() + 2.2.0 mootor peab andma kuldfaili täpselt (sh vana tekst).
  const oldOut = compute(require("./engine_v2_2_0.js"));
  const oracle = compareAll(oldOut, golden);
  oracle.failures.forEach(f => failures.push("[oraakel 2.2.0] " + f));
  const oracleMax = Math.max(...Object.values(oracle.groups).map(s => s.maxAbs));
  log("Oraakli kontroll (2.2.0 vs golden_v2.json): " + (oracle.failures.length ? oracle.failures.length + " erinevust" : "täpne, suurim vahe " + oracleMax));

  // 1) Uus mootor vs kuldfail
  const E = require(path.join(ROOT, "engine.js"));
  const newOut = compute(E);
  const isHousingText = where => where === "decision.elamu.text";
  const cmp = compareAll(newOut, golden, isHousingText);
  failures.push(...cmp.failures);

  // 2) Lubatud erinevus: decision.elamu.text
  const txt = checkHousingText(E, newOut, golden);
  failures.push(...txt.failures);

  log("\nPariteet: " + E.VERSION + " vs 2.2.0 (tests/golden_v2.json)");
  log("rühm".padEnd(12) + "väärtusi".padStart(10) + "max abs".padStart(12) + "max rel".padStart(12));
  Object.entries(cmp.groups).forEach(([g, s]) =>
    log(g.padEnd(12) + String(s.n).padStart(10) + s.maxAbs.toExponential(1).padStart(12) + s.maxRel.toExponential(1).padStart(12)));
  log("decision.elamu.text: neto vana (dTaxR − dCost) " + E.eurT(txt.oldNet) + " → uus dNet " + E.eurT(txt.newNet)
    + " (tasandusfond " + E.eurT(txt.dTf) + ")" + (txt.failures.length ? " – VIGA" : " – ootuspärane muudatus"));

  if (failures.length) {
    log("\nPARITEET EBAÕNNESTUS (" + failures.length + "):");
    failures.slice(0, 40).forEach(f => log("  " + f));
  } else log("Pariteet läbitud");
  return { ok: failures.length === 0, groups: cmp.groups, failures };
}

module.exports = { run, compute };
if (require.main === module) {
  const r = run();
  process.exitCode = r.ok ? 0 : 1;
}
