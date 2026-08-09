/* =========================================================
   학생 쪽 창구입니다. 손댈 일 없습니다.

   - 목록 보기 : 페이지가 열릴 때 여기서 질문과 답을 받아 갑니다
   - 질문 남기기 : 학생이 폼을 내면 여기로 와서 저장됩니다 (바로 공개됩니다)

   누구나 쓸 수 있는 창구라 아래 두 가지를 막아 둡니다.
   - 너무 긴 글 : 질문 1000자, 학년 20자까지
   - 도배 : 같은 사람이 한 시간에 5개까지
   ========================================================= */
const { 준비됨, 명령 } = require("./_redis");

const 열쇠이름 = "qna";
const 설정열쇠 = "설정";
const 질문최대 = 1000;
const 학년최대 = 20;
const 시간당한도 = 5;

// 처음 한 번만 — 화면이 텅 비어 있지 않도록 예시 두 개를 넣어 둡니다.
// 선생님이 지우면 다시 생기지 않습니다.
const 예시 = [
  { t: "2026-08-05", g: "고2",
    q: "오답노트를 어떻게 정리해야 할지 모르겠어요. 문제를 그대로 옮겨 적기만 하고 있어요.",
    a: "문제를 베끼지 말고, '왜 틀렸는지' 한 줄만 적으세요. 계산 실수인지, 개념을 몰랐는지, 문제를 잘못 읽었는지에 따라 다음에 조심할 게 다릅니다. 그 한 줄이 시험 전에 다시 볼 때 진짜 도움이 됩니다." },
  { t: "2026-07-28", g: "고3",
    q: "인강이랑 학교 수업 중에 뭘 더 우선해야 하나요?",
    a: "학교 진도를 먼저 따라가세요. 인강은 학교에서 놓친 부분을 메우는 용도로 쓰는 게 낫습니다. 둘을 동시에 처음부터 끝까지 들으려 하면 어느 쪽도 제대로 안 남습니다." },
];

async function 예시넣기() {
  // SETNX 는 '아직 없을 때만 적기'라서, 여러 명이 동시에 들어와도 딱 한 번만 돕니다
  const 처음인가 = await 명령("SETNX", `${열쇠이름}:예시넣음`, "1");
  if (처음인가 !== 1) return;
  for (const it of 예시) {
    await 명령("HSET", 열쇠이름, String(new Date(it.t).getTime()), JSON.stringify(it));
  }
}

async function 도배인가(req) {
  const 아이피 = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "알수없음";
  const 열쇠 = `한도:${아이피}`;
  const 횟수 = await 명령("INCR", 열쇠);
  if (횟수 === 1) await 명령("EXPIRE", 열쇠, 3600); // 한 시간 뒤 저절로 사라집니다
  return 횟수 > 시간당한도;
}

module.exports = async (req, res) => {
  if (!준비됨) {
    return res.status(503).json({ 오류: "질문 저장소가 아직 준비되지 않았습니다." });
  }

  try {
    if (req.method === "GET") {
      await 예시넣기();
      // HGETALL 은 [이름, 내용, 이름, 내용 …] 이렇게 한 줄로 옵니다
      const 납작한 = (await 명령("HGETALL", 열쇠이름)) || [];
      const 목록 = [];
      for (let i = 0; i < 납작한.length; i += 2) {
        try {
          목록.push({ id: 납작한[i], ...JSON.parse(납작한[i + 1]) });
        } catch { /* 읽을 수 없는 줄은 건너뜁니다 */ }
      }
      목록.sort((a, b) => Number(b.id) - Number(a.id)); // 최신 것이 위로
      res.setHeader("Cache-Control", "no-store");
      // h 가 붙은 것은 '선생님 확인 대기 중'이라 학생에게는 보이지 않습니다
      return res.status(200).json(목록.filter(it => !it.h));
    }

    if (req.method === "POST") {
      const 받은 = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const 질문 = String(받은.질문 || "").trim();
      const 학년 = String(받은.학년 || "").trim();

      if (!질문) return res.status(400).json({ 오류: "질문 내용이 비어 있습니다." });
      if (질문.length > 질문최대) return res.status(400).json({ 오류: "질문이 너무 깁니다." });

      if (await 도배인가(req)) {
        return res.status(429).json({ 오류: "질문을 너무 자주 남겼습니다. 잠시 뒤에 다시 시도해 주세요." });
      }

      await 예시넣기();
      // 선생님이 '확인 후 공개' 스위치를 켜 뒀으면 h 를 붙여 두고, 선생님이
      // 선생님 방에서 공개를 눌러야 학생들에게 보입니다.
      const 검토중 = (await 명령("HGET", 설정열쇠, "검토")) === "1";
      const id = String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
      const 항목 = {
        t: new Date().toISOString().slice(0, 10),
        g: 학년.slice(0, 학년최대),
        q: 질문,
        a: "",
      };
      if (검토중) 항목.h = 1;
      await 명령("HSET", 열쇠이름, id, JSON.stringify(항목));
      return res.status(200).json({ id, ...항목 });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ 오류: "지원하지 않는 방식입니다." });
  } catch (err) {
    return res.status(500).json({ 오류: "저장소에 문제가 생겼습니다." });
  }
};
