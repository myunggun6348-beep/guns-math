const assert=require('assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||path.join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.join(__dirname,'..'),catalog=require('../assets/exam-catalog.json'),review=require('../assets/past-practice-review.json'),model=require('../assets/past-practice-model'),study=require('../assets/study-state');
let signedIn=false,serverData={},failReview=false;
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/api/student-account'){res.setHeader('Content-Type','application/json');if(req.method!=='POST')return res.end(JSON.stringify(signedIn?{signedIn:true,student:{id:'past-test',name:'검사'}}:{signedIn:false}));let body='';req.on('data',c=>body+=c);req.on('end',()=>{const p=JSON.parse(body);serverData=study.merge(serverData,p.data);res.end(JSON.stringify({ok:true,data:serverData}))});return}
 if(u.pathname.startsWith('/api/'))return res.end('[]');
 if(failReview&&u.pathname==='/assets/past-practice-review.json'){res.writeHead(503).end();return}
 const f=path.join(root,decodeURIComponent(u.pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'})[path.extname(f)]||'text/html');res.end(fs.readFileSync(f));
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  for(const width of [320,390,820,1280])for(const dark of [false,true]){
   const ctx=await browser.newContext({viewport:{width,height:960}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/past-practice.html');await page.waitForFunction(()=>document.querySelector('#pastSelectionStatus').textContent.includes('학년부터'));
   if(dark)await page.evaluate(()=>document.documentElement.classList.add('theme-dark'));
   assert.equal(await page.inputValue('#pastGrade'),'');assert.equal(await page.locator('#pastShow').isDisabled(),true);assert.equal(await page.locator('.past-card').count(),0);
   await page.evaluate(()=>{localStorage.setItem('math-solve:preserve','{"page":4,"pages":{"4":"ink"}}');localStorage.setItem('today-study-records',JSON.stringify([{date:'2026-10-24',grade:'3',track:'stats',correct:4,total:5}]));localStorage.setItem('math-wrong-notes-v1','[]')});
   const before=await page.evaluate(()=>['math-solve:preserve','today-study-records','math-wrong-notes-v1'].map(k=>localStorage.getItem(k)));
   await page.selectOption('#pastGrade','3');await page.selectOption('#pastTrack','stats');await page.selectOption('#pastConcept','prob::조건부확률');
   for(const [level,count] of [['basic',1],['standard',2],['challenge',2]]){
    await page.check('[name=pastDifficulty][value='+level+']');await page.click('#pastShow');assert.equal(await page.locator('.past-card').count(),count);
    assert.ok((await page.locator('.past-card-top span').allTextContents()).every(t=>t.startsWith(model.levels[level])));
    const anchors=await page.locator('.past-actions a:first-child').evaluateAll(es=>es.map(e=>e.href));
    for(const href of anchors){const u=new URL(href),r=review.items.find(r=>r.exam===u.searchParams.get('id')&&r.subject===u.searchParams.get('subject')&&String(r.page)===u.searchParams.get('page')&&r.difficulty===level&&r.topic==='조건부확률');assert.ok(r);const b=new URL(u.searchParams.get('back'),base);assert.equal(b.searchParams.get('difficulty'),level);assert.equal(b.searchParams.get('topic'),'조건부확률')}
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'가로 넘침 '+width);
   }
   await page.locator('.past-reason summary').first().click();assert.ok((await page.locator('.past-reason').first().textContent()).includes('시행'));
   if(process.env.PAST_SCREENSHOTS){fs.mkdirSync(process.env.PAST_SCREENSHOTS,{recursive:true});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(process.env.PAST_SCREENSHOTS,'past-'+width+'-'+(dark?'dark':'light')+'.png'),fullPage:true})}
   await page.selectOption('#pastTrack','geometry');assert.equal(await page.inputValue('#pastConcept'),'');assert.equal(await page.locator('#pastResults').isVisible(),false);
   await page.selectOption('#pastConcept','vec::벡터의 내적');await page.check('[name=pastDifficulty][value=standard]');await page.click('#pastShow');assert.equal(await page.locator('.past-card').count(),0);assert.match(await page.locator('.past-empty').textContent(),/표준/);
   assert.deepEqual(await page.evaluate(()=>['math-solve:preserve','today-study-records','math-wrong-notes-v1'].map(k=>localStorage.getItem(k))),before);
   await page.goto(base+'/past-practice.html?grade=3&concept=prob&topic='+encodeURIComponent('조건부확률')+'&difficulty=basic');await page.waitForSelector('.past-card');assert.equal(await page.inputValue('#pastTrack'),'stats');assert.equal(await page.locator('.past-card').count(),1);
   const expectedBack=new URL(page.url()).search;
   await page.route('**/solve.html?**',r=>r.fulfill({body:'<!doctype html><title>검사</title>풀이 링크 확인',contentType:'text/html'}));
   await page.locator('.past-actions a').first().click();assert.equal(new URL(page.url()).searchParams.get('id'),'ebsi-3-20260902');assert.equal(new URL(new URL(page.url()).searchParams.get('back'),base).search,expectedBack);
   await page.goto(base+'/past-practice.html?grade=1&subject=geometry&concept=vec&difficulty=unknown');await page.waitForFunction(()=>document.querySelector('#pastSelectionStatus').textContent.includes('과목을 선택'));assert.equal(await page.locator('.past-card').count(),0);assert.match(await page.locator('#pastContext').textContent(),/맞지 않거나/);
   assert.deepEqual(errors,[]);await ctx.close();
  }
  // 계정 추천은 동기화 준비가 끝난 뒤에만 읽으며 선택 동작은 학습 기록을 쓰지 않습니다.
  signedIn=true;const at=new Date().toISOString();serverData={profile:{grade:'3',track:'stats',name:'검사',updatedAt:at,diagnostics:{stats:{grade:'3',completedAt:at,answers:Array.from({length:5},()=>({concept:'prob',correct:true,skipped:false}))}}}};
  const ctx=await browser.newContext(),p=await ctx.newPage();await p.goto(base+'/past-practice.html');await p.waitForFunction(()=>document.querySelector('#pastContext').textContent.startsWith('추천:'));
  assert.equal(await p.inputValue('#pastGrade'),'3');assert.equal(await p.inputValue('#pastTrack'),'stats');assert.equal(await p.inputValue('#pastConcept'),'prob');assert.equal(await p.locator('[name=pastDifficulty]:checked').inputValue(),'standard');
  const accountBefore=JSON.stringify(serverData);await p.click('#pastShow');await p.selectOption('#pastConcept','prob::조건부확률');await p.check('[name=pastDifficulty][value=challenge]');await p.click('#pastShow');assert.equal(JSON.stringify(serverData),accountBefore);
  // 같은 브라우저에서 로그아웃한 뒤 이전 계정의 추천을 남기지 않습니다.
  await p.evaluate(()=>window.StudentSync.logout());await p.waitForFunction(()=>document.querySelector('#pastGrade').value==='');assert.equal(await p.locator('#pastResults').isVisible(),false);
  await ctx.close();signedIn=false;
  const failure=await browser.newPage();failReview=true;await failure.goto(base+'/past-practice.html');await failure.getByRole('button',{name:'다시 불러오기'}).waitFor();failReview=false;await failure.getByRole('button',{name:'다시 불러오기'}).click();await failure.waitForFunction(()=>document.querySelector('#pastSelectionStatus').textContent.includes('학년부터'));await failure.close();
  console.log('기출 화면 검사 통과: 320/390/820/1280px 밝음·어두움, 순서 선택·세 난도·빈 결과·기존 링크·계정 추천/로그아웃·기록 보존·목록 재시도');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
