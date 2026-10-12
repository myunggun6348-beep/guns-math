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
  function counter(value){return{correct:count(value.correct),wrong:count(value.wrong)}}
  function totals(row){
    // shortcut: 이전 누적 기록은 기준값으로 보존한다. 과거의 개별 풀이를 복원하려면 원본 이력이 필요하다.
    const base=row.base?counter(object(row.base)):{correct:Math.min(count(row.correct),count(row.attempts)),wrong:Math.max(0,count(row.attempts)-count(row.correct))};
    const devices=Object.fromEntries(Object.entries(object(row.devices)).filter(([id])=>validId(id)).map(([id,value])=>[id,counter(object(value))]));
    const result=Object.values(devices).reduce((sum,value)=>({correct:sum.correct+value.correct,wrong:sum.wrong+value.wrong}),{...base});
    // 배포 전에 열어 둔 화면이 기기별 값 대신 누적값만 늘렸을 때도 새 풀이를 보존한다.
    if(row.base){const correct=Math.min(count(row.correct),count(row.attempts)),wrong=Math.max(0,count(row.attempts)-count(row.correct));base.correct+=Math.max(0,correct-result.correct);base.wrong+=Math.max(0,wrong-result.wrong);result.correct=Math.max(result.correct,correct);result.wrong=Math.max(result.wrong,wrong)}
    return{...row,base,devices,...result,attempts:result.correct+result.wrong};
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
      const base={correct:Math.max(old.base.correct,row.base.correct),wrong:Math.max(old.base.wrong,row.base.wrong)},devices=Object.assign(Object.create(null),old.devices);
      Object.entries(row.devices).forEach(([id,value])=>{devices[id]={correct:Math.max(devices[id]?.correct||0,value.correct),wrong:Math.max(devices[id]?.wrong||0,value.wrong)}});
      stats[key]=totals({...old,...(String(row.lastAt||"")>=String(old.lastAt||"")?row:{}),base,devices});
    });
    const latest=(left,right)=>newer(left,right,row=>stamp(row.updatedAt));
    return{profile:latest(b.profile,a.profile),pref:latest(b.pref,a.pref),records,notes,stats,deletedNotes};
  }
  const api={safeState,merge,totals,noteStamp};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.StudyState=api;
})(typeof window!=="undefined"?window:globalThis);
