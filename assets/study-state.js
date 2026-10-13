(function(root){
  "use strict";
  const object=value=>value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const count=value=>Number.isSafeInteger(value)&&value>=0?value:0;
  const stamp=value=>typeof value==="string"&&Number.isFinite(Date.parse(value))?value:"";
  const validId=value=>typeof value==="string"&&/^[a-z0-9-]{1,80}$/.test(value);
  const noteStamp=row=>[row.updatedAt,row.masteredAt,row.lastWrongAt,row.createdAt].map(stamp).sort().pop()||"";
  function newer(left,right,time){
    if(!left)return right;if(!right)return left;
    const a=time(left),b=time(right),stable=row=>JSON.stringify(Object.entries(row).sort(([x],[y])=>x.localeCompare(y)));
    return a>b?left:a<b?right:stable(left)>=stable(right)?left:right;
  }
  const fields=["correct","wrong","reviewAttempts","hintUsed","hintSteps","soloCorrect"];
  function counter(value){return Object.fromEntries(fields.map(key=>[key,count(value[key])]))}
  const maximum=(a,b)=>Object.fromEntries(fields.map(key=>[key,Math.max(a[key]||0,b[key]||0)]));
  function learningEvents(value){
    const rows=new Map();
    for(const row of Array.isArray(value)?value:[]){
      if(!row||!validId(row.id)||!validId(row.problemId)||!stamp(row.at)||!["1","2","3"].includes(row.grade)||typeof row.track!=='string'||!/^[a-z0-9-]{1,50}$/.test(row.track)||!["today","similar","retry"].includes(row.kind)||typeof row.correct!=='boolean'||!Number.isInteger(row.hints)||row.hints<0||row.hints>3)continue;
      const clean={id:row.id,problemId:row.problemId,at:new Date(row.at).toISOString(),grade:row.grade,track:row.track,kind:row.kind,correct:row.correct,hints:row.hints};
      rows.set(row.id,newer(rows.get(row.id),clean,row=>row.at));
    }
    // shortcut: 개념별 최근 50회만 보관한다. 전체 장기 이력이 필요해지면 별도 저장소로 옮긴다.
    return [...rows.values()].sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id)).slice(0,50);
  }
  function totals(row){
    // shortcut: 이전 누적 기록은 기준값으로 보존한다. 과거의 개별 풀이를 복원하려면 원본 이력이 필요하다.
    const base=row.base?counter(object(row.base)):{...counter(row),correct:Math.min(count(row.correct),count(row.attempts)),wrong:Math.max(0,count(row.attempts)-count(row.correct))};
    const devices=Object.fromEntries(Object.entries(object(row.devices)).filter(([id])=>validId(id)).map(([id,value])=>[id,counter(object(value))]));
    const result=Object.values(devices).reduce((sum,value)=>Object.fromEntries(fields.map(key=>[key,sum[key]+value[key]])),{...base});
    // 배포 전에 열어 둔 화면이 기기별 값 대신 누적값만 늘렸을 때도 새 풀이를 보존한다.
    if(row.base){const correct=Math.min(count(row.correct),count(row.attempts)),wrong=Math.max(0,count(row.attempts)-count(row.correct));base.correct+=Math.max(0,correct-result.correct);base.wrong+=Math.max(0,wrong-result.wrong);result.correct=Math.max(result.correct,correct);result.wrong=Math.max(result.wrong,wrong)}
    return{...row,...(row.learningEvents?{learningEvents:learningEvents(row.learningEvents)}:{}),base,devices,...result,attempts:result.correct+result.wrong};
  }
  function safeState(value){
    const source=object(value);
    const records=(Array.isArray(source.records)?source.records:[]).filter(row=>row&&typeof row==="object"&&stamp(row.date)&&["1","2","3"].includes(String(row.grade))&&typeof row.track==="string"&&Number.isFinite(row.correct)&&row.correct>=0&&Number.isFinite(row.total)&&row.total>0&&row.correct<=row.total);
    const notes=(Array.isArray(source.notes)?source.notes:[]).filter(row=>row&&typeof row==="object"&&validId(row.id)).map(({solutionImage,feedbackImage,...row})=>row);
    const stats=Object.fromEntries(Object.entries(object(source.stats)).filter(([,row])=>row&&typeof row==="object"&&!Array.isArray(row)).map(([key,row])=>[key,totals(row)]));
    const deletedNotes=Object.fromEntries(Object.entries(object(source.deletedNotes)).filter(([id,value])=>validId(id)&&stamp(value)));
    return{profile:source.profile&&typeof source.profile==="object"&&!Array.isArray(source.profile)?source.profile:null,pref:source.pref&&typeof source.pref==="object"&&!Array.isArray(source.pref)?source.pref:null,records,notes,stats,deletedNotes};
  }
  function merge(local,remote){
    const a=safeState(remote),b=safeState(local);
    const unique=(items,key,time)=>[...items.reduce((map,row)=>{const id=key(row);map.set(id,newer(map.get(id),row,time));return map},new Map()).values()];
    const deletedNotes=Object.assign(Object.create(null),a.deletedNotes);
    Object.entries(b.deletedNotes).forEach(([id,time])=>{deletedNotes[id]=time>deletedNotes[id]||!deletedNotes[id]?time:deletedNotes[id]});
    const notes=unique([...a.notes,...b.notes],row=>row.id,noteStamp).filter(row=>!deletedNotes[row.id]||noteStamp(row)>deletedNotes[row.id]).sort((x,y)=>noteStamp(y).localeCompare(noteStamp(x))).slice(0,200);
    const records=unique([...a.records,...b.records],row=>`${row.date}|${row.grade}|${row.track}`,row=>stamp(row.finishedAt)||row.date).sort((x,y)=>String(y.finishedAt||y.date).localeCompare(String(x.finishedAt||x.date))).slice(0,120);
    const stats=Object.fromEntries(Object.entries(a.stats));
    Object.entries(b.stats).forEach(([key,row])=>{
      const old=Object.hasOwn(stats,key)?stats[key]:null;if(!old){Object.defineProperty(stats,key,{value:row,enumerable:true,writable:true,configurable:true});return}
      const base=maximum(old.base,row.base),devices=Object.assign(Object.create(null),old.devices);
      Object.entries(row.devices).forEach(([id,value])=>{devices[id]=maximum(devices[id]||{},value)});
      stats[key]=totals({...old,...(String(row.lastAt||"")>=String(old.lastAt||"")?row:{}),...(old.learningEvents||row.learningEvents?{learningEvents:learningEvents([...(old.learningEvents||[]),...(row.learningEvents||[])])}:{}),base,devices});
    });
    const latest=(left,right)=>newer(left,right,row=>stamp(row.updatedAt));
    return{profile:latest(b.profile,a.profile),pref:latest(b.pref,a.pref),records,notes,stats,deletedNotes};
  }
  const koreaDay=at=>new Date(at+9*3600000).toISOString().slice(0,10);
  function recentReviews(value,now=Date.now()){
    const start=Date.parse(koreaDay(now)+'T00:00:00+09:00')-6*86400000,end=Math.min(now+1000,start+7*86400000-1);
    const unique=new Map(),time=note=>Math.max(...[note.updatedAt,note.lastReviewAt,note.lastWrongAt,note.createdAt].map(at=>Date.parse(at)||0));
    (Array.isArray(value)?value:[]).forEach(note=>{if(!note||!validId(note.id))return;const old=unique.get(note.id);if(!old||time(note)>=time(old))unique.set(note.id,note)});
    return [...unique.values()].filter(note=>Number.isInteger(note.reviewStage)&&note.reviewStage>=1&&note.reviewStage<=4&&Date.parse(note.lastReviewAt)>Date.parse(note.lastWrongAt)&&Date.parse(note.lastReviewAt)>=start&&Date.parse(note.lastReviewAt)<=end).sort((a,b)=>Date.parse(b.lastReviewAt)-Date.parse(a.lastReviewAt));
  }
  // shortcut: 보관 중인 노트의 마지막 확인만 집계한다. 전체 복습 시도 분석은 별도 이벤트 기록이 필요하다.
  function reviewSummary(value,now=Date.now()){
    const notes=(Array.isArray(value)?value:[]).filter(note=>note&&typeof note==='object'),recent=recentReviews(notes,now),start=Date.parse(koreaDay(now)+'T00:00:00+09:00')-6*86400000;
    const days=Array.from({length:7},(_,i)=>({date:koreaDay(start+i*86400000),confirmed:0,completed:0})),concepts=new Map();
    recent.forEach(note=>{const completed=Boolean(note.mastered&&note.reviewStage===4),day=days.find(day=>day.date===koreaDay(Date.parse(note.lastReviewAt)));day.confirmed++;if(completed)day.completed++;
      const conceptId=typeof note.conceptId==='string'?note.conceptId:'',name=typeof note.conceptName==='string'?note.conceptName.slice(0,80):'',key=conceptId||name||'other',row=concepts.get(key)||{conceptId,name:name||'수학',confirmed:0,completed:0};row.confirmed++;if(completed)row.completed++;concepts.set(key,row);
    });
    return{startDate:days[0].date,endDate:days[6].date,confirmed:recent.length,completed:recent.filter(note=>note.mastered&&note.reviewStage===4).length,due:notes.filter(note=>!note.mastered&&(!note.nextReviewAt||Date.parse(note.nextReviewAt)<=now)).length,active:notes.filter(note=>!note.mastered).length,days,concepts:[...concepts.values()].sort((a,b)=>b.confirmed-a.confirmed||a.name.localeCompare(b.name,'ko'))};
  }
  const api={safeState,merge,totals,noteStamp,recentReviews,reviewSummary,learningEvents};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.StudyState=api;
})(typeof window!=="undefined"?window:globalThis);
