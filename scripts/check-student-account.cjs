/* =========================================================
   학생 계정 검사 — 명령창에서 `node scripts\check-student-account.cjs`

   화면에서 막는 것은 안내일 뿐이고, 진짜 관문은 서버입니다. 주소로 바로
   찔러도 막히는지 봅니다. 진짜 저장소에는 말을 걸지 않습니다(가짜를 끼웁니다).
   ========================================================= */
const assert = require("assert");
const path = require("path");

/* 가짜 저장소 — api/student-account.js 가 불러오기 전에 자리를 차지합니다 */
const 저장 = new Map();
const 레디스자리 = require.resolve(path.join(__dirname, "..", "api", "_redis.js"));
require.cache[레디스자리] = {
  id: 레디스자리, filename: 레디스자리, loaded: true,
  exports: {
    준비됨: true,
    명령: async (명, 열쇠, ...남은) => {
      if (명 === "GET") return 저장.get(열쇠) ?? null;
      if (명 === "SET") { 저장.set(열쇠, 남은[0]); return "OK"; }
      if (명 === "DEL") { 저장.delete(열쇠); return 1; }
      if (명 === "EXISTS") return 저장.has(열쇠) ? 1 : 0;
      if (명 === "INCR") { const n = (Number(저장.get(열쇠)) || 0) + 1; 저장.set(열쇠, String(n)); return n; }
      if (명 === "EXPIRE") return 1;
      return null;
    },
  },
};

const 창구 = require(path.join(__dirname, "..", "api", "student-account.js"));

async function 보내기(몸, 머리 = {}) {
  const 답 = { 쿠키: [] };
  const res = {
    setHeader(이름, 값) { if (String(이름).toLowerCase() === "set-cookie") 답.쿠키.push(값); },
    status(코드) { 답.코드 = 코드; return this; },
    json(값) { 답.값 = 값; return this; },
    end() { return this; },
  };
  await 창구({ method: "POST", body: 몸, headers: { "x-forwarded-for": "1.2.3.4", ...머리 } }, res);
  return 답;
}

(async () => {
  // ---- 뻔한 비밀번호는 서버가 막는다 (화면을 건너뛰고 찔러도) ----
  for (const [나쁜것, 까닭] of [
    ["1234", "너무 짧음"], ["12345", "너무 짧음"], ["", "빈 것"],
    ["111111", "같은 숫자"], ["000000", "같은 숫자"],
    ["123456", "이어지는 숫자"], ["987654", "거꾸로 이어지는 숫자"],
    ["abcdef", "숫자가 아님"], ["1234567890123", "너무 긺"],
  ]) {
    const 답 = await 보내기({ action: "register", id: "test" + Math.random().toString(36).slice(2, 8), pin: 나쁜것 });
    assert.equal(답.코드, 400, `'${나쁜것}'(${까닭}) 으로 계정이 만들어졌습니다`);
    assert.ok(답.값.error, "왜 안 되는지 안 알려 줍니다: " + 나쁜것);
  }

  // ---- 쓸 만한 비밀번호는 통과 ----
  const 만듦 = await 보내기({ action: "register", id: "minsu2026", pin: "728315", name: "민수" });
  assert.equal(만듦.코드, 201, JSON.stringify(만듦.값));
  assert.equal(만듦.값.student.id, "minsu2026");

  // ---- 같은 아이디는 두 번 못 만든다 ----
  assert.equal((await 보내기({ action: "register", id: "minsu2026", pin: "483927" })).코드, 409);

  // ---- 로그인 ----
  assert.equal((await 보내기({ action: "login", id: "minsu2026", pin: "728315" })).코드, 200);
  assert.equal((await 보내기({ action: "login", id: "minsu2026", pin: "728314" })).코드, 401);
  assert.equal((await 보내기({ action: "login", id: "minsu2026", pin: "" })).코드, 401);

  /* ---- 규칙을 조이기 전에 만든 계정도 계속 들어와야 한다 ----
     옛 계정은 4자리를 쓰고 있을 수 있다. 새 규칙 때문에 자기 계정에서
     쫓겨나면 안 된다. 저장소에 옛날식 계정을 직접 넣어 확인한다. */
  const crypto = require("crypto");
  const 소금 = crypto.randomBytes(16).toString("hex");
  저장.set("student:account:oldstudent", JSON.stringify({
    name: "옛학생", salt: 소금,
    hash: crypto.scryptSync("1234", 소금, 32).toString("hex"),
    createdAt: "2026-01-01T00:00:00.000Z",
  }));
  assert.equal((await 보내기({ action: "login", id: "oldstudent", pin: "1234" })).코드, 200,
    "규칙을 조이기 전에 만든 계정이 로그인하지 못합니다");

  /* ---- 한 반이 같이 로그인해도 막히지 않아야 한다 ----
     예전에는 아이피당 20번이라, 학교에서 서른 명이 들어오면 뒷자리가 막혔다. */
  저장.delete("student:rate:login:1.2.3.4");
  for (let i = 0; i < 30; i++) {
    const 답 = await 보내기({ action: "login", id: "minsu2026", pin: "728315" });
    assert.equal(답.코드, 200, `${i + 1}번째 학생이 막혔습니다`);
  }

  /* ---- 그런데 한 아이디로 찍어 맞히려 하면 막혀야 한다 ---- */
  let 막힘 = 0;
  for (let i = 0; i < 15; i++) {
    if ((await 보내기({ action: "login", id: "minsu2026", pin: "000001" })).코드 === 429) 막힘++;
  }
  assert.ok(막힘 > 0, "비밀번호를 열다섯 번 틀려도 안 막힙니다");

  console.log("학생 계정 검사 통과: 뻔한 비밀번호 거부, 옛 계정 그대로 로그인, 한 반이 같이 로그인, 찍어 맞히기는 막힘");
})().catch(오류 => { console.error(오류); process.exitCode = 1; });
