const fs=require("fs"),path=require("path"),http=require("http"),assert=require("assert");
const {chromium}=require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root=path.join(__dirname,"..");
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,"http://localhost").pathname;
  if(["/api/files","/api/questions","/api/notices"].includes(pathname)){res.setHeader("Content-Type","application/json");res.end("[]");return}
  if(pathname==="/api/student-account"){res.setHeader("Content-Type","application/json");res.end('{"signedIn":false}');return}
  const relative=pathname==="/"?"/index.html":pathname;
  const file=path.join(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return}
  const types={".css":"text/css",".js":"text/javascript",".json":"application/json",".png":"image/png",".webmanifest":"application/manifest+json"};
  res.setHeader("Content-Type",types[path.extname(file)]||"text/html");
  res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(5198,"127.0.0.1",resolve));
  const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
  try{
    for(const viewport of [{name:"desktop",width:1280,height:900},{name:"tablet",width:820,height:1050},{name:"mobile",width:390,height:844}]){
      const page=await browser.newPage({viewport});
      const errors=[];page.on("pageerror",e=>errors.push(e.message));
      await page.goto("http://127.0.0.1:5198/index.html",{waitUntil:"networkidle"});
      assert.equal(await page.locator(".grade-entry a").count(),3);
      assert.equal(await page.locator(".portal-card").count(),7);
      assert.equal(await page.locator("#examCount").textContent(),"39개 시험");
      assert.equal(await page.locator('#homeProfileForm input[name="className"]').count(),1);
      assert.equal(await page.locator(".student-account-button").count(),1);
      await page.locator(".student-account-button").click();
      await page.waitForSelector(".student-account-dialog[open] #studentAccountForm");
      assert.equal(await page.locator('#studentAccountForm input[name="id"]').count(),1);
      await page.locator(".student-dialog-close").click();
      const overflow=await page.evaluate(()=>({wide:document.documentElement.scrollWidth>innerWidth,width:innerWidth,scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll("body *")].map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).filter(x=>x.right>innerWidth+1).slice(0,8)}));
      assert.equal(overflow.wide,false,JSON.stringify(overflow));
      assert.equal(errors.length,0,errors.join("\n"));
      await page.locator("#findQ").fill("고3 9월");
      await page.waitForSelector('.find-hit[href*="files.html?grade=3"]');
      await page.screenshot({path:"artifacts/home-"+viewport.name+".png",fullPage:false});
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:820,height:1050}});
    await page.goto("http://127.0.0.1:5198/files.html?grade=2&year=2025",{waitUntil:"networkidle"});
    await page.waitForSelector('.grade-tab.on[data-grade="2"]');
    assert.equal(await page.locator(".exam-bundle").count(),4);
    assert.equal(await page.locator("#yearFilter").inputValue(),"2025");
    await page.close();
    console.log("메인 검사 통과: 학년 3개, 활동 7개, 기출 39회, 통합 검색, 학년·연도 바로가기, 데스크톱·태블릿·모바일");
  }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
