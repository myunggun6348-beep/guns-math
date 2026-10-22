/* =========================================================
   쓰는 법 검사 — 명령창에서 `node scripts\check-page-help.cjs`

   학생 페이지 아홉 곳의 머리 띠에 '?' 가 하나씩 있고, 누르면 세 줄이
   펼쳐지고, 다시 누르면 접히는지 봅니다(컴퓨터·폰). 평소에는 접혀 있어야
   합니다 — 처음부터 펼쳐 두면 화면이 다시 무거워집니다.
   미니게임은 화면이 바뀔 때 머리 띠를 다시 그리므로, 게임을 시작한 뒤에도
   '?' 가 남아 있는지 봅니다.
   ========================================================= */
const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert");
const { chromium } = require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const 뿌리 = path.join(__dirname, "..");

const 서버 = http.createServer((q, r) => {
  const 길 = new URL(q.url, "http://x").pathname;
  if (길.startsWith("/api/")) { r.setHeader("Content-Type", "application/json"); r.end(길 === "/api/student-account" ? '{"signedIn":false}' : "[]"); return; }
  const f = path.join(뿌리, 길 === "/" ? "/index.html" : 길);
  if (!f.startsWith(뿌리) || !fs.existsSync(f)) { r.writeHead(404).end(); return; }
  const t = { ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
  r.setHeader("Content-Type", t[path.extname(f)] || "text/html"); r.end(fs.readFileSync(f));
});

const 쪽들 = ["today.html", "wrong-notes.html", "files.html", "library.html", "map.html", "games.html", "quick-game.html?game=graph", "escape.html", "ask.html"];

(async () => {
  await new Promise(x => 서버.listen(5165, "127.0.0.1", x));
  const b = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const 오류 = [];
  try {
    for (const 폭 of [1280, 390]) {
      for (const 쪽 of 쪽들) {
        const p = await b.newPage({ viewport: { width: 폭, height: 900 } });
        p.on("pageerror", e => 오류.push(쪽 + ": " + e.message));
        await p.goto("http://127.0.0.1:5165/" + 쪽, { waitUntil: "networkidle" });
        await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "networkidle" });
        await p.waitForSelector(".page-help-btn", { timeout: 5000 }).catch(() => { throw new Error(쪽 + " 머리 띠에 '?' 가 없습니다"); });
        assert.equal(await p.locator(".page-help-btn").count(), 1, 쪽 + " '?' 가 하나가 아닙니다");
        assert.equal(await p.locator("#pageHelp").isVisible(), false, 쪽 + " 쓰는 법이 처음부터 펼쳐져 있습니다");
        // '?' 는 띠 오른쪽 끝에 — 폰에서 날짜 칸이 감춰지면 제목 옆에 붙은 적이 있습니다
        const 끝 = await p.evaluate(() => Math.round(document.querySelector(".page-head").getBoundingClientRect().right - document.querySelector(".page-help-btn").getBoundingClientRect().right));
        assert.ok(끝 <= 30, 쪽 + ` '?' 가 띠 오른쪽 끝이 아닙니다(${끝}px 떨어짐)`);
        await p.click(".page-help-btn");
        assert.equal(await p.locator("#pageHelp").isVisible(), true, 쪽 + " '?' 를 눌러도 안 펼쳐집니다");
        const 줄수 = await p.locator("#pageHelp li").count();
        assert.ok(줄수 >= 1 && 줄수 <= 3, 쪽 + ` 쓰는 법이 ${줄수}줄입니다(세 줄 이내)`);
        await p.click(".page-help-btn");
        assert.equal(await p.locator("#pageHelp").isVisible(), false, 쪽 + " 다시 눌러도 안 접힙니다");
        if (쪽.startsWith("quick-game")) {
          await p.click("#startBtn"); await p.waitForTimeout(400);
          assert.equal(await p.locator(".page-help-btn").count(), 1, "미니게임을 시작하자 '?' 가 사라졌거나 둘이 됐습니다");
          assert.equal(await p.locator("#pageHelp").count(), 1, "미니게임을 시작하자 쓰는 법 판이 사라졌거나 둘이 됐습니다");
        }
        await p.close();
      }
      // 홈·선생님 방에는 붙이지 않습니다
      const h = await b.newPage({ viewport: { width: 폭, height: 900 } });
      await h.goto("http://127.0.0.1:5165/index.html", { waitUntil: "networkidle" });
      assert.equal(await h.locator(".page-help-btn").count(), 0, "홈에 '?' 가 붙었습니다");
      await h.close();
    }
    assert.equal(오류.length, 0, 오류.join("\n"));
    console.log("쓰는 법 검사 통과: 학생 페이지 아홉 곳 모두 '?' 하나, 평소엔 접힘, 누르면 세 줄 이내로 펼침·다시 누르면 접힘 (컴퓨터·폰)");
  } finally { await b.close(); 서버.close(); }
})().catch(e => { console.error(e); 서버.close(); process.exitCode = 1; });
