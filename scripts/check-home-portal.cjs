const fs=require("fs"),path=require("path"),http=require("http"),assert=require("assert");
const {chromium}=require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root=path.join(__dirname,"..");
let accountRequests=0;
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,"http://localhost").pathname;
  if(["/api/files","/api/questions","/api/notices"].includes(pathname)){res.setHeader("Content-Type","application/json");res.end("[]");return}
  if(pathname==="/api/student-account"){accountRequests++;res.writeHead(410).end();return}
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
      const groups = page.locator("#navLinks details");
      assert.deepEqual(await groups.locator("summary").allTextContents(), ["학습", "자료·개념", "더보기"]);
      const destinations = ["today.html", "past-practice.html", "wrong-notes.html", "files.html", "library.html", "map.html", "games.html", "ask.html"];
      assert.deepEqual(await groups.locator("a").evaluateAll(links => links.map(link => link.getAttribute("href"))), destinations);
      assert.ok(destinations.every(file => fs.existsSync(path.join(root, file))));
      assert.equal(await groups.locator("a:visible").count(), 0);
      assert.equal(await page.locator("#homeTry").getAttribute("href"), "today.html");
      assert.equal(await page.locator("#homeTry .home-welcome-label").innerText(), "오늘의 5문제 시작");
      assert.deepEqual(await page.locator("#more a").evaluateAll(links => links.map(link => link.getAttribute("href"))), ["past-practice.html", "wrong-notes.html"]);
      assert.equal(await page.locator(".home-main-action").count(), 0);
      assert.equal(await page.locator("#homeProfileForm").count(), 0);
      assert.equal(await page.locator(".student-account-button, #homeLogin, #homeJoin").count(), 0);

      const overflow=await page.evaluate(()=>({wide:document.documentElement.scrollWidth>innerWidth,width:innerWidth,scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll("body *")].map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).filter(x=>x.right>innerWidth+1).slice(0,8)}));
      assert.equal(overflow.wide,false,JSON.stringify(overflow));
      assert.equal(errors.length,0,errors.join("\n"));
      await page.screenshot({path:"artifacts/home-simple-"+viewport.name+".png",fullPage:false});

      for (const [index, expected] of [3, 3, 2].entries()) {
        const group = groups.nth(index);
        await group.locator("summary").click();
        assert.equal(await groups.locator("a:visible").count(), expected);
        const bounds = await group.locator("ul").boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width);
      }
      await groups.last().locator("a").first().focus();
      await page.keyboard.press("Escape");
      assert.equal(await groups.locator("a:visible").count(), 0);
      assert.equal(await groups.last().locator("summary").evaluate(el => document.activeElement === el), true);
      await groups.first().locator("summary").press("Enter");
      assert.equal(await groups.locator("a:visible").count(), 3);
      await page.locator(".footer-base").click();
      assert.equal(await groups.locator("a:visible").count(), 0);
      const guest = await browser.newPage({viewport});
      try {
        await guest.goto("http://127.0.0.1:5198/index.html");
        await guest.locator("#homeTry").click();
        await guest.waitForURL(url=>url.pathname.endsWith("/today.html"));
        await guest.locator("#todayStart").click();
        const questionLink = guest.getByRole("link", {name:"이 문제 질문하기 (새 탭)"});
        const [questionPage] = await Promise.all([guest.waitForEvent("popup"), questionLink.click()]);
        await questionPage.waitForURL("**/ask.html#askForm");
        await questionPage.waitForSelector("#askForm");
        assert.equal(await guest.locator(".daily-question").isVisible(), true);
        await questionPage.close();
      } finally {
        await guest.close();
      }

      /* 둘러보다 오늘의 5문제를 푼 학생 — 가입을 안 해도 홈이 그 사람 것이 됩니다 */
      await page.evaluate(()=>{
        localStorage.setItem("math-home-profile-v1",JSON.stringify({name:"민수",grade:"2",className:"",track:"algebra"}));
        localStorage.setItem("today-study-pref",JSON.stringify({grade:"2",track:"algebra"}));
      });
      await page.reload({waitUntil:"networkidle"});
      assert.equal(await page.locator(".home-main-action").count(),1);
      assert.equal(await page.locator(".home-study-summary span").count(),3);
      assert.match(await page.locator(".home-main-action").getAttribute("href"),/today\.html\?grade=2/);
      await page.screenshot({path:"artifacts/home-personal-simple-"+viewport.name+".png",fullPage:false});

      assert.equal(await page.locator(".weekly-study-plan").count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.close();
    }
    /* 홈에서 뺀 수학 탈출이 실제로 게임 목록 안에 있어야 합니다.
       한쪽에서 빼고 다른 쪽에 넣는 걸 잊으면 아무도 못 가는 쪽이 됩니다. */
    {
      const 게임 = await browser.newPage({viewport:{width:1280,height:900}});
      await 게임.goto("http://127.0.0.1:5198/games.html",{waitUntil:"networkidle"});
      await 게임.waitForSelector('a[href^="escape.html"], a[href="escape.html"]',{timeout:5000})
        .catch(()=>{throw new Error("게임 목록에 수학 탈출이 없습니다 — 홈에서도 뺐으니 아무도 못 갑니다")});
      await 게임.close();
    }

    const page=await browser.newPage({viewport:{width:820,height:1050}});
    await page.goto("http://127.0.0.1:5198/files.html?grade=2&year=2025",{waitUntil:"networkidle"});
    await page.waitForSelector('.grade-tab.on[data-grade="2"]');
    assert.equal(await page.locator(".exam-bundle").count(),4);
    assert.equal(await page.locator("#yearFilter").inputValue(),"2025");
    await page.close();
    assert.equal(accountRequests,0);

    // 기존 세션이 확인된 브라우저에서 저장한 풀이와 펜을 계정 화면 없이 이어갑니다.
    const previous = await browser.newPage({viewport:{width:390,height:844}});
    let migrationRequests = 0;
    await previous.route(url=>url.pathname==="/api/student-account"&&url.searchParams.get("migration")==="1", route=>{
      migrationRequests++;
      return route.fulfill({json:{owner:"old123"}});
    });
    await previous.goto("http://127.0.0.1:5198/index.html");
    await previous.evaluate(()=>{
      const questions=window.TODAY_TRACKS.common1.questions.slice(0,5);
      const date=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
      localStorage.setItem("math-student-data-owner","old123");
      window.StudyDraft.save("student-old123","daily-1-common1",{grade:"1",trackKey:"common1",date,questions,index:0,answers:[],selected:null,locked:false,hintCount:0,input:"",ink:{pages:[]}});
    });
    await previous.reload();
    await previous.locator(".home-main-action").click();
    await previous.waitForSelector("#scratchCanvas");
    assert.equal(await previous.locator(".daily-progress").innerText(),"1 / 5");
    assert.equal(await previous.evaluate(()=>window.StudyDevice.draftOwner()),"student-old123");
    assert.equal(migrationRequests,1);
    await previous.close();
    console.log("메인 검사 통과: 상단 메뉴 3개·키보드로 열기와 닫기·오늘의 5문제 시작·질문 폼 새 탭·계정 요청 없음·브라우저 학습 설정·공개 자료·PC/태블릿/모바일");
  }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
