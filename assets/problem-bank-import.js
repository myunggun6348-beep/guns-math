(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.ProblemBankImport=api;
})(typeof window!=="undefined"?window:null,function(){
  "use strict";
  const TRACKS={common1:["공통수학1","공통수학 1"],common2:["공통수학2","공통수학 2"],algebra:["대수"],calc1:["미적분Ⅰ","미적분1","미적분 1"],stats:["확률과 통계","확통"],calc2:["미적분Ⅱ","미적분2","미적분 2"],geometry:["기하"]};
  const TRACK_GRADES={common1:["1"],common2:["1"],algebra:["2"],calc1:["2"],stats:["2","3"],calc2:["3"],geometry:["3"]};
  const CONCEPTS={poly:"다항식",eq:"방정식과 부등식",count:"경우의 수",func:"함수와 그래프",geomeq:"도형의 방정식",explog:"지수함수와 로그함수",trig:"삼각함수",seq:"수열",limit:"함수의 극한과 연속",diff:"미분",integ:"적분",prob:"확률",stat:"통계",seqlim:"수열의 극한",difflaw:"미분법",integlaw:"적분법",conic:"이차곡선",vec:"평면벡터",space:"공간도형과 공간좌표"};
  const GAMES={graph:"그래프 짝 맞추기",derivative:"미분 부호 탐정",sequence:"수열 암호 해독",probability:"확률 예측 실험실",counting:"순열·조합 분류소",transform:"함수 변환 조종실",limit:"극한값 스피드 판정",vector:"벡터 방향 맞히기",integral:"정적분 넓이 채우기",error:"오류 찾기 챌린지"};
  const CONCEPT_RULES={
    poly:["다항식","인수분해","나머지정리","인수정리","조립제법","항등식"],
    eq:["방정식","부등식","판별식","근과 계수","연립부등식","절댓값"],
    count:["경우의 수","순열","조합","중복순열","중복조합","이항정리"],
    geomeq:["도형의 방정식","원의 방정식","직선의 방정식","평행이동","대칭이동","두 점 사이"],
    explog:["지수함수","로그함수","지수방정식","로그방정식","로그","log"],
    trig:["삼각함수","사인","코사인","탄젠트","sin","cos","tan"],
    seq:["수열","등차수열","등비수열","점화식","수학적 귀납법","시그마","Σ"],
    seqlim:["수열의 극한","무한급수","급수의 합","등비급수"],
    limit:["함수의 극한","극한값","연속함수","불연속","lim"],
    difflaw:["합성함수의 미분","음함수","매개변수로 나타낸 함수","역함수의 미분","이계도함수"],
    diff:["도함수","미분계수","접선","극대","극소","증가와 감소","최댓값","최솟값","미분"],
    integlaw:["치환적분","부분적분","삼각함수의 적분","무리함수의 적분"],
    integ:["부정적분","정적분","넓이","적분"],
    prob:["조건부확률","사건의 독립","독립사건","종속사건","확률"],
    stat:["확률분포","이항분포","정규분포","표본평균","모평균","추정","분산","표준편차"],
    conic:["이차곡선","포물선","타원","쌍곡선","준선"],
    vec:["평면벡터","벡터의 내적","위치벡터","벡터"],
    space:["공간도형","공간좌표","구의 방정식","삼수선","정사영"],
    func:["합성함수","역함수","유리함수","무리함수","함수와 그래프","그래프","함수"]
  };
  const TRACK_DEFAULT={common1:"poly",common2:"func",algebra:"seq",calc1:"diff",stats:"stat",calc2:"difflaw",geometry:"vec",graph:"func",derivative:"diff",sequence:"seq",probability:"prob",counting:"count",transform:"func",limit:"limit",vector:"vec",integral:"integ",error:"func"};
  const HEADERS={surface:["사용위치","위치","surface"],grade:["학년","grade"],track:["과목","track"],gameKey:["미니게임","게임","gamekey"],concept:["개념","관련개념","concept"],difficulty:["난이도","difficulty"],type:["유형","문항유형","type"],prompt:["문제","문항","prompt"],answer:["정답","객관식정답","answer"],answers:["주관식정답","인정정답","answers"],explanation:["해설","풀이","explanation"],source:["출처","분류","source"],note:["참고문구","안내문구","note"],published:["공개","공개여부","published"]};
  for(let i=0;i<5;i++)HEADERS["choice"+i]=["선택지"+(i+1),(i+1)+"번선택지","choice"+(i+1)];
  const text=v=>String(v??"").trim(),key=v=>text(v).toLowerCase().replace(/[\s·_-]/g,"");
  const reverse=object=>{const out={};Object.entries(object).forEach(([id,names])=>{out[key(id)]=id;(Array.isArray(names)?names:[names]).forEach(name=>out[key(name)]=id)});return out};
  const trackMap=reverse(TRACKS),conceptMap=reverse(CONCEPTS),gameMap=reverse(GAMES);
  function recommend(prompt,track="",explanation=""){
    const question=text(prompt),haystack=(question+" "+text(explanation)).toLowerCase(),ranked=[];
    Object.entries(CONCEPT_RULES).forEach(([concept,words])=>{
      const matched=words.filter(word=>haystack.includes(String(word).toLowerCase()));
      const score=matched.reduce((sum,word)=>sum+Math.max(2,String(word).length/2),0);
      if(score)ranked.push({concept,score,matched});
    });
    ranked.sort((a,b)=>b.score-a.score);
    const best=ranked[0]||{concept:TRACK_DEFAULT[track]||"func",score:0,matched:[]};
    let points=0;const difficultyReasons=[];
    if(question.length>120){points+=2;difficultyReasons.push("문제 조건이 길고 복합적임")}else if(question.length>70){points++;difficultyReasons.push("문제 조건이 여러 단계임")}
    const advanced=["증명","모든 실수","실근의 개수","서로 다른","매개변수","자연수 n","만족시키는","최댓값","최솟값","최대가 되도록","최소가 되도록"].filter(word=>question.toLowerCase().includes(word.toLowerCase()));
    if(advanced.length){points+=Math.min(3,advanced.length);difficultyReasons.push("조건 해석이 필요한 표현 포함")}
    const conditions=(question.match(/이고|이며|일 때|만족|이상|이하|적어도/g)||[]).length;
    if(conditions>=2){points++;difficultyReasons.push("조건이 두 개 이상 연결됨")}
    if(question.length<60&&/값은|계산|정의|다음 중/.test(question)){points--;difficultyReasons.push("짧은 직접 계산·확인형")}
    const difficulty=points>=3?"advanced":points>=1?"standard":"basic";
    return {concept:best.concept,conceptName:CONCEPTS[best.concept],difficulty,difficultyName:{basic:"기본",standard:"보통",advanced:"심화"}[difficulty],confidence:best.score>=6?"높음":best.score>0?"보통":"참고",matched:best.matched.slice(0,3),conceptReason:best.matched.length?best.matched.slice(0,3).join(" · "):"선택한 과목 기준",difficultyReason:difficultyReasons[0]||"문제 길이와 조건 수 기준"};
  }
  function read(row,name){const found=HEADERS[name].find(header=>Object.keys(row).some(cell=>key(cell)===key(header)));if(!found)return"";const actual=Object.keys(row).find(cell=>key(cell)===key(found));return text(row[actual])}
  function enumValue(value,map){return map[key(value)]||""}
  function normalizeRow(row){
    const surfaceValue=key(read(row,"surface")),typeValue=key(read(row,"type")),rawDifficulty=read(row,"difficulty"),publishedValue=key(read(row,"published"));
    const rawConcept=read(row,"concept"),prompt=read(row,"prompt"),explanation=read(row,"explanation"),track=enumValue(read(row,"track"),trackMap),gameKey=enumValue(read(row,"gameKey"),gameMap),suggested=recommend(prompt,track||gameKey,explanation);
    const surface={today:"today",오늘의문제:"today",game:"game",미니게임:"game",both:"both",둘다:"both","오늘+게임":"both","오늘의문제+미니게임":"both"}[surfaceValue]||"";
    const type={choice:"choice",오지선다형:"choice",객관식:"choice",text:"text",주관식:"text"}[typeValue]||"";
    let difficulty={basic:"basic",기본:"basic",standard:"standard",보통:"standard",advanced:"advanced",심화:"advanced"}[key(rawDifficulty)]||"";
    let concept=enumValue(rawConcept,conceptMap);const recommended=[];
    if(!rawConcept&&prompt){concept=suggested.concept;recommended.push("개념 "+suggested.conceptName)}
    if(!rawDifficulty&&prompt){difficulty=suggested.difficulty;recommended.push("난이도 "+suggested.difficultyName)}
    const published=![ "x","n","no","false","0","비공개"].includes(publishedValue),answerNumber=Number(read(row,"answer"));
    return {item:{surface,type,difficulty,grade:read(row,"grade").replace(/[^123]/g,"").slice(0,1),track,gameKey,concept,prompt,choices:Array.from({length:5},(_,i)=>read(row,"choice"+i)),answer:Number.isInteger(answerNumber)?answerNumber-1:-1,answers:read(row,"answers").split(/\r?\n|\|/).map(text).filter(Boolean),explanation,source:read(row,"source"),note:read(row,"note"),published},recommendation:recommended.length?{labels:recommended,reason:`${suggested.conceptReason} / ${suggested.difficultyReason}`}:null};
  }
  function validate(item){
    const errors=[];
    if(!item.surface)errors.push("사용 위치를 확인해 주세요.");
    if(!item.type)errors.push("문항 유형을 확인해 주세요.");
    if(!item.difficulty)errors.push("난이도를 확인해 주세요.");
    if(!item.prompt)errors.push("문제가 비어 있습니다.");else if(item.prompt.length>600)errors.push("문제는 600자까지 입력할 수 있습니다.");
    if(!item.concept)errors.push("개념을 확인해 주세요.");
    if(!item.explanation)errors.push("해설이 비어 있습니다.");else if(item.explanation.length>1200)errors.push("해설은 1,200자까지 입력할 수 있습니다.");
    if(item.surface&&item.surface!=="game"){
      if(!item.grade||!item.track)errors.push("학년과 과목을 확인해 주세요.");
      else if(!TRACK_GRADES[item.track]?.includes(item.grade))errors.push("학년과 과목이 서로 맞지 않습니다.");
    }
    if(item.surface&&item.surface!=="today"&&!item.gameKey)errors.push("미니게임을 확인해 주세요.");
    if(item.type==="choice"){
      if(item.choices.some(choice=>!choice))errors.push("선택지 5개를 모두 입력해 주세요.");
      if(item.answer<0||item.answer>4)errors.push("객관식 정답은 1~5로 입력해 주세요.");
    }
    if(item.type==="text"&&!item.answers.length)errors.push("주관식 정답을 입력해 주세요.");
    return errors;
  }
  function fingerprint(item){return [item.surface,item.type,item.track,item.gameKey,key(item.prompt)].join("|")}
  function parseRows(rows,existing=[]){
    const known=new Set(existing.map(fingerprint)),seen=new Set();
    return rows.map((row,index)=>{const normalized=normalizeRow(row),item=normalized.item,errors=validate(item),finger=fingerprint(item);if(!errors.length&&(known.has(finger)||seen.has(finger)))errors.push("이미 같은 문항이 있습니다.");seen.add(finger);return {row:index+2,item,errors,recommendation:normalized.recommendation}});
  }
  return {normalizeRow,validate,fingerprint,parseRows,recommend};
});
