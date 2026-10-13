(function(){
  "use strict";
  const key="math-home-profile-v1";
  function read(grade,track){
    if(window.StudentSync?.canUseLocal?.()===false)return null;
    try{const result=JSON.parse(localStorage.getItem(key)||"{}").diagnostics?.[track];return result?.grade===String(grade)&&Number.isFinite(Date.parse(result.completedAt))&&Array.isArray(result.answers)&&result.answers.length===5&&result.answers.every(row=>row&&window.TODAY_CONCEPTS[row.concept]&&typeof row.correct==='boolean'&&typeof row.skipped==='boolean')?result:null}catch{return null}
  }
  function select(track){
    const pool=window.SIMILAR_QUESTIONS[track].filter(q=>q.difficulty!=="challenge"),picked=[];
    const ordered=pool.filter(q=>q.difficulty==="basic").concat(pool.filter(q=>q.difficulty!=="basic"));
    const add=q=>{if(q&&!picked.some(row=>row.prompt===q.prompt))picked.push(q)};
    [...new Set(pool.map(q=>q.concept))].forEach(id=>add(ordered.find(q=>q.concept===id)));
    for(const type of ["choice","text"])if(!picked.some(q=>q.type===type))add(ordered.find(q=>q.type===type));
    for(const q of ordered){if(picked.length>=5)break;add(q)}
    return picked.slice(0,5);
  }
  function save(grade,track,answers){
    if(!window.StudentSync?.getState().signedIn||window.StudentSync.canUseLocal()===false)throw new Error("로그인한 계정에 진단 결과를 저장해 주세요.");
    const previous=JSON.parse(localStorage.getItem(key)||"null")||{},updatedAt=new Date().toISOString();
    if(!window.TODAY_TRACKS[track]?.grades.includes(String(grade))||answers.length!==5||!answers.every(row=>row&&window.TODAY_CONCEPTS[row.concept]&&typeof row.correct==='boolean'))throw new Error('진단 결과를 확인해 주세요.');
    const profile={name:window.StudentSync.getState().student.name||'',...previous,grade:String(grade),track,updatedAt,diagnostics:{...previous.diagnostics,[track]:{grade:String(grade),completedAt:updatedAt,answers:answers.map(({concept,correct,skipped})=>({concept,correct,skipped:Boolean(skipped)}))}}};
    localStorage.setItem(key,JSON.stringify(profile));window.StudentSync.changed();
    return profile.diagnostics[track];
  }
  function weak(grade,track,stats){
    const result=read(grade,track);if(!result)return[];
    return [...new Set(result.answers.filter(row=>!row.correct&&!row.skipped).map(row=>row.concept))].filter(id=>!stats.some(row=>(row.conceptId||row.key)===id&&row.attempts>0));
  }
  function recommendation(grade,track){
    if(window.StudentSync?.canUseLocal?.()===false)return null;
    try{return window.DiagnosticAnalysis.summary(JSON.parse(localStorage.getItem(key)||'null'),Date.now(),window.WrongNotes.stats(),window.WrongNotes.all()).find(row=>row.grade===String(grade)&&row.track===track)?.recommendation||null}catch{return null}
  }
  function weeklyPlan(grade,track){
    if(window.StudentSync?.canUseLocal?.()===false)return null;
    try{const diagnostics=window.DiagnosticAnalysis.summary(JSON.parse(localStorage.getItem(key)||'null'),Date.now(),window.WrongNotes.stats(),window.WrongNotes.all());return window.DiagnosticAnalysis.weeklyPlan({grade,track,diagnostics,notes:window.WrongNotes.all()})}catch{return null}
  }
  window.LearningDiagnostic={read,select,save,weak,recommendation,weeklyPlan};
})();
