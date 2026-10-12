const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),env={window:{}};
for(const name of ['today-data','similar-practice-data'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/'+name+'.js'),'utf8'),env);
const bank=env.window.SIMILAR_QUESTIONS,questions=Object.values(bank).flat();assert.equal(questions.length,114);
const expected={poly:3*(5-2)+(2-(5-2)),eq:Math.sqrt(9),count:4*3*2*1*2,func:(Math.sqrt(25)-1)/2,geomeq:3-(-1/2)*2,explog:2*3-2,trig:-Math.sqrt(1-(3/5)**2),seq:2*(3**4-1)/(3-1),limit:2**2+(2+2),diff:Math.max(0,1**3-3,2**3-3*2),integ:2**2+1,prob:2/4,stat:10*.3+10*.3*(1-.3),seqlim:1,difflaw:(1+0)*Math.exp(0),integlaw:(1-1)*Math.exp(1)-(0-1)*Math.exp(0),conic:2*Math.sqrt(25),vec:(1*2+1*0)/(Math.hypot(1,1)*Math.hypot(2,0)),space:Math.hypot(5-2,1+3,0)};
function number(answer){const text=String(answer).replace(/[−–—]/g,'-'),root=text.match(/^√(\d+)\/(\d+)$/),fraction=text.match(/^(-?\d+)\/(\d+)$/);return root?Math.sqrt(Number(root[1]))/Number(root[2]):fraction?Number(fraction[1])/Number(fraction[2]):Number(text)}
const challenge=questions.filter(q=>q.difficulty==='challenge'),added=challenge.filter((q,i)=>challenge.findLastIndex(x=>x.concept===q.concept)===i);assert.equal(added.length,19);
for(const q of added){const actual=q.type==='choice'?q.choices[q.answer]:q.answers[0];assert.ok(Math.abs(number(actual)-expected[q.concept])<1e-12,q.prompt)}
let partial=0;for(let n=1;n<=10000;n++)partial+=1/(n*(n+1));assert.ok(Math.abs(partial-(1-1/10001))<1e-12);
for(const [key,rows] of Object.entries(bank))for(const q of rows){
  assert.ok(q.subtype);assert.equal(q.hints.length,3);if(q.type==='choice'){assert.equal(q.choices.length,5);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<5);assert.equal(new Set(q.choices).size,5)}else assert.ok(q.answers.length);
  const note={sourceKey:key,grade:env.window.TODAY_TRACKS[key].grades[0],conceptId:q.concept,prompt:q.prompt,subtype:q.subtype};
  for(const level of ['basic','standard','challenge']){const alternative=env.window.similarQuestion(note,level);assert.ok(alternative,q.prompt+':'+level);assert.notEqual(alternative.question.prompt,q.prompt);assert.equal(alternative.question.difficulty,level)}
}
assert.equal(env.window.similarQuestion({sourceKey:'common1',grade:'1',conceptId:'poly',prompt:'임의 문제'},'standard','없는 유형'),null);
console.log('확인 문제 보강 검사 통과: 114문항·세부 유형·모든 문항의 세 난도 대체·19개 확장 정답 검산');
