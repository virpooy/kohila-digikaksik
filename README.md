# Kohila digikaksik

Kohila valla digitaalse kaksiku arvutusmootor ja eelmudel (mootor 2.0.0). Mudel ühendab rahvastiku üheaastaste vanuste kohordimudeli (sama mis Raplamaa arengukangas v6), haridusvajaduse, tulumaksu, ühikukulud, investeeringuvajaduse, võla raja, tasandusfondi ja asulakihi ning kontrollib end tagantjärele prognoosiga (2021→2026).

**Põhimõtted**
- Isikuandmeid ei kasutata. Sisendiks on ainult koondandmed; alla 5 inimesega lahtrid peidetakse.
- Kõik numbrid arvutab deterministlik mootor (`engine.js`). AI numbreid ei arvuta.
- Tööriist aitab otsuseid ette valmistada; otsuse ja selle sisu eest vastutab pädev ametnik või organ.

## Ülesehitus

| Fail | Sisu |
|---|---|
| `engine.js` | Arvutusmootor (TwinEngine). Puhtad funktsioonid, töötab brauseris ja Node'is. |
| `engine.test.js` | Enesetestid T1–T15: põhimudeli võrdlus (`data/reference.json`), mõjukanga võrdlus ja otsuste E1–E10 kontroll. |
| `tools/rak_reference.js` | Koostab `data/reference.json` otse Raplamaa arengukanga lähtekoodist: `node tools/rak_reference.js <raplamaa-arengumudel kaust> > data/reference.json`. |
| `index.src.html` | Veebilehe lähtefail; `build.py` lisab mootori ja kirjutab `index.html`. |
| `data/` | Koondandmed: `kov.json` (omavalitsuste seadistus), `pop`, `fin`, `edu`, `ext`, `settlements`, `peers`, andmesõnastik `dictionary.json`, kasutusjuhud `usecases.json`. |
| `docs/otsused.md` | Otsuste logi. |
| `docs/vordlus.md` | Viie eelmudeli võrdlus, otsused E1–E10 ja etapi 2 tulemus. |
| `docs/kaardistus/` | Eelmudelite üksikasjalikud kaardistused ja Kohila arengumudeli vastuolude audit. |

## Käivitamine

```
node engine.test.js     # testid
python3 build.py        # ehitab index.html
python3 -m http.server  # ava http://localhost:8000
```

GitHub Actions jooksutab iga muudatuse peale testid ja avaldab lehe GitHub Pagesis.

## Andmed

Avaandmed: Statistikaamet (RV0282U, RV112U, RV49U, RVR02, RV0452, RR300, RR302, EH46U, RL21003, RL21163, RL21217), Haridussilm, Maksu- ja Tolliamet, valdade eelarvestrateegiad. Täielik allikakaart on failis `data/dictionary.json`.

## Litsents

Lähtekood: © Peeter Pallav, litsents [EUPL-1.2](LICENSE). Avaandmed kuuluvad nende avaldajatele.
