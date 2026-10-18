(function(root){
  "use strict";
  const server=typeof module!=='undefined'&&module.exports,data=server?require('./today-data'):root,state=server?require('./study-state'):root.StudyState;
  const KEY='math-study-journeys-v1',levels={basic:'기초',standard:'표준',challenge:'도전'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const day=at=>new Date(at+9*3600000).toISOString().slice(0,10);
  const valid=(grade,track)=>Object.hasOwn(data.TODAY_TRACKS,track)&&data.TODAY_TRACKS[track].grades.includes(String(grade));
  function get(grade,track){
    const account=window.StudentSync?.getState();
    if(!account?.ready||!account.signedIn||window.StudentSync.canUseLocal()===false||!valid(grade,track))return null;
    grade=String(grade);const now=Date.now(),date=day(now),all=window.StudyState.mergeJourneys(read(KEY,[]),[]),notes=window.WrongNotes.all();
    let value=all.find(row=>row.date===date&&row.grade===grade&&row.track===track&&Date.parse(row.createdAt)<=now+1000);
    if(!value){
      const next=window.LearningDiagnostic?.recommendation(grade,track),conceptId=next?.conceptId||window.TODAY_TRACKS[track].questions[0].concept;
      value={date,grade,track,createdAt:new Date(now).toISOString(),conceptId,level:next?.level||'basic',noteIds:notes.filter(n=>String(n.grade)===grade&&n.sourceKey===track&&window.WrongNotes.due(n)).slice(0,2).map(n=>n.id),results:[]};
    }
    if(!window.TODAY_TRACKS[track].questions.some(q=>q.concept===value.conceptId))return null;
    const inDay=at=>Number.isFinite(Date.parse(at))&&day(Date.parse(at))===date&&Date.parse(at)<=now+1000;
    const events=window.WrongNotes.stats().flatMap(row=>window.StudyState.learningEvents(row.learningEvents).map(event=>({...event,conceptId:row.conceptId||row.key}))).filter(e=>e.grade===grade&&e.track===track&&inDay(e.at)).sort((a,b)=>a.at.localeCompare(b.at));
    const results=value.results.filter(r=>inDay(r.at)),records=read('today-study-records',[]);
    const daily=(Array.isArray(records)?records:[]).find(row=>row.grade===grade&&row.track===track&&row.date===date&&row.total===5&&inDay(row.finishedAt));
    if(daily)results.push({id:'daily',at:daily.finishedAt,correct:daily.correct,total:5,hints:0,weakConcepts:daily.weakConcepts||[]});
    const practice=events.find(e=>e.kind==='similar'&&e.conceptId===value.conceptId);
    if(practice)results.push({id:'practice-'+value.conceptId,at:practice.at,correct:practice.correct?1:0,total:1,hints:practice.hints,weakConcepts:practice.correct?[]:[value.conceptId]});
    for(const id of value.noteIds){
      const note=notes.find(n=>n.id===id),attempt=note&&events.find(e=>e.kind==='retry'&&e.problemId===window.WrongNotes.problemId(note));
      if(attempt)results.push({id:'review-'+id,at:attempt.at,correct:attempt.correct?1:0,total:1,hints:0,weakConcepts:attempt.correct?[]:[note.conceptId]});
    }
    value=window.StudyState.mergeJourneys([{...value,results}],[])[0];
    if(!value)return null;
    const merged=window.StudyState.mergeJourneys(all,[value]);let saved=true;
    try{if(JSON.stringify(merged)!==localStorage.getItem(KEY)){localStorage.setItem(KEY,JSON.stringify(merged));window.StudentSync.changed()}}catch{saved=false}
    return{...summarize(value,notes,now),saved};
  }
  function summarize(value,notes,now=Date.now()){
    value=state.mergeJourneys([value],[])[0];
    if(!value||value.date!==day(now)||Date.parse(value.createdAt)>now+1000||!valid(value.grade,value.track)||!data.TODAY_TRACKS[value.track].questions.some(q=>q.concept===value.conceptId))return null;
    value={...value,results:value.results.filter(r=>Date.parse(r.at)<=now+1000)};
    notes=(Array.isArray(notes)?notes:[]).filter(n=>n&&typeof n==='object');
    const {grade,track}=value,query='grade='+grade+'&subject='+encodeURIComponent(track),result=id=>value.results.find(row=>row.id===id),tasks=[];
    if(value.noteIds.length){
      const removed=value.noteIds.filter(id=>!notes.some(n=>n.id===id)&&!result('review-'+id)),attempted=value.noteIds.map(id=>result('review-'+id)).filter(Boolean);
      tasks.push({id:'review',title:'오답 '+value.noteIds.length+'문제 다시 풀기',minutes:value.noteIds.length*2,href:'wrong-notes.html?journey=1&'+query,done:attempted.length+removed.length===value.noteIds.length,excluded:removed.length,detail:attempted.length+' / '+value.noteIds.length+'문제 제출'+(attempted.length?' · 정답 '+attempted.reduce((sum,r)=>sum+r.correct,0)+'/'+attempted.length:'')+(removed.length?' · 목록에 없는 '+removed.length+'문제 제외':''),results:attempted});
    }
    const dailyResult=result('daily'),practiceResult=result('practice-'+value.conceptId);
    tasks.push({id:'daily',title:'오늘의 맞춤 5문제',minutes:5,href:'today.html?'+query,done:Boolean(dailyResult),detail:dailyResult?'제출 완료 · 정답 '+dailyResult.correct+'/5':'핵심 개념을 골고루 확인해요.',results:dailyResult?[dailyResult]:[]});
    tasks.push({id:'practice',title:data.TODAY_CONCEPTS[value.conceptId].name+' 확인 1문항',minutes:2,href:'today.html?practice='+encodeURIComponent(value.conceptId)+'&difficulty='+value.level+'&'+query,done:Boolean(practiceResult),detail:practiceResult?'제출 완료 · '+(practiceResult.correct?'정답':'다시 확인')+(practiceResult.hints?' · 힌트 '+practiceResult.hints+'단계 사용':'') :levels[value.level]+' · 개념이 낯설면 문제 화면의 개념 지도를 살펴보세요.',results:practiceResult?[practiceResult]:[]});
    const completed=tasks.filter(t=>t.done).length,weakConcepts=[...new Set(value.results.flatMap(r=>r.weakConcepts))].filter(id=>data.TODAY_TRACKS[track].questions.some(q=>q.concept===id)),upcoming=notes.filter(n=>String(n.grade)===grade&&n.sourceKey===track&&!n.mastered&&Date.parse(n.nextReviewAt)>now).sort((a,b)=>Date.parse(a.nextReviewAt)-Date.parse(b.nextReviewAt))[0];
    return{...value,tasks,completed,excluded:tasks.reduce((sum,t)=>sum+(t.excluded||0),0),done:completed===tasks.length,next:tasks.find(t=>!t.done),remainingMinutes:tasks.filter(t=>!t.done).reduce((sum,t)=>sum+t.minutes,0),weakConcepts,nextReview:upcoming?day(Date.parse(upcoming.nextReviewAt)):null};
  }
  function teacherSummary(values,notes,now=Date.now()){
    return state.mergeJourneys(values,[]).map(row=>summarize(row,notes,now)).filter(Boolean).map(row=>({
      date:row.date,grade:row.grade,track:row.track,title:data.TODAY_TRACKS[row.track].title,completed:row.completed,total:row.tasks.length,done:row.done,excluded:row.excluded,
      lastAt:row.results.map(r=>r.at).sort().pop()||'',weakConcepts:row.weakConcepts.map(id=>({id,name:data.TODAY_CONCEPTS[id].name})),nextReview:row.nextReview,
      tasks:row.tasks.map(task=>({kind:task.id,title:task.title,minutes:task.minutes,done:task.done,detail:task.detail,submitted:task.results.length,correct:task.results.reduce((sum,r)=>sum+r.correct,0),questions:task.results.reduce((sum,r)=>sum+r.total,0),hints:task.results.reduce((sum,r)=>sum+r.hints,0),excluded:task.excluded||0,lastAt:task.results.map(r=>r.at).sort().pop()||''}))
    }));
  }
  function view(value,home=false){
    if(!value)return '';
    const title=value.done?'오늘 할 공부를 마쳤어요':'오늘의 학습',next=value.next;
    return '<section class="study-journey'+(value.done?' is-complete':'')+'" aria-label="오늘의 학습 진행"><div class="journey-head"><h3>'+title+'</h3><span>'+value.completed+' / '+value.tasks.length+'활동 완료</span></div><p class="journey-lead">'+(value.done?(value.excluded?'목록에 없는 문제를 제외하고 오늘의 활동을 마쳤어요.':'오늘 정한 활동을 모두 제출했어요. 틀린 문제는 다음 복습에서 다시 확인해요.'):'남은 학습 약 '+value.remainingMinutes+'분 · 풀이 속도에 따라 달라요.')+'</p><progress max="'+value.tasks.length+'" value="'+value.completed+'" aria-label="오늘 완료한 학습 활동"></progress><ol>'+value.tasks.map(task=>'<li class="'+(task.done?'done':'')+'"><span class="journey-mark" aria-hidden="true">'+(task.done?'✓':'○')+'</span><div><b>'+esc(task.title)+'</b><small>'+esc(task.detail)+'</small></div><span class="journey-task-state">'+(task.done?'마침':'약 '+task.minutes+'분')+'</span></li>').join('')+'</ol>'+(value.done?'<p class="journey-reflection">'+(value.weakConcepts.length?'다시 확인할 개념: '+value.weakConcepts.map(id=>esc(window.TODAY_CONCEPTS[id].name)).join(' · '):'오늘 제출한 문제에서 확인한 개념을 다음 학습에서도 적용해 보세요.')+(value.nextReview?'<br>다음 예정 복습 · '+esc(value.nextReview):'')+'</p>':'')+(!home?'<div class="journey-actions">'+(next?'<a class="today-primary" href="'+esc(next.href)+'">다음 활동 · '+esc(next.title)+' →</a>':'')+'<a class="today-secondary" href="index.html#homePersonal">'+(value.done?'오늘 학습 마치고 홈으로':'내 학습 홈으로')+'</a></div>':'')+'<small class="journey-note">'+(value.saved?'제출한 활동을 완료로 표시하며, 정답 여부와 구분합니다. 완료 기록은 계정에 동기화됩니다.':'진행 상황을 기기에 저장하지 못했습니다. 창을 닫기 전에 저장 공간을 확인해 주세요.')+'</small></section>';
  }
  const api={get,view,summarize,teacherSummary};if(server)module.exports=api;else root.StudyJourney=api;
})(typeof window!=='undefined'?window:globalThis);
