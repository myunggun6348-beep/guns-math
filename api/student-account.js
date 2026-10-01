const crypto = require("crypto");
const { 준비됨, 명령 } = require("./_redis");

const COOKIE = "math_student_session";
const SESSION_DAYS = 30;
const MAX_BODY = 700000;

function body(req) {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
}
function cleanId(value) { return String(value || "").trim().toLowerCase(); }
function cleanName(value) { return String(value || "").trim().slice(0, 20); }
function validId(value) { return /^[a-z0-9]{4,16}$/.test(value); }
/* 비밀번호는 둘로 나눠 봅니다.

   들어올 때(로그인)는 느슨하게 봅니다 — 규칙을 조이기 전에 만든 계정이
   4자리를 쓰고 있을 수 있는데, 그 학생을 자기 계정에서 쫓아내면 안 됩니다.
   새로 만들 때만 깐깐하게 봅니다. */
function 로그인용PIN(value) { return /^\d{4,12}$/.test(String(value || "")); }

/* 새 비밀번호: 숫자 6~12자리. 숫자 자판으로 치기 쉬우라고 숫자로 두되,
   네 자리는 1만 가지뿐이라 6자리로 올립니다(100만 가지).
   그리고 실제로 제일 많이 쓰이는 두 가지를 막습니다 —
   같은 숫자 반복(111111)과 이어지는 숫자(123456 · 987654). */
function 새PIN문제(value) {
  const v = String(value || "");
  if (!/^\d{6,12}$/.test(v)) return "비밀번호는 숫자 6~12자리로 만들어 주세요.";
  if (/^(\d)\1+$/.test(v)) return "같은 숫자만 쓰면 너무 쉽게 뚫립니다. 다르게 만들어 주세요.";
  const 차이 = [...v].slice(1).map((글, i) => Number(글) - Number(v[i]));
  if (차이.every(d => d === 1) || 차이.every(d => d === -1)) {
    return "1234 처럼 이어지는 숫자는 쓸 수 없습니다. 다르게 만들어 주세요.";
  }
  return "";
}
function accountKey(id) { return `student:account:${id}`; }
function dataKey(id) { return `student:data:${id}`; }
function sessionKey(token) { return `student:session:${token}`; }
function digest(pin, salt) { return crypto.scryptSync(String(pin), salt, 32).toString("hex"); }
function equal(a, b) {
  try { return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex")); } catch { return false; }
}
function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map(v => v.trim().split(/=(.*)/s)).filter(x => x[0]).map(([k, v]) => [k, decodeURIComponent(v || "")]));
}
function setCookie(res, token, seconds) {
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`);
}
async function rate(req, kind, limit, 누구) {
  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const key = `student:rate:${kind}:${누구 || ip}`;
  const count = await 명령("INCR", key);
  if (count === 1) await 명령("EXPIRE", key, 3600);
  return count > limit;
}
async function current(req) {
  const token = cookies(req)[COOKIE];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const id = await 명령("GET", sessionKey(token));
  if (!id) return null;
  await 명령("EXPIRE", sessionKey(token), SESSION_DAYS * 86400);
  return { id, token };
}
async function openSession(res, id) {
  const token = crypto.randomBytes(32).toString("hex");
  await 명령("SET", sessionKey(token), id, "EX", SESSION_DAYS * 86400);
  setCookie(res, token, SESSION_DAYS * 86400);
}
function safeState(value) {
  const source = value && typeof value === "object" ? value : {};
  const records = Array.isArray(source.records) ? source.records.slice(0, 120) : [];
  const notes = Array.isArray(source.notes) ? source.notes.slice(0, 200).map(({ solutionImage, feedbackImage, ...note }) => note) : [];
  const stats = source.stats && typeof source.stats === "object" && !Array.isArray(source.stats) ? source.stats : {};
  const profile = source.profile && typeof source.profile === "object" ? source.profile : null;
  const pref = source.pref && typeof source.pref === "object" ? source.pref : null;
  return { profile, pref, records, notes, stats, updatedAt: new Date().toISOString() };
}
function newer(a, b) {
  const stamp = x => String(x?.masteredAt || x?.lastWrongAt || x?.finishedAt || x?.createdAt || "");
  return stamp(b) > stamp(a) ? b : a;
}
function merge(local, remote) {
  const a = safeState(remote), b = safeState(local);
  const unique = (items, key) => [...items.reduce((map, item) => {
    const id = key(item); if (!id) return map;
    map.set(id, map.has(id) ? newer(map.get(id), item) : item); return map;
  }, new Map()).values()];
  const records = unique([...a.records, ...b.records], x => `${x.date}|${x.grade}|${x.track}`).sort((x, y) => String(y.finishedAt || y.date).localeCompare(String(x.finishedAt || x.date))).slice(0, 120);
  const notes = unique([...a.notes, ...b.notes], x => x.id).sort((x, y) => String(y.lastWrongAt || y.createdAt).localeCompare(String(x.lastWrongAt || x.createdAt))).slice(0, 200);
  const stats = { ...a.stats };
  Object.entries(b.stats).forEach(([key, row]) => {
    const old = stats[key];
    stats[key] = !old ? row : { ...old, ...row, attempts: Math.max(Number(old.attempts) || 0, Number(row.attempts) || 0), correct: Math.max(Number(old.correct) || 0, Number(row.correct) || 0), wrong: Math.max(Number(old.wrong) || 0, Number(row.wrong) || 0), lastAt: String(old.lastAt || "") > String(row.lastAt || "") ? old.lastAt : row.lastAt };
  });
  return { profile: b.profile || a.profile, pref: b.pref || a.pref, records, notes, stats, updatedAt: new Date().toISOString() };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!준비됨) return res.status(503).json({ error: "학생 계정 저장소를 준비하고 있습니다." });
  try {
    const session = await current(req);
    if (req.method === "GET") {
      if (!session) return res.status(200).json({ signedIn: false });
      const rawAccount = await 명령("GET", accountKey(session.id));
      const rawData = await 명령("GET", dataKey(session.id));
      const account = rawAccount ? JSON.parse(rawAccount) : {};
      return res.status(200).json({ signedIn: true, student: { id: session.id, name: account.name || "" }, data: rawData ? JSON.parse(rawData) : {} });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "지원하지 않는 방식입니다." });
    const input = body(req), action = String(input.action || "");
    if (action === "logout") {
      if (session) await 명령("DEL", sessionKey(session.token));
      setCookie(res, "", 0);
      return res.status(200).json({ ok: true });
    }
    if (action === "register") {
      /* 한 반이 수업 중에 한꺼번에 가입합니다. 학교는 아이피를 같이 쓰므로
         8명에서 막아 두면 뒷자리 학생들이 못 만듭니다. 40 으로 올립니다. */
      if (await rate(req, "register", 40)) return res.status(429).json({ error: "계정을 너무 자주 만들었습니다. 잠시 뒤 다시 시도해 주세요." });
      const id = cleanId(input.id), pin = String(input.pin || ""), name = cleanName(input.name);
      if (!validId(id)) return res.status(400).json({ error: "아이디는 영문 소문자와 숫자 4~16자로 만들어 주세요." });
      const 문제 = 새PIN문제(pin);
      if (문제) return res.status(400).json({ error: 문제 });
      if (await 명령("EXISTS", accountKey(id))) return res.status(409).json({ error: "이미 사용 중인 학생 코드입니다." });
      const salt = crypto.randomBytes(16).toString("hex");
      await 명령("SET", accountKey(id), JSON.stringify({ name, salt, hash: digest(pin, salt), createdAt: new Date().toISOString() }));
      await openSession(res, id);
      return res.status(201).json({ signedIn: true, student: { id, name }, data: {} });
    }
    if (action === "login") {
      /* 횟수 제한을 아이피로만 세면 한 반이 같이 로그인할 때 뒷자리 학생이
         막힙니다(학교는 아이피를 같이 씁니다). 그래서 둘로 나눕니다 —
         아이피는 넉넉히, 대신 '그 아이디로 틀린 횟수'를 깐깐하게 셉니다.
         비밀번호를 찍어 맞히려는 쪽을 막는 건 이쪽입니다. */
      if (await rate(req, "login", 300)) return res.status(429).json({ error: "로그인을 너무 자주 시도했습니다. 잠시 뒤 다시 시도해 주세요." });
      const id = cleanId(input.id), pin = String(input.pin || "");
      if (await rate(req, "login-id", 10, id)) {
        return res.status(429).json({ error: "비밀번호를 여러 번 틀렸습니다. 한 시간 뒤에 다시 해 주세요." });
      }
      const raw = validId(id) && 로그인용PIN(pin) ? await 명령("GET", accountKey(id)) : null;
      const account = raw ? JSON.parse(raw) : null;
      if (!account || !equal(digest(pin, account.salt), account.hash)) return res.status(401).json({ error: "아이디 또는 비밀번호를 확인해 주세요." });
      await 명령("DEL", `student:rate:login-id:${id}`);   // 들어왔으면 틀린 횟수는 지웁니다
      await openSession(res, id);
      const rawData = await 명령("GET", dataKey(id));
      return res.status(200).json({ signedIn: true, student: { id, name: account.name || "" }, data: rawData ? JSON.parse(rawData) : {} });
    }
    if (action === "sync") {
      if (!session) return res.status(401).json({ error: "다시 로그인해 주세요." });
      const raw = JSON.stringify(input.data || {});
      if (Buffer.byteLength(raw) > MAX_BODY) return res.status(413).json({ error: "동기화할 학습 기록이 너무 큽니다." });
      const remoteRaw = await 명령("GET", dataKey(session.id));
      const merged = merge(input.data, remoteRaw ? JSON.parse(remoteRaw) : {});
      await 명령("SET", dataKey(session.id), JSON.stringify(merged));
      return res.status(200).json({ ok: true, data: merged });
    }
    return res.status(400).json({ error: "요청을 확인해 주세요." });
  } catch (error) {
    console.error("student account error", error);
    return res.status(500).json({ error: "학생 계정 처리 중 문제가 생겼습니다." });
  }
};
