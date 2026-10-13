(function(){
  "use strict";
  const KEYS={profile:"math-home-profile-v1",pref:"today-study-pref",records:"today-study-records",notes:"math-wrong-notes-v1",stats:"math-concept-stats-v1",deletedNotes:"math-wrong-deletions-v1"};
  const OWNER="math-student-data-owner",GUEST="math-student-guest-data-v1",LAST_ID="math-student-last-id-v1";
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const write=(key,value)=>{if(value!==undefined){const text=JSON.stringify(value);if(localStorage.getItem(key)!==text)localStorage.setItem(key,text)}};
  const snapshot=()=>({profile:read(KEYS.profile,null),pref:read(KEYS.pref,null),records:read(KEYS.records,[]),notes:read(KEYS.notes,[]),stats:read(KEYS.stats,{}),deletedNotes:read(KEYS.deletedNotes,{})});
  let state={signedIn:false,student:null,ready:false,syncing:false},timer,inFlight=null,pending=false,generation=0;
  async function request(options={}){
    const response=await fetch("/api/student-account",{credentials:"same-origin",signal:globalThis.AbortSignal?.timeout?.(15000),headers:{"Content-Type":"application/json"},...options});
    const data=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(data.error||"요청을 처리하지 못했습니다.");error.status=response.status;throw error}return data;
  }
  function apply(data){
    if(!data)return;
    const local=localFor(state.student.id),merged=window.StudyState.merge(local,data),images=new Map((Array.isArray(local.notes)?local.notes:[]).filter(note=>note&&typeof note.id==="string").map(note=>[note.id,note]));
    merged.notes=merged.notes.map(note=>({...note,solutionImage:images.get(note.id)?.solutionImage||"",feedbackImage:images.get(note.id)?.feedbackImage||""}));
    const owner=localStorage.getItem(OWNER);
    const previous=snapshot();
    if(owner&&owner!==state.student.id)write("math-student-backup:"+owner,previous);
    if(!owner)write(GUEST,previous);
    try{
      Object.entries(KEYS).forEach(([field,key])=>write(key,merged[field]));
      localStorage.setItem(LAST_ID,state.student.id);
      localStorage.setItem(OWNER,state.student.id);
    }catch(error){
      Object.entries(KEYS).forEach(([field,key])=>{try{write(key,previous[field])}catch{}});
      throw new Error("기기에 기록을 저장하지 못했습니다. 저장 공간을 확인해 주세요.");
    }
    window.dispatchEvent(new CustomEvent("student-sync-applied"));window.dispatchEvent(new CustomEvent("wrong-notes-change"));
  }
  function localFor(id){const owner=localStorage.getItem(OWNER);return owner===id?snapshot():read("math-student-backup:"+id,null)||(owner?{}:snapshot())}
  function restoreGuest(){
    const owner=localStorage.getItem(OWNER);if(!owner)return;const previous=snapshot();
    const blank={profile:null,pref:{},records:[],notes:[],stats:{},deletedNotes:{}},guest=read(GUEST,blank)||blank;
    try{write("math-student-backup:"+owner,previous);Object.entries(KEYS).forEach(([field,key])=>write(key,guest[field]??blank[field]));localStorage.removeItem(OWNER);localStorage.setItem(LAST_ID,owner)}
    catch{Object.entries(KEYS).forEach(([field,key])=>{try{write(key,previous[field])}catch{}});try{localStorage.setItem(OWNER,owner)}catch{}throw new Error("기록을 안전하게 분리하지 못했습니다. 저장 공간을 확인해 주세요.")}
    try{globalThis.sessionStorage?.removeItem('math-home-explore')}catch{}
  }
  function canUseLocal(){try{const owner=localStorage.getItem(OWNER);return owner?state.signedIn&&owner===state.student?.id:!state.signedIn}catch{return false}}
  function announce(){window.dispatchEvent(new CustomEvent("student-account-change",{detail:{...state}}))}
  function sync(source){
    if(!state.signedIn)return Promise.resolve();if(inFlight)return inFlight;
    clearTimeout(timer);state.syncing=true;announce();const currentGeneration=generation,id=state.student.id;
    inFlight=(async()=>{
      try{
        do{
          pending=false;
          const payload=window.StudyState.safeState(source||localFor(id));source=null;
          const result=await request({method:"POST",body:JSON.stringify({action:"sync",studentId:id,data:payload})});
          if(generation!==currentGeneration||state.student?.id!==id)return;
          apply(result.data);state.lastSync=new Date().toISOString();state.error="";
        }while(pending);
      }catch(error){state.error=error.message;if(error.status===409||error.status===401){generation++;state.signedIn=false;state.student=null;try{restoreGuest()}catch(localError){state.error=localError.message}}}
      finally{state.syncing=false;inFlight=null;announce()}
    })();return inFlight;
  }
  function changed(){if(!state.signedIn)return;pending=true;if(!state.syncing){clearTimeout(timer);timer=setTimeout(()=>sync(),700)}}
  async function start(){
    const currentGeneration=generation;
    try{const result=await request();if(generation!==currentGeneration)return;state.signedIn=result.signedIn;state.student=result.student||null;if(result.signedIn)await sync(localFor(result.student.id));else restoreGuest()}
    catch(error){state.error=error.message}finally{state.ready=true;announce()}
  }
  async function register(info){if(inFlight)await inFlight;generation++;const result=await request({method:"POST",body:JSON.stringify({action:"register",...info})});const local=localFor(result.student.id);state.signedIn=true;state.student=result.student;await sync(local);announce();return result}
  async function login(info){if(inFlight)await inFlight;generation++;const result=await request({method:"POST",body:JSON.stringify({action:"login",...info})});const local=localFor(result.student.id);state.signedIn=true;state.student=result.student;await sync(local);announce();return result}
  async function logout(){
    await sync();if(!state.signedIn)return;const previousState={...state},closingGeneration=++generation;clearTimeout(timer);pending=false;state={signedIn:false,student:null,ready:true,syncing:false};
    try{await request({method:"POST",body:JSON.stringify({action:"logout"})})}
    catch(error){if(generation===closingGeneration){state=previousState;announce()}throw error}
    if(generation!==closingGeneration)return;
    try{restoreGuest()}catch(error){state.error=error.message;announce();throw error}
    announce();window.dispatchEvent(new CustomEvent("student-sync-applied"));window.dispatchEvent(new CustomEvent("wrong-notes-change"));
  }
  window.addEventListener("storage",event=>{if(Object.values(KEYS).includes(event.key)){changed();window.dispatchEvent(new CustomEvent("student-sync-applied"));window.dispatchEvent(new CustomEvent("wrong-notes-change"))}});
  window.StudentSync={start,sync,changed,register,login,logout,canUseLocal,getState:()=>({...state})};start();
})();
