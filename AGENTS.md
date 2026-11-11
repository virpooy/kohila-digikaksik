# AGENTS.md – Kohila digikaksik

Juhend AI-agentidele (Codex jt). **Kanooniline juhend on [`CLAUDE.md`](CLAUDE.md)** – loe see täielikult läbi enne iga tööd, seejärel `docs/uleandmine.md` (seis, avatud ülesanded, teadaolevad vead). Kõik `CLAUDE.md` reeglid kehtivad ka sulle. Kui see fail ja `CLAUDE.md` erinevad, kehtib `CLAUDE.md`. Vasta ja kirjuta eesti keeles.

Omanik ja otsustaja: **Peeter Pallav** (GitHub `virpooy`).

## Püsireeglid lühidalt (täistekst `CLAUDE.md`-s)

1. Isikuandmeid ei kasutata; alla 5 inimesega lahter peidetakse.
2. AI ei arvuta ühtegi numbrit: kõik arvud tulevad `engine.js`-ist või andmefailidest.
3. Andmeid ei mõelda välja: puuduv = „puudub” (`Logic.NA`), mitte 0.
4. Iga arv on märgistatud: ühik, periood, allikas (`src/sources.js` `SRC`), päritolumärgis.
5. Järeldused on tingimuslikud.
6. Mootori numbreid ei muudeta ilma Peetri kinnituseta; pariteeditest peab läbima.
7. Mootoris ei ole ühtegi valla nime (vallad tulevad `data/kov.json`-ist).
8. Eelnõude tekstianalüüs (NLP) ei kuulu kaksikusse.
9. Põhimudelit `virpooy/raplamaa-arengumudel` siit ei muudeta.
10. Hindamiskava lävendeid ei muudeta pärast tulemuste nägemist.

## Käsud

```
node engine.test.js            # enesetestid + pariteet – peab läbima enne iga commit'i
node tests/content.test.js     # sisulised kontrollid
python3 build.py               # ehitab index.html (Windowsis: PYTHONUTF8=1 python build.py)
python3 -m http.server 8765    # leht: http://localhost:8765
node tests/ui/smoke.js         # brauseritest (npm install --no-save playwright; npx playwright install chromium)
```

## Töökord

- Uus `src/*.js` tuleb lisada `build.py` `APP` loendisse.
- Arvutus `engine.js`-i või `src/logic.js`-i koos testiga; peatükifailid ainult kuvavad.
- Väikesed eestikeelsed commit'id; suurem töö eraldi harus + PR. Töövood lükkavad ise `main`-i, seega enne push'i alati `git pull --rebase`.
- Sisuline otsus → `docs/otsused.md`. Hoia `README.md` ja `docs/uleandmine.md` ajakohased.
- Ära commit'i saladusi ega `node_modules/`.
