const fs=require("fs"),path=require("path"),http=require("http"),assert=require("assert");
const {chromium}=require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root=path.join(__dirname,"..");
const {merge}=require("../assets/study-state");
const 계정={만든것:{},지금:null,기록:{}};   // 학생 계정 흉내가 쓰는 기억 (검사 한 판 동안만)
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,"http://localhost").pathname;
  if(["/api/files","/api/questions","/api/notices"].includes(pathname)){res.setHeader("Content-Type","application/json");res.end("[]");return}
  /* 학생 계정 흉내 — 진짜 저장소 없이 가입·로그인 길만 걸어 봅니다.
     여기서 보려는 건 '가입을 누르면 실제로 계정이 생기고 홈이 바뀌는가' 입니다. */
  if(pathname==="/api/student-account"){
    res.setHeader("Content-Type","application/json");
    if(req.method!=="POST"){res.end(JSON.stringify(계정.지금?{signedIn:true,student:계정.지금,data:계정.기록}:{signedIn:false}));return}
    let 몸="";req.on("data",조각=>몸+=조각);
    req.on("end",()=>{
      const 받은=JSON.parse(몸||"{}");
      if(받은.action==="register"){
        if(계정.만든것[받은.id]){res.writeHead(409).end('{"error":"이미 사용 중인 학생 코드입니다."}');return}
        계정.만든것[받은.id]={pin:받은.pin,name:받은.name||""};
        계정.지금={id:받은.id,name:받은.name||""};계정.기록={};
        res.end(JSON.stringify({signedIn:true,student:계정.지금,data:{}}));return;
      }
      if(받은.action==="login"){
        const 있는것=계정.만든것[받은.id];
        if(!있는것||있는것.pin!==받은.pin){res.writeHead(401).end('{"error":"학생 코드 또는 PIN을 확인해 주세요."}');return}
        계정.지금={id:받은.id,name:있는것.name};
        res.end(JSON.stringify({signedIn:true,student:계정.지금,data:계정.기록}));return;
      }
      if(받은.action==="sync"){계정.기록=merge(받은.data||{},계정.기록);res.end(JSON.stringify({ok:true,data:계정.기록}));return}
      if(받은.action==="logout"){계정.지금=null;res.end('{"ok":true}');return}
      res.writeHead(400).end('{"error":"모르는 요청"}');
    });
    return;
  }
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
      /* 개수를 적어 두면 활동이 하나 늘 때마다 틀립니다(5 라고 적힌 채 9 가 됐었다).
         대신 '학생이 갈 수 있는 페이지가 빠짐없이 적혀 있는가'를 봅니다 —
         실제로 오늘의 학습·오답노트·자동 선별 기출·수학 탈출이 빠져 있었습니다. */
      const 선생님것=["admin.html","question-bank.html","review.html"];
      /* 홈 목록에 둘 자리가 아닌 쪽들.
         solve·quick-game 은 주소에 ?id=·?game= 이 있어야 열립니다.
         escape(수학 탈출)는 혼자서도 열리지만, 게임이 홈과 게임 목록 두 군데로
         나뉘어 보이지 않게 일부러 게임 안쪽에만 둡니다 — 아래에서 게임 목록이
         정말 데리고 가는지 따로 확인합니다. */
      const 혼자못감=["index.html","solve.html","quick-game.html","escape.html"];
      const 학생페이지=fs.readdirSync(root).filter(f=>f.endsWith(".html")&&!선생님것.includes(f)&&!혼자못감.includes(f));
      const 적힌것=await page.locator(".portal-card").evaluateAll(els=>els.map(el=>el.getAttribute("href").split(/[?#]/)[0]));
      const 빠진것=학생페이지.filter(f=>!적힌것.includes(f));
      assert.equal(빠진것.length,0,"'이 사이트에 있는 것'에서 빠진 페이지: "+빠진것.join(", "));
      assert.equal(new Set(적힌것).size,적힌것.length,"같은 페이지가 두 번 적혀 있습니다: "+적힌것.join(", "));
      assert.ok(!적힌것.includes("escape.html"),"수학 탈출은 홈이 아니라 게임 안에만 있어야 합니다");
      assert.equal(await page.locator(".home-main-action").count(),0);
      assert.equal(await page.locator(".home-more").evaluate(el=>el.open),true);
      assert.equal(await page.locator(".portal-hero").isVisible(),false);
      /* 첫 화면의 큰 문은 하나(오늘의 5문제)이고, 둘러보기는 글줄, 가입은 그 아래 한 줄입니다.
         입력 칸도, 오른쪽 위 계정 단추도 여기서는 안 보입니다
         (예전에는 문이 셋이라 같은 것을 두 군데서 고르게 돼 있었습니다). */
      assert.equal(await page.locator(".home-start-card").count(),1);
      assert.equal(await page.locator(".home-start-go").count(),1,"큰 문이 하나가 아닙니다");
      assert.equal(await page.locator(".home-start-go").getAttribute("id"),"homeLogin","첫 입구가 로그인이어야 합니다");
      assert.equal(await page.locator("#homeProfileForm").count(),0,"첫 화면에 입력 칸이 또 생겼습니다");
      /* 고를 것은 둘 — 로그인 / 로그인 없이 써 보기. 회원가입은 로그인 아래 글씨 한 줄.
         이 입구는 두 번이나 다시 늘어났습니다(한때 로그인·회원가입·자료 둘러보기·
         가입 없이 체험하기·아이디 찾기 다섯 개). 아이디 찾기는 로그인 창 안에 있습니다. */
      const 입구=await page.evaluate(()=>{const 카드=document.querySelector(".home-start-card");
        const 누를것=[...카드.querySelectorAll("a,button")].filter(e=>e.checkVisibility());
        return {단추:누를것.filter(e=>e.classList.contains("btn")).map(e=>e.textContent.trim()),글씨:누를것.filter(e=>!e.classList.contains("btn")).map(e=>e.textContent.trim())};});
      assert.deepEqual(입구.단추,["로그인 →","로그인 없이 써 보기"],"홈 첫 카드의 단추가 둘이 아닙니다: "+입구.단추.join(", "));
      assert.deepEqual(입구.글씨,["회원가입"],"홈 첫 카드에 글씨 링크가 늘었습니다: "+입구.글씨.join(", "));

      assert.equal(await page.evaluate(()=>Boolean(document.getElementById('homePersonal').compareDocumentPosition(document.getElementById('more'))&Node.DOCUMENT_POSITION_FOLLOWING)),true,'전체 메뉴가 학습 카드 아래에 와야 합니다');
      assert.equal(await page.locator(".student-account-button").isVisible(),true,"로그인 입구가 없습니다");

      /* 가입은 네 가지만 묻습니다 — 이름(선택)·학년·아이디·비밀번호.
         과목까지 고르게 하면 처음 온 학생에게 답하기 어려운 질문이 됩니다
         (학년에 맞는 기본 과목으로 시작하고 홈에서 언제든 바꿉니다). */
      await page.locator("#homeJoin").click();
      await page.waitForSelector(".student-account-dialog[open] #studentAccountForm");
      for(const 칸 of ["name","grade","id","pin","confirm"])
        assert.equal(await page.locator('#studentAccountForm [name="'+칸+'"]').isVisible(),true,"가입 칸이 없습니다: "+칸);
      assert.equal(await page.locator('#studentAccountForm [name="track"]').count(),0,"가입에서 과목을 또 묻고 있습니다");
      assert.match(await page.locator(".student-account-card .student-account-help").innerText(),/선생님/,"선생님이 기록을 본다는 안내가 없습니다");
      await page.screenshot({path:"artifacts/student-entry-"+viewport.name+".png",fullPage:false});

      // 로그인으로 바꾸면 아이디·비밀번호만
      await page.locator("#studentSwap").click();
      await page.waitForSelector('#studentAccountForm [name="id"]');
      assert.equal(await page.locator('#studentAccountForm [name="confirm"]').isVisible(),false);
      assert.equal(await page.locator('#studentAccountForm [name="grade"]').isVisible(),false);
      await page.locator('#studentRecovery').click();assert.match(await page.locator('.student-recovery-section').last().innerText(),/초기화/);await page.locator('#findStudentId').click();assert.match(await page.locator('#studentIdResult').innerText(),/아이디가 없습니다/);
      await page.evaluate(()=>localStorage.setItem('math-student-data-owner','sample123'));await page.locator('#findStudentId').click();assert.match(await page.locator('#studentIdResult').innerText(),/sample123/);await page.getByRole('button',{name:'이 아이디로 로그인',exact:true}).click();assert.equal(await page.locator('#studentAccountForm [name="id"]').inputValue(),'sample123');await page.evaluate(()=>localStorage.removeItem('math-student-data-owner'));
      await page.locator(".student-dialog-close").click();
      assert.equal(await page.locator(".student-account-dialog").evaluate(el=>el.open),false);
      const overflow=await page.evaluate(()=>({wide:document.documentElement.scrollWidth>innerWidth,width:innerWidth,scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll("body *")].map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).filter(x=>x.right>innerWidth+1).slice(0,8)}));
      assert.equal(overflow.wide,false,JSON.stringify(overflow));
      assert.equal(errors.length,0,errors.join("\n"));
      await page.screenshot({path:"artifacts/home-simple-"+viewport.name+".png",fullPage:false});

      /* '둘러보기'를 누르면 접힌 칸이 실제로 펼쳐져야 합니다
         (전에는 그 자리로 내려가기만 하고 닫힌 채였습니다). */
      /* 홈 맨 위는 다른 쪽과 같은 메뉴입니다 — 컴퓨터는 메뉴 줄, 폰은 ☰.
         한때 홈만 메뉴를 숨기고 '둘러보기'를 두어서, 로그인한 학생은 카드가 길면 다른 쪽으로
         가는 길이 첫 화면에 없었습니다. ☰ 를 눌러 메뉴가 실제로 열리는지까지 봅니다. */
      assert.equal(await page.locator(".home-nav-more").count(),0,"홈에 '둘러보기'가 다시 생겼습니다");
      const 메뉴=await page.evaluate(()=>[...document.querySelectorAll("#navLinks a")].map(a=>a.textContent.trim()));
      assert.deepEqual(메뉴,["오늘의 학습","오답노트","자료실","직접 보는 수학","개념 지도","게임","질문"],"홈 메뉴가 다른 쪽과 다릅니다: "+메뉴.join(", "));
      if(viewport.width>=900){
        assert.equal(await page.locator("#navLinks").isVisible(),true,"컴퓨터 홈에 메뉴 줄이 안 보입니다");
      }else{
        assert.equal(await page.locator(".nav-toggle").isVisible(),true,"폰 홈에 ☰ 가 없습니다");
        await page.locator("#navToggle").click();await page.waitForTimeout(250);
        assert.equal(await page.locator("#navLinks a").first().isVisible(),true,"☰ 를 눌러도 메뉴가 안 열립니다");
        await page.locator("#navToggle").click();await page.waitForTimeout(250);
      }
      await page.evaluate(()=>document.getElementById("more").scrollIntoView());
      await page.waitForTimeout(300);
      assert.equal(await page.locator(".home-more").evaluate(el=>el.open),true,"'둘러보기'를 눌러도 칸이 안 열립니다");
      await page.locator(".home-more>summary").click();   // 다시 닫고 아래 검사를 이어 갑니다
      await page.locator(".home-more>summary").click();
      await page.screenshot({path:"artifacts/home-"+viewport.name+".png",fullPage:false});

      /* 둘러보다 오늘의 5문제를 푼 학생 — 가입을 안 해도 홈이 그 사람 것이 됩니다 */
      await page.evaluate(()=>{
        localStorage.setItem("math-home-profile-v1",JSON.stringify({name:"민수",grade:"2",className:"",track:"algebra"}));
        localStorage.setItem("today-study-pref",JSON.stringify({grade:"2",track:"algebra"}));
        sessionStorage.setItem('math-home-explore','true');
      });
      await page.reload({waitUntil:"networkidle"});
      assert.equal(await page.locator(".home-main-action").count(),1);
      assert.equal(await page.locator(".home-study-summary span").count(),4);
      assert.match(await page.locator(".home-main-action").getAttribute("href"),/today\.html\?grade=2/);
      await page.screenshot({path:"artifacts/home-personal-simple-"+viewport.name+".png",fullPage:false});

      await page.evaluate(()=>{
        const d=new Date(),today=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
        localStorage.setItem("today-study-records",JSON.stringify([{date:today,grade:"2",track:"algebra",correct:3,total:5,finishedAt:d.toISOString()}]));
        localStorage.setItem("math-wrong-notes-v1",JSON.stringify([{id:"a",mastered:false},{id:"b",mastered:false}]));
      });
      await page.reload({waitUntil:"networkidle"});
      assert.equal(await page.locator(".home-main-action").getAttribute("href"),"wrong-notes.html?view=due");
      assert.match(await page.locator(".home-main-action").innerText(),/오늘 복습할 2문제/);
      /* 고른 뒤에는 가입 이야기를 다시 꺼내지 않습니다. 기록이 쌓이면 '이 기기에만
         있습니다' 하는 줄을 띄운 적이 있는데, 닫을 수가 없어 잔소리가 됐습니다. */
      assert.equal(await page.locator(".home-keep").count(),0,"공부하는 학생에게 가입하라고 또 붙어 있습니다");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.close();
    }
    /* ---- 가입을 끝까지 눌러 봅니다 (화면 폭마다 할 필요는 없어서 한 번만) ----
       여기까지 되어야 '가입하기'가 진짜 문입니다: 계정이 생기고, 적은
       학년·과목이 계정으로 올라가고, 홈이 그 학생의 화면으로 바뀌어야 합니다. */
    {
      const 가입 = await browser.newPage({viewport:{width:1280,height:900}});
      가입.on("pageerror",e=>{throw e});
      await 가입.goto("http://127.0.0.1:5198/index.html",{waitUntil:"networkidle"});
      await 가입.evaluate(()=>localStorage.clear());
      await 가입.reload({waitUntil:"networkidle"});
      await 가입.locator("#homeJoin").click();
      await 가입.waitForSelector(".student-account-dialog[open] #studentAccountForm");
      await 가입.locator('#studentAccountForm [name="name"]').fill("민수");
      await 가입.locator('#studentAccountForm [name="grade"]').selectOption("2");
      await 가입.locator('#studentAccountForm [name="id"]').fill("minsu2026");

      /* 뻔한 비밀번호는 막혀야 합니다.
         '1234' 는 브라우저가 minlength 로 먼저 잡아서 우리 글귀가 안 뜹니다 —
         그때는 '가입이 안 됐다'만 봅니다. 나머지는 왜 안 되는지 알려 줘야 합니다. */
      for(const [나쁜것,말] of [["1234",null],["111111",/같은 숫자/],["123456",/이어지는 숫자/]]){
        await 가입.locator('#studentAccountForm [name="pin"]').fill(나쁜것);
        await 가입.locator('#studentAccountForm [name="confirm"]').fill(나쁜것);
        await 가입.locator('#studentAccountForm button[type="submit"]').click();
        await 가입.waitForTimeout(150);
        if(말) assert.match(await 가입.locator(".student-account-error").innerText(),말,"왜 안 되는지 안 알려 줍니다: "+나쁜것);
        assert.equal(await 가입.locator(".home-main-action").count(),0,"뻔한 비밀번호 '"+나쁜것+"' 로 가입이 됐습니다");
      }

      await 가입.locator('#studentAccountForm [name="pin"]').fill("728315");
      await 가입.locator('#studentAccountForm [name="confirm"]').fill("728315");
      await 가입.locator('#studentAccountForm button[type="submit"]').click();
      await 가입.waitForSelector(".home-main-action");

      assert.equal(await 가입.locator(".student-account-button").isVisible(),true,"가입했는데 계정 단추가 안 보입니다");
      assert.equal(await 가입.locator(".home-start-card").count(),0,"가입했는데 아직 처음 화면이 남아 있습니다");
      assert.match(await 가입.locator(".home-main-action").getAttribute("href"),/today\.html\?grade=2/);
      // 적은 학년·과목이 계정으로 올라갔는가 (다른 기기에서 로그인해도 따라오려면 이게 돼야 합니다)
      assert.equal(계정.기록?.profile?.grade,"2","가입할 때 고른 학년이 계정에 안 올라갔습니다");
      assert.equal(계정.기록?.profile?.name,"민수");
      assert.equal(계정.기록?.profile?.track,"algebra","고2 기본 과목이 안 정해졌습니다");
      await 가입.close();
      const 새기기=await browser.newPage({viewport:{width:390,height:844}});
      await 새기기.goto("http://127.0.0.1:5198/today.html",{waitUntil:"networkidle"});
      await 새기기.waitForSelector('[data-grade="2"].on');
      assert.equal(await 새기기.locator('[data-track="algebra"]').getAttribute("class"),"pick-button on","새 기기의 기본값이 계정 과목을 덮어썼습니다");
      assert.equal(계정.기록.pref.grade,"2");
      await 새기기.evaluate(()=>window.StudentSync.logout());
      await 새기기.reload({waitUntil:"networkidle"});
      assert.equal(await 새기기.locator(".student-account-button").isVisible(),true,"로그인이 해제된 기존 학생이 다시 로그인할 수 없습니다");
      await 새기기.locator(".student-account-button").click();await 새기기.waitForSelector("#studentAccountForm");
      assert.equal(await 새기기.locator('#studentAccountForm [name="name"]').isVisible(),false);
      await 새기기.close();
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
    console.log("메인 검사 통과: 맨 위 메뉴는 다른 쪽과 같음(☰ 열림)·첫 카드는 로그인/로그인 없이 둘 + 회원가입 한 줄·로그인 입구·가입·계정 찾기·명시적 체험·학년/과목 동기화·공개 자료·PC/태블릿/모바일");
  }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
