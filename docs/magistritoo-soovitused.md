# Magistritöö soovitused kaksikus

31.10.2026. Magistritöö „Andmete visualiseerimine omavalitsuse otsustustoes” (peatükid 4 ja 6) hindas eelmudeli versiooni 2.1.0 põhimõtete P1–P18 järgi (16/36 punkti) ja andis 12 soovitust. Peeter andis korralduse need kaksikus kasutusele võtta.

Muudetud on ainult kasutajaliidest (`index.src.html`). Arvutusmootor (`engine.js` 2.1.0) ja andmed on muutmata; enesetestid 16/16 läbivad ja kõik numbrid on samad.

| Soovitus | Põhimõte | Mis tehti |
|---|---|---|
| S1 | P2, P3 | Rahvaarvu joonise telje vahemik arvestab sihti, nii et sihijoon on alati näha (enne jäi Kohila ja Rapla siht teljest välja). Sildil väärtus ja aasta, ring sihtaastal, märkuses dokument. |
| S2 | P10, P18 | Sihi KPI-kaardil seisu kuju ja värv (● ▲ ■), puudujääk arvuna ja „% sihist”, rändemustrite vahemik. |
| S3, S7 | P5 | Leiupealkirjad (arvutatud) rahvaarvu, haridusnõudluse, arenduse lisanõudluse ja kohtade bilansi joonistel; kirjeldav nimi jääb ülareale. |
| S4 | P4, P11 | Uus sihi joonis Ülevaates ühisel skaalal „% sihist” (siht = 100%). Joonistel, mille telg ei alga nullist, on märge „telg ei alga nullist”. |
| S6 | P8, P9 | Sihi hinnang kõigi viie rändemustri järgi: „täitub kõigis”, „täitub N mustris 5-st” või „ei täitu üheski”. |
| S8 | P8 | Rahvaarvu joonisel rändemustrite vahemik alana. |
| S9 | P16 | `html lang="et"`, „Liigu sisu juurde” link, joonistel L2-taseme tekstikirjeldus (väärtused, siht, trend), väikese teksti kontrast 3,0:1 → 4,6:1 (hele) ja 3,8:1 → 5,3:1 (tume). |
| S10 | P15 | Joonise jaluses allikas, andmete kuupäev ja mootori versioon; andmete allalaadimine CSV-na (rahvaarv, haridusnõudlus, elamuarendus). |
| S11 (osaliselt) | P13, P17 | Ülevaate algusesse kolm otsustaja küsimust: kas siht täitub, kui kindel see on, mida oleks vaja (vajalik lisaränne, link otsuse eelhinnangule). |

Tegemata: S5 ja S12 puudutavad ainult arengukangast. S11 täielik otsustaja vaade (eraldi leht, kus analüüsi- ja arendajamaterjal on eraldi) jääb kaksiku arendusse. Teisi arengukava mõõdikuid (laste ja tööealiste osakaal, maksumaksjad) eelmudelis ei ole, sest selleks on vaja lisaandmeid.

Kasutajatesti (magistritöö peatükk 5) õiged vastused ei muutunud. Kui testis kasutatakse seda versiooni, tuleb tulemusi tõlgendada kui parandatud eelmudeli tulemusi, mitte töös hinnatud versiooni 2.1.0 omi.
