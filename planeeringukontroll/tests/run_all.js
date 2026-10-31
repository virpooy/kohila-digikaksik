// Regressioonitestid: node tests/run_all.js <html>   (vaikimisi ../index.html)
// Iga kontroll prindib PASS/FAIL ja lõpus kokkuvõtte. Fail jääb muutmata – testikonks lisatakse ainult serveeritavasse koopiasse.
const path=require("path"), fs=require("fs");
const {launch}=require("./lib.js");
const FILE=path.resolve(process.argv[2]||path.join(__dirname,"..","index.html"));
const DP=path.join(__dirname,"..","..","audit","dpdata","dp");
const REC=fs.existsSync(DP) ? fs.readdirSync(DP).filter(f=>f.endsWith(".json")).map(f=>{ const d=JSON.parse(fs.readFileSync(path.join(DP,f),"utf8")); return {id:f.replace(/\.json$/,""), ...(d.data||d)}; }) : [];
const KONKSU=REC.find(r=>/Konksu/.test(r.name||""));

const ALG_FULL={taotlus:"2025-01-10",kshEelhinnang:"2025-01-20",algatamine:"2025-02-05",algatamiseAT:"2025-02-12",algatamiseTeade:"2025-02-20",algatamiseIsikud:"2025-02-25",kshTeade:"2025-02-12",kshTeadeLeht:"2025-02-20"};
const VV_FULL={kooskSaadetud:"2025-06-01",arvamusSaadud:"2025-06-20",arvamusVastus:"2025-07-05",kooskolastusViimane:"2025-07-10",vastuvotmine:"2025-08-01",valjapanekTeade:"2025-08-10",valjapanekAlgus:"2025-08-15"};
const KEHT_FULL={valjapanekLopp:"2025-08-28",arvamusteVastus:"2025-09-15",aruteluTeade:"2025-09-20",arutelu:"2025-10-06",aruteluTulemus:"2025-10-20",kehtestamine:"2025-12-01",kehtestamiseAT:"2025-12-05",kehtestamiseTeade:"2025-12-10",kehtestamiseKataster:"2025-12-05",kehtestamiseAndmekogu:"2025-12-05",kehtestamiseIsikud:"2025-12-05"};
const BASEMETA={taotleja:"Näidis Arendus OÜ",asukoht:"Lepiku tn 5, Kohila alev",kataster:"31701:001:1234",pindala:"0,9 ha",eesmark:"Kinnistu jagamine kolmeks elamumaa krundiks",juhtotstarve:"väikeelamute maa",ypmuutmine:"ei",ksh:"ei",eelh:"antud",akt:"korraldus"};

// Abifunktsioonid lehe sees (eval rakenduse skoobis)
const PRELUDE=`window.__mk=(meta,dates,x)=>{ S=prep(JSON.parse(JSON.stringify({...blank(), ...(x||{}), meta:{...blank().meta, eelh:"antud", ...(meta||{})}, dates:{...(dates||{})}}))); applyProc(); return S; };
window.__act=(st)=>blocksText(actBlocks(st)); window.__memo=(st)=>blocksText(memoBlocks(st)); window.__rr=(st)=>Object.fromEntries(ruleResults(st).map(r=>[r.id,r]));
window.__pend=()=>pendingDeadlines(S.dates,S.meta,S.ext); return 1;`;
const mk=(meta,dates,x)=>`__mk(${JSON.stringify(meta||{})},${JSON.stringify(dates||{})},${JSON.stringify(x||{})});`;
const M=(m)=>({...BASEMETA,...m});

const C=[];  // [id, kirjeldus, kood]
const add=(id,t,code,special)=>C.push([id,t,code,special]);

/* ---------- A: tähtajad ---------- */
add("A1","Reegli redaktsioon valitakse kontrollitava toimingu kuupäeva järgi (mitte algatamise järgi)",
 `const r={id:"t",op:"before",from:"valjapanekTeade",to:"valjapanekAlgus",valid:{alates:null,kuni:"2026-06-14"},refs:[]};
  const old=inForce(r,{algatamine:"2025-03-01",valjapanekTeade:"2026-07-01",valjapanekAlgus:"2026-07-05"}), cur=inForce({...r,valid:{alates:"2026-06-14",kuni:null}},{algatamine:"2025-03-01",valjapanekTeade:"2026-07-01",valjapanekAlgus:"2026-07-05"});
  return {ok: old===false && cur===true, info:{old,cur}};`);
add("A2","ÜP-ta ala DP: väljapanek 30 päeva (reegel, eelnõu tekst, v5)",
 `${mk(M({liik:"yp_puudub"}),{vastuvotmine:"2026-01-01",valjapanekAlgus:"2026-01-10",valjapanekLopp:"2026-01-29"})}
  const t=__act("vv"), v5=computedCheck("valjapanekKestus","vv");
  return {ok: valjapanekNeed()===30 && /vähemalt 30 päeva/.test(t) && v5.status==="bad", info:{need:valjapanekNeed(), v5:v5.status}};`);
add("A2b","KSH-ga DP (ka KSH väärtusega „?” liigi tava_ksh korral pärast muutmist): väljapanek 30 päeva",
 `${mk(M({ksh:"jah"}))} const a=valjapanekNeed(); ${mk(M({ksh:"ei"}))} const b=valjapanekNeed(); return {ok:a===30&&b===14, info:{a,b}};`);
add("A3","ÜP-menetluses on eelnõu väljapaneku teate, eelnõu arutelu teate ja avaliku arutelu teate kontroll",
 `${mk(M({ypmuutmine:"jah",akt:"otsus"}))} const ids=RULES.filter(r=>inProc(r)).map(r=>r.to+"<"+r.from); return {ok: ["y_evAlgus<y_evTeade","y_evArutelu<y_evAruteluTeade","arutelu<aruteluTeade"].every(x=>ids.includes(x)), info:ids.filter(x=>/Teade/.test(x))};`);
add("A4","Teises voorus kontrollitakse väljapaneku teadet",
 `${mk(M({voorud:2}),{...ALG_FULL,vastuvotmine:"2025-08-01",valjapanekAlgus:"2025-08-15",valjapanekLopp:"2025-08-28",valjapanekTeade2:"2026-09-02",valjapanekAlgus2:"2026-09-01",valjapanekLopp2:"2026-09-20"})}
  const r=__rr("keht"); return {ok: !!DATE_FIELDS.valjapanekTeade2 && r.r2b && r.r2b.status==="bad" && isBlockRule(r.r2b), info:r.r2b&&r.r2b.status};`);
add("A5","3 aasta kontroll ilma taotluse kuupäevata annab hoiatuse (mitte „ei kohaldu”)",
 `${mk(M(),{algatamine:"2023-01-10"})} const c=computedCheck("kolmAastat","keht"); return {ok:c.status==="risk", info:c};`);
add("A6","KSH algatamata jätmise teade: ajaleht ja isikud 30 päeva (§ 128 lg 8¹)",
 `${mk(M(),{algatamine:"2026-03-02",kshTeade:"2026-03-10",kshTeadeLeht:"2026-03-25"})} const r=__rr("alg"); return {ok: r.r1e && r.r1e.status==="ok" && r.r1d.status==="ok" && r.r1e.days===30, info:[r.r1d?.status,r.r1e?.status]};`);
add("A7","Algatamise 30 päeva tähtaeg nihkub puhkepäevalt",
 `${mk(M(),{taotlus:"2026-01-02",algatamine:"2026-02-02"})} const r=__rr("alg").r0; return {ok:r.status==="ok", info:r.detail};`);
add("A8","Aastatähtaeg (3 a) nihkub puhkepäevalt tööpäevale",
 `${mk(M(),{taotlus:"2023-10-31",kehtestamine:"2026-11-02"})} const r=__rr("keht").r12; const due=ruleDue(r,{taotlus:"2023-10-31"}); return {ok:r.status==="ok" && due==="2026-11-02", info:[r.status,due]};`);
add("A9","29.02 + 3 aastat = 28.02; kõik sisemised tähtajatestid läbivad",
 `const d=runDlTests(); return {ok: addYears("2024-02-29",3)==="2027-02-28" && d.fails.length===0, info:d.fails};`);
add("A10","DP muutmine: 1 aasta liigaasta korral",
 `${mk({liik:"dpm"},{taotlus:"2027-03-01",kehtestamine:"2028-03-01"})} const r=__rr("keht").d5; return {ok:r&&r.status==="ok", info:r&&r.detail};`);
add("A11","Kinnitamata sättel põhinev ÜP-menetluse tähtaeg on märgitud kinnitamata",
 `${mk(M({ypmuutmine:"jah",akt:"otsus"}),{y_evAlgus:"2026-01-01",y_evLopp:"2026-02-15"})} const r=__rr("vv").y5; return {ok:r.status==="ok" && r.unverified===true && /kinnitamata/.test(r.detail), info:r.detail};`);
add("A12","Kui arvamusi ei esitatud, ei ole seisukohtade tähtaega töölaual",
 `${mk(M({arvamused:"pole"}),{...ALG_FULL,...VV_FULL,valjapanekLopp:"2026-10-01"})} return {ok:!__pend().some(x=>x.rule.id==="r4"), info:__pend().map(x=>x.rule.id)};`);
add("A13","Kui kõiki arvamusi arvestati, ei jää arutelu-tulemuste reegel igaveseks „andmed puudu”",
 `${mk(M({arvamused:"koik"}),{...ALG_FULL,...VV_FULL,valjapanekLopp:"2025-08-28"})} return {ok:!("r6" in __rr("keht")) && !pipeSteps().some(x=>x.k==="aruteluTulemus"&&x.st==="wait"), info:Object.keys(__rr("keht"))};`);
add("A14","Tähtaja nihke viide: TsÜS § 136 lg 6",`return /TsÜS § 136 lg 6/.test(SHIFT_NOTE);`);
add("A15","§ 139 lg 7 juures on kohaldamise märge (alates 01.01.2027)",`return /2027/.test(REG["PlanS-139-7"].s);`);
add("A16","Eelnõu koostamises ei ole kättesaamatut koodi",`return actBlocks.toString().length<600;`);
add("A17","Kooskõlastuse 30 päeva arvestatakse kättesaamisest (märge sildil)",`${mk(M())} return /kättesaamisest/.test(RULES.find(r=>r.id==="r9b").label);`);

/* ---------- B: etapid ja olekud ---------- */
add("B1","Menetlusliik järgib planeeringu andmeid (vorm/Claude) ja akt muutub volikogu otsuseks",
 `${mk(M(),{taotlus:"2026-10-01"})} applyMeta({ypmuutmine:"jah",ksh:"jah"},"Claude"); const a=[liikOf(),famOf(),S.meta.akt];
  ${mk(M({ypmuutmine:"jah",liik:"tava",akt:"korraldus"}))} const b=liikOf();
  return {ok: a[0]==="ypm_ksh" && a[1]==="yp" && a[2]==="otsus" && b==="ypm", info:{a,b}};`);
add("B2","Vale pädevus on kriitiline viga igas etapis ja nähtav lihtvaates",
 `${mk(M({ypmuutmine:"jah",liik:"tava",akt:"korraldus"}),{taotlus:"2025-01-10",algatamine:"2025-02-05",vastuvotmine:"2025-08-01",valjapanekAlgus:"2025-08-15",valjapanekLopp:"2025-09-14"})}
  UIMODE="simple"; applyMode(); renderAll(); const r={}; for(const st of ["alg","vv","keht"]){ r[st]=blockers(st).some(b=>b.id==="padevus"); } go("kehtestamine"); const txt=document.querySelector("#stBrief").innerText;
  UIMODE="full"; applyMode(); return {ok: r.alg&&r.vv&&r.keht && /Pädevus/.test(txt) && /volikogu otsus/.test(txt), info:{r,txt:txt.slice(0,200)}};`);
add("B3","Pärast kehtestamist ei ole eelmiste sammude puudumine „üle tähtaja”, aga kehtestamise teavitused jäävad",
 `${mk(M(),{...ALG_FULL,...VV_FULL,...KEHT_FULL,valjapanekTeade:"",arvamusteVastus:"",aruteluTulemus:"",kehtestamiseAndmekogu:""})}
  const ids=__pend().map(x=>x.rule.id), lamp=lampOf({dates:S.dates,meta:S.meta}), pipe=pipeSteps().filter(x=>/üle/.test(x.info)).map(x=>x.k);
  return {ok: !ids.some(i=>["r2","r4","r6"].includes(i)) && ids.includes("r7d") && lamp.st==="bad" && /Kehtestatud/.test(lamp.t) && pipe.every(k=>k==="kehtestamiseAndmekogu"), info:{ids,lamp,pipe}};`);
add("B4","DP-d muutva DP etapid: avatud menetluse sammud pärast kehtestamist ei ole hilinenud",
 `${mk({liik:"dpm"},{taotlus:"2025-03-01",algatamine:"2025-04-01",d_teade:"2025-04-10",d_valjAlgus:"2025-04-15",d_valjLopp:"2025-05-15",d_ettepTahtaeg:"2025-05-15",kooskSaadetud:"2025-04-20",arvamusSaadud:"2025-05-10",kehtestamine:"2025-09-01",kehtestamiseTeade:"2025-09-10",kehtestamiseKataster:"2025-09-05",kehtestamiseAndmekogu:"2025-09-05",kehtestamiseIsikud:"2025-09-05"})}
  const ids=__pend().map(x=>x.rule.id), p=pipeSteps().find(x=>x.k==="arvamusVastus"); return {ok: !ids.includes("d4") && p && p.st==="miss", info:{ids,p:p&&p.st}};`);
add("B5","Puuduv teate kuupäev pärast väljapaneku algust: sama olek kõigis vaadetes",
 `${mk(M(),{taotlus:"2025-01-10",algatamine:"2025-02-05",kooskolastusViimane:"2026-07-10",vastuvotmine:"2026-10-01",valjapanekAlgus:"2026-10-20",valjapanekLopp:"2026-11-20"})}
  const r=__rr("vv").r2, p=__pend().find(x=>x.rule.id==="r2"), pi=pipeSteps().find(x=>x.k==="valjapanekTeade"), n=noticeDue(NOTICES.find(n=>n.id==="vv_valjapanek"));
  return {ok: r.status==="risk" && p && p.status==="risk" && pi.st==="miss" && n.status==="risk" && /sisestamata/.test(n.text), info:{r:r.status,p:p&&p.status,pi:pi.st,n:n.status}};`);
add("B6","Arvamusi ei esitatud: seisukohad, arutelu protokoll ja tulemuste tõend ei ole nõutud; kõik arvestati: protokolli ei nõuta",
 `${mk(M({arvamused:"pole"}))} const a=docResults("keht").filter(x=>["arvamused","arvamuste_seisukohad","arutelu","tulemused"].includes(x.k)).map(x=>x.status);
  ${mk(M({arvamused:"koik"}))} const b=docResults("keht").find(x=>x.k==="arutelu").status; return {ok:a.every(s=>s==="na") && b==="na", info:{a,b}};`);
add("B7","Registrist avamine ilma tekstideta ei muuda dokumentide mahtu ega olekut registris",
 `const rec=ARG; REGDOCS=[{...rec, id:rec.id}]; try{ localStorage.removeItem("kohila-dp-texts-"+rec.id); }catch(_){} S=blank(); openFromRegister(rec.id);
  const before=(rec.docs||[]).filter(d=>d.chars>0).length, body=regBody(), after=body.docs.filter(d=>d.chars>0).length, bad=body.docs.filter(d=>/teises arvutis/.test(d.status)).length;
  return {ok: after>=before && bad===0, info:{before,after,bad}};`, "REC0");
add("B8","Liigi tuvastus ei sõltu üleslaadimise etapist; teated on omaette liik",
 `const t=(n,st)=>classifyDoc(n,"",st); const R={
  skeem:[t("Lisa 2_Planeeringuala skeem.pdf","keht"),"skeem"], sk:[t("Konksu DP_Seletuskiri.pdf","keht"),t("Konksu DP_Seletuskiri.pdf","vv")],
  at:[t("DP_Algatamise teade_RS_24.03.2021.pdf","keht"),"teade_alg"], vv:[t("vastuvõtmine.Kohila valla ajaleht 10.10.2024.pdf","keht"),"teade_vv"],
  at2:[t("Algatamine.Ametlikud Teadaanded.15.03.2021_teadaanne_1728434.pdf","keht"),"teade_alg"],
  rb:[t("Rail-Baltica-raudtee-Harju-ja-Rapla-maakonna-piir-Hagudi-loigu-ehitusprojekti-KMH-aruanne.pdf","keht"),"!skeem"],
  ar:[t("Arvamus Konksu detailplaneeringu KSH mitte algatamise kohta.pdf","keht"),"eelh_seisukohad"],
  sei:[t("Seisukoht Konksu detailplaneeringu keskkonnamõju strateegilise hindamise mittealgatamise korralduse kohta.pdf","keht"),"!alg_akt"],
  hk:[t("Konksu maaüksuse detailplaneeringu heakskiitmata jätmine.pdf","keht"),"!heakskiit"],
  ko:[t("KONKSU DP_KOOSTÖÖ JA KOOSKÕLASTUSTE KOONDTABEL.pdf","keht"),"kooskolastused"] };
  const fails=Object.entries(R).filter(([k,[a,b]])=> k==="sk" ? a!==b : b.startsWith("!") ? a===b.slice(1) : a!==b);
  return {ok:!fails.length, info:fails};`);
add("B8b","Olemasolevad kirjed liigitatakse laadimisel ümber, käsitsi valitud liik jääb",
 `const rec=JSON.parse(JSON.stringify(ARG)); rec.docs.push({id:"man1",name:"Minu teade.pdf",st:"keht",type:"tulemused",chars:500,text:"",manual:true});
  S=prep(rec); applyProc(); const by=n=>S.docs.find(d=>d.name===n);
  const a=by("DP_Algatamise teade_RS_24.03.2021.pdf")?.type, b=by("vastuvõtmine.Kohila valla koduleht 03.10.2024.pdf")?.type, m=by("Minu teade.pdf")?.type, e=by("202002_DP algatamine_Urge_KONKSU_EELNOU.pdf")?.type;
  return {ok: a==="teade_alg" && b==="teade_vv" && m==="tulemused" && e==="eelnou_alg", info:{a,b,m,e}};`, "KONKSU");
add("B9","Varasema etapi nõutavate dokumentide puudumine on nähtav, kui etapi akt on tehtud",
 `${mk(M(),{algatamine:"2021-03-08",vastuvotmine:"2026-05-26"},{docs:[{id:"x",name:"Konksu kinnistu detailplaneering.pdf",st:"keht",type:"dp_lopp",chars:3000,text:""}]})}
  const a=stageSummary("alg"), v=stageSummary("vv"); return {ok:a.started && a.issues>0 && v.started && v.issues>0 && verdictOf(a)[1]!=="Materjalid lisamata", info:[a.issues,v.issues,verdictOf(a)]};`);
add("B10","HMS § 41 pikendus kehtib ka teadete juures",
 `${mk(M(),{taotlus:"2026-08-01",algatamine:"2026-08-20",algatamiseAT:"2026-08-25",algatamiseIsikud:"2026-08-30",kshTeade:"2026-08-25"},{ext:{r1b:{until:"2026-12-31",why:"test"}}})}
  const n=noticeDue(NOTICES.find(n=>n.id==="alg_leht")); return {ok:n.status!=="bad" && n.due==="2026-12-31", info:n};`);
add("B11","Registrirea tähtajad ei sõltu sellest, milline planeering on avatud",
 `const row={dates:{taotlus:"2024-01-10",algatamine:"2024-02-05",vastuvotmine:"2026-05-26",arutelu:"2024-11-20",valjapanekLopp:"2024-10-10"},meta:{ypmuutmine:"ei",ksh:"ei"}};
  ${mk({liik:"dpm"})} const a=pendingDeadlines(row.dates,row.meta,{}).map(x=>x.rule.id).join();
  ${mk(M())} const b=pendingDeadlines(row.dates,row.meta,{}).map(x=>x.rule.id).join(); return {ok:a===b, info:{a,b}};`);
add("B12","DP-d muutev DP ei satu tahvlil veergu „Kehtestatud” enne kehtestamist",
 `const r={dates:{taotlus:"2026-03-01",algatamine:"2026-04-01",kooskSaadetud:"2026-05-01"},meta:{liik:"dpm"}}; const c=boardPos(r,"dpm").c; return {ok:c!=="keht" && PIPES.dpm.cols.includes(c), info:c};`);
add("B13","DP-d muutva DP etapiribal on avatud menetlus tehtud, kui kehtestamine on tehtud",
 `${mk({liik:"dpm"},{taotlus:"2025-03-01",algatamine:"2025-04-01",d_teade:"2025-04-10",d_valjAlgus:"2025-04-15",d_ettepTahtaeg:"2025-05-15",kehtestamine:"2025-09-01"})} renderTabs();
  const ch=[...document.querySelectorAll("#tabs .chev")].map(b=>b.classList.contains("done")); return {ok:ch.length===3 && ch.every(Boolean), info:ch};`);
add("B14","Kestuse normid sõltuvad menetlusliigist",
 `const a=durations({dates:{taotlus:"2026-08-01",algatamine:"2026-09-15"},meta:{liik:"dpm"}}).find(d=>d.id==="alg").s;
  const b=durations({dates:{taotlus:"2026-07-01",algatamine:"2026-08-15"},meta:{ypmuutmine:"jah"}}).find(d=>d.id==="alg").s; return {ok:a==="ok" && b==="bad", info:{a,b}};`);
add("B15","Korduva väljapaneku reeglid kehtivad ÜP-menetluses (30 päeva)",
 `${mk(M({ksh:"jah",akt:"otsus",voorud:2}),{vastuvotmine:"2025-08-01",valjapanekAlgus:"2025-08-15",valjapanekLopp:"2025-09-14",arutelu:"2025-10-01",valjapanekAlgus2:"2026-09-01",valjapanekLopp2:"2026-09-20"})}
  const r=__rr("keht").r3b; return {ok:r && r.status==="bad" && r.need===30, info:r&&r.detail};`);
add("B16","ÜP-menetluses on vastuvõetud planeeringu väljapaneku teade kehtestamise etapis ja eelnõu väljapaneku teade vastuvõtmise etapis",
 `${mk(M({ypmuutmine:"jah",akt:"otsus"}))} const k=stageNotices("keht").map(n=>n.id), v=stageNotices("vv").map(n=>n.id); return {ok:k.includes("vv_valjapanek") && !v.includes("vv_valjapanek") && v.includes("y_ev_teade"), info:{k,v}};`);
add("B17","Teine väljapanek peab algama pärast esimese lõppu (blokeeriv)",
 `${mk(M({voorud:2}),{vastuvotmine:"2026-05-26",valjapanekAlgus:"2026-06-25",valjapanekLopp:"2026-07-08",valjapanekAlgus2:"2026-06-25",valjapanekLopp2:"2026-07-08"})}
  const r=__rr("keht").r3k; return {ok:r && r.status==="bad" && blockers("keht").some(b=>b.id==="r3k"), info:r&&r.status};`);
add("B18","Puudulik salvestis ei peata rakendust",
 `let ok=true, info=[]; for(const x of [{name:"X",meta:{},dates:{}},{name:"X",docs:[]},{docs:[{name:"a"}]},null,{meta:null,dates:null,docs:null}]){ try{ S=prep(x); applyProc(); renderAll(); }catch(e){ ok=false; info.push(String(e)); } } return {ok,info};`);
add("B18b","Vigane localStorage kirje: leht laeb vigadeta",null,"LOADBAD");
add("B19","Kriitilised punktid ei ole lõigatud (ÜP-menetluse kehtestamine) ja teise vooru punktid on olemas",
 `${mk(M({ypmuutmine:"jah",akt:"otsus",voorud:2}))} const k=critItems("keht").map(x=>x.k); return {ok:k.includes("kehtestamiseIsikud") && k.includes("y_ypMuudetud") && k.includes("arutelu2"), info:k};`);
add("B20","Menetluse seisu silt on sama kui tahvli veerg",
 `const D={taotlus:"2025-01-10",algatamine:"2025-02-05",vastuvotmine:"2025-08-01",valjapanekAlgus:"2025-08-15",valjapanekLopp:"2025-09-14"}; const M0={ypmuutmine:"ei",ksh:"ei"};
  return {ok: stageOf(D,M0)===BCOL[boardPos({dates:D,meta:M0},"dp").c], info:stageOf(D,M0)};`);
add("B21","DP-d muutvas DP-s on avatud menetluse teade avatud menetluse etapis",
 `${mk({liik:"dpm"})} return {ok: !stageById("alg").dates.includes("d_teade") && stageById("vv").dates.includes("d_teade"), info:STAGES.map(s=>s.dates.join(","))};`);
add("B23","PLANIS-e koondis märgib vastuolulise kuupäeva",
 `${mk(M(),{algatamine:"2021-03-08",vastuvotmine:"2026-05-26",arutelu:"2024-11-20"})} const r=planisRows().find(x=>x[0]===DATE_FIELDS.arutelu); return {ok:/KONTROLLI/.test(r[1]), info:r};`);
add("B24","Etapita dokument saab kehtiva etapi",
 `${mk(M(),{},{docs:[{id:"a",name:"x.pdf",type:"tundmatu",text:"",chars:0}]})} return {ok:["alg","vv","keht"].includes(S.docs[0].st), info:S.docs[0]};`);
add("B25","Liiga suur registrikirje lühendatakse astmeliselt",
 `${mk(M())} S.analysis={alg:{items:[],summary:"x".repeat(250000)}}; S.log=Array.from({length:300},(_,i)=>({at:"",k:"x",x:"y".repeat(900)})); const b=regBody(); return {ok:JSON.stringify(b).length<240000 && b.log.length<=100, info:JSON.stringify(b).length};`);

/* ---------- C: dokumentide sisu ---------- */
const KEHTD={...ALG_FULL,...VV_FULL,...KEHT_FULL};
add("C1","Osaline kehtestamine on akti tekstis",
 `${mk(M(),KEHTD)} draftOf("keht").ov.osaline="pos 1 ja 2"; const t=__act("keht"); return {ok:/Kehtestada osaliselt/.test(t) && /järgmises osas: pos 1 ja 2/.test(t) && /Ülejäänud osas jätta detailplaneering kehtestamata/.test(t), info:t.slice(0,400)};`);
add("C3","Halduslepingut ei pakuta ÜP-ta alal ega ÜP-d muutva liigi korral",
 `${mk(M({liik:"yp_puudub",akt:"otsus"}))} const a=fv("alg","kulud").v; ${mk(M({ypmuutmine:"jah",akt:"otsus"}))} const b=fv("alg","kulud").v;
  return {ok:/lõike 2 punkt 1/.test(a) && /lõike 2 punkt 2/.test(b) && !/lõike 1 alusel/.test(a+b), info:{a,b}};`);
add("C4","ÜP-ta ala ja korraldus: kehtestamise pädevus on viga ja blokeerib",
 `${mk(M({liik:"yp_puudub",akt:"korraldus"}))} const c=padevusCheck("keht"); return {ok:c.status==="bad" && blockers("keht").some(b=>b.id==="padevus"), info:c};`);
add("C5","Kohustuslik KSH: pealkirjas KSH algatamine, KSH peatükk ja KSH teade",
 `${mk(M({eelh:"kohustuslik",ksh:"jah",akt:"otsus"}))} const t=__act("alg"); return {ok:/strateegilise hindamise algatamine/.test(titleOf("alg")) && /Algatada detailplaneeringu keskkonnamõju strateegiline hindamine/.test(t) && stageNotices("alg").some(n=>n.id==="alg_ksh"), info:titleOf("alg")};`);
add("C6","Tühi eelnõu ei läbi sisukontrolli (kohatäited ja vaiketekst ei loe)",
 `${mk({...BASEMETA,asukoht:"Urge küla",kataster:"",pindala:""})} const ids=["a1","a2","a4","a7"]; const r=ids.map(id=>draftElCheck("alg",ELEMENTS.alg.find(e=>e.id===id)).status);
  draftOf("alg").ov.ksh="Eelhinnangu järgi ei kaasne olulist keskkonnamõju, sest ala on väike."; const a7=draftElCheck("alg",ELEMENTS.alg.find(e=>e.id==="a7")).status;
  S.docs.push({id:"gen_alg",name:"Koostatud",st:"alg",type:"eelnou_alg",text:__act("alg"),chars:5000}); const g=elementResults("alg").find(e=>e.id==="a4").status;
  return {ok:r.every(s=>s==="bad"||s==="risk") && a7==="ok" && g!=="ok", info:{r,a7,g}};`);
add("C7","Eelhinnangut ei antud: vastuvõtmise eelnõu ei väida, et KSH jäeti eelhinnangu põhjal algatamata",
 `${mk(M({eelh:"pole"}))} const t=__act("vv")+__memo("alg"); return {ok:!/jäeti algatamata algatamise/.test(t) && !/KSH vajalikkuse otsuse eelnõu kohta küsiti/.test(t), info:t.slice(0,200)};`);
add("C8","KSH-ga DP algatamisel KSH teade 14 päeva jooksul ka ajalehes (KeHJS § 35 lg 6)",
 `${mk(M({ksh:"jah",akt:"otsus"}))} const t=__act("alg"); return {ok:/14 päeva jooksul Ametlikes Teadaannetes, Kohila valla veebilehel ja ajalehes ning asjaomaseid asutusi \\(keskkonnamõju hindamise ja keskkonnajuhtimissüsteemi seaduse § 35 lõige 6\\)/.test(t), info:""};`);
add("C9","Vastuvõtmise eelnõus on § 134 kinnitus",`${mk(M())} return /vastab õigusaktidele ja Kohila valla ruumilise arengu eesmärkidele/.test(__act("vv"));`);
add("C10","Ülaindeksiga lõige on aktis kujul 9¹",
 `${mk(M({liik:"yp_puudub",akt:"otsus"}))} const t=__act("alg")+__act("vv")+__act("keht")+__memo("keht"); return {ok:!/lõi\\w+ 91\\b/.test(t) && /9¹/.test(t) && REG["PlanS-124-91"].s.includes("9¹"), info:(t.match(/§ 124[^.]{0,30}/g)||[]).slice(0,3)};`);
add("C11","Puuduste kiri ei nõua valla enda dokumente",
 `${mk(M(),KEHTD)} const t=defectList("keht").join("\\n")+defectList("vv").join("\\n"); return {ok:!/Vastuvõtmise korraldus|protokoll|seisukohad arvamustele|tulemuste avaldamise|eelnõu/i.test(t), info:t};`);
add("C13","KSH seiremeetmed on kehtestamise aktis",`${mk(M({ksh:"jah",akt:"otsus"}))} draftOf("keht").ov.seire="müraseire 2 aastat"; return /seiremeetmed: müraseire 2 aastat/.test(__act("keht"));`);
add("C14","Heakskiit ÜP-menetluse liikides ja heakskiidu tuvastus",
 `${mk(M({ksh:"jah",akt:"otsus"}))} const t=__act("keht"); const e=ELEMENTS.keht.find(x=>x.id==="yk1"); return {ok:/Maa- ja Ruumiamet kiitis detailplaneeringu heaks/.test(t) && e.re.test("Maa- ja Ruumiamet kiitis detailplaneeringu heaks 01.09.2026"), info:""};`);
add("C15","Sundvõõrandamise kirjas ei ole kinnitamata 7 päeva tähtaega",`${mk(M({sundv:"jah"}))} return !/7 päeva/.test(blocksText(noticeBlocks(NOTICES.find(n=>n.id==="alg_sundv"))));`);
add("C16","KSH otsustamata: aktis ei ole otsust, PLANIS-es „selgitamisel”",
 `${mk(M({ksh:"?"}))} const t=__act("alg"); return {ok:!/algatamata jätmine$/.test(titleOf("alg")) && !/Keskkonnamõju strateegilist hindamist ei algatata/.test(t) && planisRows().find(r=>r[0]==="KSH")[1]==="selgitamisel", info:titleOf("alg")};`);
add("C17","Sisukontrolli mustrid (regressioonikomplekt)",null,"REGEX");
add("C18","Algatamise pädevuse lause viitab delegeerimisele",`${mk(M())} return /pädevus on delegeeritud Kohila Vallavalitsusele/.test(__act("alg"));`);
add("C19","Tavamenetluses ei looda eskiisi väljapaneku kohustust",`${mk(M())} return !/põhilahenduse tutvustamiseks avalik väljapanek/.test(__act("alg"));`);
add("C20","§ 128 lg 2 algatamata jätmise aluste hindamine (küsimus ja akti lause)",`${mk(M())} return JUDGE_QS.some(q=>q.id==="alus2") && /§ 128 lõikes 2 nimetatud detailplaneeringu algatamata jätmise aluseid ei esine/.test(__act("alg"));`);
add("C21","Arvamusi ei esitatud: preambul ütleb seda",`${mk(M({arvamused:"pole"}),KEHTD)} const t=__act("keht"); return /kirjalikke arvamusi ei esitatud/.test(t) && !/arvamustega on arvestatud/.test(t);`);
add("C22","Ettepanekute kiri kasutab sisestatud tähtaega",`${mk(M({ypmuutmine:"jah",akt:"otsus"}),{y_lsTahtaeg:"2026-12-15"})} return /15\\.12\\.2026/.test(blocksText(noticeBlocks(NOTICES.find(n=>n.id==="y_ls"))));`);
add("C23","Algatamise teates on viide planeeringuala skeemile",`${mk(M())} return /skeemil/.test(blocksText(noticeBlocks(NOTICES.find(n=>n.id==="alg_at"))));`);
add("C24","DP muutmise kehtestamisel tühjad kaalutlused on kohatäide",`${mk({liik:"dpm"})} draftOf("keht").ov.kaalutlused=""; return /kaalutlusi:\\n– \\[kaalutlused\\]/.test(__act("keht"));`);
add("C25","PLANIS-e korraldaja on Kohila vald",`${mk(M())} return planisRows().find(r=>r[0]==="Koostamise korraldaja")[1].startsWith("Kohila vald");`);
add("C27","Seletuskirja keel: „Korralduse annab”, mitte „alus … alusel”",`${mk(M())} const t=["alg","vv","keht"].map(__memo).join("\\n"); return {ok:!/Korraldus annab|Otsus annab|õiguslik alus on [^.]* alusel/.test(t), info:(t.match(/õiguslik alus[^.]*\\./i)||[""])[0]};`);
add("C28","Seletuskirjas jääb „KSH” suurtähtedega",`${mk(M(),KEHTD)} return !/kSH/.test(__memo("keht"));`);
add("C29","Algatamise seletuskirjas ei korrata planeeritavat ala",`${mk(M())} return (__memo("alg").match(/Planeeritav ala:/g)||[]).length===1;`);
add("C30","Lisade numeratsioon (lisa 1)",`${mk(M())} const t=__act("alg"); return /lisas 1\\./.test(t) && !/1\\.1 Planeeringuala skeem/.test(t);`);
add("C31","Algatamise punkti sõnastus ilma „… osas”",`${mk(M())} return !/ha osas\\./.test(__act("alg"));`);
add("C32","Asukoht seesütlevas käändes ka komaga aadressist",`${mk(M())} return {ok:fv("keht","asukohtIn").v==="Kohila alevis Lepiku tn 5", info:fv("keht","asukohtIn").v};`);
add("C33","ÜP kooskõla küsimuse viited",`return JUDGE_QS.find(q=>q.id==="ypk").refs.includes("PlanS-128-2");`);
add("C35","Väljapaneku teates on valla üldaadress",`${mk(M())} return /vallavalitsus@kohila\\.ee/.test(blocksText(noticeBlocks(NOTICES.find(n=>n.id==="vv_valjapanek"))));`);

/* ---------- Andmed ja püsivus ---------- */
add("P1","Salvestus ja uuesti laadimine säilitab käsitsi liigi ja andmed",
 `${mk(M(),{taotlus:"2026-01-05"},{docs:[{id:"m1",name:"Teade.pdf",st:"keht",type:"tulemused",chars:300,text:"x",manual:true}]})} saveNow(); S=null; load(); return {ok:S.docs[0].type==="tulemused" && S.dates.taotlus==="2026-01-05" && liikOf()==="tava", info:S.docs[0]};`);
add("P2","Päris kirjed: kõik etapid, teated ja eelnõud renderduvad vigadeta",null,"RECORDS");

/* ---------- D: kasutajateekondade leiud ---------- */
const FAKEDB=`window.__store={}; window.__fail=null; DB={ collection(){ return {onSnapshot(){}}; }, doc(path){ const id=path.split("/").pop(); return { async set(b){ if(window.__fail) { const e=new Error(window.__fail); e.code=window.__fail; throw e; } window.__store[id]=JSON.parse(JSON.stringify(b)); REGDOCS=JSON.parse(JSON.stringify(Object.entries(window.__store).map(([i,d])=>({id:i,...d})))); }, async get(){ return {exists:!!window.__store[id], data:()=>window.__store[id]?JSON.parse(JSON.stringify(window.__store[id])):undefined}; }, async delete(){ delete window.__store[id]; } }; } }; regState="on"; regRO=false; ME="u1";
  const mkReg=(id,name,dates)=>{ window.__store[id]={v:2,name,meta:{...blank().meta,eelh:"antud"},dates,docs:[],updatedAt:"2026-10-30T10:00:00.000Z",updatedBy:"u1"}; REGDOCS=JSON.parse(JSON.stringify(Object.entries(window.__store).map(([i,d])=>({id:i,...d})))); };`;
add("D1","Ootel registrimuudatus salvestatakse enne teise planeeringu avamist",
 `${FAKEDB} mkReg("a","A",{taotlus:"2026-01-05"}); mkReg("b","B",{}); await openFromRegister("a"); S.dates.vastuvotmine="2026-05-20"; save(); await openFromRegister("b"); await new Promise(r=>setTimeout(r,300));
  return {ok: window.__store.a.dates.vastuvotmine==="2026-05-20" && window.__store.b.dates.vastuvotmine===undefined, info:window.__store.a.dates};`);
add("D2","Ootel muudatus salvestatakse enne uue planeeringu alustamist",
 `${FAKEDB} mkReg("a","A",{}); await openFromRegister("a"); S.meta.pindala="2,0 ha"; save(); await startNew(); await new Promise(r=>setTimeout(r,200)); return {ok: window.__store.a.meta.pindala==="2,0 ha", info:window.__store.a.meta.pindala};`);
add("D3","Kolleegi uuemat versiooni ei kirjutata vaikselt üle; ühendamine säilitab mõlema muudatused",
 `${FAKEDB} mkReg("a","A",{taotlus:"2026-01-05"}); await openFromRegister("a"); S.meta.eesmark="minu eesmärk"; 
  window.__store.a={...window.__store.a, dates:{...window.__store.a.dates, arutelu:"2026-08-01"}, updatedAt:"2026-10-31T09:00:00.000Z", updatedBy:"u2"}; REGDOCS=JSON.parse(JSON.stringify(Object.entries(window.__store).map(([i,d])=>({id:i,...d}))));
  await pushReg(); const blocked=window.__store.a.meta.eesmark!=="minu eesmärk" && !!regConflict && !document.querySelector("#regBar").hidden;
  await resolveConflict("merge"); await new Promise(r=>setTimeout(r,100)); const st=window.__store.a;
  return {ok: blocked && st.dates.arutelu==="2026-08-01" && st.meta.eesmark==="minu eesmärk" && !regConflict, info:{blocked, arutelu:st.dates.arutelu, e:st.meta.eesmark}};`);
add("D6","Ebaõnnestunud salvestus: püsiv „salvestamata” olek ja automaatne kordus",
 `${FAKEDB} mkReg("a","A",{}); await openFromRegister("a"); window.__fail="unavailable"; S.meta.pindala="3 ha"; await pushReg(); const bar=document.querySelector("#regBar"); const t=bar&&!bar.hidden?bar.innerText:"";
  window.__fail=null; regRetryN=0; await pushReg(); return {ok: /Salvestamata/.test(t) && !!regRetryT && window.__store.a.meta.pindala==="3 ha" && !regFail && bar.hidden, info:t};`);
add("D4","„Arvamusi ei esitatud”: kehtestamise korraldus, lisad ja seletuskiri ei väida arvamuste arvestamist",
 `${mk(M({arvamused:"pole"}),KEHTD)} const t=__act("keht"), m=__memo("keht"); return {ok:!/arvamustega on arvestatud/.test(t) && !/esitatud arvamused ja valla seisukohad/.test(t) && /kirjalikke arvamusi ei esitatud/.test(m) && /Avalikku arutelu ei korraldatud/.test(m) && !/kelle arvamusega ei arvestatud/.test(t) && !stageNotices("keht").some(n=>["k_seisukoht","k_arutelu","k_tulemused"].includes(n.id)), info:t.slice(0,300)};`);
add("D4b","„Kõik arvestati”: arutelu ei korraldatud, arvamuste lisa on (ilma aruteluta)",
 `${mk(M({arvamused:"koik"}),KEHTD)} const t=__act("keht"); return {ok:/avalikku arutelu ei korraldatud/.test(t) && /Avaliku väljapaneku käigus esitatud arvamused ja valla seisukohad/.test(t), info:t.slice(0,300)};`);
add("D8","Puuduste kiri ei nõua valla tööd (eelnõu, asutuste seisukohad eelhinnangule)",
 `${mk(M())} const t=defectList("alg").join("|"); return {ok:!/eelnõu|seisukohad eelhinnangule/i.test(t) && /taotlus/i.test(t), info:t};`);
add("D9","Dokumendi eemaldamine on tagasivõetav ja eemaldab ka selle kuupäevaettepanekud",
 `${mk(M(),{},{docs:[{id:"d1",name:"Algatamise korraldus.txt",st:"alg",type:"alg_akt",text:"Kohila 12.02.2026 nr 1",chars:200}],evp:{algatamine:[{v:"2026-02-12",q:"Kohila 12.02.2026",doc:"Algatamise korraldus.txt"}]}})}
  removeDocs(["d1"]); const gone=!S.docs.length && !S.evp.algatamine; const btn=document.querySelector("#toast .toast-act"); const has=!!btn && /Võta tagasi/.test(btn.textContent); btn&&btn.click();
  return {ok: gone && has && S.docs.length===1 && !!S.evp.algatamine, info:{gone,has,n:S.docs.length}};`);
add("D10","Dokumentide lisamine on klaviatuuriga kättesaadav",`return ["#startDrop","#stDrop",'label[for="planFileIn"]'].every(q=>document.querySelector(q)?.tabIndex===0);`);
add("D11","Menetlusakti vormi muutmine uuendab eelnõu eelvaate kohe",
 `${mk(M())} renderAll(); go("algatamine"); showStep("act",true); const f=document.querySelector("#f_akt"); f.value="otsus"; f.dispatchEvent(new Event("input",{bubbles:true})); const t=document.querySelector("#paper").innerText; S.meta.akt="korraldus"; return {ok:/OTSUS/.test(t), info:t.slice(0,80)};`);
add("D12","Liigi vahetus ei kirjuta üle ametniku valitud akti vormi (tava → otsus jääb)",
 `${mk(M({akt:"otsus"}))} setLiik("dpm"); const a=S.meta.akt; setLiik("tava"); return {ok:a==="otsus" && S.meta.akt==="otsus", info:[a,S.meta.akt]};`);
add("D13","Teise menetlusliigi kuupäevad ei satu PLANIS-e koondisse ega ajajoonele",
 `${mk(M(),{taotlus:"2026-01-05",d_teade:"2026-03-01"})} return {ok:!planisRows().some(r=>/HMS § 47/.test(r[0])) && !timeline(S).some(e=>/HMS § 47/.test(e.t)), info:""};`);
add("D14","Juba toimunud tähtajarikkumine on registri tules näha",
 `const r={dates:{taotlus:"2026-01-02",algatamine:"2026-01-05",algatamiseAT:"2026-03-01",algatamiseTeade:"2026-01-20",algatamiseIsikud:"2026-01-20"},meta:{ypmuutmine:"ei",ksh:"ei",eelh:"pole"}}; const l=lampOf(r); return {ok:l.st==="bad" && /rikkumine/.test(l.why.join()), info:l};`);
add("D16","„Täna” on kohalik kuupäev",`const d=new Date(); return todayIso()===\`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2,"0")}-\${String(d.getDate()).padStart(2,"0")}\`;`);
add("D20","PLANIS-e koondis: nimi koos sõnaga „detailplaneering”, kuupäevad PP.KK.AAAA, koostaja algatamisest",
 `${mk(M(),{taotlus:"2026-01-05"},{name:"Kase tn 7 maaüksuse detailplaneering"})} draftOf("alg").ov.koostaja="OÜ Test"; const r=planisRows(); return {ok:/detailplaneering$/.test(r.find(x=>x[0]==="Planeeringu nimi")[1]) && r.find(x=>x[0]===DATE_FIELDS.taotlus)[1]==="05.01.2026" && r.find(x=>x[0]==="Koostaja")[1]==="OÜ Test", info:r.slice(0,3)};`);
add("D21","Kontrollrajal on järgmine sisestatav samm, kui eeldused on täidetud",
 `${mk(M(),{taotlus:"2026-01-05",algatamine:"2026-02-01",vastuvotmine:"2026-05-20",valjapanekTeade:"2026-05-25"})} const p=pipeSteps().find(x=>x.k==="valjapanekAlgus"); return {ok:p && p.st!=="wait", info:p&&p.st};`);
add("D22","Vale aastaga kuupäev lükatakse tagasi",
 `${mk(M())} renderAll(); go("algatamine"); showStep("dates",true); const i=document.querySelector('#stDates input[data-k="algatamine"]'); i.value="2026-02-12"; i.dispatchEvent(new Event("change",{bubbles:true}));
  const i2=document.querySelector('#stDates input[data-k="taotlus"]'); Object.defineProperty(i2,"value",{value:"20266-02-12",writable:true,configurable:true}); i2.dispatchEvent(new Event("change",{bubbles:true}));
  return {ok:S.dates.algatamine==="2026-02-12" && !S.dates.taotlus, info:S.dates};`);
add("D24","Töölaual ei ole tühja mustandit menetlusena",`S=blank(); prep(S); return !deskRows().some(r=>r._local);`);
add("D5","Töölaud kuvatakse kohe laadimisel",null,"DESKLOAD");

const REGEX_CASES=[
 ["a1","Algatada detailplaneering. Planeeringuala piir on näidatud lisas 1.",false],
 ["a1","⟦planeeritav ala, katastritunnus, sihtotstarve ja pindala⟧",false],
 ["a1","Kohila vallas Urge külas Kiriku maaüksuse (31701:001:2246) ligikaudu 1,57 ha suurune ala",true],
 ["a2","Detailplaneeringu koostamise eesmärk on krundi jagamine.",false],
 ["a2","Detailplaneeringu koostamine on vajalik, kuna alevis on DP koostamise kohustus.",true],
 ["a4","Korraldusega saab tutvuda.",false],
 ["a4","Korraldusega saab tutvuda alates 15.12.2026 Kohila valla veebilehel.",true],
 ["a9","Korraldus ei kuulu vaidlustamisele.",false],
 ["a9","Korraldust saab vaidlustada Tallinna Halduskohtus 30 päeva jooksul.",true],
 ["a9","Korraldusega mittenõustumisel võib esitada vaide Kohila Vallavalitsusele 30 päeva jooksul.",true],
 ["v7","Keskkonnamõju strateegilise hindamise aruanne on planeeringu lisa.",true],
 ["v7","keskkonnamõju strateegilise hindamise aruanne on lisa",true],
 ["k4","Avaliku väljapaneku jooksul arvamusi ei esitatud.",true],
 ["k4","Kõik esitatud arvamused võeti arvesse.",true],
 ["k4","Naabri ettepanekut ei arvestatud, sest see on vastuolus üldplaneeringuga.",true],
 ["k12","Detailplaneering kehtestatakse osaliselt, pos 3 jäetakse kehtestamata.",true],
 ["k12","Osaline kehtestamine ei muuda detailplaneeringu põhilahendust.",true],
 ["yk1","Maa- ja Ruumiamet kiitis detailplaneeringu heaks 01.09.2026 kirjaga nr 14-3/1.",true],
 ["k3","arvestades korralduse seletuskirjas kirjeldatud menetluse käiku ning järgmisi põhimotiive ja kaalutlusi:",false],
 ["k3","arvestades järgmisi kaalutlusi: – hoonete kõrgus ei ületa naaberhoonete kõrgust",true],
 ["k9","Detailplaneeringu keskkonnamõju strateegiline hindamine jäeti algatamata.",false],
 ["k9","Müra leevendamiseks rajatakse haljastusriba.",true],
 ["v2","Detailplaneering ei ole veel kooskõlastatud.",false],
 ["v2","Detailplaneering on kooskõlastatud Transpordiametiga.",true],
 ["v8","Keskkonnamõju strateegilist hindamist ei algatatud.",false],
 ["v8","Planeeringu elluviimisega kaasnevad sotsiaalsed ja majanduslikud mõjud on positiivsed.",true],
 ["a13","koos tõendiga, et koostaja vastab planeerija nõuetele",false],
 ["a13","Planeeringu koostas volitatud arhitekt Mari Maa (kutsetunnistus nr 123456).",true],
 ["da1","⟦kehtestamisest on möödunud üle kolme aasta / ilmnenud on uued asjaolud / muutunud on õigusakt või planeering⟧",false],
 ["a7","3. Keskkonnamõju strateegilise hindamise algatamata jätmine\n3.1. Detailplaneeringu puhul on kaalutud ... ja antud eelhinnang. 3.3. ... põhjendatud järgmistel kaalutlustel: [kaalutlused].",false],
 ["a7","Eelhinnangu kohaselt ei kaasne detailplaneeringu elluviimisega olulist keskkonnamõju, mistõttu KSH algatamine ei ole vajalik.",true],
];

(async()=>{
  const L=await launch(FILE); const results=[]; const P=await L.page(); await P.ev(PRELUDE);
  for(const [id,t,code,special] of C){
    let ok=false, info="";
    try{
      if(special==="REGEX"){ const r=await P.ev(`const all=[...ELEMENTS.alg,...ELEMENTS.vv,...ELEMENTS.keht]; const strip=typeof stripPh==="function"?stripPh:(x=>x.replace(/⟦([^⟧]*)⟧/g,"[$1]"));
          return ARG.map(([id,txt,exp])=>{ const e=all.find(x=>x.id===id); const got=!!(e&&e.re&&e.re.test(strip(txt))); return {id,exp,got,ok:got===exp,txt:txt.slice(0,60)}; });`, REGEX_CASES);
          const bad=r.filter(x=>!x.ok); ok=!bad.length; info=bad.map(x=>`${x.id} oodati ${x.exp}: "${x.txt}"`).join(" | ")||`${r.length} juhtu`; }
      else if(special==="LOADBAD"){ const Q=await L.page({init:`try{ localStorage.setItem("kohila-dp-kontroll-v3", JSON.stringify({S:{name:"X",meta:null,docs:"x"}})); }catch(_){}`});
          const e=Q.errs.filter(x=>!/Failed to load resource/.test(x)); ok=!e.length; info=e.join(" | "); await Q.ctx.close(); }
      else if(special==="DESKLOAD"){ const Q=await L.page({hash:"#toolaud", init:`try{ localStorage.setItem("kohila-dp-kontroll-v3", JSON.stringify({S:{name:"Lepiku DP",meta:{asukoht:"Kohila alev"},dates:{taotlus:"2026-10-01"},docs:[]}})); }catch(_){}`}); await Q.p.waitForTimeout(600);
          const n=await Q.p.evaluate(()=>(document.querySelector("#deskBody")||document.querySelector("main")).innerText.trim().length); ok=n>20; info=`tekst ${n} märki`; await Q.ctx.close(); }
      else if(special==="RECORDS"){ const r=await P.ev(`const errs=[]; for(const rec of ARG){ try{ S=prep(JSON.parse(JSON.stringify(rec))); applyProc(); renderAll();
            for(const st of ["alg","vv","keht"]){ go(stageById(st).tab); blocksText(actBlocks(st)); blocksText(memoBlocks(st)); stageNotices(st).forEach(n=>blocksText(noticeBlocks(n))); }
            pipeSteps(); lampOf({dates:S.dates,meta:S.meta}); planisRows(); }catch(e){ errs.push(rec.name+": "+e.message); } } go("toolaud"); return errs;`, REC);
          ok=!r.length && REC.length>0; info=r.join(" | ")||`${REC.length} kirjet`; }
      else { const arg = special==="REC0" ? (KONKSU||REC[0]) : special==="KONKSU" ? KONKSU : null;
        const r=await P.ev(code, arg); if(typeof r==="object" && r && "ok" in r){ ok=!!r.ok; info=r.ok?"":JSON.stringify(r.info).slice(0,300); } else ok=r===true; }
    }catch(e){ ok=false; info="viga: "+String(e.message||e).split("\n")[0].slice(0,200); }
    results.push({id,t,ok,info}); console.log(`${ok?"PASS":"FAIL"} ${id.padEnd(5)} ${t}${!ok&&info?`\n        → ${info}`:""}`);
  }
  // vaated: horisontaalne kerimine 390/1280 px, hele ja tume; konsooli vead
  for(const [w,scheme] of [[390,"light"],[390,"dark"],[1280,"light"],[1280,"dark"]]){
    const Q=await L.page({viewport:{width:w,height:900},colorScheme:scheme}); await Q.ev(PRELUDE);
    const over=await Q.ev(`const out=[]; ${mk(M({voorud:2}),KEHTD)} renderAll(); for(const t of ["toolaud","algatamine","vastuvotmine","kehtestamine","register","kaik","dokumendid","alus"]){ go(t); if(curStage()) for(const k of ["docs","dates","act","nt","ai"]) { try{ showStep(k,true); }catch(_){} const sw=document.documentElement.scrollWidth; if(sw>innerWidth+1) out.push(t+"/"+k+":"+sw); if(k==="nt"){ const sel=document.querySelector("#ntSel"); for(const o of [...(sel?sel.options:[])]){ sel.value=o.value; sel.dispatchEvent(new Event("change",{bubbles:true})); const w=document.documentElement.scrollWidth; if(w>innerWidth+1) out.push(t+"/nt/"+o.value+":"+w); } } } else { const sw=document.documentElement.scrollWidth; if(sw>innerWidth+1) out.push(t+":"+sw); } } return out;`);
    const e=Q.errs.filter(x=>!/Failed to load resource/.test(x));
    const ok=!over.length && !e.length; results.push({id:`UI-${w}-${scheme}`,ok}); console.log(`${ok?"PASS":"FAIL"} UI    ${w}px ${scheme}: horisontaalne kerimine ja konsooli vead${ok?"":`\n        → ${[...over,...e].join(" | ").slice(0,300)}`}`);
    await Q.ctx.close();
  }
  const pe=P.errs.filter(x=>!/Failed to load resource/.test(x)); results.push({id:"ERR",ok:!pe.length}); console.log(`${!pe.length?"PASS":"FAIL"} ERR   Lehe vead testide ajal${pe.length?`\n        → ${pe.slice(0,5).join(" | ")}`:""}`);
  await L.close();
  const n=results.length, p=results.filter(r=>r.ok).length;
  console.log(`\nKOKKU: ${p}/${n} läbis, ${n-p} ebaõnnestus (${path.basename(FILE)})`);
  process.exit(n===p?0:1);
})();
