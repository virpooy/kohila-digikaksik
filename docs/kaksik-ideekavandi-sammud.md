# Eelmudelist kaksikuks: seitse sammu (31.10.2026)

Ideekavandi „KOV digitaalne kaksik / AI andmeanalüütik” lubaduste ja eelmudeli vahe kaardistus ning tehtud sammud. Mootor 2.2.0, enesetestid 19/19.

| Samm | Ideekavand | Tehtud | Piirang |
|---|---|---|---|
| 1 Kaart | ruumiline planeerimine | Peatükk „Kaart”: valla piir, asulad (ring = rahvaarv 2036), koolid ja lasteaiad, ühistranspordi tase värvina, menetluses detailplaneeringud. Andmed `data/geo.json` (OpenStreetMap, ODbL) | Kohila ja Rae; piirid lihtsustatud; asulate asukoht = OSM keskpunkt |
| 2 Planeeringukontroll → kaksik | elamuarenduste mõju | `tools/pk_export.py` loeb planeeringukontrolli DP-d → `data/dp.json`; mootori uus `devsImpact` arvutab mitme arenduse koosmõju (test T16); peatükk „Menetluses planeeringud” | Planeeringukontrollis on eluruumide arv sisestamata; kaksikus sisestatud arv salvestub ainult kasutaja brauserisse |
| 3 Stsenaariumide töölaud | stsenaariumide koostamine ja võrdlemine | Mootori `scenarioRun` (test T17); peatükk „Stsenaariumide töölaud”: 3 stsenaariumi (muster, lisaränne, sündimus, planeeringud, lisaarendus, kohad) kõrvuti | Stsenaariumid salvestuvad brauserisse, mitte jagatult |
| 4 Ühistransport | ühistransport | `data/transit.json`: Transpordiameti GTFS (Raplamaa, Harjumaa, Elron, Tallinn), tööpäev 10.11.2026: väljumised, otseühendused Tallinna kesklinna ja vallakeskusesse, kiireim sõiduaeg | Ainult otseühendused; kommertsliinid puuduvad; uuendus käsitsi (Chrome'i kaudu) |
| 5 Andmete uuendus | X-tee, valla andmed | `.github/workflows/andmed.yml` + `tools/update_open_data.js`: kord kuus MTA tulumaks ja RR302, salvestab ainult kui testid läbivad. Valla koondandmete vormid `templates/` ja import `tools/import_vald.py` väikeste lahtrite reegliga | Rahvastikuregistri, EHIS-e ja X-tee ühendus vajab valla lepingut; importi mootor veel ei kasuta |
| 6 Eesmärkide seire | mõju arengukavade eesmärkidele | `kov.json` goals + mootori `goalsEval` (test T18); peatükk „Arengukava eesmärgid”: kõik mõõdetavad eesmärgid ühisel „% sihist” skaalal kõigi rändemustritega | Eesmärgid, mida mootor ei arvuta (rändesaldo, loomulik iive), ei ole kaasatud |
| 7 AI-analüütik | AI analüütik | Peatükk „Küsi kaksikult”: keelemudel kasutab tööriistadena ainult mootori funktsioone (rahvastik, eesmärgid, haridus, arendus, ühistransport, planeeringud) ega pane ise numbreid | Töötab ainult Claude'i keskkonnas avatud artefaktis; prototüüp, hindamiskava E0 kontroll tegemata; valla otsus mudeli ja andmete asukoha kohta puudub. Eelnõude tekstianalüüs ei kuulu siia |

## Mida ei tehtud
- Eelnõude tekstianalüüs (NLP): Peetri otsusega välja jäetud.
- Ümberistumisega ühistranspordi teekonnad ja sõitjate arv.
- Sotsiaalteenuste (eakate hoolekanne) eraldi vaade.
- Reaalajas andmed: kaksik uueneb kord kuus.
