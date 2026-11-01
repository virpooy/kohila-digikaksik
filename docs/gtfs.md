# Ühistranspordi andmed (GTFS)

Fail `data/transit/<vald>.json` (Kohila, Rae, Rapla, Marjamaa, Kehtna) tehakse töövooga **Ühistransport (GTFS)** (`.github/workflows/yt.yml`), mis käivitab `node tools/gtfs.js`. Testid: `node tests/gtfs.test.js`. Vana ühe päeva kokkuvõte `data/transit.json` jääb alles varulahendusena.

## Allikad
- Transpordiameti GTFS-sõiduplaanid (Remix): `https://eu-gtfs.remix.com/raplamaa.zip`, `harjumaa.zip`, `elron.zip`, `tallinn.zip`. Iga voo kohta on `meta.feeds` all URL, HTTP Last-Modified, allalaadimise aeg, `feed_info` (kui olemas) ja kehtivus (vähim algus / suurim lõpp üle `calendar` ja `calendar_dates`).
- Valla piir ja asustusüksused: OpenStreetMap (`data/map/<vald>.json`). Peatus kuulub valda ja asulasse punkt-polügoonis-testi järgi. Asula võti = nimi ilma sõnadeta alev/alevik/küla/linn (Hageri alevik + Hageri küla → „Hageri”).

## Mõisted
- **Väljumine (`dep`)** – peatumine valla peatuses, millele samas reisis järgneb veel peatus ja kus pealeminek pole keelatud. Reisi viimane peatus ei ole väljumine. Asula `dep` = selle peatuste väljumiste summa.
- **Reis (`trips`)** – unikaalne `trip_id`, mis väljub vähemalt korra asula (või valla) peatusest. Kui reis peatub asulas kolmes peatuses, on see 3 väljumist, aga 1 reis. Tunnijaotus `h` (buss) / `hr` (rong) ja `first`, `last`, `am` (06:00–08:59), `pm` (15:00–18:59) loetakse reisi esimese asulast väljumise järgi.
- **Sihtkohaühendus (`tln`, `keskus`)** – otseühendus: sama reis peatub hiljem sihtkohas (ümberistumisi ei arvestata). `minMin` = sõiduaeg asula viimasest väljumispeatusest esimese sihtpeatuseni; `firstArr` = varaseim saabumine; `am7_9` = saabumised 07:00–08:59.
  - Tallinna kesklinn = peatused kuni 2,5 km Vabaduse väljakust (59.4337, 24.7449).
  - Vallakeskus = OSM-i asustusüksuse polügoon: Kohila alev, Jüri alevik, Rapla linn, Märjamaa alev, Kehtna alevik. Keskusasula enda `keskus`/`kool` = null.
- **Kool** – `arrBy0815` = hiliseim otsesaabumine keskusesse kell 08:15 või varem, `arrFirst` = varaseim selline saabumine (null, kui ei ole); `ret` = reisid, mis väljuvad keskusest 13:00–17:59 ja peatuvad hiljem asulas.
- `gapMax` = suurim vahe (min) järjestikuste väljumiste vahel 05:00–23:00; alla kahe väljumise korral null.
- `stops` sisaldab ainult peatusi, kus perioodil peatub mõni reis (voogudes on kogu riiklik peatuseregister). Sama `stop_id` võib olla mitmes voos; id on kujul `voog:stop_id`. Peatuse päevaandmetes on `h` ainult bussipeatusel ja `hr` ainult rongipeatusel (`stops[].modes`).
- 0 tähendab, et sõiduplaanis sel päeval väljumisi ei ole; null tähendab, et väärtust ei saa määrata (nt ühendus puudub). Väärtusi ei tuletata ega hinnata.

## Kalender
- 14 järjestikust päeva alates ehitusele järgnevast esmaspäevast; päev, mis jääb mõne voo kehtivusest välja, jäetakse välja (hoiatus `meta.warnings`).
- Reis sõidab päeval D, kui `calendar` nädalapäev on 1 ja algus ≤ D ≤ lõpp; seejärel `calendar_dates` tüüp 1 lisab ja tüüp 2 eemaldab. `meta.dayInfo` näitab nädalapäeva (E–P) ja erandite arvu.
- GTFS-i ajad võivad ületada 24:00 (nt 25:10 = järgmise öö 01:10). Need kuuluvad sama teenusepäeva alla, tunnijaotuses tund 1; ajaaknad (hommik, õhtu, 05–23) arvestatakse teenusepäeva aja järgi.
- Liigiks loetakse route_type 2 ja 100–117 rong, 3 ja 700–716 buss.

## Mida GTFS ei ütle
- Sõitjate arvu, täituvust, piletimüüki ega nõudlust.
- Tegelikke hilinemisi ja ärajäämisi (reaalaja andmeid ei kasutata).
- Ümberistumisega ühendusi (arvestatakse ainult otseühendusi) ega jalgsikäiku peatuseni.

## Piirangud
- Kommertsliinid (nt osa Tallinn–Rapla kaugbusse) ja tellimusvedu võivad voogudest puududa.
- Kui sama reis on mitmes voos (nt maakonnaliin nii Raplamaa kui Harjumaa voos), loetakse see üks kord (sama liini number, liik ning samad väljumisajad ja peatusenimed vallas); eemaldatud duplikaadid on `meta.dupTrips` all.
- Ilma kellaajata peatumisi (mitte-ajapunktid) ei kasutata ega interpoleerita; nende arv on hoiatustes.
- Liinikujud on lihtsustatud (~10 m) ja lõigatud valla piirikast + ~3 km ulatusse.
- Asulapolügoonid on OSM-ist; peatus, mis ei jää ühtegi polügooni, loeb ainult valla tasemel (`asula: null`).
