const assert=require('node:assert/strict'),values=new Map(),now=Date.parse('2026-10-13T03:00:00Z'),day=86400000,iso=days=>new Date(now-days*day).toISOString();
const redisPath=require.resolve('../api/_redis');let scans=0;
require.cache[redisPath]={id:redisPath,filename:redisPath,loaded:true,exports:{준비됨:true,명령:async(op,...args)=>{if(op==='GET')return values.get(args[0])||null;if(op==='HGET')return null;if(op==='SCAN'){scans++;return['0',[...values.keys()].filter(key=>key.startsWith('student:account:'))]}throw new Error('read-only expected: '+op)}}};
process.env.ADMIN_PASSWORD='diagnostic-test-password';
const handler=require('../api/student-admin'),{TODAY_TRACKS}=require('../assets/today-data');
const diagnostic=(grade,track,days=0)=>({grade,completedAt:iso(days),prompt:'private prompt',solutionImage:'private ink',answers:TODAY_TRACKS[track].questions.slice(0,5).map((q,i)=>({concept:q.concept,correct:i<3,skipped:i===4,userAnswer:'private answer'}))});
function seed(id,diagnostics,records=[]){values.set('student:account:'+id,JSON.stringify({name:id,createdAt:iso(20),hash:'private hash',salt:'private salt'}));values.set('student:data:'+id,JSON.stringify({profile:{grade:'1',track:'common1',diagnostics},records,notes:[],stats:{}}))}
async function request(password='diagnostic-test-password',method='POST'){const result={headers:{}};await handler({method,body:{password},headers:{}},{setHeader(key,value){result.headers[key]=value},status(code){result.code=code;return this},json(data){result.data=data}});return result}
(async()=>{const old=Date.now;Date.now=()=>now;try{
  seed('diagonly',{common1:diagnostic('1','common1'),common2:diagnostic('1','common2',1)});
  seed('untested',{});seed('oldonly',{common1:diagnostic('1','common1',8)});
  seed('ordinary',{common1:diagnostic('1','common1',2)},[{date:'2026-10-12',grade:'1',track:'common1',correct:4,total:5,finishedAt:iso(1)}]);
  const valid=diagnostic('1','common1');seed('invalid1',{unknown:valid,common1:{...valid,grade:'2'},common2:{...diagnostic('1','common2'),completedAt:iso(-1)}});
  seed('invalid2',{common1:{...valid,answers:valid.answers.slice(0,4)},common2:{...diagnostic('1','common2'),answers:[null,null,null,null,null]}});
  seed('invalid3',{common1:{...valid,answers:valid.answers.map(a=>({...a,skipped:'false'}))},common2:{...diagnostic('1','common2'),answers:valid.answers}});
  seed('invalid4',{common1:{...valid,answers:valid.answers.map(a=>({...a,correct:true,skipped:true}))}});
  seed('invalid5',{common1:{...valid,completedAt:{toString:'invalid'}}});
  const before=new Map(values);assert.equal((await request('wrong')).code,401);assert.equal(scans,0);assert.equal((await request(undefined,'GET')).code,405);
  const response=await request();assert.equal(response.code,200);assert.equal(response.headers['Cache-Control'],'no-store');const students=response.data.students,only=students.find(s=>s.id==='diagonly');
  assert.equal(only.weeklyPlan.days.length,7);assert.equal(only.weeklyPlan.track,'common1');assert.equal(only.weeklyPlan.startsOn,'2026-10-13');assert.equal(only.diagnostics.length,2);assert.deepEqual(only.diagnostics.map(r=>r.track),['common1','common2']);const first=only.diagnostics[0];assert.deepEqual([first.total,first.correct,first.recheck,first.unlearned],[5,3,1,1]);assert.equal(first.concepts.reduce((sum,c)=>sum+c.total,0),5);assert.ok(first.concepts.every(c=>c.total===c.correct+c.recheck+c.unlearned));assert.equal(first.title,'공통수학1');assert.equal(first.concepts[0].name,'다항식');
  assert.equal(only.notStarted,false);assert.equal(only.inactive7,false);assert.equal(only.lastAt,iso(0));assert.equal(only.todayDone,false);assert.equal(only.studyCount,0);assert.equal(only.average,null);assert.equal(only.activeWrong,0);assert.equal(only.weakest,null);
  assert.equal(students.find(s=>s.id==='untested').notStarted,true);assert.equal(students.find(s=>s.id==='oldonly').notStarted,false);assert.equal(students.find(s=>s.id==='oldonly').inactive7,true);const ordinary=students.find(s=>s.id==='ordinary');assert.equal(ordinary.lastAt,iso(1));assert.equal(ordinary.average,80);assert.equal(ordinary.studyCount,1);
  for(const id of ['invalid1','invalid2','invalid3','invalid4','invalid5']){const student=students.find(s=>s.id===id);assert.deepEqual(student.diagnostics,[]);assert.equal(student.notStarted,true)}
  const output=JSON.stringify(response.data);for(const secret of ['private prompt','private ink','private answer','private hash','private salt','userAnswer','solutionImage'])assert.equal(output.includes(secret),false,secret);
  assert.deepEqual(values,before);console.log('선생님 진단 API 검사 통과: 관리자 인증·과목/개념 집계·미학습 구분·여러 과목·미진단/잘못된 기록·활동 시각·기존 점수/오답 보존·민감 자료 비전송·읽기 전용');
}finally{Date.now=old}})().catch(error=>{console.error(error);process.exitCode=1});
