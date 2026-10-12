
(function(){
  "use strict";
  const app=document.getElementById("todayApp");
  const tracks=window.TODAY_TRACKS||{};
  const concepts=window.TODAY_CONCEPTS||{};
  const params=new URLSearchParams(location.search);
  const reviewId=params.get("review"),similarMode=Boolean(reviewId);
  const difficulties={basic:"기초",standard:"표준",challenge:"도전"};
  let difficulty="standard",subtype="",hintCount=0,wrongSaved=true,dailyFocus=[];
  let saved={};try{saved=JSON.parse(localStorage.getItem("today-study-pref")||"{}")}catch{}
  let grade=["1","2","3"].includes(params.get("grade"))?params.get("grade"):(saved.grade||"1");
  let trackKey=params.get("subject")||saved.track||"common1";
  if(!tracks[trackKey]||!tracks[trackKey].grades.includes(grade))trackKey=Object.keys(tracks).find(k=>tracks[k].grades.includes(grade));
  let questions=[],index=0,correct=0,answers=[],selected=null,locked=false;

  const pad=n=>String(n).padStart(2,"0");
  const now=new Date();
  const today=now.getFullYear()+"-"+pad(now.getMonth()+1)+"-"+pad(now.getDate());
  const dateLabel=(now.getMonth()+1)+"월 "+now.getDate()+"일 오늘";
  const esc=v=>String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const norm=v=>String(v).trim().toLowerCase().replace(/[−–—]/g,"-").replace(/\s+/g,"").replace(/,/g,"");
  function records(){
    try{return JSON.parse(localStorage.getItem("today-study-records")||"[]")}catch{return[]}
  }
  function latest(){
    return records().find(r=>r.date===today&&r.grade===grade&&r.track===trackKey);
  }
  function saveRecord(){
    const list=records().filter(r=>!(r.date===today&&r.grade===grade&&r.track===trackKey));
    list.unshift({date:today,grade,track:trackKey,correct,total:5,questionPrompts:questions.map(q=>q.prompt),focusConcepts:dailyFocus,finishedAt:new Date().toISOString()});
    localStorage.setItem("today-study-records",JSON.stringify(list.slice(0,60)));
    window.StudentSync?.changed();
  }
  function streak(){
    const dates=[...new Set(records().map(r=>r.date))].sort().reverse();
    if(!dates.length)return 0;
    let cursor=new Date(now.getFullYear(),now.getMonth(),now.getDate()),count=0;
    if(dates[0]!==today)cursor.setDate(cursor.getDate()-1);
    for(const d of dates){
      const expected=cursor.getFullYear()+"-"+pad(cursor.getMonth()+1)+"-"+pad(cursor.getDate());
      if(d!==expected)break;
      count++;cursor.setDate(cursor.getDate()-1);
    }
    return count;
  }
  function hero(){
    if(similarMode)return '<header class="page-head g-study"><div class="page-head-text"><h1>비슷한 문제로 확인하기</h1><p>복습한 개념을 다른 문제에서도 적용할 수 있는지 확인해 보세요.</p></div></header>';
    return '<header class="page-head g-study"><span class="page-head-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg></span><div class="page-head-text"><h1>오늘의 학습</h1><p>학년과 과목을 고르면 오늘 풀 5문제를 준비합니다. 결과에서 부족한 개념을 바로 복습하고 관련 기출로 이어갈 수 있습니다.</p></div><span class="page-head-meta">'+dateLabel+'</span></header>';
  }
  function updateUrl(){
    const u=new URL(location.href);u.searchParams.set("grade",grade);u.searchParams.set("subject",trackKey);history.replaceState(null,"",u);
    let previous={};try{previous=JSON.parse(localStorage.getItem("today-study-pref")||"{}")||{}}catch{}
    if(previous.grade!==grade||previous.track!==trackKey){localStorage.setItem("today-study-pref",JSON.stringify({grade,track:trackKey,updatedAt:new Date().toISOString()}));window.StudentSync?.changed()}
  }
  function setup(){
    window.GameScratch.destroy();updateUrl();
    const available=Object.entries(tracks).filter(([,t])=>t.grades.includes(grade));
    const last=latest();
    app.innerHTML=hero()+'<section class="today-panel"><h2>오늘 공부할 과목</h2><p class="today-panel-intro">한 판은 약 5분입니다. 학습 기록이 있으면 취약 개념·복습할 개념을 최대 3문제까지 우선 구성하고, 다른 문제로 균형을 맞춥니다.</p><span class="picker-label">학년</span><div class="grade-picks">'+["1","2","3"].map(g=>'<button type="button" class="pick-button '+(g===grade?"on":"")+'" data-grade="'+g+'">고'+g+'</button>').join("")+'</div><span class="picker-label">과목</span><div class="subject-picks">'+available.map(([key,t])=>'<button type="button" class="pick-button '+(key===trackKey?"on":"")+'" data-track="'+key+'"><b>'+t.title+'</b></button>').join("")+'</div>'+(last?'<div class="today-last">오늘 이 과목에서 <b>'+last.correct+'/5</b>점을 받았습니다. 같은 세트를 다시 풀어 취약 개념을 확인할 수 있습니다.</div>':'')+'<button type="button" class="today-primary today-start" id="todayStart">'+(last?"다시 도전하기":"오늘의 5문제 시작")+'</button></section>';
    app.querySelectorAll("[data-grade]").forEach(btn=>btn.addEventListener("click",()=>{
      grade=btn.dataset.grade;
      const first=Object.keys(tracks).find(k=>tracks[k].grades.includes(grade));
      if(!tracks[trackKey].grades.includes(grade))trackKey=first;
      setup();
    }));
    app.querySelectorAll("[data-track]").forEach(btn=>btn.addEventListener("click",()=>{trackKey=btn.dataset.track;setup()}));
    document.getElementById("todayStart").addEventListener("click",start);
  }
  async function start(){
    const button=document.getElementById("todayStart")||document.getElementById("retryToday");
    if(button){button.disabled=true;button.textContent="문항 준비 중…"}
    const base=tracks[trackKey];
    const added=await window.ProblemBank?.load({surface:"today",grade,track:trackKey})||[];
    const track={...base,questions:base.questions.concat(added)};
    const picked=window.DailySelection.select({questions:track.questions,trackKey,date:today,grade,stats:window.WrongNotes.stats(),notes:window.WrongNotes.all(),record:latest()});questions=picked.questions;dailyFocus=picked.focus;index=0;correct=0;answers=[];selected=null;locked=false;
    window.GameScratch.reset();
    renderQuestion();
  }
  function renderQuestion(){
    const track=tracks[trackKey],q=questions[index],meta=concepts[q.concept];
    selected=null;locked=false;hintCount=0;wrongSaved=true;
    const answer=q.type==="choice"
      ? '<div class="daily-choices">'+q.choices.map((c,i)=>'<button type="button" class="daily-choice" data-choice="'+i+'"><b>'+(i+1)+'.</b> <span data-math>'+esc(c)+'</span></button>').join("")+'</div>'
      : '<div class="daily-answer"><label class="sr-status" for="dailyInput">답 입력</label><input id="dailyInput" class="daily-input" autocomplete="off" inputmode="text" placeholder="답을 입력하세요"><button type="button" class="today-primary" id="textSubmit">제출</button></div>';
    app.innerHTML=hero()+'<section class="today-panel"><div class="daily-top"><div class="daily-meta"><b>고'+grade+' · '+track.title+'</b><span>'+track.short+'</span></div><span class="daily-progress">'+(index+1)+' / '+questions.length+'</span></div><div class="daily-track"><div class="daily-bar" style="width:'+((index+1)/questions.length*100)+'%"></div></div><span class="daily-concept">'+meta.name+'</span><h2 class="daily-question" data-math>'+esc(q.prompt)+'</h2>'+window.GameScratch.markup()+answer+'<div id="feedbackSlot"></div><div class="daily-actions"><button type="button" class="today-primary" id="choiceSubmit" '+(q.type==="choice"?"disabled":"hidden")+'>답 제출</button></div></section>';
    window.MathView?.typeset(app);
    window.GameScratch.mount(index);
    if(!similarMode&&dailyFocus.length){const guide=document.createElement("p");guide.className="today-personal-guide";guide.textContent="맞춤 학습 · 집중 개념: "+dailyFocus.map(id=>concepts[id]?.name||id).join(" · ");app.querySelector(".daily-top").after(guide)}
    if(similarMode){
      app.querySelector(".daily-concept").append(" · "+difficulties[q.difficulty]+(q.subtype?" · "+q.subtype:""));
      const help=document.createElement("section");help.className="similar-hints";help.setAttribute("aria-label","단계별 힌트");
      help.innerHTML='<button type="button" class="today-secondary" id="showHint">힌트 1단계 보기</button><ol id="hintSteps" aria-live="polite"></ol>';
      app.querySelector(".daily-question").after(help);
      help.querySelector("button").onclick=()=>{if(locked||hintCount>=q.hints.length)return;const li=document.createElement("li");li.dataset.math="";li.textContent=q.hints[hintCount++];help.querySelector("ol").append(li);window.MathView?.typeset(li);const button=help.querySelector("button");button.disabled=hintCount===q.hints.length;button.textContent=button.disabled?"힌트를 모두 확인했어요":"힌트 "+(hintCount+1)+"단계 보기"};
    }
    if(q.type==="choice"){
      app.querySelectorAll(".daily-choice").forEach(btn=>btn.addEventListener("click",()=>{
        if(locked)return;selected=Number(btn.dataset.choice);
        app.querySelectorAll(".daily-choice").forEach(x=>x.classList.toggle("on",x===btn));
        document.getElementById("choiceSubmit").disabled=false;
      }));
      document.getElementById("choiceSubmit").addEventListener("click",submit);
    }else{
      const input=document.getElementById("dailyInput");
      document.getElementById("textSubmit").addEventListener("click",submit);
      input.addEventListener("keydown",e=>{if(e.key==="Enter")submit()});input.focus();
    }
  }
  function submit(){
    if(locked)return;
    const q=questions[index];let isCorrect=false,userAnswer="";
    if(q.type==="choice"){if(selected===null)return;isCorrect=selected===q.answer;userAnswer=q.choices[selected]}
    else{
      const input=document.getElementById("dailyInput");if(!input.value.trim()){input.focus();return}
      userAnswer=input.value;isCorrect=q.answers.some(a=>norm(a)===norm(userAnswer));
    }
    locked=true;if(isCorrect)correct++;
    const track=tracks[trackKey],meta=concepts[q.concept];
    const recorded=window.WrongNotes?.record({source:similarMode?"similar":"today",sourceKey:trackKey,sourceTitle:(similarMode?"비슷한 문제 확인 · ":"오늘의 학습 · ")+track.title,grade,subject:track.title,conceptId:q.concept,conceptName:meta.name,prompt:q.prompt,type:q.type,subtype:q.subtype||"",difficulty:similarMode?q.difficulty:"",hintsUsed:hintCount,choices:q.choices||[],correctAnswer:q.type==="choice"?q.choices[q.answer]:q.answers[0],acceptedAnswers:q.type==="text"?q.answers:[],userAnswer,explanation:q.explanation,reviewHref:"today.html?grade="+grade+"&subject="+trackKey,solutionImage:isCorrect?"":window.GameScratch.capture(index)},isCorrect);
    if(similarMode&&!isCorrect)wrongSaved=recorded===true;
    answers.push({concept:q.concept,correct:isCorrect});
    app.querySelectorAll(".daily-choice,.daily-input,#textSubmit,#choiceSubmit").forEach(el=>el.disabled=true);
    const slot=document.getElementById("feedbackSlot");
    slot.innerHTML='<div class="daily-feedback '+(isCorrect?"":"wrong")+'" role="status" data-math><strong>'+(isCorrect?"정답입니다.":"이 개념을 결과에서 다시 연결해 드릴게요.")+'</strong>'+esc(q.explanation)+'</div>';
    window.MathView?.typeset(slot);
    if(similarMode){
      document.getElementById("showHint").disabled=true;
      if(hintCount){const message=document.createElement("p");message.textContent="힌트 "+hintCount+"단계의 도움을 받아 풀었어요. 다음 복습에서는 혼자 풀어 보세요.";slot.append(message)}
      if(!isCorrect&&!wrongSaved){const message=document.createElement("p");message.setAttribute("role","alert");message.textContent="오답을 저장하지 못했습니다. 기기 저장 공간을 확인해 주세요.";slot.append(message)}
      if(!isCorrect&&wrongSaved){
        const id=window.WrongNotes.idFor({source:"similar",sourceKey:trackKey,prompt:q.prompt}),reason=document.createElement("label");reason.className="wrong-reason";reason.textContent="어디에서 막혔나요? (선택 사항)";
        const select=document.createElement("select");select.id="wrongReason";select.innerHTML='<option value="">나중에 기록할게요</option>'+Object.entries(window.WrongNotes.reasons).map(([key,label])=>'<option value="'+key+'">'+esc(label)+'</option>').join("");
        const message=document.createElement("span");message.setAttribute("role","status");select.onchange=()=>{const previous=window.WrongNotes.all().find(note=>note.id===id)?.wrongReason||"";const saved=window.WrongNotes.setReason(id,select.value);if(!saved)select.value=previous;message.textContent=saved?"오답 원인을 저장했습니다.":"저장하지 못했습니다. 오답노트에서 다시 기록해 주세요."};reason.append(select,message);slot.append(reason);
      }
    }
    const actions=app.querySelector(".daily-actions");
    actions.innerHTML='<button type="button" class="today-primary" id="dailyNext">'+(index===questions.length-1?"결과 확인":"다음 문제")+'</button>';
    const next=document.getElementById("dailyNext");next.addEventListener("click",()=>{index++;if(index>=questions.length)finish();else renderQuestion()});next.focus();
  }
  function finish(){
    if(similarMode){window.GameScratch.destroy();app.innerHTML=hero()+'<section class="today-panel"><h2>'+(correct?(hintCount?'힌트의 도움으로 개념을 적용했어요.':'다른 문제에서도 개념을 적용했어요.'):'이 개념을 조금 더 확인해 봅시다.')+'</h2><p>이번 결과는 개념 학습 기록에 반영했습니다.'+(correct?'':wrongSaved?' 틀린 문제는 오답노트에 저장했습니다.':' 오답 저장에 실패했습니다. 기기 저장 공간을 확인해 주세요.')+' 원래 문제의 복습 일정은 유지됩니다.</p><a class="today-primary" href="wrong-notes.html">오답노트로 돌아가기 →</a></section>';return}
    window.GameScratch.destroy();saveRecord();
    const track=tracks[trackKey];
    const ids=[...new Set(answers.map(a=>a.concept))];
    const stats=ids.map(id=>{
      const items=answers.filter(a=>a.concept===id);
      return {id,total:items.length,correct:items.filter(a=>a.correct).length};
    }).sort((a,b)=>(a.correct/a.total)-(b.correct/b.total));
    const weak=stats.filter(s=>s.correct<s.total);
    const summary=stats.map(s=>'<div class="concept-result"><div><b>'+concepts[s.id].name+'</b><span>'+concepts[s.id].about+'</span></div><em>'+s.correct+'/'+s.total+'</em></div>').join("");
    const weakCards=weak.map(s=>'<article class="weak-card"><h3>'+concepts[s.id].name+'</h3><p>'+concepts[s.id].about+'</p><div class="weak-actions"><a href="map.html?grade='+grade+'&n='+s.id+'">개념 지도에서 복습 →</a><a href="past-practice.html?grade='+grade+'&concept='+s.id+'">자동 선별 기출 풀기 →</a></div></article>').join("");
    const message=correct===5?"오늘의 핵심 개념이 안정적입니다.":correct>=3?"잘 풀었습니다. 놓친 개념만 짧게 복습하면 됩니다.":"지금 확인한 취약 개념부터 하나씩 연결해 봅시다.";
    const run=streak();
    app.innerHTML=hero()+'<section class="today-panel"><span class="daily-concept">학습 완료</span><div class="result-score">'+correct+'/5</div><h2>'+message+'</h2><p class="result-lead">정답 개수보다 어떤 개념에서 막혔는지가 더 중요합니다. 아래 결과에서 바로 복습할 수 있습니다.</p>'+(run?'<span class="today-streak">연속 학습 '+run+'일</span>':'')+'<div class="concept-results">'+summary+'</div>'+(weak.length?'<h3 class="weak-title">먼저 복습할 개념</h3><div class="weak-list">'+weakCards+'</div>':'<div class="weak-card"><h3>오늘은 취약 개념이 없습니다.</h3><p>관련 기출로 난도를 높여 실력을 확인해 보세요.</p><div class="weak-actions"><a href="past-practice.html?grade='+grade+'&concept='+stats[0].id+'">관련 기출 난도 높이기 →</a></div></div>')+'<div class="result-actions"><button type="button" class="today-primary" id="retryToday">다시 풀기</button><button type="button" class="today-secondary" id="changeToday">과목 바꾸기</button><a class="today-secondary" href="wrong-notes.html">오답노트 보기</a></div></section>';
    document.getElementById("retryToday").addEventListener("click",start);
    document.getElementById("changeToday").addEventListener("click",setup);
  }
  function setupSimilar(note){
    const available=Object.keys(difficulties).filter(level=>window.similarQuestion(note,level));
    if(!available.includes(difficulty))difficulty=available.includes("standard")?"standard":available[0];
    if(!difficulty){app.innerHTML=hero()+'<section class="today-panel"><h2>이 기록에 연결할 다른 문제를 준비하고 있습니다.</h2><a class="today-primary" href="wrong-notes.html">오답노트로 돌아가기 →</a></section>';return}
    const types=window.similarTypes(note,difficulty);if(!types.includes(subtype))subtype="";
    app.innerHTML=hero()+'<section class="today-panel"><h2>확인 문제 난도를 골라 주세요</h2><p>같은 학년의 '+esc(concepts[note.conceptId].name)+' 문제를 1개 풉니다.</p><div class="subject-picks" role="group" aria-label="확인 문제 난도">'+Object.entries(difficulties).map(([level,label])=>'<button type="button" class="pick-button '+(difficulty===level?"on":"")+'" data-difficulty="'+level+'" aria-pressed="'+(difficulty===level)+'" '+(!available.includes(level)?'disabled':'')+'>'+label+(!available.includes(level)?' · 준비 중':'')+'</button>').join("")+'</div><p class="today-panel-intro">기초: 기본 개념·공식 확인<br>표준: 식을 세우고 계산하기<br>도전: 조건 해석과 여러 단계 연결</p><p>원래 문제는 제외합니다. 선택한 난도에 다른 문제가 없으면 준비 중으로 표시합니다.</p><button type="button" class="today-primary" id="similarStart">이 난도로 풀기 →</button></section>';
    app.querySelectorAll("[data-difficulty]").forEach(button=>button.onclick=()=>{difficulty=button.dataset.difficulty;setupSimilar(note)});
    const label=document.createElement("label");label.className="wrong-reason";label.textContent="세부 유형";const select=document.createElement("select");select.id="similarSubtype";select.innerHTML='<option value="">추천 · 원래 유형 우선</option>'+types.map(type=>'<option value="'+esc(type)+'">'+esc(type)+'</option>').join("");select.value=subtype;select.onchange=()=>{subtype=select.value};label.append(select);document.getElementById("similarStart").before(label);
    document.getElementById("similarStart").onclick=()=>{const match=window.similarQuestion(note,difficulty,subtype);grade=String(note.grade);trackKey=match.key;questions=[match.question];index=0;correct=0;answers=[];window.GameScratch.reset();renderQuestion()};
  }
  function initialize(){
    if(window.StudentSync&&!window.StudentSync.getState().ready)return;
    let pref={};try{pref=JSON.parse(localStorage.getItem("today-study-pref")||"{}")||{}}catch{}
    grade=["1","2","3"].includes(params.get("grade"))?params.get("grade"):(pref.grade||"1");
    trackKey=params.get("subject")||pref.track||"common1";
    if(!tracks[trackKey]||!tracks[trackKey].grades.includes(grade))trackKey=Object.keys(tracks).find(key=>tracks[key].grades.includes(grade));
    window.removeEventListener("student-account-change",initialize);
    if(similarMode){
      setupSimilar(window.WrongNotes.all().find(row=>row.id===reviewId));return;
    }
    setup();
  }
  window.addEventListener("student-account-change",initialize);initialize();
})();
