# Kohila arengumudel 2036 (Kohila arengukangas): kaardistus

Artefakt: https://claude.ai/artifact/ARXQtbD8ptGNXcSAF84AhP (versioon 1791096714-bf27, 317 196 baiti, üks HTML-fail, lisafaile pole).
Kaardistatud ainult lugedes, artefakti ei muudetud. Arvud punktis 5 saadi nii: mudeli JS (`run()`, konstandid, eeldused) käivitati node'is muutmata kujul.

## 1. Ülevaade

- **Eesmärk:** kogu valla areng arengukava 2023–2035 eesmärkide vaates. Kasutaja valib poliitikahoobade väärtused ja mudel arvutab aasta kaupa rahvastiku (4 vanuserühma), teenuskohtade vajaduse, eelarve ja võla. Päises öeldakse: „Sama mootor nagu planeeringute mõjuarvestuses, aga teise otsa pealt“.
- **Seis:** `SNAP="26.09.2026"`. Mudel arvutab perioodi `START=2026` kuni `END=2036`, ajalugu kuvatakse alates `X0=2016` (osa ridu alates 2013/2015). Aluseks on rahvastik 1.01.2026.
- **Ala:** Kohila vald. 25 asulat on kaardil ja maatriksis, asulad on jagatud lasteaiapiirkondadesse `r: "K"` (Kohila) ja `"A"` (Aespa). Hallatavaid asutusi on 12, lisaks kuluotstarbed.
- **Paneelid:** olekuriba; missioonipaneel (3 näidikut); kaardikonsool (kihid, aastariba 2016–2036); rahavoogude konsool (tulumaks asulast valda, teenusraha tagasi); allasutuste rahastamine 2024–2026 ja investeeringud 2026 (14 objekti); finantsanomaaliad ja 20 küsimust rahanduskomisjonile, alushariduse kulu võrdlus naabritega; uurimiskava (59 küsimust) ja „kummalised kanded“; ökonomeetria (korrelatsioonimaatriks, aastad 2015–2025 või 25 asulat, Pearson/Spearman, BH-korrektsioon); teenusvõrgu maatriks (kaugus lähima teenuseni); eelarve liikumine; stsenaariumid kõrvuti; 6 arengukava eesmärki; poliitikahoovad ja 5 eelseadet; rahvastiku-, eelarve- ja lastegraafikud; Eesti Pank; Konjunktuuriinstituut; teenustasemed (Minuomavalitsus); 11 poliitikavalikut; kontroll ametlike andmetega (kalibreerimine); eelduste tabel (23 rida) ja allikad (16).

## 2. Näitajad

| Näitaja | Ühik | Tase | Aastad | Kuidas arvutatakse | Sisendid | Allikas |
|---|---|---|---|---|---|---|
| Rahvaarv | in | KOV | 2026–2036 (ajalugu 2015–2026) | Summa a04+a514+a1564+a65. Igal aastal: vananemisvood + sünnid + netoränne × vanusprofiil `MIGP` | BASE, FLOW, MIGP, hoovad | RV0282U |
| Vanuserühmad 0–4, 5–14, 15–64, 65+ | in | KOV | 2026–2036 | a04 −20% (läheb a514-sse) + sünnid; a514 −10% (läheb a1564-sse); a1564 −1,94% (läheb a65-sse); a65 suremus 6,4%/a; + net×{0,09; 0,18; 0,70; 0,03} | FLOW, MIGP | RV0282U, kalibreeritud AK baasile |
| Sünnid | in/a | KOV | 2026–2036 | `BIRTHR·a1564·supBoost`, kus BIRTHR = 62/5119 = 0,012112; supBoost = 1 + toetus/100·0,03 (+0,02, kui lasteaiakoht 1,5-aastaselt) | BIRTH0=62 | RV112U |
| Surmad | in/a | KOV | 2026–2036 | ainult 65+: a65·0,064 | FLOW.mort | kalibreeritud (RV49U ainult ajaloos) |
| Sisseränne | in/a | KOV | 2026–2036 | eluruumid·hh·reg% + inOther + jobs·0,3 + toetus/100·8 | hoovad | RVR02 (ajalugu) |
| Väljaränne | in/a | KOV | 2026–2036 | max(0; outBase − 20, kui teenuspunkt) | hoovad | RVR02 |
| Lasteaiaealised (0–6) | in | KOV | 2026–2036 | a04 + 0,2·a514 | — | tuletatud |
| Kooliealised (7–15) | in | KOV | 2026–2036 | 0,8·a514 + a1564/50 | — | tuletatud |
| Lasteaiakohti vaja | koht | KOV | 2016–2036 | lasteaiaealised × RATE.la, RATE.la = 473/580,4 = 0,8150 | FIN.la26=473 | valla eelarve 2026 |
| Koolikohti vaja | koht | KOV | 2016–2036 | kooliealised × RATE.sc, RATE.sc = 900/915,98 = 0,9826 | FIN.sc26=900 | valla eelarve 2026 |
| Maksumaksjad | in | KOV | 2026–2036 | a1564 × (empl+1 pp, kui lasteaiakoht 1,5-aastaselt)/100 × (1 − unemp/100) | empl 82, unemp 5,5 | hinnang |
| Tulumaks palgalt | € | KOV | 2026–2036 | maksumaksjad × TAXW × wageIdx(y) × MTAF; TAXW = (12 418 000 − pensionimaks26 − 500 000)/TP26 = 2 727,28 €/maksumaksja | FIN.tax26, MTA | eelarve 2026, MTA |
| Tulumaks pensionilt | € | KOV | 2026–2036 | a65 × pension × 12 × 8,5% × (1 + 0,9·palgakasv)^(y−2026) × MTAF | pension 810 | TuMS 2026 |
| Muud maksud | € | KOV | 2026–2036 | 500 000 × (1+kulukasv)^t × MTAF | taxOther26 | eelarve |
| Tasandusfond | € | KOV | 2026–2036 | max(0; 649 820 − 0,3·(maksutulu − 12 418 000)) | tf26 | eelarve; 0,3 on hinnang |
| Toetused (haridusega seotud) | € | KOV | 2026–2036 | GRANT26 = (inc26 − tax26 − tf26)·0,6 = 3 203 076 × (la+sc)/(B_LA+B_SC) × ixMix | — | tuletatud |
| Muud tulud | € | KOV | 2026–2036 | OTHINC26 = sama vahe ·0,4 = 2 135 384 × pop/7844 × (1+kulukasv)^t | — | tuletatud |
| Põhitegevuse kulud | € | KOV | 2026–2036 | [PER.la·keep(la) + PER.sc·keep(sc) + 900·a65 + PER.oth·pop + poliitikakulud]·ixMix + peretoetus·kulukasvuindeks | PER, rigid | eelarve 2026 |
| Põhitegevuse tulem | € | KOV | 2026–2036 | tulud − kulud | — | — |
| Investeeringud | € | KOV | 2026–2036 | inv·1e6·(1+kulukasv)^t·1,02·buildIdx + teenuspunkt 2,5 mln/3 (3 a) + jobs·1500 | inv 4, own 35% | eelarvestrateegia |
| Netovõlg | € | KOV | 2026–2036 | võlg + max(0; omaosalus − max(0; tulem)) − võlg·0,09 | debt25=10 054 596 | Minuomavalitsus |
| Võla ülemmäär / koormus | €/% | KOV | 2026–2036 | ülemmäär = tulud × 0,99; koormus = võlg/ülemmäär | debtLimRatio | — |
| Ülalpeetavate määr | % | KOV | 2026–2036 | (a04+a514+a65)/a1564 | — | — |
| Kohapealsed töökohad | tk | KOV | 2026–2036 | 1233 + jobs·(y−2026) | ECON | arengukava (31.12.2021) |
| Asula rahvaarv (prognoos) | in | asula | 2016–2036 | 2016–2026 lineaarne interpolatsioon registripunktide vahel. Edasi p26 + (Δpop KOV) × [0,75·max(0; p26−p16)/1349 + 0,25·p26/7844] | SETTLE | rahvastikuregister |
| Asula lapsed 0–6 / 7–15 | in | asula | 2026–2036 | k06 ja k715 × sPop/p26 | SETTLE | register |
| Tulumaks asulast | € | asula | 2026–2036 | asula elanikud × (KOV maksutulu / asulate summa) | — | tuletatud |
| Teenuskulu asulasse | € | asula | 2026–2036 | kulud jaotatakse `SHARE_*` järgi, ülejäänu rahvaarvu järgi | SHARE_LA/SC/SOC/OTH | hinnang |
| Kaugus lähima teenuseni | km | asula | 2026 | linnulennult (haversine) lähima lasteaia, kooli või noortekeskuse asulani | MAP_PTS, SVCLOC | — |
| Asutuse kulu | € | asutus | 2024, 2025, 2026 | valdkonna kulu (VALD) × asutuse osakaal `sh` | VALD, INST | eelarve 2026, lisa 3 |
| Eesmärkide täitmine (6) | ok/mid/bad | KOV | 2035/2036 | lävendid, vt p 3 | — | arengukava |

## 3. Eeldused ja parameetrid

**Lähteseis (hardcoded):** `BASE={pop:7844, a04:377, a514:1017, a1564:5119, a65:1331, k06:663, k715:1007}`. Registri asulate summa on 7 866.

**Vananemine ja suremus:** `FLOW={o04:0.20, o514:0.10, retire:0.0194, mort:0.064}`. Need on kalibreeritud nii, et mudel kordab ilma rändeta AK baasstsenaariumi. Suremust on mudelis ainult 65+ rühmal.

**Sisserändajate vanusprofiil:** `MIGP={a04:0.09, a514:0.18, a1564:0.70, a65:0.03}`. Sama profiili rakendatakse ka netorändele, ka siis, kui netoränne on negatiivne.

**Sündimus:** `BIRTH0=62`, `BIRTHR=62/5119`. Peretoetus annab +3% sünde iga 100 € kuus kohta, lasteaiakoht 1,5-aastaselt +2%.

**Poliitikahoovad (vaikeväärtus = eelseade „ajalugu“):**
| Hoob | Vaikeväärtus | Vahemik |
|---|---|---|
| units, uusi eluruume/a | 30 | 0–90 |
| hh, elanikku uue eluruumi kohta (üks väärtus, eluruumi tüüpi ei eristata) | 2,6 | 1,8–3,4 |
| reg, registreerimise määr | 85% | 50–100 |
| inOther, muu sisseränne/a | 330 | 0–500 |
| outBase, väljaränne/a | 310 | 150–500 |
| support, peretoetus €/kuu väikelapse kohta | 0 | 0–300 |
| la15, lasteaiakoht 1,5-aastaselt | 0 (ei) | 0/1 |
| jobs, uusi töökohti/a | 20 | 0–120 |
| empl, hõive 15–64 | 82% | 60–95 |
| unemp, töötud ja töövõimetud hõivatutest | 5,5% | 0–20 |
| svc, teenuspunkt Aespa–Vilivere | 0 | 0/1 |
| rigid, kulude jäikus laste arvu languses | 60% | 0–100 |
| svcLvl, teenustaseme tõstmine | 0 astet | 0–3 |
| mtaUse, MTA tempo või eelarve | 1 (MTA) | 0/1 |
| pension, keskmine pension | 810 €/kuu | 600–1400 |
| inv, investeeringud | 4 mln €/a | 0–9 |
| own, omaosalus | 35% | 10–100 |
| epUse, Eesti Panga palgarada | 1 | 0/1 |
| ekiUse, EKI ehituskorrektsioon | 1 | 0/1 |
| wage, palgakasv | 5%/a | 0–8 |
| cost, muude kulude kasv | 4%/a | 0–8 |

**Eelseaded:** `ajalugu` (vaikimisi); `ak1` (units 45, inOther 345, outBase 300); `inerts` (20/2,5/75/300/340, jobs 0, empl 80, unemp 7, rigid 90, inv 3, own 40, cost 4,5); `visioon` (70, reg 92, out 280, support 100, la15, jobs 60, empl 84, unemp 4,5, svc, rigid 40, svcLvl 2, inv 6,5, ekiUse 0, wage 5,5); `kons` (40, reg 92, inOther 340, out 300, support 50, la15, jobs 40, empl 83, unemp 5, svc, rigid 10, svcLvl 2, inv 3,5, own 30, cost 3,5).

**Poliitikate efektid (hardcoded):** töökoht annab 0,3 elanikku aastas; toetus 100 € annab +8 sisserändajat; teenuspunkt vähendab väljarännet 20 in/a, investeering 2 500 000 € jaguneb 3 aastale, ülalpidamine 180 000 €/a; teenustaseme aste maksab 60 000 €/a; la15 lisab +25 lasteaiakohta × PER.la; peretoetuse kulu = support·12·a04·0,4; töökohaga seotud investeering 1 500 €/töökoht.

**Majandus:** Eesti Panga palgarada `EP.wage={2026:6, 2027:5.5, 2028:5}`, edasi hoova väärtus. Pensionimaks kasvab 0,9 × palgakasv. EKI ehitusmahu kordaja `EKIMULT={2026:0.75, 2027:0.85, 2028:0.95}`. Ehitushinnad lisaks: buildIdx = 1,03^min(2; y−2026). Investeeringutel on veel kordaja 1,02 (seletuseta). Kuluindeks: ixMix = 0,6·palgaindeks + 0,4·(1+kulukasv)^t (60% kuludest on personalikulud).

**Maks:** `PENS={avg:810, rate:8.5}`. Palgatulu määra 10,64% mainitakse ainult tekstis; valemis kasutatakse 2026. aasta eelarvest tuletatud TAXW = 2 727,28 €. MTAF = 12 890 179 / 12 418 000 = 1,03802 (MTA prognoos tulumaksule ja maamaksule vs eelarve maksutulud).

**Eelarve 2026 (`FIN`):** inc26 18 406 280; tax26 12 418 000; taxOther26 500 000; tf26 649 820; cost26 17 226 600; edu26 10 758 070; laCostTot 3 950 000; socPer65 900 €; debt25 10 054 596; debtLimRatio 0,99; amort 0,09; taxpayers26 3 945; la26 473; sc26 900. Strateegia 2026–2029: tulud 18,41/18,92/19,44/20,01 mln, kulud 17,23/17,96/18,14/18,77 mln, investeeringud 4,07/3,30/4,44/8,70 mln.

**Ühikukulud (tuletatud):** PER.la = 3 950 000/580,4 = **6 805,65 €** lasteaiaealise lapse kohta (8 351 € täidetud koha kohta). PER.sc = (10 758 070 − 3 950 000)/915,98 = **7 432,55 €** koolieelise lapse kohta (7 565 € õpilase kohta). PER.soc = **900 €** 65+ elaniku kohta. PER.oth = **671,93 €** elaniku kohta. Kulude jäikus: kui laste arv langeb, jääb kuludesse alles osa (base − cur)·rigid.

**Toetuste jagunemine:** (tulud − maks − tasandusfond) jaguneb 60% / 40%: haridusega seotud toetus vs muud tulud.

**Mahutavus:** `CAP={la:520, sc:1010}`. Lasteaiakohtade arvu (lastehoid ja Aespa moodulid kaasa arvatud) nimetab mudel ise hinnanguks, koolikohad on „hinnanguliselt“.

**Asulate osakaalud (kulude jaotus):** `SHARE_LA={Kohila alev 0.60, Aespa 0.22, Sutlema 0.10, Prillimäe 0.08}`, `SHARE_SC={Kohila alev 0.96, Hageri alevik 0.04}`, `SHARE_SOC={Hageri küla 0.50}`, `SHARE_OTH={Kohila alev 0.55}`. Asula kasvuosa = 75% kasvu 2016–2026 järgi + 25% rahvaarvu järgi.

**Eesmärkide lävendid:** rahvaarv 2035 ≥9 800 → ok, ≥9 050 → mid. Kasv ≥80/a → ok, ≥40/a → mid. 0–14-aastased ≥98% tänasest → ok, ≥90% → mid. Ülalpeetavate määr ≤60% → ok, ≤68% → mid. Eelarve: min tulem >0 ja võlg <80% ülemmäärast → ok; >−0,5 mln ja <95% → mid. Teenustase ≥8/10 → ok, ≥6 → mid.

**Teenustasemed (`SVC`, [Kohila, naabrite mediaan], skaala 0–9):** Alusharidus 5/5, Põhiharidus 4/3, Noorsootöö 3/4, Laste heaolu 2/4, Täiskasvanute sotsiaalhoolekanne 3/5, Kultuur 3/4, Sport 5/5, Liikuvus 3/5, Planeerimine 5/5, Üldjuhtimine 2/4. Naabrid: Saku, Kiili, Kose, Rapla, Märjamaa, Saue, Harku.

## 4. Andmeallikad

- **Statistikaamet RV0282U:** rahvastik vanuserühmiti 1.01.2015–1.01.2026 (`AGEH`, `VITAL.pop`, `BASE`).
- **RV112U:** elussünnid 2015–2025. **RV49U:** surmad 2015–2025. **RVR02:** sisse- ja väljaränne 2015–2025.
- **RR300:** valla eelarve täitmine 2013–2025 (tulud, maksud, tulumaks, kulud, tulem; tuh €).
- **EH46U:** valminud eluruumid (5 a keskmine 28/a). ER032: ettevõtted (ainult allikaloendis).
- **Kohila valla arengukava 2023–2035:** Spectrum 6.0 prognoosid 2023–2035 (baas, r1, r2), töökohad 31.12.2021, visioon 10 000.
- **Valla eelarve 2026, lisad 1–3, eelarvestrateegia 2026–2029:** FIN, VALD (2024 ja 2025 täitmine, 2026 eelarve), INVLIST.
- **Maksu- ja Tolliameti avaandmed:** tulumaks 2021–2025; kuuandmed 2025 ja jaanuar–august 2026; maamaks (seis „august 2026“).
- **Minuomavalitsus.ee:** teenustasemed 2025, netovõlakoormus 56%, alushariduse kulu lapse kohta 2025 (`PEERLA`, Kohila 8 302 €).
- **Rahvastikuregister (valla väljavõte):** 25 asulat; p16, p21, p24, p26, k06, k715, k1619.
- **Eesti Pank 22.09.2026, Konjunktuuriinstituut aprill 2026.**
- **Maa- ja Ruumiamet:** EHAK piirid L-EST97-s (`MAPGEO`).
- **Raplamaa arengustrateegia 2035+** (ainult viide). Sõsartööriist: Planeeringute mõjuarvestus.

## 5. Kohila võrdlusnumbrid

Saadud mudeli JS-i käivitamisel node'is; vaikimisi eelseade on „Ajalooline tempo“.

| Näitaja | 2026 | 2036 (ajalugu) |
|---|---|---|
| Rahvaarv | 7 844 | 8 488 (2030: 8 088; 2035: 8 423) |
| 0–4 / 5–14 / 15–64 / 65+ | 377 / 1 017 / 5 119 / 1 331 | 373 / 939 / 5 675 / 1 501 |
| Lasteaiakohti vaja | 473 | 457 |
| Koolikohti vaja (põhikool + 1 aasta) | 900 | 850 |
| Sünnid | 62 | — |
| Netoränne | 92/a (2026 EKI-ga väiksem) | 92/a |
| Maksumaksjad | 3 967 | — |
| Maksutulud kokku (MTA tempo) | 12 890 179 € (palk 11 229 681, pension 1 141 486) | 23 142 192 € |
| Põhitegevuse tulud / kulud | 18 736 805 / 17 226 600 € | 31 367 256 / 27 715 693 € |
| Tulem | 1 510 205 € | 3 651 564 € |
| Netovõlg / ülemmäär | — | 3 732 042 / 31 053 584 € |
| Ülalpeetavate määr | 53% | 49,6% |
| Eesmärke ok | — | 2/6 |

Teised eelseaded, rahvaarv 2035 / 2036: ak1 8 941 / 9 067; inerts 7 565 / 7 533; visioon 10 195 / 10 458; kons 9 159 / 9 309.
Arengukava prognoosid 2035: baas 7 540; r1 9 050; r2 10 260 (eesmärgikaardi tekstis on 10 270).

**Registriandmed 2026:** k06 kokku 663, k715 1 007, k1619 425. Tulumaksu MTA prognoos 2026 on 12 445 393 € (+6,39% 8 kuu tempoga), maamaks 444 786 €.

**Ühikukulud:** alusharidus 6 806 € lasteaiaealise kohta (8 351 €/koht), kool 7 433 € kooliealise kohta, sotsiaal 900 € 65+ kohta, muu 672 € elaniku kohta. Kohtade arv on p 6 juures.

## 6. Asulad ja asutused

**Asulad (25; p16 → p26; K/A = lasteaiapiirkond):** Kohila alev 3233→3019 K; Aespa alevik 1001→1792 A; Vilivere 258→372 A; Urge 181→297 K; Prillimäe alevik 317→290 K; Pukamäe 134→275 K; Salutaguse 185→223 K; Pahkla 179→185 K; Sutlema 203→180 A; Hageri küla 121→150 A; Rabivere 140→142 A; Hageri alevik 140→136 A; Masti 105→127 K; Pihali 117→125 A; Mälivere 61→91 K; Loone 61→81 K; Aandu 65→79 K; Angerja 65→71 K; Lohu 68→51 K; Vana-Aespa 50→50 A; Rootsi 36→39 K; Adila 30→38 A; Põikma 24→19 K; Kadaka 23→17 K; Lümandu 16→17 A. Kokku 6 813 → 7 866.
Prognoos 2036 (ajalugu): Kohila alev 3 081, Aespa 2 112, Vilivere 420, Urge 345.

**Teenusasukohad (`SVCLOC`):** lasteaed: Kohila alev, Aespa, Prillimäe, Sutlema. Kool: Kohila alev, Hageri alevik. Noortekeskus: Kohila alev, Hageri alevik, Prillimäe.

**Asutused (`INST`, osakaal valdkonna kulust; mahtuvus):**
- **Haridus:** Kohila Gümnaasium 0,52 (~900 õpilast, sh Hageri õppekoht 34); Sutlema-Aespa Lasteaed 0,13 (~180 kohta: Linnupesa, Metsaveere, Aespa moodulid; inv 300 000); Kohila Lasteaed Männi 0,12 (~150 kohta); Kohila Lasteaed Sipsik 0,11 (~140 kohta, sh Põnnipere maja); Kunstide Kool 0,04; Keskkonnahariduse Keskus 0,015; haridustoetused ja transport 0,065.
- **Sotsiaal:** toetused ja teenused 0,62; hooldekodu kohamaksud 0,28 (Hageri hooldekodu 90 kohta); lastekaitse 0,10.
- **Vaba aeg:** Spordikompleks 0,38 (inv 100 000); Avatud Noortekeskus 0,13; Hageri rahvamaja 0,16; Kohila raamatukogu 0,13; Hageri raamatukogu 0,05; Hageri muuseum 0,05 (inv 393 000); üritused ja toetused 0,10 (inv 198 000).
- **Muud valdkonnad (osakaal 1):** vallavalitsus; teed; jäätmed; kommunaal; avalik kord; tervishoid.
- **Lastehoiud:** Triinu ja Taavi, Linnupoja, PuuOnni. Need on mainitud asulate tekstis, aga ei ole eraldi modelleeritud.

**Valdkonnakulud (VALD, 2024 / 2025 / 2026):**
- Haridus 9 879 253 / 10 013 513 / 10 758 070
- Sotsiaal 1 772 078 / 1 791 845 / 1 852 460
- Vaba aeg 1 492 570 / 1 610 103 / 1 632 250
- Üldjuhtimine 807 718 / 953 682 / 1 300 420
- Majandus 702 573 / 704 584 / 800 710
- Keskkond 536 731 / 595 393 / 661 070
- Kommunaal 247 962 / 216 128 / 225 940
- Avalik kord 33 635 / 38 423 / 48 220
- Tervishoid 5 146 / 6 465 / 17 510

**Investeeringud 2026:** 14 objekti, kokku 4 094 380 € (valla omaosalus 1 539 900 €). Suurimad on ettevõtlusala taristu 1 206 430 € ja teed 1 104 380 €.

## 7. Erisused ja lahtised kohad

- **Mudel on KOV-tasandi kohordimudel 4 vanuserühmaga, mitte ühe aasta vanustega.** Sündimus on seotud kõigi 15–64-aastastega (naisi ja viljakusvanust ei eristata). Suremus on ainult 65+. Teistes mudelites võib olla täiskohortmudel.
- **Leibkonna suurus on üks hoob (2,6), eluruumi tüüpe ei eristata.** Laste arvu eluruumi kohta ei ole: lapsed tulevad ainult `MIGP` profiilist (9% + 18%). See erineb mõjuarvestusest, kus koefitsiendid on eluruumitüübi järgi.
- **Lasteaia- ja kooliealised on tuletatud vanuserühmadest lineaarse jaotusega:** 0,2·a514 tähistab 5–6-aastaseid ja a1564/50 15-aastaseid. Osalusmäärad (0,815 ja 0,983) on kalibreeritud 2026. aasta eelarve kohaarvudele 473 ja 900, mitte EHIS-ele.
- **Netoränne jaotub vanuserühmadesse sama profiiliga ka siis, kui see on negatiivne** (inerts: −2/a).
- **Tekst ja mudel ei klapi rändestsenaariumi 1 osas.** `popNote` väidab, et vaikimisi seadistus kordab ligikaudu AK rändestsenaariumi 1 (9 050), aga vaikeseade „ajalugu“ annab 8 423. Ligilähedase tulemuse annab alles eelseade `ak1` (8 941).
- **Maksumaksjate arv on kolme eri väärtusega:** `FIN.taxpayers26=3945`, hoova tekstis „~3 950“, ASSUMP-is ja mudelis 3 967.
- **Vaikimisi on sees „MTA tempo“ (MTAF 1,038), mistõttu mudeli tulud 2026 (18,74 mln) ei võrdu eelarvega (18,41 mln).** Kulud on täpselt kalibreeritud (17 226 600). VALD-i valdkondade summa 2026 on aga 17 296 650, ehk 70 050 € rohkem kui cost26. Seda märgib ka rakenduse enda anomaaliaküsimus 1.
- **Investeeringute pealkirjas on „4,13 mln €“, objektide summa on 4,094 mln ja strateegias 4,072 mln.** Investeeringute valemis on kordaja 1,02, mida pole kuskil dokumenteeritud.
- **Võla ülemmäär on lihtsustatud** (tulud × 0,99). Võlg amortiseerub 9% aastas, intressi mudelis ei ole. Uus laen tekib ainult siis, kui omaosalus ületab tulemi.
- **Tasandusfondi tundlikkus 0,3 on hinnang** ja „sama eeldus nagu planeeringute mõjuarvestuses“.
- **Toetuste 60/40 jaotus ja nende indekseerimine on meelevaldsed.** Haridustoetus järgib laste arvu, muud tulud elanike arvu.
- **Asulatasandil ei ole asulapõhist demograafiat.** Valla kasv jagatakse asulatele valemiga 75/25. Rahakulude jaotus tehakse hardcoded osakaaludega (SHARE_*).
- **Lähteseisul on kaks erinevat rahvaarvu:** Statistikaamet 7 844 ja register 7 866. Kaart kasutab registrit, mudel Statistikaametit.
- **Teenuskohtade mahtuvus `CAP` on hinnang.** `INST` mahud (~180/150/140 kohta) annavad kokku 470, mitte 520 (vahe tuleb lastehoiust ja moodulitest, kuid seda pole lahti kirjutatud).
- **Hoobade efektid on ilma allikata eeldused:** töökoht → 0,3 elanikku, toetus → sünnid +3% ja +8 sisserändajat, teenuspunkt → −20 väljarändajat.
- **Ajalugu ja prognoos on aastal 2026 ühendatud ilma üleminekuta.** EKI kordaja vähendab 2026. aasta ehitust 25%, mistõttu esimese aasta ränne on väiksem.
- **Suur osa lehest on narratiiv ja hardcoded leiud** (anomaaliad, 59 küsimust, poliitikakaardid), mis ei ole mudeliga seotud. Ökonomeetria arvutatakse ajaloolistest ridadest.
- **k1619 andmeid kasutab ainult ökonomeetria, mudel mitte.** Gümnaasiumiastet (16–19) eraldi ei modelleerita.
