const E=require("../../engine.js"),fs=require("fs"),rd=f=>JSON.parse(fs.readFileSync(__dirname+"/../../data/"+f+".json"));
const data={kov:rd("kov"),pop:rd("pop"),fin:rd("fin"),edu:rd("edu"),ext:rd("ext"),settlements:rd("settlements")};
const ctx=E.build(data),id="Kohila",P=E.project(ctx,id,{});
const r=x=>Math.round(x);
console.log("pop",r(E.total(P[2026])),r(E.total(P[2031])),r(E.total(P[2036])));
for(const y of [2026,2031,2036]){const d=E.eduDemand(ctx,id,P[y]);console.log("edu",y,r(d.la),r(d.pk),r(d.g));}
console.log("eduBase",JSON.stringify(ctx.eduBase[id]));console.log("uc",JSON.stringify(ctx.uc[id]));
const T=E.taxSeries(ctx,id,E.agesFn(ctx,id,P));console.log("tax",r(T[2026]),r(T[2036]),r(T[2036]/E.wageIdx(ctx,2036)));
const mk=(n,type)=>E.housingImpact(ctx,id,{n,type,start:2028,years:3},{});
let tot={dPop:0,dLa:0,dSc:0};const parts=[[40,"eramu"],[20,"ridaelamu"],[40,"korter"]].map(([n,t])=>mk(n,t));
for(const y of [2031,2036]){const s=k=>parts.reduce((a,h)=>a+h.rows.find(q=>q.y===y)[k],0);console.log("dp100",y,"newc",r(parts.reduce((a,h)=>a+h.newcomers,0)),"dPop",r(s("dPop")),"dLa",s("dLa").toFixed(1),"dSc",s("dSc").toFixed(1),"dTaxR",r(s("dTaxR")),"dCost",r(s("dCost")));}
