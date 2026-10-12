const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto");
const root=path.join(__dirname,".."),{merge}=require("../assets/study-state");
const clone=value=>JSON.parse(JSON.stringify(value)),read=(client,key)=>JSON.parse(client.localStorage.getItem(key)||"null");
let remote={},otherAccounts={},pause=null,release=null,fail=false;
function client(){
  const values=new Map(),listeners=new Map();let account="minsu",failNext="";
  const context=vm.createContext({console,crypto:crypto.webcrypto,Date,CustomEvent:class{constructor(type){this.type=type}},setTimeout:()=>1,clearTimeout:()=>{},localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>{if(key===failNext){failNext="";throw new Error("quota")}values.set(key,String(value))}}});
  context.failStorage=key=>failNext=key;
  context.window=context;context.addEventListener=(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)};context.dispatchEvent=event=>(listeners.get(event.type)||[]).forEach(fn=>fn(event));
  context.fetch=async(url,options={})=>{
    const payload=options.body?JSON.parse(options.body):{};
    if(!options.method)return{ok:true,json:async()=>({signedIn:false})};
    if(payload.action==="login"){account=payload.id;return{ok:true,json:async()=>({student:{id:payload.id},signedIn:true})}}
    if(payload.action==="logout")return{ok:true,json:async()=>({ok:true})};
    if(fail)return{ok:false,json:async()=>({error:"offline"})};
    assert.ok(payload.data.notes.every(note=>!note.solutionImage&&!note.feedbackImage),"필기 이미지가 서버로 전송됨");
    const response=clone(merge(payload.data,account==="minsu"?remote:otherAccounts[account]||{}));
    if(account==="minsu")remote=response;else otherAccounts[account]=response;
    if(pause){pause=null;await new Promise(resolve=>release=resolve)}
    return{ok:true,json:async()=>({ok:true,data:response})};
  };
  ["study-state.js","student-sync.js","wrong-notes-store.js"].forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,"assets",file),"utf8"),context));
  return context;
}
const question={source:"today",prompt:"x+1=2",conceptId:"poly",conceptName:"다항식",solutionImage:"data:image/png;base64,AA=="};
async function browserChecks(){
  remote={stats:{poly:{key:"poly",name:"다항식",attempts:4,correct:2,wrong:2}}};
  const a=client(),b=client();await Promise.resolve();await Promise.resolve();
  await a.StudentSync.login({id:"minsu"});await b.StudentSync.login({id:"minsu"});
  a.WrongNotes.record(question,false);b.WrongNotes.record(question,true);
  await a.StudentSync.sync();await b.StudentSync.sync();await a.StudentSync.sync();
  assert.equal(remote.stats.poly.attempts,6);assert.equal(remote.stats.poly.correct,3);assert.equal(remote.stats.poly.wrong,3);
  assert.equal(a.WrongNotes.all()[0].solutionImage,question.solutionImage);
  a.WrongNotes.updateSolution(a.WrongNotes.idFor(question),"data:image/png;base64,BB==");await a.StudentSync.sync();
  assert.equal(a.WrongNotes.all()[0].feedbackImage,"data:image/png;base64,BB==");
  const id=a.WrongNotes.idFor(question);a.WrongNotes.remove(id);await a.StudentSync.sync();await b.StudentSync.sync();
  assert.equal(remote.notes.length,0,"다른 기기의 이전 기록이 삭제를 취소함");
  b.WrongNotes.record(question,false);await b.StudentSync.sync();assert.equal(remote.notes.length,1,"삭제한 문제의 재학습이 저장되지 않음");
  pause=true;const syncing=b.StudentSync.sync();await Promise.resolve();
  b.WrongNotes.record({...question,prompt:"x+2=3"},false);release();await syncing;
  assert.equal(remote.notes.length,2,"전송 중 새 풀이 기록이 사라짐");assert.equal(remote.stats.poly.attempts,8);
  a.WrongNotes.record({...question,prompt:"x+3=4"},false);await a.StudentSync.sync();
  await a.StudentSync.login({id:"another"});assert.equal(a.WrongNotes.all().length,0,"다른 학생에게 이전 계정 기록이 보임");
  assert.ok(read(a,"math-student-backup:minsu"),"계정 전환 전 기기 기록이 보관되지 않음");
  await a.StudentSync.login({id:"minsu"});assert.ok(a.WrongNotes.all().some(note=>note.solutionImage===question.solutionImage));
  b.WrongNotes.record({...question,prompt:"x+4=5"},true);await b.StudentSync.sync();
  const beforeQuota=clone(a.WrongNotes.all());a.failStorage("math-concept-stats-v1");await a.StudentSync.sync();
  assert.deepEqual(clone(a.WrongNotes.all()),beforeQuota,"저장 공간 오류 때 부분 적용된 기록이 남음");assert.match(a.StudentSync.getState().error,/저장/);await a.StudentSync.sync();assert.equal(a.StudentSync.getState().error,"");
  fail=true;const before=clone(a.WrongNotes.all());await a.StudentSync.sync();assert.equal(a.StudentSync.getState().error,"offline");await a.StudentSync.logout();assert.deepEqual(clone(a.WrongNotes.all()),before);assert.equal(a.StudentSync.getState().signedIn,false);fail=false;
}
async function serverChecks(){
  const values=new Map(),token="a".repeat(64),redisPath=require.resolve("../api/_redis");let competing=null;
  values.set("student:session:"+token,"minsu");
  values.set("student:account:minsu",JSON.stringify({name:"민수"}));
  require.cache[redisPath]={id:redisPath,filename:redisPath,loaded:true,exports:{준비됨:true,명령:async(op,...args)=>{
    if(op==="GET")return values.get(args[0])||null;
    if(op==="EXPIRE")return 1;
    if(op==="EVAL"){
      const key=args[2],expected=args[3],next=args[4];
      if(competing){values.set(key,JSON.stringify(competing));competing=null}
      if((values.get(key)||"")!==expected)return 0;values.set(key,next);return 1;
    }
    throw new Error(op);
  }}};
  const handler=require("../api/student-account");
  async function call(data,studentId="minsu"){const result={};await handler({method:"POST",body:{action:"sync",studentId,data},headers:{cookie:"math_student_session="+token}},{setHeader(){},status(code){result.code=code;return this},json(data){result.data=data}});return result}
  const a={stats:{poly:{base:{correct:2,wrong:2},devices:{tablet:{correct:1,wrong:0}}}}},b={stats:{poly:{base:{correct:2,wrong:2},devices:{phone:{correct:0,wrong:1}}}}};
  competing=merge(b,{});const result=await call(a);assert.equal(result.code,200);assert.equal(result.data.data.stats.poly.attempts,6,"동시 저장 충돌로 풀이 횟수 손실");
  assert.equal((await call(a)).data.data.stats.poly.attempts,6,"재전송이 중복 합산됨");
  const oldClient=clone((await call(a)).data.data);oldClient.stats.poly.correct++;oldClient.stats.poly.attempts++;
  assert.equal((await call(oldClient)).data.data.stats.poly.attempts,7,"배포 전에 연 화면의 풀이가 빠짐");
  const tieA={notes:[{id:"tie",updatedAt:"2026-10-01T00:00:00Z",mastered:true}]},tieB={notes:[{id:"tie",updatedAt:"2026-10-01T00:00:00Z",mastered:false}]};
  assert.deepEqual(merge(tieA,tieB).notes,merge(tieB,tieA).notes,"시각이 같은 변경의 결과가 전송 순서에 따라 바뀜");
  const deletion={notes:[{id:"n",lastWrongAt:"2026-10-01T00:00:00Z"}],deletedNotes:{n:"2026-10-02T00:00:00Z"}};
  const metricA={stats:{poly:{devices:{tablet:{correct:1,wrong:1,reviewAttempts:2,hintUsed:1,hintSteps:3,soloCorrect:1}}}}},metricB={stats:{poly:{devices:{phone:{correct:2,wrong:1,reviewAttempts:3,hintUsed:2,hintSteps:4,soloCorrect:1}}}}};
  const metrics=merge(metricA,metricB);assert.equal(metrics.stats.poly.reviewAttempts,5);assert.equal(metrics.stats.poly.hintUsed,3);assert.equal(metrics.stats.poly.hintSteps,7);assert.equal(metrics.stats.poly.soloCorrect,2);assert.deepEqual(merge(metrics,metricA).stats.poly,metrics.stats.poly);assert.deepEqual(merge(metricB,metricA).stats.poly.devices,metrics.stats.poly.devices);
  assert.equal((await call(deletion)).data.data.notes.length,0);
  const malformed=await call({notes:[null,4],stats:{poly:null},records:[null],deletedNotes:{x:"invalid"}});assert.equal(malformed.code,200);
  const beforeMismatch=values.get("student:data:minsu");assert.equal((await call({notes:[{id:"foreign"}]},"another")).code,409);assert.equal(values.get("student:data:minsu"),beforeMismatch,"다른 창의 계정 기록이 저장됨");
}
(async()=>{await browserChecks();await serverChecks();console.log("동기화 검사 통과: 필기 보존·이미지 비전송, 삭제 전파·재학습, 두 기기 합산·재전송, 전송 중 풀이, 계정 분리, 실패 시 기록 보존, 동시 저장 충돌")})().catch(error=>{console.error(error);process.exitCode=1});
