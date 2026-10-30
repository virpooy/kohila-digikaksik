# Kohila planeeringukontroll – rakenduse kaart

Allikas: https://claude.ai/artifact/VBDGamJQ6Ggmw4bfRfWcbK (versioon 1792074069-8bf7, üks HTML-leht 523 629 baiti, ~4577 rida, lisafaile pole). Loetud ainult lugemiseks 30.10.2026.

## 1. Ülevaade

- **Eesmärk:** Kohila valla planeeringute juhtivspetsialisti abivahend detailplaneeringu (DP) menetluse õiguslikuks kontrolliks kolmes etapis: **algatamine (alg) → vastuvõtmine (vv) → kehtestamine (keht)** ning akti- ja kirjaeelnõude koostamiseks Kohila vormis. Rakendus "ei tee otsuseid"; kaalutlused ja hinnanguküsimused kirjutab ametnik.
- **Versioon:** `CHANGELOG[0].v = "2026-10-15"`; sätteregister `REG_CHECKED = "28.09.2026"` (registri vanuse kontroll: järgmine kontroll +180 p). localStorage võti `kohila-dp-kontroll-v3`.
- **Runtime:** võimekused `db` (kogu `dp` = menetlusregister, üks dokument planeeringu kohta), `downloads`, `sample` (Claude loeb dokumente), `user`. Dokumenditekstid jäävad brauserisse (IndexedDB `kohila-dp-texts`). Word: `docx@9.5.1` (jsDelivr).
- **Töövoog:** (1) töölaud: tänased tööd, minu menetlused, 14 p tähtajad; menetlusregister Pipedrive-laadse tahvlina. (2) Uus planeering: nimi + dokumentide üleslaadimine (PDF, DOCX, TXT, MD, CSV, ASiC/BDOC); liik tuvastatakse failinimest/sisust ja paigutatakse etappi. (3) Planeeringu andmed (meta) täituvad dokumentidest, ametnik kontrollib. (4) Etapi sammud: Dokumendid · Tähtajad · Eelnõu · Teated · Analüüs. (5) "Täida dokumentidest Claude'iga" → read märgisega ✓ dokumendist / ≈ automaatne / ◇ kontrolli / ✎ muudetud; tsitaati kontrollitakse sõnasõnaliselt. (6) Ametniku hinnanguküsimused (JUDGE_QS) + kaalutlused. (7) Kinnitus → Wordi allalaadimine (+ otsustuskirje).
- **Menetlusliigid (`LIIGID`, MKM skeemid):** `tava` (ÜP-ga kooskõlas, KSH-ta; PlanS §-d 128–139), `tava_ksh` (ÜP-menetlus, § 124 lg 7), `ypm` (ÜP-d muutev, § 142 lg 2), `ypm_ksh`, `dpm` (DP-d muutev DP, §-d 139¹–139⁵, HMS §-d 47–50; algatamine 60 p, kehtestamine 1 a), `yp_puudub` (§ 124 lg 9¹). Perekond `fam`: `dp`, `yp`, `dpm` – vahetab etapid, reeglid, dokumendid, teated ja mallid.
- **Väljundid:** algatamise / vastuvõtmise / kehtestamise korraldus (VV) või otsus (volikogu) + seletuskiri (.docx); teated ja kirjad (.docx); puuduste kiri (.docx); otsustuskirje (.docx); PLANIS-andmete CSV (`;`, UTF-8 BOM); rakenduse kirjeldus (.html).

## 2. Sisendväljad

### 2.1 Planeeringu andmed (`S.meta`, `S.name`)
| Väli | Tüüp | Lubatud väärtused | Kohustuslik? |
|---|---|---|---|
| name (Planeeringu nimi) | tekst | vaba; vaikimisi "Uus detailplaneering" | jah (registrisse salvestamiseks) |
| taotleja (huvitatud isik) | tekst | vaba | ei (vajalik eelnõus) |
| dates.taotlus (taotluse kuupäev) | kuupäev | ISO | ei (vajalik r0, r12, k6) |
| asukoht (küla / alev / tänav) | tekst | vaba; sõna "alev/alevik" muudab vajaduse automaatteksti (§ 125 lg 1) | ei |
| kataster | tekst | kuju `\d{5}:\d{3}:\d{4}`, mitu lubatud | ei |
| pindala | tekst | vaba, nt "1,2 ha" (ei parsita arvuks) | ei |
| eesmark | tekst | vaba | ei |
| juhtotstarve (kehtiv ÜP 2024) | tekst | vaba, nt "väikeelamute maa" (pole loendit) | ei |
| juhtotstarveUus (2006 ÜP, võrdluseks) | tekst | vaba | ei (täisvaade) |
| yp | valik | `2024` (otsus nr 40, 28.11.2024) / `2006` (otsus nr 86, kehtetu) | vaikimisi 2024 |
| ypmuutmine | valik | `ei` / `jah` / `?` | vaikimisi ei |
| eelh (KSH eelhinnang) | valik | `antud` / `pole` / `kohustuslik` | vaikimisi antud |
| ksh | valik | `ei` / `jah` / `?` | vaikimisi ei |
| akt (menetlusakti vorm) | valik | `korraldus` (VV) / `otsus` (volikogu) | vaikimisi korraldus |
| liik | valik | `tava`, `tava_ksh`, `ypm`, `ypm_ksh`, `dpm`, `yp_puudub` | tuletatakse ypmuutmine+ksh järgi |
| arvamused / arvamusedEv | valik | `?`, `pole`, `koik`, `osa` | keht / yp-vv |
| istung (dpm) | valik | `jah`, `loobuti` | dpm-vv |
| sundv | valik | `ei`, `jah` | alg |
| voorud | arv | ≥1; 2 = korduv väljapanek (§ 137 lg 3) | ei |

### 2.2 Kuupäevad (`S.dates`, `DATE_FIELDS`)
alg: `taotlus, kshEelhinnang, algatamine, algatamiseAT, algatamiseTeade, algatamiseIsikud, kshTeade`; vv: `kooskolastusViimane, kooskSaadetud, arvamusSaadud, arvamusVastus, vastuvotmine, valjapanekTeade, valjapanekAlgus`; keht: `valjapanekLopp, arvamusteVastus, aruteluTeade, arutelu, aruteluTulemus, kehtestamine, kehtestamiseAT, kehtestamiseTeade, kehtestamiseKataster, kehtestamiseAndmekogu, kehtestamiseIsikud` + 2. voor `*2`; yp-lisad `y_lsKusitud, y_lsTahtaeg, y_lsAvalik, y_evAlgus, y_evLopp, y_evVastus, y_evArutelu, y_evTulemus, y_heakskiitEsitatud, y_heakskiit, y_ypMuudetud`; dpm `d_teade, d_valjAlgus, d_ettepTahtaeg, d_istungKutse, d_istung`. Kriitilistele kuupäevadele lisatakse tõend (`CRIT_EV`: AT teate nr, ajalehe nr, kirja reg nr, protokolli nr).

### 2.3 Eelnõu read (`FIELDS`, `LSF`) – kõik tekst/tekstiala, ükski pole formaalselt kohustuslik (puudu = kollane ⟦kohatäide⟧)
- Ühised: `nr`, `kp`, `nimi`.
- alg: `taotleja, taotlusKp, koostaja, ala, eesmark, vajadus, yp, eelhKoostaja, asutused, ksh, uuringud, kulud, tutvumine, suutlikkus, alus` + lähteseisukohad `ls_ruum, ls_liikuvus, ls_keskkond, ls_asjaoigus, ls_planeering, ls_ehitus, ls_kooskolastus, ls_koosseis, ls_vormistus, ls_menetlus, ls_elluviimine, ls_kaasamine, ls_teavitada`.
- vv: `regNr, koostaja, tooNr, asukohtIn, pindala, eesmarkKeht, kaalutlused, yp, ksh, valjapanekAeg, valjapanekKoht, arvamusteViis, taitja, lisad, alus` + seletuskiri `algAkt, ala, lahendus, kooskolastused, kaasamine`.
- keht: `regNr, koostaja, tooNr, asukohtIn, pindala, eesmarkKeht, ehitusoigus, kaalutlused, yp, ksh, heakskiit, hlKp, hlNr, hlRajatised, avalikKasutus, elluviimine, kehtetuks, osaline, osalineHinnang, seire, taitja, lisad, teavitamine, alus` + seletuskiri `algAkt, vvAkt, ala, lahendus, valjapanekAeg, arvamused, arvestamata, arutelu`.
- Asutuse andmed (`ORG`, eraldi localStorage `kohila-dp-org-v1`): vallavanem, vallasekretär, volikogu esimees, koostaja nimi/amet (vaikimisi "planeeringute juhtivspetsialist")/e-post/telefon, kohus (vaikimisi "Tallinna Halduskohtule").

## 3. Kontrollireeglid

Staatused: `ok` Vastab · `bad` Puudus (viga) · `risk` Vajab täpsustamist (hoiatus) · `na` Ei kohaldu/andmed puudu (info) · `unk` Ebaselge. **Blokeering** (allalaadimine nõuab põhjendust) ainult kui `bad` ja reegel on `minIncl`, `before` või `r10`/`y10`. `max`-tähtaeg nihkub puhkepäevalt/riigipühalt tööpäevale (HMS § 31 lg 1, TsÜS § 136 lg 4 – "kinnitamata"); HMS § 41 pikendus märgitav. Reegel kehtib algatamise (või taotluse) kuupäeva järgi.

### 3.1 Tähtajad – tavaline DP (`RULES` + `DP_EXTRA_RULES`)
| Reegel | Etapp | Õiguslik alus | Tingimus | Tulemus |
|---|---|---|---|---|
| r0 | alg | PlanS § 128 lg 4 | taotlus→algatamine ≤30 p; 31–90 p | ok / risk; >90 või <0 viga |
| r0b | alg | KeHJS § 33 lg 6 | kshEelhinnang enne algatamist (kui eelh) | viga |
| r1a | alg | PlanS § 128 lg 7 | algatamine→AT/veeb ≤14 p | viga |
| r1b | alg | PlanS § 128 lg 6 | →ajaleht ≤30 p | viga |
| r1c | alg | PlanS § 128 lg 8 | →§ 127 lg 1–2 isikud ≤30 p | viga |
| r1d | alg | KeHJS § 35 lg 6 | →KSH otsuse teade ≤14 p (kui eelh) | viga |
| r8 | vv | PlanS § 134 | viimane kooskõlastus ≤ vastuvõtmine | viga |
| r9a | vv | PlanS § 133 lg 4 | arvamus→seisukoht ≤30 p | viga |
| r9b | vv | PlanS § 133 lg 2, § 134 | kooskõlastusele saatmisest ≥30 p enne vastuvõtmist | hoiatus |
| r10 | vv | PlanS § 135 lg 1 | väljapanek pärast vastuvõtmist | viga, blokeerib |
| r2 | vv | PlanS § 135 lg 6–7 | väljapaneku teade ≥1 p enne algust | viga, blokeerib |
| r3 | keht | PlanS § 135 lg 5; § 124 lg 7; § 87 lg 4 | väljapanek ≥14 kalendripäeva (algus+lõpp kaasa), **30** kui ypmuutmine=jah või ksh=jah | viga, blokeerib |
| r4 | keht | PlanS § 135 lg 11 | väljapaneku lõpp→seisukohad ≤30 p | viga |
| r5 | keht | PlanS § 136 lg 1–2 | lõpp→arutelu ≤45 p | viga |
| r5b | keht | PlanS § 136 lg 3 | arutelu teade ≥14 p enne | viga |
| r6 | keht | PlanS § 137 lg 2 | arutelu→tulemused ajalehes ≤30 p | viga |
| r3o, r3b, r4b, r5c, r5d, r6b | keht | PlanS § 137 lg 3 (+ § 135, 136) | 2. voor (voorud≥2): sama loogika | viga |
| r12 | keht | PlanS § 139 lg 2 | taotlus→kehtestamine ≤3 aastat | viga |
| r7a / r7b | keht | PlanS § 139 lg 3 | kehtestamine→AT/veeb ≤14 p / ajaleht ≤30 p | viga |
| r7c | keht | PlanS § 139 lg 4 | →maakatastri pidaja ≤14 p | viga |
| r7d | keht | PlanS § 139 lg 4¹ | →planeeringute andmekogu ≤14 p | viga |
| r7e | keht | PlanS § 139 lg 6 | →isikud ≤14 p | viga |

### 3.2 ÜP-menetlus (`YP_RULES`, fam=yp) ja DP muutmine (`DPM_RULES`)
| Reegel | Etapp | Alus | Tingimus | Tulemus |
|---|---|---|---|---|
| y0 | alg | PlanS § 142 lg 2, § 77 | taotlus→algatamine ≤30 p | viga |
| y1a–y1d | alg | PlanS § 77; KeHJS § 35 lg 6 | teated 14/30/30/14 p | viga |
| y2 / y3 | alg | PlanS § 81 (§ 127 lg 5) | LS ettepanekute tähtaeg ≥30 p; avalikustamine pärast | viga |
| y4 | vv | PlanS § 85 | kooskõlastusest ≥30 p | hoiatus |
| y5 / y6 / y7 / y8 | vv | PlanS § 82, 83, 84 | eelnõu väljapanek ≥30 p; vastus ≤30; arutelu ≤45; tulemused ≤30 | viga |
| y9 | vv | PlanS § 86 | vastuvõtmine pärast eelnõu avalikustamist | viga |
| y10–y15 | keht | PlanS § 87, 87 lg 4, 88, 89 | väljapanek pärast vv; ≥30 p; teade enne; 30/45/30 p | viga (y10 blokeerib) |
| y16 / y17 | keht | PlanS § 90, 91 | Maa- ja Ruumiamet ≤60 p; kehtestamine pärast heakskiitu | viga |
| y18–y22 | keht | PlanS § 91 | kehtestamise teated 14/30/14/14/14 p | viga |
| y23 | keht | PlanS § 142 lg 8 | ÜP muudatus ≤30 p (liik ypm*) | viga |
| d0 | alg | PlanS § 139² lg 1 | taotlus→algatamine ≤60 p | viga |
| d1 / d1b | vv | HMS § 49 lg 2, § 47 | ettepanekute tähtaeg ≥14 p; teade enne väljapanekut | viga |
| d2 | vv | HMS § 50 lg 4 | istungi kutse ≥10 p enne | viga |
| d3 / d4 | vv | PlanS § 139⁴ lg 2, lg 4 | ≥30 p kooskõlastusest; seisukoht ≤30 p | hoiatus / viga |
| d5–d8 | keht | PlanS § 139⁵ lg 1–4 | kehtestamine ≤365 p taotlusest; teated 30/14/14 p | viga |

### 3.3 Arvutatavad kontrollid (`computedCheck`)
| Reegel | Etapp | Alus | Tingimus | Tulemus |
|---|---|---|---|---|
| v5 valjapanekKestus | vv | PlanS § 135 lg 5 | nagu r3 | ok/viga |
| k2 padevus | keht | PlanS § 139 lg 1, § 130 lg 2 | ypmuutmine=jah ⇒ akt peab olema `otsus`; `?` ⇒ hoiatus; muidu hoiatus "kontrolli § 130 lg 2 p 3" | ok/viga/hoiatus |
| ya1/yv1 padevusYp | alg/vv | PlanS § 142 lg 2, § 77, § 86 | yp-menetluses akt=otsus | ok/viga |
| k6 kolmAastat | keht | PlanS § 139 lg 2 | tähtpäev taotlus+3 a; kehtestamata ja <120 p jäänud ⇒ hoiatus | ok/hoiatus/viga |

### 3.4 Eelnõu sisu (`ELEMENTS` + `EL_NEW`, regex-otsing eelnõu tekstist; leidmata ⇒ puudus)
alg: a1 asukoht/piir/suurus, a2 vajadus, a3 uuringud, a4 tutvumise aeg ja koht (PlanS § 128 lg 5); a5–a7, a11 KSH otsuse sisu ja põhjendus (KeHJS § 35 lg 3, lg 5; § 33 lg 6; tingimus eelhinnang); a8 faktiline ja õiguslik alus (HMS § 56 lg 2); a9 vaidlustamisviide (HMS § 57 lg 1); a10 pole ilmselgelt vastuolus ÜP-ga (PlanS § 128 lg 2–3, "tava"); a12 valla suutlikkus (§ 128 lg 2, § 131 lg 1–2); a13 planeerija pädevus (§ 4 lg 5); ya2 LS ettepanekud (§ 81); da1–da4 (dpm: § 139¹ lg 1–2, § 139² lg 2, HMS § 47/50).
vv: v1 vastavus õigusaktidele (§ 134), v2 kooskõlastused (§ 133 lg 1), v3 alus, v4 väljapanek (§ 135 lg 1), v5 kestus, v6 viide algatamisele ("tava"), v7 KSH aruanne (§ 124 lg 7, KeHJS § 40 lg 4; cond ksh), v8 mõjude hindamine (§ 135 lg 8, § 139 lg 5, "tava"), yv2 KSH tulemused, yv3 heakskiidule esitamine (§ 90).
keht: k1 alus (§ 139 lg 1), k2 pädevus, k3 kaalutlused (HMS § 56 lg 3), k4 arvestamata arvamused (§ 135 lg 11, § 139 lg 6), k5 Maa- ja Ruumiameti heakskiit (§ 138 lg 1–2; cond ypmuutmine), k6 3 a, k7 vaidlustamine (§ 141, 30 p), k8 väljapaneku/arutelu tulemused (§ 137 lg 1), k9 KSH leevendusmeetmed, k10 elluviimine (§ 131 lg 1–2), k11 korduv menetlus (§ 137 lg 3), k12 osaline kehtestamine, yk1–yk2 (§ 90–91, KeHJS § 42).

### 3.5 Nõutavad dokumendid (`DT`, `DT_NEW`; puudub ⇒ viga, kui `req` kehtib)
alg: taotlus (§ 128 lg 4), eelnõu, piiri skeem (§ 128 lg 5), KSH eelhinnang + asutuste seisukohad (cond eelhinnang), [valik.] lähteseisukohad, haldusleping (§ 130). vv: eelnõu, seletuskiri (§ 135 lg 3), joonised (§ 126 lg 2), ruumiline illustratsioon (§ 135 lg 4), kooskõlastused (§ 133 lg 1), KSH aruanne (cond ksh), ÜP muudatuse ettepanek (cond ypmuutmine, § 142 lg 7), algatamise akt, planeerija pädevus (§ 4 lg 5). keht: eelnõu, lõplik lahendus, arvamused (§ 135 lg 2), valla seisukohad (§ 135 lg 11), arutelu protokoll, tulemuste avaldamise tõend (§ 137 lg 2), heakskiit (cond ypmuutmine), vastuvõtmise akt, [valik.] rajatiste haldusleping (§ 131 lg 2). Lisaks yp/dpm-dokumendid (KSH programm, juhtekspert, seire, avatud menetluse teade, istungi protokoll jm).

### 3.6 Ametniku hinnang (`JUDGE_QS`, jah/ei/ei saa hinnata + põhjendus ≥10 märki)
alg: ÜP kooskõla (§ 142 lg 2); KSH otsuse põhjendatus (KeHJS § 35 lg 3, 5); dpm ebaolulisus (§ 139¹ lg 2). vv: kaasamine (§ 127 lg 1–2); kooskõlastused (§ 133 lg 1); kitsendused (looduskaitse, muinsuskaitse). keht: põhilahenduse muutus (§ 137 lg 3); arvamuste kaalumine (§ 135 lg 11); avalike ja erahuvide kaalumine. Lisaks Claude'i JSON-analüüs (`leiud`: valdkond, hinnang vastab|risk|puudus|ebaselge, alus = registri ID, toend ≤25 sõna); "vastab/puudus" ainult koos tsitaadiga.

### 3.7 Muud lävendid
`STALL_RISK = 90`, `STALL_BAD = 180` (päeva etapis seisakuna); töölaua tähtajavaade 14 p; puuduste kirja vaikimisi tähtaeg täna + 30 p.

## 4. Arvulised näitajad

Rakendus **ei arvuta ühtegi ehituslikku ega demograafilist näitajat.** Kõik arvulised väärtused on menetlustähtajad (p 3). Ehitusõigusega seotud näitajad esinevad ainult tekstina (Claude'i ekstraktsiooni juhis, kohatäide või lähteseisukohtade vaiketekst):
| Näitaja | Kus | Kuju / konstant |
|---|---|---|
| Ehitusõigus krundi kaupa | keht `ehitusoigus` (ai) | vaba tekst rea kaupa: "krundi number, sihtotstarve, hoonete arv, ehitisealune pind, korruselisus ja kõrgus"; PlanS § 126 lg 4 p 1–5 registris |
| Kruntide arv ja sihtotstarve | vv/keht `eesmarkKeht` (ai) | "kruntide moodustamine (arv, sihtotstarve), ehitusõigus (hoone liik, korruselisus maa peal ja all)" |
| Hoonete arv krundil | `ls_planeering` | kohatäide ⟦arv, nt 1 peahoone + 2 abihoonet⟧ |
| Korruselisus, kõrgus, abihoone kõrgus, katusekalle | `ls_ehitus` | kohatäited ⟦korruste arv⟧, ⟦m⟧, ⟦vahemik kraadides⟧ |
| Haljastus | `ls_keskkond` vaiketekst | **"haljastatud pinna osakaal elamukrundil peab olema vähemalt 30%"** |
| Parkimine | `ls_liikuvus` vaiketekst | "parkimine lahendada oma krundil"; "parkimiskohtade vajadus arvutada vastavalt standardile **EVS 843:2016 „Linnatänavad”**" (normi ei arvutata) |
| Täisehitus/haljastus %, kõrgus vs naabrid (m), parkimiskohtade arv | keht `kaalutlused` kohatäited | ⟦täisehituse ja haljastuse osakaal krundil, %⟧ jm |
| Pindala | meta `pindala`, `ala` | tekst ("1,4 ha"), ei parsita |
| Geodeetiline alusplaan | `uuringud` vaiketekst | vanus ≤2 a, 1:500, L-EST97, EH2000, ≥20 m väljapoole ala |
| DP koostamise kohustus | PlanS § 125 lg 1 | alevis/alevikus; laiendus "üle 33 protsendi" (ainult sätte tekst) |
Näidisandmed (EX_SK, mitte päris): 4 elamumaa krunti 2800–3900 m², 1 üksikelamu + 2 abihoonet, ehitisealune pind 300 m², kõrgus 8,5 m, katusekalle 25–45°, hoonestusala ≥6 m piirist, 2 parkimiskohta/krunt, hoonete vahe ≥8 m.

## 5. Dokumendiväljundid

| Dokument | Fail | Põhiline sisu / sisendväljad |
|---|---|---|
| Algatamise korraldus/otsus | `<slug>-algatamine-korraldus.docx` | Pealkiri "{nimi} detailplaneeringu koostamise algatamine, lähteseisukohtade andmine [ja KSH algatamine / algatamata jätmine]". Preambul `fmtBasis(alus)` + Kohila delegeerimine (KOHILA_DELEG, ainult korralduse puhul). Peatükid: Algatamine (`ala`, `eesmark`, `vajadus`) · Üldplaneering (`yp`) · KSH (`eelhKoostaja`, `asutused`, `ksh`, `koostaja`) · Lähteseisukohad (ls_*) · Uuringud · Nõuded kooskõlastamiseks ja kehtestamiseks · Elluviimine · Kaasamine (`kulud`) · Menetlus (`taotleja`, `taotlusKp`, `suutlikkus`) · Teatavaks tegemine · Jõustumine ja vaidlustamine · Lisad |
| Vastuvõtmise korraldus/otsus | `…-vastuvotmine-korraldus.docx` | "{nimi} detailplaneeringu vastuvõtmine ja avalikule väljapanekule suunamine": Vastuvõtmine · Avalik väljapanek (`valjapanekAeg`, `valjapanekKoht`, `arvamusteViis`) · Teatavaks tegemine (`taitja`) · Jõustumine · Lisad; preambul `kaalutlused` |
| Kehtestamise korraldus/otsus | `…-kehtestamine-korraldus.docx` | "Tallinna eeskujul": kaalutlused preambulis, Kehtestamine (`ehitusoigus`, `osaline`), Elluviimine (`hlKp`, `hlNr`, `hlRajatised`, `avalikKasutus`, `elluviimine`), `kehtetuks`, Teatavaks tegemine, Jõustumine ja vaidlustamine (kohus, 30 p), Lisad |
| Seletuskiri (eelnõu juurde) | `…-<etapp>-seletuskiri.docx` | Eelnõu eesmärk · Õiguslik alus · Asjaolud ja menetluse käik (`algAkt`, `vvAkt`, kuupäevad) · Lahendus ja kooskõla ÜP-ga (`lahendus`, `yp`) · Keskkonnamõju · Koostöö, kaasamine ja kooskõlastamine (`kooskolastused`, `kaasamine`) · Avalikustamine, arvamused (`arvamused`, `arvestamata`, `arutelu`) · Rakendamine ja kulud · Eelnõu koostaja (ORG) |
| Teated ja kirjad (`NOTICES`, `NT_NEW`) | `<slug>-<id>.docx` | 14 tava-DP teadet/kirja (AT, ajalehed, § 127 isikud, KSH, kooskõlastus, väljapanek, seisukohad, arutelu, tulemused, kehtestamine, kataster) + yp/dpm-kirjad; väljad `NF`: saaja, link, arvamus, seisukoht, aruteluKoht, moju, muutused, iseloom, tulemused |
| Puuduste kiri | `…-puuduste-kiri-<etapp>.docx` | `defectList`: puuduvad dokumendid ("Esitada: …") + analüüsi "puudus"-leiud; tähtaeg +30 p |
| Otsustuskirje | `…-<etapp>-otsustuskirje.docx` | mida pakkus Claude vs mida otsustas ametnik, kinnitused, ülekirjutuste põhjendused, logi |
| PLANIS CSV | `…-planis-andmed.csv` | nimi, liik, menetlusliik, asukoht, kataster, pindala, eesmärk, juhtotstarve, ÜP muutmine, KSH, korraldaja "Kohila Vallavalitsus", koostaja, töö nr, kõik täidetud kuupäevad, aktide kp/nr |
Puuduvad väärtused jäävad `⟦…⟧` kohatäideteks; Claude'i read tuleb enne allalaadimist kinnitada.

## 6. Andmeallikad

- **Sätteregister `REG`:** 89 sätet sõnasõnaliselt Riigi Teatajast (PlanS § 87 lg 4, §-d 124–142; KeHJS § 33, 35, 40; HMS § 54, 56, 57, 75; HKMS § 46 lg 1; LKS § 38, 40) koos redaktsiooniga (`ACTS`: PlanS RT I, 09.07.2026, 22 jt; § 126 lg 3¹ jõust. 01.01.2027). `PENDING`: kinnitamata MKM-skeemi kirjeldused (PlanS § 77, 81–86, 90, 91, 139¹–139⁵, HMS 47–50, KeHJS 34, 42). `LAW_CHANGES`: eelnõu 683 SE, jõustumine teadmata.
- **Kohila ÜP:** ainult viide ja valik – "Kohila valla üldplaneering (kehtestatud Kohila Vallavolikogu 28.11.2024 otsusega nr 40)" (kohila.kovtp.ee/kehtiv-uldplaneering); 2006 ÜP (otsus nr 86) asendatud. **Tsoone, juhtotstarbeid ega ÜP tingimusi pole kodeeritud**; juhtotstarve on vaba tekst. Kooskõla hindab ametnik (JUDGE_QS `ypk`) ja Claude dokumentide põhjal.
- **Muud viited (`PLANS`):** AT teade 10.12.2024, Kohila valla ehitusmäärus (RT akt/714667), valla DP leht, sademevee arengukava 2023–2034.
- **Kohila vormid/konstandid:** KOHILA_DELEG = volikogu 25.06.2019 määrus nr 9 § 3; valla aadress Vabaduse tn 1, Kohila alev, 79804, vallavalitsus@kohila.ee; ÜVK-tingimused OÜ Kohila Maja; vaikekooskõlastajad Transpordiamet, Terviseamet, Päästeameti lääne päästekeskus, Keskkonnaamet (vajadusel); PLANK juhend; riigipühade kalender (lihavõtte algoritm) ja 16 tähtajatesti (`DL_TESTS`).
- **Kasutaja dokumendid:** PDF (pdf.js), DOCX, ASiC/BDOC konteinerid; isikuandmed pseudonüümitakse enne Claude'ile saatmist.

## 7. Ühendus mõjuarvestusega

**Kattuvad / kasutatavad sisendid:**
- Asukoht (`meta.asukoht`, `asukohtIn`) – vaba tekst küla/alev/tänav; vaste asustusüksusele vajab normaliseerimist (Kohila alev, Aespa, Prillimäe, Hageri jne).
- Katastritunnus(ed) – stabiilne võti ruumiandmete ja mõjuarvestuse sidumiseks.
- Pindala (tekst "x ha").
- Juhtotstarve (vaba tekst, nt "väikeelamute maa") – kaudne elamutüübi märk.
- Ehitusõigus krundi kaupa (`ehitusoigus`, `eesmarkKeht`, `lahendus`) – kruntide arv, sihtotstarve, hoonete arv, korruselisus – **ainult vabatekstina** ridadena.
- Ajastus: `taotlus`, `algatamine`, `vastuvotmine`, `kehtestamine` (+ etapp ja seisakupäevad) – sobib mõjude ajalisse jaotusse (nt kehtestamine + ehitusaeg).
- Haldusleping ja rajatised (`hlRajatised`, `avalikKasutus`, `elluviimine`) – valla kulukohustuste sisend eelarvele.
- Menetlusregister (`db` kogu `dp`) – kõik planeeringud ühes kohas; loetav digikaksiku poolt.

**Puudu (tuleb lisada struktureeritud väljadena):**
- Eluruumide arv tüübi kaupa (üksikelamu, paarismaja, ridaelamu, korter) – praegu mitte kuskil arvuna.
- Kruntide arv, elamumaa krundid, sihtotstarbe jaotus (m²/%) – ainult tekstis.
- Ehitisealune pind, suletud netopind/brutopind, korruselisus, kõrgus numbrina krundi kohta.
- Mitteelamu pind (äri, tootmine, ühiskondlik) – töökohtade hinnanguks.
- Asustusüksus EHAK-koodina; tsentraalne ÜVK vs lokaalne (praegu kohatäide).
- Parkimiskohtade arv ja normatiiv (EVS 843:2016 ainult viitena), haljastuse % (ainult 30% vaiketekst).
- Eeldatav väljaehitamise ajakava/etapid ja valmimisaasta.
- Valla kulud (teed, valgustus, ÜVK) eurodes; lasteaia/kooli mõju puudub täielikult.
- ÜP tsoonid ja nende tingimused (tihedus, minimaalne krunt) – pole kodeeritud.

## 8. Erisused ja lahtised kohad

- Rakendus on puhtalt menetlus- ja dokumendikontroll; sisulisi planeeringunäitajaid ei valideerita (nt ÜP juhtotstarbe vastavus, krundi min suurus, haljastuse %).
- Etiketid ja reeglid on erinevad: r3 ütleb sildil "ÜP-d muutva, ÜP-ta ala või KSH-ga DP puhul 30 päeva", v5 sildis KSH puudub; `valjapanekNeed()` arvestab ypmuutmine VÕI ksh, mitte `yp_puudub`.
- r3 (väljapaneku kestus) on paigutatud etappi `keht`, kuigi väljapanek algab vv-etapis; v5 kontrollib sama asja vv-s.
- Tähtaja nihutamine puhkepäevalt on märgitud "kinnitamata" (HMS § 31 lg 1, TsÜS § 136 lg 4); `soft`/`years`/`minIncl` reeglitele nihet ei rakendata.
- yp/dpm sätted (§ 77–91, 139¹–139⁵, HMS 47–50) on `PENDING` – tekst pole registrisse üle võetud.
- `pindala` ja kõik ehitusõiguse väärtused on tekst; numbriline eksport puudub (PLANIS CSV on ainult tekstiväljad).
- Kohila-spetsiifika: korralduse preambulis delegeerimismäärus; ainult Kohila (teised Raplamaa vallad hiljem – kasutaja varasem soov).
- Õigsust pole mõõdetud Kohila arhiivi planeeringutega (ABOUT_HTML "Piirangud").
- Andmed: dokumentide tekst ainult kasutaja brauseris; register salvestab meta, kuupäevad, eelnõud, logi (≤240 000 märki, muidu analüüs jäetakse välja).
- Näidisplaneering "Aespa küla Männiku kinnistu DP" (katastritunnus 31701:001:9999) on väljamõeldud – ei tohi minna päris andmetesse.
