const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.join(__dirname,'..'),data={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/today-data.js'),'utf8'),data);
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/similar-practice-data.js'),'utf8'),data);
const bank=data.window.TODAY_TRACKS,choose=data.window.similarQuestion;
for(const [key,track] of Object.entries(bank))for(const q of track.questions){const note={grade:track.grades[0],sourceKey:key,conceptId:q.concept,prompt:q.prompt},result=choose(note);assert.ok(result);assert.equal(result.key,key);assert.equal(result.question.concept,q.concept);assert.notEqual(result.question.prompt,q.prompt);for(const level of ['basic','standard','challenge']){const alternative=choose(note,level);assert.ok(alternative,'대체 문항 없음: '+key+':'+q.concept+':'+level);assert.notEqual(alternative.question.prompt,q.prompt);assert.equal(alternative.question.difficulty,level)}}
assert.equal(choose({grade:'9',conceptId:'poly'}),null);assert.equal(choose({grade:'1',conceptId:'unknown'}),null);
for(const [key,questions] of Object.entries(data.window.SIMILAR_QUESTIONS))for(const q of questions){
  assert.ok(['basic','standard','challenge'].includes(q.difficulty));assert.equal(q.hints.length,3);assert.ok(q.hints.every(h=>typeof h==='string'&&h.length>10&&h!==q.explanation));
  const note={grade:bank[key].grades[0],sourceKey:key,conceptId:q.concept,prompt:'원문과 다른 문제'};
  for(const level of ['basic','standard','challenge']){const match=choose(note,level);assert.ok(match);assert.equal(match.question.difficulty,level);assert.equal(match.question.concept,q.concept)}
  assert.equal(choose(note,'unknown'),null);
}
const source=bank.common1.questions[0];
const addedAnswers={
  common1:['x²+6x+9',10,4*3,8*7*6/(3*2*1)],
  algebra:[Math.log(9)/Math.log(3)+Math.log(27)/Math.log(3),'2π/3',5+7*3,3*2**5],
  calc1:[2*3-1,3+3,2*4,3*(5-2)],
  calc2:[0,2,'eˣ+C',2**2-0**2],
  geometry:['(3,0)',2*0+0*5,Math.sqrt(2**2+3**2+6**2),(4+8)/2]
};
let addedCount=0;
for(const [key,questions] of Object.entries(data.window.SIMILAR_QUESTIONS)){
  const originalPrompts=new Set(bank[key].questions.map(q=>q.prompt)),added=questions.filter(q=>q.difficulty!=='challenge'&&!originalPrompts.has(q.prompt));
  assert.equal(added.length,(addedAnswers[key]||[]).length);
  added.forEach((q,i)=>{addedCount++;const actual=q.type==='choice'?q.choices[q.answer]:q.answers[0],expected=addedAnswers[key][i];assert.ok(typeof expected==='number'?Math.abs(Number(actual)-expected)<1e-12:actual===expected);if(q.type==='choice'){assert.equal(q.choices.length,5);assert.ok(q.answer>=0&&q.answer<5);assert.equal(new Set(q.choices).size,5)}});
}
assert.equal(addedCount,20);
const challengeAnswers={
  poly:2**3-2*2+3,
  eq:Array.from({length:20},(_,k)=>k).filter(k=>k>0&&36-4*k>0).length,
  count:(5*4*3/6)*3,
  func:1+Math.sqrt(8+1),geomeq:(1-Math.sqrt(25-16))+(1+Math.sqrt(25-16)),
  explog:1+Math.sqrt(1+8),seq:10*(2*(7-2*((19-7)/4))+9*((19-7)/4))/2,
  limit:(3*2**2)/(2*2),diff:1**3-3,
  integ:(1*1/2)+(2*2/2),prob:'3/5',stat:Math.sqrt(3**2*4),
  seqlim:(6*(1-1/3))**2/(1-(1/3)**2),difflaw:2/(1+1),
  conic:2*Math.sqrt(25-9),vec:2**2+(-1)**2,space:((1+5)/2)**2+((2-2)/2)**2+((3+7)/2)**2
};
for(const q of Object.values(data.window.SIMILAR_QUESTIONS).flat().filter(q=>q.difficulty==='challenge')){
  if(q.concept==='trig'){assert.equal(q.answers[0],'π');assert.ok(Math.abs(Math.PI/6+5*Math.PI/6-Math.PI)<1e-12)}
  else if(q.concept==='integlaw'){assert.equal(q.answers[0],'ln2');let sum=0;for(let i=0;i<10000;i++){const x=(i+.5)/10000;sum+=2*x/(x*x+1)/10000}assert.ok(Math.abs(sum-Math.log(2))<1e-8)}
  else{const expected=challengeAnswers[q.concept];assert.ok(expected!==undefined);if(typeof expected==='number'){const number=answer=>answer.includes('/')?answer.split('/').map(Number).reduce((a,b)=>a/b):Number(answer);assert.ok(q.answers.some(a=>Math.abs(number(a)-expected)<1e-12))}else assert.ok(q.answers.includes(expected))}
}
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;if(name.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(name.includes('student-account')?'{"signedIn":false}':'[]');return}try{res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.woff2')?'font/woff2':'text/html');res.end(fs.readFileSync(path.join(root,name)))}catch{res.writeHead(404).end()}});
(async()=>{await new Promise(resolve=>server.listen(5202,'127.0.0.1',resolve));let browser;try{
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  for(const width of [1280,390]){
    const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(({prompt,attempts})=>{if(localStorage.getItem('math-wrong-notes-v1'))return;localStorage.setItem('math-wrong-notes-v1',JSON.stringify([{id:'original',grade:'1',sourceKey:'common1',conceptId:'poly',conceptName:'다항식',sourceTitle:'오늘의 학습',prompt,type:'text',correctAnswer:'1',userAnswer:'2',mastered:false,attempts}]));localStorage.setItem('today-study-records','[]')},{prompt:source.prompt,attempts:width===1280?2:1});
    await page.goto('http://127.0.0.1:5202/wrong-notes.html?view=due');await page.waitForSelector('[data-retry]');assert.equal(await page.locator('[data-similar]').count(),0);
    await page.locator('[data-retry]').click();await page.locator('.retry-input').fill('1');await page.locator('.retry-submit').click();await page.waitForSelector('.retry-box [data-similar]');
    const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('math-wrong-notes-v1'))[0]);await page.waitForTimeout(1300);assert.equal(await page.locator('.retry-box [data-similar]').count(),1);
    await page.locator('.retry-box [data-similar]').click();await page.waitForSelector('#similarStart');
    assert.equal(await page.locator('[data-difficulty]').count(),3);const level=width===1280?'challenge':'standard';await page.locator('[data-difficulty="'+level+'"]').click();assert.equal(await page.locator('[data-difficulty="'+level+'"]').getAttribute('aria-pressed'),'true');await page.locator('#similarStart').click();
    await page.waitForSelector('.daily-question');assert.notEqual(await page.locator('.daily-question').innerText(),source.prompt);assert.equal(await page.locator('.daily-progress').innerText(),'1 / 1');assert.equal(await page.locator('#scratchCanvas').count(),1);
    const q=choose(original,level).question;assert.equal(await page.locator('#hintSteps li').count(),0);assert.equal(await page.locator('#feedbackSlot').innerText(),'');
    for(let step=1;step<=3;step++){await page.locator('#showHint').click();assert.equal(await page.locator('#hintSteps li').count(),step)}assert.equal(await page.locator('#showHint').isDisabled(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(q.type==='choice'){await page.locator('.daily-choice').nth(width===1280?q.answer:(q.answer+1)%5).click();await page.locator('#choiceSubmit').click()}else{await page.locator('#dailyInput').fill(width===1280?q.answers[0]:'99999');await page.locator('#textSubmit').click()}
    assert.equal(await page.locator('#showHint').isDisabled(),true);
    if(width===390){await page.locator('#wrongReason').selectOption('calculation');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('math-wrong-notes-v1')).some(n=>n.wrongReason==='calculation'))}
    await page.locator('#dailyNext').click();await page.waitForSelector('.today-panel a[href="wrong-notes.html"]');
    const state=await page.evaluate(()=>({notes:JSON.parse(localStorage.getItem('math-wrong-notes-v1')),records:JSON.parse(localStorage.getItem('today-study-records')),stats:JSON.parse(localStorage.getItem('math-concept-stats-v1'))}));
    assert.deepEqual(state.notes.find(n=>n.id==='original'),original);assert.equal(state.records.length,0);assert.ok(state.stats.poly.attempts>=2);
    if(width===390){const wrong=state.notes.find(n=>n.source==='similar'&&n.prompt===q.prompt);assert.ok(wrong);assert.equal(wrong.wrongReason,'calculation');assert.equal(wrong.hintsUsed,3);assert.equal(wrong.difficulty,level);
      await page.locator('.today-panel a[href="wrong-notes.html"]').click();const reason=page.locator('[data-card="'+wrong.id+'"] .wrong-reason select');await reason.selectOption('reading');await page.reload();assert.equal(await page.locator('[data-card="'+wrong.id+'"] .wrong-reason select').inputValue(),'reading');
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
    await page.goto('http://127.0.0.1:5202/today.html?review=missing');await page.waitForSelector('.today-panel h2');assert.match(await page.locator('.today-panel h2').innerText(),/준비/);
    if(width===1280){
      await page.goto('http://127.0.0.1:5202/today.html?review=original');await page.locator('[data-difficulty="basic"]').click();await page.locator('#similarStart').click();
      const basic=choose(original,'basic').question;assert.equal(basic.type,'choice');await page.locator('.daily-choice').nth(basic.answer).click();await page.locator('#choiceSubmit').click();assert.equal(await page.locator('#showHint').isDisabled(),true);assert.equal(await page.locator('#hintSteps li').count(),0);await page.locator('#dailyNext').click();
      await page.evaluate(()=>localStorage.setItem('math-wrong-notes-v1',JSON.stringify([{id:'onlychallenge',grade:'2',conceptId:'limit',sourceKey:'calc1',prompt:window.SIMILAR_QUESTIONS.calc1.find(q=>q.concept==='limit'&&q.difficulty==='challenge').prompt}])));
      await page.goto('http://127.0.0.1:5202/today.html?review=onlychallenge');assert.equal(await page.locator('[data-difficulty="challenge"]').isDisabled(),true);assert.equal(await page.locator('[data-difficulty="standard"]').isDisabled(),false);
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
