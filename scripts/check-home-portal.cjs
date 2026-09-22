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
      assert.equal(await page.locator(".portal-card").count(),5);
      assert.equal(await page.locator(".home-main-action").count(),0);
      assert.equal(await page.locator(".home-more").evaluate(el=>el.open),false);
      assert.equal(await page.locator(".portal-hero").isVisible(),false);
      assert.equal(await page.locator('#homeProfileForm input[name="className"]').count(),1);
      assert.equal(await page.locator(".student-account-button").count(),1);
      await page.locator(".student-account-button").click();
      await page.waitForSelector(".student-account-dialog[open] #studentGuest");
      assert.equal(await page.locator("#studentGuestStart").isVisible(),true);
      assert.equal(await page.locator("#studentAccountForm").isVisible(),false);
      await page.screenshot({path:"artifacts/student-entry-"+viewport.name+".png",fullPage:false});
      await page.locator('[data-mode="register"]').click();
      assert.equal(await page.locator('#studentAccountForm input[name="name"]').isVisible(),true);
      assert.equal(await page.locator('#studentAccountForm input[name="confirm"]').isVisible(),true);
      await page.locator("#studentBack").click();
      await page.locator('[data-mode="login"]').click();
      assert.equal(await page.locator('#studentAccountForm input[name="name"]').isVisible(),false);
      assert.equal(await page.locator('#studentAccountForm input[name="id"]').count(),1);
      await page.locator("#studentBack").click();
      await page.locator("#studentGuestStart").click();
      assert.equal(await page.locator(".student-account-dialog").evaluate(el=>el.open),false);
      const overflow=await page.evaluate(()=>({wide:document.documentElement.scrollWidth>innerWidth,width:innerWidth,scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll("body *")].map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).filter(x=>x.right>innerWidth+1).slice(0,8)}));
      assert.equal(overflow.wide,false,JSON.stringify(overflow));
      assert.equal(errors.length,0,errors.join("\n"));
      await page.screenshot({path:"artifacts/home-simple-"+viewport.name+".png",fullPage:false});
      await page.locator(".home-more>summary").click();
      await page.locator("#findQ").fill("고3 9월");
      await page.waitForSelector('.find-hit[href*="files.html?grade=3"]');
      await page.screenshot({path:"artifacts/home-"+viewport.name+".png",fullPage:false});
      await page.locator('#homeProfileForm input[name="name"]').fill("민수");
      await page.locator('#homeProfileForm select[name="grade"]').selectOption("2");
      await page.locator('#homeProfileForm button[type="submit"]').click();
      assert.equal(await page.locator(".home-main-action").count(),1);
      assert.equal(await page.locator(".home-study-summary span").count(),3);
      assert.match(await page.locator(".home-main-action").getAttribute("href"),/today\.html\?grade=2/);
      await page.locator(".home-more>summary").click();
      await page.screenshot({path:"artifacts/home-personal-simple-"+viewport.name+".png",fullPage:false});
      await page.evaluate(()=>{
        const d=new Date(),today=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
        localStorage.setItem("today-study-records",JSON.stringify([{date:today,grade:"2",track:"algebra",correct:3,total:5,finishedAt:d.toISOString()}]));
        localStorage.setItem("math-wrong-notes-v1",JSON.stringify([{id:"sample",mastered:false}]));
      });
      await page.reload({waitUntil:"networkidle"});
      assert.equal(await page.locator(".home-main-action").getAttribute("href"),"wrong-notes.html");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:820,height:1050}});
    await page.goto("http://127.0.0.1:5198/files.html?grade=2&year=2025",{waitUntil:"networkidle"});
    await page.waitForSelector('.grade-tab.on[data-grade="2"]');
    assert.equal(await page.locator(".exam-bundle").count(),4);
    assert.equal(await page.locator("#yearFilter").inputValue(),"2025");
    await page.close();
    console.log("메인 검사 통과: 단일 학습 행동, 기록 요약, 활동 5개, 통합 검색, 학년·연도 바로가기, 데스크톱·태블릿·모바일");
  }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
