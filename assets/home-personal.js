(function(){
  "use strict";
  const KEY="math-home-profile-v1",root=document.getElementById("homePersonal"),tracks=window.TODAY_TRACKS||{};
  if(!root)return;
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const valid=(grade,track)=>["1","2","3"].includes(String(grade))&&tracks[track]?.grades.includes(String(grade));
  const records=()=>{const value=read("today-study-records",[]);return Array.isArray(value)?value:[]};
  function initial(){
    const own=read(KEY,null);if(own&&valid(own.grade,own.track))return own;
    const pref=read("today-study-pref",null);if(pref&&valid(pref.grade,pref.track))return{name:"",grade:String(pref.grade),track:pref.track};
    const latest=records().find(row=>valid(row.grade,row.track));return latest?{name:"",grade:String(latest.grade),track:latest.track}:null;
  }
  let profile=initial();
  function save(next){
    const classNumber=Math.min(20,Math.max(0,Number(next.className)||0));
    profile={name:String(next.name||"").trim().slice(0,20),grade:String(next.grade),className:classNumber?String(classNumber):"",track:next.track};
    localStorage.setItem(KEY,JSON.stringify(profile));localStorage.setItem("today-study-pref",JSON.stringify({grade:profile.grade,track:profile.track}));window.StudentSync?.changed();render();
  }
  const pad=n=>String(n).padStart(2,"0"),dateKey=date=>date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate());
  function streak(rows){
    const dates=[...new Set(rows.map(row=>row.date))].sort().reverse();if(!dates.length)return 0;
    const cursor=new Date(),today=dateKey(cursor);let count=0;if(dates[0]!==today)cursor.setDate(cursor.getDate()-1);
    for(const date of dates){if(date!==dateKey(cursor))break;count++;cursor.setDate(cursor.getDate()-1)}return count;
  }
  function setup(seed=profile){
    const grade=seed?.grade||"1",name=seed?.name||"",className=seed?.className||"",available=Object.entries(tracks).filter(([,track])=>track.grades.includes(grade));
    root.hidden=false;root.innerHTML='<div class="home-personal-shell setup"><div class="home-personal-intro"><span class="eyebrow">MY HOME</span><h2>내 학습 홈 만들기</h2><p>학년·반과 과목을 한 번 정하면 다음 방문부터 오늘 할 공부와 복습할 내용을 바로 보여 줍니다.</p></div><form id="homeProfileForm" class="home-profile-form"><label class="home-profile-name">이름 또는 별명 <input name="name" maxlength="20" value="'+esc(name)+'" placeholder="선택 사항"></label><label>학년 <select name="grade"><option value="1">고1</option><option value="2">고2</option><option value="3">고3</option></select></label><label>반 <input name="className" type="number" inputmode="numeric" min="1" max="20" value="'+esc(className)+'" placeholder="선택"></label><label class="home-profile-track">주로 공부할 과목 <select name="track"></select></label><button class="btn btn-primary" type="submit">내 학습 홈 시작 →</button></form></div>';
    const form=root.querySelector("#homeProfileForm"),gradeSelect=form.elements.grade,trackSelect=form.elements.track;
    gradeSelect.value=grade;
    const fillTracks=selected=>{const list=Object.entries(tracks).filter(([,track])=>track.grades.includes(gradeSelect.value));trackSelect.innerHTML=list.map(([id,track])=>'<option value="'+esc(id)+'">'+esc(track.title)+'</option>').join("");if(list.some(([id])=>id===selected))trackSelect.value=selected};
    fillTracks(seed?.track);gradeSelect.addEventListener("change",()=>fillTracks(""));
    form.addEventListener("submit",event=>{event.preventDefault();save({name:form.elements.name.value,grade:gradeSelect.value,className:form.elements.className.value,track:trackSelect.value})});
  }
  function render(){
    if(!profile||!valid(profile.grade,profile.track)){setup();return}
    const track=tracks[profile.track],all=records().filter(row=>String(row.grade)===profile.grade&&row.track===profile.track),recent=all.slice(0,7);
    const today=all.find(row=>row.date===dateKey(new Date())),average=recent.length?Math.round(recent.reduce((sum,row)=>sum+(Number(row.correct)||0)/(Number(row.total)||5)*100,0)/recent.length):0,run=streak(all);
    const wrong=window.WrongNotes?.count?.()||{active:0,mastered:0},performance=window.WrongNotes?.performance?.()||{},weak=performance.weakest;
    const greeting=profile.name?esc(profile.name)+"의 수학 홈":"고"+profile.grade+" 학습 홈";
    root.hidden=false;root.innerHTML='<div class="home-personal-shell"><div class="home-personal-head"><div><span class="eyebrow">MY HOME</span><h2>'+greeting+'</h2><p>고'+profile.grade+(profile.className?' '+esc(profile.className)+'반':'')+' · '+esc(track.title)+' 기준으로 오늘 필요한 학습을 모았습니다.</p></div><button type="button" id="homeProfileEdit">학년·반·과목 변경</button></div><div class="home-personal-grid">'+
      '<a class="home-personal-card today" href="today.html?grade='+profile.grade+'&subject='+encodeURIComponent(profile.track)+'"><span>오늘의 학습</span><strong>'+(today?today.correct+'/'+today.total:'5문제')+'</strong><p>'+(today?'오늘 학습 완료 · 다시 도전할 수 있어요.':'약 5분이면 오늘의 진단을 마칠 수 있어요.')+'</p><b>'+(today?'다시 풀기':'시작하기')+' →</b></a>'+
      '<a class="home-personal-card record" href="today.html?grade='+profile.grade+'&subject='+encodeURIComponent(profile.track)+'"><span>최근 학습 기록</span><strong>'+(recent.length?average+'%':'기록 전')+'</strong><p>'+(recent.length?'최근 '+recent.length+'회 평균 · 연속 학습 '+run+'일':'첫 학습을 마치면 평균과 연속 기록이 보여요.')+'</p><b>학습 이어가기 →</b></a>'+
      '<a class="home-personal-card wrong" href="wrong-notes.html"><span>복습할 오답</span><strong>'+wrong.active+'문제</strong><p>'+(weak?'취약 개념: '+esc(weak.name)+' · 정답률 '+weak.rate+'%':'틀린 문제가 생기면 자동으로 모아 드려요.')+'</p><b>오답 복습 →</b></a>'+
      '<a class="home-personal-card exam" href="files.html?grade='+profile.grade+'"><span>내 학년 기출</span><strong>고'+profile.grade+'</strong><p>'+esc(track.title)+' 학습과 함께 최근 3개년 기출을 확인하세요.</p><b>기출 보기 →</b></a>'+
      '</div></div>';
    root.querySelector("#homeProfileEdit").addEventListener("click",()=>setup(profile));
  }
  window.addEventListener("wrong-notes-change",render);window.addEventListener("student-sync-applied",()=>{profile=initial();render()});render();
})();
