# Täiendus 01.11.2026: usaldusväärsus, kaart, liikuvus

Lähteülesanne: „Täienda olemasolevat Kohila digikaksiku rakendust …” (15 osa, 14 vastuvõtukriteeriumi). Mootorit (3.0.0) ei muudetud; kõik uued arvutused on koondamine ja märgistamine (`src/logic.js`).

## A. Inventuur ja teostatavus

| Vajadus | Olemas enne | Tehtud | Andmed |
|---|---|---|---|
| Tööalased seosed | Valla tasemel 4 kategooriat (`ext.COM`, Rae välismaa viga: 3 vs 35) | `data/commute.json` RL21163 kõik 11 kategooriat, lahutatud 7 mittekattuvaks osaks | REL 2021; töökoht ainult kategooriana → kaardile ainult Tallinn ja Tartu |
| Ühistransport | Üks päev, asula koondread (`transit.json`) | `data/transit/<vald>.json`: 14 analüüsipäeva, peatus/asula/vald, tunnijaotus, liinid ja geomeetria, otseühendused | GTFS raplamaa, harjumaa, elron, tallinn (`tools/gtfs.js`, `docs/gtfs.md`) |
| Haridusasutuste asukoht | Kohila ja Rae (OSM) | Kõik 5 valda OSM-ist koos aadressiga; õpilased `edu.inst`, Rae kohad arengukavast | asutuste mahutavus osaliselt puudu |
| Piirid | Vald + OSM külad | + Eesti maakonnad ja KOV-id (`data/map/region.json`) | OSM, mitte ADS |
| Planeeringu asukoht | asula | sama, märgitud „ligikaudne” | ala polügoon puudub |

## B–G. Tehtud muudatused

- **Päritolu**: 6 märgist (ametlik, mudel, eeldus, hinnang, puudub, aegunud) ikooni ja sõnaga; allikakataloog `src/sources.js` (allikas, link, definitsioon, ühik, periood, hankimise kuupäev, detailsus, arvutusviis, piirang); iga vaate jaluses ⓘ-nupud. Üldine „andmed 10.10.2026” eemaldatud.
- **Kuupäevad**: GTFS-i hankimise aeg, kehtivus ja analüüsipäev on eraldi. Varasem „2026-11-10” oli analüüsipäev, mitte uuendamise kuupäev.
- **Järeldused**: tingimuslik sõnastus („Valitud eeldustel …”); teenused „valla koondarvestuses” + reserv (suurim täituvus, aasta, väikseim vaba kohtade arv, kasvuruum, kohtade andmekvaliteet); ≥ 90% täituvus = „reserv väike”; stressitest +5…+30%; seisund ja andmekindlus eraldi.
- **Avaleht**: testid viidud arendajavaatesse; uus jaotis „Andmete ajakohasus ja kindlus” (allikad, katvus valdade kaupa, mudeli kontrolli seis).
- **Planeeringud**: `Logic.dpStatus` – „arvutatud / osaliselt / arvutamata”; hoiatus ülevaates, stsenaariumides, kaardil, seletuskirjas ja ekspordis.
- **Kaart** (`src/ch_kaart.js`): neli režiimi (piirkonnad, tööalased seosed, ühistransport, ligipääs); otsing, mahuta valitud, täisekraan, tühjenda filtrid, SVG-eksport koos legendi ja viidetega; kihtide paneel, valitud objekti paneel, seotud graafik ja tabel (valik sünkroonis); rahvastikunäitajad (REL 2021, prognoos, muutus abs/%, lapsed, 65+ 2021, baas vs valitud), aasta ja stsenaarium päisest; ringi pindala ∝ väärtus.
- **Liikuvus**: voojooned (laius ∝ hõivatud, nool, väljaminev; sissetulev = puudub), seotud tulpdiagramm, valikuline peatatav animatsioon (vähendatud liikumise eelistus); ühistranspordi tunnigraafik (buss/rong), kuupäev, liik, ajavahemik, sihtkoht, seadistatav lävend; ligipääs linnulennult + sõiduplaani otseühendused, meetodid eraldi.
- **Eelarve**: hinnataseme hoiatus pealkirja juures, täis- ja piirkulu definitsioon, aastane / perioodi kogumõju / ühekordne investeering eraldi, tundlikkus ja märgi stabiilsus, hõlmamata kulud.
- **Täpsus**: kontrolliperiood, sisendite ajapiir (kontrollitud mootori koodis), akende arv, piirangud; „80% vahemik” eemaldatud.
- **Eksport**: stsenaariumid JSON (skeem, eeldused, planeeringute eluruumid, andmeversioonid, mootor, aeg) ja import; analüüsi kokkuvõte Markdownina; CSV-d; vaate URL (`#rühm/jaotis?u=&m=&x=&f=&y=`).
- **Navigeerimine**: 5 rühma, vanad süvalingid suunatakse (`ALIAS`), mobiilis menüünupp.
- **Olekud**: laadimine, veateade koos „Proovi uuesti”, osaliste andmete teade, tühjad olekud („puudub”).
- **Küsi kaksikult**: tööriista vastus sisaldab stsenaariumi, perioodi, allikat ja piirangut; seletuskirja lisatakse eeldused ja piirangud.

## Kontrollid

`tests/content.test.js` (51 kontrolli, CI-s): puuduv planeeringumaht ≠ nullmõju; GTFS fixture (kalendrierandid, unikaalsed reisid, >24:00) ja päris andmetel tunnijaotus = reisid (kaart, graafik, tabel samast väärtusest); eelarve liigid ja märgi tundlikkus; pendelrände nimetajad; ajalugu vs stsenaarium; stsenaariumi taastamine; reservi arvutus.

## Allesjäänud lüngad

- Asutuste ametlik mahutavus ja laste arv asutuse kaupa (Kohila koolikohad on hinnang; Rapla/Märjamaa/Kehtna kohad puuduvad).
- Planeeringute ala polügoonid ja 2 Kohila elamuplaneeringu eluruumide arv.
- Sihtomavalitsuse järgi pendelränne ja sissetulev pendelränne (Statistikaameti eritellimus).
- Teedevõrgu teekond ja ümberistumisega ühistransport (OSRM / OpenTripPlanner).
- Reisijate arv ja täituvus (piletisüsteemi andmed).
- Statistiline prognoosivahemik (praegu ainult stsenaariumide vahemik).
- Ühtlustatud hinnatase eelarves (indeks).
- Sõltumatu ülevaatus.
