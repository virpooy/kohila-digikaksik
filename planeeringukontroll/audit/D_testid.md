# D – Kasutajateekondade testid: Kohila planeeringukontroll (v34)

**Testitud fail:** `/home/claude/pk/audit/v34.html` (538 759 baiti) · **Kuupäev:** 31.10.2026 · **Brauser:** Playwright Chromium, 1280×900 ja 390×844 (mobiil, puude), hele ja tume teema.
**Uuesti käivitamine:** `node /home/claude/pk/audit/D/run_all_D.js <html fail> [j1,j2,j2m,j3,j4,j5,j6]` – prindib iga kontrolli kohta PASS/FAIL, kirjutab `D/out/results.json`, ekraanipildid `D/shots/` ja allalaaditud failid `D/out/`. Täislogi: `D/out/full.log`.
**NB:** `D/run_all.js` asendati 31.10 kell 00:58 (testimise ajal, väljastpoolt seda tööd) lühema failiga, mis ei ühildu `lib.js`-iga: see loeb `r.ok`/`r.detail`, aga tulemustes on `pass`/`info`, ja jätab mobiili/tumeda variandid välja. Selle kokkuvõte näitaks kõiki kontrolle kukkununa. Seda faili ei taastatud. Algne käivitaja on `run_all_D.js` ja see on sama loogikaga. Kui ühe käsu nimi peab olema `run_all.js`, kopeeri `run_all_D.js` selle asemele.

**Viimane täiskäivitus:** 190 kontrolli, 157 PASS, 33 FAIL. 33 kukkunud kontrolli jagunevad allpool 26 leiuks (mitu kontrolli võib tõendada sama leidu).
**Leide raskuse järgi:** kriitiline 4 · suur 6 · keskmine 9 · väike 7 (kokku 26).

**Kuidas testiti**
- `window.claude` asendati mockiga (`D/mock.js`, laaditakse `addInitScript`-iga). Mock teeb järele sama API, mida rakendus kasutab: `use("db")` (`collection("dp").onSnapshot`, `doc("dp/<id>").set/delete`, andmed püsivad üle uuesti laadimise), `use("user")` (`id`, `can`, `profiles`), `use("downloads")` (`save({filename,data})` püüab bloobi kinni) ja `use("sample")` (tekst ja `.json`; valmisvastused sõltuvad päringu tüübist: andmete täitmine, ridade täitmine, kuupäevaettepanekud, hinnang, süvaanalüüs). Mockil on lülitid tõrgete jaoks: `fail.set`, `fail.snapshot`, `fail.download`, `sampleFail`, `putRemote` (kolleegi muudatus).
- **jsDelivr ja cdnjs on selles keskkonnas blokeeritud** (proksi vastab CONNECT-päringule 403). Seepärast serveeriti **täpselt samad versioonid** npm-ist kohalikult, sama URL-i kaudu (`D/vendor/cdn`): docx@9.5.1, mammoth@1.8.0, pdfjs-dist@3.11.174 ja jszip@3.10.1. Nii said PDF-i ja DOCX-i lugemine ning Wordi loomine päriselt töötada. CDN-i tõrget testiti eraldi blokeerimisega (J4.34, J4.34a).
- Testdokumendid (`D/make_docs.py` → `D/fixtures/`) on eestikeelsed: algatamise taotlus (PDF; sees isikukood, telefon ja e-post isikuandmete kontrolliks), KSH eelhinnang (DOCX), algatamise korraldus (TXT, päises „Kohila 12.02.2026 nr 1-3/45”), teavituskiri „Nimekirja alusel” (TXT), piiri skeem (PDF), teise planeeringu taotlus ja tekstita (skaneeritud) PDF.
- Wordi failid pakiti lahti ja nende `word/document.xml` tekst kontrolliti (`L.docxText`). PLANIS CSV-st kontrolliti baitide tasemel BOM, CRLF ja eraldaja.
- Töölaua ja registri teekond (J5) kasutab fikseeritud kella 31.10.2026 12:00 (Eesti aeg), 8 konstrueeritud planeeringut eri etappides ja 3 päris kirjet kaustast `dpdata/dp`.

---

## 1. Leiud

| Nr | Raskus | Teekond ja sammud (korratav) | Oodatud | Tegelik | Tõend | Arvatav põhjus (funktsioon/rida) |
|---|---|---|---|---|---|---|
| 1 | **kriitiline** (andmekadu) | J4 osa 5: planeering A on registris → Vastuvõtmine → Tähtajad → sisesta „Vastuvõtmise korraldus” 20.05.2026 → ~1 s jooksul Register → „Ava” planeering B → oota 4 s → lae leht uuesti → ava A | Kuupäev on registris ja pärast uuesti laadimist alles | Registrisse kuupäev ei jõudnud (`register: null`), pärast uuesti laadimist on see kadunud. Enne uuesti laadimist paistab kuupäev A-s alles olevat, sest see on jäänud mällu `REGDOCS`-i objekti (eksitav). | J4.18 (`D/out/full.log`) | `schedulePush` (r 3080) lükkab registrisse kirjutamise 2,5 s edasi. `openFromRegister` (r 3101) asendab `S`-i ega kirjuta ootel muudatust enne vahetust ära, `pushReg` loeb hiljem juba B andmeid. Lisaks `dates:r.dates` (r 3105) jagab objekti `REGDOCS`-iga, nii et muudatus kirjutatakse vahemälu kirjele, mitte andmebaasi. |
| 2 | **kriitiline** (andmekadu) | J4 osa 5: registris olev planeering A → Planeeringu andmed → Pindala „2,0 ha” → kohe „Alusta uut planeeringut” → oota 4 s | „2,0 ha” jõuab registrisse | Registris jääb „1,8 ha”. `startNew` ei küsi kinnitust (planeering on registris) ja muudatus kaob ka kohalikust salvestusest. | J4.19 | `startNew` (r 1416): `S=blank()` enne, kui ootel `regPushT` on täidetud. `pushReg` näeb tühja planeeringut ilma `regId`-ta. |
| 3 | **kriitiline** (andmekadu, mitme kasutaja korral) | J4 osa 5: A on avatud → kolleeg muudab registris kuupäeva (mock `putRemote`: arutelu 01.08.2026) → kuvatakse „Kolleeg Kaasik muutis… Laadi muudatused” → ametnik ei vajuta seda, vaid muudab eesmärgi teksti → oota 4 s | Kolleegi kuupäev säilib või küsitakse, kumb jääb | Registris on `arutelu: null`, sest kolleegi muudatus kirjutati vaikselt üle (viimane kirjutaja võidab terve dokumendiga) | J4.20 (bänner on olemas), J4.21 | `pushReg` (r 3081–3093) kirjutab `DB.doc().set(kogu keha)` ega kontrolli `remoteNewer()` tulemust ega ühenda välju |
| 4 | **kriitiline** (vale dokument) | J2: Kehtestamine → Tähtajad → „Kas avalikul väljapanekul esitati kirjalikke arvamusi?” = „kirjalikke arvamusi ei esitatud” → Eelnõu → laadi korraldus alla | Korraldus ei väida, et arvamusi kaaluti, ega lisa arvamuste lisa | Korralduse preambulis on lause „Avaliku väljapaneku ja arutelu käigus esitatud arvamustega on arvestatud või on nende arvestamata jätmist põhjendatud seletuskirjas”. Lisades on „Lisa 3 Avaliku väljapaneku ja arutelu käigus esitatud arvamused ja valla seisukohad”, kuigi arvamusi ega arutelu polnud. Preambuli lauset ei saa ridade kaudu muuta. | J2.desk-light.K07; `D/out/Kase-tn-7-maa_ksuse-kehtestamine-korraldus.docx` | `kehtActBlocks`: `K.push(...)` (r 2413) on tingimuseta. Lisade vaikeväärtus (r 2194) ei arvesta `S.meta.arvamused==="pole"` |
| 5 | **suur** | Ava rakendus, kui brauseris on juba planeering (tagasitulev kasutaja, aadress ilma `#`-ta), või lae leht uuesti töölaual (`#toolaud`) | Töölaud kuvab tänased tööd ja menetlused | Põhiala on täiesti tühi (`main` tekst 0 märki). Sisu tuleb alles pärast menüüst teise vaatesse ja tagasi minekut. Juhtub ka ilma `window.claude`-ta. | J5.00, J5.19; `D/shots/j5_desk_initial.png`, `D/shots/j5_returning_user.png` | `renderDesk` kutsutakse ainult `go()`-st. Laadimisel (r 4690–4691: `load(); … renderAll()`) on `tab="toolaud"`, kuid ei `renderAll`/`refreshAll` (r 4687) ega registri `onSnapshot` (r 3067) kutsu `renderDesk()` välja |
| 6 | **suur** | J4 osa 6: registris olev planeering → mock `fail.set="unavailable"` → muuda pindala → toast „Registrisse salvestamine ebaõnnestus, proovin hiljem uuesti” → taasta ühendus → oota 7 s | Olekurida ütleb, et salvestamata. Pärast ühenduse taastumist proovitakse uuesti. | Olekurida näitab endiselt „Menetlusregistris · salvestatud 31.10.2026 …”. Uuesti ei proovita: registris jääb vana väärtus, kuni kasutaja muudab midagi uut. | J4.28 (teade on), J4.29, J4.30 | `pushReg` catch (r 3089–3091) ei ajasta kordust. `renderRegStatus` (r 3121–3132) võtab „salvestatud” aja `REGDOCS`-ist ega tea ebaõnnestunud kirjutusest |
| 7 | **suur** | J5: register, P4 on kehtestatud (kehtestamine 01.06.2026), osa vahekuupäevi on sisestamata → Töölaud → „Näita kõiki” | Lõpetatud menetlus ei tekita ülesandeid ega ületatud tähtaegu | Töölaual on P4 kohta 3 punast kaarti („-417 päeva Väljapanekust teatatakse enne selle algust – Koosta teade”, „-366 Arvamuste esitajatele seisukoht…”, „-351 Avalik arutelu…”). Registri tähtajaloend ja „Tähtaeg ületatud 17” loevad need kaasa, kuigi P4 tuli on „Kehtestatud”. | J5.20, J5.21; `D/shots/j6_1280-hele_toolaud.png` | `pendingDeadlines` (r 2907) / `pastStage`–`reachedStage` (r 2902): kehtestamine ei lõpeta tähtaegade arvestust (`reachedStage` lõpeb vastuvõtmisega). `deskItems` (r 4368) ja `deadlineList` võtavad need otse. |
| 8 | **suur** (vale sisuga kiri) | J2: Algatamine (taotlus, eelhinnang ja korraldus on lisatud) → „Koosta puuduste kiri” → Word | Kiri nõuab huvitatud isikult/koostajalt ainult tema esitatavaid dokumente | Kirjas on „Esitada: Algatamise korralduse / otsuse eelnõu” (valla enda akt, mille rakendus ise koostab) ja „Esitada: Asjaomaste asutuste seisukohad eelhinnangule” (KeHJS § 33 lg 6 järgi küsib need otsustaja). Saaja on vaikimisi taotleja. | J2.desk-light.A10–A11; `D/out/Kase-tn-7-maa_ksuse-puuduste-kiri-algatamine.docx` | `defectList` (r 3295) võtab kõik puuduvad `DT` kirjed, sh `eelnou_alg` (`act:true`) ja `eelh_seisukohad`, ning ei erista, kes dokumendi esitab |
| 9 | **suur** | J4 osa 4: Dokumendid → mõne faili juures „Eemalda” | Kinnitus või „Võta tagasi” (faili tekst on ainult selles brauseris) | Fail eemaldatakse kohe, kuvatakse ainult toast „Dokument eemaldatud”. Tagasivõtmist pole ja tekst ei ole registris. Kinnitust ei ole ka nupul „Eemalda N kordust”. | J4.12 | `#docGroups` click (r 1850): `S.docs.filter(...)` ilma kinnituse ja tagasivõtmiseta (võrdle „Puhasta kõik read”, millel on tagasivõtmine) |
| 10 | **suur** (ligipääsetavus) | J6 klaviatuur: Tab-iga läbi lehe | Dokumentide lisamine („+ Lisa dokument”, lohistamisalad) on klaviatuuriga kättesaadav | `label.drop#startDrop`, `#stDrop` ja `label[for=planFileIn]` on `tabIndex=-1`, failiväljad on `hidden`. Ilma hiireta ei saa ühtegi dokumenti lisada, kuigi see on põhiteekonna esimene samm. | J6.kb.02 (märkus „üleslaadimise elemendid”) | HTML r 567, 591, 672: `<label class="drop" for=…>` + `<input type=file hidden>`. Fookustatavat nuppu ega `tabindex`/`role=button`-it ei ole |
| 11 | keskmine | J3: Algatamine → Eelnõu (eelvaade „KORRALDUS”) → Planeeringu andmed → „Menetlusakti vorm” = Vallavolikogu otsus | Eelvaade, nupp „Laadi alla … (Word)” ja pealkiri muutuvad kohe | Päis näitab „volikogu otsus”, aga eelvaade on endiselt „KOHILA VALLAVALITSUS / KORRALDUS” ja nupp „Laadi alla korraldus (Word)”. Sama juhtub KSH = „Algatatud” korral: pealkiri jääb „…algatamata jätmine”. Õigeks läheb alles pärast etapivahetust. (Allalaaditud fail on õige, sest see koostatakse uuesti.) | J3.01, J3.04 (J3.02 näitab, et pärast etapivahetust on õige) | `META.forEach(... "input")` (r 1379) kutsub ainult `renderHead/renderOverview/renderTabs`, mitte `renderStage`/`renderAct` |
| 12 | keskmine | J3: tava-DP → akt = volikogu otsus (nt § 130 lg 2 p 3) → vaheta liik tava→tava_ksh→…→tava | Kasutaja valitud akti vorm säilib või muutusest teatatakse | Iga liigivahetus kirjutab akti vormi üle (yp → otsus, tava/dpm → korraldus). Toast ütleb ainult „Menetluse liik: …”. | J3.05 | `setLiik` (r 3872–3876): `S.meta.akt = L.fam==="yp" ? "otsus" : "korraldus"` tingimuseta |
| 13 | keskmine (vale PLANIS-e sisend) | J3: liik „DP-d muutev DP” → sisesta „Avatud menetluse teade (HMS § 47)” 01.03.2026 → vaheta liik tagasi „tava” → PLANIS CSV ja Menetluskäik | Tava-DP andmetes ei ole teise menetlusliigi kuupäevi | CSV-s on rida `"Avatud menetluse teade avaldatud (HMS § 47)";"2026-03-01"`, sama sündmus on ka menetluskäigu ajajoonel | J3.06, J3.07 | `planisRows` (r 4281) ja `timeline` (r 2932) käivad üle kõigi `DATE_FIELDS` võtmete ega filtreeri aktiivse liigi `STAGES[].dates` järgi |
| 14 | keskmine | J5: P7 – algatamine 05.01.2026, AT-teade 01.03.2026 (14 p asemel 55 p, plaani Tähtajad-sammul „Rikkumine”), muud sammud tehtud | Registri/töölaua tuli ja kokkuvõte näitavad rikkumist või vähemalt hoiatust | Registris on tuli „Korras” ilma põhjuseta. Plaani vaade näitab r1a rikkumist. | J5.07 | `lampOf` (r 1639) arvestab ainult avatud tähtaegu (`pendingDeadlines`), mitte `ruleResults`-i juba toimunud rikkumisi |
| 15 | keskmine | J5: avatud on tava-DP → Register; ava DP-muutmine (P6) → Register; võrdle päris kirjet „Konksu maaüksuse detailplaneering” | Iga planeeringu tuli ja järgmine tähtaeg ei sõltu sellest, mis planeering on avatud | Konksu: tava/ÜP avatuna „Probleem 4 tähtaeg ületatud / 24.06.2026 Väljapanekust teatatakse…”, DPM avatuna „Probleem 6 tähtaeg ületatud / 06.11.2024 Arutelust teatatakse…” | J5.11 | `applyProc` (r 3733) muudab globaalset `STAGES`-i avatud planeeringu liigi järgi. `keyStage` (r 2923) → `dateConflict` → `ruleDue` kasutab seda ka teiste planeeringute arvutamisel |
| 16 | keskmine (vale kuupäev) | J4 osa 7: kell 15.11.2026 00:30 Eesti aja järgi → Teated → „Märgi tehtuks täna” | Salvestub 15.11.2026 | Salvestub **14.11.2026**. Viga on ka 31.10.2026 testiaja öistes logides (A08: „Tehtud 30.10.2026”, kohalik kuupäev 31.10). Kehtib kõigi „täna”-arvutuste kohta (tähtajad, puuduste kirja tähtaeg +30 p) iga päev 00:00–02:00/03:00. | J4.36; J2.desk-light.A08 info | `todayIso = () => new Date().toISOString().slice(0,10)` (r 1254) on UTC-kuupäev, mitte kohalik |
| 17 | keskmine | J4 osa 4: lisa algatamise korraldus (kontrollrajale tekib ettepanek 12.02.2026 koos tsitaadiga) → Dokumendid → „Eemalda” see fail → Algatamine → kontrollrada | Kustutatud dokumendi ettepanek kaob | Ettepanek „Kohila 12.02.2026 nr 1-3/45 — Algatamise korraldus Kase tn 7.txt” ja nupp „Kinnita” jäävad alles. Kuupäeva saab kinnitada dokumendist, mida enam pole. | J4.13 | Eemaldamine (r 1850) ei puhasta `S.evp`-st kirjeid, mille `doc` on see fail (`addEvp`, r 4483) |
| 18 | keskmine | J6: 390 px (hele ja tume) → Algatamine → samm „Teated” | Leht mahub laiusesse | Lehel tekib horisontaalne kerimine (+69 px). Dokumendi valik ja „Laadi alla Word” lõigatakse paremalt ära. | J6.390-hele.01, J6.390-tume.01; `D/shots/j6_390_teated_overflow.png` | `#ntSel` laius tuleb pikimast valikust (58 märki). `.act-grid`/`.card` veerg ei kahane (`min-width:auto` gridis) |
| 19 | keskmine | J5: register, 11 planeeringut, tabelivaade → esimese rea „Eemalda” | Kinnitus ilmub klõpsu kohale | Kinnitusrida „Eemaldada …? Jah, eemalda” ilmub tabeli alla (top 2128 px, ekraani kõrgus 900 px). Kasutaja ei näe, et midagi juhtus. | J5.18; `D/shots/j5_register_delete_confirm.png` | `renderRegister` (r 3164): `#regDelConfirm` on üks rida kogu registri lõpus |
| 20 | väike | J2: PLANIS-e andmed (CSV) | Kõik kuupäevad on ühes vormingus ja planeeringu nimi on täielik | Sündmuste kuupäevad on ISO-vormingus (`2026-02-12`), aktide read PP.KK.AAAA (`12.02.2026`). Nimi on „Kase tn 7 maaüksuse” (sõna „detailplaneering” on eemaldatud), „Koostaja” on tühi, kuigi algatamise real oli koostaja täidetud. BOM, CRLF ja `;` on korras. | J2.desk-light.A27–A29; `D/out/Kase-tn-7-maaüksuse-planis-andmed.csv` | `planisRows` (r 4281–4285): `S.dates[k]` vs `v.kp`. `planName()` (r 2058) eemaldab lõpust „detailplaneering”. Koostaja võetakse ainult `vv`/`keht` ridadelt. |
| 21 | väike | J2: Vastuvõtmine → sisesta väljapaneku teade 25.05.2026 → kontrollrada | „Avalik väljapanek algab” on järgmine sisestatav samm | Rida on oleku „ootab” (`pp-row wait`) all ilma põhjuseta peidus. Kuupäeva saab sisestada alles pärast „+ N järgnevat sammu” avamist. | J2.desk-light.V00 | `pipeSteps` (r 4563): kui tähtaega ei arvutata (`before`/`order` reeglid) ja eeldused on täidetud, saab rida ikkagi `st="wait"` |
| 22 | väike | J4 osa 3: Algatamine → kuupäev `20266-02-12` (5-kohaline aasta, kuupäevaväli lubab seda) | Väljaspool mõistlikku vahemikku olev kuupäev lükatakse tagasi või märgitakse vigaseks | Salvestub. Tähtajareegel näitab „15.01.2026 → 12.02.20266: 6662051 päeva … Rikkumine” ja pakub „Tähtaega pikendati (HMS § 41)” | J4.08 | Kuupäevaväljadel pole `min`/`max` ega aasta kontrolli (`#stDates`, `[data-pk]`, `[data-ck]`) |
| 23 | väike | J4: jsDelivr on blokeeritud → Teated → „Laadi alla Word” | Teade ütleb, et Wordi teeki ei õnnestunud laadida | „Faili ei salvestatud” (akti puhul öeldakse õigesti „Wordi teeki ei õnnestunud laadida”) | J4.34 (J4.34a: PDF-i olek on õige) | `#ntDocx` catch (r 3534) ja `downloadDecision`/`exportPlanis` ei erista teegi tõrget |
| 24 | väike | J5: tühi algus → Register → Töölaud | „Minu menetlused” ei näita tühja mustandit menetlusena | Loendis on „Uus detailplaneering · —” rohelise tulega | J5.02 | `deskRows` (r 4360): kohalik kirje lisatakse alati (`!S.example \|\| !reg.length`), ka tühjana |
| 25 | väike | J6: 390 px → Tähtajad / Eelnõu / Register | Puutealad ≥ 24×24 px (WCAG 2.2 AA) | Sätteviite kiibid `button.ref` 16 px kõrged, `.linkbtn` 20 px, „Kontrollküsimused” 19 px, checkbox „Näita kehtestatuid” 13×13 px | J6.390-*.03 | CSS `.ref`, `.linkbtn`, `details summary`, `#regDone` |
| 26 | väike | J6: Eelnõu → „Laadi alla …” (Enter) → kontrollaken → Tab | Fookus jääb aknasse (`aria-modal="true"`) | Tab viib fookuse akna taha. Esc sulgeb akna korrektselt. | J6.kb.05 (J6.kb.04 läbitud) | `openReview` (r 4215): fookuse lõksu ei ole |

**Märkus „Arvatav põhjus” veeru kohta:** reanumbrid viitavad failile `v34.html`.

---

## 2. Läbitud teekonnad

**J1 – uus planeering (1280 hele ja 390 tume, mõlemas 20/20 läbitud)**
- Tühi algus avab Algatamise lehe koos alustamise kaardiga. Nimi sünkroonub kolme nimeväljaga.
- PDF (pdf.js), DOCX (mammoth) ja TXT loeti. Liik tuvastati õigesti: taotlus, KSH eelhinnang, allkirjastatud algatamise korraldus → `alg_akt`, kiri „Nimekirja alusel” → `teav_alg`, skeem.
- Andmed täitusid (katastritunnus, asukoht, pindala, taotleja, taotluse kuupäev). Kasutaja kirjutatud nime üle ei kirjutatud.
- Planeering salvestus automaatselt registrisse. Failide tekst registrisse ei läinud.
- Isikukood, eraisiku telefon ja e-post asendati enne Claude'ile saatmist (ükski 4 päringust neid ei sisaldanud).
- Akti päisest ja teavituskirjast pakuti kuupäevad tsitaadiga. Claude'i leidmata tsitaadiga ettepanek märgiti nõrgaks.
- Pärast uuesti laadimist on andmed alles. „Alusta uut” → Register → „Ava” taastab andmed ja failide teksti (IndexedDB/localStorage) ning viib õigesse etappi.
- Konsoolis vigu ei olnud. `alert`/`confirm`/`prompt` ei kasutata.

**J2 – etapid ja sammud (1280 hele: 41/45 läbitud; 390 tume: 5/5 läbitud)**
- Kõik kuupäeva sisestusteed töötavad: dokumendi ettepaneku „Kinnita”, kontrolliraja väli, „Kõik menetluse kuupäevad”, kriitilise punkti rida (kuupäev + tõend) ja „Märgi tehtuks täna” (kuupäevaga on probleem, vt leid 16).
- Hinnanguküsimused (jah/ei + põhjendus) ja „Võrdle Claude'i arvamusega” töötavad, tsitaati kontrollitakse dokumendist.
- „Täida dokumentidest Claude'iga”: 8 rida, 6 tsitaati leiti. Leidmata tsitaat on „◇ kontrolli”.
- Kinnitusvoog töötab. Allalaadimine on lukus, kuni kaalutlused ja kinnitused on puudu, ning avaneb pärast neid. Kriitilise vea (r10, r3) korral nõutakse põhjendust; 14 märki ei piisa.
- Word: algatamise korraldus, seletuskiri, otsustuskirje, AT-teade, puuduste kiri, vastuvõtmise korraldus ja kehtestamise korraldus laaditi alla ja nende `document.xml` sisu kontrolliti. Kontrollitud: pealkirjad, taotleja, katastritunnus, delegeerimisviide, KSH algatamata jätmine, kohus ja 30 päeva, väljapaneku algus ning koostaja töö nr. Topelt-„detailplaneeringu” ei esinenud. Kollased kohatäited on Wordis esile tõstetud (14).
- Logisse jõuavad kinnitused ja allalaadimine. Registrisse jõuab lõppseis koos kinnitustega.
- Süvaanalüüs: tsitaadita „vastab” alandatakse „ebaselge”-ks ja registriväline viide märgitakse. Küsimuse vastuses on registriviide kiip ja tundmatu viide „kinnitamata”.
- Tähtajad: väljapanek 13 p → r3 kriitiline, 14 p → korras. Väljapanek enne vastuvõtmist → r10. „Arvamusi ei esitatud” → arutelu reegel ei kohaldu. Etapiribal on 3 × ✓.
- PLANIS CSV: UTF-8 BOM, CRLF, eraldaja `;`, päis `Väli;Väärtus`, väärtused jutumärkides. Nimi, katastritunnus, menetlusliik ja kuupäevad on olemas.
- Mobiil 390 tume: eelnõu sammul horisontaalset kerimist pole, kontrollaken mahub ekraanile ja allalaadimise nupp on nähtav.

**J3 – liigid (14/19 läbitud)**
- tava_ksh, ypm, ypm_ksh, dpm, yp_puudub ja tagasi tava: kõik 15 etapi/sammu vaadet renderduvad ilma vigadeta.
- DPM-i teadete loetelus pole tava-DP teateid. DPM-i pealkiri on „…muutmise algatamine”.
- ypm: volikogu otsus, „lähteseisukohtade kohta ettepanekute küsimine”, ypmuutmine=jah. Tagasi tava liigile: ypmuutmine=ei, ksh=ei.
- KSH=jah pakub liigi parandust.

**J4 – töökindlus (28/38 läbitud)**
- Tühjad olekud: 17 vaadet ilma undefined/NaN-ita, nuppudel on selged teated, nimeta planeeringut registrisse ei lasta.
- Nimes olev XSS-katse (`<img onerror>`) ei käivitu. 326-märgine nimi ei tekita kerimist. Erimärgiga nimega Wordi failinimi on puhastatud ja nimi on dokumendis õigesti.
- Vastuolulised kuupäevad (väljapaneku lõpp või kehtestamine enne vastuvõtmist) märgitakse. Kordus tuvastatakse ja eemaldatakse. Skaneeritud PDF märgitakse.
- Kahe planeeringu andmed ei segune. Kolleegi muudatuse bänner kuvatakse.
- Registris ümbernimetamine töötab (Enter ja „Salvesta”), tühi nimi keelatakse ja avatud planeeringu nimi muutub kaasa. Eemaldamine küsib lehesisest kinnitust (mitte `window.confirm`). Pärast eemaldamist jääb kohalik koopia alles ja „Alusta uut” küsib kinnitust.
- Tõrked: kirjutusõiguse puudumine, Claude'i `rate_limited`, allalaadimise tõrge, registriühenduse tõrge ja PDF-teegi tõrge annavad eestikeelse teate.
- Uuesti laadimisel jääb sama etapp.

**J5 – töölaud ja register (14/22 läbitud)**
- Tuled on töölaual ja registris samad ning vastavad ootusele (üle tähtaja, 14 p sees, kehtestatud, ülesanne üle tähtaja).
- Tahvli veerud vastavad etapile. „Menetluses” = kirjed − kehtestatud.
- P3, P5 ja P6 järgmine tähtaeg on registris ja kontrollrajal sama, sh laupäeva nihe 31.10 → 02.11.
- Külgmenüü märk klapib. „Järgmised 14 päeva” jääb vahemikku. Päris kirjed avanevad vigadeta. Otsing filtreerib ja fookus jääb väljale.

**J6 – paigutus ja klaviatuur (15/21 läbitud)**
- 1280 hele ja tume: horisontaalset kerimist pole üheski 13 vaates (sh tahvel).
- Teksti kontrast ≥ 4.5:1 töölaual ja algatamise sammudel kõigis 4 kombinatsioonis.
- Mobiilimenüü avaneb ja sulgub.
- Etapi vahelehed ja nimeväli on klaviatuuriga kättesaadavad. Fookus on nähtav (J6.kb.03: outline, varjuga või äärise värviga). Kontrollaken avaneb Enteriga ja sulgub Esc-iga.

---

## 3. Ei saanud testida

| Mis | Põhjus |
|---|---|
| Päris claude.ai runtime: andmebaasi õigused, päris Claude'i vastuste kvaliteet, päris kasutajaprofiilid | Kohalikult runtime puudub. Kasutati mocki, mis teeb järele rakenduse kasutatava API. Claude'i vastused on valmisvastused, seega mõõdeti rakenduse käsitlust (tsitaadi kontroll, alandamine, isikuandmete asendamine), mitte mudeli õigsust. |
| Päris jsDelivr/cdnjs | Proksi blokeerib (403). Testiti samade versioonidega kohalikult ja tõrget blokeerimisega. Kui päris CDN on claude.ai-s kättesaamatu, kehtivad leid 23 ja J4.34a. |
| Wordi failide visuaalne vormindus (nummerdus, taanded, jalus) Microsoft Wordis | Kontrolliti ainult `document.xml` teksti ja esiletõstmiste arvu. |
| ASiC-E/BDOC digikonteinerid ja allkirjastaja nime lugemine | Allkirjastatud testkonteinerit ei olnud. Ilma kehtiva sertifikaadita oleks test olnud kunstlik. |
| IndexedDB varuvariant, kui localStorage on täis (~5 MB) | Ei jõutud luua nii suurt sisendit. Seotud kood: `saveNow` r 1230. |
| Päris lohistamine operatsioonisüsteemist | Kasutati `setInputFiles`. Lohistamise sündmuste kood on sama `addFiles`. |
| Ekraanilugeja, Safari ja Firefox | Ainult Chromium. ARIA-t kontrolliti ainult osaliselt (dialoog, vahelehed). |
| „Kontrolli rakenduse täpsust: võrdle allkirjastatud aktiga” | Ei kuulunud teekondadesse. Mock vastab `{erinevused:[]}`. |
| Menetluskäigu ülesannete loomine kasutajaliideses | Ülesandeid testiti ainult registrikirjete kaudu (P8). Ülesande vormi ei läbitud. |
| Samaaegne töö kahest brauserist | Kolleegi muudatust simuleeriti mockis (`putRemote`). Kahte päris seanssi ei käivitatud. |

---

## 4. Failid
- Testid: `D/run_all_D.js` (käivitaja; `D/run_all.js` vt NB ülal), `D/lib.js`, `D/mock.js`, `D/j1_new_plan.js`, `D/j2_stages.js`, `D/j3_liik.js`, `D/j4_robust.js`, `D/j5_desk.js`, `D/j6_layout.js`.
- Testandmed: `D/make_docs.py` → `D/fixtures/`. CDN-asendus: `D/vendor/cdn/`.
- Väljund: `D/out/full.log`, `D/out/results.json`, allalaaditud `.docx`/`.csv` failid `D/out/`, ekraanipildid `D/shots/`.
