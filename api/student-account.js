const crypto = require("crypto");
const { 준비됨, 명령 } = require("./_redis");
const {safeState,merge}=require("../assets/study-state");
const {새PIN문제,digest}=require("./_student-auth");

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

function accountKey(id) { return `student:account:${id}`; }
function dataKey(id) { return `student:data:${id}`; }
function sessionKey(token) { return `student:session:${token}`; }
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
  const raw=await 명령("GET",sessionKey(token));if(!raw)return null;
  const saved=String(raw).startsWith("{")?JSON.parse(raw):{id:raw,version:""};
  const id=saved.id;if(!validId(id))return null;
  const accountRaw=await 명령("GET",accountKey(id));if(!accountRaw)return null;
  const account=JSON.parse(accountRaw);
  if((saved.version||"")!==(account.authVersion||""))return null;
  await 명령("EXPIRE", sessionKey(token), SESSION_DAYS * 86400);
  return { id, token };
}
async function openSession(res, id, version="") {
  const token = crypto.randomBytes(32).toString("hex");
  await 명령("SET", sessionKey(token), JSON.stringify({id,version}), "EX", SESSION_DAYS * 86400);
  setCookie(res, token, SESSION_DAYS * 86400);
}
// 다른 기기가 먼저 저장했으면 최신 기록을 다시 읽어 합친다.
const COMPARE_AND_SET="local old=redis.call('GET',KEYS[1]); if (old or '')~=ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1";

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
      await openSession(res, id, account.authVersion||"");
      const rawData = await 명령("GET", dataKey(id));
      return res.status(200).json({ signedIn: true, student: { id, name: account.name || "" }, data: rawData ? JSON.parse(rawData) : {} });
    }
    if (action === "sync") {
      if (!session) return res.status(401).json({ error: "다시 로그인해 주세요." });
      if(input.studentId!==session.id)return res.status(409).json({error:"다른 창에서 계정이 바뀌었거나 이전 화면을 사용 중입니다. 새로고침 후 다시 맞춰 주세요."});
      const incoming=safeState(input.data);
      const raw = JSON.stringify(incoming);
      if (Buffer.byteLength(raw) > MAX_BODY) return res.status(413).json({ error: "동기화할 학습 기록이 너무 큽니다." });
      for(let retry=0;retry<5;retry++){
        const remoteRaw=await 명령("GET",dataKey(session.id));
        const merged={...merge(incoming,remoteRaw?JSON.parse(remoteRaw):{}),updatedAt:new Date().toISOString()};
        const serialized=JSON.stringify(merged);
        if(Buffer.byteLength(serialized)>MAX_BODY)return res.status(413).json({error:"계정의 학습 기록 용량이 가득 찼습니다. 기기의 기록은 그대로 보관됩니다."});
        if(await 명령("EVAL",COMPARE_AND_SET,1,dataKey(session.id),remoteRaw||"",serialized))return res.status(200).json({ok:true,data:merged});
      }
      return res.status(503).json({error:"다른 기기에서 기록을 저장하고 있습니다. 잠시 뒤 다시 맞춰 주세요."});
    }
    return res.status(400).json({ error: "요청을 확인해 주세요." });
  } catch (error) {
    console.error("student account error", error);
    return res.status(500).json({ error: "학생 계정 처리 중 문제가 생겼습니다." });
  }
};
