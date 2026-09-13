/* =========================================================
   개념 목록 (공용) — 개념 지도(map.html)와 홈의 찾기가 함께 씁니다.
   한 곳에서만 고치면 둘 다 같이 바뀝니다.

   NODES  : 개념 하나하나. 열쇠말(poly, eq, …)이 곧 주소가 됩니다
            → map.html?n=poly 로 링크를 보낼 수 있습니다
   LAYERS : 배우는 순서대로 쌓은 층. 여기 적힌 순서가 화면 순서입니다
   EDGES  : [먼저, 나중] — "이게 있어야 저게 된다"

   자료를 새로 만들면 해당 개념의 demos 배열에 한 줄 추가하면 됩니다.
   ========================================================= */

const SUBJECT_COLOR = {
  "공통수학":    "var(--sub-common)",
  "대수":        "var(--sub-algebra)",
  "미적분Ⅰ":     "var(--sub-calc1)",
  "미적분Ⅱ":     "var(--sub-calc2)",
  "확률과 통계": "var(--sub-stat)",
  "기하":        "var(--sub-geo)",
};

const NODES = {
  /* ---------- 고1 · 공통수학1 ---------- */
  poly:   { name: "다항식", subject: "공통수학", year: "고1",
            about: "식을 더하고 곱하고 나누는 규칙. 뒤에 나오는 거의 모든 계산이 여기서 출발합니다.",
            demos: [{ t: "곱셈 공식을 넓이로", h: "demos/expand-area.html" }] },
  eq:     { name: "방정식과 부등식", subject: "공통수학", year: "고1",
            about: "판별식으로 해의 개수를 가르고, 이차부등식의 해를 그래프로 읽습니다.",
            demos: [{ t: "a, b, c 를 움직이면", h: "demos/quadratic.html" }] },
  count:  { name: "경우의 수", subject: "공통수학", year: "고1",
            about: "순열과 조합으로 가짓수를 셉니다. 확률의 분모와 분자를 만드는 도구입니다.",
            demos: [{ t: "순열과 조합, 실제로 늘어놓기", h: "demos/permutation-combination.html" }] },

  /* ---------- 고1 · 공통수학2 ---------- */
  func:   { name: "함수와 그래프", subject: "공통수학", year: "고1",
            about: "함수·역함수·유리함수·무리함수. '그래프로 본다'는 습관이 여기서 생깁니다.",
            demos: [{ t: "역함수는 왜 y = x 대칭인가", h: "demos/inverse-function.html" }] },
  geomeq: { name: "도형의 방정식", subject: "공통수학", year: "고1",
            about: "점·직선·원을 좌표와 식으로 다룹니다. 도형 문제가 계산 문제로 바뀝니다.",
            demos: [{ t: "원과 직선의 위치관계", h: "demos/circle-line.html" }] },

  /* ---------- 고2 ---------- */
  explog: { name: "지수함수와 로그함수", subject: "대수", year: "고2",
            about: "곱셈을 덧셈으로 바꾸는 도구. 아주 큰 수와 아주 작은 수를 다룹니다.",
            demos: [{ t: "지수함수와 로그함수는 거울상", h: "demos/exp-log.html" }] },
  trig:   { name: "삼각함수", subject: "대수", year: "고2",
            about: "단위원 위의 점에서 나온 함수. 각과 길이를 잇는 다리입니다.",
            demos: [{ t: "단위원과 삼각함수 그래프", h: "demos/unit-circle.html" },
                    { t: "y = a sin(b(x − c)) + d", h: "demos/trig-transform.html" },
                    { t: "사인법칙과 외접원", h: "demos/law-of-sines.html" }] },
  seq:    { name: "수열", subject: "대수", year: "고2",
            about: "자연수에 값을 대응시킨 함수. 규칙을 찾고 합을 구합니다.",
            demos: [{ t: "등차수열의 합을 눈으로", h: "demos/arithmetic-sum.html" }] },
  limit:  { name: "함수의 극한과 연속", subject: "미적분Ⅰ", year: "고2",
            about: "'가까이 가면 어떻게 되는가'. 미분과 적분이 서 있는 바닥입니다.",
            demos: [{ t: "가까이 가면 어떻게 되는가", h: "demos/limit-continuity.html" }] },
  prob:   { name: "확률", subject: "확률과 통계", year: "고2",
            about: "센 가짓수를 비율로 바꿉니다. 직관이 자주 틀리는 곳이기도 합니다.",
            demos: [{ t: "몬티 홀 문제", h: "demos/monty-hall.html" }] },

  /* ---------- 고2 후반 ---------- */
  diff:   { name: "미분", subject: "미적분Ⅰ", year: "고2",
            about: "순간의 변화율. 그래프에서는 접선의 기울기로 보입니다.",
            demos: [{ t: "미분계수는 접선의 기울기", h: "demos/derivative.html" },
                    { t: "f 와 f′ 를 나란히", h: "demos/derivative-sign.html" }] },
  integ:  { name: "적분", subject: "미적분Ⅰ", year: "고2",
            about: "잘게 나눠 더하면 넓이가 됩니다. 미분을 거꾸로 돌린 것이기도 합니다.",
            demos: [{ t: "구분구적법과 정적분", h: "demos/riemann.html" }] },
  stat:   { name: "통계", subject: "확률과 통계", year: "고2",
            about: "표본 몇 개로 전체를 추정합니다. 정규분포가 중심에 있습니다.",
            demos: [{ t: "정규분포와 신뢰구간", h: "demos/normal-distribution.html" }] },

  /* ---------- 고3 ---------- */
  seqlim:   { name: "수열의 극한", subject: "미적분Ⅱ", year: "고3",
              about: "무한히 더하면 어디로 가는가. 유한한 값이 나오는 게 신기한 지점입니다.",
              demos: [{ t: "무한등비급수", h: "demos/geometric-series.html" }] },
  difflaw:  { name: "미분법", subject: "미적분Ⅱ", year: "고3",
              about: "삼각·지수·로그함수까지 미분합니다. 합성함수와 매개변수도 여기서.",
              demos: [{ t: "lim (sin x)/x = 1", h: "demos/sinx-over-x.html" }] },
  integlaw: { name: "적분법", subject: "미적분Ⅱ", year: "고3",
              about: "치환적분·부분적분으로 넓이를 넘어 부피까지 구합니다.",
              demos: [{ t: "회전체의 부피", h: "demos/solid-of-revolution.html" }] },
  conic:    { name: "이차곡선", subject: "기하", year: "고3",
              about: "포물선·타원·쌍곡선. 따로 외울 것 같지만 원뿔 하나에서 다 나옵니다.",
              demos: [{ t: "원뿔을 자르면", h: "demos/conic-sections.html" },
                      { t: "타원 당구대", h: "demos/elliptic-billiard.html" }] },
  vec:      { name: "평면벡터", subject: "기하", year: "고3",
              about: "크기와 방향을 함께 가진 양. 내적으로 각과 수직을 계산합니다.",
              demos: [{ t: "벡터의 내적", h: "demos/dot-product.html" }] },
  space:    { name: "공간도형과 공간좌표", subject: "기하", year: "고3",
              about: "3차원에서의 수직·정사영. 평면도만 봐서는 안 보이는 것들입니다.",
              demos: [{ t: "정사영과 넓이", h: "demos/projection.html" },
                      { t: "삼수선의 정리", h: "demos/three-perpendiculars.html" }] },
};

// 배우는 순서대로 쌓은 층
const LAYERS = [
  { label: "고1 · 공통수학1", ids: ["poly", "eq", "count"] },
  { label: "고1 · 공통수학2", ids: ["func", "geomeq"] },
  { label: "고2 · 대수 / 미적분Ⅰ / 확률과 통계", ids: ["explog", "trig", "seq", "limit", "prob"] },
  { label: "고2 · 미적분Ⅰ / 확률과 통계", ids: ["diff", "integ", "stat"] },
  { label: "고3 · 미적분Ⅱ / 기하", ids: ["seqlim", "difflaw", "integlaw", "conic", "vec", "space"] },
];

// [먼저, 나중] — "먼저가 있어야 나중이 된다"
const EDGES = [
  ["poly", "eq"], ["poly", "func"],
  ["eq", "geomeq"],
  ["func", "explog"], ["func", "trig"], ["func", "seq"], ["func", "limit"],
  ["geomeq", "conic"], ["geomeq", "vec"],
  ["count", "prob"], ["prob", "stat"],
  ["limit", "diff"], ["diff", "integ"],
  ["seq", "seqlim"], ["limit", "seqlim"],
  ["trig", "difflaw"], ["explog", "difflaw"], ["diff", "difflaw"],
  ["integ", "integlaw"], ["difflaw", "integlaw"],
  ["trig", "space"], ["vec", "space"],
];
