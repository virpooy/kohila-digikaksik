# Teksti ja graafika tasakaal kaksiku eelmudelis

31.10.2026. Peeter: „Tekste on liiga palju ja graafilisi mudeleid peaks rohkem olema. Magistritöö peaks olema mudelis läbivalt kasutuses.”

## Mõõtmine (versioon a052499, 1440 px, Kohila)

| Peatükk | Sõnu | Neist jooksvat teksti | Tabeleid (ridu) | Jooniseid | Kõrgus, px |
|---|---|---|---|---|---|
| 01 Ülevaade | 379 | 97 | 1 (10) | 1 | 1318 |
| 02 Rahvastik | 371 | 92 | 2 (14) | 2 | 1463 |
| 03 Elamuarendus | 489 | 191 | 1 (10) | 2 | 1693 |
| 04 Investeeringud | 208 | 106 | 1 (5) | 0 | 671 |
| 05 Otsuse mõju | 336 | 55 | 1 (7) | 0 | 1104 |
| 06 Liikuvus | 175 | 73 | 1 (8) | 0* | 1035 |
| 07 Täpsus | 287 | 183 | 1 (5) | 0 | 740 |
| 08 Kasutusjuhud | 399 | 27 | 1 (10) | 0 | 1069 |
| 09 Andmesõnastik | 870 | 35 | 1 (28) | 0 | 3003 |
| 10 Mootor ja testid | 1002 | 109 | 3 (48) | 0 | 3599 |
| 11 Konfiguratsioon | 258 | 180 | 1 (5) | 0 | 741 |
| **Kokku** | **4 774** | **1 148** | **14 (150)** | **5** | **16 436** |

\* liikuvuse 100% tulbad on HTML-is, mitte SVG-joonis.

Järeldused: lehel on 14 tabelit ja 5 joonist. 59% sõnadest ja 56% lehe kõrgusest on peatükkides 07–11, mis on mõeldud arendajale ja hankijale, mitte otsustajale. Otsustaja peatükkidest 01–06 kolmes (investeeringud, otsuse mõju, liikuvus) ei ole ühtegi SVG-joonist.

## Mida kirjandus ütleb

- **Lugejad ei loe, vaid silmitsevad.** Veebikasutajad loevad keskmiselt umbes 20% lehe sõnadest ja osakaal väheneb, mida rohkem on sõnu (Nielsen, 2008, Weinreich jt 2008 andmete põhjal; Nielsen & Morkes, 1997).
- **Tekst on kasulik siis, kui see on joonise peal, mitte selle all.** Annoteeritud graafikuid eelistati kõige rohkem ja kolmandik lugejate järeldustest tuli annotatsioonidest; parim koht oli pealkiri (Stokes jt, 2023, V42). Fookus (üks rõhuvärv + lühike lause) muutis sõnumiga seotud järelduse 2,96 korda tõenäolisemaks, pelk puhastamine mitte (Ajani jt, 2022, V59). Pealkirja vaadatakse ja meenutatakse kõige rohkem (Borkin jt, 2016, V08).
- **Martiiniklaas.** Kõigepealt autori juhitud sõnum (kas sihid täituvad), siis vaba uurimine (Segel & Heer, 2010, V43).
- **Tabel ainult täpse väärtuse jaoks.** Trendi ja sihi suhte jaoks joonis, täpse arvu jaoks tabel; inimesed eelistavad tabeleid ka siis, kui joonis sobiks paremini (Vessey & Galletta, 1991, V49). Seega tabel peidetud „Täpsed väärtused” alla, joonis ees (Yigitbasioglu & Velcu, 2012, V17: drill-down).
- **Infoülekoormus** on armatuurlaudade peamine probleem; iga number vajab konteksti (siht, eelmine periood) (Bach jt, 2023, V15).
- **Otsustaja ja arendaja vajavad eri vaadet** (Vázquez-Ingelmo jt, 2019, V20).

## Kujundusreeglid kaksikule (kõigis peatükkides)

1. Peatüki algus = leiupealkiri + joonis. Kirjeldav nimi väikese ülarealt.
2. Jooksvat teksti nähtaval kuni 1 lause (umbes 25 sõna) joonise kohta; selgitus joonisel annotatsioonina (nool, silt, siht).
3. Metoodika, eeldused ja allikad suletud plokis „Kuidas see on arvutatud”.
4. Iga tabel suletud plokis „Täpsed väärtused” joonise all, CSV allalaadimisega.
5. Iga number kontekstiga: siht, 2026 tase või „ilma otsuseta”.
6. Otsustaja vaade (01–06) ja arendaja vaade (07–11) eraldi sakkidena; vaikimisi otsustaja vaade.
7. Ühine värvikeel: sinine = mudel/valik, oranž = arendus/lisandumine, seisuvärvid ainult seisu jaoks koos kujuga.
8. Eesmärk: otsustaja vaates nähtaval alla 1 000 sõna (praegu 1 958) ja vähemalt 12 joonist (praegu 5).

## Peatükkide kaupa

| Peatükk | Praegu | Uus |
|---|---|---|
| 01 Ülevaade | 5 KPI-d, sihi joonis, lubaduste tabel (10 rida) | Kolm väikest joonist: siht (% sihist), lapsed ja kohad (lasteaed/kool vs kohtade arv), eelarve suund; lubaduste tabel arendaja vaatesse |
| 02 Rahvastik | rahvaarvu ja hariduse joonis, vanuserühmade tabel, asulate tabel | Vanuserühmad: muutus 2026→2036 tulpadena (+/−); asulad: punkt 2026 → 2036 ja kooli märk; tabelid „Täpsed väärtused” alla |
| 03 Elamuarendus | 7 KPI-d, 2 joonist, 10-realine tabel, pikk märkus | Eelarve mõju kosk (tulumaks − tasandusfond − kulu = neto), täiskulu ja piirkulu kõrvuti; KPI-d 4-ni; märkus suletud plokki |
| 04 Investeeringud | tabel | Kohtade puudujääk ja investeering valdade kaupa tulpadena; võlakoormus vs 60% lävend |
| 05 Otsuse mõju | mõjude tabel + mustand | Mõjud ühel joonisel (ilma otsuseta vs otsusega); mustand jääb (see on väljund) |
| 06 Liikuvus | HTML-tulbad, KPI-d, tabel | Tulbad SVG-ks, koolita asulad kaardilaadse punktjoonisena |
| 07–11 | 2 400 sõna, 8 tabelit | Sakk „Arendajale”; täpsus: tagasitesti vead punktjoonisena |

## Allikad

- Nielsen, J. (2008). How little do users read? Nielsen Norman Group. (Weinreich, H., Obendorf, H., Herder, E., & Mayer, M. (2008). Not quite the average: An empirical study of Web use. ACM Transactions on the Web, 2(1), 5.)
- Nielsen, J., & Morkes, J. (1997). How users read on the Web. Viidatud: plainlanguage.gov, Federal Plain Language Guidelines.
- Ülejäänud: magistritöö kirjanduse loetelu (V-tunnused).
