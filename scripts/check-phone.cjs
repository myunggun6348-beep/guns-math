/* =========================================================
   휴대폰 검사 — 명령창에서 `node scripts\check-phone.cjs`

   학생도 선생님도 폰으로 들어옵니다. 눈으로는 잘 안 보이지만 폰에서만
   생기는 네 가지를 봅니다.
     1) 가로로 넘쳐서 옆으로 밀리는 곳
     2) 손가락으로 누르기엔 작은 단추 (40px 미만)
     3) 글씨 16px 미만인 입력 칸 — 아이폰 사파리가 누르는 순간 확대해 버립니다
     4) 콘솔 오류
   ========================================================= */
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const 뿌리 = path.join(__dirname, "..");
const 포트 = 5199, 주소 = "http://127.0.0.1:" + 포트;

/* 이 컴퓨터에서 파일만 내주는 작은 서버. api/ 는 흉내만 냅니다 — 여기서 보는 것은
   글씨 크기와 누르는 자리 크기여서 진짜 자료가 필요하지 않습니다. */
const 서버 = http.createServer((req, res) => {
  const 길 = new URL(req.url, "http://localhost").pathname;
  if (길.startsWith("/api/")) { res.setHeader("Content-Type", "application/json"); res.end(길 === "/api/student-account" ? '{"signedIn":false}' : "[]"); return; }
  const 파일 = path.join(뿌리, 길 === "/" ? "/index.html" : 길);
  if (!파일.startsWith(뿌리 + path.sep) || !fs.existsSync(파일)) { res.writeHead(404).end(); return; }
  const 종류 = { ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
  res.setHeader("Content-Type", 종류[path.extname(파일)] || "text/html");
  res.end(fs.readFileSync(파일));
});

const 폰들 = [
  { 이름: "작은안드로이드 360", 폭: 360, 높이: 740 },
  { 이름: "아이폰 390", 폭: 390, 높이: 844 },
  { 이름: "큰아이폰 430", 폭: 430, 높이: 932 },
];

const 볼것 = [
  { 이름: "홈", 길: "/index.html", 준비: async p => { await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" }); } },
  { 이름: "홈-둘러보기", 길: "/index.html", 준비: async p => { await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" }); await p.click(".home-fork-look"); await p.waitForTimeout(600); } },
  { 이름: "선생님방-문앞", 길: "/admin.html" },
  { 이름: "선생님방-암호", 길: "/admin.html", 준비: async p => {
      await p.evaluate(() => { document.getElementById("문앞").hidden = true; document.getElementById("안쪽").hidden = false; document.querySelector(".adm-pass").open = true; document.getElementById("암호되돌리기").hidden = false; });
      await p.waitForTimeout(200);
    } },
];

(async () => {
  await new Promise(r => 서버.listen(포트, "127.0.0.1", r));
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const 탈 = [];
  try {
    for (const 폰 of 폰들) {
      for (const 면 of 볼것) {
        const page = await browser.newPage({ viewport: { width: 폰.폭, height: 폰.높이 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        const 콘솔오류 = [];
        page.on("pageerror", e => 콘솔오류.push(e.message));
        await page.goto(주소 + 면.길, { waitUntil: "networkidle" });
        if (면.준비) await 면.준비(page);

        const 본것 = await page.evaluate(() => {
          const 보이나 = el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
          };
          // 1) 가로로 넘치는가
          const 넘침 = [...document.querySelectorAll("body *")]
            .filter(el => 보이나(el) && el.getBoundingClientRect().right > innerWidth + 1)
            .map(el => el.tagName + "." + (el.className || "").toString().slice(0, 40));

          // 2) 손가락으로 누르기 너무 작은 것 (애플 권장 44px)
          const 작은단추 = [...document.querySelectorAll("a,button,summary,input[type=submit]")]
            .filter(보이나)
            .map(el => ({ 것: el.tagName + "." + (el.className || "").toString().slice(0, 30) + " " + (el.textContent || "").trim().slice(0, 18), 높이: Math.round(el.getBoundingClientRect().height) }))
            .filter(x => x.높이 < 40);

          // 3) 글씨가 16px 보다 작은 입력 칸 → iOS 사파리가 누르는 순간 화면을 확대해 버린다
          const 확대유발 = [...document.querySelectorAll("input,select,textarea")]
            .filter(el => 보이나(el) && !["checkbox","radio"].includes(el.type))   // 체크박스는 눌러도 아이폰이 확대하지 않습니다
            .map(el => ({ 것: (el.name || el.id || el.type), 글씨: Math.round(parseFloat(getComputedStyle(el).fontSize)) }))
            .filter(x => x.글씨 < 16);

          return { 넘침, 작은단추, 확대유발, 문서폭: document.documentElement.scrollWidth, 화면폭: innerWidth };
        });

        const 딱지 = 폰.이름 + " / " + 면.이름;
        if (본것.넘침.length) 탈.push(딱지 + " — 가로로 넘침 (" + 본것.문서폭 + " > " + 본것.화면폭 + "): " + 본것.넘침.slice(0, 5).join(", "));
        if (본것.작은단추.length) 탈.push(딱지 + " — 누르기 작음: " + 본것.작은단추.slice(0, 6).map(x => x.것 + "(" + x.높이 + "px)").join(", "));
        if (본것.확대유발.length) 탈.push(딱지 + " — iOS 가 확대해 버림(글씨<16px): " + 본것.확대유발.map(x => x.것 + "(" + x.글씨 + "px)").join(", "));
        if (콘솔오류.length) 탈.push(딱지 + " — 콘솔 오류: " + 콘솔오류.join(" / "));

        await page.close();
      }
    }
    if (탈.length) { console.log("걸린 것 " + 탈.length + "가지:\n- " + 탈.join("\n- ")); process.exitCode = 1; }
    else console.log("휴대폰 검사 통과: 가로 넘침 없음, 누르는 곳 40px 이상, iOS 확대 없음, 콘솔 오류 없음");
  } finally { await browser.close(); 서버.close(); }
})().catch(e => { console.error(e); 서버.close(); process.exitCode = 1; });
