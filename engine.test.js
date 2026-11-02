/* Mootori testid (CI: node engine.test.js)
 * 1) selfTest T1–T19: võrdlus põhimudeliga (data/reference.json) ja sisemine kooskõla.
 * 2) Pariteeditest: mootor annab samad tulemused mis 2.2.0 (tests/parity.test.js).
 * Väljumiskood 1, kui mõni test ebaõnnestub. */
"use strict";
const fs = require("fs"), path = require("path");
const E = require("./engine.js");
const rd = f => JSON.parse(fs.readFileSync(path.join(__dirname, "data", f + ".json")));

const data = { kov: rd("kov"), pop: rd("pop"), fin: rd("fin"), edu: rd("edu"), ext: rd("ext"), settlements: rd("settlements") };
const ctx = E.build(data);
console.log("TwinEngine " + E.VERSION);

const res = E.selfTest(ctx, rd("reference"));
res.forEach(r => console.log(r.ok ? "OK  " : "FAIL", r.id, r.name, "—", r.detail));
const selfOk = res.every(r => r.ok);
console.log(selfOk ? "Kõik enesetestid läbitud (" + res.length + ")" : "ENESETESTID EBAÕNNESTUSID");

console.log("");
const parity = require("./tests/parity.test.js").run();

const allOk = selfOk && parity.ok;
console.log("\n" + (allOk ? "Kõik testid läbitud" : "TESTID EBAÕNNESTUSID"));
process.exitCode = allOk ? 0 : 1;
