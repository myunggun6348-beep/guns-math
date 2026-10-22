// 모든 기출 PDF에서 문항 재료 뽑기: 쪽·배점·형식·본문 일부(분류용, 저장소에는 안 넣음)·해설의 출제의도
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.join(__dirname,'..','..'),out=path.join(__dirname,'raw');fs.mkdirSync(out,{recursive:true});
const T={'.mjs':'text/javascript','.json':'application/json'};
const s=http.createServer((q,r)=>{const n=new URL(q.url,'http://x').pathname;const f=path.join(root,n);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404).end();return}r.setHeader('Content-Type',T[path.extname(f)]||'text/html');r.end(fs.readFileSync(f))});
const only=process.argv[2]||'';
(async()=>{await new Promise(x=>s.listen(5245,'127.0.0.1',x));const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const p=await b.newPage();await p.goto('http://127.0.0.1:5245/index.html');
await p.evaluate(async()=>{const pdfjs=await import('/assets/vendor/pdfjs/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/assets/vendor/pdfjs/pdf.worker.min.mjs';window.pdfjs=pdfjs});
const cat=JSON.parse(fs.readFileSync(root+'/assets/exam-catalog.json','utf8'));
for(const ex of cat.items){ if(only&&!ex.id.includes(only))continue; const file=path.join(out,ex.id+'.json'); if(fs.existsSync(file))continue;
 const res=await p.evaluate(async ex=>{
  const pdfjs=window.pdfjs,result={id:ex.id,sets:[]};
  for(const set of ex.sets){
   const doc=await pdfjs.getDocument({url:set.files.problem.url}).promise,marks=[];
   for(let no=1;no<=doc.numPages;no++){const pg=await doc.getPage(no),vp=pg.getViewport({scale:1}),W=vp.width;
    const items=(await pg.getTextContent()).items.map(i=>({s:i.str,t:i.str.trim(),x:i.transform[4],y:i.transform[5],h:i.height}));
    // 사이트 오리기(assets/worksheet.js)와 같은 규칙: 'N.' 을 찾고, 마침표 없는 'N' 은 글자 크기가 같은 것만
    const edge=i=>i.x<W*.15||(i.x>W*.48&&i.x<W*.58);let m=items.filter(i=>/^\d{1,2}\.$/.test(i.t)&&edge(i));const big=Math.max(0,...m.map(i=>i.h));m=m.filter(i=>i.h>=big-1.5);
    if(big)m.push(...items.filter(i=>/^\d{1,2}$/.test(i.t)&&edge(i)&&Math.abs(i.h-big)<=1));
    for(const mk of m){const left=mk.x<W/2,next=m.filter(o=>(o.x<W/2)===left&&o.y<mk.y-1).sort((a,b)=>b.y-a.y)[0],bottom=next?next.y+next.h:0;
     const body=items.filter(i=>(i.x<W/2)===left&&i.y<=mk.y+2&&i.y>bottom).sort((a,b)=>b.y-a.y||a.x-b.x).map(i=>i.s).join('').replace(/\s+/g,' ');
     marks.push({no:parseInt(mk.t),page:no,pts:+((body.match(/\[(\d)점\]/)||[])[1]||0),mc:/①/.test(body)&&/⑤/.test(body),text:body.slice(0,260)})}}
   let intents={};
   try{const sd=await pdfjs.getDocument({url:set.files.solution.url}).promise;let txt='';
    for(let i=1;i<=sd.numPages;i++){const tc=await (await sd.getPage(i)).getTextContent();txt+=tc.items.map(x=>x.str+(x.hasEOL?'\n':'')).join('')+'\n'}
    for(const mm of txt.matchAll(/(\d{1,2})\s*\.\s*\[\s*출\s*제\s*의\s*도\s*\]\s*([^\n]*(?:\n[^\n\d][^\n]{0,30})?)/g)){const t=mm[2].replace(/\n/g,'').split(/\s{3,}/)[0].trim();if(!intents[mm[1]])intents[mm[1]]=t}
    for(const mm of txt.matchAll(/출\s*제\s*의\s*도\s*([^\n\[]*?)\s*(\d{1,2})\s*\.\s*\[\s*\]/g)){if(!intents[mm[2]])intents[mm[2]]=mm[1].trim()}
   }catch(e){intents={error:e.message}}
   result.sets.push({subject:set.subject,pages:doc.numPages,marks,intents})}
  return result},ex);
 fs.writeFileSync(file,JSON.stringify(res));
 const ms=res.sets.map(st=>st.subject+':'+st.marks.length+'문항/'+Object.keys(st.intents).length+'의도').join(' ');console.log(ex.id,ms)}
await b.close();s.close()})().catch(e=>{console.error(e);process.exit(1)});
