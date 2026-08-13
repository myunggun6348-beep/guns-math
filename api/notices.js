/* =========================================================
   공지 — 목록 보는 창구입니다. 손댈 일 없습니다.

   예전에는 공지가 index.html 안에 글로 박혀 있어서, 한 줄 올리려면
   코드를 열고 고쳐서 다시 올려야 했습니다. 그래서 실제로는 아무도
   공지를 안 올리게 됐습니다. 이제 선생님 방에서 쓰면 여기로 들어옵니다.

   쓰기·고치기·지우기는 api/admin.js 에 있습니다 (암호 필요).
   ========================================================= */
const { 준비됨, 명령 } = require("./_redis");

const 열쇠이름 = "notices";

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ 오류: "지원하지 않는 방식입니다." });
  }
  if (!준비됨) {
    return res.status(503).json({ 오류: "공지 저장소가 아직 준비되지 않았습니다." });
  }

  try {
    const 납작한 = (await 명령("HGETALL", 열쇠이름)) || [];
    const 목록 = [];
    for (let i = 0; i < 납작한.length; i += 2) {
      try {
        목록.push({ id: 납작한[i], ...JSON.parse(납작한[i + 1]) });
      } catch { /* 읽을 수 없는 줄은 건너뜁니다 */ }
    }
    목록.sort((a, b) => Number(b.id) - Number(a.id)); // 최신 것이 위로
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(목록);
  } catch (err) {
    return res.status(500).json({ 오류: "저장소에 문제가 생겼습니다." });
  }
};
