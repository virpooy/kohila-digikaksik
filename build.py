"""Paneb kaksiku kokku: src/shell.html + src/app.css + engine.js + src/*.js -> index.html."""
import pathlib

R = pathlib.Path(__file__).parent
APP = ["core.js", "ch_otsus.js", "ch_plan.js", "ch_kaart.js", "ch_dev.js", "main.js"]

shell = (R / "src/shell.html").read_text()
for mark in ("/*__CSS__*/", "/*__ENGINE__*/", "/*__APP__*/"):
    assert shell.count(mark) == 1, mark
app = "(function(){\n" + "\n".join((R / "src" / f).read_text() for f in APP) + "\n})();"
out = (shell.replace("/*__CSS__*/", (R / "src/app.css").read_text())
            .replace("/*__ENGINE__*/", (R / "engine.js").read_text())
            .replace("/*__APP__*/", app))
(R / "index.html").write_text(out)
print(f"index.html {len(out) // 1024} kB")
