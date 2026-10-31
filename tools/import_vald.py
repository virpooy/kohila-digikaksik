"""Valla koondandmete import (etapp 5). Vald koondab andmed ise; isikuandmeid ei võeta vastu.
Kasutus: python3 tools/import_vald.py <vald_id> <rahvastik.csv> [kohad.csv]
Kontrollid: ainult lubatud veerud; iga lahter >= 5 (väiksem lahter ühendatakse asula ridadest „Muud külad” alla või lükatakse tagasi);
vanuserühmad 0-4 … 85+. Väljund: data/vald/<vald_id>.json"""
import csv, json, sys, os, datetime
GR = ["0-4","5-9","10-14","15-19","20-24","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-64","65-69","70-74","75-79","80-84","85+"]
def read(p, cols):
    rows = list(csv.DictReader(open(p, encoding="utf-8-sig"), delimiter=";"))
    bad = [c for c in rows[0].keys() if c not in cols] if rows else []
    if bad: sys.exit("Lubamatud veerud: " + ", ".join(bad) + " (lubatud: " + ", ".join(cols) + ")")
    return rows
vid, fp = sys.argv[1], sys.argv[2]
R = read(fp, ["asula", "vanuserühm", "elanikke", "seisuga"])
pop, small = {}, []
for r in R:
    if r["vanuserühm"] not in GR: sys.exit("Tundmatu vanuserühm: " + r["vanuserühm"])
    n = int(r["elanikke"] or 0); a = r["asula"].strip()
    pop.setdefault(a, [0] * 18)[GR.index(r["vanuserühm"])] += n
# väikeste lahtrite reegel: asula, kus mõni lahter on 1–4, liidetakse ridaga „Muud külad”
out = {"Muud külad": [0] * 18}
for a, v in pop.items():
    if any(0 < x < 5 for x in v) and a != "Muud külad": small.append(a); out["Muud külad"] = [x + y for x, y in zip(out["Muud külad"], v)]
    else: out[a] = [x + y for x, y in zip(out.get(a, [0] * 18), v)]
if any(0 < x < 5 for x in out["Muud külad"]): sys.exit("Ka koondrida „Muud külad” sisaldab alla 5 inimesega lahtreid: palun koondage vanuserühmad vallas enne üleandmist.")
res = {"vald": vid, "seisuga": R[0]["seisuga"], "imporditud": datetime.date.today().isoformat(), "rahvastik": out, "koondatud_asulad": small}
if len(sys.argv) > 3:
    K = read(sys.argv[3], ["asutus", "liik", "asula", "kohti", "lapsi_voi_opilasi", "seisuga"])
    res["kohad"] = [{"asutus": k["asutus"], "liik": k["liik"], "asula": k["asula"], "kohti": int(k["kohti"] or 0), "lapsi": int(k["lapsi_voi_opilasi"] or 0)} for k in K]
os.makedirs("data/vald", exist_ok=True); json.dump(res, open(f"data/vald/{vid}.json", "w"), ensure_ascii=False, indent=1)
print(f"{vid}: {len(out)} asulat, koondatud {len(small)} (väikesed lahtrid)" + (f", {len(res.get('kohad', []))} asutust" if "kohad" in res else ""))
