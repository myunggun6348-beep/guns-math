const assert = require("assert");
const path = require("path");

const math = require("../api/_math_questions");
for (const course of math.courses) {
  for (const difficulty of ["basic", "standard", "advanced"]) {
    for (let seed = 0; seed < 4; seed++) {
      const first = math.questions(course, difficulty, seed);
      const second = math.questions(course, difficulty, seed);
      assert.deepStrictEqual(first, second, "같은 설정의 문항은 같아야 함");
      assert.strictEqual(first.length, 6);
      assert.strictEqual(first.filter(q => q.format === "choice").length, 3);
      assert.strictEqual(first.filter(q => q.format === "short").length, 3);
      first.forEach(q => {
        const hidden = math.visible(q);
        assert.strictEqual(hidden.answer, undefined);
        assert.strictEqual(hidden.correctChoice, undefined);
        assert.strictEqual(math.correct(q, q.format === "choice" ? q.correctChoice : String(q.answer)), true);
        if (q.format === "choice") assert.strictEqual(new Set(q.choices.map(x => x.label)).size, 5);
      });
      if (course === "수학 종합") assert.strictEqual(new Set(first.map(q => q.subject)).size, 6);
    }
  }
}

const memory = new Map(), sets = new Map(), sorted = new Map();
async function redis(command, ...args) {
  switch (command) {
    case "GET": return memory.get(args[0]) ?? null;
    case "SET": memory.set(args[0], args[1]); return "OK";
    case "EXISTS": return memory.has(args[0]) ? 1 : 0;
    case "INCR": { const n = Number(memory.get(args[0]) || 0) + 1; memory.set(args[0], n); return n; }
    case "EXPIRE": return 1;
    case "SADD": { const s = sets.get(args[0]) || new Set(); s.add(args[1]); sets.set(args[0], s); return 1; }
    case "SMEMBERS": return [...(sets.get(args[0]) || [])];
    case "ZADD": { const z = sorted.get(args[0]) || []; z.push({ score:Number(args[1]), value:args[2] }); sorted.set(args[0], z); return 1; }
    case "ZREVRANGE": return (sorted.get(args[0]) || []).sort((a,b) => b.score-a.score).slice(Number(args[1]), Number(args[2])+1).map(x => x.value);
    default: throw new Error(`mock Redis command: ${command}`);
  }
}
const redisPath = require.resolve("../api/_redis");
require.cache[redisPath] = { id:redisPath, filename:redisPath, loaded:true, exports:{ 준비됨:true, 명령:redis } };
process.env.ADMIN_PASSWORD = "test-password";
const handler = require("../api/math-escape");
function invoke(body) {
  return new Promise((resolve, reject) => {
    const req = { method:"POST", body, headers:{ "x-forwarded-for":"127.0.0.1" } };
    const res = { code:200, headers:{}, setHeader(k,v){ this.headers[k]=v; }, status(code){ this.code=code; return this; }, json(value){ resolve({ status:this.code, body:value }); } };
    Promise.resolve(handler(req,res)).catch(reject);
  });
}
(async () => {
  const created = await invoke({ action:"createRoom", password:"test-password", course:"수학 종합", difficulty:"standard" });
  assert.strictEqual(created.status, 200); assert.match(created.body.room.code, /^[A-F0-9]{8}$/);
  const playerKey = "12345678-1234-1234-1234-123456789012";
  const started = await invoke({ action:"start", playerKey, student:"2107 김수학", code:created.body.room.code });
  assert.strictEqual(started.status, 200); const run = started.body.run;
  assert.strictEqual(run.questions[0].answer, undefined);
  const full = math.questions(run.course, run.difficulty, Number(created.body.room.created) % 3)[0];
  const answered = await invoke({ action:"answer", id:run.id, playerKey, question:0, answer:String(full.answer) });
  assert(answered.body.run.solved.includes(0));
  const ink = [{ color:"#19364a", width:5, erase:false, points:[{x:10,y:10},{x:20,y:20}] }];
  const submitted = await invoke({ action:"submitInk", id:run.id, playerKey, question:0, drawing:ink, revision:0 });
  assert.strictEqual(submitted.body.submission.revision, 1);
  const rooms = await invoke({ action:"teacherRooms", password:"test-password", code:created.body.room.code });
  assert.strictEqual(rooms.body.records[0].student, "2107 김수학");
  const review = await invoke({ action:"getInk", id:run.id, password:"test-password" });
  assert.strictEqual(review.body.submissions.length, 1);
  console.log("수학 탈출 검사 통과: 문항 조합, 채점, 방 생성, 학생 기록, 태블릿 풀이 제출");
})().catch(error => { console.error(error); process.exitCode = 1; });
