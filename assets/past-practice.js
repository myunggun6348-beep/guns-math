(function(){
  "use strict";
  const app=document.getElementById("pastApp"),params=new URLSearchParams(location.search),concept=params.get("concept")||"poly",grade=params.get("grade")||"1",meta=(window.TODAY_CONCEPTS||{})[concept],bank=(window.PAST_PRACTICE||{})[concept]||[];
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const hash=text=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
  async function render(){
    if(!meta||!bank.length){app.innerHTML='<section class="past-hero"><h1>연결할 기출을 준비하고 있습니다.</h1><a class="past-button" href="files.html">자료실 보기</a></section>';return}
    try{
      const data=await fetch("assets/exam-catalog.json").then(r=>{if(!r.ok)throw new Error();return r.json()}),exams=new Map(data.items.map(x=>[x.id,x]));
      /* 하루에 3문항. 목록을 시험별로 번갈아 세운 뒤(가 시험, 나 시험, 다 시험, 가 시험…)
         날마다 다음 3문항으로 넘어갑니다. 그래서 하루 3문항이 대개 서로 다른 시험에서 나오고,
         모든 문항이 차례대로 한 번씩 돌아옵니다.
         날짜는 이 기기의 날짜입니다(toISOString 은 세계 표준시라 한국에서는 아침 9시에 바뀌었습니다). */
      const 하루에=Math.min(3,bank.length),시험별=new Map();
      bank.forEach(row=>{if(!시험별.has(row.exam))시험별.set(row.exam,[]);시험별.get(row.exam).push(row)});
      const 줄=[],묶음=[...시험별.values()];for(let i=0;줄.length<bank.length;i++)묶음.forEach(g=>{if(g[i])줄.push(g[i])});
      const 오늘=new Date(),날수=Math.floor(Date.UTC(오늘.getFullYear(),오늘.getMonth(),오늘.getDate())/864e5),start=(날수*하루에+hash(concept))%줄.length;
      const selected=Array.from({length:하루에},(_,i)=>줄[(start+i)%줄.length]);
      const cards=selected.map((row,i)=>{const exam=exams.get(row.exam),set=exam?.sets.find(x=>x.subject===row.subject),problem=set?.files?.problem?.url,solution=set?.files?.solution?.url;if(!exam||!problem)return"";return '<article class="past-card"><div class="past-card-top"><span>추천 '+(i+1)+'</span><b>'+esc((exam.examYear?exam.examYear+'년 ':'')+exam.title)+' · '+esc(row.subject)+'</b></div><div class="past-number">'+row.number+'번</div><h2>'+esc(row.intent)+'</h2><p>'+esc((window.PAST_PRACTICE_TIPS||{})[row.intent]||meta.name+'에서 확인해야 할 핵심 판단을 실제 기출 문항으로 점검합니다.')+'</p><div class="past-actions"><a class="past-button" target="_blank" rel="noopener" href="'+esc(problem)+'#page='+row.page+'">문제 원문 '+row.page+'쪽 열기</a>'+(solution?'<a class="past-button secondary" target="_blank" rel="noopener" href="'+esc(solution)+'">정답·해설 열기</a>':'')+'</div></article>'}).join("");
      app.innerHTML='<section class="past-hero"><span class="past-kicker">자동 선별 기출</span><h1>'+esc(meta.name)+' 기출 연습</h1><p>오늘의 학습 결과와 연결된 문항을 최근 검증 기출에서 자동으로 골랐습니다. 먼저 문제를 풀고 정답·해설을 여세요.</p><div class="past-meta"><span>고'+esc(grade)+'</span><span>추천 '+selected.length+'문항</span><span>원문 출처 EBSi</span></div></section><section class="past-guide"><b>풀이 순서</b><span>문제 원문 열기 → 해당 번호 풀기 → 정답·해설 확인 → 오답노트 복습</span></section><div class="past-list">'+cards+'</div><div class="past-bottom"><a class="past-button secondary" href="map.html?grade='+encodeURIComponent(grade)+'&n='+encodeURIComponent(concept)+'">개념 지도 복습</a><a class="past-button secondary" href="today.html?grade='+encodeURIComponent(grade)+'">오늘의 학습으로 돌아가기</a></div>';
    }catch{app.innerHTML='<section class="past-hero"><h1>기출 목록을 불러오지 못했습니다.</h1><p>잠시 뒤 다시 열어 주세요.</p><a class="past-button" href="files.html">자료실 보기</a></section>'}
  }
  render();
})();
