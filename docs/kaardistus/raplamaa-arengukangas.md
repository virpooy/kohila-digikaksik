# Raplamaa arengukangas — mudeli kaart

Artefakt: https://claude.ai/artifact/1z4kbsLU2uneuJwJYuNVfG (salasõnaga krüpteeritud, AES-256-GCM + RSA-OAEP; sisu Artifact read'iga ei loe).
Lähtekood: GitHub `virpooy/raplamaa-arengumudel`, HEAD `a57f2c5` (30.10.2026). Artefakti krüpteeritud payload on **baidi kaupa identne** repo `index.html`-iga (700 100 märki), seega kaart kirjeldab täpselt avaldatud versiooni.
Mootor: `src/base.html` (inline JS, "kohortmudel v6"), kasutajaliides `src/k9/*.js`, andmed `data/*.json` (build.py asendab `/*@data NIMI*/null`).

## 1. Ülevaade

- **Eesmärk:** Raplamaa nelja valla (Kehtna, Kohila, Märjamaa, Rapla) rahvastik ja selle prognoos, teenused (lasteaiad, koolid, 80+), eelarve/tulumaks, eluase, töökohad, stsenaariumid, arengukavade eesmärkide saavutatavus. "Analüüsivahend, mitte omavalitsuse ametlik seisukoht."
- **Versioon:** `MODEL_V="kohortmudel v6 · arengukangas v46"` (k9plan.js); k9core: "v46 (20.10.2026)"; põhiandmed päritud 05.–08.10.2026, lisaandmed 11.–17.10.2026, `ext.json` STAMP 29.10.2026.
- **Üksused:** `V=["Rapla","Kohila","Marjamaa","Kehtna"]` + `MAAK` (= nelja valla summa; Rapla maakond tervikuna, sest maakonnas ongi 4 valda).
- **Aastad:** ajalugu 2015–2026 (1.01 rahvaarv), prognoos `START=2026` → `YN=2036` (aastasammuga). Eelarve ajalugu 2017–2025, andmebaas 2016–2026. Eesmärgid kontrollitakse 2035 (Märjamaa 2036).
- **Peatükid (k9core CH):** Ülevaade (arengupuu, arengukangas, koondnäitajad, küsimused) · Rahvastik · Teenused · Eluase ja taristu · Eelarve (+ Eelarve võrdlus Eestis, 79 KOV) · Stsenaariumid · Seosed (79 KOV korrelatsioonid) · Otsused (tegevusvariandid, keskused, arendusalade register) · Eesmärgid ja seire · Andmed ja metoodika · Kaardivaade (atlas).
- **Lisamoodulid:** määramatus (Monte Carlo + tagasitest + tundlikkus), RE 2027 eelnõu stsenaarium (vaikimisi väljas), tööturg (too.json), MKM uuringute register, sissekirjutuskalkulaator, anomaaliate leiud.

## 2. Näitajad

| Näitaja | Ühik | Tase | Aastad | Kuidas arvutatakse | Sisendid | Allikas |
|---|---|---|---|---|---|---|
| Rahvaarv | in (1.01) | KOV, MAAK | 2015–2026 mõõdetud; 2027–2036 prognoos | Üheaastane kohortmootor (`step1`): 0–84 + 85+; ellujäämine `1−MORT[g]·k`; sünnid `f·Σ(20–39 a)`; ränne `R[g]/5` igale ühevanusele; MAAK = valdade summa | POP.age (18 viieaastast rühma), b, d, mi, mo | Statistikaamet RV0282U (RV0240), RV112U, RV49U, RVR02 |
| Vanuskoostis | in rühmas | KOV, MAAK | 2015–2036 | `toGroups` üheaastasest vektorist; 2026 jaotus üheaastasteks: 0–4 sünnikohortide järgi, muud ühtlaselt | sama | sama |
| 0–14 / 15–64 / 65+ osakaal, ülalpeetavate määr | % | KOV, MAAK | 2015–2036 | rühmad 0–2 / 3–12 / 13–17; dep = (0–14 + 65+)/(15–64) | prognoos | — |
| Loomulik iive (prognoos) | in/a | KOV, MAAK | 2027–2036 | `f(y)·Σ(20–39) − Σ a_g·MORT[g]·k(y)` | CAL | — |
| Rändesaldo (bilansiline) | in/a | KOV | 2016–2026 | `balance` = (Δrahvaarv − sünnid + surmad)/aastad; registriparandus = balance − (mi−mo) | POP | RVR02 |
| Lasteaiaealised (arvestuslik 1–6) | in | KOV | 2026–2036 | `laP = 0,8·(0–4) + 0,4·(5–9)` | vanusrühmad | — |
| Lasteaianõudlus | last | KOV, MAAK | 2026–2036 | `EDU.la[v] · laP(a_y)/laP(a_2026)` (2026 tegelik kasutus × vanusrühma muutus) | EDU.la | toetusfondi arvestus / EHIS 10.11.2025; Kohila = Kohila mudeli hinnang |
| Kooliealised (arvestuslik 7–15) | in | KOV | 2026–2036 | `pkP = 0,6·(5–9) + (10–14) + 0,2·(15–19)` | vanusrühmad | — |
| Gümnaasiumiealised | in | KOV | 2026–2036 | `gP = 0,6·(15–19)` | vanusrühmad | — |
| Koolinõudlus (oma koolid) | õpilast | KOV, MAAK | 2026–2036 | `(tot−g)·pkP_y/pkP_26 + g·gP_y/gP_26` | EDU.pupils.tot, .g | EHIS/HaridusSilm 10.11.2025 (2025/26), toetusfond 2026 |
| Kool vs ÜRP lävend | õpilast | asutus | 2026, 2031, 2036 | kooli 2025/26 arv × valla `pkF`/`gF` muutus; lävend põhikool 90, algkool 20, gümnaasiumiosa 100; "lähedal" < 1,15·lävend | EDU.inst | EHIS; ÜRP koonduuring |
| 80+ elanikud | in | KOV | 2026–2036 | rühmad 80–84 + 85+ | prognoos | — |
| Teenusemahu kulu (LA + kool + 80+) | € | KOV, MAAK | 2026, 2031, 2036, "35 000 siht" | nõudlus × ühikukulu (UC); püsivhinnad (~2024 hinnatase) | UC, eduDemandA | RR302 |
| Ühikukulu | €/laps, €/õpilane, €/80+ | KOV | 2023–25 baas | `median(RR302 2023–2025, tuh €)·1000 / 2026 laste/õpilaste/80+ arv` (põhitegevus + investeeringud) | EXT.FUNC.la/kool/eak | Statistikaamet RR302 |
| Tulumaks | € (jooksevhind) | KOV, MAAK | 2017–2025 fakt; 2026 hinnang; 2027–2036 prognoos | 2026: jaan–sept 2026 + okt–dets 2025 × (jaan–sept 26/25 kasv). 2027+: `est26·[(1−ps)·idx_w·em·W_y/W_26 + ps·idx_p·O_y/O_26]`, W = 20–64 (rühmad 4–12), O = 65+ | MTA kuuandmed, FINS.n3, BUD | MTA; RR300 (n3) |
| Maamaks | € | KOV | 2025–2026 | MTA kuud; oktoobri 2. osamakse 2025 mustri järgi | MTA.mm | MTA |
| Eelarve põhinäitajad (tulud, kulud, tulem, toetusfond, personal jne) | tuh € | KOV, MAAK | 2017–2025 | fakt, koodid n1, n3, n4, n9, n12, n19, n20, n26, n27, n29 | FINS, db.json | RR300 / KOV aruanded |
| Netovõlakoormus, likviidsus, laenud | € / % | KOV | 2024–2029 | eelarvestrateegiate read (net/inc jne) | BUD | valdade eelarvestrateegiad |
| Eluasemevajadus rahvastikumuutusest | eluruumi | KOV | 2026→2036 | `Δrahvaarv / hh`, `hh = rahvaarv 2022 / asustatud eluruumid (REL2021)` | EXT.DW | RL21217 |
| Uued eluruumid | tk, m² | KOV, MAAK | 2017–2025 (+kvartal) | fakt | EXT.HOUSE | EH46U, EH045 |
| Pendelränne | hõivatud | KOV | REL 2021 | fakt (samas vallas / maakonnas / Tallinnas / mujal / välismaal) | EXT.COM | RL21163 |
| Asustusüksuste rahvaarv | in | asula | 31.12.2021 (staatiline, ei prognoosita) | fakt: kokku, 0–14, 15–64, 65+ | SETL | RL21003 |
| Arengukava eesmärgid | — | KOV, MAAK | 2035 | prognoos vs siht (ok ≥ siht; "piiri peal" ≥ 0,95·siht); `needExtra` = lisaränne sihi täitmiseks (bisektsioon) | DOCS | arengukavad |
| Riskiprofiil / anomaaliad | protsentiil | KOV vs 79 KOV | 2021–2025 | protsentiil `peers.json` jaotuses | PEERS | RR300, RV0240 |
| Määramatusvahemik | in (P10–P90) | KOV, MAAK | 2026–2036 | MC 300 jooksu: sünnid Poisson, ränne `N(0, MIGSD)·GEN` | MIGSD | — |

## 3. Eeldused ja parameetrid

**Kohortmootor**
- `MORT=[0.6,0.1,0.1,0.3,0.5,0.6,0.8,1.2,1.8,2.8,4.3,6.8,10.5,15,23,37,62,150]` ‰ (Eesti üldprofiil, 18 rühma); valla tase `k = surmad / Σ(a_g·MORT_g)` aastatel **2023–2025** (`kCal(v,2023,2025)`).
- Sündimus `f = sünnid / Σ(20–39-aastased, mõlemad sood)` 2023–2025 (mitte TFR). Lisaks `fOld` 2016–20, `fMid` 2021–25.
- Rände jääk `R[g]` (in/rühm/aasta): iteratiivne kohordijääk (`resid`, ≤80 iteratsiooni, samm /3, tolerants 0,005), mis kordab lõppaasta vanusjaotust; korrigeeritakse registriparandusega `korr = balance − (mi−mo)` jaotatuna `GEN`-iga.
- `GEN=[.10,.08,.05,.02,0,.08,.16,.15,.11,.07,.05,.04,.03,.02,.02,.01,.01,0]` — pere sisserände vanusejaotus (lisaränne, korrektsioonid, MC-müra).
- **Rändemustrid** (`S.mig`): `r1` 2016–2021; `r2` 2021–2026; `mean` = (r1+r2)/2 (**vaikimisi**); `r2x` = r2 miinus 2022–23 erakordne välisränne `exc = M2022+M2023−2·mean(M2019,M2021,M2024)` jaotatud /5·GEN; `r3` = r2x nihutatud registreeritud saldole 2024–2026.
- Sündimuse trend `fertTr`: `const` (**vaikimisi**) / `down` = `exp(FSLOPE·(min(y,2030)−2024))`, FSLOPE = maakonna log(sünnid/20–39) kalle 2021–2025 = **−0,0987/a** / `sa` = SA TFR(y)/TFR(2024) (RV085; 1,45 → 1,57 aastaks 2036).
- Suremuse trend `mort`: `const` (**vaikimisi**) / `tr` = k·(1−LAM)^(y−2024); LAM = **0,98853 %/a**, kalibreeritud nii, et e0 kasvab 10 aastaga RV0452 trendi (0,1185 a/a) võrra; mudeli e0(KC) = 79,17.
- Hoovad (vaikimisi / vahemik): lisaränne maakonda `extra` 0 (−150…+300 in/a, jagatakse valdadele 2026 rahvaarvu osakaalu järgi, vanus GEN); sündimus `fert` 0 % (±30 %); palgakasv `wage` 4,5 %/a alates 2029 (2…7); tööhõive `emp` **64,1 %** (58…70; `EMPB` = Raplamaa TT4661 2023–25 keskmine, kõvakoodis build.py-s); valla­põhine lisaränne `VX[v]` 0.
- Tööhõive mõju tulumaksule: `em = 1+(emp/64,1−1)·min(1,(y−2026)/4)`.

**Tulumaks**
- Palgakasv: `EPW={2027:5.5, 2028:5.0}`, edasi `S.wage` (4,5 %).
- Pensioni osa `PSHARE`: Rapla = b26.pens/b26.tax; **Kohila = BUD pens 2026 / tax 2026 = 1 327 000 / 11 927 000 = 0,1113**; Märjamaa, Kehtna = Rapla 65+ elaniku kohta pensionitulumaks × 65+ / est26.
- Pensionitulumaksu hüpe 2027 `PJUMP27` = Rapla ja Kohila strateegiate 2027/2026 keskmine = **1,2805**; edasi sama indeks mis palk.
- Tulumaksumäära ega KOV osa ei modelleerita (baas on MTA tegelik laekumine). RE27 moodul (väljas): KOV määr 10,23 % (2026: 10,64 % palk / 8,5 % pension), RM palgakasv 2027–30 4,7/4,4/4,3/4,2, pensioni osa 16 %.

**Teenused**
- Lasteaia- ja koolinõudlus = 2026 tegelik arv × vanusrühma suhe (osalusmäära eraldi ei ole; implitsiitselt püsiv).
- Vanuskaalud: LA `0,8·(0–4)+0,4·(5–9)`; põhikool `0,6·(5–9)+(10–14)+0,2·(15–19)`; gümnaasium `0,6·(15–19)`.
- ÜRP lävendid: põhikool 90, algkool 20, gümnaasiumiosa 100; "lähedal" kuni +15 %. Rapla Gümnaasium 262 õpilast, muutub MAAK `gP` järgi.
- Kohtade arv (võimekus): **puudub** ("kohtade arvu andmed puuduvad, seega tasakaalu ei arvutata"). EDU.inst-is Kohila lasteaedade `l` (Sipsik 140, Männi 150, Sutlema-Aespa 180) on märgitud "hinnang".
- Ühikukulud: RR302 2023–2025 mediaan / 2026 arv; hinnatõusu ei arvestata; kooli kulu sisaldab õppekohatasusid.
- Eakate kulu: 80+ elaniku kohta püsib 2026 tasemel.

**Eluase:** leibkonna suurus `hh = POP 2022 / DW.occ` (REL 2021); asendusehitust ega leibkondade vähenemist ei arvestata. Eluruumitüübi kaupa (maja/korter) koefitsiente ega laste arvu eluruumi kohta **ei ole**.

**Määramatus:** `MC_N=300`, seeme 20261008; sünnid Poisson; ränne `gauss·MIGSD`, MIGSD = 1,4826·MAD(bilansiline ränne 2016–2025); vahemik P10–P90. Tundlikkus: rändemuster 5 mustrit, extra ±50, fert ±10 %, fertTr 3 varianti, mort 2, wage ±1 pp, emp ±2 pp.

**Eesmärgid (kõvakoodis):** MAAK 35 000 (2035); rändesaldo +123/a; loomulik iive > 0; 0–14 osakaal 17,1 %; 65+ ≤ Eesti keskmine (`EST={k26:0.1508,o26:0.2138,o22:0.2043}`, o35 ekstrapoleeritud); Rapla > 15 000 jt.

## 4. Andmeallikad

- `pop.json` — RV0282U (vanuserühmad, 1.01.2015–1.01.2026), RV112U (sünnid), RV49U (surmad), RVR02 (ränne) 2015–2025; auto, `pipeline/stat_pop.mjs`, päritud 05.10.2026.
- `ext.json` (STAMP 29.10.2026) — RV084/RV085 SA 2024. a prognoos (põhistsenaarium); RV0452 e0 2015–2025; RVR02 välisränne 2019–2025 (MIGV); EH46U, EH045 uued eluruumid 2017–2025; RL21217 eluruumid (REL 2021); RL21163 töökoha asukoht (REL 2021); RR302 kulud tegevusalati 2023–2025; RAA0050 SKP 2024; TT0151 (Eesti) ja TT4661 (Rapla mk) tööhõive; ÜRP koonduuring (2025) lk 43–52 tabelid 2.1.1–2.1.6 (2024→2050); Märjamaa prognoos (Geomedia 2020).
- `fins.json` — RR300 / KOV eelarve täitmine 2017–2025 (tuh €).
- `mta.json` — MTA tulumaks ja maamaks kuude kaupa, 2025 ja jaan–sept 2026.
- `bud.json` — valdade eelarvestrateegiad ja 2026 eelarved (Kohila: strateegia 2026–2029, y 2024–2029).
- `edu.json` — toetusfondi arvestus 2026, EHIS/HaridusSilm 10.11.2025 (õa 2025/26); Kohila asutuste arvud = Kohila mudeli hinnang.
- `peers.json`, `econ.json` — 79 KOV: RR300, RV0240, RVR02, RV112U, RV49U, UA08, PA107, ER0320, RV06U, TT065; perioodid `econ/periood.json` (nt pop 2019–2025).
- `db.json` — Raplamaa andmebaas 2016–2026 (valdade aruanded + Statistikaamet).
- `too.json` — TT4645, TT065_PA, TT4661, RV_UA_RL_ER; `mkm.json` — MKM uuringud.
- Asustusüksused — RL21003 (REL 2021, 31.12.2021), koordinaadid Wikidata P625; `geo.json` — Maa- ja Ruumiamet EHAK (01.01.2018).

## 5. Kohila võrdlusnumbrid

Saadud: mootor (`src/base.html` read 1–127 + eduDemand/UC) käivitati node'is repo `data/*.json`-iga, build.py asendustega (EMPB = 64,1). Vaikestsenaarium: `mig="mean"`, extra 0, fert 0, fertTr const, mort const, wage 4,5, emp 64,1.

| Näitaja | 2026 | 2031 | 2036 |
|---|---|---|---|
| Rahvaarv (mean) | 7 844 (mõõdetud) | 8 145 | **8 418** |
| Rahvaarv teiste mustritega 2036 | — | — | r1 8 517 · r2 8 318 · r2x 8 146 · r3 7 888 |
| MC P10–P90 (mean) | — | 7 846–8 474 | 7 942–8 907 |
| Lasteaiaealised `laP` (arvestuslik 1–6) | 515,6 | 445,1 | 445,9 |
| Lasteaianõudlus (lapsi) | 442 | 381,6 | 382,3 |
| Kooliealised `pkP` (7–15) | 924,2 | 926,7 | 819,4 |
| Koolinõudlus, oma koolid (õpilasi) | 851 (sh 139 gümn.) | 829,6 | 766,2 |
| 80+ elanikud | 327 | 393,5 | 445,4 |
| Tulumaks (€, jooksevhind) | 12 473 879 (hinnang) | 17 385 817 | 22 641 997 |
| Teenusemahu kulu LA+kool+80+ (€, püsivhind) | 9 111 800 | 8 564 133 | 8 308 485 |

- Rahvaarv 2035: 8 365. Maakond (MAAK): 33 733 → 33 051 (2031) → 32 151 (2036).
- Kalibreering: k = 1,1491; f = 0,03342 sündi 20–39-aastase kohta; registriparandus korr1 = 1, korr2 = 34 in/a; välisrände erand 83,3; saldo 2024–26 = 40,5 in/a. Rändesaldo summa (in/a): r1 97,3 · mean 89,8 · r2 82,3 · r2x 65,6 · r3 40,5.
- Tulumaks: fakt 2017 5 646 000, 2020 7 516 000, 2025 11 707 000 €; jaan–sept 2026 9 279 913 vs 2025 8 702 680 (kasv ×1,0663). Strateegia 2026 plaan 11 927 000 €. Pensioni osa 11,13 %.
- Ühikukulud: lasteaed **8 913 €/laps** (RR302 mediaan 3 939,7 tuh € / 442); kool **5 455 €/õpilane** (4 642,3 tuh € / 851); eakad **1 620 €/80+ elanik** (529,8 tuh € / 327). Toetusfondi arvestuslik õpetaja tööjõukulu 3 097 €/õpilane (koef. 1,05), toetus 3 122 655 € (2025: 2 889 132), LA toetus 124 235 €.
- Kohtade arv: mudelis puudub; EDU.inst hinnang Sipsik 140 + Männi 150 + Sutlema-Aespa 180 = 470 kohta (vs 442 last). Kohila Mõisakool (MTÜ, 268 õp.) ei kuulu "oma koolide" hulka.
- Eluase: hh = 7 525/2 892 = 2,602 in/eluruum; vajadus 2026→2036 ≈ **220 eluruumi**. Uusi eluruume 2025: 58 (2017–2025: 14, 22, 28, 24, 41, 26, 34, 38, 58).
- Asulad (REL 2021): 25 üksust, kokku 7 525; Kohila alev 3 295, Aespa alevik 1 494, Vilivere 332, Prillimäe 331.
- ÜRP: 2024 baas 7 847; 2050 base 7 608, A/B 9 974, C 10 958, D 10 099.

## 6. Erisused ja lahtised kohad

- **Leht on krüpteeritud**; analüüsiks on vaja lähtekoodi (avalik repo). Artefakt = repo HEAD (kontrollitud payload'i võrdlusega).
- Sündimus on "sünnid 20–39-aastaste (mõlemad sood) kohta", mitte vanusespetsiifiline ega naiste põhine: soolise koostise muutus ei kajastu. Mudel on sootu.
- Suremus: üks Eesti üldprofiil × valla kordaja. Lähtekoodi kommentaar ütleb "kalibreeritakse 2021–2025", kood kasutab **2023–2025**.
- Ränne on rühmapõhine kohordijääk (mitte sisse-/väljarände määrad); 5 mustrit on kõik minevikuperioodid, vaikimisi `mean` = 2016–21 ja 2021–26 keskmine (sisaldab osaliselt 2022–23 Ukraina rännet). Kohila mean-muster annab +~90 in/a ehk kasvu 7 844 → 8 418, samas kui `r3` (viimased aastad) annab 7 888.
- Lisaränne (`extra`) jagatakse valdadele 2026 rahvaarvu osakaalu järgi — mitte planeeringute/elamuehituse järgi; elamuehitus ei mõjuta prognoosi (eluasemevajadus on ainult väljund).
- Lasteaia- ja koolinõudlus = 2026 baas × vanusrühma muutus; osalusmäärasid, kohtade arvu ega mahutavust pole; vanuskaalud (0,8/0,4; 0,6/1/0,2; 0,6) on lähendid viieaastastest rühmadest.
- Kohila lasteaialaste arv 442 ja asutuste kohad on "Kohila mudeli hinnang", mitte EHIS fakt.
- Ühikukulu jagatakse 2026 arvudega, kuid kulud on 2023–25 nominaalsed (hinnatase segamini); kooli kulu sisaldab õppekohatasusid → ühikukulu ülehinnatud; Kohila kooli õpilaste arv sisaldab gümnaasiumi.
- Tulumaks: KOV määr/osa muutusi vaikimisi ei arvestata (RE27 eraldi lüliti); pensioni­tulumaksu hüpe 2027 (×1,28) võetud Rapla ja Kohila strateegiatest ning rakendatakse kõigile; Märjamaa/Kehtna pensioniosa on hinnang. Tulumaksu baas 2026 on laekumise ekstrapolatsioon, mitte eelarve.
- `EMPB=64,1` kõvakoodis build.py-s; base.html-is algne 68,5 asendatakse ehitusel stringiasendusega.
- Vana `step()` (0,8/0,2 nihe viieaastastes rühmades) on koodis, kuid kasutamata.
- Asustusüksuste tasemel prognoosi ei ole (ainult REL 2021 seis).
- `peers.json` näitajate `refi` ja `finKordaja` arvutuskäik on teadmata (ALLIKAD.md).
- Kohila arengukava link `DOCS.Kohila` viitab claude.ai artefaktile, mitte ametlikule dokumendile.
- Kohila ühikukulu ja tulumaksu pensioniosa sõltuvad Kohila eelarvestrateegia 2026–2029 numbritest (bud.json).
