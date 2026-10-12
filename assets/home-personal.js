/* =========================================================
   홈 첫 화면 — 손대지 않아도 됩니다.

   큰 문은 하나입니다.
     오늘의 5문제 풀기 → 아무것도 안 정하고 바로. 기록은 이 기기에만 쌓입니다
     (그 옆 글줄 '다른 것 둘러보기' → 사이트 전체 목록)
   그 아래 한 줄로:
     가입하기 → 기록이 계정에 남아 다른 기기에서도 이어집니다

   고른 뒤에는 가입 이야기를 다시 꺼내지 않습니다. 한때 기록이 쌓이면
   '이 기기에만 있습니다' 하는 줄을 띄웠는데, 닫을 수가 없어서 가입 생각이
   없는 학생에게는 계속 붙어 있는 잔소리가 됐습니다.
   ========================================================= */
(function(){
  "use strict";
  const KEY="math-home-profile-v1",root=document.getElementById("homePersonal"),tracks=window.TODAY_TRACKS||{};
  if(!root)return;
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const valid=(grade,track)=>["1","2","3"].includes(String(grade))&&tracks[track]?.grades.includes(String(grade));
  const records=()=>{const value=read("today-study-records",[]);return Array.isArray(value)?value:[]};
  const 로그인했나=()=>Boolean(window.StudentSync?.getState?.().signedIn);
  function resume(){
    const state=window.StudentSync?.getState();if(state&&!state.ready)return null;
    const owner=state?.signedIn?"student-"+state.student.id:"guest",notes=window.WrongNotes?.all()||[];
    const row=window.StudyDraft?.list(owner).find(({slot,draft})=>valid(draft.grade,draft.trackKey)&&draft.questions.every(q=>window.TODAY_CONCEPTS?.[q.concept])&&(!slot.startsWith("similar-")||notes.some(note=>note.id===slot.slice(8))));
    if(!row)return null;const {slot,draft}=row,similar=slot.startsWith("similar-");
    return{grade:draft.grade,track:draft.trackKey,href:'today.html?'+(similar?'review='+encodeURIComponent(slot.slice(8)):'grade='+draft.grade+'&subject='+encodeURIComponent(draft.trackKey))+'&resume=1',description:esc(tracks[draft.trackKey].title)+' · '+(similar?'확인 문제':(draft.index+1)+' / '+draft.questions.length+'문항')+' · 답과 필기를 이어서 볼 수 있어요.'};
  }
  function initial(){
    const own=read(KEY,null);if(own&&valid(own.grade,own.track))return own;
    const pref=read("today-study-pref",null);if(pref&&valid(pref.grade,pref.track))return{name:"",grade:String(pref.grade),track:pref.track};
    const latest=records().find(row=>valid(row.grade,row.track));return latest?{name:"",grade:String(latest.grade),track:latest.track}:null;
  }
  let profile=initial();
  function save(next){
    const classNumber=Math.min(20,Math.max(0,Number(next.className)||0));
    profile={name:String(next.name||"").trim().slice(0,20),grade:String(next.grade),className:classNumber?String(classNumber):"",track:next.track,updatedAt:new Date().toISOString()};
    localStorage.setItem(KEY,JSON.stringify(profile));localStorage.setItem("today-study-pref",JSON.stringify({grade:profile.grade,track:profile.track,updatedAt:profile.updatedAt}));window.StudentSync?.changed();render();
  }
  // 가입 창이 학년·과목을 먼저 적어 둘 때 씁니다 (그래야 가입 직후 계정으로 올라갑니다)
  window.HomeProfile={저장:save};
  const pad=n=>String(n).padStart(2,"0"),dateKey=date=>date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate());
  function streak(rows){
    const dates=[...new Set(rows.map(row=>row.date))].sort().reverse();if(!dates.length)return 0;
    const cursor=new Date(),today=dateKey(cursor);let count=0;if(dates[0]!==today)cursor.setDate(cursor.getDate()-1);
    for(const date of dates){if(date!==dateKey(cursor))break;count++;cursor.setDate(cursor.getDate()-1)}return count;
  }

  /* ---------- 처음 온 학생 — 큰 문 하나, 가입은 그 아래 한 줄 ----------
     전에는 '가입하고 시작'과 '그냥 둘러보기'를 칸 둘로 나란히 뒀는데, 처음 온
     학생은 여기가 뭐 하는 곳인지도 모른 채 가입부터 고르게 됐습니다.
     가입 없이도 다 쓸 수 있으니 오늘의 5문제를 큰 문으로, 둘러보기는 그 옆 글줄로,
     가입은 필요할 때만. (둘러보기를 큰 문으로 뒀더니 5문제까지 세 번을 눌러야 했습니다) */
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
        '<h2>고등학교 수학, 한곳에서</h2>'+
        '<p class="home-setup-lead">'+(pending?pending.description:'하루 5분, 학년에 맞춘 5문제부터 풀어 보세요. 틀린 문제는 오답노트에 저절로 모입니다. 가입 없이 바로 쓸 수 있습니다.')+'</p>'+
        '<div class="home-start-actions">'+
          '<a class="btn btn-primary home-start-go" href="'+(pending?pending.href:'today.html')+'">'+(pending?'풀던 문제 이어하기':'오늘의 5문제 풀기')+' →</a>'+
          '<a class="home-start-browse" href="#more">다른 것 둘러보기</a>'+
        '</div>'+
        '<div class="home-join">'+
          '<p>폰과 학교 컴퓨터에서 <b>기록을 이어 보려면</b> 가입하세요. 안 하면 기록이 이 기기에만 남습니다.</p>'+
          '<div class="home-join-actions">'+
            '<button type="button" class="home-join-btn" id="homeJoin">가입하기</button>'+
            '<button type="button" class="home-fork-login" id="homeLogin">이미 계정이 있어요 · 로그인</button>'+
          '</div>'+
          '<small class="home-fork-note">가입하면 선생님이 학습 기록을 봅니다. 질문은 그대로 익명입니다.</small>'+
        '</div>'+
        '</div>'+
      '</div></div>';
    그림넣기();
    root.querySelector("#homeJoin").onclick=()=>window.StudentAccountUI?.열기("register");
    root.querySelector("#homeLogin").onclick=()=>window.StudentAccountUI?.열기("login");
  }

  /* ---------- 학년·반·과목 고르기 ---------- */
  function setup(seed=profile){
    const grade=seed?.grade||"1",name=seed?.name||"",className=seed?.className||"";
    root.hidden=false;root.innerHTML='<div class="home-personal-shell setup">'+
      '<div class="home-fork-card"><span class="eyebrow">내 학습 홈</span><h2>학년·과목 정하기</h2>'+
        '<p>한 번 정하면 다음부터 오늘 풀 5문제와 복습할 것을 바로 보여 줍니다.</p>'+
        '<form id="homeProfileForm" class="home-profile-form">'+
          '<label class="home-profile-name">이름 또는 별명 <input name="name" maxlength="20" value="'+esc(name)+'" placeholder="선택 사항"></label>'+
          '<label>학년 <select name="grade"><option value="1">고1</option><option value="2">고2</option><option value="3">고3</option></select></label>'+
          '<label>반 <input name="className" type="number" inputmode="numeric" min="1" max="20" value="'+esc(className)+'" placeholder="선택"></label>'+
          '<label class="home-profile-track">주로 공부할 과목 <select name="track"></select></label>'+
          '<button class="btn btn-primary" type="submit">시작하기 →</button>'+
        '</form></div></div>';
    const form=root.querySelector("#homeProfileForm"),gradeSelect=form.elements.grade,trackSelect=form.elements.track;
    gradeSelect.value=grade;
    const fillTracks=selected=>{const list=Object.entries(tracks).filter(([,track])=>track.grades.includes(gradeSelect.value));trackSelect.innerHTML=list.map(([id,track])=>'<option value="'+esc(id)+'">'+esc(track.title)+'</option>').join("");if(list.some(([id])=>id===selected))trackSelect.value=selected};
    fillTracks(seed?.track);gradeSelect.addEventListener("change",()=>fillTracks(""));
    form.addEventListener("submit",event=>{event.preventDefault();save({name:form.elements.name.value,grade:gradeSelect.value,className:form.elements.className.value,track:trackSelect.value})});
  }

  function render(){
    const pending=resume();
    if(pending&&로그인했나()&&!valid(profile?.grade,profile?.track))profile={name:"",grade:pending.grade,track:pending.track};
    if(!profile||!valid(profile.grade,profile.track)){
      // 로그인은 했는데 학년·과목이 아직 없으면, 문 두 개가 아니라 고르는 칸을 보여 줍니다
      로그인했나()&&!pending?setup():갈래(pending);
      return;
    }
    const track=tracks[profile.track],all=records().filter(row=>String(row.grade)===profile.grade&&row.track===profile.track),recent=all.slice(0,7);
    const today=all.find(row=>row.date===dateKey(new Date())),average=recent.length?Math.round(recent.reduce((sum,row)=>sum+(Number(row.correct)||0)/(Number(row.total)||5)*100,0)/recent.length):0,run=streak(all);
    const wrong=window.WrongNotes?.count?.()||{active:0,mastered:0};
    const greeting=profile.name?esc(profile.name)+"님, 오늘도 한 걸음씩":"오늘의 수학 공부";
    const review=wrong.due>0;
    const actionHref=pending?pending.href:review?'wrong-notes.html?view=due':'today.html?grade='+profile.grade+'&subject='+encodeURIComponent(profile.track);
    const actionTitle=pending?'풀던 문제 이어하기':review?'오늘 복습할 '+wrong.due+'문제 풀기':today?'오늘의 5문제 다시 풀기':'오늘의 5문제 풀기';
    const actionDescription=pending?pending.description:review?'복습할 날짜가 된 문제를 먼저 확인해 보세요.':today?'한 번 더 풀며 개념을 확인해 보세요.':'약 5분 동안 '+esc(track.title)+'의 핵심 개념을 확인해 보세요.';

    root.hidden=false;root.innerHTML='<div class="home-personal-shell"><div class="home-personal-head"><div><span class="eyebrow">오늘</span><h2>'+greeting+'</h2><p>고'+profile.grade+(profile.className?' '+esc(profile.className)+'반':'')+' · '+esc(track.title)+'</p></div><button type="button" id="homeProfileEdit">학년·반·과목 변경</button></div>'+
      '<a class="home-main-action" href="'+actionHref+'"><span>지금 할 공부</span><strong>'+actionTitle+'</strong><small>'+actionDescription+'</small><b>'+(pending?'이어서 풀기':'시작하기')+' →</b></a>'+
      '<div class="home-study-summary" aria-label="나의 학습 기록"><span>최근 평균 <b>'+(recent.length?average+'%':'기록 전')+'</b></span><span>연속 학습 <b>'+run+'일</b></span><span>복습 대기 <b>'+wrong.active+'문제</b></span></div>'+
      '</div>';
    root.querySelector("#homeProfileEdit").addEventListener("click",()=>setup(profile));
  }
  window.addEventListener("wrong-notes-change",render);
  window.addEventListener("student-account-change",render);
  window.addEventListener("student-sync-applied",()=>{profile=initial();render()});render();
  window.addEventListener("pageshow",()=>{profile=initial();render()});window.addEventListener("storage",render);
})();
