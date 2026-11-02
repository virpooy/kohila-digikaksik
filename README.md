# Kohila digikaksik

Kohila ja Rae valla (ning Raplamaa valdade) digitaalne kaksik: deterministlik arvutusmootor (TwinEngine 3.0.0) ja veebileht, mis aitab vallaametnikel ja otsustajatel näha, mis olukord on, millised piirkonnad vajavad tähelepanu, mis muutub valitud stsenaariumis, millistel eeldustel tulemus kehtib ja millised andmed puuduvad.

Mudel ühendab rahvastiku üheaastaste vanuste kohortmudeli (sama mis Raplamaa arengukangas v6), lasteaia- ja koolinõudluse ning kohad, tulumaksu, ühikukulud, investeeringuvajaduse, võla raja, tasandusfondi, elamuarenduse mõju, asulakihi, arengukava eesmärgid ja otsuse mõju eelhinnangu. Kaardil on OpenStreetMapi aluskiht, haridusasutused, planeeringud, ühistransport (Transpordiameti GTFS) ja tööalased seosed (REL 2021).

**Põhimõtted**
- Isikuandmeid ei kasutata. Sisendiks on ainult avaandmed ja koondandmed; alla 5 inimesega lahtrid peidetakse.
- Kõik numbrid arvutab deterministlik mootor (`engine.js`). AI numbreid ei arvuta.
- Puuduv väärtus on „puudub”, mitte 0. Igal arvul on allikas, periood ja päritolumärgis (ametlik, mudel, eeldus, hinnang).
- Tööriist aitab otsuseid ette valmistada; otsuse ja selle sisu eest vastutab pädev ametnik või organ.

## Ülesehitus

| Fail / kaust | Sisu |
|---|---|
| `engine.js` | Arvutusmootor (TwinEngine 3.0.0): puhtad funktsioonid, töötab brauseris ja Node'is. Ülevaade: `docs/mootor-3.md`. |
| `src/` | Veebilehe lähtekood: `shell.html`, `app.css`, `core.js`, `logic.js` (testitav UI-loogika), `sources.js` (allikakataloog), peatükid `ch_otsus.js`, `ch_plan.js`, `ch_kaart.js`, `ch_dev.js`, `main.js`. |
| `build.py` | Paneb `src/` ja `engine.js` kokku failiks `index.html`. |
| `data/` | Koondandmed: `kov.json` (omavalitsuste seadistus ja eesmärgid), `pop`, `fin`, `edu`, `ext`, `settlements`, `peers`, `commute` (REL 2021), `dp` (planeeringud), `map/` (OSM), `transit/` (GTFS), `reference.json` (põhimudeli väljundid), `dictionary.json` (andmesõnastik), `usecases.json`. |
| `tools/` | Andmete uuendamine: `update_open_data.js` (MTA, RR302), `osm_kaart.js` (kaart), `gtfs.js` (ühistransport), `rak_reference.js`, `pk_export.py`, `import_vald.py`. |
| `tests/` | Mootori pariteet (`parity.test.js`), sisulised kontrollid (`content.test.js`), GTFS (`gtfs.test.js`), brauseri suitsutest (`ui/smoke.js`). |
| `planeeringukontroll/` | Kohila planeeringukontrolli rakenduse lähtekood, audit ja testid. |
| `docs/` | `uleandmine.md` (seis ja avatud tööd), `otsused.md` (otsuste logi), `mootor-3.md`, `gtfs.md`, `taiendus-2026-11.md`, `vordlus.md`, `kaardistus/`, `uuringud/`. |
| `CLAUDE.md` | Arendusjuhend Claude Code'ile (reeglid ja töökord). |

## Käivitamine

```
node engine.test.js            # mootori testid
node tests/content.test.js     # sisulised kontrollid
python3 build.py               # ehitab index.html
python3 -m http.server 8765    # ava http://localhost:8765
node tests/ui/smoke.js         # brauseritest (vajab Playwrighti)
```

GitHub Actions jooksutab iga muudatuse peale testid ja avaldab lehe GitHub Pagesis. Andmete uuendamise töövood: `andmed.yml` (kord kuus), `kaart.yml`, `yt.yml` ja `uuring.yml` (käsitsi).

## Andmed

Avaandmed: Statistikaamet (RV0282U, RV112U, RV49U, RVR02, RV0452, RR300, RR302, EH46U, RL21003, RL21163, RL21217), Haridussilm/EHIS, Maksu- ja Tolliamet, Transpordiamet (GTFS), © OpenStreetMapi kaastöötajad (ODbL), valdade arengukavad ja eelarvestrateegiad. Iga allika periood ja hankimise kuupäev on lehel („Andmed ja metoodika” → „Allikad”) ja failis `src/sources.js`; täielik allikakaart on `data/dictionary.json`.

## Litsents

Lähtekood: © Peeter Pallav, litsents [EUPL-1.2](LICENSE). Avaandmed kuuluvad nende avaldajatele; kaardiandmed © OpenStreetMapi kaastöötajad (ODbL).
