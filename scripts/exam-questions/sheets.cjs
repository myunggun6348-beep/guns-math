// 직접 보고 분류할 문항을 12개씩 한 장(PNG)으로 — node sheets.cjs todo.json 이름
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.join(__dirname,'..','..'),T={'.mjs':'text/javascript','.json':'application/json'};
const [listFile,name='sheet',per='12']=process.argv.slice(2),list=JSON.parse(fs.readFileSync(listFile,'utf8')),outDir=path.join(__dirname,'sheets');fs.mkdirSync(outDir,{recursive:true});
const s=http.createServer((q,r)=>{const n=new URL(q.url,'http://x').pathname;const f=path.join(root,n);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404).end();return}r.setHeader('Content-Type',T[path.extname(f)]||'text/html');r.end(fs.readFileSync(f))});
(async()=>{await new Promise(x=>s.listen(5248,'127.0.0.1',x));const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const p=await b.newPage();await p.goto('http://127.0.0.1:5248/index.html');
await p.evaluate(async()=>{const pdfjs=await import('/assets/vendor/pdfjs/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/assets/vendor/pdfjs/pdf.worker.min.mjs';window.pdfjs=pdfjs;
 window.cat=await fetch('/assets/exam-catalog.json').then(r=>r.json());window.docs={};
 window.crop=async q=>{const ex=cat.items.find(x=>x.id===q.e),url=ex.sets.find(x=>x.subject===q.s).files.problem.url;
  const doc=await (docs[url]=docs[url]||pdfjs.getDocument({url}).promise);
  const pg=await doc.getPage(q.p),vp1=pg.getViewport({scale:1}),W=vp1.width,H=vp1.height;
  const items=(await pg.getTextContent()).items.map(i=>({s:i.str.trim(),x:i.transform[4],y:i.transform[5],h:i.height}));
  const edge=i=>i.x<W*.15||(i.x>W*.48&&i.x<W*.58);let m=items.filter(i=>/^\d{1,2}\.$/.test(i.s)&&edge(i));const big=Math.max(0,...m.map(i=>i.h));m=m.filter(i=>i.h>=big-1.5);
  if(big)m.push(...items.filter(i=>/^\d{1,2}$/.test(i.s)&&edge(i)&&Math.abs(i.h-big)<=1).map(i=>({...i,s:i.s+'.'})));
  const mk=m.find(i=>i.s===q.n+'.');if(!mk)return null;const left=mk.x<W/2,next=m.filter(o=>(o.x<W/2)===left&&o.y<mk.y-1).sort((a,b)=>b.y-a.y)[0];
  const S=1.3,vp=pg.getViewport({scale:S}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
  await pg.render({canvasContext:ctx,viewport:vp}).promise;
  const x0=mk.x-8,x1=left?W/2-3:W*.915,top=mk.y+mk.h+6,bottom=next?next.y+next.h+6:H*.085;
  return{c,sx:x0*S,sy:(H-top)*S,sw:(x1-x0)*S,sh:Math.min((top-bottom)*S,620)}};
 window.sheet=async(qs)=>{const cols=3,cw=560,parts=[];for(const q of qs){parts.push({q,r:await crop(q)})}
  const rows=Math.ceil(qs.length/cols),rh=Math.max(...parts.map(x=>x.r?Math.min(x.r.sh*cw/x.r.sw,620):60))+30;
  const out=document.createElement('canvas');out.width=cols*cw+20;out.height=rows*rh;const o=out.getContext('2d');o.fillStyle='#fff';o.fillRect(0,0,out.width,out.height);
  parts.forEach(({q,r},i)=>{const x=(i%cols)*cw+10,y=Math.floor(i/cols)*rh;o.fillStyle='#c00';o.font='bold 18px sans-serif';o.fillText('['+q.k+'] '+q.e.slice(5)+' '+(q.l||'')+' '+q.n+'번',x,y+20);
   if(r){const sc=cw/r.sw;o.drawImage(r.c,r.sx,r.sy,r.sw,r.sh,x,y+26,cw-10,Math.min(r.sh*sc,620))}o.strokeStyle='#999';o.strokeRect(x-5,y,cw,rh)});
  return out.toDataURL('image/png')}});
const n=+per;for(let i=0;i<list.length;i+=n){const qs=list.slice(i,i+n);const url=await p.evaluate(q=>sheet(q),qs);
 fs.writeFileSync(path.join(outDir,name+'-'+String(i/n+1).padStart(2,'0')+'.png'),Buffer.from(url.split(',')[1],'base64'));process.stdout.write('.')}
console.log(' 끝',Math.ceil(list.length/n),'장');await b.close();s.close()})().catch(e=>{console.error(e);process.exit(1)});
