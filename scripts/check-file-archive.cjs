const assert=require("assert"),fs=require("fs"),path=require("path"),http=require("http");
const root=path.join(__dirname,"..");
for(const match of fs.readFileSync(path.join(root,"admin.html"),"utf8").matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(match[1].trim())new Function(match[1])}

const redisData=new Map();
const redisPath=require.resolve("../api/_redis"),blobPath=require.resolve("../api/_blob");
require.cache[redisPath]={id:redisPath,filename:redisPath,loaded:true,exports:{준비됨:true,명령:async(command,key,id,value)=>{if(command==="HSET"){redisData.set(id,value);return 1}if(command==="HGET")return redisData.get(id)||null;throw new Error(command)}}};
require.cache[blobPath]={id:blobPath,filename:blobPath,loaded:true,exports:{준비됨:true,head:async()=>({url:"https://files.example/test.pdf",size:2048}),del:async()=>{},issueSignedToken:async()=>"token",presignUrl:async()=>({presignedUrl:"https://upload.example"})}};
process.env.ADMIN_PASSWORD="archive-test";const handler=require("../api/files-admin");
function invoke(query){return new Promise((resolve,reject)=>{const req={method:"POST",query},res={code:200,setHeader(){},status(code){this.code=code;return this},json(body){resolve({status:this.code,body})}};Promise.resolve(handler(req,res)).catch(reject)})}

const catalog=JSON.parse(fs.readFileSync(path.join(root,"assets","exam-catalog.json"),"utf8")).items;
const mockFiles=[
 {id:"4",title:"2027년 3월 전국연합 문제",grade:"1",examYear:"2027",examMonth:"3",examName:"전국연합학력평가",subject:"공통수학",kind:"문제",date:"2027-03-20",url:"/one.pdf",size:120000},
 {id:"3",title:"대수 학습지",grade:"2",subject:"대수",kind:"학습지",date:"2026-09-01",url:"/two.pdf"},
 {id:"2",title:"9월 모의평가 해설",grade:"3",examYear:"2026",examMonth:"9",examName:"대학수학능력시험 모의평가",kind:"해설",date:"2026-09-04",url:"/three.pdf"},
 {id:"1",title:"수학 공부법",subject:"수학",kind:"안내",date:"2025-01-01",url:"/common.pdf"}
];
const server=http.createServer((req,res)=>{const url=new URL(req.url,"http://localhost");if(url.pathname==="/api/files"){res.setHeader("Content-Type","application/json");return res.end(JSON.stringify(mockFiles))}let file=path.join(root,url.pathname==="/"?"files.html":url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return}res.setHeader("Content-Type",file.endsWith(".css")?"text/css":file.endsWith(".js")?"text/javascript":"text/html");res.end(fs.readFileSync(file))});
(async()=>{
 const saved=await invoke({act:"record",암호:"archive-test",id:"100",pathname:"files/100.pdf",filename:"test.pdf",title:"3월 모의고사",grade:"1",examYear:"2027",examMonth:"03",examName:"전국연합",kind:"문제"});assert.equal(saved.status,200);assert.equal(saved.body.grade,"1");assert.equal(saved.body.examYear,"2027");assert.equal(saved.body.examMonth,"3");
 const edited=await invoke({act:"edit",암호:"archive-test",id:"100",title:"수정",grade:"bad",examYear:"abcd",examMonth:"13"});assert.equal(edited.body.grade,"common");assert.equal(edited.body.examYear,"");assert.equal(edited.body.examMonth,"");
 const {chromium}=require(process.env.PLAYWRIGHT_PATH||path.join(require("os").homedir(),".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"));
 await new Promise(r=>server.listen(5196,"127.0.0.1",r));const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
 try{for(const width of [320,390,820,1280]){for(const dark of [false,true]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.goto("http://127.0.0.1:5196/files.html");await page.waitForSelector(".archive-card");
   if(dark)await page.evaluate(()=>document.documentElement.classList.add("theme-dark"));
   assert.equal(await page.locator(".grade-tab").count(),5);
   assert.equal(await page.locator(".archive-card").count(),mockFiles.length+catalog.length);
   assert.equal(await page.locator(".exam-bundle[open]").count(),0,"시험은 처음에 접혀 있어야 합니다");
   assert.equal(await page.locator(".archive-grade").count(),mockFiles.length+catalog.length);
   await page.click('[data-grade="3"]');
   const grade3=catalog.filter(f=>f.grade==="3");
   assert.equal(await page.locator(".archive-card").count(),1+grade3.length);
   assert.equal(await page.locator(".exam-bundle").count(),grade3.length);
   assert.equal(await page.locator(".archive-grade").count(),0,"선택 학년을 카드에 반복하지 않습니다");
   assert.equal(await page.locator("#archiveHeading").textContent(),"3학년");
   const first=page.locator(".exam-bundle").first();
   await first.locator("summary").focus();await page.keyboard.press("Enter");
   assert.equal(await first.getAttribute("open"),"");
   const firstExam=grade3[0];
   assert.equal(await first.locator(".exam-set").count(),firstExam.sets.length);
   const firstSolve=first.locator(".exam-solve-button").first();
   const solveUrl=new URL(await firstSolve.getAttribute("href"),page.url());
   assert.equal(solveUrl.searchParams.get("id"),firstExam.id);
   assert.equal(solveUrl.searchParams.get("subject"),firstExam.sets[0].subject);
   for(const [i,set] of firstExam.sets.entries()){
     const row=first.locator(".exam-set").nth(i);
     for(const [j,k] of ["problem","answer","solution"].entries()){
       const link=row.locator(".exam-file-link").nth(j);
       assert.equal(await link.getAttribute("href"),set.files[k].url);
       assert.equal(await link.getAttribute("target"),"_blank");
     }
   }
   assert.equal((await first.locator(".exam-file-link").first().innerText()).replace(/\s+/g," "),"문제지 ↗");
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,"펼친 시험 가로 넘침");
   const targets=await first.locator(".exam-file-button").evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
   assert.ok(targets.every(h=>h>=44),"파일 버튼의 터치 높이");
   await first.locator("summary").press("Enter");assert.equal(await first.getAttribute("open"),null);
   await page.selectOption("#subjectFilter","미적분");
   assert.equal(await page.locator(".exam-bundle").count(),grade3.filter(f=>f.sets.some(s=>s.subject==="미적분")).length);
   assert.equal(await page.locator(".exam-bundle:not([open])").count(),0,"선택한 과목을 바로 보여 줍니다");
   assert.ok((await page.locator(".exam-set strong").allTextContents()).every(t=>t==="미적분"));
   assert.equal(await page.locator(".archive-year-group:not([open])").count(),0);
   await page.selectOption("#yearFilter","2026");
   assert.equal(await page.locator(".exam-bundle").count(),grade3.filter(f=>f.examYear==="2026"&&f.sets.some(s=>s.subject==="미적분")).length);
   if(process.env.ARCHIVE_SCREENSHOTS){
     fs.mkdirSync(process.env.ARCHIVE_SCREENSHOTS,{recursive:true});
     await page.screenshot({path:path.join(process.env.ARCHIVE_SCREENSHOTS,`files-${width}-${dark?"dark":"light"}.png`),fullPage:true});
   }
   await page.selectOption("#kindFilter","해설");
   assert.equal(await page.locator(".archive-card").count(),0);
   assert.equal(await page.locator("#archiveCount").textContent(),"0개 자료");
   await page.selectOption("#kindFilter","");await page.selectOption("#yearFilter","");await page.selectOption("#subjectFilter","");
   await page.fill("#fileSearch","확률과 통계");
   assert.ok((await page.locator(".exam-set strong").allTextContents()).every(t=>t==="확률과 통계"));
   assert.ok(await page.locator(".exam-bundle[open]").count()>0);
   await page.fill("#fileSearch","없는자료검색어");assert.equal(await page.locator(".archive-card").count(),0);
   await page.fill("#fileSearch","");await page.selectOption("#subjectFilter","미적분");
   await page.click('[data-grade="2"]');assert.equal(await page.inputValue("#subjectFilter"),"","다른 학년에 없는 과목은 해제합니다");
   await page.selectOption("#subjectFilter","대수");
   assert.equal(await page.locator(".archive-single").count(),1);assert.equal(await page.locator(".exam-bundle").count(),0);
   await page.reload();await page.waitForSelector(".archive-card");
   assert.equal(await page.locator("#archiveHeading").textContent(),"2학년","선택 학년 유지");
   await page.goto("http://127.0.0.1:5196/files.html?grade=3&subject="+encodeURIComponent("기하")+"&year=2025");await page.waitForSelector(".exam-bundle");
   assert.equal(await page.inputValue("#subjectFilter"),"기하");
   assert.ok((await page.locator(".exam-set strong").allTextContents()).every(t=>t==="기하"));
   assert.equal(await page.locator(".archive-year-group").count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);await page.close();
 }}}
 finally{await browser.close();server.close()}
 console.log("자료실 검사 통과: 학년 저장·시험 접기/펼치기·과목/연도/종류/검색 조합·기존 링크·학습지 호환·320/390/820/1280px·밝은/어두운 화면");
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
