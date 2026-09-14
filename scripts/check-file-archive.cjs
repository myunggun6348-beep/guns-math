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
 const {chromium}=require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");await new Promise(r=>server.listen(5196,"127.0.0.1",r));const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
 try{for(const viewport of [{width:1200,height:900},{width:390,height:844}]){const page=await browser.newPage({viewport});await page.goto("http://127.0.0.1:5196/files.html");await page.waitForSelector(".archive-card");assert.equal(await page.locator(".grade-tab").count(),5);assert.equal(await page.locator(".archive-card").count(),mockFiles.length+catalog.length);await page.click('[data-grade="3"]');assert.equal(await page.locator(".archive-card").count(),1+catalog.filter(f=>f.grade==="3").length);assert.equal(await page.locator(".exam-bundle").count(),catalog.filter(f=>f.grade==="3").length);assert.equal(await page.locator(".exam-file-button").count()>0,true);assert.equal(await page.locator("#archiveHeading").textContent(),"3학년");assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.close()}}
 finally{await browser.close();server.close()}
 console.log("자료실 검사 통과: 학년 저장, 모의고사 정보, 기존 자료 호환, 학년 필터, 모바일 배치");
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
