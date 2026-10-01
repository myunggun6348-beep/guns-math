/* =========================================================
   숨김 검사 — 명령창에서 `node scripts\check-hidden.cjs`

   hidden 은 브라우저 기본 규칙이라, class 에 display 를 적어 두면 그쪽이
   이깁니다. 그래서 '숨겼다'고 생각한 칸이 화면에 그대로 남는 일이 거듭
   있었습니다 — 수학 탈출에서는 학생에게 관리자 비밀번호 칸이 보였습니다.
   style.css 의 [hidden]{display:none!important} 가 막고 있는데, 그 줄이
   지워지거나 비껴가는 경우가 없는지 모든 쪽에서 확인합니다.
   ========================================================= */
const fs=require("fs"),path=require("path"),http=require("http");
const {chromium}=require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const 뿌리=require("path").join(__dirname,"..");
const 서버=http.createServer((req,res)=>{const 길=new URL(req.url,"http://x").pathname;
 if(길.startsWith("/api/")){res.setHeader("Content-Type","application/json");res.end(길==="/api/student-account"?'{"signedIn":false}':"[]");return}
 const f=path.join(뿌리,길==="/"?"/index.html":길);
 if(!fs.existsSync(f)){res.writeHead(404).end();return}
 const t={".css":"text/css",".js":"text/javascript",".json":"application/json",".png":"image/png"};
 res.setHeader("Content-Type",t[path.extname(f)]||"text/html");res.end(fs.readFileSync(f));});
(async()=>{await new Promise(r=>서버.listen(5191,"127.0.0.1",r));
 const b=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
 const 쪽들=fs.readdirSync(뿌리).filter(f=>f.endsWith(".html"));
 const 탈=[];
 for(const 쪽 of 쪽들){
   const p=await b.newPage({viewport:{width:390,height:844}});
   await p.goto("http://127.0.0.1:5191/"+쪽,{waitUntil:"networkidle"}).catch(()=>{});
   await p.waitForTimeout(250);
   /* 몇몇 쪽은 열리자마자 스스로 다른 곳으로 옮겨 갑니다(solve.html 처럼
      ?id= 가 없으면 돌려보내는 쪽). 그때 읽으면 '화면이 사라졌다'고 하므로
      잠깐 뒤 한 번 더 읽어 봅니다. */
   const 읽기=()=>p.evaluate(()=>[...document.querySelectorAll("[hidden]")]
     .filter(el=>getComputedStyle(el).display!=="none")
     .map(el=>el.tagName.toLowerCase()+(el.id?"#"+el.id:"")+(el.className?"."+String(el.className).split(" ")[0]:"")));
   let 샌것;
   try{ 샌것=await 읽기(); }
   catch{ await p.waitForTimeout(400); try{ 샌것=await 읽기(); }catch{ 샌것=[]; } }
   if(샌것.length) 탈.push(쪽+" → "+[...new Set(샌것)].join(", "));
   await p.close();
 }
 await b.close();서버.close();
 if(탈.length){console.log("hidden 인데 안 숨겨진 것:\n- "+탈.join("\n- "));process.exitCode=1}
 else console.log("검사 통과: 숨기라고 한 것은 모두 숨겨져 있습니다 ("+쪽들.length+"쪽)");
})().catch(e=>{console.error(e);서버.close();process.exitCode=1});
