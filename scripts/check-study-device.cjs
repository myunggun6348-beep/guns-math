const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const ownerKey = "math-student-data-owner";
const profileKey = "math-home-profile-v1";
const notesKey = "math-wrong-notes-v1";
const draftKey = "math-study-draft-v1:student-old123:daily-1-common1";
const guestKey = "math-student-guest-data-v1";
const backupKey = "math-student-backup:old123";
const oldNotes = [{ id: "old", nextReviewAt: "2026-11-18", solutionImage: "data:image/png;base64,AA==" }];
const guest = { profile: { grade: "3" }, notes: [{ id: "guest" }] };
const legacy = {
  [ownerKey]: "old123",
  [profileKey]: JSON.stringify({ grade: "1", name: "이전 이름" }),
  [notesKey]: JSON.stringify(oldNotes),
  [draftKey]: "saved handwriting",
  [guestKey]: JSON.stringify(guest)
};
const code = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

async function client(seed, { owner = null, offline = false, failKey } = {}) {
  const values = new Map(Object.entries(seed));
  const calls = [];
  const context = {
    addEventListener() {},
    navigator: {},
    localStorage: {
      getItem: key => values.get(key) ?? null,
      removeItem: key => values.delete(key),
      setItem(key, value) {
        if (key === failKey) { failKey = undefined; throw new Error("quota"); }
        values.set(key, value);
      }
    },
    async fetch(url, options) {
      calls.push(url);
      assert.equal(options.credentials, "same-origin");
      assert.equal(options.body, undefined);
      return { ok: !offline, json: async () => ({ owner }) };
    }
  };
  context.window = context;
  vm.runInNewContext(code("assets/study-device.js"), context);
  await context.StudyDevice.ready;
  return { values, calls, device: context.StudyDevice };
}

async function clientChecks() {
  const fresh = await client({ [notesKey]: JSON.stringify(guest.notes) });
  assert.deepEqual(fresh.calls, []);
  assert.equal(fresh.device.draftOwner(), "guest");
  assert.equal(fresh.values.get(notesKey), JSON.stringify(guest.notes));

  const active = await client(legacy, { owner: "old123" });
  assert.equal(active.device.canUseLocal(), true);
  assert.equal(active.device.draftOwner(), "student-old123");
  assert.deepEqual(active.calls, ["/api/student-account?migration=1"]);
  assert.equal(active.values.get(notesKey), JSON.stringify(oldNotes));
  assert.equal(active.values.get(draftKey), legacy[draftKey]);
  assert.equal(active.values.get(guestKey), legacy[guestKey]);
  assert.equal(active.values.has(ownerKey), false);
  const reopened = await client(Object.fromEntries(active.values));
  assert.equal(reopened.device.draftOwner(), "student-old123");
  assert.deepEqual(reopened.calls, []);

  for (const owner of [null, "other123"]) {
    const expired = await client(legacy, { owner });
    assert.equal(expired.device.canUseLocal(), true);
    assert.equal(expired.device.draftOwner(), "guest");
    assert.equal(expired.values.get(profileKey), JSON.stringify(guest.profile));
    assert.equal(expired.values.get(notesKey), JSON.stringify(guest.notes));
    assert.deepEqual(JSON.parse(expired.values.get(backupKey)).notes, oldNotes);
    assert.equal(expired.values.get(draftKey), legacy[draftKey]);
  }

  for (const options of [{ offline: true }, { failKey: notesKey }, { failKey: backupKey }]) {
    const failed = await client(legacy, options);
    assert.equal(failed.device.canUseLocal(), false);
    for (const [key, value] of Object.entries(legacy)) assert.equal(failed.values.get(key), value);
  }
}

async function apiChecks() {
  const token = "a".repeat(64);
  const calls = [];
  const values = new Map([
    ["student:session:" + token, JSON.stringify({ id: "old123", version: "v1" })],
    ["student:account:old123", JSON.stringify({ name: "보관 이름", authVersion: "v1", hash: "unused" })]
  ]);
  const module = { exports: {} };
  vm.runInNewContext(code("api/student-account.js"), {
    module, require() {
      return { 준비됨: true, 명령: async (command, key) => {
        assert.equal(command, "GET");
        calls.push(key);
        return values.get(key);
      } };
    }
  });
  async function request(method, migration, cookie) {
    const result = {};
    await module.exports({ method, query: { migration }, headers: { cookie } }, {
      setHeader(name, value) { assert.equal(name, "Cache-Control"); assert.equal(value, "no-store"); },
      status(code) { result.code = code; return this; },
      json(body) { result.body = JSON.parse(JSON.stringify(body)); }
    });
    return result;
  }
  assert.equal((await request("POST", "1", "math_student_session=" + token)).code, 410);
  assert.equal((await request("GET", null, "math_student_session=" + token)).code, 410);
  assert.deepEqual(await request("GET", "1", ""), { code: 200, body: { owner: null } });
  assert.deepEqual(calls, []);
  assert.deepEqual(await request("GET", "1", "math_student_session=" + token), { code: 200, body: { owner: "old123" } });
  values.set("student:account:old123", JSON.stringify({ authVersion: "v2" }));
  assert.deepEqual(await request("GET", "1", "math_student_session=" + token), { code: 200, body: { owner: null } });
  assert.ok(calls.every(key => /student:(session|account):/.test(key)));
}

(async () => {
  await clientChecks();
  await apiChecks();
  console.log("브라우저 기록 검사 통과: 신규 요청 없음, 기존 세션·필기 보존, 만료 시 저장 분리, 오류 복구, 학생 계정 API 종료");
})().catch(error => { console.error(error); process.exitCode = 1; });
