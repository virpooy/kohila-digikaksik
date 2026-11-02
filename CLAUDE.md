# CLAUDE.md – Kohila digikaksik

Juhend Claude Code'ile. Loe see läbi enne iga tööd, seejärel `docs/uleandmine.md` (seis, avatud ülesanded, teadaolevad vead). Vasta ja kirjuta eesti keeles; kood ja muutujanimed võivad jääda nagu on.

## Mis see on

Kohila ja Rae valla (ning Raplamaa valdade) digitaalne kaksik: deterministlik arvutusmootor `engine.js` (TwinEngine 3.x) ja staatiline veebileht GitHub Pagesis, sama leht on avaldatud ka claude.ai artefaktina. Kaksik ühendab viis eelmudelit (Raplamaa arengukangas = põhimudel, Kohila arengukangas, planeeringute mõjukangas, planeeringukontroll, kaksiku eelmudel): rahvastiku kohortmudel, haridusvajadus ja kohad, tulumaks, kulud, investeeringud, võlg, tasandusfond, elamuarenduse mõju, asulad, kaart, ühistransport (GTFS), pendelränne, arengukava eesmärgid, otsuse mõju eelhinnang.

- Omanik ja otsustaja: **Peeter Pallav** (GitHub `virpooy`). Tema määrab prioriteedid, kinnitab suuremad muudatused ja suhtleb vallaga.
- Kohila vald on kasutaja ja andmepartner ilma rahata; arendus käib väljaspool tööaega. Litsents EUPL-1.2, kood kuulub Peetrile.
- Kasutajad: vallaametnikud, planeerijad, haridus- ja finantsjuhid, volikogu. Liides peab olema arusaadav ilma juhendita.

## Püsireeglid (muudetakse ainult Peetri otsusega)

1. **Isikuandmeid ei kasutata.** Ainult avaandmed ja koondandmed; alla 5 inimese/majapidamisega lahter peidetakse või ühendatakse (`tools/import_vald.py`).
2. **AI ei arvuta ühtegi numbrit.** Kõik arvud tulevad `engine.js`-ist või andmefailidest; ära kirjuta arve käsitsi koodi, teksti ega dokumentidesse. Leht töötab ka ilma AI-ta.
3. **Andmeid ei mõelda välja.** Puuduv väärtus = „puudub” (`Logic.NA`), mitte 0. Ei väljamõeldud koordinaate, reisijate arve, sõiduaegu, täituvust ega täpsusnäitajaid. Kontrollimata allikas = „kontrollida”.
4. **Iga arv on märgistatud:** ühik, periood, allikas (`SRC` kataloog `src/sources.js`) ja päritolumärgis `ametlik` / `mudel` / `eeldus` / `hinnang` / `puudub` / `aegunud` (`rel()`, sõna + ikoon, mitte ainult värv).
5. **Järeldused on tingimuslikud** („Valitud eeldustel …”). Teenuste piisavus = „valla koondarvestuses”, kui ruumilist analüüsi pole. Stsenaariumide vahemik ei ole statistiline prognoosivahemik.
6. **Mootori numbreid ei muudeta ilma Peetri kinnituseta.** Pariteeditest (`tests/parity.test.js`) peab läbima; tahtlik muutus = uus `VERSION`, logi failipäises, pariteedi ootuse uuendus ja kirje `docs/otsused.md`-s.
7. **Mootoris ei ole ühtegi valla nime.** Omavalitsused tulevad `data/kov.json`-ist; valla lisamine = andmete lisamine.
8. **Eelnõude tekstianalüüs (NLP) ei kuulu kaksikusse.** Planeeringukontrolli reegli- ja vormipõhine kontroll on lubatud.
9. Põhimudelit (repo `virpooy/raplamaa-arengumudel`) ega teisi eelmudeleid siit ei muudeta.
10. Hindamiskava lävendeid (E0, K1–K3) ei muudeta pärast tulemuste nägemist.

## Ülesehitus

| Asukoht | Sisu |
|---|---|
| `engine.js` | Mootor 3.0.1: puhtad funktsioonid, sektsioonid 1–21, avalik API massiivis `API`, `selfTest` T1–T19 (pariteet võrdleb neist ainult 2.2.0 teste T1–T18). Brauseris `window.TwinEngine`, Node'is `module.exports`. Ülevaade `docs/mootor-3.md`. |
| `src/shell.html` | Lehe karkass, kohatäitjad `/*__CSS__*/`, `/*__ENGINE__*/`, `/*__APP__*/`. |
| `src/app.css` | k9 visuaalsüsteem, tume ja hele teema, kaardi värvid (`--m-*`). |
| `src/core.js` | Olek `S` (vald, rändemuster, lisaränne, sündimus, aasta), andmete laadimine, vorming, `ttl/more/meta/table/use`, CSV ja `dlText`, hõpikvihje, joonised `timeChart`, `bars`, `waterfall`, `goalRows`, `stack`, `heat`. |
| `src/logic.js` | **Puhtad UI-arvutused** (Node'is testitav): `dpStatus`, `eduReserve`, `stress`, `capState`, `budgetSens`, `budgetTotals`, `commuteRows`, `haversine/nearest`, `inWindow`, stsenaariumi eksport/import, URL-i olek. Uus koondamis- või kontrolliloogika läheb siia, mitte DOM-koodi. |
| `src/sources.js` | Allikakataloog `SRC`, päritolumärgised `PROV`, ⓘ-dialoog. |
| `src/ch_otsus.js` | Ülevaade (lühivaade, andmete kindlus, kuidas lugeda), eesmärgid, rahvastik, asulad, kohad, investeering ja võlg. |
| `src/ch_plan.js` | Planeeringud, arenduse kalkulaator, eelarveplokk, stsenaariumide töölaud + eksport, otsuse eelhinnang + seletuskiri, „Küsi kaksikult”. |
| `src/ch_kaart.js` | Kaart neljas režiimis (`piirkonnad`, `too`, `yt`, `ligi`): kihid, otsing, detailipaneel, seotud graafik ja tabel, suum, täisekraan, SVG-eksport. |
| `src/ch_dev.js` | Andmed ja metoodika: allikad, täpsus (tagasitest), andmesõnastik, mootor ja testid, kasutusjuhud, konfiguratsioon. |
| `src/main.js` | 5 menüürühma `CHS`, vanad süvalingid `ALIAS`, räsi `#rühm/jaotis?u=&m=&x=&f=&y=`, päis, mobiilimenüü, käivitus. |
| `build.py` | Paneb `src/` + `engine.js` kokku → `index.html` (gitis ignoreeritud). **Uus `src/*.js` tuleb lisada `APP` loendisse** (järjekord loeb: core, logic, sources, peatükid, main). |
| `data/` | vt „Andmefailid” allpool. |
| `tools/` | `update_open_data.js` (kuine MTA + RR302), `osm_kaart.js` (OSM kaardikihid), `gtfs.js` (ühistransport), `rak_reference.js` (põhimudeli referents), `pk_export.py` (planeeringukontrolli eksport), `import_vald.py` (valla koondandmed), `rae_andmed.js`, `uuring/` (ühekordsed päringud). |
| `tests/` | `parity.test.js` + `golden_v2.json` + `engine_v2_2_0.js` (mootori 2.2.0 oraakel), `content.test.js` (51 sisulist kontrolli), `gtfs.test.js` + `fixtures/gtfs_mini`, `ui/smoke.js` (Playwright), `index_v2.src.html` (vana liides, ainult ajaloo jaoks). |
| `planeeringukontroll/` | Planeeringukontrolli artefakti lähtekood, audit ja testid (eraldi rakendus). |
| `docs/` | `uleandmine.md` (seis ja ülesanded), `otsused.md` (otsuste logi), `mootor-3.md`, `gtfs.md`, `taiendus-2026-11.md`, `vordlus.md` (E1–E10), `magistritoo-soovitused.md`, `uuringud/tekst-ja-graafika.md` (P1–P18), `kaardistus/`, `andmed/`. |

### Andmefailid

| Fail | Sisu | Kuidas uueneb |
|---|---|---|
| `kov.json` | omavalitsused, agregaadid, eesmärgid, mudeli parameetrid (ränne, eluase, hinnad, laen, tasandusfond, piirkulu) | käsitsi |
| `pop.json`, `ext.json`, `fin.json`, `edu.json`, `settlements.json`, `peers.json` | rahvastik, ränne, eelarve/MTA, haridus, asulad (REL 2021) | `andmed.yml` (MTA, RR302) kord kuus; ülejäänu käsitsi |
| `commute.json` | REL 2021 RL21163 töökoha asukoha kategooriad, 5 valda | ühekordne (`tools/uuring/pendel.js`) |
| `map/<vald>.json`, `map/region.json` | OSM: piirid, külad, teed, raudtee, vesi, maakate, haridusasutused; Eesti maakonnad ja KOV-id | `kaart.yml` käsitsi |
| `transit/<vald>.json` | GTFS: peatused, liinid, geomeetria, 14 analüüsipäeva | `yt.yml` käsitsi |
| `transit.json`, `geo.json` | vanad (31.10.2026) ühepäevane ühistranspordi kokkuvõte ja Kohila/Rae kaardikiht – kasutusel varuna | ei uuene |
| `dp.json` | planeeringukontrolli detailplaneeringud | `tools/pk_export.py` |
| `reference.json` | põhimudeli väljundid testideks | `tools/rak_reference.js` |
| `dictionary.json`, `usecases.json`, `sources.json` | andmesõnastik, kasutusjuhud, varulingid | käsitsi |

## Käsud

```
node engine.test.js            # enesetestid + pariteet – peab läbima enne iga commit'i
node tests/content.test.js     # sisulised kontrollid (käivitab ka tests/gtfs.test.js)
python3 build.py               # ehitab index.html
python3 -m http.server 8765    # leht: http://localhost:8765
node tests/ui/smoke.js         # brauseritest: kõik jaotised 1440 px ja 390 px, vead ja horisontaalne kerimine
```

Windowsis: käivita `python build.py` seadega `PYTHONUTF8=1` (muidu loeb Python faile cp1252-na); brauseritest vajab `npm install --no-save playwright` ja `npx playwright install chromium` (`node_modules/` on gitis ignoreeritud).

CI (`.github/workflows/ci.yml`, „Testid ja leht”) käivitab mootori- ja sisutestid, ehitab lehe ja avaldab GitHub Pagesi iga `main`-i push'i peale.

## Iga muudatuse kord

1. **Arvutus**: mootori loogika `engine.js`-i (puhas funktsioon, `API` kirje, enesetest); UI-koondamine `src/logic.js`-i (+ kontroll `tests/content.test.js`-is). Peatükifailid ainult kuvavad.
2. Kaart, graafik ja tabel kasutavad **sama** funktsiooni ja väärtust (nt `ytAgg`, `popLayer`, `Logic.commuteRows`). Ära arvuta sama näitajat eri vaates erinevalt.
3. `node engine.test.js` → `node tests/content.test.js` → `python3 build.py` → `node tests/ui/smoke.js`. Vaata ekraanipildid üle (laius 1440 hele, 390 tume): konsoolis vigu ei ole, horisontaalset kerimist ei ole.
4. Uus andmeallikas → kirje `src/sources.js` `SRC`-i (periood, hankimise kuupäev, detailsus, arvutusviis, piirang) ja `data/dictionary.json`-i.
5. Sisuline otsus → `docs/otsused.md` (kuupäev, otsus, otsustaja). Hoia `README.md` ja `docs/uleandmine.md` ajakohased.
6. Väikesed eestikeelsed commit'id. Suurem töö eraldi harus + PR, et Peeter saaks üle vaadata.

## Kasutajaliidese reeglid

- Magistritöö põhimõtted P1–P18 (`docs/uuringud/tekst-ja-graafika.md`) ja k9 visuaalsüsteem: **vähe teksti, rohkem graafikat**; iga jaotis algab leiupealkirjaga (arvutatud); tabelid ja metoodika `<details>` taga; „Milleks sobib / ei sobi / pea meeles”.
- Prognoos = katkendjoon, vahemik = viirutus, siht = romb ja „% sihist”, lävend = punktiir koos tähendusega, seis = kuju + värv + sõna (● ▲ ■ ◇).
- Igas vaates jaluses `meta([...allikavõtmed])` – ⓘ-nupud, mitte üldine „andmed seisuga” kuupäev.
- Töötab 390 px laiusel, klaviatuuriga, nähtava fookusega; nupugruppidel `aria-pressed`; graafikul on tabelalternatiiv.
- Laadivatel vaadetel on laadimis-, vea- (koos „Proovi uuesti”), tühi ja osaliste andmete olek.
- Kaardil: ringi **pindala** ∝ väärtus; planeeringu asukoht on ligikaudne (asula keskpunkt) ja nii märgitud; voojoon ei ole marsruut; GTFS = sõiduplaanijärgne pakkumine, mitte reisijate arv.

## Keskkond ja võrk

- Pilvekeskkonnast **ei pruugi vastata** Statistikaamet, Overpass, Transpordiameti GTFS ega teised allikad. Sel juhul kasuta GitHub Actionsit: `uuring.yml` (skript `tools/uuring/*.js`, väljund harusse `uuring`, loe `git clone -b uuring …`), `kaart.yml`, `yt.yml`, `andmed.yml`. Töövoo logisid ei saa siit alla laadida – kasuta `::notice` annotatsioone (`gh api repos/virpooy/kohila-digikaksik/check-runs/<jobId>/annotations`).
- Töövood lükkavad ise `main`-i; enne push'i tee alati `git pull --rebase`.
- Overpass on aeglane ja vahel 502/504; `osm_kaart.js` proovib kolme serverit ja salvestab õnnestunud osa.
- claude.ai artefakt (`https://claude.ai/artifact/AkMamLcPR5zDJDwFdTQdqJ`, võimekused `downloads` + `sample`) uuendatakse Artifact-tööriistaga: `file_path` = `index.html`, `root` = repo, `files` = muutunud `data/**` failid. Kui tööriista pole, on kanooniline versioon GitHub Pages.

## Kui kahtled

Küsi Peetrilt enne, kui muudad püsireegleid, mootori numbreid, kustutad andmeid või funktsionaalsust või lisad uue välise/tasulise teenuse. Muul juhul tee mõistlik valik ja kirjuta see PR-i kirjeldusse.
