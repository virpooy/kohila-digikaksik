/* Arendajale: täpsus, kasutusjuhud, andmesõnastik, mootor, konfiguratsioon. */
const PROMISES = [
  ["Demograafiliste muutuste prognoos vähemalt 5 aastaks", "ok", "Üheaastaste vanustega kohortmudel 2026–2036, viis rändemustrit, põhimudeliga testitud", "Aadressi täpsus ja aastased registriandmed"],
  ["Teenusvajaduse prognoos (haridus)", "ok", "Lasteaia- ja koolinõudlus valla ja asula kaupa", "Asutuse ja teeninduspiirkonna täpsus EHIS-est"],
  ["Elamuarenduste mõju", "ok", "Kalkulaator ja planeeringute koosmõju", "Arendused otse PLANIS-est ja ehitisregistrist"],
  ["Investeeringuvajaduse prognoos", "warn", "Kohtade puudujääk, investeering ja mõju võlakoormusele", "Tegelik mahutavus ja ühikuhinnad"],
  ["Otsuste mõju hindamine enne vastuvõtmist", "ok", "Eelhinnang ja seletuskirja mõjude lõik", "Eelnõu tekstianalüüs (välja jäetud)"],
  ["Ühistransport ja ruumiline planeerimine", "warn", "Pendelränne, ühistranspordi otseühendused, koolitee", "Marsruutimine ja sõiduplaanide muutused"],
  ["Arengukavade eesmärkide kontroll", "ok", "Kõik mõõdetavad eesmärgid ühisel „% sihist” skaalal", "Ülejäänud mõõdikute andmed"],
  ["Rakendatavus teistes omavalitsustes", "ok", "Omavalitsus lisatakse konfiguratsiooniga; Rae on pilootvald", "ELVL-i kaudu laiendamine"],
  ["Andmeallikate kaardistus ja andmekaitse", "ok", "Andmesõnastik: allikad ja isikuandmete märge", "Andmekaitse mõjuhinnang"],
  ["Kriisikindlus (haavatavad sihtrühmad)", "crit", "Ei ole eelmudelis", "Rahvastikuregister, sotsiaalteenuste andmed"]
];
const USEST = { eelmudelis: "ok", osaliselt: "warn", kaksik: "crit" }, USEW = { ok: "eelmudelis", warn: "osaliselt", crit: "ainult kaksikus" };
function secTapsus(el) {
  const rows = D.kov.units.map(u => ({ u, b: E.backtest(ctx, u.id) })), maxPop = Math.max(...rows.map(r => Math.abs(r.b.errOos))), med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const crit = `rahvaarvu viga alla ${Math.max(3, Math.ceil(med(rows.map(r => Math.abs(r.b.errOos))) * 100))}%, vanuserühmade keskmine viga alla ${Math.ceil(med(rows.map(r => r.b.mape)) * 100)}%`;
  el.innerHTML = `${ttl("Tagantjärele prognoos 2021 → 2026 · viga tegelikust", `Viie aasta prognoosi viga oli kuni ${(maxPop * 100).toFixed(1).replace(".", ",")}%; suurimad vead on väikelastel`, "h2")}
  <div class="inst"><div class="chart" id="btH"></div><p class="note">Lävendid: alla 3% ● korras, 3–8% ▲, üle 8% ■ — kaksiku kokkulepe.</p></div>
  <div class="callout"><span class="st warn">▲</span><span><b>Hankesse:</b> vastuvõtukriteerium kaksikule – ${crit}, tegelik väärtus 80% vahemikus.</span></div>
  ${more("Täpsed väärtused", table(["Omavalitsus", "Tegelik 2026", "Prognoos", "Viga", "Keskm. abs. viga", "Kalibreerimise kontroll"], rows.map(({ u, b }) => [esc(u.name), f0(b.act), f0(b.oos), pc(b.errOos), (b.mape * 100).toFixed(1).replace(".", ",") + "%", pc(b.errIns, 2)])))}
  ${more("Kuidas see on arvutatud", `<p class="note">Mudel kalibreeritakse ainult 2021. aastani teada olnud andmetega ja prognoositakse 2026. aasta. Kalibreerimise kontroll kordab rahvaarvu alla ${(Math.max(...rows.map(r => Math.abs(r.b.errIns))) * 100 + .05).toFixed(1).replace(".", ",")}% veaga, see ei tõenda prognoosi täpsust. Avaandmetega on võimalik ainult üks tagantjärele aken.</p>`)}
  ${meta("TwinEngine backtest")}`;
  heat($("#btH"), rows.map(r => r.u.short), ["Kokku"].concat(E.BANDS.map(b => b[0])), (i, j) => j === 0 ? rows[i].b.errOos : rows[i].b.bands[j - 1].err, { lw: 80, desc: "Prognoosi viga omavalitsuste ja vanuserühmade kaupa" });
}
function secKasutus(el) {
  const U = D.usecases.rows, pOk = PROMISES.filter(r => r[1] === "ok").length, uOk = U.filter(r => r.status === "eelmudelis").length;
  el.innerHTML = `${ttl("Ideekavandi lubadused ja kasutusjuhud", `Lubadustest ${pOk}/${PROMISES.length} ja kasutusjuhtudest ${uOk}/${U.length} on eelmudelis olemas`, "h2")}
  <div class="inst"><div class="chart" id="cvC"></div>${legend([{ n: "● eelmudelis", c: css("--ok"), k: "b" }, { n: "▲ osaliselt", c: css("--warn"), k: "b" }, { n: "■ ainult kaksikus", c: css("--crit"), k: "b" }])}</div>
  ${table(["Lubadus", "Seis", "Eelmudelis", "Kaksik lisab"], PROMISES.map(r => [esc(r[0]), stTag(r[1], USEW[r[1]]), esc(r[2]), `<span class="mut">${esc(r[3])}</span>`]), 9)}
  ${more("Kasutusjuhtude kataloog", table(["Kood", "Kasutusjuht", "Kasutaja", "Küsimus", "Seis", "Kaksik lisab"], U.map(r => [r.id, `${esc(r.name)}<br><code class="small">${esc(r.module)}</code>`, esc(r.who), esc(r.q), stTag(USEST[r.status], USEW[USEST[r.status]]), `<span class="mut">${esc(r.twin)}</span>`]), 9))}
  ${meta("data/usecases.json")}`;
  const part = (arr, f, keys) => keys.map(([k, col, n]) => ({ v: arr.filter(r => f(r) === k).length, color: css(col), name: n }));
  stack($("#cvC"), [{ label: "Lubadused", parts: part(PROMISES, r => r[1], [["ok", "--ok", "eelmudelis"], ["warn", "--warn", "osaliselt"], ["crit", "--crit", "ainult kaksikus"]]), txt: `${pOk}/${PROMISES.length}` }, { label: "Kasutusjuhud", parts: part(U, r => r.status, [["eelmudelis", "--ok", "eelmudelis"], ["osaliselt", "--warn", "osaliselt"], ["kaksik", "--crit", "ainult kaksikus"]]), txt: `${uOk}/${U.length}` }], { lw: 100, desc: "Eelmudeli kate" });
}
const DF = { group: "", status: "" }, DST = { olemas: "ok", hinnang: "warn", puudub: "crit" }, DPER = { ei: "ei", pseud: "pseudonüümitud", jah: "jah" };
function secSonastik(el) {
  const F = D.dictionary.fields, rows = D.dictionary.rows.map(r => Object.fromEntries(F.map((k, i) => [k, r[i]]))), groups = [...new Set(rows.map(r => r.group))];
  const cnt = k => rows.filter(r => r.status === k).length, per = rows.filter(r => r.personal !== "ei").length, vis = rows.filter(r => (!DF.group || r.group === DF.group) && (!DF.status || r.status === DF.status));
  el.innerHTML = `${ttl(`Andmesõnastik · ${rows.length} näitajat`, `${cnt("olemas")} näitajat on avaandmetest olemas, ${cnt("hinnang")} on hinnang, ${cnt("puudub")} puudub; ${per} vajab kaksikus pseudonüümitud andmeid`, "h2")}
  <div class="inst"><div class="chart" id="dcC"></div>${legend([{ n: "● olemas", c: css("--ok"), k: "b" }, { n: "▲ hinnang", c: css("--warn"), k: "b" }, { n: "■ puudub", c: css("--crit"), k: "b" }])}</div>
  <div class="form" style="max-width:520px"><div class="f"><label for="dfG">Valdkond</label><select id="dfG"><option value="">kõik</option>${groups.map(g => `<option ${g === DF.group ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></div>
    <div class="f"><label for="dfS">Seis</label><select id="dfS"><option value="">kõik</option>${Object.keys(DST).map(k => `<option value="${k}" ${k === DF.status ? "selected" : ""}>${k}</option>`).join("")}</select></div></div>
  ${more(`Näitajad (${vis.length})`, table(["Kood", "Näitaja", "Praegune allikas", "Periood", "Kaksiku sihtallikas", "Isikuandmed", "Seis"], vis.map(r => [r.id, `<b>${esc(r.name)}</b><br><span class="small dim">${esc(r.unit)} · ${esc(r.level)}</span>${r.note ? `<br><span class="small mut">${esc(r.note)}</span>` : ""}`, esc(r.src) + (r.table && r.table !== "–" ? `<br><code>${esc(r.table)}</code>` : ""), `${esc(r.period)}<br><span class="dim">${esc(r.update)}</span>`, esc(r.target), DPER[r.personal], stTag(DST[r.status], r.status)]), 9), !!(DF.group || DF.status))}
  ${meta("data/dictionary.json", csvBtn("dict", "andmesonastik.csv", F, D.dictionary.rows))}`;
  stack($("#dcC"), groups.map(g => { const R = rows.filter(r => r.group === g); return { label: g, parts: [["olemas", "--ok"], ["hinnang", "--warn"], ["puudub", "--crit"]].map(([k, c]) => ({ v: R.filter(r => r.status === k).length, color: css(c), name: k })), txt: String(R.length) }; }), { lw: 150, rw: 30, desc: "Näitajad valdkondade kaupa" });
  $("#dfG").onchange = e => { DF.group = e.target.value; secSonastik(el); }; $("#dfS").onchange = e => { DF.status = e.target.value; secSonastik(el); };
}
function secMootor(el) {
  const pass = TESTS.filter(t => t.ok).length;
  el.innerHTML = `${ttl(`Arvutusmootor ${esc(E.VERSION)}`, pass === TESTS.length ? `Kõik ${TESTS.length} enesetesti on läbitud; rahvaarv kattub põhimudeliga täpselt` : `${TESTS.length - pass} testi ${TESTS.length}-st ebaõnnestus`, "h2")}
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">${TESTS.map(t => `<div data-tip="${esc(`<b>${esc(t.id)}</b> ${esc(t.name)}<br>${esc(t.detail)}`)}" style="border:1px solid var(--line);border-left:4px solid var(${t.ok ? "--ok" : "--crit"});border-radius:6px;padding:6px 9px;display:flex;flex-direction:column;gap:2px"><span class="st ${t.ok ? "ok" : "crit"}">${t.ok ? "●" : "■"} ${t.id}</span><span class="small">${esc(t.name.split(/[(:—]/)[0].trim())}</span></div>`).join("")}</div>
  <div class="callout"><span class="st ok">●</span><span>Mootor 3 on kirjutatud nullist. Võrdlustest (<code>tests/parity.test.js</code>) kontrollib 26 000+ väärtust versiooni 2.2.0 väljunditega: kõik kattuvad täpselt. Ainus muudatus: otsuse „elamu” tekstis arvestatakse nüüd tasandusfondi kadu.</span></div>
  ${more("Testide üksikasjad", table(["Test", "Kontroll", "Tulemus", "Detail"], TESTS.map(t => [t.id, esc(t.name), stTag(t.ok ? "ok" : "crit", t.ok ? "läbitud" : "ebaõnnestus"), `<span class="mono small">${esc(t.detail)}</span>`]), 9) + `<p class="note">T1–T6b ja T12 võrdlevad põhimudeliga (<code>data/reference.json</code>). Node'is: <code>node engine.test.js</code> (enesetest + võrdlustest).</p>`)}
  ${more("Funktsioonid", table(["Funktsioon", "Sisend", "Väljund", "Kirjeldus"], E.API.map(a => [`<code>${esc(a.fn)}</code>`, esc(a.in), esc(a.out), `<span class="mut">${esc(a.desc)}</span>`]), 9))}
  ${more("Failid", table(["Fail", "Sisu"], [["engine.js", "Arvutusmootor 3 (puhtad funktsioonid, brauser ja Node)"], ["engine.test.js", "Enesetest + võrdlustest"], ["tests/parity.test.js", "Võrdlus mootori 2.2.0 väljunditega (tests/golden_v2.json)"], ["src/", "Kasutajaliides: shell.html, app.css, core.js, ch_*.js, main.js"], ["build.py", "Paneb src/ ja engine.js kokku failiks index.html"], ["data/*.json", "Andmed (kov, pop, fin, edu, ext, settlements, dictionary, usecases, reference, geo, transit, dp)"], ["tools/update_open_data.js", "Avaandmete igakuine uuendus (GitHub Actions)"], ["tools/import_vald.py", "Valla koondandmete import väikeste lahtrite kontrolliga"], ["tools/pk_export.py", "Planeeringukontrolli eksport"]].map(r => [`<code>${r[0]}</code>`, esc(r[1])]), 9))}
  ${meta("TwinEngine selfTest")}`;
}
function secKonf(el) {
  el.innerHTML = `${ttl("Omavalitsused failist data/kov.json", `${D.kov.units.length} omavalitsust ja ${D.kov.aggregates.length} koondüksus; Rae on lisatud ainult konfiguratsiooniga`, "h2")}
  ${table(["Id", "Nimi", "Piirkond", "Eluea viide", "Haridusandmed", "Maakonnas", "Pilootvald", "Mõõdetavaid eesmärke"], D.kov.units.map(u => [`<span class="mono">${u.id}</span>`, `<span style="color:var(--v-${u.id.toLowerCase()})">●</span> ${esc(u.name)}`, `<span class="mono">${u.region}</span>`, esc(u.e0Ref) + " maakond", u.edu === "hinnang" ? rel("hinnang") : rel("ametlik"), u.inMaak ? "jah" : "ei", u.pilot ? "jah" : "–", (u.goals || []).length || '<span class="missing">puudub</span>']), 9)}
  ${more("Uue omavalitsuse lisamine", `<ol style="margin:0;padding-left:20px"><li>Lisa kirje faili <code>data/kov.json</code>: id, nimi, värv, piirkond, eluea viitemaakond ja eesmärgid.</li><li>Lisa rahvastikuandmed faili <code>data/pop.json</code> (RV0282U, RV112U, RV49U, RVR02).</li><li>Lisa eelarve (RR300) faili <code>data/fin.json</code>; välisränne, pendelränne ja eluruumid faili <code>data/ext.json</code>.</li><li>Lisa asulad (RL21003) faili <code>data/settlements.json</code>.</li><li>Kui haridusandmeid ei ole, märgi <code>"edu":"hinnang"</code>.</li><li>Käivita <code>node engine.test.js</code> ja <code>python3 build.py</code>.</li></ol>`)}
  ${more("Rae vald pilootvallana", `<p class="note">Rahvastik Statistikaametist; lasteaialapsed ja -kohad, õpilased ja koolikohad, RR302 kulud, MTA tulumaks ja eelarvestrateegia 2027–2030 avalikest allikatest (<code>docs/andmed/rae-avalikud-andmed.md</code>). Arvulist rahvaarvu sihti Rae arengukavas ei ole; „kontrollitud kasvu” mõõdik on kasvuvahemik. Koolid: ${esc((D.edu.raeSchools || []).join(", "))}.</p>`)}
  ${meta("data/kov.json")}`;
}
