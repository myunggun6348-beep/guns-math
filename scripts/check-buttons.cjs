/* =========================================================
   단추 검사 — 명령창에서 `node scripts\check-buttons.cjs`

   한때 사이트의 단추 모양이 32가지였습니다. 페이지마다 자기 단추를 따로
   그렸기 때문입니다(남색·검정·파랑, 알약·둥근 네모·각진 네모, 높이 34~81px).
   이제 값은 style.css 맨 위 --btn-* 에 한 번만 적고 모두 그걸 씁니다.

   여기서는 학생 쪽 모든 페이지를 밝은 화면·어두운 화면으로 열어
   '주 단추'(바탕이 글자색과 같은 꽉 찬 단추)가 전부
     · 알약 모양이고
     · 높이가 48(보통) 또는 40(작게)인지
   봅니다. 칩(학년·과목 고르기)은 모두 알약·높이 40, 켜지면 라임인지도 봅니다.
   새 페이지를 만들며 단추를 또 따로 그리면 여기서 걸립니다.

   빼는 것: 늘 같은 색인 색 블록(.block) 안의 단추, 켜진 칩·탭(고르는 것이지 누르면 일어나는 게 아님 — 칩 정리는
   따로 합니다), 풀이 화면의 그리기 도구 줄(도구 상자라 일부러 작음).
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

const 쪽들 = ["index.html", "games.html", "files.html", "library.html", "map.html", "ask.html", "today.html",
  "wrong-notes.html", "escape.html", "past-practice.html", "quick-game.html?game=graph", "admin.html"];

(async () => {
  await new Promise(x => 서버.listen(5181, "127.0.0.1", x));
  const b = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
  const 탈 = [];
  let 본수 = 0;
  try {
    for (const 화면 of ["light", "dark"]) {
      for (const 쪽 of 쪽들) {
        const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
        await p.goto("http://127.0.0.1:5181/" + 쪽, { waitUntil: "networkidle" }).catch(() => {});
        await p.evaluate(m => { localStorage.clear(); localStorage.setItem("theme", m); }, 화면).catch(() => {});
        await p.reload({ waitUntil: "networkidle" }).catch(() => {});
        await p.waitForTimeout(300);
        const 결과 = await p.evaluate(() => {
          const 뿌리색 = getComputedStyle(document.body).color;          // 글자색(--ink)
          const 바탕색 = getComputedStyle(document.body).backgroundColor; // 바탕(--canvas)
          const 칩 = '.on,.active,[aria-pressed="true"],[aria-selected="true"],[role="tab"],.grade-tab,.tool-button,.submit-button';
          const 걸린 = [], 본 = [];
          for (const el of document.querySelectorAll("button, a, input[type=submit]")) {
            if (!el.checkVisibility() || el.matches(칩) || el.closest(".scratch, .solve-toolbar")) continue;
            // 늘 같은 색인 색 블록(.block — 예: 질문 쪽 남색 판) 안의 단추는 그 블록에 맞춰 일부러 뒤집혀 있습니다
            if (el.closest(".block")) continue;
            const c = getComputedStyle(el);
            if (c.backgroundColor !== 뿌리색) continue;                   // 꽉 찬 '주 단추'만
            const r = el.getBoundingClientRect();
            if (r.width < 50) continue;
            const 높이 = Math.round(r.height), 둥글기 = parseFloat(c.borderTopLeftRadius);
            const 이름 = (el.textContent || el.value || "").trim().replace(/\s+/g, " ").slice(0, 18);
            본.push(이름);
            if (둥글기 < 20) 걸린.push(`'${이름}' 알약이 아닙니다(모서리 ${둥글기}px)`);
            if (![40, 48].includes(높이)) 걸린.push(`'${이름}' 높이 ${높이}px (48 또는 40 이어야 합니다)`);
            if (c.color !== 바탕색) 걸린.push(`'${이름}' 글자색이 바탕색과 다릅니다(${c.color})`);
          }
          /* 칩: 켜지면 라임, 모두 알약, 높이 40. 검정 칩은 주 단추와 헷갈립니다. */
          const 라임 = (() => { const t = document.createElement("i"); t.style.color = "var(--chip-on)"; document.body.append(t); const v = getComputedStyle(t).color; t.remove(); return v; })();
          const 칩들 = ".library-grade-tabs button,.cmap-grade button,.cmap-relation button,.grade-tab,.pick-button,.wrong-tab";
          for (const el of document.querySelectorAll(칩들)) {
            if (!el.checkVisibility()) continue;
            const c = getComputedStyle(el), 높이 = Math.round(el.getBoundingClientRect().height);
            const 이름 = el.textContent.trim().replace(/s+/g, " ").slice(0, 14);
            본.push("칩:" + 이름);
            if (parseFloat(c.borderTopLeftRadius) < 20) 걸린.push(`칩 '${이름}' 알약이 아닙니다`);
            if (높이 !== 40) 걸린.push(`칩 '${이름}' 높이 ${높이}px (40 이어야 합니다)`);
            if (el.classList.contains("on") && c.backgroundColor !== 라임) 걸린.push(`켜진 칩 '${이름}' 이 라임이 아닙니다(${c.backgroundColor})`);
          }
          return { 걸린, 본 };
        });
        본수 += 결과.본.length;
        for (const x of 결과.걸린) 탈.push(`${화면 === "dark" ? "어두운" : "밝은"} 화면 / ${쪽} — ${x}`);
        await p.close();
      }
    }
  } finally { await b.close(); 서버.close(); }
  assert.ok(본수 > 10, "주 단추를 하나도 못 찾았습니다 — 검사가 잘못 짜였을 수 있습니다");
  if (탈.length) { console.log("주 단추가 제각각입니다:\n- " + [...new Set(탈)].join("\n- ")); process.exitCode = 1; }
  else console.log(`단추 검사 통과: 주 단추·칩 ${본수}개 — 주 단추는 같은 검정 알약, 켜진 칩은 라임, 밝은·어두운 화면 모두`);
})().catch(e => { console.error(e); 서버.close(); process.exitCode = 1; });
