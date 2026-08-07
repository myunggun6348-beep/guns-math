/* =========================================================
   어두운 화면 켜고 끄기 — 다섯 페이지(index/library/map/files/ask)가
   함께 씁니다. 자료 페이지(demos/*.html)는 이 파일을 안 불러오므로
   늘 밝은 화면 그대로입니다.

   위쪽 즉시 실행 부분과, 버튼이 생긴 뒤 연결하는 부분 둘로 나뉩니다.
   위쪽이 늦으면 흰 화면이 잠깐 보였다가 검게 바뀌는 게 눈에 띄므로,
   이 파일은 반드시 <head> 안에서 defer 없이 불러야 합니다.
   ========================================================= */
(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("theme-dark");
    }
  } catch (e) {}
})();

document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  const root = document.documentElement;

  function 표시(){
    const 켜짐 = root.classList.contains("theme-dark");
    btn.setAttribute("aria-pressed", 켜짐 ? "true" : "false");
    btn.setAttribute("aria-label", 켜짐 ? "밝은 화면으로 보기" : "어두운 화면으로 보기");
  }
  표시();

  btn.addEventListener("click", function () {
    root.classList.toggle("theme-dark");
    try {
      localStorage.setItem("theme", root.classList.contains("theme-dark") ? "dark" : "light");
    } catch (e) {}
    표시();
  });
});
