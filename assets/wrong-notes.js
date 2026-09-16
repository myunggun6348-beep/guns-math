
(function(){
  "use strict";
  const app=document.getElementById("wrongApp"),store=window.WrongNotes;
  let filter=new URLSearchParams(location.search).get("view")||"active";
  if(!["active","mastered","all"].includes(filter))filter="active";
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const norm=v=>String(v).trim().toLowerCase().replace(/[−–—]/g,"-").replace(/\s+/g,"").replace(/,/g,"");
  function toast(text){const el=document.getElementById("wrongToast");el.textContent=text;el.classList.add("show");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("show"),1800)}
  function dateText(value){try{return new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric"}).format(new Date(value))}catch{return""}}
  function draw(){
    const counts=store.count(),all=store.all();
    const items=filter==="active"?all.filter(x=>!x.mastered):filter==="mastered"?all.filter(x=>x.mastered):all;
    const summary='<div class="wrong-summary"><div class="wrong-stat"><b>'+counts.active+'</b><span>복습 필요</span></div><div class="wrong-stat"><b>'+counts.mastered+'</b><span>복습 완료</span></div><div class="wrong-stat"><b>'+counts.all+'</b><span>전체 기록</span></div></div>';
    const tools='<div class="wrong-tools"><div class="wrong-tabs"><button class="wrong-tab '+(filter==="active"?"on":"")+'" data-filter="active">복습 필요</button><button class="wrong-tab '+(filter==="mastered"?"on":"")+'" data-filter="mastered">복습 완료</button><button class="wrong-tab '+(filter==="all"?"on":"")+'" data-filter="all">전체</button></div>'+(counts.mastered?'<button class="wrong-clear" id="clearMastered">완료 기록 정리</button>':'')+'</div>';
    app.innerHTML=summary+tools+(items.length?'<div class="wrong-list">'+items.map(card).join("")+'</div>':empty());
    app.querySelectorAll("[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{filter=btn.dataset.filter;draw()}));
    app.querySelectorAll("[data-retry]").forEach(btn=>btn.addEventListener("click",()=>openRetry(btn.dataset.retry)));
    app.querySelectorAll("[data-remove]").forEach(btn=>btn.addEventListener("click",()=>{store.remove(btn.dataset.remove);toast("오답 기록을 지웠습니다.");draw()}));
    document.getElementById("clearMastered")?.addEventListener("click",()=>{store.clearMastered();toast("완료한 기록을 정리했습니다.");draw()});
  }
  function card(note){
    const concept=note.conceptName?'<span class="wrong-tag">'+esc(note.conceptName)+'</span>':"";
    const links=(note.conceptId?'<a class="wrong-link" href="map.html?n='+encodeURIComponent(note.conceptId)+'">개념 복습 →</a>':'')+(note.reviewHref?'<a class="wrong-link" href="'+esc(note.reviewHref)+'">원문 다시 풀기 →</a>':'');
    return '<article class="wrong-card '+(note.mastered?"mastered":"")+'" data-card="'+note.id+'"><div class="wrong-card-top"><div class="wrong-tags"><span class="wrong-tag source">'+esc(note.sourceTitle)+'</span>'+concept+(note.mastered?'<span class="wrong-tag">복습 완료</span>':'')+'</div><span class="wrong-date">'+dateText(note.lastWrongAt)+'</span></div><h2 class="wrong-question">'+esc(note.prompt)+'</h2><dl class="wrong-answer"><dt>내가 쓴 답</dt><dd>'+esc(note.userAnswer||"답하지 않음")+'</dd></dl><details class="wrong-detail"><summary>정답과 해설 보기</summary><div><b>정답: '+esc(note.correctAnswer)+'</b><br>'+esc(note.explanation)+'</div></details><div class="wrong-card-actions">'+(!note.mastered?'<button class="wrong-button primary" data-retry="'+note.id+'">다시 풀기</button>':'')+links+'<button class="wrong-button remove" data-remove="'+note.id+'">기록 삭제</button></div><div class="retry-slot" id="retry-'+note.id+'"></div></article>';
  }
  function empty(){
    const text=filter==="active"?"지금 복습할 오답이 없습니다. 오늘의 학습을 풀면 틀린 문제가 자동으로 들어옵니다.":filter==="mastered"?"아직 복습 완료한 문제가 없습니다.":"아직 저장된 오답이 없습니다.";
    return '<div class="wrong-empty"><h2>오답노트가 비어 있습니다.</h2><p>'+text+'</p><a class="wrong-link" href="today.html">오늘의 학습 시작 →</a></div>';
  }
  function openRetry(id){
    const note=store.all().find(x=>x.id===id),slot=document.getElementById("retry-"+id);if(!note||!slot)return;
    const answer=note.type==="choice"
      ? '<div class="retry-choices">'+note.choices.map((x,i)=>'<button class="retry-choice" data-value="'+esc(x)+'"><b>'+(i+1)+'.</b> '+esc(x)+'</button>').join("")+'</div>'
      : '<div class="retry-answer"><input class="retry-input" aria-label="답 입력" placeholder="답을 입력하세요"></div>';
    slot.innerHTML='<div class="retry-box"><h3>정답을 보지 않고 다시 풀어 보세요.</h3>'+answer+'<button class="wrong-button primary retry-submit">채점하기</button><p class="retry-status" role="status"></p></div>';
    let value="";
    slot.querySelectorAll(".retry-choice").forEach(btn=>btn.addEventListener("click",()=>{value=btn.dataset.value;slot.querySelectorAll(".retry-choice").forEach(x=>x.classList.toggle("on",x===btn))}));
    const input=slot.querySelector(".retry-input");if(input)input.focus();
    slot.querySelector(".retry-submit").addEventListener("click",()=>{
      const answerValue=input?input.value:value,status=slot.querySelector(".retry-status");
      if(!String(answerValue).trim()){status.textContent="답을 먼저 입력해 주세요.";status.className="retry-status wrong";return}
      const ok=norm(answerValue)===norm(note.correctAnswer);
      store.attempt(id,ok,answerValue);
      if(ok){status.textContent="정답입니다. 복습 완료로 이동합니다.";status.className="retry-status correct";toast("한 문제를 복습 완료했습니다.");setTimeout(draw,650)}
      else{status.textContent="아직 다릅니다. 정답과 해설을 확인하고 다시 도전하세요.";status.className="retry-status wrong"}
    });
  }
  window.addEventListener("wrong-notes-change",()=>{});
  draw();
})();
