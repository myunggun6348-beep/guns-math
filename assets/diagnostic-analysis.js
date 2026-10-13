(function(root,factory){
  if(typeof module!=="undefined"&&module.exports)module.exports=factory(require('./today-data'),require('./study-state'));
  else root.DiagnosticAnalysis=factory({TODAY_CONCEPTS:root.TODAY_CONCEPTS,TODAY_TRACKS:root.TODAY_TRACKS},root.StudyState);
})(typeof window!=="undefined"?window:globalThis,function(data,state){
  "use strict";
  const {TODAY_CONCEPTS,TODAY_TRACKS}=data,{learningEvents}=state;
function summary(profile,now=Date.now(),stats=[],notes=[]){
  const result=[];
  for(const [key,track] of Object.entries(TODAY_TRACKS)){
    const row=profile?.diagnostics?.[key],at=typeof row?.completedAt==='string'?Date.parse(row.completedAt):NaN,allowed=new Set(track.questions.map(q=>q.concept));
    if(!row||!track.grades.includes(row.grade)||!Number.isFinite(at)||at>now+1000||!Array.isArray(row.answers)||row.answers.length!==5)continue;
    if(!row.answers.every(a=>a&&allowed.has(a.concept)&&typeof a.correct==='boolean'&&typeof a.skipped==='boolean'&&!(a.correct&&a.skipped)))continue;
    const counts=rows=>({total:rows.length,correct:rows.filter(a=>a.correct).length,recheck:rows.filter(a=>!a.correct&&!a.skipped).length,unlearned:rows.filter(a=>a.skipped).length});
    const concepts=[...new Set(row.answers.map(a=>a.concept))].map(id=>{
      const events=learningEvents(stats.filter(row=>(row.conceptId||row.key)===id).flatMap(row=>Array.isArray(row.learningEvents)?row.learningEvents:[])).filter(event=>event.grade===row.grade&&event.track===key&&Date.parse(event.at)>at&&Date.parse(event.at)<=now+1000).sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
      const ordinary=events.filter(e=>e.kind!=='retry'),first=[...ordinary.reduce((map,event)=>{if(!map.has(event.problemId))map.set(event.problemId,event);return map},new Map()).values()],solo=first.filter(e=>e.hints===0),correct=solo.filter(e=>e.correct).length;
      const baseline=counts(row.answers.filter(a=>a.concept===id)),tested=baseline.total-baseline.unlearned,before=tested?Math.round(baseline.correct/tested*100):null,after=solo.length?Math.round(correct/solo.length*100):null;
      return{id,name:TODAY_CONCEPTS[id].name,...baseline,progress:{attempts:solo.length,correct,rate:after,diagnosticRate:before,change:before!==null&&after!==null?after-before:null,hinted:first.filter(e=>e.hints>0).length,retries:events.filter(e=>e.kind==='retry').length,retryCorrect:events.filter(e=>e.kind==='retry'&&e.correct).length,firstAt:events[0]?.at||'',lastAt:events.at(-1)?.at||''}};
    });
    result.push({track:key,title:track.title,grade:row.grade,completedAt:new Date(at).toISOString(),...counts(row.answers),concepts,recommendation:recommend({track:key,grade:row.grade,concepts},notes,now)});
  }
  return result.sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt));
}

  function recommend(result,notes,now){
    const choices=result.concepts.map(concept=>{
      const p=concept.progress,tested=concept.total-concept.unlearned;
      const due=notes.some(note=>note&&String(note.grade)===result.grade&&note.sourceKey===result.track&&note.conceptId===concept.id&&!note.mastered&&(!note.nextReviewAt||Date.parse(note.nextReviewAt)<=now));
      let priority,level,reason,unlearned=false;
      if(due){priority=0;level='basic';reason='이 개념의 오답을 복습할 시점이에요. 오답을 다시 확인한 뒤 기초 문제를 풀어 보세요.'}
      else if(p.attempts&&p.rate<60){priority=1;level='basic';reason='진단 이후 혼자 푼 '+p.attempts+'문항 중 '+p.correct+'문항을 맞혔어요. 기초 문제로 개념을 다시 확인해요.'}
      else if(p.attempts>=3&&p.rate>=80){priority=6;level='challenge';reason='진단 이후 힌트 없이 '+p.correct+'/'+p.attempts+'문항을 맞혔어요. 여러 조건을 연결하는 문제에 도전해요.'}
      else if(p.attempts>=2&&p.rate>=80){priority=4;level='standard';reason='힌트 없이 '+p.correct+'/'+p.attempts+'문항을 맞혔어요. 표준 문제로 다른 조건에도 적용해요.'}
      else if(p.hinted){priority=2;level='basic';reason='힌트를 사용한 '+p.hinted+'문항이 있어요. 기초 문제를 혼자 풀며 확인해요.'}
      else if(concept.recheck&&p.attempts<3){priority=3;level='basic';reason='진단에서 재확인이 필요했던 개념이에요. 기초 문제부터 한 번 더 확인해요.'}
      else if(!tested&&!p.attempts){priority=5;level='basic';unlearned=true;reason='아직 배우지 않았다고 표시한 개념이에요. 설명을 먼저 보고 배운 뒤 기초 문제를 풀어 보세요.'}
      else{priority=4;level='standard';reason=p.attempts?'혼자 푼 기록을 조금 더 쌓아 볼까요? 표준 문제로 적용해 보세요.':'기본 개념을 확인했어요. 표준 문제로 다른 조건에도 적용해 보세요.'}
      const query='grade='+result.grade+'&subject='+result.track+'&practice='+concept.id+'&difficulty='+level;
      return{conceptId:concept.id,name:concept.name,level,unlearned,review:due,priority,reason,mapHref:'map.html?grade='+result.grade+'&n='+concept.id,practiceHref:'today.html?'+query,pastHref:'past-practice.html?grade='+result.grade+'&concept='+concept.id};
    });
    const selected=choices.sort((a,b)=>a.priority-b.priority)[0];if(!selected)return null;
    const {priority,...resultView}=selected;return resultView;
  }
  function weeklyPlan({grade,track,diagnostics=[],notes=[],now=Date.now()}){
    if(!Object.hasOwn(TODAY_TRACKS,track))return null;
    grade=String(grade);const course=TODAY_TRACKS[track];if(!course.grades.includes(grade)||!Number.isFinite(now))return null;
    const day=at=>new Date(at+9*3600000).toISOString().slice(0,10),start=day(now),midnight=Date.parse(start+'T00:00:00+09:00');
    const report=diagnostics.find(row=>row.grade===grade&&row.track===track),next=report?.recommendation;
    const ids=[...new Set(course.questions.map(q=>q.concept))],focus=next?.conceptId||ids[0];
    const remaining=(report?.concepts||[]).filter(c=>c.id!==focus).sort((a,b)=>Number(b.recheck>0)-Number(a.recheck>0));
    const other=remaining[0],second=other?recommend({grade,track,concepts:[other]},notes,now):null,secondId=second?.conceptId||ids.find(id=>id!==focus)||focus;
    const level=next?.level||'basic',secondLevel=second?.level||'basic',base='grade='+grade+'&subject='+track;
    const map=id=>'map.html?grade='+grade+'&n='+id,practice=(id,difficulty)=>'today.html?'+base+'&practice='+id+'&difficulty='+difficulty;
    const lesson=(kind,id,level)=>({kind,conceptId:id,level,title:TODAY_CONCEPTS[id].name+(kind==='concept'?' 개념 살펴보기':' '+({basic:'기초',standard:'표준',challenge:'도전'}[level])+' 1문항'),href:kind==='concept'?map(id):practice(id,level),minutes:kind==='concept'?4:3,description:kind==='concept'?'설명을 읽고 핵심 내용을 풀이판에 적용할 준비를 해요.':'원하는 난도를 골라 풀이판에 풀고 답을 확인해요.'});
    const activities=[report?(next?.unlearned?lesson('concept',focus,level):lesson('practice',focus,level)):{kind:'diagnostic',title:'학습 진단 5문항',href:'today.html?diagnostic=1&'+base,minutes:5,description:'어떤 개념부터 시작할지 확인해요. 아직 배우지 않은 문제는 따로 표시하세요.'},lesson('concept',focus,level),lesson('practice',focus,level),{kind:'daily',title:course.title+' 오늘의 5문제',href:'today.html?'+base,minutes:5,description:'다른 개념도 함께 풀며 균형을 맞춰요.'},lesson('concept',secondId,secondLevel),lesson('practice',secondId,secondLevel),{kind:'reflection',title:'한 주의 복습 성과 돌아보기',href:'index.html?weekly=review#homePersonal',minutes:3,description:'홈의 주간 복습 성과에서 다시 맞힌 개념과 다음에 확인할 것을 살펴봐요.'}];
    const due=notes.filter(note=>note&&String(note.grade)===grade&&note.sourceKey===track&&ids.includes(note.conceptId)&&!note.mastered&&(!note.nextReviewAt||typeof note.nextReviewAt==='string'&&Number.isFinite(Date.parse(note.nextReviewAt))));
    const days=activities.map((activity,index)=>{
      const date=day(midnight+index*86400000),reviews=due.filter(note=>{const scheduled=note.nextReviewAt?day(Date.parse(note.nextReviewAt)):start;return (scheduled<start?start:scheduled)===date});
      const reviewTarget=Math.min(2,reviews.length);
      return{date,...activity,reviewCount:reviews.length,reviewTarget,reviewConcepts:[...new Set(reviews.map(n=>TODAY_CONCEPTS[n.conceptId].name))],reviewHref:'wrong-notes.html?view=active',reviewMinutes:reviewTarget*2};
    });
    return{grade,track,title:course.title,startsOn:start,endsOn:days[6].date,reason:next?.reason||'진단 전 기본 계획입니다. 학년·과목에 맞춰 시작하고, 진단 후 추천을 반영해요.',days};
  }
  return{summary,weeklyPlan};
});
