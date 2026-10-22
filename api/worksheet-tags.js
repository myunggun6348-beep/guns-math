/* =========================================================
   기출 분류 고치기 — 기출 문제지 페이지에서 쓰는 창구입니다.

   문항마다 붙인 단원·유형은 assets/exam-questions.json 에 들어 있고,
   선생님이 '분류 고치기' 로 바꾼 것만 여기(저장소)에 따로 적어 둡니다.
   페이지는 둘을 겹쳐서 보여 줍니다 — 고친 것이 이깁니다.

   GET               고친 목록 { 문항id: {c,u,t} }  (누구나 읽음: 단원 이름뿐)
   POST {password, check:true}            암호만 확인
   POST {password, id, c, u, t}           고치기
   POST {password, id, reset:true}        원래 분류로 되돌리기
   ========================================================= */
const { 준비됨, 명령 } = require("./_redis");
const { passwordMatches } = require("./_admin-auth");

const 열쇠이름 = "기출분류";
const 문항id = /^ebsi-[123]-\d{8}\|[^|]{1,12}\|\d{1,2}$/;
const 글 = v => typeof v === "string" && v.trim().length > 0 && v.length <= 40;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!준비됨) return res.status(503).json({ 오류: "저장소가 아직 준비되지 않았습니다." });
  try {
    if (req.method === "GET") {
      const 납작한 = (await 명령("HGETALL", 열쇠이름)) || [], 목록 = {};
      for (let i = 0; i < 납작한.length; i += 2) { try { 목록[납작한[i]] = JSON.parse(납작한[i + 1]); } catch { /* 깨진 줄은 건너뜀 */ } }
      return res.status(200).json(목록);
    }
    if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ 오류: "지원하지 않는 방식입니다." }); }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (!(await passwordMatches(body.password))) return res.status(401).json({ 오류: "암호가 맞지 않습니다." });
    if (body.check) return res.status(200).json({ 확인: true });
    if (!문항id.test(String(body.id || ""))) return res.status(400).json({ 오류: "문항을 알 수 없습니다." });
    if (body.reset) { await 명령("HDEL", 열쇠이름, body.id); return res.status(200).json({ 되돌림: true }); }
    if (![body.c, body.u, body.t].every(글)) return res.status(400).json({ 오류: "과목·단원·유형을 모두 넣어 주세요(40자 이내)." });
    const 값 = { c: body.c.trim(), u: body.u.trim(), t: body.t.trim() };
    await 명령("HSET", 열쇠이름, body.id, JSON.stringify(값));
    return res.status(200).json(값);
  } catch {
    return res.status(500).json({ 오류: "저장소에 문제가 생겼습니다." });
  }
};
