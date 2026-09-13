/* =========================================================
   새 질문 알림을 받아서 화면에 띄우는 일꾼 (서비스 워커) — 손댈 일 없습니다.

   브라우저가 이 파일을 뒤에서 계속 붙들고 있다가, 서버가 알림을 보내면
   선생님 방이 닫혀 있어도 알림을 띄웁니다. 알림을 누르면 그 질문의
   답 칸을 엽니다.

   선생님 방(admin.html)에서 '알림 받기'를 켤 때만 등록됩니다.
   학생이 보는 페이지에서는 쓰지 않습니다.

   ⚠ 여기서는 아무것도 저장(캐시)하지 않습니다. 저장해 두면 사이트를
     고쳐 올려도 예전 화면이 계속 보이는 문제가 생기기 때문입니다.
   ========================================================= */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let 내용 = {};
  try { 내용 = e.data ? e.data.json() : {}; } catch { 내용 = { body: e.data && e.data.text() }; }

  e.waitUntil(
    self.registration.showNotification(내용.title || "수학을 보다", {
      body: 내용.body || "",
      icon: "/assets/icon-192.png",
      badge: "/assets/icon-192.png",
      tag: 내용.tag || undefined,        // 같은 질문 알림이 여러 번 쌓이지 않게
      data: { url: 내용.url || "/admin.html" },
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const 갈곳 = new URL((e.notification.data && e.notification.data.url) || "/admin.html", self.location.origin);

  e.waitUntil((async () => {
    /* 선생님 방이 이미 열려 있으면 새 창을 또 열지 않고 그 창으로 갑니다.
       창에게 "이 질문으로 가라"고 말만 전하면, 선생님 방이 스스로 찾아갑니다. */
    const 창들 = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const 선생님방 = 창들.find(창 => new URL(창.url).pathname.endsWith("/admin.html"));
    if (선생님방) {
      await 선생님방.focus();
      선생님방.postMessage({ 종류: "질문열기", hash: 갈곳.hash });
      return;
    }
    await self.clients.openWindow(갈곳.href);
  })());
});
