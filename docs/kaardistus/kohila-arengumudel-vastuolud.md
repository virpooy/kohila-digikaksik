# Kohila arengumudel 2036: vastuolude audit

Artefakt: ARXQtbD8ptGNXcSAF84AhP, versioon 1791096714-bf27. Auditis artefakti ainult loeti, midagi ei muudetud ega avaldatud.

Meetod:
- Kõik 16 inline-skripti käivitati node'is muutmata kujul DOM-stubiga. Stub salvestas iga elemendi `textContent`/`innerHTML`.
- Vaikestsenaariumi „Ajalooline tempo“ renderdatud tekstist (140 elementi) võeti numbrid välja ja võrreldi mudeli arvutusega (`run()`, `goals()`, `migParts()`, `drawEcScatter()`).
- Viis eelseadet arvutati eraldi läbi.
- Skriptid on kaustas `/tmp/claude-0/-home-claude/358aa18f-6c6e-51bd-87de-2ea79ca443d6/scratchpad/audit/` (`build.py`, `dump.js`, `checks.js`, `ec.js`).
- Reaviited (`rida N`) viitavad salvestatud HTML-faili ridadele.

Mõju skaala:
- **suur:** muudab otsuse seisukohalt olulist numbrit (rahvaarv, tulem, võlg) või järeldust.
- **keskmine:** muudab vahenumbrit või teeb mõne paneeli eksitavaks.
- **väike:** silt, ümardus, kosmeetika või kasutamata kood.

| Nr | Klass | Kus | Mis on kirjas | Mis tegelikult on | Mõju | Kuidas kontrolliti |
|---|---|---|---|---|---|---|
| 1 | F, H | `run()` võlaplokk (rida ~1015); anomaaliad (`ANOM`), `qList` 8 | Mudel: uut laenu võetakse ainult summas max(0; omaosalus − max(0; tulem)), võlg väheneb igal aastal 9% (`FIN.amort=0.09`), intressikulu ei ole. Anomaaliakaart: 2026 võetakse uut laenu 4,70 mln €, jääk kasvab 11,6 → 11,8 mln €. Küsimus 8: tegelik lühendamine on 0,63 mln €/a (~19 aastat) | Mudel ei võta 2026. aastal laenu (flow: „laenu ei võeta“). Võlg langeb 10,05 → 9,15 mln € (2026) → 3,73 mln € (2036), netovõlakoormus langeb 49% → 12%. 9% amortisatsioon (~0,9 mln €/a) ei vähenda tulemit; tegelik on 0,63/11,6 ≈ 5,4%. Intress 0,37 mln €/a puudub. Kogu tulem läheb omaosaluseks, kuigi rakendus ise ütleb, et 1,00 mln € tulemist kulub laenuteenindusele | suur | `checks.js` väljund aastate kaupa: loan 0 / 69 388 / 221 226 / 68 277 / 0…, debt 9 149 682 → 3 732 042 |
| 2 | H | Eesmärk „Eelarve püsib tasakaalus“, `budNote`, `FIN.strat`, anomaaliakaardid 1–2, `qList` 1, `inv59` 17 | Mudelis „saavutatav“: halvim tulem 1,43 mln €, 2036. aastal 3,65 mln €. `budNote`: strateegia joon on see, „mille vastu mudelit saab kontrollida“ | Strateegia tulem 2027: 18 917 810 − 17 963 150 = 0,95 mln €; mudelis 1,47 mln €. 2029: strateegia 1,24 mln €, mudelis 1,65 mln €. Strateegia investeeringud 2029 on 8,70 mln €, mudelis 4,90 mln €. Anomaaliasektsioon ütleb, et kaks sellist aastat viivad tulemi nulli (`qList` 1: „2028. aasta tulem nullis“), mudel näitab aga 2028. aastaks 1,43 mln € ja tõusvat joont. Kaks sektsiooni annavad samale küsimusele vastupidise vastuse | suur | `checks.js`: mudel vs `FIN.strat` 2026–2029 |
| 3 | A, E, G | `popNote` (rida 1199), eelseade `ajalugu`, eesmärgikaart 2, `calibNote` | `popNote`: „vaikimisi seadistus kordab ligikaudu arengukava rändestsenaariumi 1: mudel annab 2035. aastaks 8 423, arengukava 9 050“. Eelseade „Ajalooline tempo“ peaks hoidma ajaloolist tempot. Kaart: „Tegelik kasv 2016–2026 oli 105 aastas“ | Vaikeseade annab 8 423, mis on AK r1-st 627 võrra (−6,9%) väiksem; laused on iseendaga vastuolus. „Ajalooline tempo“ annab kasvu 64 in/a (netoränne 92 − loomulik iive 23), samas kui tegelik kasv oli 105–107 in/a. Vahe põhjus on nr 11 (2016–2025 komponentide summa on 899, rahvaarv muutus 1 074 võrra) | suur | `render_default.json` (`popNote`, `goalCards`); `checks.js`: growth/a 64 |
| 4 | F | `run()` tasandusfond: `tf=max(0,FIN.tf26-0.3*(taxInc-FIN.tax26))` | ASSUMP: „30% lisanduvast tulumaksust kaob“ (hinnang) | Valem kasutab nominaalset maksutulu. Palgakasv üksi viib tasandusfondi 650 tuh € → 508 tuh € (2026) → 257 tuh € (2027) → 9 tuh € (2028) → 0 (2029+), ka siis, kui elanikke juurde ei tule. Tegelik tasandusfond sõltub suhtelisest tulubaasist | keskmine | `checks.js`, veerg `tf` |
| 5 | H, D | Rahavoo konsool „EELARVE 2026“ (`finfo`, `flow`, `fhRes`) | Pealkiri „EELARVE 2026“: tulud 18,74 mln €, tulem 1,51 mln €, tasandusfond 508 tuh € | 2026. aasta eelarve: tulud 18 406 280 €, tasandusfond 649 820 €. Tulem on eri kohtades 1,15 mln € (`ANOM`, `AMETA`: 2 179 500 − 1 025 666 = 1 153 834), 1,18 mln € (`FIN.inc26 − FIN.cost26` = 1 179 680) ja 1,51 mln € (mudel MTA-režiimis). Silt „eelarve“ käib mudeli väärtuse kohta | keskmine | `render_default.json` (`finfo`, `flow`); käsitsi arvutus konstantidest |
| 6 | A, H | `calibBody` rida „sh tulumaks pensionidelt“; hoova `pension` kirjeldus; poliitikakaart „Eakate teenused“ | „1,14 mln € · 0,33 mln € (2024) → 1,94 mln € (2029) · klapib“ | Mudeli pensionitulumaks 2029. aastal on 1 351 453 €, strateegias 1,94 mln € (−30%). Kalibreerimistabel nimetab seda „klapib“, kuigi kontrolli tegelikult ei tehta | keskmine | `checks.js`, veerg `taxPens` 2029 |
| 7 | E, F | Eelseaded `visioon` ja `kons`; `goals()`; `CAP` | `visioon`: „teenused järele“, eesmärke 6/6. `kons`: eesmärke 5/6 | `visioon`: lasteaiakohtade vajadus ületab `CAP.la=520` alates 2030 (2036: 623) ja koolikohtade vajadus ületab `CAP.sc=1010` alates 2031 (2036: 1 135). `kons`: lasteaiakohti on vaja üle 520 alates 2035. Kohtade puudujääk ei mõjuta kulusid, investeeringuid ega ühtegi eesmärki. `visioon` lülitab välja ka EKI ehituskorrektsiooni (`ekiUse:0`), mida kirjelduses ei mainita | keskmine | `checks.js`: laOverCap/scOverCap |
| 8 | D | `B_SC`, `RATE.sc`, `run()` `sc=0.8*a514+a1564/50`; `INST` Kohila Gümnaasium | Koolikohtade vajadus = 7–15-aastased × 0,9826 (900/915,98). `kidsNote`: „koolis 98% 7–15-aastastest“ | 900 on `INST` järgi kogu Gümnaasiumi õpilaste arv („~900 õpilast, sh Hageri õppekoht 34“), seega gümnaasiumiaste on sees. Mudelis on aga ainult 7–15-aastased. Registri 16–19-aastaste arv `k1619` = 425 on andmetes olemas, kuid mudel seda ei kasuta. Osalusmäär ja koolikulu õpilase kohta (7 433 €) on seetõttu valel alusel | keskmine | koodi ja `INST` võrdlus |
| 9 | A, F | `AMETA` + `ahud()` → `rhSum`, `radarNote` | „AASTANE MÕJU ~3,54 MLN €“, „korduvate leidude rahaline mõju kokku“ | Summa 3 538 959 € sisaldab juhtimiskulude kasvu 492 702 €, mis on kahe aasta kasv (`inv59` 5 ütleb ise: „492 tuh € on kahe aasta kasv… parandatud“, aastane on 346 738 €). Samasse summasse on liidetud kolm kriitilist leidu, mille kohta `radarNote` ise ütleb, et need „ei ole üksteisest sõltumatud“ (1 025 666 + 1 069 826 + 156 765) | keskmine | `AMETA` summa node'is; `inv59` tekst |
| 10 | C, A, B | Investeeringud 2026: `<summary>` (rida ~545), `INVLIST`, `FIN.strat.inv[0]`, `inv59` 7, flow | Pealkiri „14 objekti · 4,13 mln €“ | 14 objekti summa on 4 094 380 €. Strateegia: 4 071 810 €, lühiülevaade (inv59): 4,063 mln €. Mudeli flow 2026: 4,11 mln € (4e6·1,02 + 20·1500). Omaosalus: eelarves 1 539 900 € (38%), mudelis 1,44 mln € (hoob 35%). Ükski allikas ei anna 4,13 mln € | keskmine | `INVLIST` summa; `render_default.json` (`flow`, `invNote`) |
| 11 | G | `VITAL` (RV112U, RV49U, RVR02) vs `VITAL.pop` (RV0282U) | Mudel on kalibreeritud nende voogude järgi | Rahvaarv 2021 → 2022 kasvas 203 võrra, sünnid − surmad + ränne annavad −1. Teistel aastatel on vahe −12…+2. Kokku 2016–2025: voogude summa 899, rahvaarvu muutus 1 074. Vahe 175 on seletamata, sh rahvaarvu kasv, mida „ajaloolise tempo“ kalibreerimine ei kata (vt nr 3) | keskmine | `checks.js`, bilansitabel |
| 12 | E | Eelseade `kons` | „vabanev lasteaia- ja koolivõimekus võetakse kohe kuludest välja“ (rigid 10) | `kons` puhul ei lange lasteaia- ega kooliealiste arv kordagi alla 2026. aasta baasi (min la 580 = B_LA, min sc 916 = B_SC). `keep()` jäikus mõjutab ainult langust, seega `rigid:10` mõju on 0 ja kirjeldatud mehhanismi ei toimu | keskmine | `checks.js`: kons la/sc miinimumid |
| 13 | D | Mudeli võlg vs anomaaliad | `FIN.debt25` = 10 054 596 („netovõlakoormus“); anomaaliates on „laenujääk 11,6 → 11,8 mln €“ | Mudel alustab netovõlast, aga lisab sellele brutolaenu ja amortiseerib seda kui laenujääki. Kaks mõistet on kõrvuti ilma eristuseta | keskmine | koodi lugemine |
| 14 | F | `sPop()` (rida ~1424), eelseade `inerts` | Kasvu jaotus asulatele: 75% kasvumustri ja 25% rahvaarvu järgi | Valem kehtib ka kahanemise korral: kõige kiiremini kasvanud asula kaotab kõige rohkem. `inerts` 2036 (Δ = −311): Aespa −155 (osakaal 0,497), Kohila alev ainult −30 (osakaal 0,096). Alev on tegelikult ainus suur kahanev asula | keskmine | käsitsi arvutus valemiga, Δ `checks.js`-ist |
| 15 | C | Maksumaksjate arv | `FIN.taxpayers26` 3 945 („~3 945 (eelarve 2026)“); hoova `empl` tekst „~3 950“; ASSUMP ja mudel „~3 967“; `heroBadges` „4 398 maksumaksjat“ (2036, aastat märkimata); `qList` 17 „3 945 maksumaksjat 4 989 tööealise kohta“ | Mudel 2026: 3 967. Tööealisi 1.01.2026 on 5 119; 4 989 ei klapi ühegi andmerea ega aastaga | väike | `render_default.json`; `BASE` |
| 16 | C | Tulu ühe maksumaksja kohta | Poliitikakaart: 3 148 €/a (`FIN.tax26/FIN.taxpayers26`); `qList` 17: „~3 100 € aastas“ pere kohta; mudelis TAXW = 2 727,28 € | Kolm väärtust. 3 148 sisaldab pensionimaksu, maamaksu ja muid makse, TAXW ainult palgatulu maksu. „Registreerimise“ mõju +155 tuh €/a kasutab 3 148 € väärtust | väike | node: `TAXW`, `taxPer` |
| 17 | F, A | Poliitikakaart „Registreerimine“ | Tekst ütleb 92% (mõju arvutatakse 0,07 ehk 92 − 85 järgi), nupp „Proovi mudelis“ seab `reg:95` | Nupp ja tekst ei ühti. `regUp` = 11 aasta kumulatiivne mõju (·11), aga sildil on „/a“; töötust valem ei arvesta | väike | `policies()` kood, rida ~2633 |
| 18 | D, H | Silt „Tulumaks“ (flow, `minfo`, `mhTax`, `budNote` „sellest tulumaks 23,14 mln €“) | „Tulumaks 12,89 mln €“ | `taxInc` = palgatulu + pensionitulu + muud maksud × MTAF, sisaldab ka maamaksu (MTAF = (12 445 393 + 444 786)/12 418 000). MTA tulumaksu prognoos samas rakenduses (`mtaNote`) on 12,45 mln € | väike | node: `MTA.prog26`, `MTA.maksutulud26` |
| 19 | D, H | Flow „Sotsiaal ja eakad 1,2 mln €“ | Sotsiaalkulu 2026 | Mudel: 900 € × 1 331 = 1,198 mln €. `VALD` sotsiaalne kaitse 2026 = 1 852 460 €. Ülejäänu on peidetud ridadesse „Muud kulud“ | väike | `PER.soc`, `VALD` |
| 20 | F, A | `wageIdx()` (rida 989), `epNote`, `chartEp` | „Mudel kasutab Eesti Panga palgakasvu rada (6 → 5,5 → 5%)“; graafikul 2026: 6% | Indeks algab aastast `START+1`, seega 2026. aasta 6% ei rakendu kunagi (2026 on baasaasta). Mõjub ainult 5,5% (2027) ja 5% (2028) | väike | koodi lugemine |
| 21 | F | `run()` investeeringud; tulude jaotus | `inv=L.inv*1e6*idx*1.02*buildIdx+invSvc+L.jobs*1500`; `GRANT26=(…)*0.6`, `OTHINC26=(…)*0.4`; peretoetuse kulu `support*12*a04*0.4` | Kordaja 1,02, 1 500 €/töökoht/a, jaotus 60/40 ja 40% 0–4-aastastest ei ole dokumenteeritud üheski tekstis ega ASSUMP-is. Poliitikakaardi „100 € kuus maksaks 179 tuh €“ arvutus kasutab 2036. aasta a04 väärtust, aastat märkimata | väike | koodi lugemine |
| 22 | F | Kasutamata konstandid | `realLine()`, `AKNAME`, `HIST.share`, `ECON.taxpayers21/wage21/wageEE21/jobsRapla/jobsOther/firms/firmsEmp/taxInc`, `BASE.k06/k715`, `EP.infl` | Defineeritud, kuid mitte kasutatud (kasutuskordi 0 või ainult definitsioon). `HIST.share` = [0,55; 0,83; 0,56] ei klapi `HIST.debt`/tulud 2023–2024 suhtega (47%; 63%) | väike | `grep` kasutuskordade loend |
| 23 | B | `ECON` töökohad | jobsTot 3 753 | jobsLocal + jobsRapla + jobsOther = 1 233 + 146 + 2 365 = 3 744 (−9) | väike | node |
| 24 | B | `sPop()` osakaalud | — | Osakaalude summa on 1,0007. Asulate baas on 7 866 (register), mudeli baas 7 844. Asulate summa 2036: ~8 510, mudelis 8 488 | väike | `checks.js` |
| 25 | B | `INST.inv` vs `INVLIST` | Asutuste investeeringud | Tervishoid 249 200 €, vastavad objektid (teraapiakeskus II + heaolukeskus) annavad kokku 250 000 €. Ettevõtlusala (1 206 430), Angerja, hajaasustus ja tänavavalgustus ei ole ühegi asutuse all (kokku 1 332 000 €); `INST.inv` summa on 2 761 580 € 4 094 380 €-st | väike | node summad |
| 26 | B, C | Lasteaiakohad | `CAP.la=520` („lasteaiad, lastehoid ja Aespa moodulid“) | `INST` lasteaedade kohad: ~180 + ~150 + ~140 = 470. Lastehoiu ja moodulite osa 50 kohta ei ole kuskil välja toodud | väike | `INST` |
| 27 | A | Eesmärgikaart 1 | „stsenaarium 2 annab 10 270“ | `AK.r2` 2035: 400 + 980 + 6 940 + 1 940 = 10 260 (ka `chartPop` silt: 10 260) | väike | node `akTot` |
| 28 | A | Eesmärgikaart 5 | „netovõlakoormus tõuseb kuni 49% ülemmäärast (2025: 56%)“ | Maksimum 49% on 2026. aastal, edasi koormus ainult langeb (12% aastal 2036). „Tõuseb“ on vale suund | väike | `checks.js` ratio |
| 29 | A | `cmpNote` | „Kohila tugevused on sport, planeerimine ja alusharidus“ | Need kolm on võrdsed naabrite mediaaniga (5/5). Ainus mediaanist parem valdkond on põhiharidus (4 vs 3), mida ei nimetata | väike | `SVC` |
| 30 | A | `policyMeta` | „12 valikut, igaüks seotud mudeli hoovaga“ | Kolmel kaardil on `set:null` (Rail Baltic, eakate teenused jt), neil puudub hoob | väike | `policies()` `set` loend |
| 31 | A | `ekiNote`, ASSUMP „Ehitushindade kasv“ | „ehitushindade ootus on aastaga kolmekordistunud (+17 → +59)“ | +17 on jaanuar 2026 (3 kuud varem). Aasta varem (04/25) oli +23, seega kasv on 2,6×. `ekiTiles` ütleb ise „jaanuaris +17“ | väike | `EKI.s[1].v` |
| 32 | A | `mtaNote` | „kümne aastaga 2,3 korda“ (2016 → 2025) | Periood on 9 aastat. Suhe 11,698/5,158 = 2,27 on õige | väike | node |
| 33 | A | `chartBud` tooltip, `chartMta` legend | „Tegelikud tulud 2016–2025“ sisaldab punkti 2026 = 18,74 mln € (mudel). „Tulumaks (tegelik laekumine)“ 2026 tulp on 12,45 mln € | 2026 on mudel või prognoos, mitte tegelik. 2016–2020 tulbad on RR300-st, 2021+ MTA-st (vt nr 41) | väike | `render_default.json` |
| 34 | A | ASSUMP „Maksutulude tase“ | „MTA jooksev laekumine (12,85 mln €)“ | `MTA.maksutulud26` = 12 890 179 € (12,89; nii näitavad ka `calibBody` ja flow) | väike | node |
| 35 | A | ASSUMP silt „ametlik“ | „Maksumaksjaid ~3 967 … ametlik“; „Sünnid lähteaastal 62 … ametlik“ | 3 967 on hinnang (hõive 82% ja töötus 5,5% on samas tabelis märgitud „hinnang“). 62 on valitud väärtus, ametlik 2023–2025 keskmine on 61 (koodikommentaar rida ~983 ütleb sama) | väike | ASSUMP vs kood |
| 36 | A, G | Poliitikakaart „Peretoetus“ | „Vallas sünnib aastas umbes 65 last, aastakäigud on kahanenud 2016. aasta 121 pealt“ | RV112U (`VITAL.births`): 2016 = 95, 2023–2025 = 72, 51, 60 (keskm. 61). Mudel 2026: 62. Väärtusi 65 ja 121 ei ole üheski andmereas | väike | `VITAL` |
| 37 | A | Eesmärgikaart 4 | „baasstsenaariumis … 48%, rändestsenaariumis 1 aga 48%“ | Mõlemad on 47,8–47,9%. „Aga“ vihjab erinevusele, mida ei ole | väike | `render_default.json` |
| 38 | F | `calibBody` „Maksutulud“ | „12,89 mln € · 12,89 mln € (MTA jooksev tempo) · klapib“ | Mudeli väärtus on definitsiooni järgi sama MTA arv (`MTAF` kalibreering), seega võrdlus on tautoloogia. Ka „Maksumaksjaid 3 967 vs ~3 945 klapib“ võrdleb mudelit enda sisendiga | väike | koodi lugemine |
| 39 | A | `ecStats` paar Δ15–64 → Δtulumaks | „Tõus 0 ± 0 (95%) ühe ühiku kohta“ | Tõus on ~0,003 mln € inimese kohta; ümardus kuvab nulli | väike | `ec.js` |
| 40 | C | Netovõlakoormus 2025 | 56% (KPI, eesmärgikaart, ASSUMP); 57% (`qList` 10, `inv59` F6 „lühiülevaade annab 57%“) | Kaks väärtust samale suurusele | väike | `render_default.json` |
| 41 | C, H | Tulumaks 2021–2025: `FINH.tulumaks` (RR300) vs `MTA.tulumaks` | Mõlemat nimetatakse tegelikuks | 2021: 8 099 100 / 8 030 597. 2022: 9 044 600 / 8 992 747. 2023: 10 010 900 / 9 987 060. 2024: 11 049 800 / 10 927 656 (−122 tuh €). 2025: 11 706 900 / 11 697 974. Ökonomeetria tabel näitab 2024 = 11,0, MTA graafik 10,93 | väike | `checks.js` |
| 42 | G | `AGEH` vanuserühmade summa vs `VITAL.pop` (mõlemad RV0282U) | Sama allikas | 2022: 7 527 vs 7 525; 2023: 7 727 vs 7 726; 2024: 7 832 vs 7 834 | väike | `checks.js` |
| 43 | F, G | Nullrände test vs ASSUMP „ilma rändeta kordab mudel arengukava baasstsenaariumi“ | — | Kui units, inOther, outBase, jobs, support ja svc on 0: mudel annab 2035 = 7 606, AK baas 7 540. Vanuserühmad 318 / 807 / 5 053 / 1 428 vs 290 / 720 / 5 100 / 1 430 ehk lapsi on 10–12% rohkem. Kogu muutus on sarnane (−238 vs AK −210 2026 → 2035), aga lähteseisud erinevad (7 844 vs AK 2026 7 750) | väike | `checks.js` |
| 44 | H | Rahvaarv 2026 | Kaart, `hudPop`, `cinfo`: 7 866; olekuriba, `popChip`, mudel: 7 844 | Dokumenteeritud ASSUMP-is (register vs RV0282U), aga samal lehel on kaks erinevat „rahvaarvu“. Register 2021 = 7 414 vs RV0282U 7 322 (+92) | väike | `render_default.json` |
| 45 | H, D | Netoränne „aastas“ | KPI ja hero: 92 (2036); `calibBody`: 76 (2026, EKI-korrektsiooniga); sisseränne 402 vs 386 | Erinevad aastad, kumbki ei näita aastat | väike | `render_default.json` |
| 46 | H, D | Investeeringud „aastas“ | Eesmärgikaart 5: „Investeeringud 4,4 mln € aastas“ (= `R(2027).inv`); hoob: 4,0 mln €; flow 2026: 4,11 mln € | Sama „aastane“ summa on kolmel kujul | väike | `render_default.json` |
| 47 | D | Eesmärk „Rahvaarv 10 000 aastaks 2035“ | Kasutab `R(2035)` ehk rahvaarvu 1.01.2035 | „Aastaks 2035“ tähendab tõenäoliselt aasta lõppu (1.01.2036 = 8 488, mitte 8 423) | väike | koodi lugemine |
| 48 | D | Lasteaia kulu lapse kohta | Peer-võrdlus: 8 302 € (netokulu 3–6-aastase kohta, Minuomavalitsus); flow: 8 351 € koha kohta; mudel `PER.la`: 6 806 € 0–6-aastase kohta | Kolm erineva alusega numbrit. `qList` 13 korrutab 1 381 € vahe 470 lapsega (kohtade arv, mis sisaldab ka alla 3-aastaseid) | väike | node `PER` |
| 49 | D | Anomaaliakaart „Väikesed read“ vs `inv59` D | Kaart: +240% (tervishoid), +43% (avalik kord) võrreldes 2024. aastaga; inv59: +171%, +25% võrreldes 2025. aastaga | Baasaasta vahetub ilma märkimata | väike | `VALD` |
| 50 | E | Eelseade `ak1` | „jõuab 2035. aastaks 9 050 elanikuni“, kasv „80–120 aastas“ | Mudel annab 8 941 (−109), kasv 122 in/a | väike | `checks.js` |
| 51 | E | Hoob `own` vaikeväärtus | 35% | 2026. aasta eelarves on omaosalus 38% (1 539 900 / 4 094 380), mida rakendus ise kasutab anomaaliates. Vaikimisi mudel ei lähtu 2026. aasta eelarvest | väike | node |

## Kontrollitud ja korras

**Renderdatud tekstid, mis klappisid arvutusega (A):**
- Põhinäitajad: rahvaarv 2026/2035/2036 (7 844 / 8 423 / 8 488), lasteaia- ja koolikohtade vajadus (473 → 457, 900 → 850), loomulik iive −23, netoränne 92 ja selle komponendid (402/310).
- Hero ja eesmärgid: puudu visioonist 1 577, 84% visioonist, halvim tulem 1,43 mln €, eesmärke 2/6, teenustase 4/10.
- Eelarve ja maksud: hariduskulud 2036 16,61 mln €, flow 2026 komponendid (12,89 + 3,2 + 0,508 + 2,14 = 18,74; kulude jaotus 3,95 / 6,81 / 1,2 / 5,27).
- EKI: eluruume 23/29 EKI-korrektsiooniga.
- Eelseadete tulemid scenStrip'il.
- `kidsNote` osalusmäärad 81% / 98%.

**Anomaalia- ja küsimustesektsiooni aritmeetika (A):**
- Tulem: 12,0% ja 6,3% tuludest, langus −47%; kulud +8,6% / tulud +1,6% (valdkondade summad).
- Kulukasvud: juhtimiskulud +61% / +346 738 €, haridus +8,9% / +744 557 €, sotsiaal +4,5% / +3,4%.
- Laen ja intress: 4,50 − 3,87 = 0,63; 11,6 + 4,70 − 4,50 = 11,8; intress 3,1% ja 118 tuh €/pp; ~19 aastat; stressistsenaarium (tulem ~0,7 mln €, omaosaluseks ~0,1 mln €).
- Toetuste osakaalud: omaosalus 38%, ettevõtlusala 94% toetus (tagasinõue kuni 1,13 mln €), Hageri muuseumi toetus 280 tuh €.
- Tulumaksu ülelaekumine: 0,29–0,55 mln €, tulem 1,4–1,7 mln €, 8 kuud 8,27 mln € (+6,4%), aastaprognoos 12,45 mln €, +545 tuh €, eelarve +1,7% üle 2025. aasta laekumise.
- Võrdlused ja muu: peer-võrdlus (4. koht, +20%, ~650 tuh €), kohatasu katab ~10%, likviidsuse puhver 1,44 mln €, II etapi objektid 0,46 mln €, `inv59` 17 (1,09 / 0,71 mln €).

**Muud tekstiväited (A):**
- Maatriksi lause „koolist üle 5 km 2 691 inimest“.
- Poliitikakaardid: Aespa ja Vilivere > 2 100, alev −7% / Aespa +79% / Pukamäe +105%, 65+ 1 331 → 1 501.
- Ökonomeetria väited (r 0,99 / 0,38 / 0,66 / 0,23 / −0,66 / 0,42 / −0,65; R² 0,32; tulumaks tööealise kohta ~8% aastas ja 2020 +2,3%; asulate seosed −0,22 / −0,07 / 0,95 / 0,55; Adila +93% / −34%). Kontrollitud rakenduse enda `drawEcScatter`-iga.

**Summad (B):**
- Vanuserühmad annavad kokku rahvaarvu (BASE ja mudeli read).
- `INST` osakaalud on igas valdkonnas 1,00.
- `SHARE_LA` ja `SHARE_SC` annavad kokku 1,00.
- `VALD` 2024 ja 2025 summad = RR300 kulud (15 477 666 ≈ 15 477,7 tuh; 15 930 136 = 15 930,1 tuh).
- `FINH` tulem = tulud − kulud (2018–2025, ±0,1 ümardus).
- MTA kuuandmed 2025 annavad aastasumma 11 697 974.
- Investeeringute toetused 2 554 480 €.
- Flow tulude ja kulude komponendid.
- `anomMeta` (10/3/3), `invMeta` (59 = 12 + 8 + 39), `QGROUPS` 20 küsimust, `calibMeta` 18/20.

**Andmed vs tsiteeritud allikas (G):**
- RV0282U 2026 vanuserühmad = BASE.
- Sündide ja surmade 2023–2025 keskmised (61; 81,7).
- Rände keskmised 2016–2025 (389,8 / 300,1 / neto 90) ja 2023–2025 (68).
- Hariduse osakaal 62%.
- Võlakoormuse 56% ja laenuruumi 7,9 mln € omavaheline klapp (`debtLimRatio` 0,99 × 2025. aasta tulud).

**Valemid (F):**
- Vananemisvood (1/5; 1/10; ~1/50 aastas).
- 0–6 ja 7–15 vanuserühmade tuletus.
- EKI ehitusmahu kordaja ja `buildIdx` vastavad kirjeldusele.
- Teenuspunkti ja teenustaseme kulud vastavad hoobade kirjeldustele.
- `regUp` vahe 0,07 vastab 92% tekstile.
- `ihEdu` „12 asutust 11,53 mln €“ (13 asutust miinus vallavalitsus).

**Eelseaded (E):**
- `ajalugu`: netoränne ~90.
- `inerts`: jäikus 90%, väljaränne 340.
- `visioon`: ≥10 000 aastal 2035 (10 195).
- Hoobade vahemikud ja vaikeväärtused vastavad siltidele.

**Ei saanud kontrollida** (allikas ei ole rakenduses tsiteeritud kujul): `MIGP` tuletamine arengukava stsenaariumide vahest (kumulatiivne vahe sisaldab vananemist), EH46U 28/a, Minuomavalitsus teenustasemed, EKI „aasta tagasi 68%“, `CAP.sc=1010`.
