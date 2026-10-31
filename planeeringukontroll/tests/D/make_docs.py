# Loob testdokumendid (eesti keeles) kataloogi fixtures/. Käivita: python3 -I make_docs.py
import os, sys
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
import docx

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
os.makedirs(OUT, exist_ok=True)
pdfmetrics.registerFont(TTFont("DJ", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))

def pdf(name, lines):
    c = canvas.Canvas(os.path.join(OUT, name), pagesize=A4); c.setFont("DJ", 11); y = 800
    for ln in lines:
        if y < 60: c.showPage(); c.setFont("DJ", 11); y = 800
        c.drawString(50, y, ln); y -= 16
    c.save()

TAOTLUS = [
    "Kohila Vallavalitsus",
    "Vabaduse tn 1, Kohila alev, 79804",
    "",
    "DETAILPLANEERINGU ALGATAMISE TAOTLUS",
    "Kuupäev: 15.01.2026",
    "",
    "Taotleja OÜ Kaseke Arendus (registrikood 12345678) esitab taotluse 15.01.2026",
    "Kase tn 7 maaüksuse detailplaneeringu koostamise algatamiseks.",
    "Planeeringuala asub Prillimäe alevikus, katastritunnus 31801:002:0456,",
    "planeeringuala pindala on ligikaudu 1,8 ha.",
    "Detailplaneeringu koostamise eesmärk on maaüksuse jagamine kuueks",
    "elamumaa krundiks ning ehitusõiguse määramine üksikelamutele.",
    "Kohila valla üldplaneeringu järgi on ala juhtotstarve väikeelamute maa.",
    "Planeeringuga kavandatakse 6 üksikelamut, kokku 6 eluruumi.",
    "Kontaktisik: Mari Maasikas, isikukood 48512304215, tel 5123 4567,",
    "e-post mari.maasikas@example.com",
    "",
    "Lisa: planeeringuala piiri skeem.",
]
pdf("Algatamise taotlus Kase tn 7.pdf", TAOTLUS)
pdf("Planeeringuala piiri skeem.pdf", ["Kase tn 7 maaüksus, Prillimäe alevik", "Planeeringuala piiri skeem M 1:1000", "Katastritunnus 31801:002:0456, pindala 1,8 ha. Skeemil on näidatud planeeringuala piir."])

d = docx.Document()
d.add_heading("Kase tn 7 maaüksuse detailplaneeringu KSH eelhinnang", 1)
for p in [
    "Koostaja: OÜ Keskkonnaekspert Näide, 20.01.2026.",
    "Eelhinnangu eesmärk on selgitada, kas Kase tn 7 maaüksuse detailplaneeringu elluviimisega kaasneb oluline keskkonnamõju.",
    "Planeeringuala asub Prillimäe alevikus, katastritunnus 31801:002:0456. Kavandatud on kuus üksikelamut.",
    "Planeeringuala ei asu Natura 2000 võrgustiku alal ega kaitstavate loodusobjektide läheduses.",
    "Järeldus: detailplaneeringu elluviimisega ei kaasne olulist keskkonnamõju, mistõttu keskkonnamõju strateegiline hindamine ei ole vajalik.",
    "Eelhinnang saadeti seisukoha võtmiseks Keskkonnaametile 22.01.2026.",
]:
    d.add_paragraph(p)
d.save(os.path.join(OUT, "KSH eelhinnang Kase tn 7.docx"))

open(os.path.join(OUT, "Algatamise korraldus Kase tn 7.txt"), "w", encoding="utf-8").write("""KOHILA VALLAVALITSUS
KORRALDUS
Kohila 12.02.2026 nr 1-3/45

Kase tn 7 maaüksuse detailplaneeringu koostamise algatamine, lähteseisukohtade andmine ja keskkonnamõju strateegilise hindamise algatamata jätmine

OÜ Kaseke Arendus esitas 15.01.2026 taotluse Kase tn 7 maaüksuse detailplaneeringu koostamise algatamiseks.
Planeeringuala asub Prillimäe alevikus (katastritunnus 31801:002:0456), pindala ligikaudu 1,8 ha.
Detailplaneeringu koostamise eesmärk on maaüksuse jagamine elamumaa kruntideks ja ehitusõiguse määramine.
Planeerimisseaduse § 128 lõike 1 alusel Kohila Vallavalitsus annab korralduse:
1. Algatada Kase tn 7 maaüksuse detailplaneeringu koostamine.
2. Jätta keskkonnamõju strateegiline hindamine algatamata.
3. Korraldust on võimalik vaidlustada 30 päeva jooksul.

Vallavanem
Vallasekretär
""")

open(os.path.join(OUT, "Teavituskiri algatamisest.txt"), "w", encoding="utf-8").write("""KOHILA VALLAVALITSUS
Nimekirja alusel                          19.02.2026 nr 7-1/45-2

Teade Kase tn 7 maaüksuse detailplaneeringu algatamisest

Kohila Vallavalitsus teatab, et 12.02.2026 korraldusega nr 1-3/45 algatati Kase tn 7 maaüksuse detailplaneeringu koostamine.
Planeeringuala asub Prillimäe alevikus. Materjalidega saab tutvuda valla veebilehel.

Lugupidamisega
planeeringute juhtivspetsialist
""")

# Teise planeeringu fail (kahe planeeringu vahetamise testiks)
open(os.path.join(OUT, "Lepa taotlus.txt"), "w", encoding="utf-8").write("""Detailplaneeringu algatamise taotlus 03.03.2026
Taotleja OÜ Lepiku Ehitus taotleb Lepa maaüksuse detailplaneeringu koostamise algatamist.
Planeeringuala asub Aespa alevikus, katastritunnus 31801:005:0101, pindala 0,9 ha.
""")
# Tühi / skaneeritud PDF (teksti pole)
c = canvas.Canvas(os.path.join(OUT, "Skaneeritud kiri.pdf"), pagesize=A4); c.rect(50, 500, 300, 200); c.save()
print("ok", sorted(os.listdir(OUT)))
