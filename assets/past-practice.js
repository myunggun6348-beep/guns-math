(function(){
  "use strict";
  const app=document.getElementById("pastApp"),params=new URLSearchParams(location.search),concept=params.get("concept")||"poly",grade=params.get("grade")||"1",meta=(window.TODAY_CONCEPTS||{})[concept],bank=(window.PAST_PRACTICE||{})[concept]||[];
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const hash=text=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
  async function render(){
    if(!meta||!bank.length){app.innerHTML='<section class="past-hero"><h1>연결할 기출을 준비하고 있습니다.</h1><a class="past-button" href="files.html">자료실 보기</a></section>';return}
    try{
      const data=await fetch("assets/exam-catalog.json").then(r=>{if(!r.ok)throw new Error();return r.json()}),exams=new Map(data.items.map(x=>[x.id,x]));
      const start=hash(new Date().toISOString().slice(0,10)+"|"+concept)%bank.length,selected=bank.map((_,i)=>bank[(start+i)%bank.length]);
      const cards=selected.map((row,i)=>{const exam=exams.get(row.exam),set=exam?.sets.find(x=>x.subject===row.subject),problem=set?.files?.problem?.url,solution=set?.files?.solution?.url;if(!exam||!problem)return"";return '<article class="past-card"><div class="past-card-top"><span>추천 '+(i+1)+'</span><b>'+esc(exam.title)+' · '+esc(row.subject)+'</b></div><div class="past-number">'+row.number+'번</div><h2>'+esc(row.intent)+'</h2><p>'+esc(meta.name)+'에서 확인해야 할 핵심 판단을 실제 기출 문항으로 점검합니다.</p><div class="past-actions"><a class="past-button" target="_blank" rel="noopener" href="'+esc(problem)+'#page='+row.page+'">문제 원문 '+row.page+'쪽 열기</a>'+(solution?'<a class="past-button secondary" target="_blank" rel="noopener" href="'+esc(solution)+'">정답·해설 열기</a>':'')+'</div></article>'}).join("");
      app.innerHTML='<section class="past-hero"><span class="past-kicker">AUTO PAST EXAM</span><h1>'+esc(meta.name)+' 기출 연습</h1><p>오늘의 학습 결과와 연결된 문항을 최근 검증 기출에서 자동으로 골랐습니다. 먼저 문제를 풀고 정답·해설을 여세요.</p><div class="past-meta"><span>고'+esc(grade)+'</span><span>추천 '+selected.length+'문항</span><span>원문 출처 EBSi</span></div></section><section class="past-guide"><b>풀이 순서</b><span>문제 원문 열기 → 해당 번호 풀기 → 정답·해설 확인 → 오답노트 복습</span></section><div class="past-list">'+cards+'</div><div class="past-bottom"><a class="past-button secondary" href="map.html?grade='+encodeURIComponent(grade)+'&n='+encodeURIComponent(concept)+'">개념 지도 복습</a><a class="past-button secondary" href="today.html?grade='+encodeURIComponent(grade)+'">오늘의 학습으로 돌아가기</a></div>';
    }catch{app.innerHTML='<section class="past-hero"><h1>기출 목록을 불러오지 못했습니다.</h1><p>잠시 뒤 다시 열어 주세요.</p><a class="past-button" href="files.html">자료실 보기</a></section>'}
  }
  render();
})();
