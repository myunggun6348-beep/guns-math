const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.join(__dirname,'..'),data={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/today-data.js'),'utf8'),data);
const bank=data.window.TODAY_TRACKS,choose=data.window.similarQuestion;
for(const [key,track] of Object.entries(bank))for(const q of track.questions){const result=choose({grade:track.grades[0],sourceKey:key,conceptId:q.concept,prompt:q.prompt});assert.ok(result);assert.equal(result.key,key);assert.equal(result.question.concept,q.concept);assert.notEqual(result.question.prompt,q.prompt)}
assert.equal(choose({grade:'9',conceptId:'poly'}),null);assert.equal(choose({grade:'1',conceptId:'unknown'}),null);
const source=bank.common1.questions[0];
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;if(name.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(name.includes('student-account')?'{"signedIn":false}':'[]');return}try{res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.woff2')?'font/woff2':'text/html');res.end(fs.readFileSync(path.join(root,name)))}catch{res.writeHead(404).end()}});
(async()=>{await new Promise(resolve=>server.listen(5202,'127.0.0.1',resolve));let browser;try{
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  for(const width of [1280,390]){
    const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(({prompt,attempts})=>{if(localStorage.getItem('math-wrong-notes-v1'))return;localStorage.setItem('math-wrong-notes-v1',JSON.stringify([{id:'original',grade:'1',sourceKey:'common1',conceptId:'poly',conceptName:'다항식',sourceTitle:'오늘의 학습',prompt,type:'text',correctAnswer:'1',userAnswer:'2',mastered:false,attempts}]));localStorage.setItem('today-study-records','[]')},{prompt:source.prompt,attempts:width===1280?2:1});
    await page.goto('http://127.0.0.1:5202/wrong-notes.html?view=due');await page.waitForSelector('[data-retry]');assert.equal(await page.locator('[data-similar]').count(),0);
    await page.locator('[data-retry]').click();await page.locator('.retry-input').fill('1');await page.locator('.retry-submit').click();await page.waitForSelector('.retry-box [data-similar]');
    const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('math-wrong-notes-v1'))[0]);await page.waitForTimeout(1300);assert.equal(await page.locator('.retry-box [data-similar]').count(),1);
    await page.locator('.retry-box [data-similar]').click();await page.waitForSelector('.daily-question');assert.notEqual(await page.locator('.daily-question').innerText(),source.prompt);assert.equal(await page.locator('.daily-progress').innerText(),'1 / 1');assert.equal(await page.locator('#scratchCanvas').count(),1);
    const q=choose(original).question;
    if(q.type==='choice'){await page.locator('.daily-choice').nth(q.answer).click();await page.locator('#choiceSubmit').click()}else{await page.locator('#dailyInput').fill('99999');await page.locator('#textSubmit').click()}
    await page.locator('#dailyNext').click();await page.waitForSelector('.today-panel a[href="wrong-notes.html"]');
    const state=await page.evaluate(()=>({notes:JSON.parse(localStorage.getItem('math-wrong-notes-v1')),records:JSON.parse(localStorage.getItem('today-study-records')),stats:JSON.parse(localStorage.getItem('math-concept-stats-v1'))}));
    assert.deepEqual(state.notes.find(n=>n.id==='original'),original);assert.equal(state.records.length,0);assert.ok(state.stats.poly.attempts>=2);
    if(q.type==='text')assert.ok(state.notes.some(n=>n.source==='similar'&&n.prompt===q.prompt));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
    await page.goto('http://127.0.0.1:5202/today.html?review=missing');await page.waitForSelector('.today-panel h2');assert.match(await page.locator('.today-panel h2').innerText(),/준비/);
    if(width===1280){
      await page.goto('http://127.0.0.1:5202/today.html?grade=1&subject=common1');await page.locator('#todayStart').click();
      for(let i=0;i<5;i++){
        await page.waitForSelector('.daily-question');const prompt=await page.locator('.daily-question').evaluate(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('.math-expression').forEach(span=>span.replaceWith(span.dataset.source));return copy.textContent}),q=bank.common1.questions.find(row=>row.prompt===prompt);assert.ok(q);
        assert.equal(await page.locator('.daily-progress').innerText(),(i+1)+' / 5');
        if(q.type==='choice'){await page.locator('.daily-choice').nth(q.answer).click();await page.locator('#choiceSubmit').click()}else{await page.locator('#dailyInput').fill(q.answers[0]);await page.locator('#textSubmit').click()}
        await page.locator('#dailyNext').click();
      }
      assert.equal(await page.locator('.result-score').innerText(),'5/5');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('today-study-records'))[0].total),5);
    }
    await page.close();
  }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}console.log('비슷한 문제 검사 통과: 전체 개념 매칭·원문 제외·학년, PC·모바일, 객관식·주관식, 풀이판, 오답 저장·기존 일정/오늘 점수 보존·없는 기록 안내')})().catch(e=>{console.error(e);process.exitCode=1});
