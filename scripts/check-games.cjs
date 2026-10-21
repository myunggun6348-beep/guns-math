/* =========================================================
   게임 틀 검사 — 명령창에서 `node scripts\check-games.cjs`

   미니게임과 수학 탈출은 같은 게임 목록에 있는데, 한때 서로 다른 화면이었습니다.
   미니게임은 큰 라임 카드에 가는 58px 제목, 수학 탈출은 가운데 54px 시계·
   50px 방 이름·90px '탈출 성공!'. 이제 둘 다
     ← 게임 목록 → 머리 띠(.page-head) → 시작·진행·결과 카드
   를 씁니다. 수학 탈출을 실제로 한 판 돌려(문제는 진짜 출제 함수로 만듭니다)
   진행 화면과 결과 화면이 같은 틀인지 봅니다. 인터넷은 필요 없습니다.
   ========================================================= */
const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert");
const { chromium } = require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const 뿌리 = path.join(__dirname, "..");
const { questions, visible } = require(path.join(뿌리, "api", "_math_questions.js"));

function 판(끝, 탈출) {
  const qs = questions("수학 종합", "standard", 1), solved = 끝 && 탈출 ? [0, 1, 2, 3, 4, 5] : 끝 ? [0, 2] : [];
  return { id: "r1", room: null, student: "혼자", course: "수학 종합", difficulty: "standard", started: Date.now() - 120000,
    deadline: Date.now() + 780000, score: 끝 ? 400 : 0, stage: 0, solved, hints: [], done: !!끝, escaped: !!탈출,
    questions: qs.map(q => visible(q, solved.includes(q.id), !!끝, false)) };
}
let 지금 = 판();
const 서버 = http.createServer((q, r) => {
  const 길 = new URL(q.url, "http://x").pathname;
  if (길 === "/api/math-escape") { q.resume(); q.on("end", () => { r.setHeader("Content-Type", "application/json"); r.end(JSON.stringify({ run: 지금 })); }); return; }
  if (길.startsWith("/api/")) { r.setHeader("Content-Type", "application/json"); r.end(길 === "/api/student-account" ? '{"signedIn":false}' : "[]"); return; }
  const f = path.join(뿌리, 길);
  if (!f.startsWith(뿌리) || !fs.existsSync(f)) { r.writeHead(404).end(); return; }
  const t = { ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
  r.setHeader("Content-Type", t[path.extname(f)] || "text/html"); r.end(fs.readFileSync(f));
});

const 크기 = (p, s) => p.evaluate(sel => { const e = document.querySelector(sel); return e ? parseFloat(getComputedStyle(e).fontSize) : 0; }, s);
const 보이나 = (p, s) => p.evaluate(sel => Boolean(document.querySelector(sel)?.checkVisibility()), s);

(async () => {
  await new Promise(x => 서버.listen(5170, "127.0.0.1", x));
  const b = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const 오류 = [];
  try {
    for (const 폭 of [1280, 390]) {
      /* ---- 미니게임 ---- */
      const m = await b.newPage({ viewport: { width: 폭, height: 900 } }); m.on("pageerror", e => 오류.push("미니게임: " + e.message));
      await m.goto("http://127.0.0.1:5170/quick-game.html?game=graph", { waitUntil: "networkidle" });
      assert.ok(await 보이나(m, ".back-link"), "미니게임에 '게임 목록' 길이 없습니다");
      assert.ok(await 보이나(m, ".page-head"), "미니게임 머리가 공통 머리 띠가 아닙니다");
      assert.equal(await m.locator(".quick-hero").count(), 0, "미니게임에 옛 라임 큰 카드가 남아 있습니다");
      assert.ok(await 보이나(m, ".start-panel"), "미니게임 시작 카드가 없습니다");
      await m.close();

      /* ---- 수학 탈출: 시작 → 진행 ---- */
      const p = await b.newPage({ viewport: { width: 폭, height: 900 } }); p.on("pageerror", e => 오류.push("수학 탈출: " + e.message));
      await p.goto("http://127.0.0.1:5170/escape.html", { waitUntil: "networkidle" });
      await p.evaluate(() => localStorage.clear());
      지금 = 판(); await p.reload({ waitUntil: "networkidle" });
      assert.ok(await 보이나(p, ".back-link"), "수학 탈출에 '게임 목록' 길이 없습니다");
      assert.ok(await 보이나(p, ".page-head"), "수학 탈출 머리가 공통 머리 띠가 아닙니다");
      assert.ok(await 보이나(p, "#studentPanel.start-panel"), "수학 탈출 시작 화면이 시작 카드가 아닙니다");
      await p.click("#startButton"); await p.waitForTimeout(500);
      assert.ok(await 보이나(p, "#game .quiz-panel"), "수학 탈출 진행 화면이 진행 카드가 아닙니다");
      const 시계 = await 크기(p, "#timer"), 방 = await 크기(p, "#roomTitle");
      assert.ok(시계 <= 20, `시계가 또 커졌습니다(${시계}px) — 미니게임처럼 카드 맨 위 한 줄이어야 합니다`);
      assert.ok(방 <= 26, `방 이름이 또 커졌습니다(${방}px)`);
      assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector("#roomTitle")).textAlign === "center"), false, "방 이름이 가운데 정렬입니다");
      assert.match(await p.locator(".clue-card .num").first().innerText(), /^단서 1/, "단서 이름이 한글이 아닙니다(CLUE …)");
      await p.close();

      /* ---- 수학 탈출: 결과 (시간이 다 돼 끝난 판) ---- */
      const f = await b.newPage({ viewport: { width: 폭, height: 900 } }); f.on("pageerror", e => 오류.push("수학 탈출 결과: " + e.message));
      await f.goto("http://127.0.0.1:5170/escape.html", { waitUntil: "networkidle" });
      await f.evaluate(() => localStorage.clear());
      지금 = 판(true, false); await f.reload({ waitUntil: "networkidle" });
      await f.click("#startButton"); await f.waitForTimeout(500);
      assert.ok(await 보이나(f, "#finish .result-panel"), "수학 탈출 결과가 결과 카드가 아닙니다");
      assert.ok(await 크기(f, "#finishTitle") <= 28, "결과 제목이 또 커졌습니다");
      assert.equal((await f.locator("#finishTag").innerText()).trim(), "시간 종료", "시간이 다 돼 끝났는데 '탈출 완료'라고 합니다");
      assert.equal((await f.locator("#finishSolved").innerText()).trim(), "2/6");
      await f.close();
    }
    assert.equal(오류.length, 0, 오류.join("\n"));
    console.log("게임 틀 검사 통과: 미니게임·수학 탈출 모두 게임 목록 → 머리 띠 → 시작·진행·결과 카드 (컴퓨터·폰)");
  } finally { await b.close(); 서버.close(); }
})().catch(e => { console.error(e); 서버.close(); process.exitCode = 1; });
