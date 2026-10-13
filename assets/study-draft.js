(function(root){
  "use strict";
  const key=(owner,slot)=>/^(guest|student-[a-z0-9]{4,16})$/.test(owner)&&/^(daily-[123]-[a-z0-9-]{1,50}|diagnostic-[123]-[a-z0-9-]{1,50}|similar-[a-z0-9-]{1,80})$/.test(slot)?"math-study-draft-v1:"+owner+":"+slot:null;
  function valid(draft){
    if(!draft||draft.version!==1||!["1","2","3"].includes(draft.grade)||typeof draft.trackKey!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)||!Number.isFinite(Date.parse(draft.date)))return false;
    const questions=draft.questions;if(!Array.isArray(questions)||![1,5].includes(questions.length)||!Number.isInteger(draft.index)||draft.index<0||draft.index>=questions.length)return false;
    if(!questions.every(q=>q&&typeof q.prompt==="string"&&typeof q.concept==="string"&&typeof q.explanation==="string"&&(q.type==="choice"?Array.isArray(q.choices)&&q.choices.length>=2&&q.choices.every(x=>typeof x==="string")&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.choices.length:q.type==="text"&&Array.isArray(q.answers)&&q.answers.length>0&&q.answers.every(x=>typeof x==="string"))))return false;
    if(typeof draft.locked!=="boolean"||!Array.isArray(draft.answers)||draft.answers.length!==draft.index+(draft.locked?1:0)||!draft.answers.every((a,i)=>a&&a.concept===questions[i].concept&&typeof a.correct==="boolean"&&typeof a.userAnswer==="string"))return false;
    if(typeof draft.input!=="string"||!Number.isInteger(draft.hintCount)||draft.hintCount<0||draft.hintCount>3)return false;
    const q=questions[draft.index];if(draft.selected!==null&&(!Number.isInteger(draft.selected)||q.type!=="choice"||draft.selected<0||draft.selected>=q.choices.length))return false;
    if(questions.length===1&&(!Array.isArray(q.hints)||q.hints.length!==3||!q.hints.every(x=>typeof x==="string")))return false;
    return Boolean(draft.ink&&Array.isArray(draft.ink.pages));
  }
  function load(owner,slot){try{const name=key(owner,slot),raw=name&&localStorage.getItem(name);if(!raw||raw.length>2000000)return null;const draft=JSON.parse(raw);return valid(draft)?draft:null}catch{return null}}
  function save(owner,slot,draft){try{const name=key(owner,slot),value={...draft,version:1,updatedAt:new Date().toISOString()};if(!name||!valid(value))return false;const raw=JSON.stringify(value);if(raw.length>2000000)return false;localStorage.setItem(name,raw);return true}catch{return false}}
  function remove(owner,slot){try{const name=key(owner,slot);if(!name)return false;localStorage.removeItem(name);return true}catch{return false}}
  function list(owner){try{const prefix=key(owner,"daily-1-common1")?.replace("daily-1-common1","");if(!prefix)return[];const rows=[];for(let i=0;i<localStorage.length;i++){const name=localStorage.key(i);if(!name?.startsWith(prefix))continue;const slot=name.slice(prefix.length),draft=load(owner,slot);if(draft&&Number.isFinite(Date.parse(draft.updatedAt))&&(slot.startsWith("similar-")?draft.questions.length===1:(slot==="daily-"+draft.grade+"-"+draft.trackKey||slot==="diagnostic-"+draft.grade+"-"+draft.trackKey)&&draft.questions.length===5))rows.push({slot,draft})}return rows.sort((a,b)=>Date.parse(b.draft.updatedAt)-Date.parse(a.draft.updatedAt))}catch{return[]}}
  const api={load,save,remove,valid,list};if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.StudyDraft=api;
})(typeof window!=="undefined"?window:globalThis);
