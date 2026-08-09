/* =========================================================
   자료실 — 선생님 창구입니다. 손댈 일 없습니다.

   질문 게시판의 api/admin.js 와 같은 방식으로 암호를 확인합니다
   (같은 ADMIN_PASSWORD). 파일 내용은 몸통(body)에 그대로 실어 보내고,
   제목·과목 같은 정보는 주소 끝(?title=...) 에 붙여 보냅니다 — 파일
   내용과 글자 정보를 같은 자리에 섞을 수 없어서입니다.

   올릴 수 있는 파일: pdf, hwp, hwpx / 4MB까지
   (Vercel 자체가 한 번에 보낼 수 있는 몸통 크기를 4.5MB로 막아 둬서,
   그보다 큰 파일은 애초에 여기까지 오지 못합니다)
   ========================================================= */
const crypto = require("crypto");
const { 준비됨: redis준비됨, 명령 } = require("./_redis");
const { 준비됨: blob준비됨, put, del } = require("./_blob");

const 열쇠이름 = "files";
const 최대바이트 = 4 * 1024 * 1024;
const 허용확장자 = {
  pdf: "application/pdf",
  hwp: "application/x-hwp",
  hwpx: "application/vnd.hancom.hwpx",
};

// 글자를 하나씩 비교하면 '몇 글자까지 맞았는지'가 걸린 시간으로 새어 나갑니다.
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
  if (!redis준비됨 || !blob준비됨) {
    return res.status(503).json({ 오류: "자료실 저장소가 아직 준비되지 않았습니다." });
  }

  const q = req.query || {};
  if (!암호맞나(q.암호)) {
    return res.status(401).json({ 오류: "암호가 맞지 않습니다." });
  }

  try {
    if (q.act === "delete") {
      const id = String(q.id || "");
      if (!id) return res.status(400).json({ 오류: "어느 파일인지 알 수 없습니다." });

      const 원본 = await 명령("HGET", 열쇠이름, id);
      if (원본) {
        try {
          const 항목 = JSON.parse(원본);
          if (항목.url) await del(항목.url);
        } catch { /* 파일 자체는 못 지워도 목록에서는 지웁니다 */ }
      }
      await 명령("HDEL", 열쇠이름, id);
      return res.status(200).json({ 좋음: true });
    }

    if (q.act === "edit") {
      const id = String(q.id || "");
      if (!id) return res.status(400).json({ 오류: "어느 파일인지 알 수 없습니다." });

      const 원본 = await 명령("HGET", 열쇠이름, id);
      if (!원본) return res.status(404).json({ 오류: "그 파일이 없습니다." });

      const 항목 = JSON.parse(원본);
      const 새제목 = String(q.title || "").trim().slice(0, 120);
      if (!새제목) return res.status(400).json({ 오류: "제목을 입력해 주세요." });
      항목.title = 새제목;
      항목.subject = String(q.subject || "").trim().slice(0, 30);
      항목.kind = String(q.kind || "").trim().slice(0, 30);

      await 명령("HSET", 열쇠이름, id, JSON.stringify(항목));
      return res.status(200).json({ id, ...항목 });
    }

    if (q.act === "upload") {
      const 파일이름 = String(q.filename || "").trim();
      const 확장자 = (파일이름.split(".").pop() || "").toLowerCase();
      if (!파일이름 || !허용확장자[확장자]) {
        return res.status(400).json({ 오류: "pdf, hwp, hwpx 파일만 올릴 수 있습니다." });
      }

      const 내용 = req.body; // Content-Type: application/octet-stream → Buffer
      if (!Buffer.isBuffer(내용) || !내용.length) {
        return res.status(400).json({ 오류: "파일 내용이 비어 있습니다." });
      }
      if (내용.length > 최대바이트) {
        return res.status(400).json({ 오류: "파일이 너무 큽니다 (4MB까지)." });
      }

      const id = String(Date.now());
      const blob = await put(`files/${id}-${파일이름}`, 내용, {
        access: "public",
        contentType: 허용확장자[확장자],
        addRandomSuffix: false,
      });

      const 항목 = {
        date: new Date().toISOString().slice(0, 10),
        subject: String(q.subject || "").trim().slice(0, 30),
        kind: String(q.kind || "").trim().slice(0, 30),
        title: String(q.title || "").trim().slice(0, 120) || 파일이름,
        filename: 파일이름,
        url: blob.url,
        size: 내용.length,
      };
      await 명령("HSET", 열쇠이름, id, JSON.stringify(항목));
      return res.status(200).json({ id, ...항목 });
    }

    return res.status(400).json({ 오류: "무슨 작업인지 알 수 없습니다." });
  } catch (err) {
    return res.status(500).json({ 오류: "처리 중 문제가 생겼습니다." });
  }
};
