const assert=require("node:assert/strict"),values=new Map(),now=Date.now(),day=86400000,iso=days=>new Date(now-days*day).toISOString();
const redisPath=require.resolve("../api/_redis");
require.cache[redisPath]={id:redisPath,filename:redisPath,loaded:true,exports:{준비됨:true,명령:async(op,...args)=>{
  if(op==="GET")return values.get(args[0])||null;if(op==="HGET")return null;
  if(op==="SCAN")return ["0",[...values.keys()].filter(key=>key.startsWith("student:account:"))];throw new Error(op);
}}};
process.env.ADMIN_PASSWORD="attention-test-password";
const handler=require("../api/student-admin");
function seed(id,className,joined,stats){
  values.set("student:account:"+id,JSON.stringify({name:id,createdAt:iso(joined),hash:"private",salt:"private"}));
  values.set("student:data:"+id,JSON.stringify({profile:{grade:"2",className,track:"calc1"},stats:stats?{diff:{key:"diff",name:"미분",conceptId:"diff",attempts:4,correct:stats.correct,wrong:4-stats.correct,lastAt:iso(stats.days)}}:{}}));
}
async function request(password){const result={};await handler({method:"POST",body:{password},headers:{}},{setHeader(){},status(code){result.code=code;return this},json(data){result.data=data}});return result}
(async()=>{
  seed("active01","3",20,{correct:1,days:1});seed("idle0001","3",20,{correct:2,days:8});seed("never001","3",20);seed("new00001","3",1);seed("other001","4",20,{correct:0,days:1});seed("edge0001","3",20,{correct:4,days:7});seed("unset001","",20,{correct:0,days:1});seed("unset002","",20,{correct:0,days:1});
  const active=JSON.parse(values.get('student:data:active01'));active.notes=[{id:'a',wrongReason:'calculation',hintsUsed:2},{id:'b',wrongReason:'reading',hintsUsed:0},{id:'c',wrongReason:'unknown'},null];Object.assign(active.stats.diff,{reviewAttempts:3,hintUsed:2,hintSteps:5,soloCorrect:1});values.set('student:data:active01',JSON.stringify(active));
  const idle=JSON.parse(values.get('student:data:idle0001'));idle.notes=[{id:'d',wrongReason:'calculation',hintsUsed:3}];Object.assign(idle.stats.diff,{reviewAttempts:2,hintUsed:1,hintSteps:3,soloCorrect:1});values.set('student:data:idle0001',JSON.stringify(idle));
  const originalNow=Date.now;Date.now=()=>now;
  Object.assign(active.notes[0],{conceptId:'diff',conceptName:'미분',reviewStage:4,mastered:true,lastWrongAt:iso(2),lastReviewAt:iso(0)});Object.assign(active.notes[1],{conceptId:'diff',conceptName:'미분',reviewStage:1,mastered:false,lastWrongAt:iso(2),lastReviewAt:iso(1),nextReviewAt:iso(-1)});values.set('student:data:active01',JSON.stringify(active));
  try{
    assert.equal((await request("wrong")).code,401);
    const result=await request("attention-test-password");assert.equal(result.code,200);const data=result.data;
    const review=data.students.find(row=>row.id==='active01').review;assert.equal(review.confirmed,2);assert.equal(review.completed,2);assert.equal(review.due,1);assert.equal(review.active,1);assert.equal(review.days.length,7);assert.equal(review.concepts[0].name,'미분');assert.equal(data.students.find(row=>row.id==='idle0001').review.confirmed,0);assert.equal(JSON.stringify(review).includes('solutionImage'),false);assert.equal(JSON.stringify(review).includes('prompt'),false);
    assert.equal(data.summary.inactive7,2);assert.equal(data.summary.notStarted,2);
    assert.equal(data.students.find(row=>row.id==="new00001").inactive7,false,"가입 7일 전 학생이 미학습 처리됨");
    assert.equal(data.students.find(row=>row.id==="edge0001").inactive7,false,"정확히 7일 경계의 학습이 빠짐");
    const cohort=data.classes.find(row=>row.key==="2-3");assert.equal(cohort.inactive7,2);assert.equal(cohort.notStarted,2);assert.equal(cohort.weakConcepts.length,1);assert.equal(cohort.weakConcepts[0].weakStudents,2);assert.equal(cohort.weakConcepts[0].students,3);assert.equal(cohort.weakConcepts[0].rate,58);
    assert.equal(data.classes.find(row=>row.key==="2-4").weakConcepts.length,0,"한 학생의 결과가 반 공통 취약 개념으로 표시됨");
    assert.equal(data.classes.find(row=>row.key==="unset").weakConcepts.length,0,"반 미설정 학생을 하나의 반으로 묶음");
    const analysis=data.students.find(row=>row.id==='active01').analysis;assert.equal(analysis.reasons.find(r=>r.key==='calculation').count,1);assert.equal(analysis.reasons.find(r=>r.key==='unrecorded').count,1);assert.equal(analysis.hints.hintUsed,2);assert.equal(analysis.hints.soloCorrect,1);assert.equal(analysis.savedHintNotes,1);
    assert.equal(cohort.analysis.hints.reviewAttempts,5);assert.equal(cohort.analysis.hints.hintSteps,8);assert.equal(cohort.analysis.reasons.find(r=>r.key==='calculation').count,2);assert.equal(data.classes.find(row=>row.key==='2-4').analysis.hints.reviewAttempts,0);
    assert.equal(JSON.stringify(data).includes('"hash"'),false);assert.equal(JSON.stringify(data).includes('"salt"'),false);
    console.log("학생 관심 현황 검사 통과: 7일 경계·신규 가입 제외·미시작 구분, 반별 공통 취약 개념과 평균, 반 분리, 관리자 보호");
  }finally{Date.now=originalNow}
})().catch(error=>{console.error(error);process.exitCode=1});
