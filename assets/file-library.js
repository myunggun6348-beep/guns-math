(() => {
  const grades=["1","2","3","common"],names={all:"전체","1":"1학년","2":"2학년","3":"3학년",common:"공통·기타"},kindNames={problem:"문제",answer:"정답",solution:"해설"};
  const list=document.getElementById("fileList"),tabs=document.getElementById("gradeTabs"),kind=document.getElementById("kindFilter"),year=document.getElementById("yearFilter"),subject=document.getElementById("subjectFilter"),search=document.getElementById("fileSearch"),heading=document.getElementById("archiveHeading"),count=document.getElementById("archiveCount");
  const params=new URLSearchParams(location.search);
  /* 처음 열 때 어느 학년 칸을 보여 줄지: 주소(?grade=) → 지난번에 고른 칸 → 오늘의 학습에서
     고른 학년 → 전체. 폰에서 41개를 다 내려 보며 내 학년을 찾지 않게 하려는 것입니다. */
  const 기억=key=>{try{return JSON.parse(localStorage.getItem(key)||"null")}catch{return null}};
  const 고른칸="files-grade-tab";
  const 처음칸=()=>{
    const 후보=[params.get("grade"),(()=>{try{return localStorage.getItem(고른칸)}catch{return null}})(),기억("math-home-profile-v1")?.grade,기억("today-study-pref")?.grade];
    return 후보.map(String).find(g=>g==="all"||grades.includes(g))||"all";
  };
  let files=[],selected=처음칸();
  let filterKey="";
  const examOpen=new Map(),yearOpen=new Map();
  const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const safeUrl=value=>{try{const u=new URL(String(value),location.href);return ["http:","https:"].includes(u.protocol)?safe(u.href):"#"}catch{return "#"}};
  const gradeOf=f=>grades.includes(String(f.grade))?String(f.grade):"common";
  const yearOf=f=>String(f.examYear||String(f.date||"").slice(0,4)||"연도 미상");
  const sizeOf=b=>!b?"":b<1048576?Math.round(b/1024)+"KB":(b/1048576).toFixed(1)+"MB";
  const examOf=f=>[f.examYear?f.examYear+"년":"",f.examMonth?f.examMonth+"월":"",f.examName].filter(Boolean).join(" ");
  const searchable=f=>[f.title,f.subject,f.kind,f.filename,f.examYear,f.examMonth,f.examName,names[gradeOf(f)]].filter(Boolean).join(" ").toLowerCase();
  const subjectsOf=f=>f.sets?f.sets.map(s=>s.subject).filter(Boolean):[f.subject].filter(Boolean);
  // 시험 이름 검색은 모든 과목을, 과목 이름 검색·선택은 해당 과목만 보여 줍니다.
  const visibleSets=f=>(f.sets||[]).filter(s=>(!subject.value||s.subject===subject.value)&&(!search.value.trim()||searchable(f).includes(search.value.trim().toLowerCase())||String(s.subject).toLowerCase().includes(search.value.trim().toLowerCase())));
  const gradeTag=f=>selected==="all"?'<span class="archive-grade">'+safe(names[gradeOf(f)])+'</span>':"";

  function drawTabs(){
    tabs.innerHTML=["all",...grades].map(g=>{
      const n=g==="all"?files.length:files.filter(f=>gradeOf(f)===g).length;
      return '<button type="button" class="grade-tab'+(selected===g?" on":"")+'" data-grade="'+g+'" aria-pressed="'+(selected===g)+'">'+names[g]+'<span>'+n+'개</span></button>';
    }).join("");
  }
  function drawFilters(){
    const kinds=[...new Set(files.map(f=>String(f.kind||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ko"));
    const years=[...new Set(files.map(yearOf).filter(y=>/^\d{4}$/.test(y)))].sort((a,b)=>b-a);
    kind.innerHTML='<option value="">모든 자료 종류</option>'+kinds.map(x=>"<option>"+safe(x)+"</option>").join("");
    year.innerHTML='<option value="">모든 연도</option>'+years.map(x=>"<option>"+safe(x)+"</option>").join("");
    drawSubjects();
  }
  function drawSubjects(){
    const previous=subject.value;
    const subjects=[...new Set(files.filter(f=>selected==="all"||gradeOf(f)===selected).flatMap(subjectsOf))].sort((a,b)=>a.localeCompare(b,"ko"));
    subject.innerHTML='<option value="">모든 과목</option>'+subjects.map(x=>'<option value="'+safe(x)+'">'+safe(x)+'</option>').join("");
    if(subjects.includes(previous))subject.value=previous;
  }
  function chosen(){
    const word=search.value.trim().toLowerCase();
    return files.filter(f=>(selected==="all"||gradeOf(f)===selected)&&(!kind.value||String(f.kind||"")===kind.value)&&(!year.value||yearOf(f)===year.value)&&(f.sets?visibleSets(f).length>0:(!subject.value||f.subject===subject.value)&&(!word||searchable(f).includes(word))));
  }
  function bundleCard(f){
    const shown=visibleSets(f);
    const sets=shown.map(subjectSet=>{
      const context=safe(f.title+" · "+subjectSet.subject+" · ");
      const solve=subjectSet.files?.problem?.format==="pdf"?'<a class="exam-file-button exam-solve-button" aria-label="'+context+'바로 풀기" href="solve.html?id='+encodeURIComponent(f.id)+'&amp;subject='+encodeURIComponent(subjectSet.subject)+'"><span aria-hidden="true">✎</span> 바로 풀기</a>':"";
      const buttons=["problem","answer","solution"].filter(k=>subjectSet.files?.[k]).map(k=>{
        const file=subjectSet.files[k],details=[file.format?.toUpperCase(),sizeOf(file.size)].filter(Boolean).join(" · ");
        const label=k==="problem"?"문제지":kindNames[k];
        return '<a class="exam-file-button exam-file-link" aria-label="'+context+label+' (새 창)" href="'+safeUrl(file.url)+'" target="_blank" rel="noopener" title="'+safe([details,"새 창에서 열기"].filter(Boolean).join(" · "))+'">'+label+' <span aria-hidden="true">↗</span></a>';
      }).join("");
      return '<div class="exam-set"><strong>'+safe(subjectSet.subject)+'</strong><div class="exam-actions">'+solve+'<div class="exam-downloads">'+buttons+"</div></div></div>";
    }).join("");
    const open=examOpen.has(f.id)?examOpen.get(f.id):Boolean(subject.value||search.value.trim());
    return '<details class="archive-card exam-bundle" data-exam="'+safe(f.id)+'"'+(open?' open':'')+'><summary class="exam-summary"><span class="archive-copy"><span class="exam-title">'+gradeTag(f)+'<h3>'+safe(f.title)+'</h3></span><span class="archive-meta">'+safe(examOf(f))+'</span></span><span class="exam-subjects">'+shown.map(s=>safe(s.subject)).join(" · ")+'</span><span class="exam-expand" aria-hidden="true"></span></summary><div class="exam-content"><div class="exam-sets">'+sets+'</div>'+(f.sourcePage?'<a class="exam-source" href="'+safeUrl(f.sourcePage)+'" target="_blank" rel="noopener">출처: '+safe(f.source||"공식 기출")+' ↗</a>':"")+'</div></details>';
  }
  function singleCard(f){
    const meta=[examOf(f),f.subject,f.kind,sizeOf(f.size)].filter(Boolean);
    return '<a class="archive-card archive-single" href="'+safeUrl(f.url)+'" target="_blank" rel="noopener"><span class="archive-copy"><span class="exam-title">'+gradeTag(f)+'<h3>'+safe(f.title)+'</h3></span><span class="archive-meta">'+meta.map(x=>"<span>"+safe(x)+"</span>").join("")+'</span></span><span class="archive-open">열기 ↗</span></a>';
  }
  function draw(){
    const nextKey=JSON.stringify([selected,subject.value,kind.value,year.value,search.value.trim()]);
    if(nextKey===filterKey){
      list.querySelectorAll('[data-exam]').forEach(e=>examOpen.set(e.dataset.exam,e.open));
      list.querySelectorAll('[data-year]').forEach(e=>yearOpen.set(e.dataset.year,e.open));
    }else{examOpen.clear();yearOpen.clear();filterKey=nextKey}
    drawTabs();
    const rows=chosen();
    heading.textContent=names[selected];
    count.textContent=rows.length+"개 자료";
    if(!rows.length){list.innerHTML='<p class="archive-empty">조건에 맞는 자료가 없습니다. 과목·종류·연도 또는 검색어를 바꿔 보세요.</p>';return}
    const groups=new Map();
    rows.forEach(f=>{const y=yearOf(f);if(!groups.has(y))groups.set(y,[]);groups.get(y).push(f)});
    /* 가장 최근 연도만 펼쳐 두고 나머지는 접습니다. 찾기·연도를 골랐을 때는 다 펼칩니다
       (찾은 것이 접힌 칸 안에 숨으면 안 되니까요). */
    const 다펼침=Boolean(search.value.trim()||year.value||subject.value||kind.value);
    list.innerHTML=[...groups.entries()].sort((a,b)=>String(b[0]).localeCompare(String(a[0]))).map(([y,items],i)=>'<details class="archive-year-group" data-year="'+safe(y)+'"'+((yearOpen.has(y)?yearOpen.get(y):다펼침||i===0)?" open":"")+'><summary class="archive-year">'+safe(y)+(/^\d{4}$/.test(y)?"년":"")+'<span>'+items.length+'개</span></summary><div class="archive-list">'+items.map(f=>f.sets?bundleCard(f):singleCard(f)).join("")+"</div></details>").join("");
  }
  tabs.addEventListener("click",e=>{const b=e.target.closest("[data-grade]");if(b){selected=b.dataset.grade;try{localStorage.setItem(고른칸,selected)}catch{}drawSubjects();draw()}});
  [subject,kind,year].forEach(e=>e.addEventListener("change",draw));
  search.addEventListener("input",draw);
  Promise.allSettled([fetch("/assets/exam-catalog.json").then(r=>r.ok?r.json():{items:[]}),fetch("/api/files").then(r=>r.ok?r.json():[])]).then(([catalogResult,uploadResult])=>{
    const catalog=catalogResult.status==="fulfilled"?(catalogResult.value.items||[]):[];
    const uploads=uploadResult.status==="fulfilled"&&Array.isArray(uploadResult.value)?uploadResult.value:[];
    files=[...catalog,...uploads];drawFilters();if(/^\d{4}$/.test(params.get("year")||""))year.value=params.get("year");if(params.get("kind")&&[...kind.options].some(o=>o.value===params.get("kind")))kind.value=params.get("kind");if(params.get("subject")&&[...subject.options].some(o=>o.value===params.get("subject")))subject.value=params.get("subject");if(params.get("q"))search.value=params.get("q");draw();
  });
})();
