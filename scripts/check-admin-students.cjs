const fs=require("fs"),path=require("path"),http=require("http"),assert=require("assert");
const {chromium}=require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root=path.join(__dirname,"..");
const resetRequests=[];
const sampleReview=require('../assets/study-state').reviewSummary([{id:'r1',conceptName:'미분',reviewStage:4,mastered:true,lastWrongAt:new Date(Date.now()-2*86400000).toISOString(),lastReviewAt:new Date().toISOString()},{id:'r2',conceptName:'미분',reviewStage:1,mastered:false,lastWrongAt:new Date(Date.now()-2*86400000).toISOString(),lastReviewAt:new Date().toISOString(),nextReviewAt:new Date(Date.now()+86400000).toISOString()}]);
const sampleAnalysis={reasons:[{key:"calculation",name:"계산 실수",count:2},{key:"reading",name:"조건 해석",count:1}],hints:{reviewAttempts:3,hintUsed:2,hintSteps:4,soloCorrect:1},savedHintNotes:2};
const json=(res,value)=>{res.setHeader("Content-Type","application/json");res.end(JSON.stringify(value))};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,"http://localhost").pathname;
  if(pathname==="/api/student-admin"){
    let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{
      const input=JSON.parse(body||"{}");
      if(input.action==="reset-password"){resetRequests.push(input);return json(res,{ok:true,id:input.id})}
      json(res,{summary:{total:3,active7:2,today:1,activeWrong:3,inactive7:1,notStarted:1},classes:[{key:"2-3",grade:"2",className:"3",students:2,active7:2,today:1,activeWrong:3,average:60,inactive7:0,notStarted:0,analysis:sampleAnalysis,weakConcepts:[{name:"미분",rate:38,students:2,weakStudents:2}]},{key:"1-1",grade:"1",className:"1",students:1,active7:0,today:0,activeWrong:0,average:null,inactive7:1,notStarted:1,weakConcepts:[]}],students:[{id:"student01",name:"민수",grade:"2",className:"3",track:"calc1",studyCount:8,todayDone:true,todayScore:4,average:80,activeWrong:2,mastered:3,weakest:{name:"미분",rate:50,attempts:4},lastAt:"2026-09-21T03:00:00Z",inactive7:false,notStarted:false,analysis:sampleAnalysis,review:sampleReview},{id:"math02",name:"지수",grade:"1",className:"1",track:"common1",studyCount:0,todayDone:false,todayScore:null,average:null,activeWrong:0,mastered:0,weakest:null,lastAt:"",inactive7:true,notStarted:true},{id:"student03",name:"수빈",grade:"2",className:"3",track:"calc1",studyCount:4,todayDone:false,todayScore:null,average:40,activeWrong:1,mastered:0,weakest:{name:"미분",rate:25,attempts:4},lastAt:"2026-09-21T03:00:00Z",inactive7:false,notStarted:false}]});
    });return;
  }
  if(pathname==="/api/admin")return json(res,{좋음:true,목록:[],검토:false,labels:[],series:[],total:0});
  if(pathname==="/api/solutions")return json(res,{items:[]});
  if(pathname==="/api/files")return json(res,[]);
  if(pathname==="/api/push-subscribe")return json(res,{supported:false});
  const relative=pathname==="/"?"/admin.html":pathname,file=path.join(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return}
  const types={".css":"text/css",".js":"text/javascript",".json":"application/json",".png":"image/png",".webmanifest":"application/manifest+json"};res.setHeader("Content-Type",types[path.extname(file)]||"text/html");res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(5199,"127.0.0.1",resolve));
  const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
  try{
    for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
      const page=await browser.newPage({viewport}),errors=[];page.on("pageerror",error=>errors.push(error.message));
      await page.goto("http://127.0.0.1:5199/admin.html",{waitUntil:"networkidle"});
      await page.locator("#로그인 input[type=password]").fill("test-password");await page.locator("#로그인 button[type=submit]").click();
      await page.waitForSelector("#학생현황 .student-admin-row:not(.head)");
      assert.equal(await page.locator("#학생현황요약 b").first().textContent(),"3");assert.equal(await page.locator("#반별요약 button").count(),2);
      assert.equal(await page.locator("#학생현황 .student-admin-row:not(.head)").count(),3);
      assert.match(await page.locator('[data-class="2-3"] .student-common-concepts').textContent(),/미분.*2\/2명.*38%/);
      await page.locator('[data-attention="inactive7"]').click();assert.equal(await page.locator("#학생현황 .student-admin-row:not(.head)").count(),1);
      await page.locator('[data-attention="notStarted"]').click();assert.equal(await page.locator("#학생현황 .student-admin-row:not(.head)").count(),1);
      assert.match(await page.locator(".student-attention-badge").textContent(),/시작 전/);
      await page.locator("#학생반필터").selectOption("2-3");assert.equal(await page.locator("#학생현황 .student-admin-row:not(.head)").count(),0);assert.equal(await page.locator("#시작전수").textContent(),"0");
      await page.locator('[data-attention="all"]').click();assert.equal(await page.locator("#학생현황 .student-admin-row:not(.head)").count(),2);
      await page.locator("#학생반필터").selectOption("");await page.locator("#학생검색").fill("미분");assert.equal(await page.locator("#학생현황 .student-admin-row:not(.head)").count(),2);
      await page.locator("#학생검색").fill("student01");await page.locator(".student-review-analysis summary").click();assert.equal(await page.locator(".student-review-analysis tbody tr").count(),7);assert.match(await page.locator(".student-review-analysis").innerText(),/정답 확인 2문제.*최종 완료 1문제/);assert.equal(await page.locator("#학생현황 .student-admin-row:not(.head)").count(),1);
      await page.locator(".student-learning-analysis summary").click();assert.match(await page.locator(".student-learning-analysis").innerText(),/계산 실수 2문제/);assert.match(await page.locator(".student-learning-analysis").innerText(),/확인 문제 3회.*힌트 사용 2회/);assert.match(await page.locator(".student-learning-analysis").innerText(),/혼자 맞힘 1회/);
      await page.locator(".student-reset-button").click();await page.waitForSelector("#studentResetForm");
      await page.locator('#studentResetForm [name="pin"]').fill("483927");await page.locator('#studentResetForm [name="confirm"]').fill("483928");
      const before=resetRequests.length;await page.locator('#studentResetForm [type="submit"]').click();assert.match(await page.locator("#studentResetForm [role=status]").innerText(),/서로 다릅니다/);assert.equal(resetRequests.length,before);
      await page.locator('#studentResetForm [name="confirm"]').fill("483927");await page.locator('#studentResetForm [type="submit"]').click();
      await page.waitForFunction(()=>document.querySelector("#studentResetForm [role=status]").textContent.includes("초기화했습니다"));
      assert.equal(resetRequests.at(-1).id,"student01");assert.equal(resetRequests.at(-1).password,"test-password");assert.equal(await page.locator('#studentResetForm [name="pin"]').inputValue(),"");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.locator("#cancelReset").click();assert.equal(errors.length,0,errors.join("\n"));await page.close();
    }
    console.log("학생 현황 화면 검사 통과: 미학습·미시작·반 필터·검색, 공통 취약 개념, 비밀번호 초기화, 모바일 화면");
  }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
