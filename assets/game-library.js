const games = [
  {title:"마지막 종이 울리기 전에",category:"방탈출 게임",description:"교실 속 단서를 풀고 세 개의 열쇠를 찾으세요.",detail:"15분 · 교실 3개",image:"assets/escape-classroom.png",url:"escape.html",note:"사이트 안에서 바로 실행 · 로그인 불필요"},
  {title:"그래프 짝 맞추기",category:"함수 · 그래프",description:"함수의 식과 그래프의 핵심 특징을 빠르게 연결하세요.",detail:"4분 · 선택형+주관식",symbol:"f(x)",color:"#d9f26e",url:"quick-game.html?game=graph"},
  {title:"미분 부호 탐정",category:"미적분 · 변화율",description:"도함수의 부호로 증가와 감소를 추리하세요.",detail:"4분 · 선택형+주관식",symbol:"f′",color:"#cfc7f8",url:"quick-game.html?game=derivative"},
  {title:"수열 암호 해독",category:"대수 · 수열",description:"수의 규칙을 찾아 암호의 다음 값을 완성하세요.",detail:"4분 · 선택형+주관식",symbol:"aₙ",color:"#c6eddc",url:"quick-game.html?game=sequence"},
  {title:"확률 예측 실험실",category:"확률 · 의사결정",description:"가능한 경우를 세고 결과의 확률을 예측하세요.",detail:"4분 · 선택형+주관식",symbol:"P(A)",color:"#fcbba6",url:"quick-game.html?game=probability"},
  {title:"순열·조합 분류소",category:"경우의 수 · 선택",description:"순서가 중요한지 판단해 알맞은 계산법을 고르세요.",detail:"4분 · 선택형+주관식",symbol:"nCr",color:"#f9cfe0",url:"quick-game.html?game=counting"},
  {title:"함수 변환 조종실",category:"함수 · 평행이동",description:"그래프를 이동하고 대칭시키는 명령을 찾으세요.",detail:"4분 · 선택형+주관식",symbol:"↔",color:"#e2f09a",url:"quick-game.html?game=transform"},
  {title:"극한값 스피드 판정",category:"미적분 · 극한",description:"대입과 인수분해로 극한값을 빠르게 판정하세요.",detail:"4분 · 선택형+주관식",symbol:"lim",color:"#d8d2f5",url:"quick-game.html?game=limit"},
  {title:"벡터 방향 맞히기",category:"기하 · 벡터",description:"성분과 내적으로 벡터의 방향 관계를 판단하세요.",detail:"4분 · 선택형+주관식",symbol:"a⃗",color:"#cfe9dd",url:"quick-game.html?game=vector"},
  {title:"정적분 넓이 채우기",category:"미적분 · 누적량",description:"그래프와 x축 사이의 넓이를 계산하세요.",detail:"4분 · 선택형+주관식",symbol:"∫",color:"#fbd2c0",url:"quick-game.html?game=integral"},
  {title:"오류 찾기 챌린지",category:"수학적 의사소통 · 검산",description:"풀이 속 첫 오류를 찾아 올바른 개념으로 고치세요.",detail:"4분 · 선택형",symbol:"?",color:"#f8f1e3",url:"quick-game.html?game=error"}
];

const grid=document.getElementById("gameGrid");
games.forEach((game,index)=>{
  const card=document.createElement("a");
  card.className="game-card";
  card.href=game.url;
  if(/^https?:\/\//.test(game.url)){card.target="_blank";card.rel="noopener noreferrer"}
  const visual=game.image
    ? '<img src="'+game.image+'" alt="" loading="'+(index?"lazy":"eager")+'">'
    : '<div class="game-art" style="--art-color:'+game.color+'" aria-hidden="true"><span>'+game.symbol+'</span><i></i></div>';
  card.innerHTML=visual+'<div class="game-card-content"><span class="game-category">'+game.category+'</span><h2 class="game-title">'+game.title+'</h2><p class="game-description">'+game.description+'</p><p class="game-detail">'+game.detail+'</p><span class="game-launch">게임 시작 <span aria-hidden="true">→</span></span>'+(game.note?'<small class="game-note">'+game.note+'</small>':'')+'</div>';
  grid.appendChild(card);
});