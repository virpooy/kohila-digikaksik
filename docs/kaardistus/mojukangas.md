# Planeeringute mõjukangas — kaardistus

Artefakt: https://claude.ai/artifact/MnY5GbnNTmeuZ1qjSDs7jF (versioon 1793092793-7983, ~6,9 MB, üks HTML-fail, eraldi faile pole).
Loetud 30.10.2026 ainult lugemiseks: HTML (Artifact read) + jagatud andmebaas (`settings/params`, `plans` 32 kirjet, `calib` tühi).
Mudeli tuum: põhiskripti read 3–192 (`model`, `totals`, `coh`, `baseLA/SC`, `capNeed`); aruanne `buildReport`; kaardivaade `ATL`.

## 1. Ülevaade

- **Eesmärk:** Kohila valla detailplaneeringute (DP) register ja koosmõju arvutus: kui palju elanikke, lasteaia- ja põhikoolilapsi DP-d lisavad, kas kohti jätkub (Kohila ja Aespa piirkond eraldi) ning milline on valla eelarve netomõju (tulumaks − teenuste kulu − investeering − tasandusfondi kadu). Lisaks arendaja proportsionaalse panuse (kulujaotuse) arvutus ja õiguslik kontrolltabel.
- **Ajahorisont:** `START = jooksev aasta` (2026), `H = 11` → 2026–2036; ajalugu 2016-st (`PAST_FROM`). Hetktõmmis `SNAP_DATE = "29.09.2026"`, mahuandmete tempel `"stamp":"2026-10-12"`, viimased muudatuslogi kirjed 14.10.2026. Versioonistringi pole.
- **Sisendvorm (planeering):** nimi, asukoht (asula), tüüp (`korter` / `ridaelamu` / `eramu` / `ari`), eluruumide arv `units`, juba valminud `realized`, kehtestamise aasta, staatus (kehtestatud / ehitusluba / ehitamisel / menetluses / arutelul), tõenäosus % `prob`, asustamise algusaasta `startYear` (vaikimisi NOW+2), asustamise kestus `rampYears` (1–10, vaikimisi 2), valla investeering €, uue tänava km `streetKm`, piirkond K/A, arendaja kohustused, allika URL, märkused. **Üks kirje = üks elamutüüp**; segaarendus sisestatakse mitme reana.
- **Eelduste vorm:** kõik parameetrid (§3) on muudetavad ja salvestuvad jagatud andmebaasi (`settings/params`).
- **Väljundid:** planeeringu dialoogis „Uusi elanikke 2036”, „Lasteaialapsi (tipp)”, „Õpilasi (tipp)”, „Neto täisasustusel €/a”, „Neto 2026–2036 (11 a)”; koondis aastate kaupa res, la (laK/laA), sc, yo, huvi, tax, cost, inv, maint, tf, net; rühmade ja klassikomplektide vajadus; vabad kohad; investeeringu kulujaotus; DP mõjuaruanne (A–I).
- **Vaated (k9-kest):** Ülevaade · Planeeringud · Kaardivaade (atlas, MapLibre + katastri/DP geomeetria) · Teenused · Eelarve · Vald ja asulad · Eeldused ja andmed.
- **Stsenaariumid:** `exp` Oodatav (tõenäosustega, vaikimisi), `adopted` Kehtestatud 100%, `all` Kõik 100%, `noDisc` Ilma arutelul olevateta. Aruandes demograafia Madal/Baas/Kõrge.

## 2. Näitajad

| Näitaja | Ühik | Tase | Aastad | Kuidas arvutatakse | Sisendid | Allikas |
|---|---|---|---|---|---|---|
| Asustatud eluruumid `D·occ(y)` | eluruum | DP | 2026–2036 | D = (units − realized) × tõenäosus; occ(y) = min(1, (y − start + 1)/ramp), enne starti 0 | units, realized, prob, startYear, rampYears | DP register |
| Uued elanikud `res` | in | DP, vald | 2026–2036 | D × occ(y) × hh[tüüp] × net; net = (1 − internal/100) × (registered/100) = 0,8 × 0,9 = **0,72** | hh, internal, registered | eeldus (hinnang) |
| Lasteaialapsed `la` | laps | DP, piirkond K/A | 2026–2036 | iga asustuskohordi kohta Σ coh × LA_PROF[aastaid kolimisest]/100 × kids[tüüp] × net | LA_PROF, kids | eeldus |
| Põhikooliõpilased `sc` | õpil | DP, vald | 2026–2036 | sama, SC_PROF profiiliga | SC_PROF, kids | eeldus |
| Noored `yo` | in | DP | 2026–2036 | sc × 1,35 | sc | konstant koodis |
| Lapsed kokku / täiskasvanud | in | DP | 2026–2036 | kidsAll = min(res, (la + sc) × 1,35); adults = res − kidsAll | — | konstant koodis |
| Tulumaks `tax` | €/a | DP, vald | 2026–2036 | adults × employment(72%) × wage × idxW × 12 × taxShare(10,64%) ≈ **2018,7 € täiskasvanu kohta/a** (wage 2196) | employment, wage, taxShare | MTA / eelarve |
| Huvihariduse kulu `huvi` | €/a | DP | 2026–2036 | yo × (huviSlots × huviCost + kkRate × kkCost) = yo × (0,54×135 + 0,15×3000) = yo × **522,9 €** | huviSlots, huviCost, kkRate, kkCost | tuletatud |
| Tegevuskulu `cost` | €/a | DP, vald | 2026–2036 | (la × 5950 + sc × 1400 + res × 410 + huvi) × idxC + maint | laCost, schoolCost, otherCost | VV määrus, eelarve |
| Tänava hooldus `maint` | €/a | DP | alates start | streetKm × 4000 × prob × idxC | maintPerKm, streetKm | hinnang |
| Investeering `inv` | € | DP | max(start, 2026) ühekordselt | plan.investment × prob (kasutaja sisestab; €/koht konstanti ei ole) | investment | DP kirje |
| Tasandusfondi kadu `tf` | €/a | vald | 2026–2036 | min(tfCap 649 820, tax × tfOffset 30%) — ainult koondis | tfOffset, tfCap | hinnang / EAS |
| Netomõju `net` | €/a | DP / vald | 2026–2036 | DP: tax − cost − inv (TF-ta); vald: Σ − tf | kõik ülal | arvutus |
| Neto täisasustusel `netFull` | €/a | DP | täisasustuse aasta | tax − cost aastal start + ramp − 1 | — | arvutus |
| Baasnõudlus lasteaed `baseLA` | laps | vald, K/A | 2016–2036 | laRate 93,7% × (Σ coh 2–6-a + 0,5 × coh 1-a) + laOther 14; Aespa osa aShare = min(60, 41 + 1×(y−2024))% | born, migLA, migSC | Statistikaamet RV0240 |
| Baasnõudlus põhikool `baseSC` | õpil | vald | 2016–2036 | scRate 96% × Σ coh 7–15-a + scOther 91 | born | Statistikaamet |
| Vabad kohad | koht | K, A, vald | 2016–2036 | LA: laCapK 335 + hoidK 25 (+laAdd) − baseLA×(1−aShare); A: laCapA 110 + hoidA 17 + laAdd 40 (alates 2027, A) − baseLA×aShare; SC: scCap 1010 − baseSC | mahud | MA aruanne 2025 |
| Rühmad / klassikomplektid | tk, €/a | vald | 2016–2036 | ceil(la/20) K ja A eraldi; klassid ceil(õpil/24) iga klassiaste eraldi; muutuse hind groupOpCost 55 000 €/rühm, classCost 60 000 €/klass | groupSize, classSize | valla andmed |
| Arendaja panus | € | DP × investeering | inv. aasta | K × min(C−O, max(0, U−V))/C × Uᵢ/U − kohustuste väärtus; mahutavuseta objektil K × Uᵢ/(baaskasutajad + U); madal × (1 − pubBenefit 20%) | invest register | arvutus |
| Aruande demograafia | in | DP | täisasustus | k02 = la×0,4; k36 = la×0,6; k16 = sc×0,3; eakad = res × oldShare 8%; leibkonnad lastega = (la+sc+k16)/1,7 | oldShare | hinnang |
| Asulate rahvaarv (kaart) | in | 25 asulat | 2016–2036 | p16/p21/p24/p26 mõõdetud; edasi trend (p26 − p21)/5 summutusega 0,8/a + DP elanikud asula järgi | settle | kohila.ee |

## 3. Eeldused ja parameetrid (vaikeväärtused; live = andmebaas `settings/params`)

**Leibkond ja lapsed eluruumi kohta** (`hh`, `kids`, mõlemad „hinnang”, kalibreerimata — `calib` kogu tühi):

| Tüüp | hh in/eluruum | kids kordaja |
|---|---|---|
| eramu (üksikelamu) | 3,0 | 1,5 |
| ridaelamu | 2,8 | 1,4 |
| korter | 2,1 | 1,0 |

`ari` tüübil langeb kood tagasi korteri väärtustele (`P.hh[plan.type] ? … : "korter"`).

**Uustulijate vanusprofiil** — laste osakaal (% asustatud eluruumi kohta, korrutatakse `kids`-iga) aasta järgi pärast sissekolimist (k = 0…10, edasi viimane väärtus):
- `LA_PROF = [18,20,19,16,13,11,10,9,9,9,9]`
- `SC_PROF = [14,16,18,20,21,21,20,19,18,17,16]`
Täiskasvanute vanusjaotust eraldi ei ole; noored = sc × 1,35; aruandes eakad 8%.

**Asustamine ja ränne:** internal 20% (valla seest kolijad, ei ole netolisand), registered 90% (registreerib end Kohilasse); net = 0,72. Asustus lineaarne `rampYears` jooksul alates `startYear`. Tõenäosuse soovitus staatuse järgi: ehitamisel 95, ehitusluba 85, kehtestatud 65 (vanem kui 5 a → 35), menetluses 50, arutelul 30.

**Osalus:** laRate 93,7% (2–6-a + pool 1-aastastest), laOther 14; scRate 96% (7–15-a), scOther 91; gymRate 29% (gümnaasium, ainult voogude joonisel). Baasnõudluses aastakäigu kasv rändega migLA 2,5%/a (<7-a), migSC 1%/a (≥7-a).

**Sünnid/aastakäigud:** `born` 2006–2025 (nt 2021: 106, 2022: 81, 2023: 75, 2024: 53, 2025: 62). Edasi `birthMode:"trend"`: lineaarne trend viimase `birthWin` 10 a pealt, summutus `birthDamp` 30%/a, põrand `birthFloor` 40; alternatiiv `flat` → `futureBirths` 60.

**Mahud:** laCapK 335, laCapA 110, hoidK 25, hoidA 17 (kokku 487); laAdd 40 kohta 2027 Aespa piirkonda; scCap 1010 („õpilaste arv + 30”, hinnang); aespaShare 41% (+1 pp/a, lagi 60%); groupSize 20; classSize 24.

**Ühikukulud:** laCost 5950 €/laps/a (VV määrus 12.01.2026 nr 1-1/1, kaalutud keskmine 584 €/kuu miinus kohatasu); schoolCost 1400 €/õpil/a (Kohila G 117 €/kuu); otherCost 410 €/elanik/a (824 €/elanik mitte-hariduse põhitegevuse kulu × 50%); huviSlots 0,54 × huviCost 135 €; kkRate 0,15 × kkCost 3000 € (kunstide kool); nkVisits 5,1 külastust/noor; sportPerRes 206 €/elanik (ainult aruande tekstis, kulusse ei lähe).

**Investeering:** €/koht konstanti mudelis ei ole. groupCost 150 000 €/rühm (Aespa moodulid 0,3 mln / 2 rühma) on parameetrite hulgas, kuid arvutuses ei kasutata. Investeeringuregister: Aespa lasteaiamoodulid 40 kohta 300 000 € (2026, A); Kohila terviserada II etapp 100 000 € (SPORT). DP-kirje `investment` sisestatakse käsitsi.

**Tulud:** taxShare 10,64% (KOV tulumaksu osa), wage **2196 €/kuu live** (andmebaasis) / 2296 €/kuu koodi varuväärtuses ja muudatuslogis, employment 72%, ~4245 maksumaksjat (kalibreerimise alus, mudelis ei kasutata). Tasandusfond: tfOffset 30% maksutulu kasvust kaob, lagi tfCap 649 820 €/a.

**Taristu:** maintPerKm 4000 €/km/a; ÜVK kohustused on arendajal (kohustuste register, mitte mudel). Pendelrände osakaale mudelis ei ole.

**Indekseerimine ja diskonteerimine:** `inflOn: 0` (väljas); sees olles wageGrow 5%/a, costGrow 3%/a, buildGrow 5%/a (investeeringu maksumus). Diskonteerimist ei ole — „neto 11 a” on lihtsumma.

**Kulujaotus:** pubBenefit 20% (valla laiem kasu, madalas variandis), Madal/Kõrge: hh ×0,85/×1,15, kids ×0,7/×1,3, internal ±10 pp.

## 4. Andmeallikad

Koodi `SOURCES` (16): Ametlikud Teadaanded; kohila.ee DP nimekiri (29.09.2026); Ehitisregister (22.09.2026, hooned, korterite arv puudub); Statistikaamet RV0240 (1.01.2026, aastakäigud); kohila.ee asulad ja elanikud 2016–2026; valla eelarve armatuurlaud Power BI (31.07.2026); Eelarvestrateegia 2026–2029; arengukava 2023–2035; 2025 majandusaasta aruanne (kohtade arv); VV määrus 12.01.2026 nr 1-1/1 (kohamaksumus); Minuomavalitsus.ee avaandmed (`MOV`, naabervaldade võrdlus); Eesti Pank (palga- ja hinnakasv); Konjunktuuriinstituut (baromeetrid); Maa- ja Ruumiamet EHAK piirid; Kohila DP arhiiv da.kohila.ee (OCR, `mahud` JSON 12.10.2026); MTA laekumised (august 2026).
Sisseehitatud andmed: `atlasdata` (~4,3 MB katastri-, hoone- ja DP-geomeetria), `mahud` (~0,86 MB kehtestatud DP-de ehitusõigus), `settle` (25 asulat: p16/p21/p24/p26, lapsed k06/k715/k1619, teenused), `hist` (valminud eramud/kortermajad 2011–2025).
Iga parameetri usaldusmärgis `REL`: ametlik / valla andmed / tuletatud / hinnang.
Live-register: 32 DP-kirjet, 388 eluruumi (25 eramu-, 5 korteri-, 2 ridaelamukirjet; 17 kehtestatud, 10 menetluses, 4 ehitamisel, 1 arutelul).

## 5. Näidisarvutus

**Kuidas saadud:** mudeli tuum (põhiskripti read 3–192, muutmata) käivitati node'iga; parameetrid = live `settings/params` (wage 2196). Kolm kirjet, sest üks kirje = üks tüüp: 40 eramu + 20 ridaelamu + 40 korter, asukoht Kohila alev (piirkond K), prob 100 (stsenaarium `all`), startYear 2028, rampYears 2 (vormi vaikeväärtused), realized 0, investment 0, streetKm 0, inflOn 0. Teiste DP-de mõju ei ole sees.

| Aasta | res | la | sc | tax €/a | cost €/a | sh huvi | tf €/a | net €/a |
|---|---|---|---|---|---|---|---|---|
| 2028 | 93,6 | 8,29 | 6,45 | 148 770 | 101 313 | 4 554 | 44 631 | 2 826 |
| 2029 (täis) | 187,2 | 17,51 | 13,82 | 292 517 | 210 051 | 9 759 | 87 755 | −5 289 |
| 2030 | 187,2 | **17,97** (tipp) | 15,67 | 286 238 | 216 674 | 11 060 | 85 871 | −16 308 |
| 2033 | 187,2 | 11,06 | **19,35** (tipp) | 295 029 | 183 311 | 13 662 | 88 509 | 23 209 |
| 2036 | 187,2 | 8,29 | 17,05 | 308 843 | 162 009 | 12 036 | 92 653 | 54 182 |

- **Uusi elanikke:** 187,2 (eramu 86,4 = 40×3,0×0,72; ridaelamu 40,3; korter 60,5).
- **Lasteaialapsi:** tipp 17,97 (2030); tüübiti tipud 8,42 / 3,93 / 5,62.
- **Kooliõpilasi:** tipp 19,35 (2033); tüübiti 9,07 / 4,23 / 6,05.
- **Tulumaks täisasustusel (2029):** 292 517 €/a; **kulud:** 210 051 €/a (la 104 185 + sc 19 348 + muu 76 752 + huvi 9 759).
- **Investeering:** 0 € (mudel ei tuleta; sisend). Tasandusfondi kadu ~88 000 €/a.
- **DP dialoogi „Neto täisasustusel”** (TF-ta): eramu 36 484, ridaelamu 17 026, korter 28 956 €/a (kokku 82 466). **Neto 2026–2036** (TF-ta) 400 117 + 186 721 + 306 128 = 892 966 €; valla koondis pärast TF-i: **139 135 €**.
- Varuväärtusega wage 2296: neto 11 a pärast TF-i 219 233 €. Kui start 2027 ja ramp 1 (live): 226 881 €.
- Rühmad/klassid 2032: lasteaiarühmi 16 nii ilma kui ka koos; klassikomplekte 41 → 43 (+2 ehk +120 000 €/a astmelises arvestuses).
- Kontekst (live, ilma DP-deta): baseLA 2026 = 435,7, vabu LA-kohti 51,3; baseSC 967,5, vabu 42,5; 2036 vabu LA 274,2 ja SC 274,9 (aastakäikude kahanemine).

## 6. Seos teiste mudelitega

- **Rahvastikuprognoosi ei kasuta.** Baasnõudlus tuleb oma kohordimudelist: Statistikaameti 1.01.2026 aastakäigud (`born`) + trendiga sünniprognoos + konstantne rändekasv (migLA/migSC). DP-de lisand liidetakse sellele (lisandmudel, mitte ühine projektsioon).
- **Asustusandmed:** `settle` (kohila.ee asulate rahvaarv 2016/21/24/26 ja lapsed) — kasutatakse kaardivaates ja asulate trendis (summutus 0,8), DP-elanikud jagatakse asula järgi (`mcPlaceKey`). Mõjuarvutus ise on asulaülene; ainult LA eristab piirkondi K ja A (regex: Aespa, Vilivere, Sutlema, Hageri, Pihali, Rabivere, Lümandu, Mälivere → A).
- **Eelarve:** eraldiseisvad konstandid (ühikukulud, wage); eelarvestrateegia `STRAT`, täitmine `BUD`, `PAY`, `EP`, `EKI` ja `MOV` on kõrvalvaadetes võrdluseks, mudelisse ei lähe (v.a palga- ja kulukasvu võimalik indekseerimine).
- **Visuaalsüsteem** on arengukanga k9 (ühine Raplamaa arengukangaga); arvutusmootor on aga eraldi ja dubleerib osaliselt arengumudeli loogikat.
- Ühine väljund digikaksiku jaoks: aastane DP-lisand (res, la, sc, tax, cost) aastatel 2026–2036.

## 7. Erisused ja lahtised kohad

1. **wage vastuolu:** live andmebaasis 2196 €/kuu, koodi varuväärtus ja muudatuslogi (kalibreering) 2296. Live vaade arvutab 2196-ga → muudatuslogis kirjeldatud +4,5% maksutulu ei ole andmebaasis rakendunud.
2. `groupCost` 150 000 € ja `freeLA`/`freeSC`/`laCap` on andmebaasis, kuid arvutus neid ei kasuta; `sportPerRes`, `nkVisits`, `gymRate` mõjutavad ainult teksti või kõrvaljoonist.
3. Kaks ühtlustamata kuluarvestust: lapsepõhine (5950/1400 €) eelarvejoonisel vs astmeline rühm/klass (55 000/60 000 €/a) võimekuse tabelis — rakendus ise märgib selle lahendamata vastuoluks.
4. Täiskasvanute arv on jääk: kidsAll = (la + sc) × 1,35. Laste vananedes kasvab maksutulu ka ilma uute elaniketa, kuid 0–1-aastaseid ja 16+ arvestatakse vaid kaudselt.
5. `hh` ja `kids` on hinnangud, kalibreerimise kogu `calib` on tühi. Kordaja `kids` korrutab protsendiprofiili, mistõttu „laps eluruumi kohta” ei ole otse loetav.
6. Diskonteerimist ei ole; vaikimisi püsihinnad (inflOn 0). „Neto 11 a” on lihtsumma.
7. Tasandusfondi kadu (30%, lagi 649 820 €) rakendub ainult valla koondis, mitte DP dialoogi netos → DP- ja koondneto ei ole otse võrreldavad.
8. Investeering ei tulene mudelist (puudub €/koht); see sisestatakse käsitsi või investeeringuregistrist kulujaotuse jaoks.
9. Pendelränne, tööhõive struktuur, teede ehitus (ainult hooldus 4000 €/km) ja ÜVK puuduvad (ÜVK on arendaja kohustus).
10. Register katab 2018. aastast kehtestatud DP-d; varasemat kasutamata ehitusõigust ja projekteerimistingimusi ei ole sees, valminud osa (`realized`) on suuresti teadmata. Mudeli tulemus on tingimuslik hinnang.
11. `START` = brauseri jooksev aasta: 2027. aastal nihkub horisont ja aastakäikude logika automaatselt, kuigi `born` on 1.01.2026 seisuga.
12. Rail Baltica Kohila jaama mõju rändele on muudatuslogis nimetatud suurimaks teadmata teguriks, mudelis seda ei ole.
