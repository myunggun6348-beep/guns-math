/* =========================================================
   선생님 쪽 창구입니다. 손댈 일 없습니다.

   답을 달거나 질문을 지울 때 페이지가 여기로 옵니다. 아무나 못 하도록
   암호를 함께 보내야 하고, 그 암호는 Vercel에 넣어 둔 ADMIN_PASSWORD 와
   맞아야 합니다. 암호는 이 파일이 아니라 Vercel 쪽에 있으니, 이 코드가
   GitHub에 공개돼도 암호는 새어 나가지 않습니다.
   ========================================================= */
const crypto = require("crypto");
const { 준비됨, 명령 } = require("./_redis");

const 열쇠이름 = "qna";
const 답변최대 = 2000;

// 글자를 하나씩 비교하면 '몇 글자까지 맞았는지'가 걸린 시간으로 새어 나갑니다.
// timingSafeEqual 은 어디서 틀렸든 늘 같은 시간이 걸리게 비교해 줍니다.
function 암호맞나(보낸것) {
  const 진짜 = process.env.ADMIN_PASSWORD || "";
  if (!진짜) return false;
  const a = Buffer.from(String(보낸것 || ""));
  const b = Buffer.from(진짜);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ 오류: "지원하지 않는 방식입니다." });
  }
  if (!준비됨) {
    return res.status(503).json({ 오류: "질문 저장소가 아직 준비되지 않았습니다." });
  }

  const 받은 = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

  if (!암호맞나(받은.암호)) {
    return res.status(401).json({ 오류: "암호가 맞지 않습니다." });
  }

  // 암호만 확인하는 용도 — 로그인 단추가 이걸 씁니다. 질문을 고른 게 아니라서
  // id 를 따지기 전에 먼저 답해 줍니다.
  if (받은.작업 === "확인") return res.status(200).json({ 좋음: true });

  const id = String(받은.id || "");
  if (!id) return res.status(400).json({ 오류: "어느 질문인지 알 수 없습니다." });

  try {
    if (받은.작업 === "삭제") {
      await 명령("HDEL", 열쇠이름, id);
      return res.status(200).json({ 좋음: true });
    }

    if (받은.작업 === "답변") {
      const 원본 = await 명령("HGET", 열쇠이름, id);
      if (!원본) return res.status(404).json({ 오류: "그 질문이 없습니다." });
      const 항목 = JSON.parse(원본);
      항목.a = String(받은.답변 || "").trim().slice(0, 답변최대);
      await 명령("HSET", 열쇠이름, id, JSON.stringify(항목));
      return res.status(200).json({ id, ...항목 });
    }

    return res.status(400).json({ 오류: "무슨 작업인지 알 수 없습니다." });
  } catch (err) {
    return res.status(500).json({ 오류: "저장소에 문제가 생겼습니다." });
  }
};
