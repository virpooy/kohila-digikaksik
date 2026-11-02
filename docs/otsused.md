# Otsuste logi

| Kuupäev | Otsus | Otsustaja |
|---|---|---|
| 2026-10-30 | Kohila vald on arendusega nõus ning on kasutaja ja andmepartner ilma rahata. Valla kontaktisik on Peeter Pallav. | Kohila vald |
| 2026-10-30 | Arendus toimub väljaspool tööaega, mitte tööülesannete raames. | Kohila vald, Peeter Pallav |
| 2026-10-30 | Lähtekood kuulub Peeter Pallavile, litsents EUPL-1.2; vald ja teised omavalitsused kasutavad seda tasuta. | Peeter Pallav |
| 2026-10-30 | Arenduses kasutatakse ainult koondandmeid; alla 5 inimesega lahtrid peidetakse; isikuandmeid ei liigu. | Kohila vald |
| 2026-10-30 | Tööriist on otsuste ettevalmistamise abiks; vastutus jääb pädevale ametnikule või organile. | Kohila vald |
| 2026-10-30 | Kui vald soovib edasiarendust tellida või selle eest maksta, deklareerib Peeter huvide konflikti ega osale otsustamises. | Peeter Pallav |
| 2026-10-30 | Kohila arengukangas on artefakt „Kohila arengumudel 2036”; mõjuarvestuse tööversioon on „Planeeringute mõjukangas”. | Peeter Pallav |
| 2026-10-30 | Kohila arengumudelit ei parandata. Selle 51 vastuolu on dokumenteeritud; kaksik ehitab õige loogika ise ja võtab arengumudelist ainult asulate ja asutuste andmed. Arengumudel jääb vanaks versiooniks, kuni kaksik selle asendab. | Claude, Peetri volitusel |
| 2026-10-30 | Eelmudelite erinevuste soovitused E1–E10 (`docs/vordlus.md`) kehtivad vaikimisi, kuni Peeter mõne muudab. | Claude, Peetri volitusel |
| 2026-10-30 | Etapp 2 tehtud: mootor 2.0.0 kordab põhimudeli v6 rahvastikuprognoosi täpselt ja sisaldab otsuseid E2–E8 ja E10. E9 jääb etappi 3. | Claude, Peetri ülesandel |
| 2026-10-30 | E9 tehtud: planeeringukontrolli (versioon 33) lisati „Mõju eelhinnangu andmed”: eluruumid tüübi järgi, asula EHAK-koodiga (Statistikaamet RL21003, kõik 25 kontrollitud), asustamise algus ja kestus; salvestub `dp` kirjesse väljale `meta.moju`. Olemasolevaid kontrolle ei muudetud. | Peeter Pallav (kinnitas), Claude |
| 2026-10-31 | Mootor 2.1.0: artefakti versioon 1.1.0 (10.10.2026: tagasitesti T6b, otsuste mõjutekstid, kulude hinnatase, koolide õpilasarvud) ühendati repo versiooniga 2.0.0. Artefakt ja GitHub Pages on nüüd sama versioon. | Claude, Peetri ülesandel |
| 2026-10-31 | Mootor 2.2.0: ideekavandi seitse sammu (kaart, planeeringukontroll → kaksik, stsenaariumide töölaud, ühistransport, andmete kuine uuendus, eesmärkide seire, AI-analüütiku prototüüp), vt `docs/kaksik-ideekavandi-sammud.md`. Eelnõude tekstianalüüs (NLP) jäetakse välja. | Peeter Pallav |
| 2026-10-31 | Rae avalikud andmed (lasteaia- ja koolikohad, õpilased, RR302, MTA, eelarvestrateegia) lisati mudelisse, vt `docs/andmed/rae-avalikud-andmed.md`. | Peeter Pallav (kinnitas) |
| 2026-10-31 | Magistritöö soovitused (P1–P18) võetakse kaksikus läbivalt kasutusele: vähem teksti, rohkem graafikat, leiupealkirjad, „% sihist”, tabelid `<details>` taga. Vt `docs/magistritoo-soovitused.md`. | Peeter Pallav |
| 2026-10-31 | Kaksik ehitatakse nullist uuesti: ka mootor; visuaal k9 + hele teema; peatükid küsimustena, üks jaotis korraga, arendajamaterjal eraldi. | Peeter Pallav |
| 2026-11-01 | Mootor 3.0.0: nullist ümber kirjutatud, 2.2.0 väljunditega bitti-täpne pariteet (`tests/parity.test.js`). Ainus sisuline muudatus: otsuse „elamu” tekstis arvestatakse tasandusfondi kadu (Kohila 120 korterit: +87 → −2 tuh € aastas). Vt `docs/mootor-3.md`. | Claude, Peetri ülesandel |
| 2026-11-01 | Kaart tehakse „päris kaardi” välimusega (OSM aluskiht kõigile viiele vallale) ja eraldi peatükiks. | Peeter Pallav |
| 2026-11-01 | Täiendus „usaldusväärsus, kaart, liikuvus” (Peetri lähteülesanne, 15 osa): allikakataloog ja päritolumärgised, tingimuslikud järeldused, teenuste reserv ja stressitest, planeeringute puudulikkuse hoiatus, kaart neljas režiimis, GTFS-töötlus (`tools/gtfs.js`), REL 2021 pendelränne (`data/commute.json`), eelarve tundlikkus, eksport/import, 5 menüürühma, sisulised testid. Vt `docs/taiendus-2026-11.md`. | Peeter Pallav, teostas Claude |
| 2026-11-01 | Kokkulepped: lasteaia/kooli täituvus ≥ 90% = „reserv väike”; ühistranspordi lävend 10 reisi päevas on kokkuleppeline ja muudetav; ligipääsu piirid (kool/lasteaed 3 ja 7 km, peatus 1 ja 2,5 km, Tallinn 45 ja 70 min) on kaksiku kokkulepe. | Claude (vaikimisi), Peeter võib muuta |
| 2026-11-01 | `ext.COM.abr` (Rae välismaal töötajaid 3) on vigane; RL21163 järgi 35. Uutes vaadetes kasutatakse `data/commute.json`-i; mootorit ei muudetud (kasutab ainult Tallinna osakaalu, mis ühtib). | Claude |
| 2026-11-02 | Arendus antakse üle Claude Code'ile: juhend `CLAUDE.md`, seis ja avatud tööd `docs/uleandmine.md`, brauseri suitsutest `tests/ui/smoke.js`. Tulumaksu kuude arvu parandus (P0-1) vajab enne 05.11 Peetri kinnitust. | Peeter Pallav |
| 2026-11-02 | Mootor 3.0.1: tulumaksu 2026 hinnangu kuude arv tuleb MTA andmetest (`tm26` pikkus), mitte fikseeritud 9-st, et 05.11 kuine uuendus ei liidaks hinnangusse 13 kuud. Tänaste 9 kuu andmetega on kõik tulemused samad (pariteet 0-veaga); enesetest T19 kontrollib kunstliku 10. kuuga, et hinnang koosneb 12 kuust. Pariteeditest võrdleb enesetestidest ainult 2.2.0 teste T1–T18. Ühendatakse pärast Peetri PR-i ülevaatust. | Claude, Peetri ülesandel (P0-1) |
