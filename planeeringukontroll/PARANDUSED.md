# Kohila planeeringukontroll – auditi parandused (31.10.2026)

Parandatud fail: `/home/claude/pk/fix/index.html` (v34 koopia). Originaal `/home/claude/pk/index.html` ja auditifailid jäid muutmata. Midagi ei avaldatud.
Testid: `node /home/claude/pk/fix/tests/run_all.js <html>` (oma komplekt, 101 kontrolli) ja `node /home/claude/pk/audit/D/run_all_D.js <html>` (kasutajateekonnad D). Lõpptulemused on dokumendi lõpus jaotises „Lõplikud testitulemused”.
Muudatuste logis on üks kanne kuupäevaga 2026-10-31: sinu varasem kanne jäi alles ja selle `t` loendisse lisasin 14 lihtsas keeles punkti.

Raskusaste ja numbrid on auditiaruannete järgi (A = tähtajad, B = etapid, C = dokumendid). Dubleerivad leiud on ühendatud: A2 = C2, A6 = C26, A16 = C34, A12 ≈ B6 ≈ C12, A13 ≈ B22, B17 ⊂ A4, C4 ≈ B1/B2.

| Leid | Raskus | Tehtud / Jäi tegemata (põhjus) | Kus muudeti | Test |
|---|---|---|---|---|
| A1 väljapaneku teade 14 p | kriitiline | **Osaliselt.** RT_kontroll.md järgi ei leidnud A1 kinnitust, seega jäi kehtima reegel „teade enne algust”. `inForce` valib nüüd reegli redaktsiooni selle toimingu kuupäeva järgi, mida reegel kontrollib (teade, väljapanek, kehtestamine), mitte algatamise kuupäeva järgi. Vana sõnastusega reeglit (14 p) ei lisatud, sest selle teksti ja kehtivuse lõppu rakenduse REG/ACTS andmetes ei ole. | `stepKeyOf`, `inForce` | A1 |
| A2 = C2 väljapanek 30 p | kriitiline | Tehtud. 30 p kehtib ÜP-menetluse liikides, ÜP-d muutva DP korral, KSH-ga DP korral ja ÜP-ta alal (`yp_puudub`). Sama kestus on vastuvõtmise eelnõu tekstis ning kontrollides r3/r3b/v5. Lisatud on DL-testid. | `valjapanekNeed`, `RULES.r3/r3b need30`, `DL_TESTS` | A2, A2b |
| A3 ÜP-menetluse teated | suur | Tehtud. Uued kuupäevad „eelnõu väljapaneku teade” ja „eelnõu arutelust teatatud”, reeglid y5t, y7t ja y14t (aruteluteade). 14 p miinimumi ei rakendatud, sest see pole kinnitatud: reegel nõuab „teade enne”, nagu kehtiv § 87 lg 5. Lisatud on teade `y_ev_teade`. | `YP_RULES`, `PROC_STAGES.yp`, `YP_RULEMAP.r5b`, `NT_NEW` | A3, B16 |
| A4 teise vooru teade | suur | **Osaliselt.** Lisatud `valjapanekTeade2`, reegel r2b (blokeeriv) ja r3k (teine väljapanek algab pärast esimese lõppu, blokeeriv). Korduva kooskõlastuse kuupäeva (`kooskolastus2`) ei lisatud: selle tähtaeg pole seaduses määratud, seega kontrollitavat reeglit ei teki. | `DATE_FIELDS`, `R2_DATES`, `RULES` | A4, B17 |
| A5 3 a algatamisest vs taotlusest | suur | **Osaliselt.** Kehtiv sõnastus (taotlusest) jäi. Vana sõnastust („algatamisest”) ei lisatud, sest seda pole rakenduse andmetes (vt RT_kontroll.md). Kui taotluse kuupäev puudub, annab k6 nüüd hoiatuse koos ülempiiriga (algatamine + 3 a), mitte „ei kohaldu”. | `computedCheck("kolmAastat")` | A5 |
| A6 = C26 KSH teade 14/30 p | keskmine | Tehtud. DP-s kontrollib `kshTeade` AT/veebi 14 p (r1d). Uus kuupäev `kshTeadeLeht` kontrollib ajalehte ja isikuid 30 p (r1e, § 128 lg 8¹). ÜP-menetluses kehtib KeHJS § 35 lg 6 järgi 14 p. | `RULES`, `DATE_FIELDS`, `STAGES.alg` | A6 |
| A7 r0 puhkepäev | keskmine | Tehtud: 30 ja 90 p tähtaeg nihkub tööpäevale. | `ruleResults` (soft) | A7 |
| A8 aastatähtaeg puhkepäeval | keskmine | Tehtud kõigis kohtades: reegel, töölaud, k6 ja kestus. | `dueOf`, `ruleDue`, `ruleResults`, `kolmAastat`, `durations` | A8 |
| A9 29.02 + 3 a | keskmine | Tehtud: tulemus on 28.02 (kuu viimane päev). DL-testi ootus on parandatud. | `addYears`, `DL_TESTS` | A9 |
| A10 d5 365 p | keskmine | Tehtud: `op:"years", days:1`. | `DPM_RULES.d5` | A10 |
| A11 PENDING-reeglid „Vastab” | keskmine | **Osaliselt.** Kui reegel tugineb ainult kinnitamata sättele, on tulemuse juures märge „säte kinnitamata – kontrolli Riigi Teatajast”. Seda ei tehtud hoiatuseks, et kõik ÜP-tähtajad ei muutuks kollaseks. Sätete teksti ei saanud registrisse võtta, sest RT-le polnud ligipääsu. | `ruleResults` | A11 |
| A12 r4 ilma arvamusteta | väike | Tehtud: r4 ja y13 kehtivad ainult siis, kui arvamusi esitati. | `RULES.r4`, `YP_RULES.y13` | A12 |
| A13 = B22 r6 „kõik arvestati” | väike | Tehtud: r6, r6b ja y15 kehtivad, kui arutelu toimub. Kontrollrada ei jää ootama. | `RULES`, `YP_RULES` | A13 |
| A14 TsÜS § 136 lg | väike | Tehtud: viide on nüüd lg 6, märge „kinnitamata” jäi alles (vt ebakindlad kohad). | `SHIFT_NOTE` | A14 |
| A15 § 139 lg 7 kohaldamine | väike | Tehtud: lisatud märge EhSRS § 30¹⁴ (alates 01.01.2027) sätte pealkirja ja ACTS-i redaktsiooni. | `REG`, `ACTS.PlanS` | A15 |
| A16 = C34 surnud kood | väike | Tehtud: eemaldatud. | `actBlocks` | A16 |
| A17 kooskõlastuse 30 p alguspunkt | väike | Tehtud: sildi ja tulemuse tekstis on märge „kättesaamisest”. | `r9b`, `ruleResults` | A17 |
| B1 liik ei järgi meta | kriitiline | Tehtud. Liik tuletatakse ÜP muutmise ja KSH väärtusest. Käsitsi valitud liik kehtib ainult DP muutmise ja ÜP-ta ala korral. Kui vorm või Claude muudab liigi ÜP-menetluseks, seatakse aktiks volikogu otsus (teavitusega). Kui eelhinnang on „kohustuslik”, saab KSH väärtuseks „jah”. Vanad kirjed tuletatakse laadimisel ümber. | `liikOf`, `syncLiik`, `applyMeta`, META-kuular, `prep` | B1 |
| B2 pädevus lihtvaates | suur | Tehtud. Pädevuse kontroll on üks (`padevusCheck`) ja kehtib kõigis etappides ning dp/yp liikides. Vale vorm blokeerib allalaadimise (`blockers`), on lihtvaates „Järgmine samm”, päises punasena ja andmekaardil nupuga „Muuda volikogu otsuseks”. KSH eelhinnangu väli on nähtav ka lihtvaates. | `padevusNeed/Check/Memo`, `blockers`, `nextStep`, `renderHead`, `renderLiik`, HTML `f_eelh` | B2, C4 |
| B3 pärast kehtestamist | suur | Tehtud. `reachedStage` arvestab ka kehtestamist (tase 3). `lampOf` ei peida kehtestamise järgseid teavitusi („Kehtestatud · teavitus hiljaks”). | `reachedStage`, `pastStage`, `lampOf` | B3 |
| B4 DPM etapid | suur | Tehtud: etappide piirid ja konfliktikontroll sõltuvad menetlusliigist. | `reachedStage`, `STAGE_START_BY`, `dateConflict` | B4 |
| B5 puuduv teade, 4 olekut | suur | Tehtud. Kõigis vaadetes on üks olek: „teate kuupäev sisestamata, kuigi … oli …” (hoiatus). Kontrollrada vaatab ka reegli `from`-sammu. | `ruleResults`, `pendingDeadlines`, `noticeDue`, `pipeSteps`, `critItems`, `deskItems`, `dueText` | B5 |
| B6 = C12 arvamusi pole | suur | Tehtud. Arvamused, seisukohad ja tulemuste tõend on nõutavad, kui arvamusi esitati. Arutelu protokoll on nõutav, kui arutelu toimub. | `DT`, `RULES` | B6, A12 |
| B7 registrist avamine | suur | Tehtud. Maht ja olek jäävad registri järgi. Kohalik puudumine on ainult UI lipp (`textHere`), mis registrisse ei lähe. Olekut „teises arvutis” registrisse enam ei kirjutata. | `openFromRegister`, `regBody`, `idbRestoreTexts`, dokumentide loendid | B7 |
| B8 klassifitseerimine | suur | Tehtud. Liik tuleb nimest ja sisust. Lisamise etapp on ainult viigimurdja (etapita eelnõu, täpsustamata haldusleping). Ajalehe- ja veebiteadetel on oma liigid (`teade_alg/vv/keht`). Kirjad ja seisukohad ei ole aktid. „Heakskiitmata jätmine” ei ole heakskiit. Skeemi muster on kitsendatud. Laadimisel liigitatakse ümber ainult automaatsed liigid ja ainult tugeva tunnuse korral. Varasem liik jääb välja `prevType`, käsitsi valik (`manual`) jääb muutmata. | `classifyDoc`, `CONTENT_TYPES`, `DT`, `placeDoc`, `reclassifyDocs`, `legacyGuess`, `prep` | B8, B8b |
| B9 eelmise etapi dokumendid | suur | Tehtud: etapp loetakse alanuks, kui selle akt on tehtud või menetlus on hilisemas etapis. | `stageSummary` | B9 |
| B10 pikendus teadetes | keskmine | Tehtud. | `noticeDue` | B10 |
| B11 registrirea etapp | keskmine | Tehtud: rea olek sõltub ainult rea andmetest (`keyStage(k,M)`, `famStages`). | `keyStage`, `dateConflict`, `ruleDue`, `timeline` | B11 |
| B12 DPM tahvel | keskmine | Tehtud: tundmatu veerg viib esimesse veergu. | `boardPos`, `renderBoard` | B12 |
| B13 DPM etapiriba | keskmine | Tehtud. | `stageDoneDate`, `renderTabs`, `nextStep` | B13 |
| B14 kestuse normid | keskmine | Tehtud: normid tulevad reeglitest r0/y0/d0 ja r12/d5. | `durations` | B14 |
| B15 teine voor ÜP-menetluses | keskmine | Tehtud: R2-reeglid (v.a 14 p aruteluteade) kehtivad ka ÜP-menetluses. Korduv väljapanek kestab 30 p. | `initProc`, `pipeSteps` | B15 |
| B16 teadete etapp ÜP-s | keskmine | Tehtud: vastuvõetud planeeringu väljapaneku teade on keht-etapis (`stBy`). Lisatud eelnõu väljapaneku teade. | `NOTICES`, `ntSt`, `stageNotices` | B16 |
| B17 2. väljapanek pärast 1. lõppu | keskmine | Tehtud (r3k, blokeeriv). | `RULES.r3k` | B17 |
| B18 vigane salvestis | keskmine | Tehtud: `prep` täidab puuduvad osad, `load` on try/catch-is. | `prep`, `load` | B18, B18b |
| B19 kriitilised punktid | väike | Tehtud: kärbe on eemaldatud, lisatud teise vooru punktid. | `critItems`, `CRIT_EV` | B19 |
| B20 etapi silt | väike | Tehtud: silt tuleb `boardPos`-ist. | `stageOf` | B20 |
| B21 DPM teade vv-s | väike | Tehtud. Ka `d_valjLopp` on kontrollrajal. | `PROC_STAGES.dpm`, `ACT_KEYS` | B21 |
| B23 PLANIS vastuolud | väike | Tehtud: vastuolulised ja dubleeritud kuupäevad on märgitud „KONTROLLI”. | `planisRows` | B23 |
| B24 etapita dokument | väike | Tehtud: dokument liigitatakse uuesti, varuvariant on „alg”. | `reclassifyDocs` | B24 |
| B25 registri mahupiir | väike | Tehtud. Lühendamine on kaheastmeline ja kasutaja saab teate. | `regBody` | B25 |
| C1 osaline kehtestamine | kriitiline | Tehtud. „Kehtestada osaliselt …”, „kehtestatakse järgmises osas … Ülejäänud osas jätta kehtestamata”. Hinnang on preambulis ja seletuskirjas. | `kehtActBlocks`, `memoBlocksStd` | C1 |
| C3 haldusleping § 130 lg 2 | kriitiline | Tehtud: p 1 (ÜP-ta ala), p 2 (ÜP muutmine), „?” korral kohatäide. | `FIELDS.alg.kulud` | C3 |
| C4 pädevus liigi järgi | kriitiline | Tehtud (vt B2). Seletuskirja pädevuslause tuleb liigi järgi. | `padevusMemo`, `memoBlocksStd` | C4, B2 |
| C5 kohustuslik KSH | kriitiline | Tehtud: pealkiri, KSH peatükk (KeHJS § 33 lg 1), teade ja hinnanguküsimus. | `titleOf`, `algActBlocks`, `kshAuto`, `NOTICES.alg_ksh`, `JUDGE_QS` | C5 |
| C6 sisukontroll šablooni järgi | kriitiline | Tehtud. Koostatava eelnõu iga kohustuslik osa on seotud oma rea(de)ga (`EL_SRC`). Kohatäitega rida ei loe täidetuks. Rakenduse püsitekst loeb ainult osades, mis on alati püsitekstis (vaidlustamisviide, § 134 kinnitus). Sama kontroll kehtib ka „Kontrolli eelnõu” abil lisatud eelnõu kohta. Päris eelnõu tekstist eemaldatakse enne mustri otsimist kohatäited. | `stripPh`, `EL_SRC`, `draftElCheck`, `elementResults`, `renderReq` | C6 |
| C7 eelhinnangut pole | suur | Tehtud. | `kshAuto`, `memoBlocksStd` | C7 |
| C8 KSH teade ÜP-menetluses | suur | Tehtud: KeHJS § 35 lg 6, 14 p ka ajalehes. | `algActBlocks` | C8 |
| C9 § 134 kinnitus | suur | Tehtud: lause vastuvõtmise eelnõus ja uus ametniku küsimus. | `vvActBlocks`, `JUDGE_QS.vast134` | C9 |
| C10 ülaindeks | suur | Tehtud: 9¹, 8¹, 4¹, 3¹, 2¹ nii aktides kui ka registri siltides. | `SUP_LG`, `fmtBasis`, `REG` | C10 |
| C11 puuduste kiri | suur | Tehtud: valla enda dokumendid on välja jäetud. | `VALD_DOCS`, `defectList` | C11 |
| C13 KSH seire | suur | Tehtud. | `kehtActBlocks` | C13 |
| C14 heakskiit ÜP-menetluses | suur | Tehtud, yk1/k5 muster on parandatud. | `kehtActBlocks`, `FIELDS.keht.heakskiit`, `ELEMENTS` | C14 |
| C15 sundv 7 p | suur | Tehtud: lause on eemaldatud, viide on § 127 lg 2. | `noticeBlocks`, `NT_NEW` | C15 |
| C16 KSH „?” | suur | Tehtud: kohatäide, PLANIS-es „selgitamisel”. | `titleOf`, `algActBlocks`, `planisRows` | C16 |
| C17 regexid | keskmine | Tehtud: 31 positiivset ja negatiivset näidet (auditi 20 + 11 uut). | `ELEMENTS`, `EL_NEW` | C17 |
| C18 algatamise pädevuslause | keskmine | Tehtud: lause viitab delegeerimisele. | `algActBlocks` | C18 |
| C19 eskiisi väljapanek | keskmine | Tehtud: ainult ÜP-menetluses (§ 82–83). | `algActBlocks` | C19 |
| C20 § 128 lg 2 alused | keskmine | Tehtud: küsimus `alus2`, rida `alus128` ja akti lause. | `JUDGE_QS`, `FIELDS.alg`, `algActBlocks` | C20 |
| C21 preambuli arvamuste lause | keskmine | Tehtud. | `kehtActBlocks` | C21 |
| C22 y_ls tähtaeg | keskmine | Tehtud. | `noticeBlocks` | C22 |
| C23 alg_at skeem | keskmine | Tehtud: skeemi link on teate väli. | `noticeBlocks`, `NOTICES` | C23 |
| C24 DPM tekstid | keskmine | Tehtud: kaalutluste kohatäide, vv seletuskiri, menetluse käik ainult eelnõule eelnenud toimingutega. | `dpmActBlocks`, `dpmMemoBlocks` | C24 |
| C25 PLANIS | keskmine | **Osaliselt.** Tehtud: korraldaja Kohila vald, „selgitamisel”, andmekogu nr, huvitatud isik, akti nr, kuupäevad PP.KK.AAAA ja märge „ei ole impordivorming”. Piiri geomeetriat ei lisatud, sest rakenduses seda andmet pole ja PLANIS-e formaat on teadmata. | `planisRows` | C25 |
| C27–C33, C35 keel ja vorm | väike | Tehtud (Korralduse annab; KSH suurtähtedega; korduvus; lisa 1; „osas” lause; seesütlev kääne; ypk viited; e-post). | `memoBlocksStd`, `algActBlocks`, `inessiveAsukoht`, `JUDGE_QS`, `noticeBlocks` | C27–C33, C35 |

Lisaks tegin auditi-väliseid pisiparandusi, mis tulid testimisel välja:
- „Materjalid lisamata · N tähtajarikkumist” arvestas tegelikult kõiki puudusi, nüüd on silt „N puudust”.
- Pädevusvea kiip mahub kitsal ekraanil ühele reale.
- Teate puudumise märge kriitiliste punktide juures on lühike.

## Testide kokkuvõte (1. voor)
- Pärast A/B/C parandusi läbis parandatud fail 82/82 kontrolli ja v34 8/82. Lõplikud numbrid (koos D-ga) on dokumendi lõpus.
- Konsool: mõlemas failis on ainult võrguploki teade (CDN on testis blokeeritud). Uusi vigu ei ole.

## Ebakindlad õiguslikud kohad (vajavad Peetri/juristi kinnitust)
- TsÜS § 136: nihkereegli lõike number (lg 6) on kinnitamata.
- ÜP-menetluse (PlanS § 82, 83, 88) teadete 14 p miinimum: rakendus nõuab ainult „enne”.
- KSH-ga DP (`tava_ksh`) kohta eeldatakse, et otsustab volikogu (§ 124 lg 7 → ÜP-menetlus). Nii oli ka varem, aga Riigi Teatajast pole see kinnitatud.
- `yp_puudub` liigis eeldatakse, et ka algatamise ja vastuvõtmise otsustab volikogu.
- Seletuskirja pädevuslause viitab Kohila VVK 25.06.2019 määruse nr 9 § 3 delegeerimisele kõigis kolmes etapis. Määruse sisu ei ole kontrollitud.
- Kui kõiki arvamusi arvestati, ei arvuta rakendus tulemuste avaldamise (§ 137 lg 2) tähtaega, sest alguspunkt on seaduses lahtine. Tõend on siiski nõutav.

## Päris kirjed – käsitsi parandamist vajavad andmed
- **Konksu**:
  - Vastuvõtmise kuupäev 26.05.2026 on varasem kui avalik arutelu 20.11.2024. Vastuvõtmise ajaleheteated on aga 10.2024. Tõenäoliselt on vale vastuvõtmise kuupäev.
  - Teise väljapaneku kuupäevad on samad mis esimese omad (25.06–08.07.2026). See on blokeeriv viga: kontrolli väärtust „voorud = 2” ja kuupäevi.
  - Taotluse kuupäev puudub.
  - Väljapaneku ja aruteluteate kuupäevad puuduvad.
  - Laadimisel liigitati automaatselt ümber 30 dokumenti. Vaata need üle, eriti haldusleping (jäi kehtestamise etappi), „Seisukohad … koostamiseks” ja „… juurdepääsu seisukoha küsimine” (jäid „lõplik lahendus”).
  - Mõne dokumendi olek on „Faili tekst on teises arvutis” ja maht 0. Selle kirjutas registrisse varasem viga ja seda ei saa taastada: lisa need failid uuesti.
- **Kivisilla ja Kivisalu**: sisestatud on ainult „Algatamisest teavitatud isikud 05.10.2026”, algatamise kuupäev puudub. Taotlus on .doc-vormingus ja rakendus seda ei loe.
- **Jõe tn 1**: kuupäevi pole. Taotluse .doc on olekuga „teises arvutis” ja mahuga 0. Kehtestamise etapil on 16 Claude'i analüüsi leidu, kuigi menetlus on algatamata. Kontrolli, kas analüüs on õige planeeringu kohta.

## D – kasutajateekondade leiud (2. voor)

| Leid | Raskus | Tehtud / Jäi tegemata (põhjus) | Kus muudeti | Test |
|---|---|---|---|---|
| D1 muudatus kaob planeeringu vahetamisel | kriitiline | Tehtud. Enne teise planeeringu avamist kirjutatakse ootel muudatus registrisse ja seda oodatakse. Registrist avatud kirje on sügav koopia, nii et registri vahemälu ei saa enam kogemata muutuda. Lehe peitmisel ja sulgemisel (visibilitychange/pagehide) salvestatakse kohe. | `flushReg`, `openFromRegister`, `openPlanAt`, kuularid | D1, J4.18 |
| D2 muudatus kaob „Alusta uut” korral | kriitiline | Tehtud: `startNew` ootab enne tühjendamist salvestuse ära. | `startNew` | D2, J4.19 |
| D3 kolleegi muudatus kirjutatakse üle | kriitiline | Tehtud. Runtime'i andmebaasil ei ole versiooni- ega tingimuslikku kirjutust (ainult `set`), seetõttu loetakse enne igat kirjutust registri kirje (`doc().get()`, varuvariant on hetkeseis). Kui kirje on uuem kui see versioon, mille pealt selles brauseris töötatakse, siis ei kirjutata. Lehe ülaossa ilmub punane riba kolme valikuga: **Ühenda** (kolmesuunaline: väljad, mida sina ei muutnud, võetakse kolleegilt; kui mõlemad muutsid sama välja, jääb sinu väärtus ja need väljad näidatakse teates), **Laadi kolleegi versioon** või **Salvesta minu versioon üle**. Kuni valikut ei tehta, registrisse ei kirjutata. Ümbernimetamine konflikti ajal muudab ainult kolleegi versiooni nime. | `pushReg`, `fetchRemote`, `merge3`, `resolveConflict`, `renderRegBar`, `renamePlan` | D3, J4.21, J4.24 |
| D4 „arvamusi ei esitatud” kehtestamise aktis | kriitiline | Tehtud kõigi variantide jaoks. „pole”: preambul ütleb, et arvamusi ei esitatud; arvamuste lisa puudub; seletuskirjas on „ei esitatud” ja „avalikku arutelu ei korraldatud (§ 136 lg 2)”; teavitusest on välja jäetud „isikutele, kelle arvamusega ei arvestatud”; seisukoha, arutelu ja tulemuste teateid ei pakuta. „koik”: arvestati, arutelu ei toimunud, lisa ilma aruteluta. „osa” ja „?”: kõik nagu varem, kohatäitega. | `kehtActBlocks`, `FIELDS.keht.lisad`, `memoBlocksStd`, `NOTICES` | C21, D4, D4b, J2.K07 |
| D5 töölaud on laadimisel tühi | suur | Tehtud: töölaud kuvatakse laadimisel ja registri uuendusel. | `refreshAll`, `onSnapshot` | D5, J5.00, J5.19 |
| D6 ebaõnnestunud salvestus | suur | Tehtud. Ülal on püsiv riba „Salvestamata muudatused” nupuga „Proovi kohe”, olekurida ei ütle enam „salvestatud”. Automaatne kordus toimub kasvava vahega (5 s → 2 min). | `pushReg`, `renderRegBar`, `renderRegStatus` | D6, J4.29, J4.30 |
| D7 kehtestatud planeeringu punased tähtajad | suur | Tehtud: kehtestamisele eelnevad sammud ei ole pärast kehtestamist enam tähtaegadena näha. **Teadlik erinevus D-testist (J5.04, J5.20, J5.21):** P4-l jäävad kehtestamise järgsed teavitused (ajaleht, maakatastri pidaja, andmekogu, isikud), mida pole sisestatud ja mille tähtaeg on möödas, punaseks. Koordinaator nõudis, et päriselt hilinenud teavitused jääksid näha, ja planeeringu vaade näitab sama. | `reachedStage`, `lampOf` | B3, J5.04/20/21 (erinevus) |
| D8 puuduste kiri | suur | Tehtud: ei nõua valla dokumente (sh eelnõu ja asutuste seisukohad eelhinnangule). | `VALD_DOCS` | C11, D8, J2.A10–A11 |
| D9 dokumendi eemaldamine | suur | Tehtud: toastis on nupp „Võta tagasi” (8 s), sama ka korduste eemaldamisel. J4.12 kukub D-komplektis alati, sest kontroll on kirjutatud tingimuseta `false`; toastis on nüüd „… Võta tagasi”. | `removeDocs`, `toast` | D9 |
| D10 klaviatuuriga lisamine | suur | Tehtud: lohistamisalad ja „+ Lisa dokument” on Tab-iga fookustatavad ning avanevad Enteri või tühikuga. | HTML, klaviatuurikuular | D10, J6.kb.02 |
| D11 eelvaade ei muutu akti vormi muutmisel | keskmine | Tehtud. | META-kuular | D11, J3.01/04 |
| D12 liigivahetus kirjutab akti vormi üle | keskmine | Tehtud: akti vorm muutub ainult ÜP-menetlusse minnes (volikogu otsus). | `setLiik` | D12, J3.05 |
| D13 teise liigi kuupäevad CSV-s ja ajajoonel | keskmine | Tehtud. Kasutatakse ainult kehtiva liigi kuupäevi (ka Claude'i analüüsi lähteandmetes), salvestatud andmed jäävad alles. | `dateKeysFor`, `planisRows`, `timeline` | D13, J3.06/07 |
| D14 toimunud rikkumine ei kajastu registri tules | keskmine | Tehtud: rea tuli hindab ka juba toimunud tähtajarikkumisi (kehtestatud planeeringul ainult kehtestamise järgseid). | `ruleEval`, `lampOf` | D14 |
| D15 registrirea tuli sõltub avatud planeeringust | keskmine | Tehtud (1. voor, B11). | `keyStage`, `famStages` | B11, J5.11 |
| D16 „täna” UTC järgi | keskmine | Tehtud: kohalik kuupäev. **D-testi vastuolu:** J2.A08 võrdleb UTC kuupäevaga ja kukub kell 00:00–02:00/03:00, kuigi J4.36 nõuab kohalikku kuupäeva. Rakendus on J4.36 järgi õige. | `todayIso` | D16, J4.36 |
| D17 kustutatud dokumendi kuupäevaettepanek jääb | keskmine | Tehtud: eemaldatakse koos dokumendiga ja taastub tagasivõtmisel. | `removeDocs` | D9, J4.13 |
| D18 390 px horisontaalne kerimine (Teated) | keskmine | Tehtud: valikuväli ja tähtaja märk mahuvad laiusesse. Kontroll vaatab nüüd kõiki teateid kõigis etappides. | CSS | UI-390, J6.390-*.01 |
| D19 registri eemaldamise kinnitus kaugel | keskmine | Tehtud: kinnitus ilmub klõpsatud rea alla ja fookus läheb nupule „Jah, eemalda”. | registri kuular | J5.18 |
| D20 PLANIS vorming ja nimi | väike | Tehtud: täisnimi koos sõnaga „detailplaneering”, kõik kuupäevad PP.KK.AAAA, koostaja ka algatamise andmetest. | `planisRows` | D20, J2.A27–29 |
| D21 kontrollraja järgmine samm on peidus | väike | Tehtud: kui eeldused on täidetud, on samm „plaanis”, mitte „ootab”. | `pipeSteps` | D21, J2.V00 |
| D22 viiekohaline aasta | väike | Tehtud: kuupäev peab jääma vahemikku 1990–2099, vale kuupäeva ei salvestata ja kasutaja saab teate. | kuupäevaväljade kuular | D22, J4.08 |
| D23 Wordi teegi tõrke teade | väike | Tehtud: teadetes, otsustuskirjes ja aktis. | `dlErr` | J4.34 |
| D24 tühi mustand töölaual | väike | Tehtud. | `deskRows` | D24, J5.02 |
| D25 puutealad < 24 px | väike | Tehtud: põhialal on nupud, valikuväljad, kokkuvõtted, märkeruudud ja lingid vähemalt 24×24 px. | CSS | J6.390-*.03 |
| D26 fookuse lõks modaalaknas | väike | Tehtud: kontrollaken ja sätteaken; Esc toimib nagu enne. | klaviatuurikuular | J6.kb.05 |

Liigi märge: kui menetluse liik muutub planeeringu andmete järgi, näitab andmekaart, mis muutus, ja pakub nuppu „Muuda tagasi” (J3.03).

### Riskid päris andmetele (salvestus ja ühendamine)
- Konflikti tuvastus võrdleb registri kirje aega `updatedAt` selle versiooni ajaga `syncedAt`, mille pealt selles brauseris töötatakse. Kui sama kasutaja muudab planeeringut kahes vahelehes, näeb ta konfliktiriba, mitte vaikset ülekirjutust. See on teadlik valik.
- Runtime'i andmebaasil ei ole tingimuslikku kirjutust. Kahe kirjutuse vahele jääb väga lühike aken (lugemisest kirjutamiseni), kus teineteise üle kirjutamine on endiselt võimalik.
- Ühendamine on väljapõhine. Kui mõlemad muutsid sama välja (nt sama eelnõu rida), jääb ametniku enda väärtus. Teates näidatakse, mis väljad need olid, aga kolleegi väärtust ei säilitata. Pärast kasutuselevõttu tasub esimestel nädalatel seda jälgida.
- Kui runtime'is ei ole `doc().get()`-i, kasutatakse viimast `onSnapshot` seisu. Siis tuvastatakse konflikt ainult siis, kui teade on juba saabunud.
- Registrisse lisandusid dokumendiridadele väljad `manual`, `cls` ja `prevType`. Vanad kirjed laaditakse ja liigitatakse esimesel avamisel ümber. Kui avamine toimub arvutis, kus dokumendi teksti ei ole, jäävad maht ja olek registri järgi alles.

## Lõplikud testitulemused

| Komplekt | v34 | Parandatud fail |
|---|---|---|
| Oma regressioonikomplekt `fix/tests/run_all.js` (A, B, C, D, püsivus, päris kirjed, 390/1280 px hele/tume) | 8/101 | **101/101** |
| D-teekonnad `audit/D/run_all_D.js` (j1–j6, desktop + mobiil, hele + tume) | 157/190 (auditi D täiskäivitus) | **185/190** |

Parandatud faili 5 kukkunud D-kontrolli on testide endi probleemid, mitte rakenduse vead:
- J4.12: kontroll on kirjutatud tingimuseta `false`. Tagasivõtmine on olemas ja toastis on „Võta tagasi”.
- J2.A08: kontroll võrdleb UTC kuupäevaga. Kell 00:00–03:00 Eesti aja järgi läheb see vastuollu J4.36-ga, mis nõuab kohalikku kuupäeva (rakendus järgib J4.36-t).
- J5.04, J5.20, J5.21: test eeldab, et kehtestatud planeeringul (P4) ei ole ühtegi hilinenud tähtaega. P4-l on aga 4 kehtestamise järgset teavitust sisestamata ja nende tähtaeg on möödas. Koordinaatori nõude järgi jäävad need näha ja planeeringu vaade näitab sama.

Lõppkäivitusel olid konsoolis ainult võrguploki teated. Horisontaalset kerimist ei olnud 390 px ega 1280 px laiusel, heledas ega tumedas vaates.
