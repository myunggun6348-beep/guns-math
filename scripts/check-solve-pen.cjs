/* =========================================================
   태블릿 펜 검사 — 명령창에서 `node scripts\check-solve-pen.cjs`
   (EBSi 원본 PDF 를 열므로 인터넷이 필요합니다)

   바로 풀기(solve.html)에서
   - '펜으로 풀기' 단추가 도구 줄 맨 앞에 있는지
   - 필기 칸이 브라우저 스크롤에 펜 움직임을 뺏기지 않는지(touch-action:none)
   - 펜으로 그으면 선이 생기고, 움직임이 아주 많아도 한 번에 몰아 그리는지
   - '펜으로 풀기'를 끄면 손가락(손가락처럼 잡히는 펜)으로 끌 때 쪽이 넘어가고 선은 안 생기는지,
     켜면 선이 생기는지 봅니다.
   ========================================================= */
const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert");
const { chromium } = require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const 뿌리 = path.join(__dirname, "..");
const 종류 = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json" };
const 서버 = http.createServer((q, r) => {
  const 길 = new URL(q.url, "http://x").pathname;
  if (길.startsWith("/api/")) { r.setHeader("Content-Type", "application/json"); r.end(길 === "/api/student-account" ? '{"signedIn":false}' : "{}"); return; }
  const f = path.join(뿌리, 길 === "/" ? "/index.html" : 길);
  if (!f.startsWith(뿌리) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.setHeader("Content-Type", 종류[path.extname(f)] || "text/html"); r.end(fs.readFileSync(f));
});

(async () => {
  await new Promise(x => 서버.listen(5249, "127.0.0.1", x));
  const b = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const 오류 = [];
  try {
    const p = await b.newPage({ viewport: { width: 1024, height: 700 } });
    p.on("pageerror", e => 오류.push(e.message));
    await p.goto("http://127.0.0.1:5249/solve.html?id=ebsi-1-20260902&subject=" + encodeURIComponent("수학") + "&page=1", { waitUntil: "networkidle" });
    await p.waitForFunction(() => document.getElementById("inkCanvas").width > 100, null, { timeout: 60000 });
    // 가짜 포인터는 브라우저가 붙잡기(setPointerCapture)를 거절해서, 검사에서만 그 단계를 건너뜁니다
    await p.evaluate(() => { try { localStorage.clear(); } catch {} Element.prototype.setPointerCapture = () => {}; });

    const 맨앞 = await p.evaluate(() => document.querySelector(".solve-toolbar").firstElementChild.textContent.trim());
    assert.equal(맨앞, "펜으로 풀기", "도구 줄 맨 앞이 '펜으로 풀기' 가 아닙니다: " + 맨앞);
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById("inkCanvas")).touchAction), "none", "필기 칸이 펜 움직임을 스크롤에 뺏깁니다");

    // 가짜 포인터로 긋기 — 움직임 120번, 그리는 횟수를 셉니다
    const 긋기 = (종류, 시작y) => p.evaluate(([종류, 시작y]) => {
      const c = document.getElementById("inkCanvas"), r = c.getBoundingClientRect(), 보냄 = (type, i) => c.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 종류, isPrimary: true, bubbles: true, cancelable: true, clientX: r.left + 40 + i * 2, clientY: r.top + 시작y + Math.sin(i / 8) * 20, pressure: .6, buttons: 1 }));
      const area = document.getElementById("documentArea"), 처음스크롤 = area.scrollTop;
      let 그림 = 0; const 원래 = c.getContext("2d").clearRect; c.getContext("2d").clearRect = function () { 그림++; return 원래.apply(this, arguments); };
      보냄("pointerdown", 0); for (let i = 1; i <= 120; i++) 보냄("pointermove", i); 보냄("pointerup", 120);
      return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => { c.getContext("2d").clearRect = 원래; res({ 그림, 스크롤: area.scrollTop - 처음스크롤 }); })));
    }, [종류, 시작y]);
    // 필기 칸에서 잉크가 칠해진 점 수
    const 선수 = () => p.evaluate(() => { const c = document.getElementById("inkCanvas"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });

    const 펜 = await 긋기("pen", 120);
    assert.ok(펜.그림 <= 6, "펜이 움직일 때마다 전부 다시 그립니다(" + 펜.그림 + "번)");
    await p.waitForTimeout(700);
    const 펜뒤 = await 선수();
    assert.ok(펜뒤 > 500, "펜으로 그었는데 선이 안 생겼습니다(" + 펜뒤 + "점, 그림 " + 펜.그림 + "번)");

    const 손 = await 긋기("touch", 260);
    await p.waitForTimeout(700);
    assert.equal(await 선수(), 펜뒤, "'펜으로 풀기' 를 끈 채 손가락으로 끌었는데 선이 생겼습니다");

    await p.check("#fingerDraw");
    await 긋기("touch", 380);
    await p.waitForTimeout(700);
    assert.ok(await 선수() > 펜뒤 + 500, "'펜으로 풀기' 를 켜고 그었는데 선이 안 생겼습니다");
    assert.equal(오류.length, 0, 오류.join("\n"));
    console.log("태블릿 펜 검사 통과: '펜으로 풀기' 맨 앞, 스크롤에 안 뺏김, 펜 선·한 화면에 몰아 그림(" + 펜.그림 + "번/움직임 120), 끄면 손가락은 넘기기만(스크롤 " + 손.스크롤 + "px)·켜면 필기");
    await p.close();
  } finally { await b.close(); 서버.close(); }
})().catch(e => { console.error(e); 서버.close(); process.exitCode = 1; });
