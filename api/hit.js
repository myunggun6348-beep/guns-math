/* =========================================================
   방문 세기 — 받는 창구입니다. 손댈 일 없습니다.

   assets/hit.js 가 "이 페이지가 열렸다"고 보내면 날짜별·페이지별로
   숫자만 하나 올립니다. 누가 열었는지(주소·기기)는 저장하지 않습니다.

   저장 모양:  views:2026-09-13  →  { "/index.html": 12, "/demos/quadratic.html": 3, … }
   날짜는 한국 시간 기준이고, 100일이 지나면 저절로 지워집니다.
   페이지를 한 번 열 때 저장소 명령이 보통 한 번만 쓰이도록 했습니다
   (무료 한도 안에서 넉넉하게 돌도록).
   ========================================================= */
const { 준비됨, 명령 } = require("./_redis");

const 보관일수 = 100;

/* 이 사이트에 실제로 있는 모양의 주소만 셉니다 (아무 글자나 보내 저장소를 채우지 못하게).
   페이지 이름을 하나하나 적어 두었더니, 새 페이지(오늘의 학습·게임·오답노트…)가
   생길 때마다 세는 줄은 붙어 있는데 여기서 조용히 버려졌습니다. 그래서 모양만 봅니다. */
const 셀주소 = /^\/[a-z0-9-]{1,40}\.html$|^\/demos\/[a-z0-9-]{1,60}\.html$/;
// 선생님만 쓰는 페이지는 학생 방문에 섞이지 않게 뺍니다
const 선생님것 = /^\/(?:admin|question-bank|review)\.html$/;

// 검색엔진·미리보기 로봇이 연 것은 학생 방문이 아니므로 뺍니다
// (다음 앱 안 브라우저는 'DaumApps' 라서 'daum' 으로 거르면 학생까지 빠집니다 — 로봇 이름 daumoa 만)
const 로봇 = /bot|crawl|spider|slurp|scrap|facebookexternalhit|yeti|daumoa|headless|lighthouse/i;

const 한국날짜 = (시각 = Date.now()) => new Date(시각 + 9 * 3600 * 1000).toISOString().slice(0, 10);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  // 세기는 '덤'이라, 무슨 일이 있어도 조용히 204 로 끝냅니다 (페이지는 기다리지 않음)
  try {
    if (!준비됨 || 로봇.test(String(req.headers["user-agent"] || ""))) return res.status(204).end();

    let 받은 = req.body;
    if (typeof 받은 === "string") { try { 받은 = JSON.parse(받은); } catch { 받은 = {}; } }
    if (Buffer.isBuffer(받은)) { try { 받은 = JSON.parse(받은.toString("utf8")); } catch { 받은 = {}; } }
    const 경로 = String((받은 && 받은.p) || "");
    if (!셀주소.test(경로) || 선생님것.test(경로)) return res.status(204).end();

    const 열쇠 = `views:${한국날짜()}`;
    const 지금수 = await 명령("HINCRBY", 열쇠, 경로, 1);
    // 그날 그 페이지가 처음 열렸을 때만 보관 기한을 걸어 둡니다 (명령 수를 아끼려고)
    if (Number(지금수) === 1) await 명령("EXPIRE", 열쇠, 보관일수 * 24 * 3600);
  } catch (err) {
    console.error("방문 세기 실패:", err && err.message);
  }
  return res.status(204).end();
};

module.exports.한국날짜 = 한국날짜;
