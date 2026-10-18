const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const state=require('../assets/study-state'),root=path.join(__dirname,'..');
const date='2026-10-18',at='2026-10-18T01:00:00.000Z',plan={date,grade:'1',track:'common1',createdAt:at,conceptId:'poly',level:'basic',noteIds:['abc','def'],results:[]};
const result=(id,correct=1)=>({id,at:'2026-10-18T02:00:00.000Z',correct,total:id==='daily'?5:1,hints:0,weakConcepts:[]});
const a={journeys:[{...plan,results:[result('daily',4)]}]},b={journeys:[{...plan,createdAt:'2026-10-18T01:10:00Z',conceptId:'eq',results:[result('review-abc'),result('practice-eq')]}]};
const merged=state.merge(a,b);assert.equal(merged.journeys.length,1);assert.equal(merged.journeys[0].conceptId,'poly');assert.deepEqual(merged.journeys[0].results.map(r=>r.id),['daily','review-abc']);assert.deepEqual(state.merge(b,a).journeys,merged.journeys);assert.deepEqual(state.merge(merged,a).journeys,merged.journeys);
assert.equal(state.journeys([{...plan,date:'2026-02-30'}, {...plan,results:[result('daily',6),result('foreign'),{...result('review-abc'),at:'2026-10-17T14:59:59Z'}]}])[0].results.length,0);
assert.equal(state.journeys([{...plan,noteIds:['abc','def','ghi'],results:[{...result('daily'),weakConcepts:['poly','poly','<script>']}]}])[0].noteIds.length,2);
assert.equal(state.safeState({journeys:[{...plan,pin:'secret',results:[{...result('daily'),answer:'private'}]}]}).journeys[0].pin,undefined);
let now=Date.parse('2026-10-18T03:00:00Z'),signedIn=true,blocked=false,fail=false;
class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
const values=new Map(),context=vm.createContext({console,crypto:crypto.webcrypto,Date:Clock,CustomEvent:class{constructor(type){this.type=type}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>{if(fail&&k==='math-study-journeys-v1')throw Error('quota');values.set(k,String(v))}}});
context.window=context;context.dispatchEvent=()=>{};context.StudentSync={canUseLocal:()=>!blocked,getState:()=>({signedIn,ready:true,student:{id:'student1'}}),changed:()=>{}};
for(const name of ['study-state.js','today-data.js','wrong-notes-store.js','study-journey.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets',name),'utf8'),context);
const get=()=>context.StudyJourney.get('1','common1'),note={source:'today',sourceKey:'common1',grade:'1',conceptId:'poly',conceptName:'다항식',prompt:'x+1=2',type:'text',correctAnswer:'1'};
context.WrongNotes.record(note,false);let journey=get();assert.equal(journey.tasks.length,3);assert.equal(journey.completed,0,'오답 생성은 재풀이 제출이 아님');const original=JSON.parse(values.get('math-study-journeys-v1'));
assert.doesNotMatch(context.StudyJourney.view(journey),/class="journey-achievement"/,'학습 전 성과 카드 표시');
context.WrongNotes.record({...note,prompt:'new wrong'},false);journey=get();assert.equal(journey.noteIds.length,1,'새 오답으로 하루 분량이 늘어남');
context.WrongNotes.attempt(journey.noteIds[0],false,'2');journey=get();assert.equal(journey.completed,1);assert.equal(journey.tasks[0].results[0].correct,0,'틀린 재풀이도 제출한 활동이며 정답과 구분');
values.set('today-study-records',JSON.stringify([{date,grade:'1',track:'common1',correct:3,total:5,finishedAt:new Clock().toISOString(),weakConcepts:['eq']} ]));journey=get();assert.equal(journey.completed,2);
context.WrongNotes.record({...note,source:'similar',hintsUsed:2,prompt:'practice wrong'},false);journey=get();assert.equal(journey.done,true);assert.equal(journey.tasks[2].results[0].hints,2);assert.deepEqual(Array.from(journey.weakConcepts).sort(),['eq','poly']);
const beforeCard=new Map(values),card=context.StudyJourney.view(journey);assert.match(card,/오늘의 성과/);assert.match(card,/data-achievement="activities">3\/3/);assert.match(card,/data-achievement="submitted">7</);assert.match(card,/data-achievement="correct">3</);assert.match(card,/힌트 사용 · 2단계/);assert.match(card,/활동별 첫 제출 기준/);assert.deepEqual(values,beforeCard,'카드 표시로 기록 변경');
context.WrongNotes.record({...note,source:'similar',hintsUsed:0,prompt:'practice correct'},true);assert.equal(get().tasks[2].results[0].correct,0,'같은 날 추가 풀이가 첫 제출 결과를 바꿈');
assert.match(context.StudyJourney.view(get()),/data-achievement="correct">3</,'추가 연습으로 성과 카드 첫 제출 결과를 바꿈');
const old=values.get('math-study-journeys-v1');signedIn=false;assert.equal(get(),null);assert.equal(values.get('math-study-journeys-v1'),old);signedIn=true;blocked=true;assert.equal(get(),null);blocked=false;
assert.equal(context.StudyJourney.get('1','toString'),null);assert.equal(context.StudyJourney.get('2','common1'),null);
now=Date.parse('2026-10-18T15:00:00Z');journey=get();assert.equal(journey.date,'2026-10-19');assert.equal(journey.completed,0,'한국 자정에 전날 활동이 새 하루 완료로 집계됨');assert.equal(JSON.parse(values.get('math-study-journeys-v1')).length,2);
fail=true;now+=86400000;journey=get();assert.equal(journey.saved,false);assert.match(context.StudyJourney.view(journey),/저장하지 못/);fail=false;assert.equal(get().saved,true);
// Reopening a completed day keeps completion even after note/event cleanup or a retake.
now=Date.parse('2026-10-18T04:00:00Z');values.set('math-concept-stats-v1','{}');values.set('math-wrong-notes-v1','[]');values.set('today-study-records','[]');assert.equal(get().done,true);
const future={...original[0],noteIds:[],results:[{...result('daily',5),at:'2026-10-18T14:00:00Z'}]};values.set('math-study-journeys-v1',JSON.stringify([future]));assert.equal(get().completed,0,'미래 완료 기록을 표시함');
assert.doesNotMatch(context.StudyJourney.view(get()),/class="journey-achievement"/);
const shared=require('../assets/study-journey'),excluded=shared.summarize({...plan,noteIds:['removed'],results:[result('daily',5),result('practice-poly')]},[],Date.parse('2026-10-18T04:00:00Z')),excludedCard=shared.view(excluded);assert.equal(excluded.done,true);assert.match(excludedCard,/data-achievement="submitted">6</);assert.match(excludedCard,/data-achievement="correct">6</);assert.match(excludedCard,/1문제는 제외/,'삭제된 문제를 성과로 가산');
const partial=shared.summarize({...plan,results:[result('review-abc',0)]},[{id:'abc'},{id:'def'}],Date.parse('2026-10-18T04:00:00Z'));assert.equal(partial.completed,0);assert.match(shared.view(partial,true),/data-home-stage="in-progress"/,'한 활동을 다 마치지 않아도 제출이 있으면 진행 중');assert.match(shared.view(excluded,true),/data-home-stage="complete"/);assert.doesNotMatch(shared.view(excluded,true),/class="journey-head"|class="home-main-action"/,'완료 홈의 중복 시작/완료 안내');
assert.equal(get().tasks.length,2,'복습이 없으면 두 활동만 안내');
for(const [track,meta] of Object.entries(context.TODAY_TRACKS))for(const grade of meta.grades){const row=context.StudyJourney.get(grade,track);assert.ok(row);assert.ok(meta.questions.some(q=>q.concept===row.conceptId));assert.equal(row.tasks.length,2);assert.equal(row.completed,0)}
console.log('하루 학습 검사 통과: 고정 분량·실제 제출/정답 구분·힌트·재접속·두 기기 병합·새 오답 분리·한국 자정·과목/계정 보호·오류 재시도·기존 복습 일정 유지');
