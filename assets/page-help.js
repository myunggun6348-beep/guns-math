/* =========================================================
   페이지 쓰는 법 — 머리 띠 오른쪽의 '?'

   ✏️ 문구를 고치려면 아래 '도움말' 만 고치면 됩니다. 쪽마다 세 줄 이내,
      "무엇을 누르면 무엇이 되는지"만 적습니다. <b>…</b> 는 화면의 단추 이름입니다.

   평소에는 '?' 하나만 보이고, 누르면 머리 띠 바로 아래로 펼쳐집니다.
   안내 창을 처음부터 띄우지 않는 것은, 학생들이 읽지 않고 닫기 때문입니다.
   폰에서는 머리 띠 설명을 감춰 두었으므로(제목만) 궁금한 학생은 여기서 봅니다.

   어떤 쪽은 머리 띠를 자바스크립트로 다시 그립니다(오늘의 학습·미니게임은
   화면이 바뀔 때마다). 그래서 머리 띠가 새로 생길 때마다 '?' 를 다시 붙이고,
   펼쳐 둔 상태도 그대로 이어 갑니다.
   ========================================================= */
(function () {
  "use strict";
  const 도움말 = {
    "today.html": [
      "학년과 과목을 고르고 <b>오늘의 5문제 시작</b>을 누르세요. 5분이면 끝나요.",
      "다 풀면 약한 개념이 나오고, 그 개념의 기출로 바로 갈 수 있어요.",
      "틀린 문제는 오답노트에 저절로 들어가요.",
    ],
    "wrong-notes.html": [
      "틀린 문제가 저절로 모여요. <b>다시 풀기</b>에서 맞히면 바로 복습 완료예요.",
      "<b>다시 풀기</b>로 정답을 보지 않고 다시 풀어 보세요.",
      "<b>✎ 풀이 첨삭</b>으로 내 풀이에 표시하고, <b>선생님께 제출</b>할 수 있어요.",
    ],
    "files.html": [
      "학년을 고르면 그 학년 기출만 보여요. 종류·연도·검색으로 더 좁혀요.",
      "<b>바로 풀기</b>를 누르면 시험지 위에 펜으로 바로 풀 수 있어요.",
      "문제·정답·해설은 따로 받을 수 있어요.",
    ],
    "library.html": [
      "학년·과목을 고르거나 개념 이름으로 찾으세요.",
      "<b>열어 보기</b>를 누르고 값을 움직여 그래프·도형이 어떻게 바뀌는지 보세요.",
      "이해했으면 <b>관련 기출</b>로 바로 연습해요.",
    ],
    "map.html": [
      "개념을 누르면 앞에서 배운 개념과 뒤에 이어지는 개념이 표시돼요.",
      "<b>여기까지 오는 길 전부 보기</b>를 켜면 처음부터 거쳐야 할 개념이 다 보여요.",
      "막힌 개념은 앞 단계부터 — 관련 자료와 기출로 바로 갈 수 있어요.",
    ],
    "games.html": [
      "미니게임: 4분 동안 5문제. 틀린 문제는 오답노트로 가요.",
      "수학 탈출: 15분 안에 단서를 풀어 교실 세 개를 빠져나가요.",
      "선생님이 수업 방 링크를 주면 이름만 적고 바로 들어가요.",
    ],
    "quick-game.html": [
      "<b>게임 시작</b>을 누르면 4분 동안 5문제가 나와요.",
      "풀이 공간에 펜으로 계산하고 답을 고르세요.",
      "연속으로 맞히면 보너스. 틀린 문제는 오답노트로 가요.",
    ],
    "escape.html": [
      "<b>바로 시작</b>을 누르면 15분 시계가 돌아요.",
      "방마다 '필수' 단서를 풀어야 다음 방이 열려요. '보너스'는 점수용이에요.",
      "힌트를 보면 첫 시도 보너스(+25점)가 없어져요.",
    ],
    "ask.html": [
      "종류를 고르고 질문을 적으세요. 막힌 문제는 사진을 올리면 좋아요.",
      "이름 없이 남길 수 있어요. 남긴 질문은 바로 아래 목록에 올라가요.",
      "선생님이 답하면 같은 자리에 보여요. <b>내 질문</b>으로 내 것만 모아 볼 수 있어요.",
    ],
  };

  const 쪽 = location.pathname.split("/").pop() || "index.html";
  const 줄들 = 도움말[쪽];
  if (!줄들) return;

  let 열림 = false;   // 머리 띠가 다시 그려져도 펼친 상태를 이어 가려고 밖에 둡니다

  function 붙이기(띠) {
    if (띠.querySelector(".page-help-btn")) return;
    document.getElementById("pageHelp")?.remove();
    const 단추 = document.createElement("button");
    단추.type = "button";
    단추.className = "page-help-btn";
    단추.textContent = "?";
    단추.setAttribute("aria-label", "이 페이지 쓰는 법");
    단추.setAttribute("aria-controls", "pageHelp");
    단추.setAttribute("aria-expanded", String(열림));

    const 판 = document.createElement("div");
    판.className = "page-help";
    판.id = "pageHelp";
    판.hidden = !열림;
    판.innerHTML = "<b class=\"page-help-title\">이렇게 써요</b><ol>" + 줄들.map(줄 => "<li>" + 줄 + "</li>").join("") + "</ol>";

    단추.addEventListener("click", () => {
      열림 = !열림;
      판.hidden = !열림;
      단추.setAttribute("aria-expanded", String(열림));
    });
    띠.append(단추);
    띠.after(판);
  }

  const 찾기 = () => document.querySelectorAll(".page-head").forEach(붙이기);
  찾기();
  new MutationObserver(찾기).observe(document.body, { childList: true, subtree: true });
})();
