/* Koostab võrdlusväärtused Raplamaa arengukanga (põhimudel) mootorist.
 * Kasutus: node tools/rak_reference.js <raplamaa-arengumudel repo kaust> > data/reference.json
 * Põhimudeli koodi ei muudeta: src/base.html-ist loetakse mootori ja maksu plokk (const AGEL= … enne
 * "Graafikud") ning laP/eduDemand read ja käivitatakse eraldi kontekstis repo andmetega. */
const fs=require("fs"),path=require("path"),vm=require("vm");
const repo=process.argv[2],rd=f=>JSON.parse(fs.readFileSync(path.join(repo,"data",f+".json")));
const L=fs.readFileSync(path.join(repo,"src/base.html"),"utf8").split("\n");
const at=(re,from=0)=>{for(let i=from;i<L.length;i++)if(re.test(L[i]))return i;throw new Error("ei leidnud "+re);};
const s=at(/^const AGEL=/),e=at(/^\/\* ---------- Graafikud/),q=at(/^const laP=a=>/);
const code=L.slice(s,e).join("\n")+"\n"+L.slice(q,q+5).join("\n");
const ctx={POP:rd("pop"),EXT:rd("ext"),FINS:rd("fins"),MTA:rd("mta"),BUD:rd("bud"),EDU:rd("edu"),V:["Rapla","Kohila","Marjamaa","Kehtna"],Math,Object,Array,String,JSON,Map,Number};
vm.createContext(ctx);
vm.runInContext(code+`
;runModel();var OUT={SC:{},PROJ2036:{},CAL:{},tax:{},edu:{},proj:{}};
for(const m of Object.keys(SC)){OUT.SC[m]={};for(const u of [...V,"MAAK"])OUT.SC[m][u]={2031:SC[m][u][2031],2036:SC[m][u][2036]};}
for(const u of [...V,"MAAK"])OUT.PROJ2036[u]=PROJ[u][2036].slice();
for(const v of V)OUT.CAL[v]={k:CAL[v].k,k1620:CAL[v].k1620,k2125:CAL[v].k2125,f:CAL[v].f,fOld:CAL[v].fOld,fMid:CAL[v].fMid,uaExc:CAL[v].uaExc,bal3:CAL[v].bal3,korr1:CAL[v].korr1,korr2:CAL[v].korr2};
for(const u of [...V,"MAAK"]){const t=taxSeries(u);OUT.tax[u]={2026:t[2026],2030:t[2030],2036:t[2036]};}
for(const v of V){const d=eduDemand(v,2036);OUT.edu[v]={la:d.la,sc:d.sc};}
OUT.FSLOPE=FSLOPE;OUT.LAM=LAM;OUT.KC=KC;
OUT.bt={};for(const v of V){const T=a=>a.reduce((x,y)=>x+y,0);OUT.bt[v]={act:POP[v].tot["2026"],ins:T(projectFrom(v,2021,2026,CAL[v].r2full,CAL[v].fMid,()=>CAL[v].k2125)[2026]),oos:T(projectFrom(v,2021,2026,CAL[v].r1full,CAL[v].fOld,()=>CAL[v].k1620)[2026])};}
for(const mig of ["r1","mean","r2","r2x","r3"])for(const sc of [["const","const"],["down","tr"]]){S.mig=mig;S.fertTr=sc[0];S.mort=sc[1];
  const k=mig+"|"+sc[0]+"|"+sc[1];OUT.proj[k]={};V.forEach(v=>OUT.proj[k][v]=projectFrom(v,START,YN,CAL[v][mig],fFn(v,0),kFn(v)));}`,ctx);
let commit=null;try{commit=require("child_process").execSync("git -C "+JSON.stringify(repo)+" rev-parse --short HEAD").toString().trim();}catch(_){}
ctx.OUT.source={repo:"virpooy/raplamaa-arengumudel",commit,file:"src/base.html",model:"kohortmudel v6 (üheaastaste vanuste mootor)"};
process.stdout.write(JSON.stringify(ctx.OUT));
