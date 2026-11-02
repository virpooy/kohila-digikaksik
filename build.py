"""Paneb kaksiku kokku: src/shell.html + src/app.css + engine.js + src/*.js -> index.html."""
import datetime
import pathlib
import subprocess

R = pathlib.Path(__file__).parent
APP = ["core.js", "logic.js", "sources.js", "ch_otsus.js", "ch_plan.js", "ch_kaart.js", "ch_dev.js", "main.js"]

shell = (R / "src/shell.html").read_text()
for mark in ("/*__CSS__*/", "/*__ENGINE__*/", "/*__APP__*/"):
    assert shell.count(mark) == 1, mark
app = "(function(){\n" + "\n".join((R / "src" / f).read_text() for f in APP) + "\n})();"


def build_id():
    """Ehituse identifikaator: lühike git-commit (+ "muudetud", kui src/ või engine.js on commitimata) ja UTC kuupäev."""
    day = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    try:
        run = lambda *a: subprocess.run(["git", *a], cwd=R, capture_output=True, text=True, check=True).stdout.strip()
        sha, dirty = run("rev-parse", "--short", "HEAD"), run("status", "--porcelain", "--", "src", "engine.js")
        return f"{sha}{'+muudetud' if dirty else ''} {day}"
    except Exception:
        return f"kohalik {day}"


app = app.replace("__BUILD__", build_id())
out = (shell.replace("/*__CSS__*/", (R / "src/app.css").read_text())
            .replace("/*__ENGINE__*/", (R / "engine.js").read_text())
            .replace("/*__APP__*/", app))
(R / "index.html").write_text(out)
print(f"index.html {len(out) // 1024} kB")
