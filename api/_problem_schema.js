const TRACKS={
  common1:{name:"공통수학1",grades:["1"]},common2:{name:"공통수학2",grades:["1"]},
  algebra:{name:"대수",grades:["2"]},calc1:{name:"미적분Ⅰ",grades:["2"]},
  stats:{name:"확률과 통계",grades:["2","3"]},calc2:{name:"미적분Ⅱ",grades:["3"]},geometry:{name:"기하",grades:["3"]}
};
const CONCEPTS={poly:"다항식",eq:"방정식과 부등식",count:"경우의 수",func:"함수와 그래프",geomeq:"도형의 방정식",explog:"지수함수와 로그함수",trig:"삼각함수",seq:"수열",limit:"함수의 극한과 연속",diff:"미분",integ:"적분",prob:"확률",stat:"통계",seqlim:"수열의 극한",difflaw:"미분법",integlaw:"적분법",conic:"이차곡선",vec:"평면벡터",space:"공간도형과 공간좌표"};
const GAMES={graph:"그래프 짝 맞추기",derivative:"미분 부호 탐정",sequence:"수열 암호 해독",probability:"확률 예측 실험실",counting:"순열·조합 분류소",transform:"함수 변환 조종실",limit:"극한값 스피드 판정",vector:"벡터 방향 맞히기",integral:"정적분 넓이 채우기",error:"오류 찾기 챌린지"};
const one=(value,max)=>String(value??"").trim().slice(0,max);
const bool=value=>value===true||value==="true"||value===1||value==="1";
function clean(input={},previous={}){
  const type=input.type==="text"?"text":"choice";
  const surface=["today","game","both"].includes(input.surface)?input.surface:"today";
  const grade=["1","2","3"].includes(String(input.grade))?String(input.grade):"";
  const track=Object.hasOwn(TRACKS,input.track)?String(input.track):"";
  const gameKey=Object.hasOwn(GAMES,input.gameKey)?String(input.gameKey):"";
  const concept=Object.hasOwn(CONCEPTS,input.concept)?String(input.concept):"";
  const difficulty=["basic","standard","advanced"].includes(input.difficulty)?input.difficulty:"standard";
  const prompt=one(input.prompt,600),explanation=one(input.explanation,1200),source=one(input.source,160),note=one(input.note,240);
  if(!prompt)throw new Error("문제 내용을 입력해 주세요.");
  if(!concept)throw new Error("관련 개념을 선택해 주세요.");
  if(!explanation)throw new Error("해설을 입력해 주세요.");
  if(surface!=="game"){
    if(!grade||!track)throw new Error("오늘의 문제에 사용할 학년과 과목을 선택해 주세요.");
    if(!TRACKS[track].grades.includes(grade))throw new Error("학년과 과목이 서로 맞지 않습니다.");
  }
  if(surface!=="today"&&!gameKey)throw new Error("문항을 넣을 미니게임을 선택해 주세요.");
  const item={
    type,surface,grade,track,gameKey,concept,conceptName:CONCEPTS[concept],difficulty,prompt,explanation,source,note,
    published:input.published===undefined?true:bool(input.published),
    createdAt:previous.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()
  };
  if(type==="choice"){
    const choices=(Array.isArray(input.choices)?input.choices:[]).map(v=>one(v,180));
    if(choices.length!==5||choices.some(v=>!v))throw new Error("오지선다형 선택지 5개를 모두 입력해 주세요.");
    const answer=Number(input.answer);
    if(!Number.isInteger(answer)||answer<0||answer>4)throw new Error("정답 선택지를 지정해 주세요.");
    item.choices=choices;item.answer=answer;
  }else{
    const raw=Array.isArray(input.answers)?input.answers:String(input.answers||"").split(/\r?\n|,/);
    const answers=[...new Set(raw.map(v=>one(v,100)).filter(Boolean))].slice(0,10);
    if(!answers.length)throw new Error("주관식 정답을 하나 이상 입력해 주세요.");
    item.answers=answers;
  }
  return item;
}
function publicItem(id,item){
  const base={id,type:item.type,concept:item.concept,conceptName:item.conceptName||CONCEPTS[item.concept],prompt:item.prompt,explanation:item.explanation,note:item.note||"",difficulty:item.difficulty||"standard",source:item.source||"",custom:true};
  if(item.type==="choice"){base.choices=item.choices;base.answer=item.answer}else base.answers=item.answers;
  return base;
}
module.exports={TRACKS,CONCEPTS,GAMES,clean,publicItem};
