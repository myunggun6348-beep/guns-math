
(function(){
  "use strict";
  const KEY="math-wrong-notes-v1",STATS_KEY="math-concept-stats-v1",DELETED_KEY="math-wrong-deletions-v1",device=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function deletions(){try{const value=JSON.parse(localStorage.getItem(DELETED_KEY)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}catch{return{}}}
  function operationTime(id){const note=read().find(row=>row.id===id);return new Date(Math.max(Date.now(),Date.parse(window.StudyState.noteStamp(note||{}))||0,Date.parse(deletions()[id])||0)+1).toISOString()}
  function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
  function persist(items){localStorage.setItem(KEY,JSON.stringify(items));window.StudentSync?.changed();window.dispatchEvent(new CustomEvent("wrong-notes-change"));return true}
  function write(items){
    try{return persist(items.slice(0,200))}catch{return false}
  }
  function statKey(data){return data.conceptId||("name:"+(data.conceptName||"기타"))}
  function readStats(){
    try{
      const value=JSON.parse(localStorage.getItem(STATS_KEY)||"{}");
      if(value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length)return value;
    }catch{}
    const migrated={};
    read().forEach(note=>{
      const key=statKey(note),correct=note.mastered?1:0,attempts=Math.max(1,note.attempts||1),wrong=Math.max(1,attempts-correct);
      const row=migrated[key]||{key,conceptId:note.conceptId||"",name:note.conceptName||"기타",subject:note.subject||"",attempts:0,correct:0,wrong:0,lastAt:note.lastWrongAt||note.createdAt||""};
      row.attempts+=wrong+correct;row.correct+=correct;row.wrong+=wrong;migrated[key]=row;
    });
    if(Object.keys(migrated).length)writeStats(migrated);
    return migrated;
  }
  function writeStats(value){try{localStorage.setItem(STATS_KEY,JSON.stringify(value));window.StudentSync?.changed();return true}catch{return false}}
  function track(data,isCorrect){
    if(!data.conceptId&&!data.conceptName)return;
    const all=readStats(),key=statKey(data),row=window.StudyState.totals(all[key]||{key,conceptId:data.conceptId||"",name:data.conceptName||"기타",subject:data.subject||"",attempts:0,correct:0,wrong:0,lastAt:""});
    row.name=data.conceptName||row.name;row.subject=data.subject||row.subject;row.conceptId=data.conceptId||row.conceptId;
    const counter=row.devices[device]||{correct:0,wrong:0};counter[isCorrect?"correct":"wrong"]++;
    if(data.source==="similar"&&Number.isInteger(data.hintsUsed)&&data.hintsUsed>=0&&data.hintsUsed<=3){
      counter.reviewAttempts=(counter.reviewAttempts||0)+1;counter.hintUsed=(counter.hintUsed||0)+(data.hintsUsed>0?1:0);counter.hintSteps=(counter.hintSteps||0)+data.hintsUsed;counter.soloCorrect=(counter.soloCorrect||0)+(isCorrect&&data.hintsUsed===0?1:0);
    }
    row.devices[device]=counter;row.lastAt=new Date().toISOString();all[key]=window.StudyState.totals(row);writeStats(all);
  }
  function stats(){
    return Object.values(readStats()).map(row=>({...row,rate:row.attempts?Math.round(row.correct/row.attempts*100):0}))
      .sort((a,b)=>a.rate-b.rate||b.attempts-a.attempts||a.name.localeCompare(b.name,"ko"));
  }
  function performance(){
    const rows=stats(),attempts=rows.reduce((n,x)=>n+x.attempts,0),correct=rows.reduce((n,x)=>n+x.correct,0);
    return{concepts:rows.length,attempts,correct,wrong:attempts-correct,rate:attempts?Math.round(correct/attempts*100):0,weakest:rows[0]||null};
  }
  function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
  function idFor(data){return hash([data.source||"",data.sourceKey||"",data.prompt||""].join("|"))}
  function solutionImage(value){const image=String(value||"");return /^data:image\/(?:png|webp|jpeg);base64,/.test(image)&&image.length<350000?image:""}
  function due(note){return !note.mastered&&(!note.nextReviewAt||Date.parse(note.nextReviewAt)<=Date.now())}
  function review(note,isCorrect,now){
    if(!isCorrect)return{reviewStage:0,nextReviewAt:"",lastReviewAt:now,mastered:false,masteredAt:"",lastWrongAt:now};
    if(note.mastered||!due(note))return{};
    const stage=Math.min(4,(Number(note.reviewStage)||0)+1),days=[1,3,7][stage-1];
    return{reviewStage:stage,lastReviewAt:now,nextReviewAt:days?new Date(Date.parse(now)+days*86400000).toISOString():"",mastered:stage===4,masteredAt:stage===4?now:""};
  }
  function record(data,isCorrect,countAttempt=true){
    const items=read(),id=idFor(data),index=items.findIndex(x=>x.id===id),now=typeof data.attemptAt==="string"&&Number.isFinite(Date.parse(data.attemptAt))?new Date(data.attemptAt).toISOString():operationTime(id);
    const attemptId=typeof data.attemptId==="string"&&/^[a-z0-9-]{1,80}$/.test(data.attemptId)?data.attemptId:"";
    if(attemptId&&index>=0&&items[index].lastAttemptId===attemptId)return true;
    if(countAttempt)track(data,isCorrect);
    if(data.attemptAt&&((index>=0&&window.StudyState.noteStamp(items[index])>=now)||(deletions()[id]||"")>=now))return true;
    if(isCorrect){
      if(index>=0){items[index]={...items[index],...review(items[index],true,now),updatedAt:now,lastAttemptId:attemptId,attempts:(items[index].attempts||0)+1};write(items)}
      return index>=0;
    }
    const note={
      id,source:data.source||"학습",sourceKey:data.sourceKey||"",sourceTitle:data.sourceTitle||data.subject||"수학",
      grade:data.grade||"",subject:data.subject||"",conceptId:data.conceptId||"",conceptName:data.conceptName||"",
      prompt:data.prompt||"",type:data.type||"text",choices:Array.isArray(data.choices)?data.choices:[],
      correctAnswer:String(data.correctAnswer??""),userAnswer:String(data.userAnswer??""),explanation:data.explanation||"",
      acceptedAnswers:Array.isArray(data.acceptedAnswers)?data.acceptedAnswers.slice(0,20).map(String):[],
      solutionImage:solutionImage(data.solutionImage),
      difficulty:["basic","standard","challenge"].includes(data.difficulty)?data.difficulty:"",hintsUsed:Number.isInteger(data.hintsUsed)&&data.hintsUsed>=0&&data.hintsUsed<=3?data.hintsUsed:0,
      subtype:typeof data.subtype==="string"?data.subtype.slice(0,40):"",
      lastAttemptId:attemptId,
      reviewHref:data.reviewHref||"",updatedAt:now,...review({},false,now),attempts:index>=0?(items[index].attempts||0)+1:1,
      createdAt:index>=0?items[index].createdAt:now
    };
    if(index>=0)items.splice(index,1);
    items.unshift(note);return write(items);
  }
  function attempt(id,isCorrect,userAnswer){
    const items=read(),index=items.findIndex(x=>x.id===id);if(index<0)return false;
    const now=operationTime(id);
    items[index]={...items[index],updatedAt:now,userAnswer:String(userAnswer??items[index].userAnswer),attempts:(items[index].attempts||0)+1,
      ...review(items[index],isCorrect,now)};
    if(!write(items))return false;
    track({...items[index],source:"retry"},isCorrect);return true;
  }
  const reasons={concept:"개념이 헷갈렸어요",reading:"조건을 잘못 읽었어요",calculation:"계산 실수였어요",time:"시간이 부족했어요",unsure:"아직 이유를 모르겠어요"};
  function setReason(id,reason){
    if(reason!==""&&!Object.hasOwn(reasons,reason))return false;
    const items=read(),index=items.findIndex(note=>note.id===id);if(index<0)return false;
    items[index]={...items[index],wrongReason:reason,updatedAt:operationTime(id)};return write(items);
  }
  function updateSolution(id,value){
    const image=solutionImage(value),items=read(),index=items.findIndex(x=>x.id===id);if(!image||index<0)return false;
    items[index]={...items[index],feedbackImage:image,feedbackAt:new Date().toISOString()};return write(items);
  }
  function removeIds(ids){const deleted=deletions();ids.forEach(id=>deleted[id]=operationTime(id));try{localStorage.setItem(DELETED_KEY,JSON.stringify(deleted))}catch{return false}return write(read().filter(note=>!ids.includes(note.id)))}
  function remove(id){return removeIds([id])}
  function clearMastered(){return removeIds(read().filter(note=>note.mastered).map(note=>note.id))}
  function count(){const items=read();return{all:items.length,active:items.filter(x=>!x.mastered).length,due:items.filter(due).length,mastered:items.filter(x=>x.mastered).length}}
  // shortcut: 보관 중인 노트의 마지막 복습만 집계하며 전체 복습 이력이 필요하면 이벤트 기록을 추가한다.
  function recentReviews(now=Date.now()){return read().filter(note=>{const at=Date.parse(note.lastReviewAt),wrongAt=Date.parse(note.lastWrongAt);return Number.isInteger(note.reviewStage)&&note.reviewStage>=1&&note.reviewStage<=4&&at>wrongAt&&at>=now-7*86400000&&at<=now+1000}).sort((a,b)=>Date.parse(b.lastReviewAt)-Date.parse(a.lastReviewAt))}
  window.WrongNotes={all:read,record,attempt,updateSolution,remove,clearMastered,count,due,idFor,stats,performance,reasons,setReason,attemptTime:operationTime,recentReviews};
})();
