const assert=require("node:assert/strict"),crypto=require("node:crypto");
const values=new Map(),redisPath=require.resolve("../api/_redis");
require.cache[redisPath]={id:redisPath,filename:redisPath,loaded:true,exports:{준비됨:true,명령:async(op,...args)=>{
  if(op==="GET")return values.get(args[0])||null;
  if(op==="SET"){values.set(args[0],args[1]);return "OK"}
  if(op==="DEL")return values.delete(args[0])?1:0;
  if(op==="HGET")return null;
  if(op==="EXISTS")return values.has(args[0])?1:0;
  if(op==="INCR"){const next=Number(values.get(args[0])||0)+1;values.set(args[0],String(next));return next}
  if(op==="EXPIRE")return 1;
  if(op==="EVAL"){assert.equal(args[1],2);const [key,limit,expected,next]=args.slice(2);if(values.get(key)!==expected)return 0;values.set(key,next);values.delete(limit);return 1}
  throw new Error(op);
}}};
process.env.ADMIN_PASSWORD="test-teacher-password";
const admin=require("../api/student-admin"),student=require("../api/student-account");
async function call(handler,body={},cookie="",method="POST"){
  const result={headers:{}};
  await handler({method,body,headers:{cookie,"x-forwarded-for":"reset-test"}},{setHeader(key,value){result.headers[key]=value},status(code){result.code=code;return this},json(data){result.data=data}});return result;
}
(async()=>{
  const signup=await call(student,{action:"register",id:"student01",pin:"728315",name:"민수"});assert.equal(signup.code,201);
  const cookie=signup.headers["Set-Cookie"].split(";")[0];
  const second=await call(student,{action:"login",id:"student01",pin:"728315"});const secondCookie=second.headers["Set-Cookie"].split(";")[0];
  const legacy=crypto.randomBytes(32).toString("hex");values.set("student:session:"+legacy,"student01");
  const data='{"records":[{"correct":4}],"notes":[{"id":"note"}]}';values.set("student:data:student01",data);
  const original=values.get("student:account:student01"),payload={action:"reset-password",id:"student01",newPin:"483927",password:"test-teacher-password"};
  assert.equal((await call(admin,{...payload,password:"wrong"})).code,401);assert.equal(values.get("student:account:student01"),original);
  for(const newPin of ["1234","111111","123456","abcdef"]){assert.equal((await call(admin,{...payload,newPin})).code,400)}
  assert.equal((await call(admin,{...payload,id:"missing01"})).code,404);
  values.set("student:rate:login-id:student01","10");assert.equal((await call(admin,payload)).code,200);
  const updated=JSON.parse(values.get("student:account:student01"));assert.notEqual(updated.hash,"483927");assert.ok(updated.authVersion);assert.equal(updated.name,"민수");assert.equal(values.get("student:data:student01"),data);assert.equal(values.has("student:rate:login-id:student01"),false);
  for(const oldCookie of [cookie,secondCookie,"math_student_session="+legacy]){
    assert.equal((await call(student,{},oldCookie,"GET")).data.signedIn,false);
    assert.equal((await call(student,{action:"sync",studentId:"student01",data:{}},oldCookie)).code,401);
  }
  assert.equal((await call(student,{action:"login",id:"student01",pin:"728315"})).code,401);
  const fresh=await call(student,{action:"login",id:"student01",pin:"483927"});assert.equal(fresh.code,200);
  assert.equal((await call(student,{},fresh.headers["Set-Cookie"].split(";")[0],"GET")).data.signedIn,true);
  console.log("학생 비밀번호 초기화 검사 통과: 관리자 보호, 새 비밀번호 규칙, 기록 보존, 이전 비밀번호 거부, 모든 이전 세션 해제, 새 로그인");
})().catch(error=>{console.error(error);process.exitCode=1});
