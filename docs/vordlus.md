# Viie eelmudeli võrdlus

Koostatud 30.10.2026 (tööplaani ülesanne 6). Üksikasjalikud kaardistused on kaustas `docs/kaardistus/`. Eelmudeleid ei ole muudetud.

| Lühend | Eelmudel | Versioon |
|---|---|---|
| RAK | Raplamaa arengukangas | kohortmudel v6, arengukangas v46 (repo virpooy/raplamaa-arengumudel, a57f2c5) |
| KAM | Kohila arengumudel 2036 | artefakt ARXQ… |
| MÕJ | Planeeringute mõjukangas | artefakt MnY5… |
| PK | Kohila planeeringukontroll | 2026-10-15 |
| KEM | Kaksiku eelmudel | TwinEngine 1.0.0 |

## Kohila põhinumbrid, vaikestsenaarium

| Näitaja | RAK | KAM | KEM |
|---|---|---|---|
| Rahvaarv 2026 | 7 844 | 7 844 | 7 844 |
| Rahvaarv 2036 | 8 418 | 8 488 | 8 605 |
| Lasteaialapsed 2026 → 2036 | 442 → 382 | 473 → 457 (kohavajadus) | 442 → 416 |
| Oma koolide õpilased 2026 → 2036 | 851 → 766 | 900 → 850 (kohavajadus) | 851 → 807 |
| Tulumaks 2026 | 12,47 mln € | 12,89 mln € | 12,47 mln € |

## 100 eluruumi (40 eramut, 20 ridaelamut, 40 korterit, asustamine 2028–2030)

| Näitaja | MÕJ | KEM |
|---|---|---|
| Uusi elanikke | 187 | 176 |
| Lasteaialapsi, tipp | 18 | ~16 |
| Õpilasi, tipp | 19 | ~20 |
| Tulumaks aastas | 292 517 € | ~310 000 € (2026. a hindades) |
| Teenuskulu aastas | 210 051 € | ~237 000 € |
| Investeering | 0 € (käsitsi sisend) | puudujäägi korral 30 000 € / lasteaiakoht, 25 000 € / koolikoht |
| Tasandusfondi kadu | 30% maksutulu kasvust, lagi 649 820 € | ei arvesta |

## Erinevused ja otsused

| Nr | Teema | Erinevus | Soovitus |
|---|---|---|---|
| E1 | Rahvastikumootor | RAK üheaastane kohortmudel (v6); KEM viieaastaste rühmadega (RAK vana versioon); KAM 4 vanuserühma; MÕJ sünniaasta kohordid | Kaksik võtab üle RAK v6 üheaastase mootori; teised kasutavad seda |
| E2 | Leibkonna suurus | KEM 3,1 / 2,8 / 2,1; MÕJ 3,0 / 2,8 / 2,1; KAM üks väärtus 2,6; RAK 2,602 ainult väljundina | Elamutüübi järgi: eramu 3,0, ridaelamu 2,8, korter 2,1 |
| E3 | Laste arv uutes kodudes | MÕJ laste kordaja elamutüübi järgi (1,5 / 1,4 / 1,0); KEM ja KAM uustulijate vanusprofiil | MÕJ kordajad, kuni valla andmetest saab kalibreerida |
| E4 | Valla seest kolijad | KEM 30% (arvesse 70%); MÕJ 28% (arvesse 72%); KAM ja RAK ei erista | 70%, avatud parameetrina |
| E5 | Ühikukulu | RR302 keskmine täiskulu: lasteaialaps 8 913 €, õpilane 5 455 € (RAK, KEM); KAM 6 806 € / 7 433 €; MÕJ valla piirkulu 5 950 € / 1 400 € | Näidata mõlemat: piirkulu üksiku planeeringu otsuseks, täiskulu pikaajaliseks eelarveks |
| E6 | Tasandusfond | Ainult MÕJ arvestab (30%, lagi 649 820 €) | Lisada kaksikusse |
| E7 | Kohtade arv | KAM 520 / 1 010 (hinnang); RAK 470 lasteaiakohta; KEM praegune laste arv | Valla andmed (ülesanne 15); seni RAK 470 ja KAM 1 010 |
| E8 | Investeeringu hind | KEM 30 000 / 25 000 € koha kohta; MÕJ 150 000 € rühma kohta (kasutamata) | KEM väärtused, avatud parameetrina |
| E9 | Planeeringukontrolli ühendus | PK-s pole arvulisi välju | Lisada PK-sse: eluruumid tüübi järgi, asula (EHAK), valmimisaasta |
| E10 | Võlg ja eelarve | KAM: võlg väheneb 9% aastas ilma makseta, intressi pole, laen ainult omaosaluse puudujäägil; tasandusfond reageerib nominaalsele maksutulule (vt `kaardistus/kohila-arengumudel-vastuolud.md`) | Kaksik võtab võla, laenud ja investeeringud eelarvestrateegiast, arvestab tegelikku tagasimakset ja intressi; tasandusfond suhtelise tulubaasi järgi; ajaloolise tempo arvutusest jäetakse välja 2021→2022 metoodikahüpe |

## Otsuse staatus

30.10.2026: Peeter andis valiku Claude'ile („tee mis parem”). Soovitused E1–E10 kehtivad vaikimisi, kuni Peeter mõne neist muudab.

## Eelmudelite sisemised vead (ei ole muudetud)

- MÕJ: andmebaasis sissetulek 2 196 € kuus, koodis ja muudatuste logis 2 296 €. 11 aasta neto 100 eluruumile vastavalt 139 135 € või 219 233 €.
- MÕJ: lapsepõhine kulu (5 950 / 1 400 €) ja rühma- või klassipõhine kulu (55 000 / 60 000 € aastas) ei ole ühtlustatud.
- KAM: tekst ütleb, et vaikestsenaarium vastab arengukava stsenaariumile 1 (9 050 elanikku 2035), mudel annab 8 423.
- KAM: maksumaksjate arv on eri kohtades 3 945, ~3 950 ja 3 967; investeeringute pealkiri 4,13 mln €, projektide summa 4,09 mln €; investeeringutel selgitamata kordaja 1,02.
- KAM: asutuste mahud kokku 470, mudeli lasteaiakohtade arv 520.
- RAK: koodikommentaar ütleb suremuse kalibreerimine 2021–2025, kood kasutab 2023–2025.

## Etapp 2 tulemus (30.10.2026, mootor 2.0.0)

Kõik otsused E1–E8 ja E10 on mootoris. E9 tehti etapi 3 alguses planeeringukontrollis (versioon 33): väli `meta.moju` = {eramu, ridaelamu, korter, asula, ehak, start, years}.

| Otsus | Kuidas mootoris | Kontroll |
|---|---|---|
| E1 | Üheaastaste vanuste kohortmootor, kalibreerimine ja rändemustrid nagu põhimudelis v6 | T1–T6, T12: 7 920 väärtust, erinevus 0 |
| E2–E4 | `kov.json` params.housing: leibkond 3,0 / 2,8 / 2,1, laste kordaja 1,5 / 1,4 / 1,0, täituvus 0,95, väljastpoolt 70% | T13: samade eeldustega 187,2 uut elanikku nagu mõjukangas |
| E5 | Täiskulu (RR302) ja valla piirkulu (`margCost`: 5 950 / 1 400 / 410 €) kõrvuti, neto mõlemaga | T14 |
| E6 | Tasandusfondi kadu 30% lisanduvast tulumaksust 2026. a hindades, lagi 649 820 € | T14 |
| E7 | Kohila 470 lasteaiakohta ja 1 010 koolikohta (`edu.json` cap) | lehel vaikeväärtusena |
| E8 | 30 000 / 25 000 € koha kohta (`kov.json` prices) | – |
| E10 | `debtPath`: netovõlg eelarvestrateegiast + investeeringu laen, võrdsed põhiosad 20 a, intress 4% | T15 |

**Kohila põhinumbrid nüüd (vaikestsenaarium):** rahvaarv 7 844 → 8 145 (2031) → 8 418 (2036), sama mis põhimudelis. Lasteaialapsed 442 → 382, põhikooliõpilased 712 → 631.

**100 eluruumi näide (40 eramut, 20 ridaelamut, 40 korterit, asustamine 2028–2029, kaksiku vaikeeeldused):**

| | 2029 | 2031 | 2036 |
|---|---|---|---|
| Tulumaks, € (2026. a hindades) | 305 800 | 304 182 | 304 385 |
| Tasandusfondi kadu | −91 740 | −91 255 | −91 316 |
| Täiskulu (RR302) | −230 908 | −235 413 | −219 420 |
| Piirkulu (mõjukangas) | −189 433 | −186 449 | −166 102 |
| Neto täiskuluga | −16 848 | −22 486 | −6 351 |
| Neto piirkuluga | +24 627 | +26 479 | +46 968 |

11 aasta summa: neto täiskuluga −156 643 €, piirkuluga +270 873 €. Mõjukangas annab samale arendusele +139 135 € (piirkulu, täituvus 100%, 72% arvesse, palk 2 196 €). Uusi elanikke kaksikus 173 (täituvus 95%, arvesse 70%), mõjukangas 187.

Järeldus otsustajale: kas arendus tasub end valla eelarvele ära, sõltub sellest, kas arvestada piirkulu või täiskulu. Kaksik näitab mõlemat.
