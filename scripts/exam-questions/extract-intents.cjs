// 모든 기출 PDF에서 문항 재료 뽑기: 쪽·배점·형식·본문 일부(분류용, 저장소에는 안 넣음)·해설의 출제의도
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.join(__dirname,'..','..'),out=path.join(__dirname,'intents-all');fs.mkdirSync(out,{recursive:true});
const T={'.mjs':'text/javascript','.json':'application/json'};
const s=http.createServer((q,r)=>{const n=new URL(q.url,'http://x').pathname;const f=path.join(root,n);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404).end();return}r.setHeader('Content-Type',T[path.extname(f)]||'text/html');r.end(fs.readFileSync(f))});
const only=process.argv[2]||'';
(async()=>{await new Promise(x=>s.listen(5247,'127.0.0.1',x));const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const p=await b.newPage();await p.goto('http://127.0.0.1:5247/index.html');
await p.evaluate(async()=>{const pdfjs=await import('/assets/vendor/pdfjs/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/assets/vendor/pdfjs/pdf.worker.min.mjs';window.pdfjs=pdfjs});
const cat=JSON.parse(fs.readFileSync(root+'/assets/exam-catalog.json','utf8'));
for(const ex of cat.items){ if(only&&!ex.id.includes(only))continue; const file=path.join(out,ex.id+'.json'); if(fs.existsSync(file))continue;
 const res=await p.evaluate(async ex=>{
  const pdfjs=window.pdfjs,result={id:ex.id,sets:[]};
  for(const set of ex.sets){
   const marks=[];
   let intents={};
   try{const sd=await pdfjs.getDocument({url:set.files.solution.url}).promise;let txt='';
    for(let i=1;i<=sd.numPages;i++){const tc=await (await sd.getPage(i)).getTextContent();txt+=tc.items.map(x=>x.str+(x.hasEOL?'\n':'')).join('')+'\n'}
    for(const mm of txt.matchAll(/(\d{1,2})\s*\.\s*\[\s*출\s*제\s*의\s*도\s*\]\s*([^\n]*(?:\n[^\n\d][^\n]{0,30})?)/g)){const t=mm[2].replace(/\n/g,'').split(/\s{3,}/)[0].trim();(intents[mm[1]]=intents[mm[1]]||[]).push({at:mm.index,t})}
    for(const mm of txt.matchAll(/출\s*제\s*의\s*도\s*([^\n\[]*?)\s*(\d{1,2})\s*\.\s*\[\s*\]/g)){(intents[mm[2]]=intents[mm[2]]||[]).push({at:mm.index,t:mm[1].trim()})}
    for(const k in intents)intents[k].sort((a,b)=>a.at-b.at);
   }catch(e){intents={error:e.message}}
   result.sets.push({subject:set.subject,intents})}
  return result},ex);
 fs.writeFileSync(file,JSON.stringify(res));
 const ms=res.sets.map(st=>st.subject+':'+Object.keys(st.intents).length+'의도').join(' ');console.log(ex.id,ms)}
await b.close();s.close()})().catch(e=>{console.error(e);process.exit(1)});
