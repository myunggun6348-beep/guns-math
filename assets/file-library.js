(() => {
  const grades=["1","2","3","common"],names={all:"전체","1":"1학년","2":"2학년","3":"3학년",common:"공통·기타"},kindNames={problem:"문제",answer:"정답",solution:"해설"};
  const list=document.getElementById("fileList"),tabs=document.getElementById("gradeTabs"),kind=document.getElementById("kindFilter"),year=document.getElementById("yearFilter"),search=document.getElementById("fileSearch"),heading=document.getElementById("archiveHeading"),count=document.getElementById("archiveCount");
  const params=new URLSearchParams(location.search);
  let files=[],selected=grades.includes(params.get("grade"))?params.get("grade"):"all";
  const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const safeUrl=value=>{try{const u=new URL(String(value),location.href);return ["http:","https:"].includes(u.protocol)?safe(u.href):"#"}catch{return "#"}};
  const gradeOf=f=>grades.includes(String(f.grade))?String(f.grade):"common";
  const yearOf=f=>String(f.examYear||String(f.date||"").slice(0,4)||"연도 미상");
  const sizeOf=b=>!b?"":b<1048576?Math.round(b/1024)+"KB":(b/1048576).toFixed(1)+"MB";
  const examOf=f=>[f.examYear?f.examYear+"년":"",f.examMonth?f.examMonth+"월":"",f.examName].filter(Boolean).join(" ");
  const searchable=f=>[f.title,f.subject,f.kind,f.filename,f.examYear,f.examMonth,f.examName,names[gradeOf(f)],...(f.sets||[]).map(s=>s.subject)].filter(Boolean).join(" ").toLowerCase();

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
  }
  function chosen(){
    const word=search.value.trim().toLowerCase();
    return files.filter(f=>(selected==="all"||gradeOf(f)===selected)&&(!kind.value||String(f.kind||"")===kind.value)&&(!year.value||yearOf(f)===year.value)&&(!word||searchable(f).includes(word)));
  }
  function bundleCard(f){
    const g=gradeOf(f);
    const sets=(f.sets||[]).map(subjectSet=>{
      const solve=subjectSet.files?.problem?.format==="pdf"?'<a class="exam-file-button exam-solve-button" href="solve.html?id='+encodeURIComponent(f.id)+'&amp;subject='+encodeURIComponent(subjectSet.subject)+'"><span aria-hidden="true">✎</span> 바로 풀기</a>':"";
      const buttons=["problem","answer","solution"].filter(k=>subjectSet.files?.[k]).map(k=>{
        const file=subjectSet.files[k],details=[file.format?.toUpperCase(),sizeOf(file.size)].filter(Boolean).join(" · ");
        const label=k==="problem"?"문제 원본":kindNames[k];
        return '<a class="exam-file-button" href="'+safeUrl(file.url)+'" target="_blank" rel="noopener" title="'+safe(details)+'">'+label+' <span>↗</span></a>';
      }).join("");
      return '<div class="exam-set"><strong>'+safe(subjectSet.subject)+'</strong><div class="exam-actions">'+solve+buttons+"</div></div>";
    }).join("");
    return '<article class="archive-card exam-bundle"><span class="archive-grade">'+g+'학년</span><div class="archive-copy"><h3>'+safe(f.title)+'</h3><span class="archive-meta"><span>'+safe(examOf(f))+'</span><span>'+safe(f.subject)+'</span></span><div class="exam-sets">'+sets+'</div><a class="exam-source" href="'+safeUrl(f.sourcePage)+'" target="_blank" rel="noopener">출처: '+safe(f.source||"공식 기출")+' ↗</a></div></article>';
  }
  function singleCard(f){
    const g=gradeOf(f),meta=[examOf(f),f.subject,f.kind,sizeOf(f.size)].filter(Boolean);
    return '<a class="archive-card" href="'+safeUrl(f.url)+'" target="_blank" rel="noopener"><span class="archive-grade'+(g==="common"?" common":"")+'">'+(g==="common"?"공통":g+"학년")+'</span><span class="archive-copy"><h3>'+safe(f.title)+'</h3><span class="archive-meta">'+meta.map(x=>"<span>"+safe(x)+"</span>").join("")+'</span></span><span class="archive-open">열기 ↗</span></a>';
  }
  function draw(){
    drawTabs();
    const rows=chosen();
    heading.textContent=names[selected];
    count.textContent=rows.length+"개 자료";
    if(!rows.length){list.innerHTML='<p class="archive-empty">조건에 맞는 자료가 없습니다.</p>';return}
    const groups=new Map();
    rows.forEach(f=>{const y=yearOf(f);if(!groups.has(y))groups.set(y,[]);groups.get(y).push(f)});
    list.innerHTML=[...groups.entries()].sort((a,b)=>String(b[0]).localeCompare(String(a[0]))).map(([y,items])=>'<section><h3 class="archive-year">'+safe(y)+(/^\d{4}$/.test(y)?"년":"")+'</h3><div class="archive-list">'+items.map(f=>f.sets?bundleCard(f):singleCard(f)).join("")+"</div></section>").join("");
  }
  tabs.addEventListener("click",e=>{const b=e.target.closest("[data-grade]");if(b){selected=b.dataset.grade;draw()}});
  [kind,year].forEach(e=>e.addEventListener("change",draw));
  search.addEventListener("input",draw);
  Promise.allSettled([fetch("/assets/exam-catalog.json").then(r=>r.ok?r.json():{items:[]}),fetch("/api/files").then(r=>r.ok?r.json():[])]).then(([catalogResult,uploadResult])=>{
    const catalog=catalogResult.status==="fulfilled"?(catalogResult.value.items||[]):[];
    const uploads=uploadResult.status==="fulfilled"&&Array.isArray(uploadResult.value)?uploadResult.value:[];
    files=[...catalog,...uploads];drawFilters();if(/^\d{4}$/.test(params.get("year")||""))year.value=params.get("year");if(params.get("q"))search.value=params.get("q");draw();
  });
})();