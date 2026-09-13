/* =========================================================
   방문 세기 — 손대지 않아도 됩니다.

   페이지가 열릴 때 "이 페이지가 한 번 열렸다"는 것만 사이트 저장소에
   알립니다. 선생님 방(admin.html)의 '방문' 칸에서 어느 자료가 실제로
   쓰이는지 볼 수 있습니다. (Vercel 대시보드에 따로 들어가지 않아도 됩니다)

   누가 열었는지는 보내지 않습니다 — 쿠키도, 기기 번호도, 주소도 없습니다.
   페이지 이름 하나만 보냅니다.

   각 페이지 맨 아래에 한 줄이면 됩니다.
     <script defer src="/assets/hit.js"></script>
   ========================================================= */
(function () {
  try {
    var 경로 = location.pathname;
    if (경로 === "/" || 경로 === "") 경로 = "/index.html";

    // 선생님 방은 세지 않습니다 (선생님이 들락날락한 게 학생 방문처럼 섞이지 않게)
    if (/\/admin\.html$/.test(경로)) return;
    // 내 컴퓨터에서 미리 볼 때(폰으로 보기.bat)는 세지 않습니다
    if (location.hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(location.hostname)) return;
    // 자동 프로그램이 연 것은 세지 않습니다
    if (navigator.webdriver) return;

    var 짐 = JSON.stringify({ p: 경로 });
    /* sendBeacon 은 페이지를 닫거나 넘어가는 중에도 끝까지 보내 주고,
       페이지가 뜨는 것을 늦추지 않습니다. 없는 오래된 브라우저만 fetch 로. */
    if (navigator.sendBeacon && navigator.sendBeacon("/api/hit", new Blob([짐], { type: "application/json" }))) return;
    fetch("/api/hit", { method: "POST", headers: { "Content-Type": "application/json" }, body: 짐, keepalive: true })
      .catch(function () {});
  } catch (e) { /* 세기가 실패해도 페이지에는 아무 영향이 없어야 합니다 */ }
})();
