"""Planeeringukontrolli DP-d kaksikusse (etapp 3, E9).
Sisend: planeeringukontrolli andmebaasi kogumi "dp" JSON-failid (ArtifactData list → out_dir).
Väljund: data/dp.json — ainult koondinfo: nimi, asula, etapp, eesmärk, eluruumid (meta.moju). Taotlejat, katastrit ega isikuid ei kopeerita.
Kasutus: python3 tools/pk_export.py <kaust> """
import json, glob, sys, re, datetime
src = sys.argv[1]
STAGES = [("kehtestamine", "kehtestatud"), ("vastuvotmine", "vastu võetud"), ("algatamine", "algatatud")]
out = []
for f in sorted(glob.glob(src + "/*.json")):
    d = json.load(open(f)); m = d.get("meta", {}); dt = d.get("dates", {})
    asukoht = (m.get("asukoht") or "").split(",")
    asula = asukoht[0].strip() if asukoht else ""
    vald = asukoht[1].strip() if len(asukoht) > 1 else ""
    st = next((lab for k, lab in STAGES if dt.get(k)), "algatamisel")
    mj = m.get("moju") or {}
    n = {k: mj.get(k) for k in ("eramu", "ridaelamu", "korter") if mj.get(k)}
    eesm = (m.get("eesmark") or "").strip()
    out.append({"id": d.get("id") or f.split("/")[-1][:-5], "name": d.get("name", ""), "asula": asula, "vald": vald,
                "stage": st, "dates": {k: dt[k] for k in ("algatamine", "vastuvotmine", "kehtestamine") if dt.get(k)},
                "goal": eesm[:220], "housing": bool(re.search(r"elamu|elamumaa|elamukrun", eesm, re.I)),
                "units": n, "start": mj.get("start"), "years": mj.get("years")})
json.dump({"_doc": "Planeeringukontrolli detailplaneeringud (tools/pk_export.py). units = eluruumid tüübi järgi planeeringukontrolli väljalt meta.moju; tühi = sisestamata.",
           "updated": datetime.date.today().isoformat(), "rows": out}, open("data/dp.json", "w"), ensure_ascii=False, indent=1)
print(len(out), "DP-d")
