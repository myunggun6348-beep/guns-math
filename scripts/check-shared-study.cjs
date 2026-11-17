const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH ||
  "C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.join(__dirname, "..");
const types = { ".js": "text/javascript", ".html": "text/html", ".json": "application/json", ".css": "text/css", ".woff2": "font/woff2" };
const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    response.setHeader("Content-Type", "application/json");
    response.end("[]");
    return;
  }
  const file = path.join(root, url.pathname === "/" ? "index.html" : url.pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
  response.end(fs.readFileSync(file));
});

async function seedPersonal(page) {
  await page.evaluate(() => {
    localStorage.setItem("math-home-profile-v1", JSON.stringify({ grade: "3", track: "stats" }));
    localStorage.setItem("math-wrong-notes-v1", JSON.stringify([{ id: "personal-note", prompt: "기존 개인 기록" }]));
    sessionStorage.setItem("mathEscapeTeacher", "desktop-only-fixture");
  });
}

async function readBrowserStorage(page) {
  return page.evaluate(() => [Object.entries(localStorage), Object.entries(sessionStorage)]);
}

async function openFile(page, buffer, password) {
  await page.locator("#sharedOpen").click();
  await page.locator("#sharedOpenForm input[type=file]").setInputFiles({
    name: "내학습.mathstudy", mimeType: "application/octet-stream", buffer
  });
  await page.locator("#sharedOpenForm [name=password]").fill(password);
  await page.locator("#sharedOpenForm button[type=submit]").click();
}

async function endWithoutSaving(page) {
  await page.locator("#sharedEnd").click();
  await page.locator("#sharedDiscard").click();
  await page.locator("#sharedStart").waitFor();
  assert.equal(await page.locator("iframe").count(), 0);
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.BROWSER_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      headless: true
    });
    const password = "shared-test-passphrase";
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    const accountRequests = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/student-account") accountRequests.push(request.url()); });
    await page.goto(origin + "/shared.html");
    await seedPersonal(page);
    const original = await readBrowserStorage(page);
    assert.equal(await page.locator("iframe").count(), 0);
    await page.locator("#sharedStart").click();
    const app = page.frameLocator("#sharedRun iframe");
    await app.locator("#homeTry").click();
    assert.equal(await app.locator('[data-grade="1"]').getAttribute("class"), "pick-button on");
    await app.locator("#todayStart").click();
    const draft = app.locator("#scratchCanvas");
    await draft.waitFor();
    await draft.evaluate(() => {
      const storage = window.StudyStorage;
      const key = "math-study-draft-v1:guest:daily-1-common1";
      const value = JSON.parse(storage.getItem(key));
      value.ink.pages[0].strokes.push({ color: "#123456", width: 4, points: [{ x: 0.2, y: 0.2 }] });
      window.GameScratch.restore(value.ink);
      storage.setItem("today-study-records", JSON.stringify([{ date: "2026-11-16", grade: "1", track: "common1", correct: 4, total: 5 }]));
      window.WrongNotes.record({ source: "today", sourceKey: "common1", grade: "1", conceptId: "poly",
        conceptName: "다항식", prompt: "공용 학생의 테스트 오답", type: "text", correctAnswer: "1",
        solutionImage: "data:image/png;base64,AA==" }, false);
    });
    assert.deepEqual(await readBrowserStorage(page), original);

    await page.locator("#sharedEnd").click();
    assert.equal(await page.locator("#sharedRun iframe").isVisible(), false);
    await page.locator("#sharedSaveForm [name=password]").fill(password);
    await page.locator("#sharedSaveForm [name=confirmPassword]").fill(password);
    const [download] = await Promise.all([
      page.waitForEvent("download"), page.locator("#sharedSaveForm button[type=submit]").click()
    ]);
    assert.match(download.suggestedFilename(), /\.mathstudy$/);
    const buffer = fs.readFileSync(await download.path());
    assert.ok(!buffer.includes(Buffer.from("공용 학생의 테스트 오답")));
    await page.locator("#sharedSaved").waitFor();
    await page.locator("#sharedDiscard").click();

    // 같은 브라우저에서 다음 학생이 먼저 들어와도 이전 학생의 풀이가 열리지 않습니다.
    await page.locator("#sharedStart").click();
    await app.locator("#homeTry").waitFor();
    assert.equal(await app.locator(".home-main-action").count(), 0);
    await app.getByRole("link", { name: "오답노트 보기" }).click();
    await app.locator("#wrongApp").waitFor();
    assert.doesNotMatch(await app.locator("#wrongApp").innerText(), /개인 기록|테스트 오답/);
    await endWithoutSaving(page);
    assert.deepEqual(await readBrowserStorage(page), original);
    assert.deepEqual(accountRequests, []);

    const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await other.goto(origin + "/shared.html");
    await openFile(other, buffer, "wrong-test-passphrase");
    await other.getByRole("alert").filter({ hasText: "파일을 열 수 없습니다" }).waitFor();
    assert.equal(await other.locator("iframe").count(), 0);
    await other.locator("#sharedOpenForm [data-close]").click();

    const damaged = Buffer.from(buffer);
    damaged[damaged.length - 1] ^= 1;
    await openFile(other, damaged, password);
    await other.getByRole("alert").filter({ hasText: "파일을 열 수 없습니다" }).waitFor();
    await other.locator("#sharedOpenForm [data-close]").click();

    await openFile(other, buffer, password);
    const restored = other.frameLocator("#sharedRun iframe");
    await restored.locator(".home-main-action").click();
    await restored.locator(".daily-question").waitFor();
    const recovered = await restored.locator("#scratchCanvas").evaluate(() => ({
      ink: window.GameScratch.snapshot(),
      records: JSON.parse(window.StudyStorage.getItem("today-study-records")),
      notes: window.WrongNotes.all()
    }));
    assert.equal(recovered.ink.pages[0].strokes[0].color, "#123456");
    assert.equal(recovered.records[0].correct, 4);
    assert.equal(recovered.notes[0].prompt, "공용 학생의 테스트 오답");
    assert.equal(recovered.notes[0].solutionImage, "data:image/png;base64,AA==");
    await endWithoutSaving(other);

    await other.clock.install();
    await other.locator("#sharedStart").click();
    await restored.locator("#homeTry").waitFor();
    await other.clock.fastForward(601000);
    await other.locator("#sharedStatus").getByText("10분", { exact: false }).waitFor();
    assert.equal(await other.locator("iframe").count(), 0);
    assert.deepEqual(errors, []);
    console.log("공용 모드 검사 통과: 개인 기록·다음 학생 분리, 암호화 파일과 펜 복원, 틀린 암호·변조 거부, 종료·자동 비우기");
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
