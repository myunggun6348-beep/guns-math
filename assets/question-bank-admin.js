(function(){
  "use strict";
  const TRACKS={common1:{name:"공통수학1",grades:["1"]},common2:{name:"공통수학2",grades:["1"]},algebra:{name:"대수",grades:["2"]},calc1:{name:"미적분Ⅰ",grades:["2"]},stats:{name:"확률과 통계",grades:["2","3"]},calc2:{name:"미적분Ⅱ",grades:["3"]},geometry:{name:"기하",grades:["3"]}};
  const GAMES={graph:"그래프 짝 맞추기",derivative:"미분 부호 탐정",sequence:"수열 암호 해독",probability:"확률 예측 실험실",counting:"순열·조합 분류소",transform:"함수 변환 조종실",limit:"극한값 스피드 판정",vector:"벡터 방향 맞히기",integral:"정적분 넓이 채우기",error:"오류 찾기 챌린지"};
  const DIFFICULTY={basic:"기본",standard:"보통",advanced:"심화"},SURFACE={today:"오늘의 문제",game:"미니게임",both:"오늘+게임"};
  const CONCEPTS=typeof NODES!=="undefined"?NODES:{};
  const key="수학을보다-암호",$=s=>document.querySelector(s),form=$("#questionForm");
  let password="",items=[];
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const stored=()=>{try{return localStorage.getItem(key)||sessionStorage.getItem(key)||""}catch{return""}};
  const clearStored=()=>{try{localStorage.removeItem(key);sessionStorage.removeItem(key)}catch{}};
  const toast=text=>{const el=$("#toast");el.textContent=text;el.classList.add("show");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("show"),1800)};
  async function request(payload){const response=await fetch("/api/problem-bank",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password,...payload})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"요청을 처리하지 못했습니다.");return data}
  function fillStatic(){
    form.elements.gameKey.innerHTML=Object.entries(GAMES).map(([id,name])=>`<option value="${id}">${name}</option>`).join("");
    form.elements.concept.innerHTML=Object.entries(CONCEPTS).map(([id,node])=>`<option value="${esc(id)}">${esc(node.name)} · ${esc(node.subject)}</option>`).join("");
    $("#choiceInputs").innerHTML=Array.from({length:5},(_,i)=>`<label class="qb-choice-row"><input type="radio" name="correct" value="${i}" ${i===0?"checked":""} aria-label="${i+1}번을 정답으로"><input name="choice${i}" maxlength="180" placeholder="${i+1}번 선택지" required></label>`).join("");
  }
  function tracks(){const grade=form.elements.grade.value,current=form.elements.track.value;const list=Object.entries(TRACKS).filter(([,t])=>t.grades.includes(grade));form.elements.track.innerHTML=list.map(([id,t])=>`<option value="${id}" ${id===current?"selected":""}>${t.name}</option>`).join("")}
  function mode(){
    const surface=form.elements.surface.value,type=form.elements.type.value;
    const today=$("#todayFields"),game=$("#gameFields");today.hidden=false;game.hidden=false;
    today.children[0].hidden=surface==="game";today.children[1].hidden=surface==="game";today.children[2].hidden=false;today.className="qb-grid "+(surface==="game"?"one":"three");
    game.children[0].hidden=surface==="today";game.children[1].hidden=false;game.className="qb-grid "+(surface==="today"?"one":"two");
    $("#choiceFields").hidden=type!=="choice";$("#textFields").hidden=type!=="text";
    $("#choiceInputs").querySelectorAll('input[type="text"]').forEach(x=>x.required=type==="choice");
    preview();
  }
  function value(){
    const type=form.elements.type.value;
    const item={surface:form.elements.surface.value,type,difficulty:form.elements.difficulty.value,grade:form.elements.grade.value,track:form.elements.track.value,concept:form.elements.concept.value,gameKey:form.elements.gameKey.value,source:form.elements.source.value.trim(),prompt:form.elements.prompt.value.trim(),explanation:form.elements.explanation.value.trim(),note:form.elements.note.value.trim(),published:form.elements.published.checked};
    if(type==="choice"){item.choices=Array.from({length:5},(_,i)=>form.elements["choice"+i].value.trim());item.answer=Number(form.querySelector('input[name="correct"]:checked')?.value||0)}else item.answers=form.elements.answers.value.split(/\r?\n|,/).map(x=>x.trim()).filter(Boolean);
    return item;
  }
  function preview(){
    const item=value(),concept=(CONCEPTS[item.concept]?.name||"개념 미지정"),track=TRACKS[item.track]?.name||"과목 미지정";
    let answer="";
    if(item.type==="choice")answer='<div class="qb-preview-choices">'+item.choices.map((x,i)=>`<div class="qb-preview-choice ${i===item.answer?"correct":""}" data-math><b>${i+1}.</b> ${esc(x||"선택지를 입력하세요")}</div>`).join("")+'</div>';
    else answer=`<div class="qb-preview-answer" data-math><b>인정 정답</b><br>${esc((item.answers||[]).join(" · ")||"정답을 입력하세요")}</div>`;
    $("#previewCard").innerHTML=`<div class="qb-preview-meta"><span class="qb-chip">${esc(SURFACE[item.surface])}</span><span class="qb-chip">${esc(item.surface==="game"?GAMES[item.gameKey]:"고"+item.grade+" · "+track)}</span><span class="qb-chip">${esc(concept)}</span><span class="qb-chip">${esc(DIFFICULTY[item.difficulty])}</span></div><h3 class="qb-preview-question" data-math>${esc(item.prompt||"문제를 입력하면 여기에 표시됩니다.")}</h3>${item.note?`<p data-math>${esc(item.note)}</p>`:""}${answer}<div class="qb-preview-explain" data-math><b>정답과 해설</b><br>${esc(item.explanation||"해설을 입력하면 여기에 표시됩니다.")}</div>`;
    window.MathView?.typeset($("#previewCard"));
  }
  function updateRecommendation(){
    const prompt=form.elements.prompt.value.trim(),button=$("#applyRecommendBtn"),title=$("#recommendTitle"),reason=$("#recommendReason");
    if(!prompt){title.textContent="문제를 입력하면 개념과 난이도를 추천합니다.";reason.textContent="추천 결과를 확인한 뒤 한 번에 적용할 수 있습니다.";button.disabled=true;delete button.dataset.concept;delete button.dataset.difficulty;return}
    const result=ProblemBankImport.recommend(prompt,form.elements.surface.value==="game"?form.elements.gameKey.value:form.elements.track.value,form.elements.explanation.value);
    title.textContent=`추천: ${result.conceptName} · ${result.difficultyName}`;
    reason.textContent=`개념 근거: ${result.conceptReason} · 난이도 근거: ${result.difficultyReason} · 신뢰도: ${result.confidence}`;
    button.dataset.concept=result.concept;button.dataset.difficulty=result.difficulty;button.disabled=false;
  }
  function reset(){form.reset();form.elements.id.value="";form.elements.published.checked=true;form.elements.difficulty.value="standard";form.querySelector('input[name="correct"][value="0"]').checked=true;$("#editorTitle").textContent="새 문항 만들기";$("#saveBtn").textContent="문항 저장";$("#formStatus").textContent="";tracks();mode();updateRecommendation()}
  function fill(item,copy=false){
    reset();form.elements.id.value=copy?"":item.id;for(const name of ["surface","type","difficulty","grade","concept","gameKey","source","prompt","explanation","note"]){if(item[name]!==undefined&&form.elements[name])form.elements[name].value=item[name]}
    tracks();form.elements.track.value=item.track||form.elements.track.value;form.elements.published.checked=copy?false:item.published!==false;
    if(item.type==="choice"){(item.choices||[]).forEach((x,i)=>{if(form.elements["choice"+i])form.elements["choice"+i].value=x});const radio=form.querySelector(`input[name="correct"][value="${item.answer}"]`);if(radio)radio.checked=true}else form.elements.answers.value=(item.answers||[]).join("\n");
    $("#editorTitle").textContent=copy?"복사한 문항 만들기":"문항 수정";$("#saveBtn").textContent=copy?"복사본 저장":"변경 저장";mode();updateRecommendation();form.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function stats(){const pub=items.filter(x=>x.published!==false).length,today=items.filter(x=>x.surface!=="game").length,game=items.filter(x=>x.surface!=="today").length,concepts=new Set(items.map(x=>x.concept)).size;$("#stats").innerHTML=[[items.length,"전체 문항"],[pub,"공개 중"],[today,"오늘의 문제"],[game,"미니게임"],[concepts,"연결 개념"]].slice(0,4).map(x=>`<div class="qb-stat"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("")}
  function draw(){
    stats();const term=$("#searchInput").value.trim().toLowerCase(),surface=$("#surfaceFilter").value,state=$("#stateFilter").value;
    const list=items.filter(x=>!surface||x.surface===surface).filter(x=>!state||(state==="published"?(x.published!==false):(x.published===false))).filter(x=>!term||[x.prompt,x.conceptName,x.source,TRACKS[x.track]?.name,GAMES[x.gameKey]].join(" ").toLowerCase().includes(term));
    $("#questionList").innerHTML=list.length?'<div class="qb-list">'+list.map(x=>`<article class="qb-item ${x.published===false?"off":""}" data-id="${esc(x.id)}"><div class="qb-item-top"><div class="qb-item-tags"><span class="qb-chip">${esc(SURFACE[x.surface])}</span><span class="qb-chip">${esc(x.conceptName||x.concept)}</span><span class="qb-chip">${esc(DIFFICULTY[x.difficulty])}</span><span class="qb-chip">${x.published===false?"비공개":"공개"}</span></div><small>${esc((x.updatedAt||"").slice(0,10))}</small></div><h3 data-math>${esc(x.prompt)}</h3><p>${esc(x.source||((x.surface==="game"?GAMES[x.gameKey]:TRACKS[x.track]?.name)||"직접 제작"))}</p><div class="qb-item-actions"><button data-act="edit">수정</button><button data-act="copy">복사</button><button data-act="publish">${x.published===false?"공개하기":"비공개로"}</button><button class="danger" data-act="delete">삭제</button></div></article>`).join("")+'</div>':'<div class="qb-empty">조건에 맞는 문항이 없습니다.</div>';
    window.MathView?.typeset($("#questionList"));
  }
  async function load(){const data=await request({action:"list"});items=data.items||[];draw();$("#qbLogin").hidden=true;$("#qbApp").hidden=false}
  $("#loginForm").addEventListener("submit",async event=>{event.preventDefault();const f=event.currentTarget;password=f.password.value;$("#loginStatus").textContent="확인 중…";try{await load();try{clearStored();(f.remember.checked?localStorage:sessionStorage).setItem(key,password)}catch{}f.password.value="";$("#loginStatus").textContent=""}catch(error){$("#loginStatus").textContent=error.message}});
  form.addEventListener("input",()=>{preview();updateRecommendation()});form.addEventListener("change",event=>{if(event.target.name==="grade")tracks();if(event.target.name==="surface"||event.target.name==="type")mode();preview();updateRecommendation()});
  $("#applyRecommendBtn").addEventListener("click",event=>{const button=event.currentTarget;if(!button.dataset.concept)return;form.elements.concept.value=button.dataset.concept;form.elements.difficulty.value=button.dataset.difficulty;preview();toast("추천 개념과 난이도를 적용했습니다.")});
  form.addEventListener("submit",async event=>{event.preventDefault();const button=$("#saveBtn"),status=$("#formStatus");button.disabled=true;status.textContent="저장 중…";try{const saved=await request({action:"save",id:form.elements.id.value,item:value()});const index=items.findIndex(x=>x.id===saved.id);if(index<0)items.unshift(saved);else items[index]=saved;draw();reset();toast(index<0?"문항을 저장했습니다.":"문항을 수정했습니다.")}catch(error){status.textContent=error.message}finally{button.disabled=false}});
  $("#questionList").addEventListener("click",async event=>{const button=event.target.closest("[data-act]");if(!button)return;const card=button.closest("[data-id]"),item=items.find(x=>x.id===card.dataset.id);if(!item)return;const act=button.dataset.act;if(act==="edit")return fill(item);if(act==="copy")return fill(item,true);if(act==="delete"&&!confirm("이 문항을 삭제할까요?"))return;button.disabled=true;try{if(act==="delete"){await request({action:"delete",id:item.id});items=items.filter(x=>x.id!==item.id);toast("문항을 삭제했습니다.")}else if(act==="publish"){const saved=await request({action:"save",id:item.id,item:{...item,published:item.published===false}});items[items.findIndex(x=>x.id===item.id)]=saved;toast(saved.published?"문항을 공개했습니다.":"문항을 비공개로 바꿨습니다.")}draw()}catch(error){toast(error.message);button.disabled=false}});
  $("#resetBtn").addEventListener("click",reset);["#searchInput","#surfaceFilter","#stateFilter"].forEach(id=>$(id).addEventListener("input",draw));
  $("#exportBtn").addEventListener("click",()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),items},null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`수학을보다-문항-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)});
  const IMPORT_HEADERS=["사용위치","학년","과목","미니게임","개념","난이도","유형","문제","선택지1","선택지2","선택지3","선택지4","선택지5","정답","주관식정답","해설","출처","참고문구","공개"];
  const IMPORT_SAMPLES=[
    ["오늘의 문제","1","공통수학1","","다항식","보통","오지선다형","다항식 x^2-1을 x-1로 나눈 몫은?","x-1","x","x+1","x+2","2x","3","","x^2-1=(x-1)(x+1)이므로 몫은 x+1이다.","직접 제작","","O"],
    ["미니게임","","","함수 변환 조종실","함수와 그래프","기본","주관식","y=x^2의 그래프를 오른쪽으로 1만큼 평행이동한 식은?","","","","","","","y=(x-1)^2|(x-1)^2","x 대신 x-1을 대입한다.","직접 제작","동치인 식도 인정","X"]
  ];
  let importRows=[];
  function templateSheet(){
    const sheet=XLSX.utils.aoa_to_sheet([IMPORT_HEADERS,...IMPORT_SAMPLES]);
    sheet["!cols"]=IMPORT_HEADERS.map((header,index)=>({wch:[8,3,12,20,15,8,10,38,14,14,14,14,14,7,22,42,18,24,7][index]}));
    return sheet;
  }
  function codeSheet(){
    return XLSX.utils.aoa_to_sheet([
      ["항목","사용 가능한 값"],
      ["사용위치","오늘의 문제 / 미니게임 / 둘 다"],
      ["학년","1 / 2 / 3"],
      ["과목",Object.values(TRACKS).map(x=>x.name).join(" / ")],
      ["미니게임",Object.values(GAMES).join(" / ")],
      ["개념","빈칸이면 자동 추천 / "+Object.values(CONCEPTS).map(x=>x.name).join(" / ")],
      ["난이도","빈칸이면 자동 추천 / 기본 / 보통 / 심화"],
      ["유형","오지선다형 / 주관식"],
      ["정답","오지선다형일 때 1~5"],
      ["주관식정답","여러 정답은 | 로 구분"],
      ["공개","O / X"]
    ]);
  }
  $("#xlsxTemplateBtn").addEventListener("click",()=>{
    const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,templateSheet(),"문항입력");XLSX.utils.book_append_sheet(workbook,codeSheet(),"입력도움");
    XLSX.writeFile(workbook,"수학을보다-문항일괄등록-양식.xlsx",{compression:true});
  });
  $("#csvTemplateBtn").addEventListener("click",()=>{
    const csv="\ufeff"+XLSX.utils.sheet_to_csv(templateSheet()),url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");
    a.href=url;a.download="수학을보다-문항일괄등록-양식.csv";a.click();URL.revokeObjectURL(url);
  });
  function renderImport(){
    const valid=importRows.filter(row=>!row.errors.length),invalid=importRows.length-valid.length;
    $("#importSummary").innerHTML=importRows.length?`<b>전체 ${importRows.length}</b><b>등록 가능 ${valid.length}</b><b>확인 필요 ${invalid}</b><span>오류가 없는 문항만 등록됩니다.</span>`:"파일을 선택하면 등록 전 검사가 시작됩니다.";
    $("#importBtn").disabled=!valid.length;$("#importBtn").textContent=valid.length?`정상 문항 ${valid.length}개 등록`:"정상 문항 등록";
    $("#importPreview").innerHTML=importRows.length?`<div class="qb-import-table-wrap"><table class="qb-import-table"><thead><tr><th>행</th><th>상태</th><th>문제</th><th>검사 결과</th></tr></thead><tbody>${importRows.map(row=>`<tr><td>${row.row}</td><td class="${row.errors.length?"error":"ok"}">${row.errors.length?"확인 필요":"등록 가능"}</td><td data-math>${esc(row.item.prompt||"(문제 없음)")}</td><td class="${!row.errors.length&&row.recommendation?"recommended":""}">${esc(row.errors.join(" ")||(row.recommendation?`자동 추천: ${row.recommendation.labels.join(" · ")} · ${row.recommendation.reason}`:"이상 없음"))}</td></tr>`).join("")}</tbody></table></div>`:"";
    window.MathView?.typeset($("#importPreview"));
  }
  $("#importFile").addEventListener("change",async event=>{
    const file=event.target.files?.[0],status=$("#importStatus");importRows=[];renderImport();if(!file)return;
    if(file.size>5*1024*1024){status.textContent="파일은 5MB 이하로 올려 주세요.";event.target.value="";return}
    status.textContent="파일 검사 중…";
    try{
      const workbook=XLSX.read(await file.arrayBuffer(),{type:"array"}),sheet=workbook.Sheets[workbook.SheetNames[0]];
      if(!sheet)throw new Error("첫 번째 시트를 읽을 수 없습니다.");
      const rows=XLSX.utils.sheet_to_json(sheet,{defval:"",raw:false}).filter(row=>Object.values(row).some(value=>String(value).trim()));
      if(rows.length>100)throw new Error("한 번에 100문항까지 등록할 수 있습니다.");
      if(!rows.length)throw new Error("입력된 문항이 없습니다.");
      importRows=ProblemBankImport.parseRows(rows,items);renderImport();status.textContent=`${file.name} 검사를 마쳤습니다.`;
    }catch(error){status.textContent=error.message||"파일을 읽지 못했습니다.";event.target.value=""}
  });
  $("#importBtn").addEventListener("click",async()=>{
    const valid=importRows.filter(row=>!row.errors.length).map(row=>row.item),button=$("#importBtn"),status=$("#importStatus");if(!valid.length)return;
    button.disabled=true;status.textContent="문항 등록 중…";
    try{
      const data=await request({action:"bulkSave",items:valid});items=[...(data.items||[]),...items];draw();importRows=[];$("#importFile").value="";renderImport();status.textContent=`${(data.items||[]).length}문항을 등록했습니다.`;toast("일괄 등록을 마쳤습니다.");
    }catch(error){status.textContent=error.message;button.disabled=false}
  });
  $("#logoutBtn").addEventListener("click",()=>{clearStored();location.reload()});
  fillStatic();reset();password=stored();if(password)load().catch(()=>{password="";clearStored();$("#loginStatus").textContent="암호를 다시 입력해 주세요."});
})();
