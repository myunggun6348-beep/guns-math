(function(){
  "use strict";
  const root=document.getElementById("학생현황"),summary=document.getElementById("학생현황요약"),list=document.getElementById("학생현황목록"),search=document.getElementById("학생검색"),refresh=document.getElementById("학생새로고침");
  if(!root)return;
  const tracks={common1:"공통수학1",common2:"공통수학2",algebra:"대수",calc1:"미적분Ⅰ",probability:"확률과 통계",geometry:"기하",calc2:"미적분Ⅱ"};
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const when=value=>{if(!value)return"학습 기록 없음";const date=new Date(value);if(Number.isNaN(date.getTime()))return value;return new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(date)};
  let students=[];
  function draw(){
    const query=search.value.trim().toLowerCase(),shown=students.filter(s=>!query||[s.id,s.name,s.grade,tracks[s.track]||s.track,s.weakest?.name].some(v=>String(v||"").toLowerCase().includes(query)));
    if(!shown.length){list.innerHTML='<p class="empty">'+(students.length?'검색 결과가 없습니다.':'아직 학생 계정이 없습니다.')+'</p>';return}
    list.innerHTML='<div class="student-admin-table"><div class="student-admin-row head"><span>학생</span><span>학년·과목</span><span>학습</span><span>오답</span><span>취약 개념</span><span>최근 활동</span></div>'+shown.map(s=>'<article class="student-admin-row"><span class="student-admin-name"><b>'+esc(s.name||s.id)+'</b><small>'+esc(s.id)+'</small></span><span>'+(s.grade?'고'+esc(s.grade):'미설정')+'<small>'+esc(tracks[s.track]||s.track||'과목 미설정')+'</small></span><span><b>'+(s.todayDone?'오늘 '+s.todayScore+'/5':'누적 '+s.studyCount+'회')+'</b><small>'+(s.todayDone?'오늘 학습 완료':'오늘 미학습')+'</small></span><span><b>'+s.activeWrong+'문제</b><small>완료 '+s.mastered+'</small></span><span>'+(s.weakest?'<b>'+esc(s.weakest.name)+'</b><small>정답률 '+s.weakest.rate+'% · '+s.weakest.attempts+'회</small>':'<small>기록 없음</small>')+'</span><span><small>'+esc(when(s.lastAt))+'</small></span></article>').join('')+'</div>';
  }
  async function load(){
    refresh.disabled=true;list.classList.add("adm-loading");if(!students.length)list.innerHTML='<p class="empty">불러오는 중…</p>';
    try{const response=await fetch("/api/student-admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:window.선생님암호?.()||""})}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"불러오지 못했습니다.");students=data.students||[];summary.innerHTML='<span><b>'+data.summary.total+'</b> 전체 계정</span><span><b>'+data.summary.active7+'</b> 최근 7일 학습</span><span><b>'+data.summary.today+'</b> 오늘 완료</span><span><b>'+data.summary.activeWrong+'</b> 복습 대기 오답</span>';draw()}catch(error){list.innerHTML='<p class="empty">'+esc(error.message)+'</p>'}finally{refresh.disabled=false;list.classList.remove("adm-loading")}
  }
  search.addEventListener("input",draw);refresh.addEventListener("click",load);window.addEventListener("admin-open",load);if(!document.getElementById("안쪽").hidden)load();
})();
