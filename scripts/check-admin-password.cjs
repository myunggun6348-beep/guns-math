/* =========================================================
   선생님 방 암호 검사 — 명령창에서 `node scripts\check-admin-password.cjs`

   암호는 틀리면 큰일 나는 자리라서 검사를 남겨 둡니다. 진짜 저장소에는
   말을 걸지 않습니다(가짜 저장소를 끼워 넣습니다). 인터넷도 필요 없습니다.
   ========================================================= */
const assert = require("assert");
const path = require("path");

/* 가짜 저장소. api/admin.js 가 불러오기 전에 자리를 차지해 둡니다. */
const 저장 = new Map();
const 레디스자리 = require.resolve(path.join(__dirname, "..", "api", "_redis.js"));
require.cache[레디스자리] = {
  id: 레디스자리, filename: 레디스자리, loaded: true,
  exports: {
    준비됨: true,
    명령: async (명, 열쇠, 칸, 값) => {
      if (명 === "HGET") return 저장.get(열쇠 + "/" + 칸) ?? null;
      if (명 === "HSET") { 저장.set(열쇠 + "/" + 칸, 값); return 1; }
      if (명 === "HDEL") { 저장.delete(열쇠 + "/" + 칸); return 1; }
      if (명 === "HGETALL") return [];
      return null;
    },
  },
};

process.env.ADMIN_PASSWORD = "처음암호-abc123";
const 창구 = require(path.join(__dirname, "..", "api", "admin.js"));

async function 보내기(몸) {
  const 답 = {};
  const res = {
    setHeader() {},
    status(코드) { 답.코드 = 코드; return this; },
    json(값) { 답.값 = 값; return this; },
    end() { return this; },
  };
  await 창구({ method: "POST", body: 몸 }, res);
  return 답;
}

(async () => {
  // Vercel 에 넣어 둔 처음 암호로 들어가진다
  assert.equal((await 보내기({ 암호: "처음암호-abc123", 작업: "확인" })).코드, 200);
  assert.equal((await 보내기({ 암호: "처음암호-abc123", 작업: "확인" })).값.바꾼암호, false);

  // 틀린 암호·빈 암호는 막힌다
  assert.equal((await 보내기({ 암호: "틀린암호", 작업: "확인" })).코드, 401);
  assert.equal((await 보내기({ 암호: "", 작업: "확인" })).코드, 401);

  // 너무 짧은 새 암호는 거절한다
  assert.equal((await 보내기({ 암호: "처음암호-abc123", 작업: "암호바꾸기", 새암호: "짧음" })).코드, 400);

  // 바꾼다
  const 바꿈 = await 보내기({ 암호: "처음암호-abc123", 작업: "암호바꾸기", 새암호: "새암호-xyz789" });
  assert.equal(바꿈.코드, 200);
  assert.equal(바꿈.값.바꾼암호, true);

  // 저장소에 글자 그대로 남지 않는다 — 여기가 제일 중요하다
  const 적힌 = [...저장.values()].join(" ");
  assert.ok(!적힌.includes("새암호-xyz789"), "암호가 글자 그대로 저장되었습니다: " + 적힌);

  // 새 암호로 들어가진다
  assert.equal((await 보내기({ 암호: "새암호-xyz789", 작업: "확인" })).코드, 200);
  assert.equal((await 보내기({ 암호: "새암호-xyz789", 작업: "확인" })).값.바꾼암호, true);

  // 처음 암호도 여벌 열쇠로 계속 통한다 (잊어버려도 잠기지 않게)
  assert.equal((await 보내기({ 암호: "처음암호-abc123", 작업: "확인" })).코드, 200);

  // 한 글자만 달라도 막힌다
  assert.equal((await 보내기({ 암호: "새암호-xyz788", 작업: "확인" })).코드, 401);

  // 되돌리면 새 암호는 더 이상 안 통한다
  assert.equal((await 보내기({ 암호: "새암호-xyz789", 작업: "암호되돌리기" })).코드, 200);
  assert.equal((await 보내기({ 암호: "새암호-xyz789", 작업: "확인" })).코드, 401);
  assert.equal((await 보내기({ 암호: "처음암호-abc123", 작업: "확인" })).코드, 200);

  console.log("암호 검사 통과: 처음 암호 · 바꾼 암호 · 여벌 열쇠 · 되돌리기 · 글자 그대로 저장 안 함");
})().catch(오류 => { console.error(오류); process.exitCode = 1; });
