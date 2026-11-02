# Üleandmine Claude Code'ile (02.11.2026)

Kaksiku arendus liigub claude.ai vestlusest Claude Code'i. See fail kirjeldab seisu üleandmise hetkel, avatud tööd tähtsuse järjekorras ja teadaolevad probleemid. Reeglid ja töökord on failis `CLAUDE.md`.

## 1. Seis 02.11.2026

| Osa | Seis |
|---|---|
| Mootor | `engine.js` 3.0.1 (02.11.2026; 3.0.0 nullist ümber kirjutatud 01.11); võrdlus 2.2.0-ga: 26 000+ väärtust kattuvad täpselt (`docs/mootor-3.md`) |
| Testid | `node engine.test.js` (enesetestid T1–T19 + pariteet) ✓ · `node tests/content.test.js` 51/51 ✓ · `node tests/gtfs.test.js` 29/29 ✓ · `node tests/ui/smoke.js` ✓ |
| Leht | GitHub Pages (CI „Testid ja leht”, viimane edukas: commit `6528fb1`, 01.11.2026 22:04) ja claude.ai artefakt `AkMamLcPR5zDJDwFdTQdqJ` versioon 13 – sama kood |
| Liides | 5 rühma: Ülevaade · Kaart ja piirkonnad · Rahvastik ja teenused · Stsenaariumid ja otsused · Andmed ja metoodika (25 jaotist) |
| Andmed | 5 valda (Rapla, Kohila, Märjamaa, Kehtna, Rae) + Rapla maakond; OSM kaardikihid 01.11.2026; GTFS analüüsipäevad 02.–15.11.2026 |
| Repo | `virpooy/kohila-digikaksik`, haru `main`; töövood `ci`, `andmed` (cron 5. kuupäeval 06:17 UTC), `kaart`, `yt`, `uuring` |

### Viimase nelja päeva ajalugu

| Kuupäev | Mis muutus |
|---|---|
| 30.10 | Mootor 2.0–2.1: põhimudeli kordamine, otsused E1–E10, planeeringukontrolli mõjuväljad |
| 31.10 | Mootor 2.2.0 ja ideekavandi 7 sammu (kaart, planeeringud, stsenaariumid, ühistransport, andmete uuendus, eesmärgid, AI-analüütik); Rae avaandmed; magistritöö soovitused |
| 31.10–01.11 | Kaksik 3: mootor 3.0.0 + uus liides `src/` (k9 + hele teema, peatükid küsimustena) |
| 02.11 | Üleandmine Claude Code'ile; mootor 3.0.1 – tulumaksu hinnangu kuude arv MTA andmetest (P0-1, PR #1) |
| 01.11 | Kaart OSM-aluskihiga kõigile viiele vallale; täiendus „usaldusväärsus, kaart, liikuvus” (`docs/taiendus-2026-11.md`): allikakataloog, päritolumärgised, tingimuslikud järeldused, teenuste reserv ja stressitest, planeeringute puudulikkuse hoiatus, kaart neljas režiimis, GTFS-töötlus, RL21163 pendelränne, eelarve tundlikkus, eksport/import, 5 menüürühma, sisulised testid |

## 2. Avatud tööd tähtsuse järjekorras

Iga ülesande juures on tekst, mille võib Claude Code'ile kleepida. Ülesanded, mis muudavad mootori numbreid, vajavad **enne** Peetri kinnitust.

### P0 – enne 05.11.2026 (kuine andmeuuendus)

**1. Tulumaksu 2026 hinnangu kuude arv** – ✓ tehtud 02.11.2026 (mootor 3.0.1, [PR #1](https://github.com/virpooy/kohila-digikaksik/pull/1), Peeter kinnitas ja ühendati).
`buildTax` kasutab kuude arvuna `MTA.tm26[id].length`; enesetest T19 kontrollib lisakuuga 12 kuu hinnangut. Pärast 05.11 `andmed.yml` käiku kontrolli, et CI läbib ja T19 näitab 10 kuud 2026 + 2 kuud 2025.

### P1 – järgmised kaks nädalat

**2. Ühistranspordi andmete regulaarne uuendus.** Analüüsipäevad on 02.–15.11.2026; `raplamaa` voog kehtib 23.12.2026-ni.
> Lisa `.github/workflows/yt.yml`-ile ajastus (nt iga kuu 1. ja 15. kuupäeval) ja kontroll: kui mõni voog kehtib vähem kui 14 päeva pärast analüüsiperioodi, anna `::warning`. Ära muuda andmeskeemi.

**3. „Küsi kaksikult” kasutab vana ühistranspordi faili.** `src/ch_plan.js` tööriist `uhistransport` loeb `D.transit` (ühepäevane `transit.json`, 31.10).
> Muuda tööriist `uhistransport` kasutama `data/transit/<vald>.json` (valitud vald ja analüüsipäev `YT.date`): reisid, väljumised, Tallinna ja vallakeskuse otseühendused asula kaupa. Tööriista vastuse `kontekst` peab nimetama analüüsipäeva ja andmepaki kuupäeva. Lisa sisuline kontroll, et tööriist tagastab samad arvud mis kaardi tabel.

**4. Rapla ühistranspordi fail on 1,5 MB.** 14 päeva on sisuliselt kaks korduvat nädalat.
> Muuda `tools/gtfs.js` väljund: identsed päevad salvestatakse üks kord (`days` → `dayTypes` + `dateMap`), `schema: 2`. Uuenda `src/ch_kaart.js` lugema mõlemat skeemi, `tests/gtfs.test.js` ja `tests/content.test.js`. Käivita `yt.yml` ja kontrolli, et kaardi ja tabeli arvud ei muutu.

**5. Vanad andmeväljad.** `ext.COM` (Rae välismaal töötajaid 3, RL21163 järgi 35) on mootoris kasutusel ainult Tallinna osakaaluks; `data/transit.json` ja `data/geo.json` on varufailid.
Kontrollitud 02.11.2026: `ext.COM` Tallinnas töötajad ja hõivatud kokku ühtivad `data/commute.json`-iga kõigis viies vallas, seega mootori tulemus on õige.
> Märgi `data/dictionary.json`-is `ext.COM.abr` vigaseks ja viita `data/commute.json`-ile. Mootorit ära muuda.

### P2 – vajab Peetrit või valda

6. **Kohila kahe elamuplaneeringu eluruumide arv** (Kivisilla ja Kivisalu, Konksu) – sisestada planeeringukontrollis, seejärel `tools/pk_export.py` → `data/dp.json`. Kuni selleni näitab kaksik „Planeeringute mõju arvutamata”.
7. **Asutuste ametlik mahutavus ja laste arv asutuse kaupa** (EHIS / vald). Kohila koolikohad (1 010) on hinnang; Rapla, Märjamaa ja Kehtna kohtade arv puudub. Vorm: `templates/valla_kohad.csv`, import `tools/import_vald.py`.
8. **Planeeringute ala polügoonid** (PLANIS või planeeringukontrolli kaardikiht) – praegu asula keskpunkt, märgitud ligikaudseks.
9. **AI-analüütiku hindamiskava E0 kontroll** (claude.ai artefakt „Kaksiku katsete hindamiskava”) ja otsus, kas „Küsi kaksikult” jääb.
10. **Sõltumatu ülevaatus** (nt Statistikaamet või ülikool): tagasitest, eeldused, rändemustrid.

### P3 – vajab uut teenust (dokumenteeritud `src/ch_dev.js` „Allikad” → „Vajalikud lisaallikad”)

11. Teedevõrgu kaugus ja jalgsiteekond – OSRM/GraphHopper.
12. Ümberistumisega ühistranspordi teekonnad – OpenTripPlanner + GTFS.
13. Sihtomavalitsuse järgi ja sissetulev pendelränne – Statistikaameti eritellimus (REL 2021 O-D).
14. Ametlikud asustusüksuste piirid – Maa- ja Ruumiamet (praegu OSM).
15. Statistiline prognoosivahemik (praegu ainult rändemustrite vahemik; üks tagantjärele aken ei võimalda).

### Tehniline võlg

- `tests/index_v2.src.html` (vana liides) ja `tools/uuring/` on ajalooks; ära ehita neile peale.
- Playwrighti suitsutest (`tests/ui/smoke.js`) ei ole CI-s; kaalu eraldi töövoogu, kui CI-keskkonnas on brauser.
- OSM-is on Kohilast märgitud ainult 6 haridusasutust; puuduvaid ei lisata käsitsi koordinaatidega – parandus käib OpenStreetMapis või valla andmetega.
- `kaart.yml` töö kestab Overpassi tõttu 15–25 min ja võib osaliselt ebaõnnestuda (vt `::warning`).

## 3. Teadaolevad piirangud (kasutajale nähtavad)

- Asulaprognoos jagab valla prognoosi REL 2021 osakaaludega – kõik asulad muutuvad valla tempoga.
- Teenuste piisavus on valla koondarvestus; asutuste vahel nõudlust ei jaotata.
- Eelarves ei ole hinnatase ühtlustatud (tulumaks 2026, kulud 2023–2025); tulemus on suurusjärk, tundlikkus on näidatud.
- Tööalased seosed: ainult Tallinn ja Tartu on kaardil; sissetulev pendelränne puudub; andmed 31.12.2021.
- Ühistransport: sõiduplaan, mitte kasutus; ainult otseühendused; kommertsliinid võivad puududa; asula = peatused OSM-piirides (nt Masti, Prillimäe Kohilas, Kopli, Seli Raes: 0).
- Hageri alevik ja Hageri küla on ühistranspordis üks võti „Hageri” (samuti Hagudi, Kaerepere).
- Mudelit ei ole sõltumatult üle vaadatud.

## 4. Lingid

| Mis | Kus |
|---|---|
| Kaksik (artefakt) | https://claude.ai/artifact/AkMamLcPR5zDJDwFdTQdqJ |
| Planeeringukontroll | https://claude.ai/artifact/VBDGamJQ6Ggmw4bfRfWcbK (lähtekood `planeeringukontroll/`) |
| Põhimudel (Raplamaa arengukangas) | https://claude.ai/artifact/1z4kbsLU2uneuJwJYuNVfG, repo `virpooy/raplamaa-arengumudel` |
| Tööplaan | https://claude.ai/artifact/C3S4MLma1BQDrqig8nZYNv |
| Katsete hindamiskava | https://claude.ai/artifact/RW63YrTHdvkUJWDRfYDLp4 |
| Magistritöö | https://claude.ai/artifact/F2oE4XxPP5uZHhwE2vXi5F |
| Täienduse kirjeldus | `docs/taiendus-2026-11.md` |
| GTFS-töötlus | `docs/gtfs.md` |

## 5. Esimene ülesanne Claude Code'ile

✓ Tehtud 02.11.2026: kõik neli testi läbisid (Windows, kohalik arvuti) ja P0-1 ühendati PR-iga #1. Järgmine on P1-2 (ühistranspordi andmete regulaarne uuendus). claude.ai artefakt uuendati versioonile 14 (mootor 3.0.1).
