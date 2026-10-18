
(function(){
  "use strict";
  const app=document.getElementById("todayApp");
  const tracks=window.TODAY_TRACKS||{};
  const concepts=window.TODAY_CONCEPTS||{};
  const params=new URLSearchParams(location.search);
  const reviewId=params.get("review"),practiceId=!reviewId&&params.get('practice'),practiceMode=Boolean(practiceId),similarMode=Boolean(reviewId||practiceId);
  const diagnosticMode=!similarMode&&params.get("diagnostic")==="1";
  const difficulties={basic:"기초",standard:"표준",challenge:"도전"};
  let difficulty=practiceMode&&Object.hasOwn(difficulties,params.get('difficulty'))?params.get('difficulty'):"standard",subtype="",hintCount=0,wrongSaved=true,dailyFocus=[];
  let saved={};try{saved=JSON.parse(localStorage.getItem("today-study-pref")||"{}")}catch{}
  let grade=["1","2","3"].includes(params.get("grade"))?params.get("grade"):(saved.grade||"1");
  let trackKey=params.get("subject")||saved.track||"common1";
  if(!tracks[trackKey]||!tracks[trackKey].grades.includes(grade))trackKey=Object.keys(tracks).find(k=>tracks[k].grades.includes(grade));
  let questions=[],index=0,correct=0,answers=[],selected=null,locked=false;
  let active=false,runOwner=null,runSlot=null,pageOwner=null,runId="",studyDate,timer;
  const owner=()=>window.StudentSync?.getState().signedIn?"student-"+window.StudentSync.getState().student.id:"guest";
  const slot=()=>practiceMode?'practice-'+grade+'-'+trackKey+'-'+practiceId:similarMode?"similar-"+reviewId:(diagnosticMode?"diagnostic-":"daily-")+grade+"-"+trackKey;

  const now=new Date(Date.now()+9*3600000);
  const today=now.toISOString().slice(0,10);
  studyDate=today;
  const dateLabel=(now.getUTCMonth()+1)+"월 "+now.getUTCDate()+"일 오늘 · 한국 시간";
  const esc=v=>String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const norm=v=>String(v).trim().toLowerCase().replace(/[−–—]/g,"-").replace(/\s+/g,"").replace(/,/g,"");
  function saveStatus(text){let el=document.getElementById("draftStatus");if(!el){el=document.createElement("p");el.id="draftStatus";el.className="today-draft-status";el.setAttribute("role","status");app.querySelector(".today-panel")?.append(el)}el.textContent=text}
  function saveDraft(previousOwner){
    clearTimeout(timer);if(!active||(owner()!==runOwner&&!(previousOwner===true&&pageOwner===runOwner)))return false;
    const saved=window.StudyDraft.save(runOwner,runSlot,{grade,trackKey,date:studyDate,runId,questions,index,answers,selected,locked,hintCount,input:document.getElementById("dailyInput")?.value||"",wrongSaved,dailyFocus,ink:window.GameScratch.snapshot()});
    saveStatus(saved?"이 기기에 풀이를 자동 저장했습니다.":"풀이를 자동 저장하지 못했습니다. 창을 닫기 전에 기기 저장 공간을 확인해 주세요.");return saved;
  }
  const scheduleSave=()=>{clearTimeout(timer);timer=setTimeout(saveDraft,150)};
  function offerResume(startButton){
    const saved=window.StudyDraft.load(owner(),slot());if(!saved||!tracks[saved.trackKey]?.grades.includes(saved.grade)||saved.questions.some(q=>!concepts[q.concept]))return;
    const box=document.createElement("section");box.className="today-resume";box.innerHTML='<h3>풀던 문제가 있어요</h3><p>'+esc(saved.date)+' · '+(saved.index+1)+' / '+saved.questions.length+'문항 · 입력 답과 필기를 이어서 볼 수 있습니다.</p><button type="button" class="today-primary" id="resumeStudy">이어서 풀기 →</button><small>같은 기기·브라우저에 저장됩니다. 새로 시작하면 이 임시 풀이가 바뀝니다.</small>';startButton.before(box);startButton.textContent="처음부터 새로 풀기";startButton.classList.add("today-secondary");
    box.querySelector("button").onclick=()=>{
      if(!window.GameScratch.restore(saved.ink)){saveStatus("저장된 필기를 읽지 못했습니다. 기존 임시 기록은 유지했습니다.");return}
      grade=saved.grade;trackKey=saved.trackKey;studyDate=saved.date;runId=saved.runId||crypto.randomUUID();questions=saved.questions;index=saved.index;answers=saved.answers;correct=answers.filter(a=>a.correct).length;dailyFocus=Array.isArray(saved.dailyFocus)?saved.dailyFocus:[];runOwner=owner();runSlot=slot();active=true;renderQuestion(saved);
    };
    if(params.get("resume")==="1"){params.delete("resume");const url=new URL(location.href);url.searchParams.delete("resume");history.replaceState(null,"",url);box.querySelector("button").click()}
  }
  function records(){
    if(window.StudentSync?.canUseLocal?.()===false)return[];
    try{return JSON.parse(localStorage.getItem("today-study-records")||"[]")}catch{return[]}
  }
  function latest(){
    return records().find(r=>r.date===today&&r.grade===grade&&r.track===trackKey);
  }
  function saveRecord(){
    if(window.StudentSync?.canUseLocal?.()===false)throw new Error('계정 기록을 분리한 뒤 저장해 주세요.');
    const list=records().filter(r=>!(r.date===studyDate&&r.grade===grade&&r.track===trackKey));
    list.unshift({date:studyDate,grade,track:trackKey,correct,total:5,questionPrompts:questions.map(q=>q.prompt),focusConcepts:dailyFocus,weakConcepts:[...new Set(answers.filter(a=>!a.correct).map(a=>a.concept))],finishedAt:new Date().toISOString()});
    localStorage.setItem("today-study-records",JSON.stringify(list.slice(0,60)));
    window.StudentSync?.changed();
  }
  function streak(){
    const dates=[...new Set(records().map(r=>r.date))].sort().reverse();
    if(!dates.length)return 0;
    let cursor=new Date(today+'T00:00:00+09:00'),count=0;
    if(dates[0]!==today)cursor.setUTCDate(cursor.getUTCDate()-1);
    for(const d of dates){
      const expected=new Date(cursor.getTime()+9*3600000).toISOString().slice(0,10);
      if(d!==expected)break;
      count++;cursor.setUTCDate(cursor.getUTCDate()-1);
    }
    return count;
  }
  function hero(){
    if(practiceMode)return '<header class="page-head g-study"><div class="page-head-text"><h1>추천 개념 1문항</h1><p>기초·표준·도전 중 원하는 난도로 개념을 확인해요. 오늘의 5문제 점수와 별도로 기록됩니다.</p></div></header>';
    if(diagnosticMode)return '<header class="page-head g-study"><div class="page-head-text"><h1>나의 학습 진단</h1><p>5문항으로 지금 공부할 개념을 찾아봅니다. 성적이나 오늘의 학습 점수에는 포함하지 않습니다.</p></div></header>';
    if(similarMode)return '<header class="page-head g-study"><div class="page-head-text"><h1>비슷한 문제로 확인하기</h1><p>복습한 개념을 다른 문제에서도 적용할 수 있는지 확인해 보세요.</p></div></header>';
    return '<header class="page-head g-study"><span class="page-head-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg></span><div class="page-head-text"><h1>오늘의 학습</h1><p>학년과 과목을 고르면 오늘 풀 5문제를 준비합니다. 결과에서 부족한 개념을 바로 복습하고 관련 기출로 이어갈 수 있습니다.</p></div><span class="page-head-meta">'+(studyDate===today?dateLabel:esc(studyDate)+' 이어서')+'</span></header>';
  }
  function updateUrl(){
    const u=new URL(location.href);u.searchParams.set("grade",grade);u.searchParams.set("subject",trackKey);history.replaceState(null,"",u);
    let previous={};try{previous=JSON.parse(localStorage.getItem("today-study-pref")||"{}")||{}}catch{}
    if(previous.grade!==grade||previous.track!==trackKey){localStorage.setItem("today-study-pref",JSON.stringify({grade,track:trackKey,updatedAt:new Date().toISOString()}));window.StudentSync?.changed()}
  }
  function setup(){
    active=false;studyDate=today;window.GameScratch.destroy();updateUrl();
    const available=Object.entries(tracks).filter(([,t])=>t.grades.includes(grade));
    const last=diagnosticMode?null:latest();
    app.innerHTML=hero()+'<section class="today-panel"><h2>오늘 공부할 과목</h2><p class="today-panel-intro">한 판은 약 5분입니다. 학습 기록이 있으면 취약 개념·복습할 개념을 최대 3문제까지 우선 구성하고, 다른 문제로 균형을 맞춥니다.</p><span class="picker-label">학년</span><div class="grade-picks">'+["1","2","3"].map(g=>'<button type="button" class="pick-button '+(g===grade?"on":"")+'" data-grade="'+g+'">고'+g+'</button>').join("")+'</div><span class="picker-label">과목</span><div class="subject-picks">'+available.map(([key,t])=>'<button type="button" class="pick-button '+(key===trackKey?"on":"")+'" data-track="'+key+'"><b>'+t.title+'</b></button>').join("")+'</div>'+(last?'<div class="today-last">오늘 이 과목에서 <b>'+last.correct+'/5</b>점을 받았습니다. 같은 세트를 다시 풀어 취약 개념을 확인할 수 있습니다.</div>':'')+'<button type="button" class="today-primary today-start" id="todayStart">'+(last?"다시 도전하기":"오늘의 5문제 시작")+'</button></section>';
    if(diagnosticMode){
      app.querySelector('h2').textContent='어느 과목부터 확인할까요?';
      app.querySelector('.today-panel-intro').textContent='약 5분 · 오지선다와 답 입력을 섞어 기본 개념을 확인합니다. 아직 배우지 않은 문제는 따로 표시하세요. 결과는 오답노트와 별도로 저장하며, 이 진단만으로 실력을 단정하지 않습니다.';
      document.getElementById('todayStart').textContent='5문항 진단 시작 →';
      const later=document.createElement('a');later.className='today-secondary';later.href='index.html';later.textContent='나중에 하기';document.getElementById('todayStart').after(later);
    }
    app.querySelectorAll("[data-grade]").forEach(btn=>btn.addEventListener("click",()=>{
      grade=btn.dataset.grade;
      const first=Object.keys(tracks).find(k=>tracks[k].grades.includes(grade));
      if(!tracks[trackKey].grades.includes(grade))trackKey=first;
      setup();
    }));
    app.querySelectorAll("[data-track]").forEach(btn=>btn.addEventListener("click",()=>{trackKey=btn.dataset.track;setup()}));
    document.getElementById("todayStart").addEventListener("click",start);
    offerResume(document.getElementById("todayStart"));
  }
  async function start(){
    const startOwner=owner();
    const button=document.getElementById("todayStart")||document.getElementById("retryToday");
    if(button){button.disabled=true;button.textContent="문항 준비 중…"}
    const base=tracks[trackKey];
    if(diagnosticMode){
      questions=window.LearningDiagnostic.select(trackKey);dailyFocus=[];index=0;correct=0;answers=[];selected=null;locked=false;
      window.GameScratch.reset();studyDate=today;runOwner=startOwner;runSlot=slot();runId=crypto.randomUUID();active=true;renderQuestion();return;
    }
    const added=await window.ProblemBank?.load({surface:"today",grade,track:trackKey})||[];
    if(owner()!==startOwner)return;
    const track={...base,questions:base.questions.concat(added)};
    const stats=window.WrongNotes.stats(),diagnostic=window.LearningDiagnostic.weak(grade,trackKey,stats);
    const picked=window.DailySelection.select({questions:track.questions,trackKey,date:today,grade,stats,diagnostic,notes:window.WrongNotes.all(),record:latest()});questions=picked.questions;dailyFocus=picked.focus;index=0;correct=0;answers=[];selected=null;locked=false;
    window.GameScratch.reset();
    studyDate=today;runOwner=startOwner;runSlot=slot();runId=crypto.randomUUID();active=true;
    renderQuestion();
  }
  function renderQuestion(resumed){
    const track=tracks[trackKey],q=questions[index],meta=concepts[q.concept];
    selected=null;locked=false;hintCount=0;wrongSaved=true;
    const answer=q.type==="choice"
      ? '<div class="daily-choices">'+q.choices.map((c,i)=>'<button type="button" class="daily-choice" data-choice="'+i+'"><b>'+(i+1)+'.</b> <span data-math>'+esc(c)+'</span></button>').join("")+'</div>'
      : '<div class="daily-answer"><label class="sr-status" for="dailyInput">답 입력</label><input id="dailyInput" class="daily-input" autocomplete="off" inputmode="text" placeholder="답을 입력하세요"><button type="button" class="today-primary" id="textSubmit">제출</button></div>';
    app.innerHTML=hero()+'<section class="today-panel"><div class="daily-top"><div class="daily-meta"><b>고'+grade+' · '+track.title+'</b><span>'+track.short+'</span></div><span class="daily-progress">'+(index+1)+' / '+questions.length+'</span></div><div class="daily-track"><div class="daily-bar" style="width:'+((index+1)/questions.length*100)+'%"></div></div><span class="daily-concept">'+meta.name+'</span><h2 class="daily-question" data-math>'+esc(q.prompt)+'</h2>'+window.GameScratch.markup()+answer+'<div id="feedbackSlot"></div><div class="daily-actions"><button type="button" class="today-primary" id="choiceSubmit" '+(q.type==="choice"?"disabled":"hidden")+'>답 제출</button></div></section>';
    window.MathView?.typeset(app);
    window.GameScratch.mount(index);
    if(diagnosticMode){const skip=document.createElement('button');skip.type='button';skip.className='today-secondary diagnostic-skip';skip.id='diagnosticSkip';skip.textContent='아직 배우지 않았어요';skip.onclick=()=>submit(true);app.querySelector('.daily-actions').append(skip)}
    if(!similarMode&&dailyFocus.length){const guide=document.createElement("p");guide.className="today-personal-guide";guide.textContent="맞춤 학습 · 집중 개념: "+dailyFocus.map(id=>concepts[id]?.name||id).join(" · ");app.querySelector(".daily-top").after(guide)}
    if(similarMode){
      app.querySelector(".daily-concept").append(" · "+difficulties[q.difficulty]+(q.subtype?" · "+q.subtype:""));
      const help=document.createElement("section");help.className="similar-hints";help.setAttribute("aria-label","단계별 힌트");
      help.innerHTML='<button type="button" class="today-secondary" id="showHint">힌트 1단계 보기</button><ol id="hintSteps" aria-live="polite"></ol>';
      app.querySelector(".daily-question").after(help);
      help.querySelector("button").onclick=()=>{if(locked||hintCount>=q.hints.length)return;const li=document.createElement("li");li.dataset.math="";li.textContent=q.hints[hintCount++];help.querySelector("ol").append(li);window.MathView?.typeset(li);const button=help.querySelector("button");button.disabled=hintCount===q.hints.length;button.textContent=button.disabled?"힌트를 모두 확인했어요":"힌트 "+(hintCount+1)+"단계 보기";saveDraft()};
    }
    if(q.type==="choice"){
      app.querySelectorAll(".daily-choice").forEach(btn=>btn.addEventListener("click",()=>{
        if(locked)return;selected=Number(btn.dataset.choice);
        app.querySelectorAll(".daily-choice").forEach(x=>x.classList.toggle("on",x===btn));
        document.getElementById("choiceSubmit").disabled=false;saveDraft();
      }));
      document.getElementById("choiceSubmit").addEventListener("click",submit);
    }else{
      const input=document.getElementById("dailyInput");
      document.getElementById("textSubmit").addEventListener("click",submit);
      input.addEventListener("keydown",e=>{if(e.key==="Enter")submit()});input.focus();
      input.addEventListener("input",scheduleSave);
    }
    if(resumed){
      selected=resumed.selected;hintCount=resumed.hintCount;wrongSaved=resumed.wrongSaved!==false;
      const input=document.getElementById("dailyInput");if(input)input.value=resumed.input;
      if(selected!==null){app.querySelectorAll(".daily-choice").forEach((button,i)=>button.classList.toggle("on",i===selected));document.getElementById("choiceSubmit").disabled=false}
      if(similarMode){const steps=document.getElementById("hintSteps");questions[index].hints.slice(0,hintCount).forEach(text=>{const li=document.createElement("li");li.dataset.math="";li.textContent=text;steps.append(li)});window.MathView?.typeset(steps);const button=document.getElementById("showHint");button.textContent=hintCount===3?"힌트를 모두 확인했어요":"힌트 "+(hintCount+1)+"단계 보기";button.disabled=hintCount===3}
      if(resumed.locked){locked=true;renderFeedback(answers[index].correct)}
    }
    saveDraft();
  }
  function submit(skip){
    if(locked)return;
    const q=questions[index];let isCorrect=false,userAnswer="";
    const skipped=diagnosticMode&&skip===true;
    if(skipped)userAnswer='아직 배우지 않음';
    else if(q.type==="choice"){if(selected===null)return;isCorrect=selected===q.answer;userAnswer=q.choices[selected]}
    else{
      const input=document.getElementById("dailyInput");if(!input.value.trim()){input.focus();return}
      userAnswer=input.value;isCorrect=q.answers.some(a=>norm(a)===norm(userAnswer));
    }
    locked=true;if(isCorrect)correct++;answers.push({concept:q.concept,correct:isCorrect,userAnswer,skipped,hintsUsed:hintCount,noteSaved:diagnosticMode||isCorrect,attemptAt:window.WrongNotes.attemptTime(window.WrongNotes.idFor({source:similarMode?"similar":"today",sourceKey:trackKey,prompt:q.prompt}))});wrongSaved=diagnosticMode;
    // shortcut: 채점 상태를 먼저 저장해 재접속 중복 집계를 막는다. 강제 종료의 원자성까지 필요하면 저장소를 통합한다.
    if(!saveDraft()){locked=false;if(isCorrect)correct--;answers.pop();return}
    if(!diagnosticMode){const recorded=window.WrongNotes?.record(answerData(index,isCorrect),isCorrect);
    if(!isCorrect){wrongSaved=recorded===true;answers[index].noteSaved=wrongSaved}}
    renderFeedback(isCorrect);saveDraft();
  }
  function answerData(position,isCorrect){
    const q=questions[position],meta=concepts[q.concept],track=tracks[trackKey],answer=answers[position];
    return{source:similarMode?"similar":"today",sourceKey:trackKey,sourceTitle:(practiceMode?'추천 개념 학습 · ':similarMode?"비슷한 문제 확인 · ":"오늘의 학습 · ")+track.title,grade,subject:track.title,conceptId:q.concept,conceptName:meta.name,prompt:q.prompt,type:q.type,subtype:q.subtype||"",difficulty:similarMode?q.difficulty:"",hintsUsed:answer.hintsUsed||0,choices:q.choices||[],correctAnswer:q.type==="choice"?q.choices[q.answer]:q.answers[0],acceptedAnswers:q.type==="text"?q.answers:[],userAnswer:answer.userAnswer,attemptId:runId+"-"+position,attemptAt:answer.attemptAt,explanation:q.explanation,reviewHref:"today.html?grade="+grade+"&subject="+trackKey,solutionImage:isCorrect?"":window.GameScratch.capture(position)};
  }
  function renderFeedback(isCorrect){
    const q=questions[index];
    app.querySelectorAll(".daily-choice,.daily-input,#textSubmit,#choiceSubmit,#diagnosticSkip").forEach(el=>el.disabled=true);
    const slot=document.getElementById("feedbackSlot");
    slot.innerHTML='<div class="daily-feedback '+(isCorrect?"":"wrong")+'" role="status" data-math><strong>'+(isCorrect?"정답입니다.":"이 개념을 결과에서 다시 연결해 드릴게요.")+'</strong>'+esc(q.explanation)+'</div>';
    if(diagnosticMode&&answers[index].skipped)slot.querySelector('strong').textContent='미학습으로 표시했어요. 오답과 구분합니다.';
    window.MathView?.typeset(slot);
    if(!isCorrect&&!wrongSaved){const message=document.createElement("p");message.setAttribute("role","alert");message.textContent="오답 저장에 실패했습니다. 임시 풀이를 유지하고 완료할 때 다시 저장합니다.";slot.append(message)}
    if(similarMode){
      document.getElementById("showHint").disabled=true;
      if(hintCount){const message=document.createElement("p");message.textContent="힌트 "+hintCount+"단계의 도움을 받아 풀었어요. 다음 복습에서는 혼자 풀어 보세요.";slot.append(message)}
      if(!isCorrect&&wrongSaved){
        const id=window.WrongNotes.idFor({source:"similar",sourceKey:trackKey,prompt:q.prompt}),reason=document.createElement("label");reason.className="wrong-reason";reason.textContent="어디에서 막혔나요? (선택 사항)";
        const select=document.createElement("select");select.id="wrongReason";select.innerHTML='<option value="">나중에 기록할게요</option>'+Object.entries(window.WrongNotes.reasons).map(([key,label])=>'<option value="'+key+'">'+esc(label)+'</option>').join("");select.value=window.WrongNotes.all().find(note=>note.id===id)?.wrongReason||"";
        const message=document.createElement("span");message.setAttribute("role","status");select.onchange=()=>{const previous=window.WrongNotes.all().find(note=>note.id===id)?.wrongReason||"";const saved=window.WrongNotes.setReason(id,select.value);if(!saved)select.value=previous;message.textContent=saved?"오답 원인을 저장했습니다.":"저장하지 못했습니다. 오답노트에서 다시 기록해 주세요."};reason.append(select,message);slot.append(reason);
      }
    }
    const actions=app.querySelector(".daily-actions");
    actions.innerHTML='<button type="button" class="today-primary" id="dailyNext">'+(index===questions.length-1?"결과 확인":"다음 문제")+'</button>';
    const next=document.getElementById("dailyNext");next.addEventListener("click",()=>{index++;if(index>=questions.length)finish();else renderQuestion()});next.focus();
  }
  function finish(){
    if(diagnosticMode){
      try{window.LearningDiagnostic.save(grade,trackKey,answers)}catch{index=questions.length-1;saveStatus('진단 결과를 저장하지 못했습니다. 임시 풀이를 유지했습니다. 저장 공간과 로그인을 확인한 뒤 결과 확인을 다시 눌러 주세요.');return}
      active=false;clearTimeout(timer);window.StudyDraft.remove(runOwner,runSlot);window.GameScratch.destroy();diagnosticResult();return;
    }
    for(let i=0;i<answers.length;i++){if(!answers[i].correct&&!answers[i].noteSaved){if(!window.WrongNotes.record(answerData(i,false),false,false)){index=questions.length-1;saveDraft();saveStatus("오답 풀이를 저장하지 못했습니다. 임시 기록을 유지했습니다. 저장 공간을 확인하고 결과 확인을 다시 눌러 주세요.");return}answers[i].noteSaved=true}}
    if(!similarMode){try{saveRecord()}catch{index=questions.length-1;saveStatus("학습 결과를 저장하지 못했습니다. 저장 공간을 확인하고 결과 확인을 다시 눌러 주세요.");return}}
      if(similarMode&&!answers[0].correct)wrongSaved=answers[0].noteSaved;
      active=false;clearTimeout(timer);window.StudyDraft.remove(runOwner,runSlot);
    if(similarMode){window.GameScratch.destroy();app.innerHTML=hero()+'<section class="today-panel"><h2>'+(correct?(hintCount?'힌트의 도움으로 개념을 적용했어요.':'다른 문제에서도 개념을 적용했어요.'):'이 개념을 조금 더 확인해 봅시다.')+'</h2><p>이번 결과는 개념 학습 기록에 반영했습니다.'+(correct?'':wrongSaved?' 틀린 문제는 오답노트에 저장했습니다.':' 오답 저장에 실패했습니다. 기기 저장 공간을 확인해 주세요.')+(practiceMode?'':' 원래 문제의 복습 일정은 유지됩니다.')+'</p>'+nextStudyView()+'<a class="today-primary" href="'+(practiceMode?'index.html':'wrong-notes.html')+'">'+(practiceMode?'내 학습 홈으로':'오답노트로 돌아가기')+' →</a></section>';return}
    window.GameScratch.destroy();
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
    app.querySelector('.concept-results').before(nextStudyElement());
  }
  function diagnosticResult(){
    const ids=[...new Set(answers.map(a=>a.concept))],skipped=answers.filter(a=>a.skipped).length;
    const summary=ids.map(id=>{const rows=answers.filter(a=>a.concept===id),wrong=rows.filter(a=>!a.correct&&!a.skipped).length,unlearned=rows.filter(a=>a.skipped).length;return '<article class="weak-card"><h3>'+esc(concepts[id].name)+'</h3><p>정답 '+rows.filter(a=>a.correct).length+' · 다시 확인 '+wrong+' · 미학습 '+unlearned+'</p><p>'+esc(concepts[id].about)+'</p><div class="weak-actions"><a href="map.html?grade='+grade+'&n='+encodeURIComponent(id)+'">개념 살펴보기 →</a><a href="past-practice.html?grade='+grade+'&concept='+encodeURIComponent(id)+'">관련 기출 연습 →</a></div></article>'}).join('');
    app.innerHTML=hero()+'<section class="today-panel"><span class="daily-concept">진단 완료</span><h2>다음 공부를 준비했어요</h2><p class="result-lead">정답 '+correct+'문항 · 다시 확인 '+(answers.length-correct-skipped)+'문항 · 미학습 '+skipped+'문항.</p><p>다시 확인할 개념을 오늘의 맞춤 문제에 반영해요. 미학습은 취약 개념으로 분류하지 않습니다. 5문항의 결과는 다음 공부를 정하는 참고자료로 활용하세요.</p><div class="weak-list">'+summary+'</div><p role="status">진단 결과를 저장했어요. 계정 메뉴에서 동기화 상태를 확인할 수 있습니다.</p><div class="result-actions"><a class="today-primary" href="today.html?grade='+grade+'&subject='+encodeURIComponent(trackKey)+'">맞춤 5문제 풀기 →</a><a class="today-secondary" href="index.html">내 학습 홈으로</a></div></section>';
    app.querySelector('.result-actions').before(nextStudyElement());window.scrollTo(0,0);
  }
  function nextStudyView(){
    const journey=window.StudyJourney.get(grade,trackKey),progress=window.StudyJourney.view(journey);
    return progress+(journey?'<details class="journey-extra"><summary>더 공부하고 싶다면</summary>'+recommendationView()+'</details>':recommendationView());
  }
  function recommendationView(){
    const next=window.LearningDiagnostic.recommendation(grade,trackKey);if(!next)return '';
    return '<section class="learning-next"><h3>다음 추천 학습 · '+esc(next.name)+'</h3><p>'+esc(next.reason)+'</p><div class="result-actions"><a class="today-primary" href="'+esc(next.review?'wrong-notes.html?view=due':next.unlearned?next.mapHref:next.practiceHref)+'">'+(next.review?'오답 먼저 복습하기':next.unlearned?'개념부터 살펴보기':difficulties[next.level]+' 1문항 풀기')+' →</a><a class="today-secondary" href="'+esc(next.review||next.unlearned?next.practiceHref:next.mapHref)+'">'+(next.review?'복습 후 기초 1문항':next.unlearned?'배웠다면 기초 1문항':'개념 지도 보기')+' →</a></div></section>';
  }
  function nextStudyElement(){const section=document.createElement('div');section.innerHTML=nextStudyView();return section}
  function setupPractice(){
    if(!concepts[practiceId]||!tracks[trackKey].questions.some(q=>q.concept===practiceId)){app.innerHTML=hero()+'<section class="today-panel"><h2>이 학년·과목에 연결할 개념을 확인해 주세요.</h2><a class="today-primary" href="index.html">홈으로 →</a></section>';return}
    const stats=window.WrongNotes.stats().find(row=>(row.conceptId||row.key)===practiceId),attempts=(stats?.learningEvents||[]).filter(e=>e.grade===grade&&e.track===trackKey&&e.kind!=='retry').length;
    setupSimilar({grade,sourceKey:trackKey,subject:tracks[trackKey].title,conceptId:practiceId,prompt:'',attempts});
  }
  function setupSimilar(note){
    const available=Object.keys(difficulties).filter(level=>window.similarQuestion(note,level));
    if(!available.includes(difficulty))difficulty=available.includes("standard")?"standard":available[0];
    if(!difficulty){app.innerHTML=hero()+'<section class="today-panel"><h2>이 기록에 연결할 다른 문제를 준비하고 있습니다.</h2><a class="today-primary" href="wrong-notes.html">오답노트로 돌아가기 →</a></section>';return}
    const types=window.similarTypes(note,difficulty);if(!types.includes(subtype))subtype="";
    app.innerHTML=hero()+'<section class="today-panel"><h2>확인 문제 난도를 골라 주세요</h2><p>같은 학년의 '+esc(concepts[note.conceptId].name)+' 문제를 1개 풉니다.</p><div class="subject-picks" role="group" aria-label="확인 문제 난도">'+Object.entries(difficulties).map(([level,label])=>'<button type="button" class="pick-button '+(difficulty===level?"on":"")+'" data-difficulty="'+level+'" aria-pressed="'+(difficulty===level)+'" '+(!available.includes(level)?'disabled':'')+'>'+label+(!available.includes(level)?' · 준비 중':'')+'</button>').join("")+'</div><p class="today-panel-intro">기초: 기본 개념·공식 확인<br>표준: 식을 세우고 계산하기<br>도전: 조건 해석과 여러 단계 연결</p><p>원래 문제는 제외합니다. 선택한 난도에 다른 문제가 없으면 준비 중으로 표시합니다.</p><button type="button" class="today-primary" id="similarStart">이 난도로 풀기 →</button></section>';
    if(practiceMode){const panel=app.querySelector('.today-panel');panel.querySelector('h2').textContent='추천 개념을 확인해요';panel.querySelector('.today-panel-intro').nextElementSibling.textContent='학습 기록을 참고해 추천한 난도입니다. 다른 난도와 세부 유형도 선택할 수 있어요.';const link=document.createElement('a');link.className='today-secondary';link.href='map.html?grade='+grade+'&n='+encodeURIComponent(practiceId);link.textContent='이 개념 먼저 살펴보기 →';panel.querySelector('.today-panel-intro').after(link)}
    app.querySelectorAll("[data-difficulty]").forEach(button=>button.onclick=()=>{difficulty=button.dataset.difficulty;setupSimilar(note)});
    const label=document.createElement("label");label.className="wrong-reason";label.textContent="세부 유형";const select=document.createElement("select");select.id="similarSubtype";select.innerHTML='<option value="">추천 · 원래 유형 우선</option>'+types.map(type=>'<option value="'+esc(type)+'">'+esc(type)+'</option>').join("");select.value=subtype;select.onchange=()=>{subtype=select.value};label.append(select);document.getElementById("similarStart").before(label);
    document.getElementById("similarStart").onclick=()=>{const match=window.similarQuestion(note,difficulty,subtype);grade=String(note.grade);trackKey=match.key;questions=[match.question];index=0;correct=0;answers=[];window.GameScratch.reset();studyDate=today;runOwner=owner();runSlot=slot();runId=crypto.randomUUID();active=true;renderQuestion()};
    offerResume(document.getElementById("similarStart"));
  }
  function initialize(){
    if(window.StudentSync&&!window.StudentSync.getState().ready)return;
    if(pageOwner===owner())return;if(active)saveDraft(true);pageOwner=owner();active=false;clearTimeout(timer);window.GameScratch.reset();questions=[];
    let pref={};try{pref=JSON.parse(localStorage.getItem("today-study-pref")||"{}")||{}}catch{}
    grade=["1","2","3"].includes(params.get("grade"))?params.get("grade"):(pref.grade||"1");
    trackKey=params.get("subject")||pref.track||"common1";
    if(!tracks[trackKey]||!tracks[trackKey].grades.includes(grade))trackKey=Object.keys(tracks).find(key=>tracks[key].grades.includes(grade));
    window.StudyJourney.get(grade,trackKey);
    if(practiceMode){setupPractice();return}
    if(similarMode){
      setupSimilar(window.WrongNotes.all().find(row=>row.id===reviewId));return;
    }
    if(diagnosticMode&&(!window.StudentSync?.getState().signedIn||window.StudentSync.canUseLocal()===false)){app.innerHTML=hero()+'<section class="today-panel"><h2>내 계정에 진단 결과를 저장해요</h2><p>로그인한 뒤 진단을 시작해 주세요.</p><button type="button" class="today-primary" id="diagnosticLogin">로그인</button><a class="today-secondary" href="index.html">홈으로</a></section>';document.getElementById('diagnosticLogin').onclick=()=>window.StudentAccountUI.열기('login');return}
    setup();
  }
  window.addEventListener("student-account-change",initialize);initialize();
  window.addEventListener("game-scratch-change",saveDraft);window.addEventListener("pagehide",saveDraft);document.addEventListener("visibilitychange",()=>{if(document.hidden)saveDraft()});
})();
