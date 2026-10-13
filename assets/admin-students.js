(function(){
  "use strict";
  const root=document.getElementById("학생현황"),summary=document.getElementById("학생현황요약"),classSummary=document.getElementById("반별요약"),list=document.getElementById("학생현황목록"),search=document.getElementById("학생검색"),filter=document.getElementById("학생반필터"),refresh=document.getElementById("학생새로고침");
  if(!root)return;
  const resetDialog=document.createElement("dialog");resetDialog.className="student-account-dialog";resetDialog.setAttribute("aria-label","학생 비밀번호 초기화");document.body.append(resetDialog);
  let resetting=false;resetDialog.addEventListener("cancel",event=>{if(resetting)event.preventDefault()});
  const tracks={common1:"공통수학1",common2:"공통수학2",algebra:"대수",calc1:"미적분Ⅰ",probability:"확률과 통계",stats:"확률과 통계",geometry:"기하",calc2:"미적분Ⅱ"};
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const when=value=>{if(!value)return"학습 기록 없음";const date=new Date(value);if(Number.isNaN(date.getTime()))return value;return new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(date)};
  /* 가입만 하고 한 번도 안 온 학생은 '학습 기록 없음'으로만 보여서 누군지 알 수가
     없었습니다. 계정 만든 날은 이미 받아 오고 있었는데 화면에 안 쓰고 있었습니다. */
  const 가입날=value=>{if(!value)return"가입일 모름";const date=new Date(value);if(Number.isNaN(date.getTime()))return"가입일 모름";return"가입 "+new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"2-digit",month:"numeric",day:"numeric"}).format(date)};
  let students=[],attention="all";
  const hintText=analysis=>{const hints=analysis?.hints;return hints?.reviewAttempts?'확인 문제 '+hints.reviewAttempts+'회 · 힌트 사용 '+hints.hintUsed+'회 ('+Math.round(hints.hintUsed/hints.reviewAttempts*100)+'%) · 혼자 맞힘 '+hints.soloCorrect+'회'+(hints.hintUsed?' · 사용 시 평균 '+(hints.hintSteps/hints.hintUsed).toFixed(1)+'단계':''):'확인 문제 힌트 누적 집계 전'};
  function draw(){
    const query=search.value.trim().toLowerCase();
    const matched=students.filter(student=>{
      const inClass=!filter.value||(filter.value==="unset"?(!student.grade||!student.className):filter.value===student.grade+"-"+student.className);
      const found=!query||[student.id,student.name,student.grade,student.className,tracks[student.track]||student.track,student.weakest?.name,...(student.diagnostics||[]).flatMap(result=>[result.title,...result.concepts.map(concept=>concept.name)])].some(value=>String(value||"").toLowerCase().includes(query));
      return inClass&&found;
    });
    document.getElementById("미학습수").textContent=matched.filter(student=>student.inactive7).length;document.getElementById("시작전수").textContent=matched.filter(student=>student.notStarted).length;
    const shown=matched.filter(student=>attention==="all"||student[attention]);
    if(!shown.length){list.innerHTML='<p class="empty">'+(students.length?'검색 결과가 없습니다.':'아직 학생 계정이 없습니다.')+'</p>';return}
    list.innerHTML='<div class="student-admin-table"><div class="student-admin-row head"><span>학생</span><span>학습 설정</span><span>학습</span><span>오답</span><span>취약 개념</span><span>최근 활동 · 가입</span></div>'+shown.map(student=>'<article class="student-admin-row"><span class="student-admin-name"><b>'+esc(student.name||student.id)+'</b><small>'+esc(student.id)+'</small></span><span data-col="학습 설정">'+(student.grade?'고'+esc(student.grade)+(student.className&&document.querySelector('.legacy-class-view').open?' '+esc(student.className)+'반':' 과정'):'미설정')+'<small>'+esc(tracks[student.track]||student.track||'과목 미설정')+'</small></span><span data-col="학습"><b>'+(student.todayDone?'오늘 '+student.todayScore+'/5':'누적 '+student.studyCount+'회')+'</b><small>'+(student.average===null?'평균 기록 없음':'전체 평균 '+student.average+'%')+'</small></span><span data-col="오답"><b>'+student.activeWrong+'문제</b><small>완료 '+student.mastered+'</small></span><span data-col="취약 개념">'+(student.weakest?'<b>'+esc(student.weakest.name)+'</b><small>정답률 '+student.weakest.rate+'% · '+student.weakest.attempts+'회</small>':'<small>기록 없음</small>')+'</span><span data-col="최근 활동"><b>'+esc(when(student.lastAt))+'</b><small>'+esc(가입날(student.joinedAt))+'</small></span></article>').join('')+'</div>';
    list.querySelectorAll(".student-admin-name").forEach((span,index)=>{const button=document.createElement("button");button.type="button";button.className="student-reset-button";button.textContent="비밀번호 초기화";button.onclick=()=>openReset(shown[index]);span.append(button)});
    list.querySelectorAll(".student-admin-name").forEach((span,index)=>{const student=shown[index];if(student.notStarted||student.inactive7){const badge=document.createElement("span");badge.className="student-attention-badge";badge.textContent=student.notStarted?(student.inactive7?"시작 전 · 7일 미학습":"아직 시작 안 함"):"7일 미학습";span.append(badge)}});
    list.querySelectorAll(".student-admin-name").forEach((span,index)=>{
      const analysis=shown[index].analysis,details=document.createElement("details");details.className="student-learning-analysis";
      details.innerHTML='<summary>오답·힌트 분석 보기</summary><p>보관된 오답 원인: '+((analysis?.reasons||[]).filter(reason=>reason.count>0).map(reason=>esc(reason.name)+' '+reason.count+'문제').join(' · ')||'기록 없음')+'</p><p>'+esc(hintText(analysis))+'</p><small>원인은 학생 선택값입니다. 힌트 누적 집계는 기능 적용 후 확인 문제만 포함합니다.'+(analysis?.savedHintNotes?' 보관된 오답 중 힌트 사용 기록 '+analysis.savedHintNotes+'문제.':'')+'</small>';span.append(details);
    });
    list.querySelectorAll('.student-admin-name').forEach((span,index)=>{
      const review=shown[index].review,details=document.createElement('details');details.className='review-weekly student-review-analysis';
      details.innerHTML='<summary>주간 복습 성과 보기</summary>'+(review?'<p>'+esc(review.startDate)+' ~ '+esc(review.endDate)+' · 한국 시간</p><p>정답 확인 '+review.confirmed+'문제 · 최종 완료 '+review.completed+'문제</p><p>오늘 복습 '+review.due+'문제 · 전체 미완료 '+review.active+'문제</p><table><caption>날짜별 마지막 복습 확인</caption><thead><tr><th scope="col">날짜</th><th scope="col">정답 확인</th><th scope="col">최종 완료</th></tr></thead><tbody>'+review.days.map(day=>'<tr><th scope="row">'+esc(day.date.slice(5))+'</th><td>'+day.confirmed+'</td><td>'+day.completed+'</td></tr>').join('')+'</tbody></table><ul>'+review.concepts.map(row=>'<li>'+esc(row.name)+' · 확인 '+row.confirmed+' · 완료 '+row.completed+'</li>').join('')+'</ul><small>계정에 동기화된 보관 중인 오답별 마지막 확인 기준입니다. 삭제·재오답 기록과 비회원 학습은 포함하지 않으며 전체 시도 횟수가 아닙니다.</small>':'<p>집계 정보를 새로고침해 주세요.</p>');span.append(details);
    });
    list.querySelectorAll('.student-admin-row:not(.head)').forEach((row,index)=>{
      const diagnostics=shown[index].diagnostics||[],details=document.createElement('details');details.className='review-weekly student-diagnostic-analysis';
      details.innerHTML='<summary>학습 진단 결과 · '+(diagnostics.length?diagnostics.length+'과목':'기록 없음')+'</summary>'+(diagnostics.length?'<p>과목별 최근 완료 진단입니다. 재확인과 미학습을 구분하며 오늘의 점수·오답 집계에는 포함하지 않습니다.</p>'+diagnostics.map(result=>'<section class="student-diagnostic-course"><h3>고'+esc(result.grade)+' · '+esc(result.title)+'</h3><p>진단 완료 '+esc(when(result.completedAt))+' · 한국 시간</p><p><b>정답 '+result.correct+' · 재확인 '+result.recheck+' · 미학습 '+result.unlearned+'</b></p><table><caption>개념별 진단 결과</caption><thead><tr><th scope="col">개념</th><th scope="col">정답</th><th scope="col">재확인</th><th scope="col">미학습</th></tr></thead><tbody>'+result.concepts.map(concept=>'<tr><th scope="row"><a href="map.html?grade='+encodeURIComponent(result.grade)+'&n='+encodeURIComponent(concept.id)+'">'+esc(concept.name)+'</a></th><td>'+concept.correct+'</td><td>'+concept.recheck+'</td><td>'+concept.unlearned+'</td></tr>').join('')+'</tbody></table><p>재확인할 개념: '+(result.concepts.filter(c=>c.recheck>0).map(c=>'<a href="past-practice.html?grade='+encodeURIComponent(result.grade)+'&concept='+encodeURIComponent(c.id)+'">'+esc(c.name)+' 기출 보기</a>').join(' · ')||'없음')+'</p></section>').join('')+'<small>5문항으로 확인한 결과이므로 학습 지도 참고자료로 활용하세요. 미학습은 취약 개념으로 분류하지 않습니다.</small>':'<p>계정에 동기화된 완료 진단이 없습니다. 학생은 홈의 ‘나의 학습 진단’에서 시작할 수 있습니다.</p>');row.append(details);
    });
  }
  function openReset(student){
    if(resetting)return;
    resetDialog.innerHTML='<div class="student-account-card"><h2>학생 비밀번호 초기화</h2><p><b>'+esc(student.name||student.id)+'</b> · '+esc(student.id)+'<br>새 숫자 비밀번호를 학생에게 직접 알려 주세요. 기존 로그인은 해제되며 학습 기록은 유지됩니다.</p><form id="studentResetForm" class="student-account-form"><label>새 비밀번호<input name="pin" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" maxlength="12" pattern="[0-9]+" required placeholder="숫자 6~12자리"></label><label>새 비밀번호 다시 입력<input name="confirm" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" maxlength="12" pattern="[0-9]+" required></label><p class="student-account-error" role="status"></p><button class="btn btn-primary" type="submit">비밀번호 초기화</button><button type="button" class="student-secondary-action" id="cancelReset">취소</button></form></div>';
    const form=resetDialog.querySelector("form"),status=form.querySelector('[role="status"]');
    resetDialog.querySelector("#cancelReset").onclick=()=>resetDialog.close();
    form.onsubmit=async event=>{
      event.preventDefault();if(form.elements.pin.value!==form.elements.confirm.value){status.textContent="두 비밀번호가 서로 다릅니다.";return}
      const submit=form.querySelector('[type="submit"]'),cancel=resetDialog.querySelector("#cancelReset");resetting=true;submit.disabled=true;cancel.disabled=true;status.textContent="";
      try{
        const response=await fetch("/api/student-admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reset-password",password:window.선생님암호?.()||"",id:student.id,newPin:form.elements.pin.value})}),data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||"비밀번호를 초기화하지 못했습니다.");
        form.reset();status.textContent="초기화했습니다. 학생은 새 비밀번호로 로그인할 수 있습니다.";submit.hidden=true;resetDialog.querySelector("#cancelReset").textContent="닫기";
      }catch(error){status.textContent=error.message}finally{resetting=false;submit.disabled=false;cancel.disabled=false}
    };
    resetDialog.showModal();
  }
  function drawClasses(classes){
    const selectedClass=filter.value;
    const label=item=>item.key==="unset"?"반 미설정":"고"+item.grade+" "+item.className+"반";
    classSummary.innerHTML=classes.map(item=>'<button type="button" data-class="'+esc(item.key)+'"><b>'+esc(label(item))+'</b><span>학생 '+item.students+'명 · 평균 '+(item.average===null?'–':item.average+'%')+'</span><small>7일 참여 '+item.active7+'명 · 오답 '+item.activeWrong+'개</small></button>').join('');
    classSummary.querySelectorAll("[data-class]").forEach((button,index)=>{
      const item=classes[index],status=document.createElement("small");status.textContent='7일 미학습 '+(item.inactive7||0)+'명 · 시작 전 '+(item.notStarted||0)+'명';button.append(status);
      const concepts=document.createElement("span");concepts.className="student-common-concepts";
      concepts.innerHTML=(item.weakConcepts||[]).length?'<b>반 공통 취약 개념</b>'+item.weakConcepts.map(concept=>'<small>'+esc(concept.name)+' · 집중 복습 '+concept.weakStudents+'/'+concept.students+'명 · 평균 '+concept.rate+'%</small>').join(''):esc(item.key==='unset'?'반을 등록하면 공통 취약 개념을 확인할 수 있습니다.':'공통 취약 개념: 표시 기준에 해당하는 기록 없음');
      button.append(concepts);
      const analysis=item.analysis,reason=(analysis?.reasons||[]).filter(row=>row.key!=='unrecorded'&&row.count>0).sort((a,b)=>b.count-a.count)[0],insight=document.createElement("small");insight.className="student-class-analysis";insight.textContent=(reason?'많이 기록한 원인: '+reason.name+' '+reason.count+'문제 · ':'')+hintText(analysis);button.append(insight);
    });
    filter.innerHTML='<option value="">전체 학생</option>'+classes.map(item=>'<option value="'+esc(item.key)+'">'+esc(label(item))+'</option>').join('');
    if(classes.some(item=>item.key===selectedClass))filter.value=selectedClass;
    classSummary.querySelectorAll("[data-class]").forEach(button=>button.onclick=()=>{filter.value=button.dataset.class;draw()});
  }
  async function load(){
    refresh.disabled=true;list.classList.add("adm-loading");if(!students.length)list.innerHTML='<p class="empty">불러오는 중…</p>';
    try{
      const response=await fetch("/api/student-admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:window.선생님암호?.()||""})}),data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"불러오지 못했습니다.");
      students=data.students||[];summary.innerHTML='<span><b>'+data.summary.total+'</b> 전체 계정</span><span><b>'+data.summary.active7+'</b> 최근 7일 학습</span><span><b>'+data.summary.today+'</b> 오늘 완료</span><span><b>'+data.summary.activeWrong+'</b> 복습 대기 오답</span>';document.getElementById("미학습수").textContent=data.summary.inactive7||0;document.getElementById("시작전수").textContent=data.summary.notStarted||0;drawClasses(data.classes||[]);draw();
    }catch(error){list.innerHTML='<p class="empty">'+esc(error.message)+'</p>'}finally{refresh.disabled=false;list.classList.remove("adm-loading")}
  }
  search.addEventListener("input",draw);filter.addEventListener("change",draw);refresh.addEventListener("click",load);window.addEventListener("admin-open",load);if(!document.getElementById("안쪽").hidden)load();
  root.querySelector('.legacy-class-view').addEventListener('toggle',event=>{if(!event.target.open)filter.value='';draw()});
  root.querySelectorAll("[data-attention]").forEach(button=>{button.classList.add("file-filter");button.onclick=()=>{attention=button.dataset.attention;root.querySelectorAll("[data-attention]").forEach(item=>{item.classList.toggle("on",item===button);item.setAttribute("aria-pressed",String(item===button))});draw()}});
  root.querySelector('[data-attention="all"]').classList.add("on");
})();
