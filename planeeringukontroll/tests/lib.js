// Ühine laadija: serveerib antud HTML-i, lisab IIFE lõppu ühe testikonksu (window.__ev) – faili ennast ei muudeta.
const {chromium}=require("playwright"); const http=require("http"), fs=require("fs");
const HOOK="\nwindow.__ev=(c)=>eval(c);\n})();\n</script>";
function hooked(file){ const src=fs.readFileSync(file,"utf8"); const i=src.lastIndexOf("\n})();\n</script>"); if(i<0) throw new Error("IIFE lõppu ei leitud"); return src.slice(0,i)+HOOK+src.slice(i+"\n})();\n</script>".length); }
async function launch(file){
  const html=hooked(file);
  const srv=http.createServer((q,r)=>{ r.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}); r.end(html); });
  await new Promise(ok=>srv.listen(0,ok)); const port=srv.address().port;
  const browser=await chromium.launch();
  async function page(opts={}){
    const ctx=await browser.newContext({viewport:opts.viewport||{width:1280,height:900}, colorScheme:opts.colorScheme||"light"});
    await ctx.route(/^https?:\/\/(?!localhost)/, r=>r.abort());
    if(opts.init) await ctx.addInitScript(opts.init);
    const p=await ctx.newPage(); const errs=[]; p.on("pageerror",e=>errs.push(e.message)); p.on("console",m=>{ if(m.type()==="error") errs.push("console: "+m.text()); });
    await p.goto(`http://localhost:${port}/${opts.hash||"#toolaud"}`); await p.waitForFunction(()=>!!window.__ev,null,{timeout:15000}); await p.waitForTimeout(300);
    const ev=(code,arg)=>p.evaluate(([c,a])=>window.__ev(`(async()=>{ const ARG=${JSON.stringify(a===undefined?null:a)}; ${c} })()`),[code,arg]);
    return {p, ctx, ev, errs};
  }
  return {page, close:async()=>{ await browser.close(); srv.close(); }};
}
module.exports={launch, hooked};
