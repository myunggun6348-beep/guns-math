(function(){
  "use strict";
  const root=document.getElementById("학생현황"),summary=document.getElementById("학생현황요약"),classSummary=document.getElementById("반별요약"),list=document.getElementById("학생현황목록"),search=document.getElementById("학생검색"),filter=document.getElementById("학생반필터"),refresh=document.getElementById("학생새로고침");
  if(!root)return;
  const tracks={common1:"공통수학1",common2:"공통수학2",algebra:"대수",calc1:"미적분Ⅰ",probability:"확률과 통계",geometry:"기하",calc2:"미적분Ⅱ"};
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const when=value=>{if(!value)return"학습 기록 없음";const date=new Date(value);if(Number.isNaN(date.getTime()))return value;return new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(date)};
  /* 가입만 하고 한 번도 안 온 학생은 '학습 기록 없음'으로만 보여서 누군지 알 수가
     없었습니다. 계정 만든 날은 이미 받아 오고 있었는데 화면에 안 쓰고 있었습니다. */
  const 가입날=value=>{if(!value)return"가입일 모름";const date=new Date(value);if(Number.isNaN(date.getTime()))return"가입일 모름";return"가입 "+new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"2-digit",month:"numeric",day:"numeric"}).format(date)};
  let students=[];
  function draw(){
    const query=search.value.trim().toLowerCase();
    const shown=students.filter(student=>{
      const inClass=!filter.value||(filter.value==="unset"?(!student.grade||!student.className):filter.value===student.grade+"-"+student.className);
      const found=!query||[student.id,student.name,student.grade,student.className,tracks[student.track]||student.track,student.weakest?.name].some(value=>String(value||"").toLowerCase().includes(query));
      return inClass&&found;
    });
    if(!shown.length){list.innerHTML='<p class="empty">'+(students.length?'검색 결과가 없습니다.':'아직 학생 계정이 없습니다.')+'</p>';return}
    list.innerHTML='<div class="student-admin-table"><div class="student-admin-row head"><span>학생</span><span>학년·반·과목</span><span>학습</span><span>오답</span><span>취약 개념</span><span>최근 활동 · 가입</span></div>'+shown.map(student=>'<article class="student-admin-row"><span class="student-admin-name"><b>'+esc(student.name||student.id)+'</b><small>'+esc(student.id)+'</small></span><span>'+(student.grade?'고'+esc(student.grade)+(student.className?' '+esc(student.className)+'반':' · 반 미설정'):'미설정')+'<small>'+esc(tracks[student.track]||student.track||'과목 미설정')+'</small></span><span><b>'+(student.todayDone?'오늘 '+student.todayScore+'/5':'누적 '+student.studyCount+'회')+'</b><small>'+(student.average===null?'평균 기록 없음':'전체 평균 '+student.average+'%')+'</small></span><span><b>'+student.activeWrong+'문제</b><small>완료 '+student.mastered+'</small></span><span>'+(student.weakest?'<b>'+esc(student.weakest.name)+'</b><small>정답률 '+student.weakest.rate+'% · '+student.weakest.attempts+'회</small>':'<small>기록 없음</small>')+'</span><span><b>'+esc(when(student.lastAt))+'</b><small>'+esc(가입날(student.joinedAt))+'</small></span></article>').join('')+'</div>';
  }
  function drawClasses(classes){
    const label=item=>item.key==="unset"?"반 미설정":"고"+item.grade+" "+item.className+"반";
    classSummary.innerHTML=classes.map(item=>'<button type="button" data-class="'+esc(item.key)+'"><b>'+esc(label(item))+'</b><span>학생 '+item.students+'명 · 평균 '+(item.average===null?'–':item.average+'%')+'</span><small>7일 참여 '+item.active7+'명 · 오답 '+item.activeWrong+'개</small></button>').join('');
    filter.innerHTML='<option value="">전체 학생</option>'+classes.map(item=>'<option value="'+esc(item.key)+'">'+esc(label(item))+'</option>').join('');
    classSummary.querySelectorAll("[data-class]").forEach(button=>button.onclick=()=>{filter.value=button.dataset.class;draw()});
  }
  async function load(){
    refresh.disabled=true;list.classList.add("adm-loading");if(!students.length)list.innerHTML='<p class="empty">불러오는 중…</p>';
    try{
      const response=await fetch("/api/student-admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:window.선생님암호?.()||""})}),data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"불러오지 못했습니다.");
      students=data.students||[];summary.innerHTML='<span><b>'+data.summary.total+'</b> 전체 계정</span><span><b>'+data.summary.active7+'</b> 최근 7일 학습</span><span><b>'+data.summary.today+'</b> 오늘 완료</span><span><b>'+data.summary.activeWrong+'</b> 복습 대기 오답</span>';drawClasses(data.classes||[]);draw();
    }catch(error){list.innerHTML='<p class="empty">'+esc(error.message)+'</p>'}finally{refresh.disabled=false;list.classList.remove("adm-loading")}
  }
  search.addEventListener("input",draw);filter.addEventListener("change",draw);refresh.addEventListener("click",load);window.addEventListener("admin-open",load);if(!document.getElementById("안쪽").hidden)load();
})();
