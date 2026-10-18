const assert=require('node:assert/strict'),values=new Map(),now=Date.parse('2026-10-18T03:00:00Z');
const {summarize,teacherSummary}=require('../assets/study-journey');
const result=(id,correct,total=1,hints=0)=>({id,at:'2026-10-18T02:00:00Z',correct,total,hints,weakConcepts:correct<total?['poly']:[],userAnswer:'private answer'});
const complete={date:'2026-10-18',grade:'1',track:'common1',createdAt:'2026-10-18T01:00:00Z',conceptId:'poly',level:'basic',noteIds:['private-note-id'],results:[result('daily',4,5),result('practice-poly',0,1,2),result('review-private-note-id',0)],prompt:'private prompt',solutionImage:'private ink'};
const partial={...complete,track:'common2',conceptId:'func',noteIds:[],results:[result('daily',5,5)]},notes=[{id:'private-note-id',grade:'1',sourceKey:'common1',conceptId:'poly',nextReviewAt:'2026-10-19T03:00:00Z'}];
const shared=summarize(complete,notes,now),brief=teacherSummary([complete],notes,now)[0];assert.equal(shared.completed,3);assert.equal(brief.done,true);assert.deepEqual(brief.tasks.map(t=>t.done),shared.tasks.map(t=>t.done));assert.equal(brief.tasks[2].hints,2);assert.equal(brief.tasks[2].correct,0);assert.equal(brief.nextReview,'2026-10-19');
assert.equal(teacherSummary([complete],notes,Date.parse('2026-10-18T15:00:00Z')).length,0,'한국 자정에 어제 기록 포함');
const future={...complete,results:complete.results.map(r=>({...r,at:'2026-10-18T14:00:00Z'}))};assert.equal(teacherSummary([future],notes,now)[0].completed,0);
assert.equal(teacherSummary([{...complete,track:'toString'},{...complete,grade:'2'},{...complete,conceptId:'foreign'},{...complete,createdAt:'2026-10-18T14:00:00Z'}],notes,now).length,0);
const excluded=teacherSummary([{...complete,results:[]}],[],now)[0];assert.equal(excluded.excluded,1);assert.match(excluded.tasks[0].detail,/제외/);assert.equal(excluded.tasks[0].submitted,0);
const redisPath=require.resolve('../api/_redis');let scans=0;
require.cache[redisPath]={id:redisPath,filename:redisPath,loaded:true,exports:{준비됨:true,명령:async(op,...args)=>{if(op==='GET')return values.get(args[0])||null;if(op==='HGET')return null;if(op==='SCAN'){scans++;return['0',[...values.keys()].filter(key=>key.startsWith('student:account:'))]}throw Error('read only expected: '+op)}}};
process.env.ADMIN_PASSWORD='journey-test-password';const handler=require('../api/student-admin');
function seed(id,journeys=[],records=[]){values.set('student:account:'+id,JSON.stringify({name:id,createdAt:'2026-09-01T00:00:00Z',hash:'private hash',salt:'private salt'}));values.set('student:data:'+id,JSON.stringify({journeys,records,notes,stats:{},profile:{grade:'1',track:'common1'}}))}
async function request(password='journey-test-password',method='POST'){const response={headers:{}};await handler({method,headers:{},body:{password}},{setHeader:(k,v)=>response.headers[k]=v,status(code){response.code=code;return this},json(data){response.data=data}});return response}
(async()=>{const old=Date.now;Date.now=()=>now;try{
  seed('finished',[complete]);seed('remaining',[complete,partial]);seed('unsubmitted',[{...complete,results:[]}]);seed('norecord',[],[{date:'2026-10-18',grade:'1',track:'common1',correct:5,total:5,finishedAt:'2026-10-18T02:30:00Z'}]);seed('invalid',[{...complete,date:'2026-10-17'},{...complete,track:'foreign'}]);
  const before=new Map(values);assert.equal((await request('wrong')).code,401);assert.equal(scans,0);assert.equal((await request(undefined,'GET')).code,405);
  const response=await request();assert.equal(response.code,200);assert.equal(response.headers['Cache-Control'],'no-store');const find=id=>response.data.students.find(s=>s.id===id);
  assert.equal(find('finished').journeyComplete,true);assert.equal(find('finished').todayDone,false,'하루 완료를 5문제 기록으로 바꿈');assert.equal(find('finished').notStarted,false);assert.equal(find('finished').studyCount,0);
  assert.equal(find('remaining').journeyComplete,false);assert.equal(find('remaining').journeyRemaining,true);assert.equal(find('remaining').dailyJourneys.length,2);
  assert.equal(find('unsubmitted').journeyRemaining,true);assert.equal(find('unsubmitted').dailyJourneys[0].completed,0);assert.equal(find('norecord').journeyNoRecord,true);assert.equal(find('norecord').todayDone,true);assert.equal(find('norecord').todayScore,5);assert.equal(find('invalid').journeyNoRecord,true);
  assert.deepEqual(response.data.journeySummary,{date:'2026-10-18',complete:1,remaining:2,noRecord:2});assert.equal(response.data.summary.today,1);
  const output=JSON.stringify(response.data);for(const secret of ['private-note-id','private answer','private prompt','private ink','private hash','private salt','userAnswer','solutionImage','practiceHref'])assert.equal(output.includes(secret),false,secret);assert.deepEqual(values,before,'관리자 조회에서 학생 데이터를 변경');
  console.log('선생님 하루 학습 검사 통과: 공유 완료 기준·여러 과목·정오/힌트·제출 전/미동기화 구분·한국 자정·미래/잘못된 기록 제외·관리자 인증·읽기 전용·민감 자료 제외·기존 점수 보존');
}finally{Date.now=old}})().catch(error=>{console.error(error);process.exitCode=1});
