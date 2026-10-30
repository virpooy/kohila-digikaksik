const E=require("./engine.js"),fs=require("fs"),rd=f=>JSON.parse(fs.readFileSync("data/"+f+".json"));
const data={kov:rd("kov"),pop:rd("pop"),fin:rd("fin"),edu:rd("edu"),ext:rd("ext"),settlements:rd("settlements")};
const ctx=E.build(data);const res=E.selfTest(ctx,rd("reference"));
res.forEach(r=>console.log(r.ok?"OK  ":"FAIL",r.id,r.name,"—",r.detail));
console.log(res.every(r=>r.ok)?"Kõik testid läbitud":"TESTID EBAÕNNESTUSID");process.exitCode=res.every(r=>r.ok)?0:1;
