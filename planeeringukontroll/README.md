# Kohila planeeringukontroll – lähtekood, audit ja testid

`index.html` on avaldatud rakenduse (claude.ai artefakt) lähtekood, versioon 35 (31.10.2026).
Rakenduse planeeringuandmed on artefakti andmebaasis, mitte siin.

- `audit/` – 31.10.2026 auditi aruanded: A tähtajad ja seadus, B etapid ja olekud, C eelnõud ja teated, D kasutajateekonnad, RT_kontroll (Riigi Teataja kehtiva teksti kontroll).
- `PARANDUSED.md` – iga leiu parandus ja testi tulemus.
- `tests/run_all.js <html>` – regressioonitestid (101 kontrolli).
- `tests/D/run_all.js <html>` – kasutajateekonnad brauseris (190 kontrolli; vajab kausta `tests/D/vendor/cdn` teekidega docx 9.5.1, mammoth 1.8.0, pdfjs-dist 3.11.174, jszip 3.10.1, mis siia ei ole lisatud).
