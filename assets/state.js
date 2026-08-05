/* =========================================================
   수업용 링크 — 조작값을 주소에 담아 둡니다.

   · 슬라이더나 선택을 바꾸면 주소창이 그 상태로 바뀝니다.
   · 그 주소를 그대로 보내면 상대도 같은 화면으로 열립니다.
   · 상단의 "링크 복사" 버튼은 이 스크립트가 만들어 넣습니다.

   데모 파일은 손댈 필요가 없습니다. 맨 아래에
     <script src="../assets/state.js"></script>
   한 줄만 있으면 됩니다. (조작할 게 없는 자료에서는 아무것도 안 합니다)

   예전에 쓰던 이름을 그대로 살리려면 데모에서 먼저
     window.STATE_ALIAS = { h: "height" };
   처럼 적어 두면 됩니다.
   ========================================================= */
(function () {
  var panel = document.querySelector(".panel");
  var bar = document.querySelector(".demo-bar");
  if (!panel) return;

  var ctrls = [].slice
    .call(panel.querySelectorAll("input[id], select[id]"))
    .filter(function (el) {
      return el.type !== "button" && el.type !== "submit";
    });
  if (!ctrls.length) return;

  var alias = window.STATE_ALIAS || {};
  var read = function (el) {
    return el.type === "checkbox" ? (el.checked ? "1" : "0") : el.value;
  };
  var write = function (el, v) {
    if (el.type === "checkbox") el.checked = v === "1" || v === "true";
    else el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  // 주소를 읽기 전에 페이지가 원래 갖고 있던 값을 기억해 둔다
  var initial = {};
  ctrls.forEach(function (el) { initial[el.id] = read(el); });

  // --- 주소 → 화면 ---
  new URLSearchParams(location.search).forEach(function (v, k) {
    var el = document.getElementById(alias[k] || k);
    if (el && ctrls.indexOf(el) !== -1) write(el, v);
  });

  // --- 화면 → 주소 (원래 값과 다른 것만 담아 주소를 짧게) ---
  function sync() {
    var q = new URLSearchParams();
    ctrls.forEach(function (el) {
      var v = read(el);
      if (v !== initial[el.id]) q.set(el.id, v);
    });
    var s = q.toString();
    history.replaceState(null, "", s ? location.pathname + "?" + s : location.pathname);
  }
  ctrls.forEach(function (el) {
    el.addEventListener("input", sync);
    el.addEventListener("change", sync);
  });

  // --- 상단 "링크 복사" 버튼 ---
  if (!bar) return;
  // 폰에서는 제목과 같은 줄에 남도록 글자를 줄입니다.
  // ("링크 복사" 로는 제목이 긴 자료 8개에서 버튼이 아랫줄로 밀렸습니다)
  var narrow = matchMedia("(max-width: 768px)");
  var idle = function () { return narrow.matches ? "링크" : "링크 복사"; };

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-link";
  btn.textContent = idle();
  bar.appendChild(btn);

  var timer;
  narrow.addEventListener("change", function () {
    if (!timer) btn.textContent = idle();
  });

  btn.addEventListener("click", function () {
    var url = location.href;
    var done = function (ok) {
      btn.textContent = ok
        ? (narrow.matches ? "복사됨" : "복사됐습니다")
        : (narrow.matches ? "주소창에서" : "주소창을 복사해 주세요");
      clearTimeout(timer);
      timer = setTimeout(function () { timer = null; btn.textContent = idle(); }, 1800);
    };
    // clipboard 는 https 나 localhost 에서만 됩니다. 안 되면 안내만 합니다.
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () { done(true); },
                                             function () { done(false); });
    } else {
      done(false);
    }
  });
})();
