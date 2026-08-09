/* =========================================================
   자료 목록 (공용) — 홈의 찾기와 자료실(library.html)이 함께 씁니다.
   한 곳에서만 고치면 둘 다 같이 바뀝니다.

   새 자료는 아래 DEMOS 에 한 항목만 추가하면 됩니다.
   같은 과목끼리 붙여 두세요 (자료실이 이 순서대로 묶어서 보여 줍니다).

   fig   : 카드에 들어가는 작은 그림 (SVG)
   ready : false 로 두면 '준비 중' 카드가 됩니다
   d3    : true 면 3D 자료 (홈의 '오늘의 한 장면'에서는 빼고 고릅니다)
   ========================================================= */
const G = 'fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

const DEMOS = [
  /* ---------- 공통수학 (고1) ---------- */
  { year: "고1", subject: "공통수학1", unit: "다항식", title: "곱셈 공식을 넓이로",
    desc: "(a+b)² 을 정사각형으로 잘라 보면 2ab 가 어디서 오는지 보입니다.",
    use: "곱셈 공식을 외우기 전에 뜻부터 보여 줄 때",
    keywords: "다항식 곱셈공식 전개 인수분해 완전제곱식 넓이 합차공식",
    href: "demos/expand-area.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <rect x="26" y="6" width="24" height="24" fill="#d9f26e"/>
      <rect x="50" y="6" width="12" height="24"/>
      <rect x="26" y="30" width="24" height="12"/>
      <rect x="50" y="30" width="12" height="12" fill="#201f5e" stroke="none"/>
      <rect x="26" y="6" width="36" height="36"/>
    </g></svg>` },

  { year: "고1", subject: "공통수학1", unit: "경우의 수", title: "순열과 조합, 실제로 늘어놓기",
    desc: "모든 경우를 화면에 다 늘어놓고, 조합에서 무엇이 묶여 사라지는지 봅니다.",
    use: "nPr 과 nCr 의 차이를 공식이 아니라 눈으로 가를 때",
    keywords: "경우의수 순열 조합 nPr nCr 팩토리얼 계승 세기",
    href: "demos/permutation-combination.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <rect x="14" y="10" width="18" height="12" rx="2" fill="#d9f26e"/>
      <rect x="36" y="10" width="18" height="12" rx="2"/>
      <rect x="58" y="10" width="18" height="12" rx="2"/>
      <rect x="14" y="27" width="18" height="12" rx="2"/>
      <rect x="36" y="27" width="18" height="12" rx="2" stroke-opacity=".3"/>
      <path d="M36 33h18" stroke-opacity=".55"/>
      <rect x="58" y="27" width="18" height="12" rx="2" stroke-opacity=".3"/>
      <path d="M58 33h18" stroke-opacity=".55"/>
    </g></svg>` },

  { year: "고1", subject: "공통수학2", unit: "함수와 그래프", title: "역함수는 왜 y = x 대칭인가",
    desc: "점 (a, b) 와 (b, a) 를 함께 움직여 보면 접히는 축이 y = x 임이 보입니다.",
    use: "역함수를 도입하고 '일대일'이 왜 필요한지 물을 때",
    keywords: "함수 역함수 일대일 대응 대칭 y=x 정의역 치역 무리함수",
    href: "demos/inverse-function.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <path d="M14 42L74 6" stroke-dasharray="4 3" stroke-opacity=".45"/>
      <path d="M16 40q14-4 20-16t20-16"/>
      <path d="M12 36q14-4 26-16" stroke-opacity=".35"/>
      <circle cx="34" cy="20" r="3" fill="#d9f26e"/>
      <circle cx="52" cy="30" r="3" fill="#201f5e" stroke="none"/>
    </g></svg>` },

  { year: "고1", subject: "공통수학1", unit: "방정식과 부등식", title: "a, b, c 를 움직이면",
    desc: "계수를 바꿀 때 포물선이 어떻게 변하는지, 판별식과 함께 봅니다.",
    use: "판별식의 부호와 x축 교점 개수를 연결시킬 때",
    keywords: "이차함수 포물선 계수 판별식 꼭짓점 이차방정식",
    href: "demos/quadratic.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <path d="M12 44 Q 44 -6 76 44" stroke-opacity=".3"/>
      <path d="M18 44 Q 44 10 70 44" stroke-opacity=".3"/>
      <path d="M14 44 Q 44 0 74 44"/>
      <circle cx="44" cy="22" r="3.2" fill="#d9f26e"/>
    </g></svg>` },

  { year: "고1", subject: "공통수학2", unit: "도형의 방정식", title: "원과 직선의 위치관계",
    desc: "거리 d 와 반지름 r 을 비교하는 방법, 판별식으로 따지는 방법이 같은 답을 줍니다.",
    use: "두 가지 풀이가 왜 같은 결론인지 물어볼 때",
    keywords: "원 직선 접선 판별식 거리 도형의방정식 위치관계",
    href: "demos/circle-line.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <circle cx="40" cy="24" r="16"/>
      <line x1="8" y1="40" x2="80" y2="10"/>
      <line x1="40" y1="24" x2="49" y2="19" stroke="#c3e02f" stroke-width="3"/>
      <circle cx="40" cy="24" r="2" fill="#000" stroke="none"/>
    </g></svg>` },

  /* ---------- 대수 (고2) ---------- */
  { year: "고2", subject: "대수", unit: "지수함수와 로그함수", title: "지수함수와 로그함수는 거울상",
    desc: "밑을 바꿔 가며, 짝이 되는 두 점이 y = x 를 사이에 두고 마주 보는 것을 봅니다.",
    use: "로그함수를 지수함수의 역함수로 도입할 때",
    keywords: "지수함수 로그함수 역함수 밑 대칭 y=x 진수 정의역",
    href: "demos/exp-log.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <path d="M10 42L74 6" stroke-dasharray="4 3" stroke-opacity=".45"/>
      <path d="M14 44q18 0 30-32"/>
      <path d="M44 44q0-18 32-30" stroke="#201f5e"/>
      <circle cx="38" cy="20" r="3" fill="#d9f26e"/>
    </g></svg>` },

  { year: "고2", subject: "대수", unit: "수열", title: "등차수열의 합을 눈으로",
    desc: "계단을 거꾸로 하나 더 얹으면 반듯한 직사각형이 됩니다. 그래서 2로 나눕니다.",
    use: "합 공식을 외우게 하기 전에 왜 그런지 보여 줄 때",
    keywords: "수열 등차수열 합 공식 가우스 시그마 계차",
    href: "demos/arithmetic-sum.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <rect x="16" y="34" width="10" height="8" fill="#d9f26e"/>
      <rect x="28" y="28" width="10" height="14" fill="#d9f26e"/>
      <rect x="40" y="22" width="10" height="20" fill="#d9f26e"/>
      <rect x="52" y="16" width="10" height="26" fill="#d9f26e"/>
      <path d="M16 16h46v26" stroke-dasharray="4 3" stroke-opacity=".5"/>
    </g></svg>` },

  { year: "고2", subject: "미적분Ⅰ", unit: "극한과 연속", title: "가까이 가면 어떻게 되는가",
    desc: "구멍·점프·발산을 갈아 끼우며 극한값과 함숫값이 다른 이야기임을 봅니다.",
    use: "극한을 도입하고 연속의 세 조건을 따질 때",
    keywords: "극한 연속 불연속 좌극한 우극한 발산 구멍 점프 lim",
    href: "demos/limit-continuity.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <path d="M10 40q16-2 26-14"/>
      <path d="M50 18q10-8 28-10"/>
      <path d="M44 6v36" stroke-dasharray="4 3" stroke-opacity=".45"/>
      <circle cx="44" cy="20" r="4" fill="#fff"/>
    </g></svg>` },

  { year: "고2", subject: "대수", unit: "삼각함수", title: "단위원과 삼각함수 그래프",
    desc: "원 위의 점이 돌아갈 때 사인 곡선이 그려지는 순간을 봅니다.",
    use: "삼각함수 그래프를 처음 도입할 때",
    keywords: "삼각함수 단위원 사인 코사인 탄젠트 주기 그래프 호도법",
    href: "demos/unit-circle.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <circle cx="20" cy="24" r="13"/>
      <line x1="20" y1="24" x2="29" y2="14"/>
      <circle cx="29" cy="14" r="3.2" fill="#d9f26e"/>
      <path d="M38 24 C 44 7 52 7 58 24 C 64 41 72 41 78 24"/>
    </g></svg>` },

  { year: "고2", subject: "대수", unit: "삼각함수", title: "y = a sin(b(x − c)) + d",
    desc: "계수 넷을 하나씩 움직이며 진폭 · 주기 · 평행이동을 분리해 봅니다.",
    use: "a, b, c, d 중 무엇이 무엇을 바꾸는지 헷갈려 할 때",
    keywords: "삼각함수 그래프 진폭 주기 평행이동 사인 코사인 변환",
    href: "demos/trig-transform.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <path d="M8 24 C 16 10 24 10 32 24 C 40 38 48 38 56 24" stroke-opacity=".3"/>
      <path d="M8 24 C 14 4 20 4 26 24 C 32 44 38 44 44 24 C 50 4 56 4 62 24"/>
      <line x1="8" y1="24" x2="80" y2="24" stroke-opacity=".35"/>
      <line x1="8" y1="42" x2="44" y2="42" stroke="#c3e02f" stroke-width="3"/>
    </g></svg>` },

  { year: "고2", subject: "대수", unit: "삼각함수", title: "사인법칙과 외접원",
    desc: "꼭짓점을 원 위에서 옮겨도 a / sin A 가 2R 로 고정되는 것을 확인합니다.",
    use: "사인법칙을 공식으로만 외우고 있을 때",
    keywords: "사인법칙 코사인법칙 외접원 원주각 삼각형 2R",
    href: "demos/law-of-sines.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <circle cx="44" cy="24" r="17"/>
      <polygon points="33,9 28,36 60,28" fill="#d9f26e" fill-opacity=".5"/>
      <line x1="28" y1="36" x2="60" y2="28" stroke="#c3e02f" stroke-width="3"/>
    </g></svg>` },

  /* ---------- 미적분Ⅰ (고2) ---------- */
  { year: "고2", subject: "미적분Ⅰ", unit: "미분", title: "미분계수는 접선의 기울기",
    desc: "할선이 접선으로 다가가는 과정을 직접 끌어 보며 극한을 체감합니다.",
    use: "미분계수의 정의를 처음 꺼낼 때",
    keywords: "미분계수 접선 할선 극한 순간변화율 평균변화율",
    href: "demos/derivative.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <line x1="9" y1="36" x2="55" y2="11" stroke="#d9f26e" stroke-width="3.2"/>
      <path d="M12 42 Q 44 0 76 42"/>
      <circle cx="31" cy="24" r="2.8" fill="#000" stroke="none"/>
    </g></svg>` },

  { year: "고2", subject: "미적분Ⅰ", unit: "미분", title: "f 와 f′ 를 나란히",
    desc: "도함수의 부호가 바뀌는 자리에서 원래 그래프가 꺾이는 것을 한 화면에서 봅니다.",
    use: "증감표를 기계적으로만 채우고 있을 때",
    keywords: "도함수 증가 감소 극대 극소 증감표 부호",
    href: "demos/derivative-sign.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <path d="M8 20 C 20 4 28 4 40 20 C 52 36 60 36 72 20" stroke-width="1.8"/>
      <line x1="8" y1="38" x2="80" y2="38" stroke-opacity=".35"/>
      <path d="M8 44 C 20 30 28 30 40 44" stroke="#c3e02f" stroke-width="2.4"/>
    </g></svg>` },

  { year: "고2", subject: "미적분Ⅰ", unit: "적분", title: "구분구적법과 정적분",
    desc: "직사각형 개수를 늘리면 넓이가 어디로 수렴하는지 확인합니다.",
    use: "정적분 기호가 왜 ‘합’에서 나왔는지 설명할 때",
    keywords: "구분구적법 정적분 리만합 넓이 극한 적분",
    href: "demos/riemann.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <g fill="#d9f26e" stroke="#000" stroke-width="1">
        <rect x="14" y="36" width="13" height="8"/>
        <rect x="27" y="30" width="13" height="14"/>
        <rect x="40" y="22" width="13" height="22"/>
        <rect x="53" y="16" width="13" height="28"/>
      </g>
      <path d="M8 40 C 26 34 44 22 80 12"/>
    </g></svg>` },

  /* ---------- 미적분Ⅱ ---------- */
  { year: "고2–3", subject: "미적분Ⅱ", unit: "수열의 극한", title: "무한등비급수",
    desc: "항을 무한히 더하는데 합이 한 값으로 모이는 이유를 띠 그림으로 봅니다.",
    use: "무한히 더하는데 왜 유한한지 납득이 안 될 때",
    keywords: "무한등비급수 수열 극한 수렴 발산 공비 부분합",
    href: "demos/geometric-series.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <g fill="#d9f26e" stroke="#000" stroke-width="1">
        <rect x="10" y="16" width="30" height="16"/>
        <rect x="40" y="16" width="15" height="16"/>
        <rect x="55" y="16" width="8" height="16"/>
        <rect x="63" y="16" width="4" height="16"/>
      </g>
      <line x1="70" y1="10" x2="70" y2="40" stroke-dasharray="3 3"/>
    </g></svg>` },

  { year: "고2–3", subject: "미적분Ⅱ", unit: "미분법", title: "lim (sin x)/x = 1",
    desc: "삼각형 · 부채꼴 · 삼각형의 넓이를 끼워 넣어 극한값을 확인합니다.",
    use: "조임정리를 도형 없이 외우고 있을 때",
    keywords: "삼각함수 극한 샌드위치 조임정리 부채꼴 라디안 미분법",
    href: "demos/sinx-over-x.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <path d="M20 38 L52 38 A32 32 0 0 0 44 17 Z" fill="#d9f26e" stroke="none"/>
      <circle cx="20" cy="38" r="32" stroke-opacity=".5"/>
      <polygon points="20,38 52,38 44,17" fill="none"/>
      <line x1="52" y1="38" x2="52" y2="17"/>
    </g></svg>` },

  { year: "고2–3", subject: "미적분Ⅱ", unit: "적분법", title: "회전체의 부피",
    desc: "원판을 쌓아 올리며 V = ∫π{f(x)}²dx 가 어디서 나왔는지 봅니다.",
    use: "적분식 안의 π 가 어디서 왔는지 물어볼 때",
    keywords: "회전체 부피 적분 원판 정적분의활용 입체도형",
    href: "demos/solid-of-revolution.html", ready: true, d3: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <g fill="#d9f26e" stroke="#000" stroke-width="1">
        <ellipse cx="24" cy="24" rx="4" ry="9"/>
        <ellipse cx="42" cy="24" rx="4" ry="13"/>
        <ellipse cx="60" cy="24" rx="4" ry="16"/>
      </g>
      <line x1="10" y1="24" x2="78" y2="24" stroke-dasharray="3 3" stroke-opacity=".5"/>
    </g></svg>` },

  /* ---------- 확률과 통계 ---------- */
  { year: "고2–3", subject: "확률과 통계", unit: "확률", title: "몬티 홀 문제",
    desc: "바꾸는 쪽이 유리한 이유를 직접 해 보고 1000번 시뮬레이션으로 확인합니다.",
    use: "확률 직관이 틀리는 경험을 시키고 싶을 때",
    keywords: "확률 조건부확률 몬티홀 시뮬레이션 경우의수",
    href: "demos/monty-hall.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <rect x="11" y="9" width="18" height="31" rx="1"/>
      <rect x="35" y="9" width="18" height="31" rx="1" fill="#d9f26e"/>
      <rect x="59" y="9" width="18" height="31" rx="1"/>
      <circle cx="25" cy="26" r="1.5" fill="#000" stroke="none"/>
      <circle cx="49" cy="26" r="1.5" fill="#000" stroke="none"/>
      <circle cx="73" cy="26" r="1.5" fill="#000" stroke="none"/>
    </g></svg>` },

  { year: "고2–3", subject: "확률과 통계", unit: "통계", title: "정규분포와 신뢰구간",
    desc: "신뢰구간 100개를 직접 그려 보고, 그중 몇 개가 모평균을 품는지 세어 봅니다.",
    use: "‘신뢰도 95%’ 가 정확히 무슨 뜻인지 물어볼 때",
    keywords: "정규분포 표준화 신뢰구간 통계적추정 모평균 표본평균",
    href: "demos/normal-distribution.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <path d="M14 40 C 30 40 30 12 44 12 C 58 12 58 40 74 40" fill="#d9f26e" fill-opacity=".6"/>
      <line x1="10" y1="40" x2="78" y2="40" stroke-opacity=".4"/>
      <line x1="44" y1="12" x2="44" y2="40" stroke-dasharray="3 3"/>
    </g></svg>` },

  /* ---------- 기하 ---------- */
  { year: "고2–3", subject: "기하", unit: "이차곡선", title: "원뿔을 자르면",
    desc: "자르는 각도에 따라 원 · 타원 · 포물선 · 쌍곡선이 나타나는 과정.",
    use: "이차곡선 네 개를 따로따로 외우고 있을 때",
    keywords: "이차곡선 원뿔곡선 타원 포물선 쌍곡선 단면",
    href: "demos/conic-sections.html", ready: true, d3: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <ellipse cx="44" cy="40" rx="20" ry="6"/>
      <line x1="44" y1="7" x2="64" y2="40"/>
      <line x1="44" y1="7" x2="24" y2="40"/>
      <ellipse cx="42" cy="26" rx="12" ry="4" fill="#d9f26e" transform="rotate(-16 42 26)"/>
    </g></svg>` },

  { year: "고2–3", subject: "기하", unit: "평면벡터", title: "벡터의 내적",
    desc: "θ 가 90° 를 지나는 순간 정사영이 넘어가고 내적의 부호가 바뀝니다.",
    use: "내적의 부호가 왜 바뀌는지 물어볼 때",
    keywords: "벡터 내적 정사영 성분 수직 평면벡터 코사인",
    href: "demos/dot-product.html", ready: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <line x1="14" y1="36" x2="70" y2="36"/>
      <polyline points="64,32 70,36 64,40"/>
      <line x1="14" y1="36" x2="46" y2="12"/>
      <polyline points="41,13 46,12 45,18"/>
      <line x1="14" y1="43" x2="46" y2="43" stroke="#c3e02f" stroke-width="3.4"/>
      <line x1="46" y1="12" x2="46" y2="36" stroke-dasharray="3 3" stroke-opacity=".5"/>
    </g></svg>` },

  { year: "고2–3", subject: "기하", unit: "공간도형", title: "정사영과 넓이",
    desc: "평면과 이루는 각을 바꿔 가며 S′ = S cos θ 를 눈으로 확인합니다.",
    use: "cos θ 를 어디에 곱하는지 헷갈려 할 때",
    keywords: "정사영 공간도형 이면각 넓이 코사인",
    href: "demos/projection.html", ready: true, d3: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <polygon points="26,40 62,40 54,46 32,46" fill="#d9f26e" stroke="none"/>
      <line x1="8" y1="40" x2="80" y2="40" stroke-opacity=".3"/>
      <polygon points="34,9 62,40 26,40"/>
      <line x1="34" y1="9" x2="41" y2="43" stroke-dasharray="3 3" stroke-opacity=".45"/>
    </g></svg>` },

  { year: "고2–3", subject: "기하", unit: "공간도형", title: "삼수선의 정리",
    desc: "어느 각이 이면각인지, 시점을 돌려 가며 직접 확인합니다.",
    use: "평면도만 보고는 수직 관계가 안 보일 때",
    keywords: "삼수선 정리 이면각 공간도형 수선 평면 수직",
    href: "demos/three-perpendiculars.html", ready: true, d3: true,
    fig: `<svg viewBox="0 0 88 48"><g ${G}>
      <polygon points="10,38 50,30 78,36 38,44" fill="#000" fill-opacity=".05"/>
      <line x1="10" y1="38" x2="78" y2="36" stroke-opacity=".5"/>
      <line x1="46" y1="8" x2="46" y2="33"/>
      <line x1="46" y1="33" x2="30" y2="37"/>
      <line x1="46" y1="8" x2="30" y2="37" stroke="#c3e02f" stroke-width="2.6"/>
      <circle cx="46" cy="8" r="2.4" fill="#000" stroke="none"/>
    </g></svg>` }
];

// 공통수학1·2 는 한 묶음으로 본다
const groupOf = d => (d.subject.startsWith("공통수학") ? "공통수학" : d.subject);

// 과목 → 색 · 앵커 이름
const SUBJECTS = {
  "공통수학":    { color: "var(--sub-common)",  id: "s-common" },
  "대수":        { color: "var(--sub-algebra)", id: "s-algebra" },
  "미적분Ⅰ":     { color: "var(--sub-calc1)",   id: "s-calc1" },
  "미적분Ⅱ":     { color: "var(--sub-calc2)",   id: "s-calc2" },
  "확률과 통계": { color: "var(--sub-stat)",    id: "s-stat" },
  "기하":        { color: "var(--sub-geo)",     id: "s-geo" }
};
const meta = name => SUBJECTS[name] || { color: "var(--surface-soft)", id: "" };
