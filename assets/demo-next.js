/* =========================================================
   자료를 다 보고 나면 어디로 갈까 — 데모 아래에 붙는 '다음' 칸입니다.

   지금까지는 데모를 끝까지 봐도 갈 곳이 없었습니다. 개념 지도에는
   '볼 것(데모) + 풀 것(학습지)'이 함께 있는데, 정작 학생이 오래 머무는
   데모 페이지에서는 그 길이 안 보였습니다.

   이 파일이 하는 일:
     1) 지금 열린 데모가 어느 개념에 속하는지 concepts.js 에서 찾고
     2) 그 개념의 학습지를 /api/files 에서 받아 와
     3) 조작판 맨 아래에 '다음' 칸으로 놓습니다.

   학습지가 아직 없어도 개념 지도로 가는 길은 늘 보여 줍니다.

   데모 파일에는 아래 두 줄만 있으면 됩니다.
     <script src="../assets/concepts.js"></script>
     <script src="../assets/demo-next.js"></script>
   ========================================================= */
(function () {
  var panel = document.querySelector(".panel");
  if (!panel || typeof NODES === "undefined") return;

  // demos/quadratic.html → "demos/quadratic.html" (concepts.js 에 적힌 모양)
  var 파일 = location.pathname.split("/").slice(-2).join("/");

  // 이 데모를 품고 있는 개념 찾기 (여러 개면 첫 번째)
  var 개념id = null;
  for (var id in NODES) {
    if (NODES[id].demos.some(function (d) { return d.h === 파일; })) { 개념id = id; break; }
  }
  if (!개념id) return;
  var 개념 = NODES[개념id];

  var 안전하게 = function (글) {
    return String(글 == null ? "" : 글).replace(/[&<>"']/g, function (기호) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[기호];
    });
  };

  var 칸 = document.createElement("div");
  칸.className = "group demo-next";
  칸.innerHTML =
    '<span class="caption">다음</span>' +
    '<a class="demo-next-link" href="../map.html?n=' + 안전하게(개념id) + '">' +
      '개념 지도에서 <b>' + 안전하게(개념.name) + '</b> 보기 →</a>' +
    '<div id="demoNextFiles"></div>';
  panel.appendChild(칸);

  /* 학습지는 수시로 바뀌므로 그때그때 받아 옵니다.
     저장소가 아직 준비 안 됐거나(503) 실패하면 조용히 넘어갑니다 —
     '다음' 칸에 개념 지도 링크는 이미 놓여 있습니다. */
  fetch("/api/files")
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (목록) {
      if (!Array.isArray(목록)) return;
      var 것들 = 목록.filter(function (f) { return f.concept === 개념id; });
      if (!것들.length) return;
      document.getElementById("demoNextFiles").innerHTML =
        '<p class="demo-next-head">이제 풀어 보기</p>' +
        것들.map(function (f) {
          return '<a class="demo-next-link" href="' + 안전하게(f.url) + '" target="_blank" rel="noopener">' +
                 안전하게(f.title) + ' ↓</a>';
        }).join("");
    })
    .catch(function () {});
})();
