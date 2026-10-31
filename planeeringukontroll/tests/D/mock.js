// window.claude runtime mock: db, user, downloads, sample. Injected with ctx.addInitScript(installMock, opts).
// opts: {dbSeed:[{id, ...data}], user:{id,name}, persist:true}
// Runtime knobs (window.__mock): fail.set / fail.del / fail.snapshot (error code string), sampleFail (code), sampleDelay ms,
//   prompts[] (every prompt sent to sample), downloads[] ({filename, type, b64}), writes[] (db.set log), readOnly
function installMock(opts) {
  opts = opts || {};
  const M = window.__mock = { fail: {}, prompts: [], downloads: [], writes: [], sampleDelay: 60, sampleFail: null, readOnly: false, listeners: [] };
  const DBKEY = "__mock_db__";
  let store = {};
  try { const raw = localStorage.getItem(DBKEY); if (raw) store = JSON.parse(raw); } catch (e) {}
  if (!Object.keys(store).length && opts.dbSeed) opts.dbSeed.forEach(r => { const { id, ...d } = r; store[id] = d; });
  const persist = () => { try { localStorage.setItem(DBKEY, JSON.stringify(store)); } catch (e) {} };
  persist();
  const clone = o => JSON.parse(JSON.stringify(o));
  const snap = () => ({ docs: Object.keys(store).map(id => ({ id, data: () => clone(store[id]) })) });
  const notify = () => M.listeners.forEach(l => { try { l.cb(snap()); } catch (e) { console.warn("mock listener", e); } });
  M.store = () => clone(store);
  M.notify = notify;
  M.putRemote = (id, data) => { store[id] = clone(data); persist(); notify(); };   // kolleegi muudatus
  const err = code => { const e = new Error(code); e.code = code; return e; };
  const db = {
    collection(name) {
      return {
        onSnapshot(cb, errcb) {
          const l = { cb, errcb }; M.listeners.push(l);
          setTimeout(() => { if (M.fail.snapshot) errcb && errcb(err(M.fail.snapshot)); else cb(snap()); }, 30);
          return () => { M.listeners = M.listeners.filter(x => x !== l); };
        },
        async get() { return snap(); }
      };
    },
    doc(path) {
      const id = String(path).split("/").pop();
      return {
        async set(body) {
          await new Promise(r => setTimeout(r, 20));
          if (M.fail.set) throw err(M.fail.set);
          M.writes.push({ id, at: Date.now(), name: body && body.name, size: JSON.stringify(body).length });
          store[id] = clone(body); persist(); notify();
        },
        async get() { return { exists: !!store[id], id, data: () => store[id] ? clone(store[id]) : undefined }; },
        async delete() {
          await new Promise(r => setTimeout(r, 20));
          if (M.fail.del) throw err(M.fail.del);
          delete store[id]; persist(); notify();
        }
      };
    }
  };
  const me = (opts.user && opts.user.id) || "u-test-1";
  const user = {
    async id() { return me; },
    async can(p) { return !M.readOnly; },
    async profiles(ids) { const o = {}; (ids || []).forEach(i => { o[i] = { name: i === me ? ((opts.user && opts.user.name) || "Testija Ametnik") : "Kolleeg Kaasik" }; }); return o; }
  };
  const blobToB64 = b => new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(",")[1] || ""); fr.onerror = no; fr.readAsDataURL(b); });
  const downloads = {
    async save({ filename, data }) {
      if (M.fail.download) throw err(M.fail.download);
      const b = data instanceof Blob ? data : new Blob([data]);
      M.downloads.push({ filename, type: b.type, size: b.size, b64: await blobToB64(b), at: Date.now() });
      return true;
    }
  };
  // ---- sample (Claude) ----
  const docsIn = p => { const out = []; const re = /=== DOKUMENT: (.+?) \(etapp: [^;]+; liik: [^)]+\)(?: \[[^\]]*\])? ===\n([\s\S]*?)(?=\n\n=== DOKUMENT: |$)/g; let m; while ((m = re.exec(p))) out.push({ name: m[1], text: m[2] }); return out; };
  const quoteFrom = (docs, rx) => { for (const d of docs) { const ln = d.text.split(/\n/).map(x => x.trim()).find(x => rx.test(x) && x.split(/\s+/).length >= 5); if (ln) return { q: ln.split(/\s+/).slice(0, 14).join(" "), doc: d.name }; } return null; };
  const delay = async (o) => {
    const ms = M.sampleDelay; const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (o && o.signal && o.signal.aborted) throw err("cancelled"); await new Promise(r => setTimeout(r, 10)); }
    if (o && o.signal && o.signal.aborted) throw err("cancelled");
    if (M.sampleFail) throw err(M.sampleFail);
  };
  const CANNED = {
    taotleja: "OÜ Kaseke Arendus", taotlusKp: "15.01.2026", koostaja: "OÜ Planeeringubüroo Näide", eelhKoostaja: "OÜ Keskkonnaekspert Näide, 20.01.2026",
    asutused: "Keskkonnaamet", eesmark: "maaüksuse jagamine elamumaa kruntideks\nehitusõiguse määramine üksikelamutele",
    yp: "Kohila valla üldplaneeringu järgi on ala juhtotstarve väikeelamute maa.", tooNr: "DP-2026-07", regNr: "",
    kooskolastused: "Päästeameti Lääne päästekeskus – 10.03.2026 nr 7.2-3/123\nTranspordiamet – 12.03.2026 nr 7.1-2/26/456",
    arvamused: "Naaber A – soovis hoonestusala nihutamist – arvestati", arvestamata: "", lahendus: "Moodustatakse 6 elamumaa krunti.",
    ehitusoigus: "Krunt 1, elamumaa, 1 üksikelamu + 1 abihoone, ehitisealune pind 250 m², 2 korrust, kõrgus 8,5 m"
  };
  const sample = async function (prompt, o) {
    M.prompts.push({ kind: "text", prompt, at: Date.now() }); await delay(o);
    const text = "Materjalide järgi on algatamise taotlus esitatud [PlanS-128-4]. Vt ka [PlanS-999-9].";
    if (o && o.onText) o.onText({ text });
    return { text };
  };
  sample.json = async function (prompt, o) {
    M.prompts.push({ kind: "json", prompt, at: Date.now() }); await delay(o);
    const docs = docsIn(prompt);
    if (/^Loe allolevatest detailplaneeringu algatamise materjalidest/.test(prompt)) {
      return { name: "Kase tn 7 maaüksuse detailplaneering", taotleja: "OÜ Kaseke Arendus", taotlus: "15.01.2026", asukoht: "Prillimäe alevik, Kohila vald",
        kataster: "31801:002:0456", pindala: "1,8 ha", eesmark: "maaüksuse jagamine elamumaa kruntideks ja ehitusõiguse määramine",
        juhtotstarve: "väikeelamute maa", ypmuutmine: "ei", eelh: "antud", ksh: "ei", eluruumid_eramu: "6", eluruumid_ridaelamu: "", eluruumid_korter: "",
        koostaja: "OÜ Planeeringubüroo Näide" };
    }
    if (/^Loe allolevatest detailplaneeringu materjalidest välja andmed/.test(prompt)) {
      const m = /võtmetega: (.+?), _allikad, _tsitaadid\./.exec(prompt); const keys = m ? m[1].split(/,\s*/) : [];
      const out = { _allikad: {}, _tsitaadid: {} };
      const qq = quoteFrom(docs, /Kase tn 7|OÜ Kaseke|Prillimäe|eelhinnang|ehitusõigus/i) || (docs[0] ? { q: docs[0].text.split(/\s+/).slice(0, 10).join(" "), doc: docs[0].name } : null);
      keys.forEach((k, i) => {
        if (k.startsWith("kp_")) { if (k === "kp_algatamine" && /12\.02\.2026/.test(prompt)) out[k] = "2026-02-12"; return; }
        const v = CANNED[k]; if (v === undefined) return;
        out[k] = v;
        if (qq) { out._allikad[k] = qq.doc; out._tsitaadid[k] = (k === "koostaja") ? "seda lauset dokumendis kindlasti ei ole olemas" : qq.q; }
      });
      return out;
    }
    if (/^Leia detailplaneeringu materjalidest menetluse sündmuste kuupäevad/.test(prompt)) {
      const sund = [];
      if (/- algatamine:/.test(prompt) && /12\.02\.2026 nr 1-3\/45/.test(prompt)) sund.push({ voti: "algatamine", kuupaev: "2026-02-12", tsitaat: "Kohila 12.02.2026 nr 1-3/45", dokument: "Algatamise korraldus Kase tn 7.txt" });
      if (/- kshEelhinnang:/.test(prompt) && /22\.01\.2026/.test(prompt)) sund.push({ voti: "kshEelhinnang", kuupaev: "2026-01-22", tsitaat: "Eelhinnang saadeti seisukoha võtmiseks Keskkonnaametile 22.01.2026.", dokument: "KSH eelhinnang Kase tn 7.docx" });
      if (/- algatamiseAT:/.test(prompt)) sund.push({ voti: "algatamiseAT", kuupaev: "2026-02-20", tsitaat: "Teade avaldati Ametlikes Teadaannetes 20.02.2026", dokument: "Teavituskiri algatamisest.txt" });
      return { sundmused: sund };
    }
    if (/^Vasta detailplaneeringu materjalide põhjal küsimusele/.test(prompt)) {
      const qq = quoteFrom(docs, /üldplaneering|keskkonnamõju|juhtotstarve/i);
      return { vastus: "jah", pohjendus: "Materjalide järgi on ala juhtotstarve väikeelamute maa.", tsitaat: qq ? qq.q : "", dokument: qq ? qq.doc : "" };
    }
    if (/^Oled Eesti planeerimisõiguse ekspert ja Kohila valla/.test(prompt)) {
      const qq = quoteFrom(docs, /Kase tn 7|taotlus/i);
      return { kokkuvote: "Testanalüüs: materjalid on üldjoontes olemas.", leiud: [
        { valdkond: "Menetlus", hinnang: "puudus", pealkiri: "Kontrolli: kas piiri skeem on lisatud", selgitus: "Ei leidnud skeemi.", alus: ["PlanS-128-5"], toend: qq ? qq.q : "", dokument: qq ? qq.doc : "", soovitus: "Lisa skeem" },
        { valdkond: "KSH", hinnang: "vastab", pealkiri: "Kontrolli: KSH eelhinnang", selgitus: "Leidsin eelhinnangu.", alus: ["KeHJS-33-6", "PlanS-999-1"], toend: "seda tsitaati pole", dokument: "x", soovitus: "" }],
        puuduvad_dokumendid: ["Planeeringuala piiri skeem"], lisauuringud: ["Geodeetiline alusplaan"] };
    }
    if (/^Võrdle rakenduse koostatud/.test(prompt)) return { erinevused: [] };
    return {};
  };
  const caps = { db, user, downloads, sample };
  window.claude = { use: async name => { if (M.fail["use_" + name]) throw err(M.fail["use_" + name]); return caps[name] || null; } };
}
module.exports = { installMock };
