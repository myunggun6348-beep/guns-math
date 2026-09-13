const crypto = require("crypto");
const { 준비됨, 명령 } = require("./_redis");
const { courses, questions, visible, correct } = require("./_math_questions");

const fifteenMinutes = 15 * 60 * 1000;
const runDays = 35 * 24 * 60 * 60;
const maxDrawingBytes = 700000;

function passwordMatches(value) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const a = Buffer.from(String(value || "")), b = Buffer.from(expected);
  return Boolean(expected) && a.length === b.length && crypto.timingSafeEqual(a, b);
}
function json(value) { try { return JSON.parse(value); } catch { return null; } }
function clientKey(req) { return String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim(); }
async function limited(req, kind, maximum) {
  const key = `escape:limit:${kind}:${clientKey(req)}`;
  const count = await 명령("INCR", key);
  if (count === 1) await 명령("EXPIRE", key, 3600);
  return count > maximum;
}
async function loadRun(id) { return json(await 명령("GET", `escape:run:${id}`)); }
async function saveRun(run) { await 명령("SET", `escape:run:${run.id}`, JSON.stringify(run), "EX", runDays); }
function stateView(run) {
  const done = run.done || Date.now() >= run.started + fifteenMinutes;
  const all = questions(run.course, run.difficulty, run.seed);
  return { id: run.id, room: run.room, student: run.student, course: run.course, difficulty: run.difficulty, started: run.started,
    deadline: run.started + fifteenMinutes, score: run.score, stage: run.stage, solved: run.solved, hints: run.hints, done, escaped: run.escaped,
    questions: all.map(q => visible(q, run.solved.includes(q.id), done, run.hints.includes(q.id))) };
}
function checkPlayer(run, body) { return run && run.playerKey === String(body.playerKey || ""); }
function drawing(value) {
  if (!Array.isArray(value) || !value.length || value.length > 1000) throw new Error("풀이를 작성한 뒤 제출하세요.");
  let points = 0;
  return value.map(stroke => {
    if (!stroke || !Array.isArray(stroke.points) || !stroke.points.length || typeof stroke.erase !== "boolean" || !["#19364a", "#195aca", "#c02d35"].includes(stroke.color) || ![3, 5, 8, 32].includes(stroke.width)) throw new Error("필기 형식을 확인하세요.");
    points += stroke.points.length;
    if (points > 15000) throw new Error("필기가 너무 많습니다. 필요한 풀이만 남겨 주세요.");
    return { color: stroke.color, width: stroke.width, erase: stroke.erase, points: stroke.points.map(p => {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1000 || p.y < 0 || p.y > 650) throw new Error("필기 좌표를 확인하세요.");
      return { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 };
    }) };
  });
}
async function roomRecords(code) {
  const ids = (await 명령("SMEMBERS", `escape:room-runs:${code}`)) || [];
  const records = [];
  for (const id of ids.slice(0, 200)) { const run = await loadRun(id); if (run) records.push(stateView(run)); }
  return records.sort((a, b) => a.student.localeCompare(b.student, "ko"));
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!준비됨) return res.status(503).json({ error: "게임 저장소가 준비되지 않았습니다." });
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "지원하지 않는 방식입니다." }); }
  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
  catch { return res.status(400).json({ error: "요청 형식을 확인하세요." }); }
  if (Buffer.byteLength(JSON.stringify(body)) > maxDrawingBytes) return res.status(413).json({ error: "필기가 너무 많습니다. 필요한 풀이만 남겨 주세요." });
  try {
    if (body.action === "createRoom") {
      if (!passwordMatches(body.password)) return res.status(401).json({ error: "관리자 암호가 맞지 않습니다." });
      if (!courses.includes(body.course)) return res.status(400).json({ error: "출제 과목을 확인하세요." });
      const difficulty = ["basic", "standard", "advanced"].includes(body.difficulty) ? body.difficulty : "standard";
      let code; do { code = crypto.randomBytes(4).toString("hex").toUpperCase(); } while (await 명령("EXISTS", `escape:room:${code}`));
      const room = { code, course: body.course, difficulty, created: Date.now() };
      await 명령("SET", `escape:room:${code}`, JSON.stringify(room), "EX", runDays);
      await 명령("ZADD", "escape:rooms", room.created, code);
      return res.status(200).json({ room });
    }
    if (body.action === "start") {
      if (await limited(req, "start", 30)) return res.status(429).json({ error: "게임을 너무 자주 시작했습니다. 잠시 뒤 다시 시도해 주세요." });
      const playerKey = String(body.playerKey || "");
      if (!/^[a-zA-Z0-9-]{20,80}$/.test(playerKey)) return res.status(400).json({ error: "기기 정보를 다시 확인하세요." });
      const student = String(body.student || "").trim().slice(0, 20);
      if (!student) return res.status(400).json({ error: "학생 번호나 이름을 입력하세요." });
      let room = null, course = body.course, difficulty = body.difficulty;
      if (body.code) { room = json(await 명령("GET", `escape:room:${String(body.code).trim().toUpperCase()}`)); if (!room) return res.status(404).json({ error: "참여 코드를 확인하세요." }); course = room.course; difficulty = room.difficulty; }
      if (!courses.includes(course)) return res.status(400).json({ error: "출제 과목을 확인하세요." });
      if (!["basic", "standard", "advanced"].includes(difficulty)) difficulty = "standard";
      if (room) {
        const previousId = await 명령("GET", `escape:player-room:${playerKey}:${room.code}`);
        const previous = previousId ? await loadRun(previousId) : null;
        if (previous) return res.status(200).json({ run: stateView(previous) });
      }
      const run = { id: crypto.randomUUID(), playerKey, room: room?.code || null, student, course, difficulty, seed: Number(room?.created || Date.now()) % 3,
        started: Date.now(), score: 0, stage: 0, solved: [], hints: [], attempts: {}, done: false, escaped: false, version: 1 };
      await saveRun(run);
      if (room) { await 명령("SADD", `escape:room-runs:${room.code}`, run.id); await 명령("EXPIRE", `escape:room-runs:${room.code}`, runDays); await 명령("SET", `escape:player-room:${playerKey}:${room.code}`, run.id, "EX", runDays); }
      return res.status(200).json({ run: stateView(run) });
    }
    if (body.action === "resume") {
      const run = await loadRun(String(body.id || ""));
      if (!checkPlayer(run, body)) return res.status(404).json({ error: "진행 기록을 찾지 못했습니다." });
      return res.status(200).json({ run: stateView(run) });
    }
    if (["answer", "hint", "next", "finish"].includes(body.action)) {
      const run = await loadRun(String(body.id || ""));
      if (!checkPlayer(run, body)) return res.status(403).json({ error: "본인의 게임만 진행할 수 있습니다." });
      const timedOut = Date.now() >= run.started + fifteenMinutes;
      let feedback = "";
      if (timedOut || body.action === "finish") { run.done = true; feedback = timedOut ? "15분이 종료되었습니다." : "탐험을 종료했습니다."; }
      else if (!run.done && ["answer", "hint"].includes(body.action)) {
        const id = Number(body.question), all = questions(run.course, run.difficulty, run.seed), q = all[id];
        if (!q || Math.floor(id / 2) !== run.stage) return res.status(403).json({ error: "현재 방의 문제를 선택하세요." });
        if (id % 2 && !run.solved.includes(id - 1)) return res.status(403).json({ error: "필수 문제를 먼저 해결하세요." });
        if (body.action === "hint") { if (!run.hints.includes(id)) run.hints.push(id); feedback = "힌트를 열었습니다."; }
        else if (!run.solved.includes(id)) {
          const result = correct(q, body.answer); if (result === null) return res.status(400).json({ error: "정수, 소수 또는 분수로 입력하세요." });
          run.attempts[id] = (run.attempts[id] || 0) + 1;
          if (result) { run.solved.push(id); const points = q.points + (run.attempts[id] === 1 && !run.hints.includes(id) ? 25 : 0); run.score += points; feedback = `정답! +${points}점`; }
          else feedback = "아직 정답이 아닙니다. 감점 없이 다시 도전하세요.";
        }
      } else if (!run.done && body.action === "next") {
        if (!run.solved.includes(run.stage * 2)) return res.status(403).json({ error: "필수 문제를 먼저 해결하세요." });
        if (run.stage === 2) { run.done = true; run.escaped = true; } else run.stage += 1;
      }
      run.version += 1; await saveRun(run); return res.status(200).json({ run: stateView(run), feedback });
    }
    if (body.action === "submitInk") {
      if (await limited(req, "ink", 120)) return res.status(429).json({ error: "풀이를 너무 자주 제출했습니다." });
      const run = await loadRun(String(body.id || "")); if (!checkPlayer(run, body) || !run.room) return res.status(403).json({ error: "수업방에 참여한 본인의 풀이만 제출할 수 있습니다." });
      const question = Number(body.question); if (!Number.isInteger(question) || question < 0 || question > 5 || Math.floor(question / 2) > run.stage || (question % 2 && !run.solved.includes(question - 1))) return res.status(403).json({ error: "열린 문제의 풀이만 제출할 수 있습니다." });
      const key = `escape:ink:${run.id}:${question}`, old = json(await 명령("GET", key));
      if (Number(body.revision || 0) !== Number(old?.revision || 0)) return res.status(409).json({ error: "다른 창에서 제출본이 변경되었습니다. 새로고침해 주세요." });
      const item = { question, drawing: drawing(body.drawing), submitted: Date.now(), afterDeadline: run.done || Date.now() >= run.started + fifteenMinutes, revision: Number(old?.revision || 0) + 1 };
      await 명령("SET", key, JSON.stringify(item), "EX", runDays); return res.status(200).json({ submission: item });
    }
    if (body.action === "getInk") {
      const run = await loadRun(String(body.id || ""));
      const teacher = passwordMatches(body.password), student = checkPlayer(run, body);
      if (!run || (!teacher && !student)) return res.status(403).json({ error: "풀이를 볼 권한이 없습니다." });
      const ids = Number.isInteger(body.question) ? [body.question] : [0, 1, 2, 3, 4, 5], submissions = [];
      for (const id of ids) { const item = json(await 명령("GET", `escape:ink:${run.id}:${id}`)); if (item) submissions.push(item); }
      return res.status(200).json({ submissions });
    }
    if (body.action === "teacherRooms") {
      if (!passwordMatches(body.password)) return res.status(401).json({ error: "관리자 암호가 맞지 않습니다." });
      const codes = (await 명령("ZREVRANGE", "escape:rooms", 0, 49)) || [], rooms = [];
      for (const code of codes) { const room = json(await 명령("GET", `escape:room:${code}`)); if (room) rooms.push(room); }
      const selected = String(body.code || "").toUpperCase(); return res.status(200).json({ rooms, records: selected ? await roomRecords(selected) : [] });
    }
    return res.status(400).json({ error: "요청한 작업을 확인하세요." });
  } catch (error) {
    console.error("math escape", error);
    return res.status(500).json({ error: error.message || "게임 저장소에 문제가 생겼습니다." });
  }
};
