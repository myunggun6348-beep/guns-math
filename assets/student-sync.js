(function(){
  "use strict";
  const KEYS={profile:"math-home-profile-v1",pref:"today-study-pref",records:"today-study-records",notes:"math-wrong-notes-v1",stats:"math-concept-stats-v1"};
  const OWNER="math-student-data-owner";
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const write=(key,value)=>{try{if(value!==null&&value!==undefined)localStorage.setItem(key,JSON.stringify(value))}catch{}};
  const snapshot=()=>({profile:read(KEYS.profile,null),pref:read(KEYS.pref,null),records:read(KEYS.records,[]),notes:read(KEYS.notes,[]),stats:read(KEYS.stats,{})});
  let state={signedIn:false,student:null,ready:false,syncing:false},timer;
  async function request(options={}){
    const response=await fetch("/api/student-account",{credentials:"same-origin",headers:{"Content-Type":"application/json"},...options});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"요청을 처리하지 못했습니다.");return data;
  }
  function apply(data){
    if(!data)return;write(KEYS.profile,data.profile);write(KEYS.pref,data.pref);write(KEYS.records,data.records||[]);write(KEYS.notes,data.notes||[]);write(KEYS.stats,data.stats||{});
    if(state.student?.id)localStorage.setItem(OWNER,state.student.id);
    window.dispatchEvent(new CustomEvent("student-sync-applied"));window.dispatchEvent(new CustomEvent("wrong-notes-change"));
  }
  function localFor(id){const owner=localStorage.getItem(OWNER);return owner&&owner!==id?{profile:null,pref:null,records:[],notes:[],stats:{}}:snapshot()}
  function announce(){window.dispatchEvent(new CustomEvent("student-account-change",{detail:{...state}}))}
  async function sync(source){
    if(!state.signedIn||state.syncing)return;state.syncing=true;announce();
    try{const result=await request({method:"POST",body:JSON.stringify({action:"sync",data:source||snapshot()})});apply(result.data);state.lastSync=new Date().toISOString();state.error=""}
    catch(error){state.error=error.message}finally{state.syncing=false;announce()}
  }
  function changed(){if(!state.signedIn)return;clearTimeout(timer);timer=setTimeout(sync,700)}
  async function start(){
    try{const result=await request();state.signedIn=result.signedIn;state.student=result.student||null;if(result.signedIn)await sync(localFor(result.student.id))}
    catch(error){state.error=error.message}finally{state.ready=true;announce()}
  }
  async function register(info){const result=await request({method:"POST",body:JSON.stringify({action:"register",...info})});const local=localFor(result.student.id);state.signedIn=true;state.student=result.student;await sync(local);announce();return result}
  async function login(info){const result=await request({method:"POST",body:JSON.stringify({action:"login",...info})});const local=localFor(result.student.id);state.signedIn=true;state.student=result.student;await sync(local);announce();return result}
  async function logout(){await request({method:"POST",body:JSON.stringify({action:"logout"})});state={signedIn:false,student:null,ready:true,syncing:false};announce()}
  window.StudentSync={start,sync,changed,register,login,logout,getState:()=>({...state})};start();
})();
