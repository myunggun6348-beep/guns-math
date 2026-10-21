/* =========================================================
   오답노트 검사 — 명령창에서 `node scripts\check-wrong-notes.cjs`

   기록이 하나도 없을 때는 한 덩이(설명 + 오늘의 학습 시작)만 보여야 하고,
   기록이 생기면 숫자 카드·탭·오답 카드가 예전처럼 다 나와야 합니다.
   예전 빈 화면은 0·0·0 숫자 카드에 빈 탭 넷, 시작 단추 둘이었습니다.
   ========================================================= */
const fs=require("fs"),path=require("path"),http=require("http"),assert=require("assert");
const {chromium}=require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const 뿌리=path.join(__dirname,"..");
const 서버=http.createServer((q,r)=>{const 길=new URL(q.url,"http://x").pathname;
 if(길.startsWith("/api/")){r.setHeader("Content-Type","application/json");r.end(길==="/api/student-account"?'{"signedIn":false}':"[]");return}
 const f=path.join(뿌리,길);if(!fs.existsSync(f)){r.writeHead(404).end();return}
 const t={".css":"text/css",".js":"text/javascript",".png":"image/png",".json":"application/json"};
 r.setHeader("Content-Type",t[path.extname(f)]||"text/html");r.end(fs.readFileSync(f));});
(async()=>{await new Promise(x=>서버.listen(5177,"127.0.0.1",x));
 const b=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
 const 오류=[];
 const p=await b.newPage({viewport:{width:390,height:844}});p.on("pageerror",e=>오류.push(e.message));
 await p.goto("http://127.0.0.1:5177/wrong-notes.html",{waitUntil:"networkidle"});
 await p.evaluate(()=>localStorage.clear());await p.reload({waitUntil:"networkidle"});await p.waitForTimeout(400);
 const 빈=await p.evaluate(()=>({영:[...document.querySelectorAll(".wrong-stat b")].length,탭:document.querySelectorAll(".wrong-tab").length,시작단추:[...document.querySelectorAll("a")].filter(a=>/오늘의 학습 시작/.test(a.textContent)&&a.checkVisibility()).length}));
 
 // 기록이 생기면 예전처럼 다 보여야 합니다
 await p.evaluate(()=>localStorage.setItem("math-wrong-notes-v1",JSON.stringify([{id:"a",mastered:false,prompt:"1+1?",createdAt:new Date().toISOString(),subject:"공통수학1",conceptName:"다항식",type:"short",correctAnswer:"2",userAnswer:"3"}])));
 await p.reload({waitUntil:"networkidle"});await p.waitForTimeout(400);
 const 찬=await p.evaluate(()=>({숫자카드:document.querySelectorAll(".wrong-stat").length,탭:document.querySelectorAll(".wrong-tab").length,카드:document.querySelectorAll("[data-card]").length}));
 console.log("빈 때:",JSON.stringify(빈),"\n찬 때:",JSON.stringify(찬),"\n오류:",오류.join(" / ")||"없음");
 assert.equal(빈.영,0,"빈 화면에 숫자 카드가 남아 있습니다");assert.equal(빈.탭,0);assert.equal(빈.시작단추,1,"시작 단추는 하나여야 합니다");
 assert.equal(찬.숫자카드,3);assert.ok(찬.탭>=3);assert.equal(찬.카드,1);assert.equal(오류.length,0);
 console.log("오답노트 검사 통과: 빈 때는 한 덩이·시작 단추 하나, 기록이 생기면 숫자·탭·카드 그대로");
 await b.close();서버.close();})().catch(e=>{console.error(e);process.exitCode=1;process.exit(1)});
