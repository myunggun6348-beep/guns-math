(function(){
  "use strict";
  const C=(prompt,choices,answer,explanation,note="")=>({type:"choice",prompt,choices,answer,explanation,note});
  const T=(prompt,answers,explanation,note="")=>({type:"text",prompt,answers:Array.isArray(answers)?answers:[answers],explanation,note});
  const games={
    graph:{
      title:"그래프 짝 맞추기",kicker:"함수 · 그래프",desc:"함수의 식과 그래프의 핵심 특징을 빠르게 연결하세요.",color:"#d9f26e",
      questions:[
        C("함수 y=(x−2)²+1의 그래프로 알맞은 설명은?",["꼭짓점 (2, 1), 아래로 열린다","꼭짓점 (2, 1), 위로 열린다","꼭짓점 (−2, 1), 위로 열린다","꼭짓점 (1, 2), 위로 열린다","꼭짓점 (−2, −1), 아래로 열린다"],1,"y=(x−a)²+b는 꼭짓점이 (a,b)이고 위로 열립니다."),
        C("y=|x+3|−2의 꼭짓점은?",["(3, 2)","(3, −2)","(−3, 2)","(−3, −2)","(−2, −3)"],3,"절댓값 안의 x+3=0에서 x=−3이고, 아래로 2만큼 이동하므로 (−3,−2)입니다."),
        C("y=−2ˣ의 그래프에 대한 설명으로 옳은 것은?",["항상 양수이고 증가한다","항상 음수이고 감소한다","항상 음수이고 증가한다","y축과 만나지 않는다","x축과 한 점에서 만난다"],1,"2ˣ은 증가하고 양수입니다. 전체에 음수를 붙이면 항상 음수이며 x가 커질수록 값은 작아집니다."),
        C("y=log₂x의 그래프가 반드시 지나는 점은?",["(0, 1)","(1, 0)","(2, 2)","(−1, 0)","(0, 2)"],1,"log₂1=0이므로 (1,0)을 지납니다. 정의역은 x>0입니다."),
        T("직선 y=3x−4의 y절편을 숫자로 입력하세요.",["-4","−4"],"x=0을 대입하면 y=−4이므로 y절편은 −4입니다.")
      ]
    },
    derivative:{
      title:"미분 부호 탐정",kicker:"미적분 · 변화율",desc:"도함수의 부호로 함수가 어디에서 오르고 내리는지 추리하세요.",color:"#cfc7f8",
      questions:[
        C("f′(x)>0인 구간에서 f(x)는 어떻게 변하는가?",["증가한다","감소한다","항상 0이다","극댓값을 갖는다","판단할 수 없다"],0,"도함수가 양수이면 x가 증가할 때 함수값도 증가합니다."),
        C("f(x)=x²−4x의 감소 구간은?",["x<0","x<2","x>2","0<x<4","모든 실수"],1,"f′(x)=2x−4이고, f′(x)<0인 x<2에서 감소합니다."),
        C("f′(x)의 부호가 x=1에서 +에서 −로 바뀐다. f(1)은?",["극솟값","극댓값","변곡점","항상 0","알 수 없음"],1,"증가하다 감소하므로 x=1에서 극댓값을 갖습니다."),
        T("f(x)=x³−3x에서 f′(2)의 값을 입력하세요.",["9","+9"],"f′(x)=3x²−3이므로 f′(2)=12−3=9입니다."),
        C("어떤 상품의 이익 P(x)에서 P′(100)<0이다. 가장 알맞은 해석은?",["100개 근처에서 생산량을 늘리면 이익이 증가한다","100개 근처에서 생산량을 늘리면 이익이 감소한다","100개 생산 시 이익은 0이다","100개가 반드시 최대 이익점이다","생산량과 이익은 무관하다"],1,"P′(100)<0은 100개 부근에서 생산량의 작은 증가가 이익을 감소시키는 방향임을 뜻합니다.")
      ]
    },
    sequence:{
      title:"수열 암호 해독",kicker:"대수 · 수열",desc:"수의 규칙을 찾아 암호의 다음 값을 완성하세요.",color:"#c6eddc",
      questions:[
        T("수열 3, 7, 11, 15, …의 다음 항은?",["19"],"공차가 4인 등차수열이므로 15+4=19입니다."),
        T("수열 2, 6, 18, 54, …의 다음 항은?",["162"],"공비가 3인 등비수열이므로 54×3=162입니다."),
        C("a₁=5, aₙ₊₁=aₙ−2일 때 a₄는?",["−3","−1","1","3","7"],1,"5, 3, 1, −1 순서이므로 a₄=−1입니다."),
        T("1+3+5+7+9의 값을 입력하세요.",["25"],"첫 다섯 홀수의 합은 5²=25입니다."),
        C("수열 1, 1, 2, 3, 5, 8, …에서 각 항의 규칙은?",["앞 항에 1을 더한다","앞 항에 2를 곱한다","앞의 두 항을 더한다","홀수만 차례로 더한다","항 번호를 제곱한다"],2,"세 번째 항부터 바로 앞의 두 항을 더한 피보나치형 수열입니다.")
      ]
    },
    probability:{
      title:"확률 예측 실험실",kicker:"확률 · 의사결정",desc:"가능한 경우를 세고 결과를 예측해 확률 감각을 시험하세요.",color:"#fcbba6",
      questions:[
        C("공정한 동전 2개를 던질 때 앞면이 정확히 1개 나올 확률은?",["1/4","1/3","1/2","2/3","3/4"],2,"가능한 결과 HH, HT, TH, TT 중 HT와 TH 두 가지이므로 2/4=1/2입니다."),
        C("공정한 주사위 1개를 던져 4 이상의 눈이 나올 확률은?",["1/6","1/3","1/2","2/3","5/6"],2,"4, 5, 6의 3가지이므로 3/6=1/2입니다."),
        T("빨간 공 3개, 파란 공 2개 중 하나를 꺼낼 때 빨간 공이 나올 확률을 분수로 입력하세요.",["3/5","3⁄5"],"전체 5개 중 빨간 공이 3개이므로 확률은 3/5입니다."),
        C("어떤 사건을 200번 반복해 46번 일어났다. 상대도수는?",["0.023","0.23","0.46","2.3","4.6"],1,"46÷200=0.23입니다. 반복 횟수가 커질수록 상대도수는 이론적 확률에 가까워지는 경향이 있습니다."),
        C("A와 B가 서로 배반이고 P(A)=0.3, P(B)=0.4일 때 P(A∪B)는?",["0.1","0.12","0.3","0.7","1.2"],3,"서로 배반이면 동시에 일어날 수 없으므로 P(A∪B)=P(A)+P(B)=0.7입니다.")
      ]
    },
    counting:{
      title:"순열·조합 분류소",kicker:"경우의 수 · 선택",desc:"순서가 중요한지 판단하고 알맞은 계산법을 고르세요.",color:"#f9cfe0",
      questions:[
        C("5명 중 회장과 부회장을 한 명씩 뽑는 경우에 알맞은 것은?",["5C2","5P2","2⁵","5!","2!"],1,"직책이 달라 순서가 중요하므로 5P2입니다."),
        C("7권 중 읽을 책 3권을 고르는 경우에 알맞은 것은?",["7P3","7C3","3⁷","7!","3!"],1,"고른 순서는 결과에 영향을 주지 않으므로 조합 7C3입니다."),
        T("서로 다른 4명을 한 줄로 세우는 경우의 수는?",["24"],"4!=4×3×2×1=24입니다."),
        C("메뉴 4종과 음료 3종에서 각각 하나씩 고르는 경우의 수는?",["7","12","24","34","64"],1,"메뉴 선택 4가지 각각에 음료 3가지가 있으므로 곱의 법칙으로 4×3=12입니다."),
        T("8명 중 대표 2명을 고르는 경우의 수를 입력하세요.",["28"],"순서 없이 2명을 고르므로 8C2=8×7÷2=28입니다.")
      ]
    },
    transform:{
      title:"함수 변환 조종실",kicker:"함수 · 평행이동",desc:"그래프를 좌우·상하로 움직이고 대칭시키는 조종 명령을 찾으세요.",color:"#e2f09a",
      questions:[
        C("y=f(x)의 그래프를 오른쪽으로 3만큼 이동한 식은?",["y=f(x)+3","y=f(x)−3","y=f(x+3)","y=f(x−3)","y=3f(x)"],3,"가로 이동은 식 안에서 반대로 보입니다. 오른쪽 3만큼이면 f(x−3)입니다."),
        C("y=f(x)를 위로 2만큼 이동한 식은?",["y=f(x+2)","y=f(x−2)","y=f(x)+2","y=f(x)−2","y=2f(x)"],2,"함수값 전체에 2를 더하면 모든 점의 y좌표가 2만큼 커집니다."),
        C("y=f(x)를 x축에 대칭이동한 식은?",["y=f(−x)","y=−f(x)","y=f(x)+1","x=−f(y)","y=1/f(x)"],1,"x축 대칭은 모든 y좌표의 부호를 바꾸므로 y=−f(x)입니다."),
        C("y=f(x)를 y축에 대칭이동한 식은?",["y=f(−x)","y=−f(x)","y=f(x−1)","y=|f(x)|","y=f(x)²"],0,"y축 대칭은 모든 x좌표의 부호를 바꾸므로 x 대신 −x를 넣습니다."),
        T("y=x²의 그래프를 왼쪽으로 1, 아래로 4만큼 이동한 식의 꼭짓점 y좌표는?",["-4","−4"],"이동한 식은 y=(x+1)²−4이고 꼭짓점은 (−1,−4)입니다.")
      ]
    },
    limit:{
      title:"극한값 스피드 판정",kicker:"미적분 · 극한",desc:"대입, 인수분해, 좌우극한을 구분해 빠르게 극한값을 판정하세요.",color:"#d8d2f5",
      questions:[
        T("lim(x→2) (3x+1)의 값을 입력하세요.",["7"],"다항함수는 연속이므로 x=2를 바로 대입해 7입니다."),
        T("lim(x→1) (x²−1)/(x−1)의 값을 입력하세요.",["2"],"x²−1=(x−1)(x+1)로 인수분해해 약분하면 x+1, 따라서 극한값은 2입니다."),
        C("lim(x→0) 1/x에 대한 설명으로 옳은 것은?",["0이다","1이다","∞이다","−∞이다","양쪽 극한이 달라 존재하지 않는다"],4,"오른쪽에서는 +∞, 왼쪽에서는 −∞로 향하므로 양쪽 극한은 존재하지 않습니다."),
        C("lim(x→∞) (2x+1)/(x−3)의 값은?",["0","1","2","3","∞"],2,"분자와 분모의 최고차항 계수의 비 2/1=2입니다."),
        T("lim(x→0) sin x / x의 값을 입력하세요.",["1"],"라디안 단위에서 사용하는 대표적인 기본 극한으로 값은 1입니다.")
      ]
    },
    vector:{
      title:"벡터 방향 맞히기",kicker:"기하 · 벡터",desc:"성분과 내적을 이용해 벡터의 길이와 방향 관계를 판단하세요.",color:"#cfe9dd",
      questions:[
        T("벡터 a=(3,4)의 크기를 입력하세요.",["5"],"|a|=√(3²+4²)=5입니다."),
        C("a·b>0일 때 두 벡터가 이루는 각 θ의 범위는?",["θ=0°만 가능","0°≤θ<90°","θ=90°","90°<θ≤180°","판단 불가"],1,"a·b=|a||b|cosθ>0이므로 cosθ>0, 두 벡터의 사잇각은 예각입니다."),
        T("a=(1,2), b=(3,−1)일 때 a·b의 값을 입력하세요.",["1","+1"],"a·b=1×3+2×(−1)=1입니다."),
        C("서로 수직인 두 영벡터가 아닌 벡터의 내적은?",["−1","0","1","두 벡터 길이의 합","항상 양수"],1,"수직이면 cos90°=0이므로 내적은 0입니다."),
        C("벡터 (2,−3)과 같은 방향인 벡터는?",["(−2,3)","(4,−6)","(3,−2)","(−4,−6)","(0,0)"],1,"(4,−6)=2(2,−3)처럼 양의 실수배이면 같은 방향입니다.")
      ]
    },
    integral:{
      title:"정적분 넓이 채우기",kicker:"미적분 · 누적량",desc:"그래프와 x축 사이의 넓이를 계산해 빈 칸을 채우세요.",color:"#fbd2c0",
      questions:[
        T("∫₀² x dx의 값을 입력하세요.",["2"],"밑변 2, 높이 2인 삼각형의 넓이로 2입니다. 원시함수로 계산해도 [x²/2]₀²=2입니다."),
        T("∫₁³ 2 dx의 값을 입력하세요.",["4"],"높이 2, 폭 2인 직사각형의 넓이는 4입니다."),
        C("f(x)<0인 구간에서 ∫f(x)dx와 도형의 넓이 관계는?",["항상 같다","정적분은 음수일 수 있어 넓이는 절댓값으로 계산한다","넓이도 항상 음수다","정적분은 언제나 0이다","관계가 없다"],1,"정적분은 부호가 있는 넓이입니다. x축 아래 부분의 실제 넓이는 정적분 값의 절댓값을 취합니다."),
        T("∫₀¹ (3x²) dx의 값을 입력하세요.",["1"],"원시함수는 x³이므로 [x³]₀¹=1입니다."),
        C("속도 v(t)를 시간에 대해 정적분하면 얻는 것은?",["가속도","변위","평균 속력만","질량","기울기"],1,"속도는 위치의 변화율이므로 속도의 정적분은 위치의 변화량, 즉 변위입니다.")
      ]
    },
    error:{
      title:"오류 찾기 챌린지",kicker:"수학적 의사소통 · 검산",desc:"풀이 속 한 줄의 오류를 찾아 올바른 개념으로 고치세요.",color:"#f8f1e3",
      questions:[
        C("다음 풀이에서 처음 틀린 줄은? ① x²=9 ② x=3 ③ 따라서 해는 3이다.",["①","②","③","오류 없음","조건 부족"],1,"x²=9이면 x=±3입니다. 음의 해를 빠뜨린 ②가 처음 틀린 줄입니다."),
        C("① (a+b)²을 전개한다. ② a²+b²이다. ③ 따라서 2ab항은 없다.",["①","②","③","오류 없음","a,b 값이 필요"],1,"(a+b)²=a²+2ab+b²이므로 ②에서 교차항 2ab를 빠뜨렸습니다."),
        C("① √(x²)을 계산한다. ② 결과는 x이다. ③ 모든 실수 x에서 성립한다.",["①","②","③","오류 없음","제곱근은 정의되지 않음"],1,"√(x²)=|x|입니다. x가 음수일 때 x와 다르므로 ②가 틀렸습니다."),
        C("① 분모가 0인 1/0을 생각한다. ② 매우 큰 수로 본다. ③ 따라서 1/0=∞이다.",["①","②","③","오류 없음","∞=0"],1,"0으로 나누기는 정의되지 않습니다. 극한에서 값이 커지는 현상과 실제 대입값을 구분해야 합니다."),
        C("① 두 사건 A,B가 독립이다. ② P(A∩B)=P(A)+P(B)이다. ③ 이를 이용해 교집합 확률을 구한다.",["①","②","③","오류 없음","독립이면 교집합은 0"],1,"독립 사건은 P(A∩B)=P(A)P(B)입니다. 확률을 더하는 식은 서로 배반인 사건의 합집합에서 사용합니다.")
      ]
    }
  };

  if(window.expandQuickGameBanks)window.expandQuickGameBanks({games,C,T});

  const app=document.getElementById("gameApp");
  const key=new URLSearchParams(location.search).get("game");
  const game=games[key];
  const wrongConcept={graph:["func","함수와 그래프"],derivative:["diff","미분"],sequence:["seq","수열"],probability:["prob","확률"],counting:["count","경우의 수"],transform:["func","함수와 그래프"],limit:["limit","함수의 극한과 연속"],vector:["vec","평면벡터"],integral:["integ","적분"],error:["","풀이 검산"]}[key]||["",""];
  if(!game){
    app.innerHTML='<div class="result-panel"><h1>게임을 찾을 수 없습니다.</h1><p>게임 목록에서 다시 선택해 주세요.</p><a class="quick-btn" href="games.html">게임 목록으로</a></div>';
    return;
  }

  document.title=game.title+" | 수학을 보다";
  app.style.setProperty("--game-color",game.color);
  let questions=[],index=0,score=0,streak=0,correct=0,selected=null,locked=false,timeLeft=240,timerId=null,startedAt=0;

  function shuffle(items){
    const a=items.slice();
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  }
  function esc(value){return String(value).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
  function norm(value){return String(value).trim().toLowerCase().replace(/[−–—]/g,"-").replace(/\s+/g,"").replace(/,/g,"")}
  function best(){return Number(localStorage.getItem("quick-game-best-"+key)||0)}
  function hero(){
    return '<div class="quick-hero"><span class="quick-kicker">'+game.kicker+'</span><h1 class="quick-title">'+game.title+'</h1><p class="quick-desc">'+game.desc+'</p><div class="quick-meta"><span>4분</span><span>매회 5문제</span><span>문제은행 '+game.questions.length+'</span><span>펜 풀이</span><span>즉시 해설</span><span>최고 '+best()+'점</span></div></div>'
  }
  function intro(){
    app.innerHTML=hero()+'<div class="start-panel"><h2>준비되면 시작하세요</h2><p>문제마다 답을 한 번 제출할 수 있습니다. 빠르고 정확하게 풀수록 점수가 올라갑니다.</p><ul class="start-list"><li>각 문제에서 태블릿 펜으로 바로 계산</li><li>정답 160점 + 연속 정답 보너스</li><li>오답도 풀이 흔적과 함께 해설 확인</li><li>기록은 이 기기에 자동 저장</li></ul><button class="quick-btn" id="startBtn">게임 시작</button></div>';
    document.getElementById("startBtn").addEventListener("click",start);
  }
  function start(){
    const shuffled=shuffle(game.questions);const mixed=[];const oneChoice=shuffled.find(q=>q.type==="choice");const oneText=shuffled.find(q=>q.type==="text");if(oneChoice)mixed.push(oneChoice);if(oneText)mixed.push(oneText);for(const q of shuffled){if(mixed.length>=5)break;if(!mixed.includes(q))mixed.push(q)}questions=shuffle(mixed);index=0;score=0;streak=0;correct=0;timeLeft=240;startedAt=Date.now();locked=false;
    window.GameScratch.reset();clearInterval(timerId);timerId=setInterval(tick,1000);renderQuestion();
  }
  function tick(){
    timeLeft=Math.max(0,240-Math.floor((Date.now()-startedAt)/1000));
    const el=document.getElementById("timer");
    if(el){el.textContent=formatTime(timeLeft);el.classList.toggle("warning",timeLeft<=30)}
    if(timeLeft===0){clearInterval(timerId);finish()}
  }
  function formatTime(sec){return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0")}
  function renderQuestion(){
    selected=null;locked=false;
    const q=questions[index];
    const answer=q.type==="choice"
      ? '<div class="choice-list">'+q.choices.map((x,i)=>'<button type="button" class="choice-btn" data-choice="'+i+'"><b>'+(i+1)+'.</b> '+esc(x)+'</button>').join("")+'</div>'
      : '<div class="answer-row"><label class="sr-status" for="answerInput">답 입력</label><input id="answerInput" class="answer-input" inputmode="text" autocomplete="off" placeholder="답을 입력하세요"><button type="button" class="quick-btn" id="inlineSubmit">제출</button></div>';
    app.innerHTML=hero()+'<section class="quiz-panel"><div class="quiz-top"><span class="progress-label">'+(index+1)+' / '+questions.length+'</span><span class="timer" id="timer">'+formatTime(timeLeft)+'</span></div><div class="progress-track" aria-hidden="true"><div class="progress-bar" style="width:'+((index+1)/questions.length*100)+'%"></div></div><div class="score-line"><span>점수 <b>'+score+'</b></span><span>연속 정답 <b>'+streak+'</b></span></div><span class="question-tag">'+(q.type==="choice"?"선택형":"주관식")+'</span><h2 class="question-text">'+q.prompt+(q.note?'<small class="question-note">'+q.note+'</small>':"")+'</h2>'+window.GameScratch.markup()+answer+'<div id="feedbackSlot"></div><div class="quiz-actions"><button type="button" class="quick-btn" id="submitBtn" '+(q.type==="choice"?"disabled":"style=\"display:none\"")+'>답 제출</button></div></section>';
    window.GameScratch.mount(index);
    if(q.type==="choice"){
      document.querySelectorAll(".choice-btn").forEach(btn=>btn.addEventListener("click",()=>{
        if(locked)return;selected=Number(btn.dataset.choice);
        document.querySelectorAll(".choice-btn").forEach(x=>x.classList.toggle("selected",x===btn));
        document.getElementById("submitBtn").disabled=false;
      }));
      document.getElementById("submitBtn").addEventListener("click",submit);
    }else{
      const input=document.getElementById("answerInput");
      document.getElementById("inlineSubmit").addEventListener("click",submit);
      input.addEventListener("keydown",e=>{if(e.key==="Enter")submit()});input.focus();
    }
  }
  function submit(){
    if(locked)return;
    const q=questions[index];let isCorrect=false,userAnswer="";
    if(q.type==="choice"){if(selected===null)return;isCorrect=selected===q.answer;userAnswer=q.choices[selected]}
    else{
      const input=document.getElementById("answerInput");if(!input.value.trim()){input.focus();return}
      userAnswer=input.value;isCorrect=q.answers.some(a=>norm(a)===norm(input.value));
    }
    locked=true;
    document.querySelectorAll(".choice-btn,.answer-input,#inlineSubmit,#submitBtn").forEach(el=>el.disabled=true);
    if(isCorrect){correct++;streak++;score+=160+(streak-1)*20}else{streak=0}
    window.WrongNotes?.record({source:"game",sourceKey:key,sourceTitle:"미니게임 · "+game.title,subject:game.kicker,conceptId:wrongConcept[0],conceptName:wrongConcept[1],prompt:q.prompt,type:q.type,choices:q.choices||[],correctAnswer:q.type==="choice"?q.choices[q.answer]:q.answers[0],userAnswer,explanation:q.explanation,reviewHref:"quick-game.html?game="+key},isCorrect);
    const slot=document.getElementById("feedbackSlot");
    slot.innerHTML='<div class="feedback '+(isCorrect?"correct":"wrong")+'" role="status"><strong>'+(isCorrect?"정답입니다!":"한 번 더 개념을 확인해 봅시다.")+'</strong><span>'+q.explanation+'</span></div>';
    const actions=document.querySelector(".quiz-actions");
    actions.innerHTML='<button type="button" class="quick-btn" id="nextBtn">'+(index===questions.length-1?"결과 보기":"다음 문제")+'</button>';
    const next=document.getElementById("nextBtn");next.disabled=false;next.addEventListener("click",()=>{index++;if(index>=questions.length)finish();else renderQuestion()});next.focus();
  }
  function finish(){
    clearInterval(timerId);window.GameScratch.destroy();
    const previous=best();const finalScore=score+Math.floor(timeLeft/4);
    if(finalScore>previous)localStorage.setItem("quick-game-best-"+key,String(finalScore));
    const elapsed=Math.min(240,Math.max(0,Math.floor((Date.now()-startedAt)/1000)));
    let message=correct===5?"완벽합니다. 속도와 정확성을 모두 잡았습니다.":correct>=3?"핵심 개념을 잘 연결했습니다. 틀린 문제의 해설을 떠올리며 한 번 더 도전해 보세요.":"해설에서 판단 기준을 확인했습니다. 다시 풀면 훨씬 빠르게 보일 겁니다.";
    app.innerHTML=hero()+'<section class="result-panel"><span class="question-tag">게임 완료</span><h2>'+message+'</h2><div class="result-score">'+finalScore+'점</div><div class="result-grid"><div class="result-stat"><b>'+correct+'/5</b><span>정답</span></div><div class="result-stat"><b>'+formatTime(elapsed)+'</b><span>풀이 시간</span></div><div class="result-stat"><b>'+best()+'</b><span>최고 기록</span></div></div><div class="result-actions"><button class="quick-btn" id="retryBtn">다시 도전</button><a class="quick-btn secondary" href="games.html">다른 게임</a><a class="quick-btn secondary" href="wrong-notes.html">오답노트</a></div></section>';
    document.getElementById("retryBtn").addEventListener("click",start);
  }
  intro();
})();