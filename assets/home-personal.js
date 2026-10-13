/* 개인 홈은 로그인 계정과 명시적으로 선택한 체험 기록을 분리한다. */
(function(){
  "use strict";
  const KEY="math-home-profile-v1",root=document.getElementById("homePersonal"),tracks=window.TODAY_TRACKS||{};
  if(!root)return;
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const valid=(grade,track)=>["1","2","3"].includes(String(grade))&&tracks[track]?.grades.includes(String(grade));
  const records=()=>{const value=read("today-study-records",[]);return Array.isArray(value)?value:[]};
  const bankQuestions=new Map();
  function plan(ids,reason,count){
    const names=[...new Set(ids)].map(id=>window.TODAY_CONCEPTS?.[id]?.name).filter(Boolean);if(!names.length)return '';
    return '<div class="home-learning-plan"><p class="home-plan-concepts">'+names.map(esc).join(' · ')+'</p><p class="home-plan-reason">'+esc(reason)+'</p><span class="home-plan-time">'+(count>0?'예상 약 '+count+'분 · 풀이 속도에 따라 달라요':'결과 확인만 남았어요')+'</span></div>';
  }
  function weeklyPlanView(value){
    if(!value)return '';
    const weekdays=['일','월','화','수','목','금','토'];
    return '<details class="review-weekly weekly-study-plan"><summary>앞으로 7일 학습 계획</summary><p>고'+esc(value.grade)+' · '+esc(value.title)+' · '+esc(value.startsOn)+' ~ '+esc(value.endsOn)+' · 한국 시간</p><p>'+esc(value.reason)+'</p><ol class="study-plan-days">'+value.days.map((day,index)=>'<li><span class="study-plan-date">'+(index===0?'오늘':day.date.slice(5))+'<small>'+weekdays[new Date(day.date+'T12:00:00+09:00').getUTCDay()]+'요일 · 약 '+(day.minutes+day.reviewMinutes)+'분</small></span><div>'+(day.reviewCount?'<div class="study-plan-review"><b>오답 복습부터 · 예정 '+day.reviewCount+'문제</b><p>'+day.reviewConcepts.map(esc).join(' · ')+' · 먼저 '+day.reviewTarget+'문제만 확인해요.</p><a class="home-start-link" href="'+esc(day.reviewHref)+'">복습 목록 보기 →</a></div>':'')+'<b>'+esc(day.title)+'</b><p>'+esc(day.description)+'</p><a class="home-start-link" href="'+esc(day.href)+'">활동 시작 →</a></div></li>').join('')+'</ol><small>계획은 학습 결과와 복습 일정에 따라 갱신됩니다. 예상 시간은 풀이 속도에 따라 달라요. 예정된 복습을 미리 풀어도 원래 복습 날짜는 유지됩니다. 이 표는 완료 기록이 아닙니다.</small></details>';
  }
  function dailyPlan(record){
    if(window.StudentSync&&!window.StudentSync.getState().ready)return '';
    const key=profile.grade+'|'+profile.track;if(!bankQuestions.has(key)){bankQuestions.set(key,null);window.ProblemBank.load({surface:'today',grade:profile.grade,track:profile.track}).then(added=>{bankQuestions.set(key,added);render()})}const added=bankQuestions.get(key);if(!added)return '';
    const stats=window.WrongNotes?.stats()||[],diagnostic=window.LearningDiagnostic.weak(profile.grade,profile.track,stats),selected=window.DailySelection.select({questions:tracks[profile.track].questions.concat(added),trackKey:profile.track,date:dateKey(new Date()),grade:profile.grade,stats,diagnostic,notes:window.WrongNotes?.all()||[],record});
    const focus=selected.focus.map(id=>window.TODAY_CONCEPTS?.[id]?.name).filter(Boolean);
    const weak=stats.filter(row=>selected.focus.includes(row.conceptId||row.key)&&row.attempts>0&&row.correct/row.attempts<.6).map(row=>window.TODAY_CONCEPTS?.[row.conceptId||row.key]?.name).filter(Boolean);
    const reason=selected.reused?'오늘 풀었던 같은 문제로 개념을 다시 확인해요.':weak.length?'최근 정답률이 60% 미만인 '+weak.join(' · ')+'을 더 확인해요.':diagnostic.some(id=>selected.focus.includes(id))?'학습 진단에서 다시 확인할 개념을 포함했어요.':focus.length?'복습할 시점인 '+focus.join(' · ')+'을 우선 확인해요.':'이 과목의 기본 개념을 골고루 확인해요.';
    return plan(selected.questions.map(q=>q.concept),reason,selected.questions.length);
  }
  function resume(){
    const state=window.StudentSync?.getState();if(state&&!state.ready)return null;
    const owner=state?.signedIn?"student-"+state.student.id:"guest",notes=window.WrongNotes?.all()||[];
    const row=window.StudyDraft?.list(owner).find(({slot,draft})=>valid(draft.grade,draft.trackKey)&&draft.questions.every(q=>window.TODAY_CONCEPTS?.[q.concept])&&(!slot.startsWith("similar-")||notes.some(note=>note.id===slot.slice(8))));
    if(!row)return null;const {slot,draft}=row,similar=slot.startsWith("similar-"),diagnostic=slot.startsWith('diagnostic-'),practice=slot.startsWith('practice-');
    return{grade:draft.grade,track:draft.trackKey,href:'today.html?'+(similar?'review='+encodeURIComponent(slot.slice(8)):(practice?'practice='+encodeURIComponent(draft.questions[0].concept)+'&':diagnostic?'diagnostic=1&':'')+'grade='+draft.grade+'&subject='+encodeURIComponent(draft.trackKey))+'&resume=1',description:esc(tracks[draft.trackKey].title)+' · '+(similar||practice?(practice?'추천 문제':'확인 문제'):(diagnostic?'학습 진단 · ':'')+(draft.index+1)+' / '+draft.questions.length+'문항')+' · 답과 필기를 이어서 볼 수 있어요.',plan:plan(draft.questions.slice(draft.index).map(q=>q.concept),'저장된 문제와 필기를 그대로 이어서 확인해요.',draft.questions.length-draft.answers.length)};
  }
  function initial(){
    const own=read(KEY,null);if(own&&valid(own.grade,own.track))return own;
    const pref=read("today-study-pref",null);if(pref&&valid(pref.grade,pref.track))return{name:"",grade:String(pref.grade),track:pref.track};
    const latest=records().find(row=>valid(row.grade,row.track));return latest?{name:"",grade:String(latest.grade),track:latest.track}:null;
  }
  let profile=initial();
  function save(next){
    if(window.StudentSync?.canUseLocal?.()===false)throw new Error('계정 기록을 준비한 뒤 학습 설정을 저장해 주세요.');
    profile={...profile,name:String(next.name||"").trim().slice(0,20),grade:String(next.grade),track:next.track,updatedAt:new Date().toISOString()};
    if(Object.hasOwn(next,'className'))profile.className=String(next.className||'');
    localStorage.setItem(KEY,JSON.stringify(profile));localStorage.setItem("today-study-pref",JSON.stringify({grade:profile.grade,track:profile.track,updatedAt:profile.updatedAt}));window.StudentSync?.changed();render();
  }
  // 계정 준비 후 가입 창에서 초기 학습 설정을 저장한다.
  window.HomeProfile={저장:save};
  const pad=n=>String(n).padStart(2,"0"),dateKey=date=>date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate());
  function streak(rows){
    const dates=[...new Set(rows.map(row=>row.date))].sort().reverse();if(!dates.length)return 0;
    const cursor=new Date(),today=dateKey(cursor);let count=0;if(dates[0]!==today)cursor.setDate(cursor.getDate()-1);
    for(const date of dates){if(date!==dateKey(cursor))break;count++;cursor.setDate(cursor.getDate()-1)}return count;
  }

  /* 로그인 전에는 기존 계정의 학습 요약을 노출하지 않는다. */
  /* 단위원 위의 점이 돌면 사인 곡선이 따라 그려지는 그림(index.html 의 #heroArt).
     옛 히어로 칸은 홈에서 숨겨 두었으므로 그림만 이 카드로 옮겨 옵니다. 카드는 로그인·로그아웃 때
     다시 그려지면서 안의 것이 지워지니, 그림을 붙잡아 두었다가 그릴 때마다 다시 넣습니다. */
  const 그림=document.querySelector(".hero-figure");
  function 그림넣기(){const 자리=root.querySelector(".home-start-art");if(그림&&자리)자리.appendChild(그림)}
  function 갈래(pending){
    root.hidden=false;root.innerHTML='<div class="home-personal-shell setup">'+
      '<div class="home-start-card'+(그림?' has-art':'')+'">'+
        '<div class="home-start-art"></div>'+
        '<div class="home-start-body">'+
        '<span class="eyebrow">나의 수학 공부</span><h2>로그인하고<br>내 공부를 이어가세요</h2>'+
        '<p class="home-setup-lead">나에게 맞는 문제를 풀고, 내 오답과 복습 기록을 한곳에서 확인하세요. 계정으로 로그인하면 다른 기기에서도 학습 기록을 이어 볼 수 있습니다.</p>'+
        '<div class="home-entry-benefits"><span>맞춤 5문제</span><span>개인 오답노트</span><span>주간 복습 성과</span></div>'+
        '<div class="home-start-actions">'+
          '<button type="button" class="btn btn-primary home-start-go" id="homeLogin">로그인 →</button>'+
          '<button type="button" class="home-join-btn" id="homeJoin">회원가입</button>'+
        '</div>'+
        '<div class="home-join">'+
          '<div class="home-join-actions">'+
            '<a class="home-start-browse" href="#more">자료 둘러보기</a>'+
            '<a class="home-start-browse" id="homeTry" href="'+(pending?pending.href:'today.html')+'">'+(pending?'체험 학습 이어하기':'가입 없이 체험하기')+'</a>'+
            '<button type="button" class="student-text-action" id="homeRecover">아이디·비밀번호 찾기</button>'+
          '</div>'+
          '<small class="home-fork-note">체험 기록은 이 브라우저에 저장됩니다. 계정 학습 기록은 동기화되며 필기와 임시 풀이는 기기에 보관됩니다.</small>'+
        '</div>'+
        '</div>'+
      '</div></div>';
    그림넣기();
    root.querySelector("#homeJoin").onclick=()=>window.StudentAccountUI?.열기("register");
    root.querySelector("#homeLogin").onclick=()=>window.StudentAccountUI?.열기("login");
    root.querySelector('#homeRecover').onclick=()=>window.StudentAccountUI?.열기('recover');
    root.querySelector('#homeTry').onclick=()=>{try{sessionStorage.setItem('math-home-explore','true')}catch{}};
  }

  /* ---------- 개인 학습 설정 ---------- */
  function setup(seed=profile){
    const grade=seed?.grade||"1",name=seed?.name||"";
    root.hidden=false;root.innerHTML='<div class="home-personal-shell setup">'+
      '<div class="home-fork-card"><span class="eyebrow">내 학습 홈</span><h2>학년·과목 정하기</h2>'+
        '<p>한 번 정하면 다음부터 오늘 풀 5문제와 복습할 것을 바로 보여 줍니다.</p>'+
        '<form id="homeProfileForm" class="home-profile-form">'+
          '<label class="home-profile-name">이름 또는 별명 <input name="name" maxlength="20" value="'+esc(name)+'" placeholder="선택 사항"></label>'+
          '<label>학년 <select name="grade"><option value="1">고1</option><option value="2">고2</option><option value="3">고3</option></select></label>'+
          '<label class="home-profile-track">주로 공부할 과목 <select name="track"></select></label>'+
          '<button class="btn btn-primary" type="submit">시작하기 →</button>'+
        '</form></div></div>';
    const form=root.querySelector("#homeProfileForm"),gradeSelect=form.elements.grade,trackSelect=form.elements.track;
    gradeSelect.value=grade;
    const fillTracks=selected=>{const list=Object.entries(tracks).filter(([,track])=>track.grades.includes(gradeSelect.value));trackSelect.innerHTML=list.map(([id,track])=>'<option value="'+esc(id)+'">'+esc(track.title)+'</option>').join("");if(list.some(([id])=>id===selected))trackSelect.value=selected};
    fillTracks(seed?.track);gradeSelect.addEventListener("change",()=>fillTracks(""));
    form.addEventListener("submit",event=>{event.preventDefault();save({name:form.elements.name.value,grade:gradeSelect.value,track:trackSelect.value})});
  }

  function render(){
    const account=window.StudentSync?.getState();root.hidden=false;
    if(account&&!account.ready){root.innerHTML='<div class="home-personal-shell"><p role="status">내 계정을 확인하고 있어요…</p></div>';return}
    if(window.StudentSync?.canUseLocal?.()===false){root.innerHTML='<div class="home-personal-shell"><p role="alert">'+esc(account?.error||'계정 기록을 준비하지 못했습니다. 다시 불러와 주세요.')+'</p><button type="button" class="btn btn-primary" id="retryAccount">기록 다시 불러오기</button></div>';root.querySelector('button').onclick=()=>account?.signedIn?window.StudentSync.sync():window.StudentSync.start();return}
    let exploring=false;try{exploring=sessionStorage.getItem('math-home-explore')==='true'}catch{}
    if(!account?.signedIn&&!exploring){갈래(resume());return}
    const pending=resume();
    if(pending&&!valid(profile?.grade,profile?.track))profile={name:"",grade:pending.grade,track:pending.track};
    if(!profile||!valid(profile.grade,profile.track)){
      // 로그인은 했는데 학년·과목이 아직 없으면, 문 두 개가 아니라 고르는 칸을 보여 줍니다
      setup();
      return;
    }
    const track=tracks[profile.track],all=records().filter(row=>String(row.grade)===profile.grade&&row.track===profile.track),recent=all.slice(0,7);
    const today=all.find(row=>row.date===dateKey(new Date())),average=recent.length?Math.round(recent.reduce((sum,row)=>sum+(Number(row.correct)||0)/(Number(row.total)||5)*100,0)/recent.length):0,run=streak(all);
    const wrong=window.WrongNotes?.count?.()||{active:0,due:0,mastered:0};
    const greeting=profile.name?esc(profile.name)+"님, 오늘도 한 걸음씩":"오늘의 수학 공부";
    const review=wrong.due>0;
    const actionHref=pending?pending.href:review?'wrong-notes.html?view=due':'today.html?grade='+profile.grade+'&subject='+encodeURIComponent(profile.track);
    const actionTitle=pending?'풀던 문제 이어하기':review?'오늘 복습할 '+wrong.due+'문제 풀기':today?'오늘의 5문제 다시 풀기':'오늘의 5문제 풀기';
    const actionDescription=pending?pending.description:review?'복습할 날짜가 된 문제를 먼저 확인해 보세요.':today?'한 번 더 풀며 개념을 확인해 보세요.':'약 5분 동안 '+esc(track.title)+'의 핵심 개념을 확인해 보세요.';
    const dueNotes=review?window.WrongNotes.all().filter(window.WrongNotes.due):[];
    const learning=pending?pending.plan:review?plan(dueNotes.map(note=>note.conceptId),'복습할 날짜가 된 오답을 다시 풀어 개념을 확인해요.',dueNotes.length):dailyPlan(today);
    const recovered=window.StudentSync&&!window.StudentSync.getState().ready?[]:window.WrongNotes.recentReviews(),completed=recovered.filter(note=>note.mastered&&note.reviewStage===4).length;
    const names=[...new Set(recovered.map(note=>window.TODAY_CONCEPTS?.[note.conceptId]?.name||note.conceptName||'수학'))];
    const growth=recovered.length?'<section class="review-growth" aria-label="최근 복습 성과"><strong>최근 7일 동안 오답 '+recovered.length+'문제를 다시 맞혔어요.</strong><p>'+names.slice(0,3).map(esc).join(' · ')+(names.length>3?' 외 '+(names.length-3)+'개':'')+(completed?' · 마지막 확인까지 완료 '+completed+'문제':'')+'</p><small>보관 중인 오답의 마지막 복습 확인 기준입니다.</small></section>':'';
    const weekly=window.StudentSync&&!window.StudentSync.getState().ready?null:window.StudyState.reviewSummary(window.WrongNotes.all());
    const weekView=weekly?'<details class="review-weekly" id="homeReviewWeekly"><summary>주간 복습 성과 보기</summary><p>'+weekly.startDate+' ~ '+weekly.endDate+' · 한국 시간</p><p>정답 확인 '+weekly.confirmed+'문제 · 최종 완료 '+weekly.completed+'문제</p><p>오늘 복습 '+weekly.due+'문제</p><table><caption>날짜별 마지막 복습 확인</caption><thead><tr><th scope="col">날짜</th><th scope="col">정답 확인</th><th scope="col">최종 완료</th></tr></thead><tbody>'+weekly.days.map(day=>'<tr><th scope="row">'+day.date.slice(5)+'</th><td>'+day.confirmed+'문제</td><td>'+day.completed+'문제</td></tr>').join('')+'</tbody></table><ul>'+weekly.concepts.map(row=>'<li>'+esc(window.TODAY_CONCEPTS?.[row.conceptId]?.name||row.name)+' · 정답 확인 '+row.confirmed+' · 최종 완료 '+row.completed+'</li>').join('')+'</ul><small>'+(weekly.confirmed?'':'이번 기간에 보관된 복습 정답 확인이 없습니다. ')+'현재 보관 중인 오답별 마지막 확인을 한 번 집계합니다. 삭제하거나 다시 틀린 노트는 제외하며, 전체 시도 횟수가 아닙니다.</small></details>':'';

    const diagnostic=window.LearningDiagnostic.read(profile.grade,profile.track),diagnosticSummary=diagnostic?'<p>최근 진단 · 정답 '+diagnostic.answers.filter(a=>a.correct).length+' · 다시 확인 '+diagnostic.answers.filter(a=>!a.correct&&!a.skipped).length+' · 미학습 '+diagnostic.answers.filter(a=>a.skipped).length+'</p><p>다시 확인할 개념: '+([...new Set(diagnostic.answers.filter(a=>!a.correct&&!a.skipped).map(a=>window.TODAY_CONCEPTS[a.concept].name))].map(esc).join(' · ')||'없음')+'</p>':'';
    const next=window.LearningDiagnostic.recommendation(profile.grade,profile.track),level={basic:'기초',standard:'표준',challenge:'도전'};
    const nextView=next?'<section class="learning-next"><h3>다음 추천 학습 · '+esc(next.name)+'</h3><p>'+esc(next.reason)+'</p><a class="home-start-link" href="'+esc(next.review?'wrong-notes.html?view=due':next.unlearned?next.mapHref:next.practiceHref)+'">'+(next.review?'오답 먼저 복습하기':next.unlearned?'개념부터 살펴보기':level[next.level]+' 1문항 풀기')+' →</a>'+(next.unlearned?'<a class="home-start-link" href="'+esc(next.practiceHref)+'">배웠다면 기초 1문항 →</a>':'')+'</section>':'';
    root.hidden=false;root.innerHTML='<div class="home-personal-shell"><div class="home-personal-head"><div><span class="eyebrow">'+(account?.signedIn?'내 학습 홈':'체험 학습 · 이 브라우저에 저장')+'</span><h2>'+greeting+'</h2><p>고'+profile.grade+' 과정 · '+esc(track.title)+'</p></div><button type="button" id="homeProfileEdit">학습 설정</button></div>'+
      '<a class="home-main-action" href="'+actionHref+'"><span>지금 할 공부</span><strong>'+actionTitle+'</strong><small>'+actionDescription+'</small>'+learning+'<b>'+(pending?'이어서 풀기':'시작하기')+' →</b></a>'+
      '<div class="home-study-summary" aria-label="나의 학습 기록"><span>최근 평균 <b>'+(recent.length?average+'%':'기록 전')+'</b></span><span>연속 학습 <b>'+run+'일</b></span><span>오늘 복습할 문제 <b>'+wrong.due+'문제</b></span><span>전체 미완료 오답 <b>'+wrong.active+'문제</b></span></div>'+
      growth+weekView+(account?.signedIn?weeklyPlanView(window.LearningDiagnostic.weeklyPlan(profile.grade,profile.track))+'<details class="review-weekly"><summary>나의 학습 진단'+(next?' · 추천 학습':'')+'</summary>'+diagnosticSummary+nextView+'<p>5문항으로 기본 개념을 확인해요. 오늘의 학습 점수와 오답 기록에는 포함하지 않습니다.</p><a class="home-start-link" href="today.html?diagnostic=1&grade='+profile.grade+'&subject='+encodeURIComponent(profile.track)+'">'+(diagnostic?'진단 다시하기':'학습 진단 시작')+' →</a></details>':'')+'</div>';
    root.querySelector("#homeProfileEdit").addEventListener("click",()=>setup(profile));
    if(new URLSearchParams(location.search).get('weekly')==='review')root.querySelector('#homeReviewWeekly').open=true;
  }
  window.addEventListener("wrong-notes-change",render);
  window.addEventListener("student-account-change",()=>{profile=initial();render()});
  window.addEventListener("student-sync-applied",()=>{profile=initial();render()});render();
  window.addEventListener("pageshow",()=>{profile=initial();render()});window.addEventListener("storage",render);
})();
