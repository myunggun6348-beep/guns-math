const assert=require("assert");
const {chromium}=require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
  try{
    for(const test of [{name:"desktop",width:1280,height:960},{name:"tablet",width:820,height:1180}]){
      const page=await browser.newPage({viewport:{width:test.width,height:test.height}});
      const pageErrors=[],badResponses=[];
      page.on("pageerror",error=>pageErrors.push(error.message));
      page.on("response",response=>{if(response.status()>=400&&!["/api/files","/_vercel/insights/script.js"].some(path=>response.url().includes(path)))badResponses.push(response.status()+" "+response.url())});
      await page.goto("http://127.0.0.1:5173/files.html",{waitUntil:"networkidle"});
      await page.waitForSelector(".exam-bundle");
      assert.equal(await page.locator(".exam-bundle").count(),39);
      assert.equal(await page.locator('[data-grade="1"] span').textContent(),"11개");
      assert.equal(await page.locator('[data-grade="2"] span').textContent(),"11개");
      assert.equal(await page.locator('[data-grade="3"] span').textContent(),"17개");
      await page.click('[data-grade="3"]');
      assert.equal(await page.locator(".exam-bundle").count(),17);
      assert.equal(await page.locator(".exam-file-button").count(),153);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.equal(pageErrors.length,0,pageErrors.join("\n"));
      assert.equal(badResponses.length,0,badResponses.join("\n"));
      await page.screenshot({path:"artifacts/files-"+test.name+".png",fullPage:true});
      await page.close();
    }
    console.log("브라우저 검사 통과: 39회, 학년별 11·11·17회, 3학년 153개 파일 버튼, 가로 넘침·콘솔 오류 없음");
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});