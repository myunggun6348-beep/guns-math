
(function(){
  "use strict";
  const app=document.getElementById("wrongApp"),store=window.WrongNotes;
  const params=new URLSearchParams(location.search),journeyMode=params.get('journey')==='1';
  function journey(){let pref={};try{pref=JSON.parse(localStorage.getItem('math-home-profile-v1')||'{}')||{}}catch{}return window.StudyJourney.get(params.get('grade')||pref.grade,params.get('subject')||pref.track)}
  let filter=new URLSearchParams(location.search).get("view")||"active",conceptFilter="";
  if(!["due","active","mastered","all"].includes(filter))filter="active";
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const norm=v=>String(v).trim().toLowerCase().replace(/[−–—]/g,"-").replace(/\s+/g,"").replace(/,/g,"");
  const solutionImage=v=>/^data:image\/(?:png|webp|jpeg);base64,/.test(String(v||""))?String(v):"";
  const noteKey=n=>n.conceptId||("name:"+(n.conceptName||"기타"));
  function toast(text){const el=document.getElementById("wrongToast");el.textContent=text;el.classList.add("show");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("show"),1800)}
  function dateText(value){try{return new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric"}).format(new Date(value))}catch{return""}}
  function level(rate){return rate<60?{text:"집중 복습",cls:"focus"}:rate<80?{text:"보완",cls:"review"}:{text:"안정",cls:"stable"}}
  function similarLink(note){return window.similarQuestion?.(note)?'<a class="wrong-button primary" data-similar href="today.html?review='+encodeURIComponent(note.id)+'">비슷한 문제로 확인하기 →</a>':""}
  function dashboard(){
    const rows=store.stats(),perf=store.performance();
    if(!rows.length)return '<section class="concept-dashboard empty"><div><span class="wrong-kicker">개념 진단</span><h2>개념별 학습 진단</h2><p>문제를 풀면 개념별 정답률과 취약 순위가 여기에 쌓입니다.</p></div><a class="wrong-link" href="today.html">오늘의 학습 시작 →</a></section>';
    const weakest=perf.weakest;
    const ranks=rows.map((row,i)=>{
      const state=level(row.rate);
      return '<button type="button" class="concept-rank '+(conceptFilter===row.key?"on":"")+'" data-concept="'+esc(row.key)+'"><span class="rank-number">'+(i+1)+'</span><span class="rank-main"><b>'+esc(row.name)+'</b><small>'+row.correct+'회 정답 · '+row.wrong+'회 오답 · 총 '+row.attempts+'회</small><i><span style="width:'+row.rate+'%"></span></i></span><strong>'+row.rate+'%</strong><em class="'+state.cls+'">'+state.text+'</em></button>';
    }).join("");
    return '<section class="concept-dashboard"><div class="concept-dash-head"><div><span class="wrong-kicker">개념 진단</span><h2>개념별 학습 진단</h2><p>오늘의 학습·미니게임·오답 재풀이의 모든 시도를 합산합니다.</p></div><a class="wrong-link" href="'+(weakest.conceptId?'map.html?n='+encodeURIComponent(weakest.conceptId):'today.html')+'">가장 약한 개념 복습 →</a></div><div class="performance-grid"><div><b>'+perf.rate+'%</b><span>전체 정답률</span></div><div><b>'+perf.attempts+'</b><span>누적 풀이</span></div><div><b>'+perf.concepts+'</b><span>진단 개념</span></div><div><b>'+esc(weakest.name)+'</b><span>집중 복습 1순위</span></div></div><div class="rank-head"><h3>취약 개념 순위</h3><span>정답률이 낮은 순</span></div><div class="concept-ranks">'+ranks+'</div></section>';
  }
  function draw(){
    const counts=store.count(),all=store.all();
    const progress=journey();
    let items=filter==="due"?all.filter(store.due):filter==="active"?all.filter(x=>!x.mastered):filter==="mastered"?all.filter(x=>x.mastered):all;
    if(conceptFilter)items=items.filter(x=>noteKey(x)===conceptFilter);
    if(journeyMode&&progress)items=all.filter(note=>progress.noteIds.includes(note.id));
    const selected=store.stats().find(x=>x.key===conceptFilter);
    const summary='<div class="wrong-summary"><div class="wrong-stat"><b>'+counts.active+'</b><span>복습 필요</span></div><div class="wrong-stat"><b>'+counts.mastered+'</b><span>복습 완료</span></div><div class="wrong-stat"><b>'+counts.all+'</b><span>전체 기록</span></div></div>';
    const tools='<div class="wrong-tools"><div><div class="wrong-tabs"><button class="wrong-tab '+(filter==="active"?"on":"")+'" data-filter="active">복습 필요</button><button class="wrong-tab '+(filter==="mastered"?"on":"")+'" data-filter="mastered">복습 완료</button><button class="wrong-tab '+(filter==="all"?"on":"")+'" data-filter="all">전체</button></div>'+(selected?'<button class="concept-filter-clear" id="clearConcept">'+esc(selected.name)+'만 보는 중 ×</button>':'')+'</div>'+(counts.mastered?'<button class="wrong-clear" id="clearMastered">완료 기록 정리</button>':'')+'</div>';
    app.innerHTML='<div id="wrongJourney">'+window.StudyJourney.view(progress)+'</div><div'+(journeyMode&&progress?' hidden':'')+'>'+dashboard()+summary+tools+'</div>'+(journeyMode&&progress?'<p>오늘 정한 복습 '+progress.noteIds.length+'문제입니다. 정답 여부와 별도로 제출한 활동을 완료 표시해요. <a href="wrong-notes.html">전체 오답 보기 →</a></p>':'')+(items.length?'<div class="wrong-list" id="journeyReviewList">'+items.map(card).join("")+'</div>':empty(selected));
    if(journeyMode&&progress?.next?.id==='review'){const link=app.querySelector('#wrongJourney .journey-actions a');link.href='#journeyReviewList';link.textContent='아래 복습 문제부터 풀기 →'}
    const dueTab=document.createElement("button");dueTab.type="button";dueTab.className="wrong-tab"+(filter==="due"?" on":"");dueTab.dataset.filter="due";dueTab.textContent="오늘 복습 "+counts.due+"문제";app.querySelector(".wrong-tabs").prepend(dueTab);
    app.querySelectorAll("[data-card]").forEach(element=>{const note=all.find(x=>x.id===element.dataset.card);if(note.mastered)return;const label=document.createElement("p");label.className="retry-status";label.textContent=note.reviewStage?"복습 확인 "+note.reviewStage+"/4 · "+(store.due(note)?"오늘 다시 풀 차례":dateText(note.nextReviewAt)+" 다시 확인"):"다시 맞힌 뒤 1일·3일·7일 간격으로 확인합니다.";element.querySelector(".wrong-card-top").after(label)});
    app.querySelectorAll("[data-card]").forEach(element=>{const note=all.find(x=>x.id===element.dataset.card);if(note.mastered||note.reviewStage>0)element.querySelector(".wrong-card-actions").insertAdjacentHTML("afterbegin",similarLink(note))});
    app.querySelectorAll("[data-card]").forEach(element=>{
      const note=all.find(x=>x.id===element.dataset.card),label=document.createElement("label");label.className="wrong-reason";label.textContent="오답 원인 (선택 사항)";
      const select=document.createElement("select");select.innerHTML='<option value="">아직 기록하지 않았어요</option>'+Object.entries(store.reasons).map(([key,text])=>'<option value="'+key+'">'+esc(text)+'</option>').join("");select.value=note.wrongReason||"";
      select.onchange=()=>{if(store.setReason(note.id,select.value)){note.wrongReason=select.value;toast("오답 원인을 저장했습니다.")}else{select.value=note.wrongReason||"";toast("저장하지 못했습니다. 기기 저장 공간을 확인해 주세요.")}};label.append(select);element.querySelector(".wrong-detail").before(label);
      if(note.difficulty||note.hintsUsed){const info=document.createElement("small");info.textContent=({basic:"기초",standard:"표준",challenge:"도전"}[note.difficulty]||"")+(note.hintsUsed?" · 힌트 "+note.hintsUsed+"단계 사용":"");label.append(info)}
    });
    window.MathView?.typeset(app);
    app.querySelectorAll("[data-concept]").forEach(btn=>btn.addEventListener("click",()=>{conceptFilter=conceptFilter===btn.dataset.concept?"":btn.dataset.concept;draw()}));
    app.querySelectorAll("[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{filter=btn.dataset.filter;draw()}));
    app.querySelectorAll("[data-retry]").forEach(btn=>btn.addEventListener("click",()=>openRetry(btn.dataset.retry)));
    app.querySelectorAll("[data-annotate]").forEach(btn=>btn.addEventListener("click",()=>window.WrongWorkTools.open(btn.dataset.annotate,draw)));
    app.querySelectorAll("[data-download]").forEach(btn=>btn.addEventListener("click",()=>window.WrongWorkTools.download(btn.dataset.download)));
    app.querySelectorAll("[data-share]").forEach(btn=>btn.addEventListener("click",()=>window.WrongWorkTools.share(btn.dataset.share)));
    app.querySelectorAll("[data-remove]").forEach(btn=>btn.addEventListener("click",()=>{toast(store.remove(btn.dataset.remove)?"오답 기록을 지웠습니다.":"삭제 내용을 저장하지 못했습니다. 기기 저장 공간을 확인해 주세요.");draw()}));
    document.getElementById("clearConcept")?.addEventListener("click",()=>{conceptFilter="";draw()});
    document.getElementById("clearMastered")?.addEventListener("click",()=>{toast(store.clearMastered()?"완료한 기록을 정리했습니다.":"정리 내용을 저장하지 못했습니다. 기기 저장 공간을 확인해 주세요.");draw()});
  }
  function card(note){
    const concept=note.conceptName?'<span class="wrong-tag">'+esc(note.conceptName)+'</span>':"";
    const feedback=solutionImage(note.feedbackImage),solution=feedback||solutionImage(note.solutionImage);
    const work=solution?'<figure class="wrong-work"><figcaption><b>내 풀이</b><span>'+(feedback?'첨삭이 저장된 풀이':'오답을 제출했을 때의 풀이판')+'</span></figcaption><img src="'+esc(solution)+'" alt="저장된 문제 풀이"><div class="wrong-work-actions"><button type="button" class="wrong-button" data-annotate="'+note.id+'">✎ 풀이 첨삭</button><button type="button" class="wrong-button" data-download="'+note.id+'">PNG 저장</button><button type="button" class="wrong-button primary" data-share="'+note.id+'">선생님께 제출</button></div></figure>':"";
    const links=(note.conceptId?'<a class="wrong-link" href="map.html?n='+encodeURIComponent(note.conceptId)+'">개념 복습 →</a>':'')+(note.reviewHref?'<a class="wrong-link" href="'+esc(note.reviewHref)+'">원문 다시 풀기 →</a>':'');
    return '<article class="wrong-card '+(note.mastered?"mastered":"")+'" data-card="'+note.id+'"><div class="wrong-card-top"><div class="wrong-tags"><span class="wrong-tag source">'+esc(note.sourceTitle)+'</span>'+concept+(note.mastered?'<span class="wrong-tag">복습 완료</span>':'')+'</div><span class="wrong-date">'+dateText(note.lastWrongAt)+'</span></div><h2 class="wrong-question" data-math>'+esc(note.prompt)+'</h2><dl class="wrong-answer"><dt>내가 쓴 답</dt><dd data-math>'+esc(note.userAnswer||"답하지 않음")+'</dd></dl>'+work+'<details class="wrong-detail"><summary>정답과 해설 보기</summary><div data-math><b>정답: '+esc(note.correctAnswer)+'</b><br>'+esc(note.explanation)+'</div></details><div class="wrong-card-actions">'+(!note.mastered?'<button class="wrong-button primary" data-retry="'+note.id+'">다시 풀기</button>':'')+links+'<button class="wrong-button remove" data-remove="'+note.id+'">기록 삭제</button></div><div class="retry-slot" id="retry-'+note.id+'"></div></article>';
  }
  function empty(selected){
    const text=selected?selected.name+"에서 현재 조건에 맞는 오답이 없습니다.":filter==="active"?"지금 복습할 오답이 없습니다. 오늘의 학습을 풀면 틀린 문제가 자동으로 들어옵니다.":filter==="mastered"?"아직 복습 완료한 문제가 없습니다.":"아직 저장된 오답이 없습니다.";
    return '<div class="wrong-empty"><h2>표시할 문제가 없습니다.</h2><p>'+esc(text)+'</p><a class="wrong-link" href="today.html">오늘의 학습 시작 →</a></div>';
  }
  function openRetry(id){
    const note=store.all().find(x=>x.id===id),slot=document.getElementById("retry-"+id);if(!note||!slot)return;
    const cardElement=slot.closest(".wrong-card");cardElement.querySelector(".wrong-detail").open=false;cardElement.querySelector(".wrong-answer").hidden=true;
    const answer=note.type==="choice"
      ? '<div class="retry-choices">'+note.choices.map((x,i)=>'<button class="retry-choice" data-value="'+esc(x)+'"><b>'+(i+1)+'.</b> <span data-math>'+esc(x)+'</span></button>').join("")+'</div>'
      : '<div class="retry-answer"><input class="retry-input" aria-label="답 입력" placeholder="답을 입력하세요"></div>';
    slot.innerHTML='<div class="retry-box"><h3>정답을 보지 않고 다시 풀어 보세요.</h3>'+answer+'<button class="wrong-button primary retry-submit">채점하기</button><p class="retry-status" role="status"></p></div>';
    window.MathView?.typeset(slot);
    let value="";
    slot.querySelectorAll(".retry-choice").forEach(btn=>btn.addEventListener("click",()=>{value=btn.dataset.value;slot.querySelectorAll(".retry-choice").forEach(x=>x.classList.toggle("on",x===btn))}));
    const input=slot.querySelector(".retry-input");if(input)input.focus();
    slot.querySelector(".retry-submit").addEventListener("click",()=>{
      const answerValue=input?input.value:value,status=slot.querySelector(".retry-status");
      if(!String(answerValue).trim()){status.textContent="답을 먼저 입력해 주세요.";status.className="retry-status wrong";return}
      const accepted=Array.isArray(note.acceptedAnswers)&&note.acceptedAnswers.length?note.acceptedAnswers:[note.correctAnswer];const ok=accepted.some(answer=>norm(answerValue)===norm(answer));
      const before=store.all().find(x=>x.id===id);
      if(!store.attempt(id,ok,answerValue)){status.textContent="풀이 기록을 저장하지 못했습니다. 기기 저장 공간을 확인해 주세요.";return}
      const progress=journey();document.getElementById('wrongJourney').innerHTML=window.StudyJourney.view(progress);
      slot.querySelector('.journey-step')?.remove();
      if(progress)slot.insertAdjacentHTML('beforeend','<div class="journey-step">'+window.StudyJourney.view(progress)+'</div>');
      if(journeyMode&&progress?.next?.id==='review'){
        const nextId=progress.noteIds.find(noteId=>!progress.results.some(r=>r.id==='review-'+noteId));
        if(nextId){const link=slot.querySelector('.journey-step .journey-actions a');link.href='#retry-'+nextId;link.textContent='다음 복습 문제 풀기 →';link.onclick=event=>{event.preventDefault();app.querySelector('[data-retry="'+nextId+'"]').click();document.getElementById('retry-'+nextId).scrollIntoView({block:'center'})}}
      }
      slot.querySelector(".retry-submit").disabled=true;
      if(ok){
        const saved=store.all().find(x=>x.id===id),box=slot.querySelector('.retry-box');status.textContent=saved.mastered?"정답입니다. 마지막 확인을 마쳐 복습 완료했습니다.":"정답입니다. "+dateText(saved.nextReviewAt)+"에 다시 확인하세요.";status.className="retry-status correct";
        const growth=document.createElement('section');growth.className='review-growth';growth.setAttribute('aria-label','이번 복습 성과');
        const title=document.createElement('strong');title.textContent=(window.TODAY_CONCEPTS?.[saved.conceptId]?.name||saved.conceptName||'수학')+' 오답을 다시 맞혔어요.';
        const detail=document.createElement('p');detail.textContent=saved.mastered?'1일·3일·7일 간격의 마지막 확인까지 마쳤어요.':saved.reviewStage>(before?.reviewStage||0)?'복습 확인 '+saved.reviewStage+'/4를 마쳤어요. 다음 확인에서도 개념을 적용해 보세요.':'예정일 전 연습에서도 다시 맞혔어요. 복습 단계 '+saved.reviewStage+'/4와 예정일은 유지됩니다.';growth.append(title,detail);box.append(growth);
        toast(saved.mastered?"복습을 완료했습니다.":"다음 복습 일정을 저장했습니다.");const link=similarLink(saved);if(link)box.insertAdjacentHTML('beforeend',link);
        const back=document.createElement('button');back.type='button';back.className='wrong-button';back.textContent='복습 목록으로';back.onclick=draw;box.append(back);
      }
      else{status.textContent="아직 다릅니다. 해설을 확인한 뒤 다시 풀어 보세요. 복습 단계는 처음부터 시작합니다.";status.className="retry-status wrong";slot.querySelector(".retry-submit").disabled=false}
    });
  }
  window.addEventListener("wrong-work-message",event=>toast(event.detail));
  window.addEventListener("student-sync-applied",draw);
  let pageAccount='';window.addEventListener('student-account-change',()=>{const state=window.StudentSync.getState(),key=state.ready?(state.student?.id||'guest'):'pending';if(key!==pageAccount){pageAccount=key;draw()}});
  draw();
})();
