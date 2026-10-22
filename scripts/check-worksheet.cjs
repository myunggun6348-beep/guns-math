/* =========================================================
   기출 문제지 검사 — 명령창에서 `node scripts\check-worksheet.cjs`

   '다항식' 을 찾아 문제지를 만들면 고른 문항이 모두 원본에서 오려지고
   (EBSi 원본 PDF 를 열므로 인터넷이 필요합니다), 정답 쪽에 시험별 정답표가
   붙는지 봅니다. '속도와 거리' 처럼 '와' 로 이은 말도 찾아야 합니다.
   인쇄할 때는 고르는 화면이 빠지고 종이만 남아야 합니다. 폰 폭에서 가로로 넘치지 않는지도 봅니다.

   분류 고치기: 진짜 api/worksheet-tags.js 를 가짜 저장소에 붙여 돌립니다.
   틀린 암호는 거절, 맞는 암호면 저장되고 다시 열어도 남고, '원래 분류로' 로 되돌아가야 합니다.
   기출 목록(assets/exam-questions.json)은 모든 시험·모든 번호가 빠짐없이 한 번씩 있어야 합니다.
   ========================================================= */
const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert");
const { chromium } = require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const 뿌리 = path.join(__dirname, "..");

/* 가짜 저장소 — api 가 불러오기 전에 자리를 차지 */
const 저장 = new Map();
const 레디스자리 = require.resolve(path.join(뿌리, "api", "_redis.js"));
require.cache[레디스자리] = { id: 레디스자리, filename: 레디스자리, loaded: true, exports: { 준비됨: true, 명령: async (명, 열쇠, 칸, 값) => {
  if (명 === "HGET") return 저장.get(열쇠 + "/" + 칸) ?? null;
  if (명 === "HSET") { 저장.set(열쇠 + "/" + 칸, 값); return 1; }
  if (명 === "HDEL") { 저장.delete(열쇠 + "/" + 칸); return 1; }
  if (명 === "HGETALL") return [...저장].filter(([k]) => k.startsWith(열쇠 + "/")).flatMap(([k, v]) => [k.slice(열쇠.length + 1), v]);
  return null;
} } };
const 암호 = "검사용-암호-123";
process.env.ADMIN_PASSWORD = 암호;
const 분류창구 = require(path.join(뿌리, "api", "worksheet-tags.js"));

/* 목록 자체: 39회 · 학년별 번호가 빠짐없이 */
const 목록 = JSON.parse(fs.readFileSync(path.join(뿌리, "assets", "exam-questions.json"), "utf8"));
const 시험지 = JSON.parse(fs.readFileSync(path.join(뿌리, "assets", "exam-catalog.json"), "utf8")).items;
for (const 시험 of 시험지) {
  const 번호들 = 목록.items.filter(q => q.e === 시험.id);
  const 기대 = 시험.grade === "3" ? 22 + 8 * 시험.sets.length : 30;
  assert.equal(번호들.length, 기대, 시험.id + " 문항 수가 " + 번호들.length);
  assert.equal(new Set(번호들.map(q => (q.l || q.s) + q.n)).size, 기대, 시험.id + " 번호가 겹칩니다");
}
assert.ok(목록.items.every(q => q.c && q.u && q.t && 목록.courses.includes(q.c) && q.p > 0 && [2, 3, 4].includes(q.pt)), "과목·단원·유형·쪽·배점이 빠진 문항이 있습니다");

const 종류 = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json" };
const 서버 = http.createServer((q, r) => {
  const 길 = new URL(q.url, "http://x").pathname;
  if (길 === "/api/worksheet-tags") {
    let 몸 = ""; q.on("data", c => 몸 += c); q.on("end", () => {
      const res = { setHeader: (k, v) => r.setHeader(k, v), status(c) { r.statusCode = c; return this; }, json(v) { r.setHeader("Content-Type", "application/json"); r.end(JSON.stringify(v)); return this; } };
      분류창구({ method: q.method, body: 몸 ? JSON.parse(몸) : {} }, res);
    });
    return;
  }
  const f = path.join(뿌리, 길);
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
      assert.ok(await p.locator(".ws-course").count() >= 7, "처음 화면에 과목별 단원 칩이 없습니다");
      await p.fill("#wsQuery", "속도와 거리");
      assert.ok(await p.locator(".ws-list li[data-row]").count() >= 5, "'속도와 거리' 기출이 너무 적습니다");
      await p.click('[data-filter="pts"] [data-v="3"]');
      assert.ok(await p.locator(".ws-list li[data-row]").count() < 5, "배점으로 좁혀지지 않습니다");
      await p.click('[data-filter="pts"] [data-v=""]');
      await p.fill("#wsQuery", "미분");
      assert.equal(await p.locator(".ws-list input:checked").count(), 0, "많이 찾았는데 처음부터 다 골라져 있습니다");
      await p.fill("#wsQuery", "다항식의 나눗셈");
      const 수 = await p.locator(".ws-list li[data-row]").count();
      assert.ok(수 >= 3 && 수 <= 20, "다항식의 나눗셈 " + 수 + "문항");
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

    // 분류 고치기
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    p.on("pageerror", e => 오류.push(e.message));
    let 넣을암호 = "틀린암호";
    p.on("dialog", d => d.type() === "prompt" ? d.accept(넣을암호) : d.dismiss());
    await p.goto("http://127.0.0.1:5243/worksheet.html?q=" + encodeURIComponent("속도와 거리"), { waitUntil: "networkidle" });
    const 첫줄 = p.locator(".ws-list li[data-row]").first(), id = await 첫줄.getAttribute("data-row");
    await 첫줄.locator(".ws-fix-open").click();
    await 첫줄.locator('.ws-fix input[name="t"]').fill("검사 유형");
    await 첫줄.locator('.ws-fix button[type="submit"]').click();
    await p.waitForTimeout(400);
    assert.equal(저장.size, 0, "틀린 암호인데 저장됐습니다");
    넣을암호 = 암호;
    await p.locator(".ws-fix button[type=\"submit\"]").click();
    await p.waitForFunction(() => document.body.innerText.includes("고친 분류"), null, { timeout: 5000 });
    assert.equal(JSON.parse(저장.get("기출분류/" + id)).t, "검사 유형");
    await p.reload({ waitUntil: "networkidle" });
    assert.ok((await p.locator(".ws-group").allInnerTexts()).some(t => t.includes("검사 유형")), "다시 열자 고친 분류가 사라졌습니다");
    const 고친줄 = p.locator('[data-row="' + id + '"]');
    await 고친줄.locator(".ws-fix-open").click();
    await 고친줄.locator("[data-reset]").click();
    await p.waitForTimeout(400);
    assert.equal(저장.size, 0, "원래 분류로 되돌리지 못했습니다");
    await p.close();

    assert.equal(오류.length, 0, 오류.join("\n"));
    console.log("기출 문제지 검사 통과: 39회 전 문항 빠짐없음, 검색·배점 고르기·많으면 비워 둠, 원본에서 오림·정답표, 인쇄 땐 종이만, 분류 고치기(틀린 암호 거절·저장·유지·되돌리기), 컴퓨터·폰");
  } finally { await b.close(); 서버.close(); }
})().catch(e => { console.error(e); 서버.close(); process.exitCode = 1; });
