# Arvutusmootor 3.0.0

`engine.js` (TwinEngine 3.0.0, 01.11.2026) on mootori 2.2.0 nullist ümber kirjutatud versioon. Eesmärk oli loetavus ja hooldatavus. Arvutusloogika, avalik API ja väljundite kuju jäid samaks.

## Ülesehitus

Fail on jagatud nummerdatud sektsioonideks. Igal funktsioonil on lühike eestikeelne kirjeldus: mida see teeb, mis on sisend, mis on väljund ja millise otsusega (E1–E10) see seotud on.

| # | Sektsioon | Peamised funktsioonid |
|---|---|---|
| 1 | Konstandid | `VERSION`, `G`, `AGEL`, `MORT`, `GEN`, `BANDS`, `HOUSING`/`HH`, `DEF` |
| 2 | Abifunktsioonid | `sum`, `sumG`, `total`, `laP`/`pkP`/`gP`, `slope`, `lifeExpectancy`, `fmt`, `sgn`, `eurT` |
| 3 | Kohortmootor | `toSingle`, `toGroups`, `stepYear`, `projectFrom` |
| 4 | Kalibreerimine (E1) | `mortalityLevel`, `fertilityRate`, `balanceMigration`, `registeredMigration`, `cohortResidual`, `calibrate` |
| 5 | Piirkonna parameetrid | `regionParams` |
| 6 | Kontekst | `build` |
| 7 | Projektsioon | `project`, `projectAgg` |
| 8–10 | Haridus, kulud, tulumaks | `eduBase`, `eduDemand`, `unitCosts`, `buildTax`, `taxSeries`, `wageIdx`, `agesFn` |
| 11 | Elamuarendus (E2–E8) | `newcomerProfile`, `devAdd`, `devsImpact`, `housingImpact` |
| 12–13 | Stsenaarium, eesmärgid | `scenarioRun`, `goalsEval` |
| 14 | Investeeringud ja võlg (E7, E8, E10) | `capOf`, `investNeed`, `debtPath`, `debtEffect` |
| 15 | Siht | `needExtra` |
| 16 | Asulad ja koolitee | `settlementInfo`, `settlementLayer`, `schoolAccess` |
| 17 | Tagasitest | `backtest` |
| 18 | Otsused | `decision` → `decisionHousing`, `decisionPlaces`, `decisionTarget` |
| 19–21 | Enesetest, API, eksport | `selfTest` (T1–T18), `API`, UMD-eksport |

Keskkonna leping on sama mis enne:
- brauseris on mootor `window.TwinEngine`, Node'is `module.exports`;
- funktsioonid on puhtad ja globaalset olekut ei ole;
- `ctx` väljad on samad: `units[id].cal`, `regions`, `aggregates`, `tax.T/PSHARE/PJUMP27`, `eduBase`, `uc`, `cfg`, `data`.

## Mis muutus võrreldes 2.2.0-ga

**Ainus sisuline muudatus on vea parandus.** Otsuse `decision(ctx, "elamu", …)` seletuskirja tekst arvutas tulu ja kulu vahe valemiga `dTaxR − dCost`, mistõttu tasandusfondi kadu (E6) jäi välja. Nüüd kasutab tekst neto väärtust `dNet = dTaxR − dTf − dCost` ja tasandusfondi kadu on toodud eraldi lausena:

> … ega ole eelarveprognoos. Tasandusfondist kaob umbes X aastas. Tulu ja kulu vahe on seega suurusjärk: …

Kohila näites (120 korterit, asustamine alates 2028) muutub vahe +87 tuh €-lt −2 tuh €-le aastas, sest tasandusfondi kadu on 89 tuh €. Tabeli read (`rows`) ja kõik arvud olid ka varem õiged.

Sisemised muudatused, mis tulemusi ei muuda:
- **Pensioniosa (`buildTax`)** ei sisalda enam valdade nimesid. Pensioniosa tuleb 2026. aasta eelarve väljalt `b26.pens`, kui see on olemas. Muidu võetakse see eelarvestrateegia 2026. aasta veerust (`pens`/`tax`). Ülejäänud valdades hinnatakse pensioniosa 65+ elanike arvu järgi. 2027. aasta hüpe on nende valdade keskmine, kelle eelarvestrateegias on pensioniosa olemas. Praeguste andmetega annab see täpselt samad arvud.
- **`selfTest`** leiab testitavad üksused andmetest. Agregaat on esimene `kov.json` agregaat. Pilootvald on agregaadi liige, kellel on `pilot`. Teine pilootvald on väljaspool agregaati. Testide id-d, nimed ja tähendus jäid samaks.

## Kuidas pariteet on tõestatud

- **Oraakel.** `tests/engine_v2_2_0.js` on 2.2.0 külmutatud koopia. `tests/golden_gen.js` arvutas sellega kuldväljundid faili `tests/golden_v2.json`. Neid kolme faili ei muudeta.
- **Pariteeditest `tests/parity.test.js`**
  1. Kontrollib kõigepealt testi enda õigsust: arvutab kõik `golden_gen.js` kirjed 2.2.0 mootoriga ja võrdleb neid kuldfailiga. Tulemus peab olema täpne.
  2. Arvutab samad kirjed uue mootoriga ja võrdleb kõiki väärtusi sügavuti. Arvude suhteline vahe võib olla kuni 1e-9 (nulli lähedal absoluutne 1e-9). Sõned, tõeväärtused, `null` ja võtmed peavad olema täpselt samad.
  3. Lubatud on ainult üks erinevus: `decision.elamu.text`. Test kontrollib, et uus tekst on vana tekst, kuhu on lisatud tasandusfondi lause ja kus neto on asendatud väärtusega `dNet`. Kõik muud arvud tekstis peavad jääma samaks.
- **Tulemus.** Kõigis 21 rühmas (≈ 25 000 väärtust) on suurim vahe 0, st tulemused on bitti-bitti samad.
- **CI.** `node engine.test.js` käivitab enesetesti T1–T18 ja seejärel pariteeditesti. Kui midagi ebaõnnestub, on väljumiskood 1.
