(function(){
  "use strict";
  const app=document.getElementById('pastApp'),model=window.PastPracticeModel,tracks=window.TODAY_TRACKS,concepts=window.TODAY_CONCEPTS;
  const params=new URLSearchParams(location.search),levels=model.levels;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url=value=>{try{const u=new URL(value,location.href);return ['https:','http:'].includes(u.protocol)?esc(u.href):'#'}catch{return '#'}};
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
  let rows=[],catalog,review,touched=false,initialized=false,lastAccount=null;
  const explicit=['grade','subject','concept','topic','difficulty'].some(k=>params.has(k));
  app.innerHTML='<header class="page-head g-study"><span class="page-head-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12h5M10 16h5"/></svg></span><div class="page-head-text"><h1>자동 선별 기출</h1><p>학년·과목 → 세부 개념 → 난도를 고르고, 실제 기출로 연습하세요.</p></div></header>'+
    '<p id="pastContext" class="past-context" role="status"></p><form id="pastChooser" class="past-chooser">'+
    '<fieldset><legend><span>1</span> 학년·과목</legend><div class="past-course-fields"><label for="pastGrade">학년<select id="pastGrade" required><option value="">학년 선택</option><option value="1">1학년</option><option value="2">2학년</option><option value="3">3학년</option></select></label><label for="pastTrack">과목<select id="pastTrack" required disabled><option value="">과목 선택</option></select></label></div></fieldset>'+
    '<fieldset><legend><span>2</span> 세부 개념</legend><label for="pastConcept" class="past-field-label">연습할 개념<select id="pastConcept" required disabled><option value="">개념 선택</option></select></label></fieldset>'+
    '<fieldset><legend><span>3</span> 난도</legend><div class="past-levels">'+Object.entries(levels).map(([id,name])=>'<label class="past-level"><input type="radio" name="pastDifficulty" value="'+id+'" required><span>'+name+' <small data-count="'+id+'"></small></span></label>').join('')+'</div><p class="past-level-note">기초: 기본 적용 · 표준: 조건 해석과 풀이 연결 · 도전: 경우 분류와 전략 구성</p></fieldset>'+
    '<button class="past-button" id="pastShow" type="submit" disabled>문제 보기 →</button><p class="past-selection-status" id="pastSelectionStatus" role="status" aria-live="polite">기출 목록을 불러오고 있어요.</p></form>'+
    '<section id="pastResults" aria-labelledby="pastResultsHeading" hidden></section>';
  const form=app.querySelector('form'),grade=app.querySelector('#pastGrade'),track=app.querySelector('#pastTrack'),concept=app.querySelector('#pastConcept'),results=app.querySelector('#pastResults'),status=app.querySelector('#pastSelectionStatus'),context=app.querySelector('#pastContext');
  function choice(){const [id,topic='']=concept.value.split('::');return{grade:grade.value,track:track.value,concept:id,topic,difficulty:form.querySelector('[name=pastDifficulty]:checked')?.value||''}}
  function fillTracks(value=''){
    const ids=Object.keys(tracks).filter(id=>model.validCourse(grade.value,id));
    track.innerHTML='<option value="">과목 선택</option>'+ids.map(id=>'<option value="'+id+'">'+esc(tracks[id].title)+'</option>').join('');
    track.disabled=!grade.value;if(ids.includes(value))track.value=value;
  }
  function fillConcepts(value=''){
    const ids=model.conceptIds(track.value);
    concept.innerHTML='<option value="">개념 선택</option>'+ids.map(id=>{
      const topics=[...new Set(rows.filter(row=>row.concept===id).map(row=>row.topic))];
      return '<optgroup label="'+esc(concepts[id].name)+'"><option value="'+id+'">'+esc(concepts[id].name)+' · 전체</option>'+topics.map(t=>'<option value="'+esc(id+'::'+t)+'">'+esc(t)+'</option>').join('')+'</optgroup>';
    }).join('');
    concept.disabled=!track.value;if([...concept.options].some(o=>o.value===value))concept.value=value;
  }
  function update(){
    results.hidden=true;results.innerHTML='';
    const c=choice(),pool=model.matching(rows,c);
    for(const id of Object.keys(levels))form.querySelector('[data-count="'+id+'"]').textContent=c.concept?pool.filter(row=>row.difficulty===id).length+'문항':'';
    app.querySelector('#pastShow').disabled=!initialized||!model.validCourse(c.grade,c.track)||!c.concept||!c.difficulty;
    status.textContent=!initialized?'기출 목록을 불러오고 있어요.':!c.grade?'학년부터 선택해 주세요.':!c.track?'과목을 선택해 주세요.':!c.concept?'연습할 세부 개념을 선택해 주세요.':!c.difficulty?'기초·표준·도전 중 하나를 선택해 주세요.':'선택한 난도에서 최대 3문항을 골라요. 날짜별로 순환하며, 문항이 적으면 같은 문제가 나올 수 있어요.';
  }
  function seed(){
    if(!initialized)return;
    const account=window.StudentSync?.getState(),identity=account?.ready?(account.signedIn?'student-'+account.student?.id:'guest'):null;
    if(identity&&lastAccount&&identity!==lastAccount){touched=false;results.innerHTML='';results.hidden=true}
    if(identity)lastAccount=identity;
    if(touched)return;
    const canRead=account?.ready&&window.StudentSync.canUseLocal();
    const profile=canRead?read('math-home-profile-v1',null):null,pref=canRead?read('today-study-pref',null):null;
    let recs=[];
    if(canRead){try{recs=window.DiagnosticAnalysis.summary(profile,Date.now(),window.WrongNotes?.stats()||[],window.WrongNotes?.all()||[])}catch{/* 잘못된 옛 기록이 있어도 공개 기출은 직접 고를 수 있습니다. */}}
    const c=model.context(params,profile,pref,recs);
    grade.value=['1','2','3'].includes(c.grade)?c.grade:'';fillTracks(c.track);fillConcepts(c.concept+(c.topic?'::'+c.topic:''));
    form.querySelectorAll('[name=pastDifficulty]').forEach(el=>el.checked=el.value===c.difficulty);
    context.textContent=explicit?'학습 링크의 선택을 가져왔어요. 개념과 난도를 바꿔 연습할 수 있습니다.':c.reason?'추천: '+c.reason:profile||pref?'저장된 학년·과목을 가져왔어요. 연습할 개념과 난도를 골라 주세요.':'원하는 학년과 과목부터 골라 주세요.';
    update();
    if(explicit&&((params.has('grade')&&!grade.value)||(params.has('subject')&&!track.value)||(params.has('concept')&&!concept.value)||(params.has('difficulty')&&!Object.hasOwn(levels,c.difficulty))))context.textContent='링크의 학년·과목·개념·난도가 서로 맞지 않거나 지원하지 않는 값입니다. 아래에서 다시 골라 주세요.';
    if(explicit&&grade.value&&track.value&&concept.value&&Object.hasOwn(levels,c.difficulty))show(false);
  }
  function canonical(c){const p=new URLSearchParams({grade:c.grade,subject:c.track,concept:c.concept,difficulty:c.difficulty});if(c.topic)p.set('topic',c.topic);return 'past-practice.html?'+p.toString()}
  function show(focus=true){
    const c=choice();if(!model.validCourse(c.grade,c.track)||!c.concept||!Object.hasOwn(levels,c.difficulty))return;
    const selected=model.select(rows,c),available=model.matching(rows,c).filter(r=>r.difficulty===c.difficulty).length;
    const returnUrl=canonical(c),exams=new Map(catalog.items.map(exam=>[exam.id,exam]));
    history.replaceState(null,'',returnUrl);
    const heading='<h2 id="pastResultsHeading" tabindex="-1">'+esc(c.topic||concepts[c.concept].name)+' · '+levels[c.difficulty]+'</h2><p class="past-result-meta">고'+c.grade+' · '+esc(tracks[c.track].title)+' · 검토된 '+available+'문항 중 '+selected.length+'문항</p>';
    const cards=selected.map((row,i)=>{
      const exam=exams.get(row.exam),set=exam.sets.find(s=>s.subject===row.subject),problem=set.files.problem,solution=set.files.solution;
      const back=encodeURIComponent(returnUrl),solve='solve.html?id='+encodeURIComponent(exam.id)+'&amp;subject='+encodeURIComponent(row.subject)+'&amp;page='+row.page+'&amp;back='+back;
      return '<article class="past-card"><div class="past-card-top"><span>'+levels[row.difficulty]+' · '+(i+1)+'</span><b>'+esc(exam.examYear+'년 '+exam.title)+' · '+row.number+'번</b></div><div class="past-number">'+row.number+'번</div><h3>'+esc(row.topic)+'</h3><p>'+esc(concepts[row.concept].name)+' · '+esc(row.subject)+'</p><details class="past-reason"><summary>난도 분류 이유</summary><p>'+esc(row.reason)+'</p></details><div class="past-actions">'+(problem.format==='pdf'?'<a class="past-button" href="'+solve+'">바로 풀기 · '+row.page+'쪽 →</a>':'<a class="past-button" target="_blank" rel="noopener" href="'+url(problem.url)+'">문제 원문 열기 ↗</a>')+(solution?'<a class="past-button secondary" target="_blank" rel="noopener" href="'+url(solution.url)+'">정답·해설 열기 ↗</a>':'')+'</div></article>';
    }).join('');
    results.innerHTML=heading+(selected.length?'<p class="past-guide">문제를 푼 뒤 정답·해설을 확인하세요. 필기는 이 기기에 저장됩니다.</p><div class="past-list">'+cards+'</div>':'<div class="past-empty"><p>이 개념에는 아직 '+levels[c.difficulty]+'로 분류한 기출이 없습니다.</p><p>다른 난도나 개념을 선택해 주세요. 선택하지 않은 난도의 문제는 섞지 않습니다.</p></div>')+'<div class="past-bottom"><a class="past-button secondary" href="map.html?grade='+c.grade+'&amp;n='+encodeURIComponent(c.concept)+'">개념 지도 보기</a><a class="past-button secondary" href="today.html?grade='+c.grade+'&amp;subject='+encodeURIComponent(c.track)+'">오늘의 학습으로</a></div>';
    results.hidden=false;status.textContent=selected.length?'선택한 조건으로 '+selected.length+'문항을 골랐어요.':'선택한 조건에 해당하는 문항이 없습니다.';
    if(focus){results.querySelector('h2').focus({preventScroll:true});results.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}
  }
  grade.addEventListener('change',()=>{touched=true;fillTracks();fillConcepts();form.querySelectorAll('[name=pastDifficulty]').forEach(el=>el.checked=false);context.textContent='';update()});
  track.addEventListener('change',()=>{touched=true;fillConcepts();context.textContent='';update()});
  concept.addEventListener('change',()=>{touched=true;context.textContent='';update()});
  form.querySelectorAll('[name=pastDifficulty]').forEach(el=>el.addEventListener('change',()=>{touched=true;update()}));
  form.addEventListener('submit',e=>{e.preventDefault();touched=true;show()});
  async function load(){
    try{
      const fetchJson=async path=>{const r=await fetch(path);if(!r.ok)throw Error(path);return r.json()};
      [catalog,review]=await Promise.all([fetchJson('assets/exam-catalog.json'),fetchJson('assets/past-practice-review.json')]);
      if(!Array.isArray(catalog.items)||!Array.isArray(review.items))throw Error('invalid catalog');
      rows=model.entries(review,catalog);initialized=true;seed();
    }catch{
      initialized=false;status.textContent=' 기출 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
      const retry=document.createElement('button');retry.type='button';retry.className='past-button secondary';retry.textContent='다시 불러오기';retry.onclick=()=>{retry.remove();load()};status.append(' ',retry);
    }
  }
  window.addEventListener('student-account-change',seed);window.addEventListener('student-sync-applied',seed);
  load();
})();
