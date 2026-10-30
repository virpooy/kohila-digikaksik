# Kaksiku eelmudel (TwinEngine 1.0.0) – kaardistus

Allikas: repo virpooy/kohila-digikaksik, `engine.js`, `data/`. Arvutatud Node'is (`twin_ref.js`), vaikestsenaarium (rändemuster „keskmine”, sündimus ±0%, lisaränne 0).

## Ülevaade
Raplamaa arengukanga arvutusloogika eraldi mootorina, laiendatud Rae ja Kohila pilootvallaga. Omavalitsused: Rapla, Kohila, Märjamaa, Kehtna, Rae + Rapla maakond. Aastad 2026–2036, ajalugu 2015–2026. Enesetestid T1–T11.

## Peamised valemid ja eeldused
- Kohordimudel 18 viieaastase rühmaga. Kalibreerimine: suremuse kordaja k (baasvektor MORT), sündimuse kordaja f, viis rändemustrit (r1 2016–21, mean, r2 2021–26, r2x ilma põgeniketa, r3 2024–26).
- Haridus: baas 2026 (Haridussilm): Kohila lasteaialapsed 442, põhikool 712, gümnaasium 139. Nõudlus = baas × osalusproksi (laP, pkP, gP) muutus vanusevektori järgi.
- Ühikukulud: RR302 2023–2025 mediaan / baasarv. Kohila: lasteaialaps 8 913 €/a, õpilane 5 455 €/a, 80+ elanik 1 620 €/a.
- Tulumaks: 2026 MTA kuuandmetest; edasi tööealiste (20–64) ja pensionäride (65+) osaga, palgakasv 2027 5,5%, 2028 5,0%, edasi 4,5%; tööhõive baas 68,5%.
- Elamuarendus (housingImpact): leibkond korter 2,1 / ridaelamu 2,8 / eramu 3,1; täituvus 0,95; väljastpoolt valda tulijaid 0,7 (ülejäänud on valla siseränne ega muuda rahvaarvu); uustulijate vanusjaotus GEN; töötavaid 0,75 tööealistest; Tallinna pendeldajate osa REL 2021 järgi.
- Investeering: lasteaiakoht 30 000 €, koolikoht 25 000 €; kohtade arv vaikimisi = praegune laste/õpilaste arv.
- Asulakiht: REL 2021 osakaalud (RL21003), alla 200 elanikuga asulad koondatud.

## Kohila võrdlusnumbrid (vaikestsenaarium)
| Näitaja | 2026 | 2031 | 2036 |
|---|---|---|---|
| Rahvaarv | 7 844 | 8 231 | 8 605 |
| Lasteaialapsed | 442 | 411 | 416 |
| Põhikooliõpilased | 712 | 704 | 682 |
| Gümnaasiumiõpilased | 139 | 128 | 125 |
| Tulumaks, € | 12,47 mln | – | 23,10 mln nominaalne / 14,67 mln 2026. a hindades |

## Näidisarvutus: 100 eluruumi (40 eramut, 20 ridaelamut, 40 korterit), asustamine 2028–2030
- Uusi elanikke väljastpoolt valda: 176 (100 eluruumi × leibkond × 0,95 × 0,7)
- Rahvaarvu lisa 2031: +178; 2036: +182
- Lasteaialapsi 2031: +15,6; 2036: +11,9
- Õpilasi 2031: +17,4; 2036: +20,4
- Tulumaks 2031: +0,31 mln €/a (2026. a hindades)
- Teenuskulu 2031: +0,24 mln €/a

## Erisused
- Väljastpoolt tulijate osa 0,7 vähendab mõju ligi kolmandiku võrra; mõjuarvutustes, kus kõik uued elanikud loetakse lisanduvaks, on mõju suurem.
- Kohtade arv puudub andmetest, vaikimisi võrdne praeguse nõudlusega.
