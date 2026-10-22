/* =========================================================
   기출 문제지 검사 — 명령창에서 `node scripts\check-worksheet.cjs`

   '다항식' 을 찾아 문제지를 만들면 고른 문항이 모두 원본에서 오려지고
   (EBSi 원본 PDF 를 열므로 인터넷이 필요합니다), 정답 쪽에 시험별 정답표가
   붙는지 봅니다. '속도와 거리' 처럼 '와' 로 이은 말도 찾아야 합니다.
   인쇄할 때는 고르는 화면이 빠지고 종이만 남아야 합니다. 폰 폭에서 가로로 넘치지 않는지도 봅니다.
   ========================================================= */
const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert");
const { chromium } = require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const 뿌리 = path.join(__dirname, "..");
const 종류 = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json" };
const 서버 = http.createServer((q, r) => {
  const 길 = new URL(q.url, "http://x").pathname, f = path.join(뿌리, 길);
  if (!f.startsWith(뿌리) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; }
  r.setHeader("Content-Type", 종류[path.extname(f)] || "text/html"); r.end(fs.readFileSync(f));
});

(async () => {
  await new Promise(x => 서버.listen(5243, "127.0.0.1", x));
  const b = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const 오류 = [];
  try {
    for (const 폭 of [1280, 390]) {
      const p = await b.newPage({ viewport: { width: 폭, height: 900 } });
      p.on("pageerror", e => 오류.push(e.message));
      await p.goto("http://127.0.0.1:5243/worksheet.html", { waitUntil: "networkidle" });
      assert.ok(await p.locator(".ws-chips button").count() >= 10, "처음 화면에 단원 칩이 없습니다");
      await p.fill("#wsQuery", "속도와 거리");
      assert.ok(await p.locator(".ws-list li").count() >= 1, "'속도와 거리' 로 찾지 못합니다");
      await p.fill("#wsQuery", "다항식");
      const 수 = await p.locator(".ws-list li").count();
      assert.ok(수 >= 5, "다항식 기출이 너무 적습니다");
      await p.click("#wsMake");
      await p.waitForFunction(() => !document.getElementById("wsPrint").disabled, null, { timeout: 120000 });
      assert.equal(await p.locator(".ws-q img").count(), 수, "오리지 못한 문항이 있습니다");
      assert.equal(await p.locator(".ws-answers tbody tr").count(), 수);
      assert.ok(await p.locator(".ws-keys img").count() >= 1, "정답표가 없습니다");
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "가로로 넘칩니다");
      await p.emulateMedia({ media: "print" });
      assert.equal(await p.locator(".ws-tools").isVisible(), false); assert.equal(await p.locator(".ws-sheet-bar").isVisible(), false);
      assert.equal(await p.locator(".ws-paper").first().isVisible(), true);
      await p.close();
    }
    assert.equal(오류.length, 0, 오류.join("\n"));
    console.log("기출 문제지 검사 통과: '와' 로 이은 검색·단원 칩, 고른 문항 모두 원본에서 오림·정답표, 인쇄 땐 종이만, 컴퓨터·폰");
  } finally { await b.close(); 서버.close(); }
})().catch(e => { console.error(e); 서버.close(); process.exitCode = 1; });
