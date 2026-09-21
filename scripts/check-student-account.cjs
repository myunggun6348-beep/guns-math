const assert = require("assert");
const path = require("path");

const values = new Map();
async function command(op, ...args) {
  if (op === "GET") return values.get(args[0]) || null;
  if (op === "SET") { values.set(args[0], args[1]); return "OK"; }
  if (op === "DEL") return values.delete(args[0]) ? 1 : 0;
  if (op === "EXISTS") return values.has(args[0]) ? 1 : 0;
  if (op === "INCR") { const next = Number(values.get(args[0]) || 0) + 1; values.set(args[0], String(next)); return next; }
  if (op === "EXPIRE") return 1;
  if (op === "SCAN") { const pattern = String(args[2] || "").replace("*", ""); return ["0", [...values.keys()].filter(key => key.startsWith(pattern))]; }
  throw new Error(`Unexpected Redis command: ${op}`);
}

const redisPath = require.resolve(path.join(__dirname, "../api/_redis.js"));
require.cache[redisPath] = { id: redisPath, filename: redisPath, loaded: true, exports: { 준비됨: true, 명령: command } };
const handler = require("../api/student-account.js");
process.env.ADMIN_PASSWORD = "teacher-test-password";
const adminHandler = require("../api/student-admin.js");

function callWith(target, method, payload, cookie = "") {
  return new Promise((resolve, reject) => {
    const req = { method, body: payload, headers: { cookie, "x-forwarded-for": "127.0.0.1" } };
    const headers = {};
    const res = {
      setHeader(name, value) { headers[name.toLowerCase()] = value; },
      status(code) { this.code = code; return this; },
      json(data) { resolve({ code: this.code, data, headers }); },
    };
    Promise.resolve(target(req, res)).catch(reject);
  });
}
const call = (method, payload, cookie = "") => callWith(handler, method, payload, cookie);

(async () => {
  const created = await call("POST", { action: "register", id: "student01", pin: "2468", name: "민수" });
  assert.equal(created.code, 201);
  assert.equal(created.data.student.name, "민수");
  const cookie = created.headers["set-cookie"].split(";")[0];

  const saved = await call("POST", { action: "sync", data: {
    profile: { name: "민수", grade: "2", className: "3", track: "calc1" },
    records: [{ date: "2026-09-21", grade: "2", track: "calc1", correct: 4, total: 5, finishedAt: "2026-09-21T01:00:00Z" }],
    notes: [{ id: "q1", prompt: "문제", mastered: false, lastWrongAt: "2026-09-21T01:00:00Z", solutionImage: "data:image/png;base64,private" }],
    stats: { derivative: { attempts: 2, correct: 1, wrong: 1, lastAt: "2026-09-21T01:00:00Z" } },
  } }, cookie);
  assert.equal(saved.code, 200);
  assert.equal(saved.data.data.notes[0].solutionImage, undefined);

  const secondDevice = await call("POST", { action: "login", id: "student01", pin: "2468" });
  assert.equal(secondDevice.code, 200);
  assert.equal(secondDevice.data.data.records[0].correct, 4);
  const cookie2 = secondDevice.headers["set-cookie"].split(";")[0];

  const merged = await call("POST", { action: "sync", data: {
    records: [{ date: "2026-09-22", grade: "2", track: "calc1", correct: 5, total: 5, finishedAt: "2026-09-22T01:00:00Z" }],
    notes: [{ id: "q1", prompt: "문제", mastered: true, masteredAt: "2026-09-22T01:00:00Z" }],
    stats: { derivative: { attempts: 3, correct: 2, wrong: 1, lastAt: "2026-09-22T01:00:00Z" } },
  } }, cookie2);
  assert.equal(merged.data.data.records.length, 2);
  assert.equal(merged.data.data.notes[0].mastered, true);
  assert.equal(merged.data.data.stats.derivative.attempts, 3);

  const teacher = await callWith(adminHandler, "POST", { password: "teacher-test-password" });
  assert.equal(teacher.code, 200);
  assert.equal(teacher.data.summary.total, 1);
  assert.equal(teacher.data.students[0].id, "student01");
  assert.equal(teacher.data.students[0].activeWrong, 0);
  assert.equal(teacher.data.students[0].weakest.name, "기타");
  assert.equal(teacher.data.students[0].className, "3");
  assert.equal(teacher.data.classes[0].key, "2-3");
  assert.equal(teacher.data.classes[0].average, 90);

  const blocked = await callWith(adminHandler, "POST", { password: "wrong" });
  assert.equal(blocked.code, 401);

  const logout = await call("POST", { action: "logout" }, cookie2);
  assert.equal(logout.code, 200);
  const after = await call("GET", null, cookie2);
  assert.equal(after.data.signedIn, false);
  console.log("학생 계정 검사 통과: 생성, PIN 로그인, 기기 간 병합, 교사용 현황, 암호 보호, 로그아웃");
})().catch(error => { console.error(error); process.exit(1); });
