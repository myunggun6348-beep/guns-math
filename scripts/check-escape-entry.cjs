/* 링크로 들어온 학생이 '이름만' 보게 되는지 확인합니다. */
const fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert");
const { chromium } = require("C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const 뿌리 = path.join(__dirname, "..");

const 서버 = http.createServer((req, res) => {
  const 길 = new URL(req.url, "http://x").pathname;
  if (길.startsWith("/api/")) { res.setHeader("Content-Type", "application/json"); res.end("{}"); return; }
  const f = path.join(뿌리, 길 === "/" ? "/index.html" : 길);
  if (!fs.existsSync(f)) { res.writeHead(404).end(); return; }
  const t = { ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
  res.setHeader("Content-Type", t[path.extname(f)] || "text/html");
  res.end(fs.readFileSync(f));
});

(async () => {
  await new Promise(r => 서버.listen(5192, "127.0.0.1", r));
  const b = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  for (const 폭 of [390, 1280]) {
    const p = await b.newPage({ viewport: { width: 폭, height: 844 } });
    const 오류 = []; p.on("pageerror", e => 오류.push(e.message));

    // 1) 링크로 들어왔을 때
    await p.goto("http://127.0.0.1:5192/escape.html?code=8GWXMF", { waitUntil: "networkidle" });
    await p.waitForTimeout(300);
    const 본것 = await p.evaluate(() => {
      const 폼 = document.querySelector("#studentForm");
      const 보이나 = el => Boolean(el && el.checkVisibility());
      return {
        코드채워짐: 폼.roomCode.value,
        이름칸보임: 보이나(폼.student),
        과목칸보임: 보이나(폼.course),
        난이도칸보임: 보이나(폼.difficulty),
        코드칸보임: 보이나(폼.roomCode),
        안내: document.querySelector("#studentPanelLead")?.textContent || "",
      };
    });
    assert.equal(본것.코드채워짐, "8GWXMF", "주소의 코드가 안 채워졌습니다");
    assert.equal(본것.이름칸보임, true, "이름 칸이 사라졌습니다");
    assert.equal(본것.과목칸보임, false, "과목 칸이 아직 보입니다");
    assert.equal(본것.난이도칸보임, false, "난이도 칸이 아직 보입니다");
    assert.equal(본것.코드칸보임, false, "코드 칸이 아직 보입니다");
    assert.match(본것.안내, /8GWXMF/, "어느 방에 들어가는지 안 알려 줍니다");

    // 2) 그냥 들어왔을 때는 예전 그대로여야 합니다
    await p.goto("http://127.0.0.1:5192/escape.html", { waitUntil: "networkidle" });
    await p.waitForTimeout(200);
    /* 혼자 찾아온 학생은 아무것도 안 정하고 바로 시작할 수 있어야 합니다.
       예전에는 이름·코드·과목·난이도 네 가지를 먼저 정해야 했습니다. */
    const 그냥 = await p.evaluate(() => {
      const 보이나 = el => Boolean(el && el.checkVisibility());
      const 보이는칸 = [...document.querySelectorAll("#studentForm input, #studentForm select")].filter(보이나).length;
      return {
        처음보이는칸수: 보이는칸,
        시작단추: document.querySelector("#startButton")?.textContent.trim() || "",
        설정접힘: !document.querySelector("#optionBox").open,
        코드접힘: !document.querySelector("#codeBox").open,
        교사탭이앞에있나: Boolean(document.querySelector(".role-tabs")),
      };
    });
    assert.equal(그냥.처음보이는칸수, 0, "처음 화면에 아직 적을 칸이 "+그냥.처음보이는칸수+"개 보입니다");
    assert.match(그냥.시작단추, /바로 시작/, "바로 시작하는 단추가 없습니다");
    assert.equal(그냥.설정접힘, true); assert.equal(그냥.코드접힘, true);
    assert.equal(그냥.교사탭이앞에있나, false, "학생 화면에 '교사 운영' 탭이 아직 나란히 있습니다");

    if (폭 === 390) await p.screenshot({ path: "artifacts/탈출-첫화면-폰.png", fullPage: true });

    // 그리고 그 단추만 눌러도 실제로 시작돼야 합니다
    let 시작눌림 = false;
    await p.route("**/api/math-escape", async route => {
      const 받은 = JSON.parse(route.request().postData() || "{}");
      if (받은.action !== "start") return route.fulfill({ status: 200, body: "{}" });
      assert.ok(!받은.code, "코드 없이 시작해야 하는데 코드가 붙었습니다");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ 시작됨: true }) });
      시작눌림 = true;
    });
    await p.click("#startButton");
    await p.waitForTimeout(400);
    assert.ok(시작눌림, "'바로 시작'을 눌러도 아무 일이 없습니다");
    await p.unroute("**/api/math-escape");

    assert.equal(오류.length, 0, 오류.join("\n"));
    await p.close();
  }
  await b.close(); 서버.close();
  console.log("수학 탈출 입장 검사 통과: 혼자 오면 단추 하나로 시작, 링크로 오면 이름만, 교사 화면은 뒤로");
})().catch(e => { console.error(e); 서버.close(); process.exitCode = 1; });
