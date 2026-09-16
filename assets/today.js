
(function(){
  "use strict";
  const app=document.getElementById("todayApp");
  const tracks=window.TODAY_TRACKS||{};
  const concepts=window.TODAY_CONCEPTS||{};
  const params=new URLSearchParams(location.search);
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
  function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function random(seed){return function(){seed+=0x6D2B79F5;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  function shuffle(items,seedText){
    const a=items.slice(),rnd=random(hash(seedText));
    for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  }
  function selectDaily(track,key){
    const picked=[];
    const ids=[...new Set(track.questions.map(q=>q.concept))];
    ids.forEach(id=>picked.push(shuffle(track.questions.filter(q=>q.concept===id),today+"|"+key+"|"+id)[0]));
    const rest=shuffle(track.questions.filter(q=>!picked.includes(q)),today+"|"+key+"|rest");
    while(picked.length<5&&rest.length)picked.push(rest.shift());
    return shuffle(picked.slice(0,5),today+"|"+key+"|order");
  }
  function records(){
    try{return JSON.parse(localStorage.getItem("today-study-records")||"[]")}catch{return[]}
  }
  function latest(){
    return records().find(r=>r.date===today&&r.grade===grade&&r.track===trackKey);
  }
  function saveRecord(){
    const list=records().filter(r=>!(r.date===today&&r.grade===grade&&r.track===trackKey));
    list.unshift({date:today,grade,track:trackKey,correct,total:5,finishedAt:new Date().toISOString()});
    localStorage.setItem("today-study-records",JSON.stringify(list.slice(0,60)));
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
    return '<header class="today-hero"><span class="today-date">'+dateLabel+'</span><h1>오늘의 학습</h1><p>학년과 과목을 고르면 오늘 풀 5문제를 준비합니다. 결과에서 부족한 개념을 바로 복습하고 관련 기출로 이어갈 수 있습니다.</p></header>';
  }
  function updateUrl(){
    const u=new URL(location.href);u.searchParams.set("grade",grade);u.searchParams.set("subject",trackKey);history.replaceState(null,"",u);
    localStorage.setItem("today-study-pref",JSON.stringify({grade,track:trackKey}));
  }
  function setup(){
    updateUrl();
    const available=Object.entries(tracks).filter(([,t])=>t.grades.includes(grade));
    const last=latest();
    app.innerHTML=hero()+'<section class="today-panel"><h2>오늘 공부할 과목</h2><p class="today-panel-intro">한 판은 약 5분입니다. 선택한 과목의 주요 개념에서 문제가 고르게 나옵니다.</p><span class="picker-label">학년</span><div class="grade-picks">'+["1","2","3"].map(g=>'<button type="button" class="pick-button '+(g===grade?"on":"")+'" data-grade="'+g+'">고'+g+'</button>').join("")+'</div><span class="picker-label">과목</span><div class="subject-picks">'+available.map(([key,t])=>'<button type="button" class="pick-button '+(key===trackKey?"on":"")+'" data-track="'+key+'"><b>'+t.title+'</b></button>').join("")+'</div>'+(last?'<div class="today-last">오늘 이 과목에서 <b>'+last.correct+'/5</b>점을 받았습니다. 같은 세트를 다시 풀어 취약 개념을 확인할 수 있습니다.</div>':'')+'<button type="button" class="today-primary today-start" id="todayStart">'+(last?"다시 도전하기":"오늘의 5문제 시작")+'</button></section>';
    app.querySelectorAll("[data-grade]").forEach(btn=>btn.addEventListener("click",()=>{
      grade=btn.dataset.grade;
      const first=Object.keys(tracks).find(k=>tracks[k].grades.includes(grade));
      if(!tracks[trackKey].grades.includes(grade))trackKey=first;
      setup();
    }));
    app.querySelectorAll("[data-track]").forEach(btn=>btn.addEventListener("click",()=>{trackKey=btn.dataset.track;setup()}));
    document.getElementById("todayStart").addEventListener("click",start);
  }
  function start(){
    const track=tracks[trackKey];
    questions=selectDaily(track,trackKey);index=0;correct=0;answers=[];selected=null;locked=false;
    renderQuestion();
  }
  function renderQuestion(){
    const track=tracks[trackKey],q=questions[index],meta=concepts[q.concept];
    selected=null;locked=false;
    const answer=q.type==="choice"
      ? '<div class="daily-choices">'+q.choices.map((c,i)=>'<button type="button" class="daily-choice" data-choice="'+i+'"><b>'+(i+1)+'.</b> '+esc(c)+'</button>').join("")+'</div>'
      : '<div class="daily-answer"><label class="sr-status" for="dailyInput">답 입력</label><input id="dailyInput" class="daily-input" autocomplete="off" inputmode="text" placeholder="답을 입력하세요"><button type="button" class="today-primary" id="textSubmit">제출</button></div>';
    app.innerHTML=hero()+'<section class="today-panel"><div class="daily-top"><div class="daily-meta"><b>고'+grade+' · '+track.title+'</b><span>'+track.short+'</span></div><span class="daily-progress">'+(index+1)+' / 5</span></div><div class="daily-track"><div class="daily-bar" style="width:'+((index+1)*20)+'%"></div></div><span class="daily-concept">'+meta.name+'</span><h2 class="daily-question">'+q.prompt+'</h2>'+answer+'<div id="feedbackSlot"></div><div class="daily-actions"><button type="button" class="today-primary" id="choiceSubmit" '+(q.type==="choice"?"disabled":"hidden")+'>답 제출</button></div></section>';
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
    window.WrongNotes?.record({source:"today",sourceKey:trackKey,sourceTitle:"오늘의 학습 · "+track.title,grade,subject:track.title,conceptId:q.concept,conceptName:meta.name,prompt:q.prompt,type:q.type,choices:q.choices||[],correctAnswer:q.type==="choice"?q.choices[q.answer]:q.answers[0],userAnswer,explanation:q.explanation,reviewHref:"today.html?grade="+grade+"&subject="+trackKey},isCorrect);
    answers.push({concept:q.concept,correct:isCorrect});
    app.querySelectorAll(".daily-choice,.daily-input,#textSubmit,#choiceSubmit").forEach(el=>el.disabled=true);
    const slot=document.getElementById("feedbackSlot");
    slot.innerHTML='<div class="daily-feedback '+(isCorrect?"":"wrong")+'" role="status"><strong>'+(isCorrect?"정답입니다.":"이 개념을 결과에서 다시 연결해 드릴게요.")+'</strong>'+q.explanation+'</div>';
    const actions=app.querySelector(".daily-actions");
    actions.innerHTML='<button type="button" class="today-primary" id="dailyNext">'+(index===4?"결과 확인":"다음 문제")+'</button>';
    const next=document.getElementById("dailyNext");next.addEventListener("click",()=>{index++;if(index>=5)finish();else renderQuestion()});next.focus();
  }
  function finish(){
    saveRecord();
    const track=tracks[trackKey];
    const ids=[...new Set(answers.map(a=>a.concept))];
    const stats=ids.map(id=>{
      const items=answers.filter(a=>a.concept===id);
      return {id,total:items.length,correct:items.filter(a=>a.correct).length};
    }).sort((a,b)=>(a.correct/a.total)-(b.correct/b.total));
    const weak=stats.filter(s=>s.correct<s.total);
    const summary=stats.map(s=>'<div class="concept-result"><div><b>'+concepts[s.id].name+'</b><span>'+concepts[s.id].about+'</span></div><em>'+s.correct+'/'+s.total+'</em></div>').join("");
    const weakCards=weak.map(s=>'<article class="weak-card"><h3>'+concepts[s.id].name+'</h3><p>'+concepts[s.id].about+'</p><div class="weak-actions"><a href="map.html?grade='+grade+'&n='+s.id+'">개념 지도에서 복습 →</a><a href="files.html?grade='+grade+'&q='+encodeURIComponent(concepts[s.id].name)+'">관련 기출 찾기 →</a></div></article>').join("");
    const message=correct===5?"오늘의 핵심 개념이 안정적입니다.":correct>=3?"잘 풀었습니다. 놓친 개념만 짧게 복습하면 됩니다.":"지금 확인한 취약 개념부터 하나씩 연결해 봅시다.";
    const run=streak();
    app.innerHTML=hero()+'<section class="today-panel"><span class="daily-concept">학습 완료</span><div class="result-score">'+correct+'/5</div><h2>'+message+'</h2><p class="result-lead">정답 개수보다 어떤 개념에서 막혔는지가 더 중요합니다. 아래 결과에서 바로 복습할 수 있습니다.</p>'+(run?'<span class="today-streak">연속 학습 '+run+'일</span>':'')+'<div class="concept-results">'+summary+'</div>'+(weak.length?'<h3 class="weak-title">먼저 복습할 개념</h3><div class="weak-list">'+weakCards+'</div>':'<div class="weak-card"><h3>오늘은 취약 개념이 없습니다.</h3><p>관련 기출로 난도를 높여 실력을 확인해 보세요.</p><div class="weak-actions"><a href="files.html?grade='+grade+'&q='+encodeURIComponent(track.title)+'">관련 기출 풀기 →</a></div></div>')+'<div class="result-actions"><button type="button" class="today-primary" id="retryToday">다시 풀기</button><button type="button" class="today-secondary" id="changeToday">과목 바꾸기</button><a class="today-secondary" href="wrong-notes.html">오답노트 보기</a></div></section>';
    document.getElementById("retryToday").addEventListener("click",start);
    document.getElementById("changeToday").addEventListener("click",setup);
  }
  setup();
})();
