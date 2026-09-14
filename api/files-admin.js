/* =========================================================
   자료실 — 선생님 창구입니다. 손댈 일 없습니다.

   질문 게시판의 api/admin.js 와 같은 방식으로 암호를 확인합니다
   (같은 ADMIN_PASSWORD).

   ▶ 파일을 올리는 순서 (두 걸음인 이유)
     예전에는 파일이 이 함수를 거쳐 저장소로 갔는데, Vercel이 함수 하나에
     4.5MB까지만 허용해서 스캔한 학습지처럼 큰 파일은 올라가지 않았습니다.
     그래서 파일이 이 함수를 안 거치고 브라우저에서 저장소로 곧장 가도록
     바꿨습니다.

       1) presign — 여기서 암호를 확인하고 '이 파일만, 이 크기까지'라고
                    적힌 일회용 출입증(주소)을 만들어 줍니다
       2) 브라우저가 그 주소로 파일을 곧장 보냅니다 (이 함수는 안 거침)
       3) record  — 정말 올라갔는지 확인하고 제목·과목을 목록에 적습니다

   올릴 수 있는 파일: pdf, hwp, hwpx / 50MB까지
   ========================================================= */
const crypto = require("crypto");
const { 준비됨: redis준비됨, 명령 } = require("./_redis");
const { 준비됨: blob준비됨, del, head, issueSignedToken, presignUrl } = require("./_blob");

const 열쇠이름 = "files";
const 허용학년 = new Set(["1", "2", "3", "common"]);
const 학년값 = 값 => 허용학년.has(String(값)) ? String(값) : "common";
const 연도값 = 값 => /^(19|20)\d{2}$/.test(String(값 || "")) ? String(값) : "";
const 월값 = 값 => /^(?:0?[1-9]|1[0-2])$/.test(String(값 || "")) ? String(Number(값)) : "";
const 최대바이트 = 50 * 1024 * 1024;
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
    /* ---------- 1걸음: 올려도 좋다는 출입증 만들기 ---------- */
    if (q.act === "presign") {
      const 파일이름 = String(q.filename || "").trim();
      const 확장자 = (파일이름.split(".").pop() || "").toLowerCase();
      if (!파일이름 || !허용확장자[확장자]) {
        return res.status(400).json({ 오류: "pdf, hwp, hwpx 파일만 올릴 수 있습니다." });
      }
      const 크기 = Number(q.size || 0);
      if (!크기) return res.status(400).json({ 오류: "파일 내용이 비어 있습니다." });
      if (크기 > 최대바이트) {
        return res.status(400).json({ 오류: "파일이 너무 큽니다 (50MB까지)." });
      }

      /* 번호는 '올린 시각'이지만, 같은 밀리초에 두 개가 들어오면 번호가 겹쳐
         뒤엣것이 앞엣것을 소리 없이 덮어씁니다(목록도 파일도). 뒤에 세 자리를
         더 붙여 겹치지 않게 하되, 여전히 숫자라서 시간순 정렬은 그대로입니다. */
      const id = String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
      /* 저장 경로에는 원래 파일 이름(한글 포함)을 넣지 않습니다 — 이 경로가
         출입증 안에도 그대로 박히는데, 한글 같은 글자가 그 안에서 깨지면
         "출입증에 적힌 경로"와 "실제 요청 경로"가 서로 달라 보여 거부당합니다.
         그래서 경로는 번호+확장자로만 만들고, 원래 이름은 record 단계에서
         따로 받아 목록에 적습니다. */
      const pathname = `files/${id}.${확장자}`;
      const contentType = 허용확장자[확장자];

      // '이 파일 하나만, 이 종류로, 이 크기까지' 로 범위를 좁힌 출입증입니다.
      // 남이 주소를 가로채도 다른 파일을 덮어쓰거나 더 큰 걸 올릴 수 없습니다.
      const 토큰 = await issueSignedToken({
        pathname,
        operations: ["put"],
        allowedContentTypes: [contentType],
        maximumSizeInBytes: 최대바이트,
      });
      const { presignedUrl } = await presignUrl(토큰, {
        operation: "put",
        pathname,
        access: "public",
        allowedContentTypes: [contentType],
        maximumSizeInBytes: 최대바이트,
        addRandomSuffix: false,
        allowOverwrite: true,
        validUntil: Date.now() + 30 * 60 * 1000, // 느린 인터넷도 넉넉하도록 30분
      });

      return res.status(200).json({ id, pathname, contentType, presignedUrl });
    }

    /* ---------- 3걸음: 올라간 걸 확인하고 목록에 적기 ---------- */
    if (q.act === "record") {
      const id = String(q.id || "");
      const pathname = String(q.pathname || "");
      if (!id || !pathname.startsWith("files/")) {
        return res.status(400).json({ 오류: "어느 파일인지 알 수 없습니다." });
      }

      // 진짜 올라갔는지 저장소에 직접 물어봅니다. 이걸 건너뛰면 올리지도
      // 않은 파일이 목록에만 생겨서 눌러도 안 열리는 줄이 남습니다.
      let 올라간것;
      try {
        올라간것 = await head(pathname);
      } catch {
        return res.status(400).json({ 오류: "파일이 저장소에 올라가지 않았습니다." });
      }

      // 저장 경로에는 원래 이름이 없으므로(위 설명 참고), 화면에 보일 이름은
      // 클라이언트가 다시 보내 줍니다. 안 보냈으면 경로에서라도 뽑아 둡니다.
      const 파일이름 = String(q.filename || "").trim() || pathname.slice(pathname.lastIndexOf("/") + 1);
      const 항목 = {
        date: new Date().toISOString().slice(0, 10),
        grade: 학년값(q.grade),
        subject: String(q.subject || "").trim().slice(0, 30),
        examYear: 연도값(q.examYear),
        examMonth: 월값(q.examMonth),
        examName: String(q.examName || "").trim().slice(0, 60),
        kind: String(q.kind || "").trim().slice(0, 30),
        title: String(q.title || "").trim().slice(0, 120) || 파일이름,
        // 개념 지도의 열쇠말(trig, prob …). 있으면 그 개념을 눌렀을 때
        // 이 학습지가 같이 나옵니다. 없으면 자료실에만 있습니다.
        concept: String(q.concept || "").trim().slice(0, 30),
        filename: 파일이름,
        url: 올라간것.url,
        size: 올라간것.size,
      };
      await 명령("HSET", 열쇠이름, id, JSON.stringify(항목));
      return res.status(200).json({ id, ...항목 });
    }

    /* ---------- 제목·과목·종류만 고치기 (파일은 그대로) ---------- */
    if (q.act === "edit") {
      const id = String(q.id || "");
      if (!id) return res.status(400).json({ 오류: "어느 파일인지 알 수 없습니다." });

      const 원본 = await 명령("HGET", 열쇠이름, id);
      if (!원본) return res.status(404).json({ 오류: "그 파일이 없습니다." });

      const 항목 = JSON.parse(원본);
      const 새제목 = String(q.title || "").trim().slice(0, 120);
      if (!새제목) return res.status(400).json({ 오류: "제목을 입력해 주세요." });
      항목.title = 새제목;
      항목.grade = 학년값(q.grade);
      항목.subject = String(q.subject || "").trim().slice(0, 30);
      항목.examYear = 연도값(q.examYear);
      항목.examMonth = 월값(q.examMonth);
      항목.examName = String(q.examName || "").trim().slice(0, 60);
      항목.kind = String(q.kind || "").trim().slice(0, 30);
      항목.concept = String(q.concept || "").trim().slice(0, 30);

      await 명령("HSET", 열쇠이름, id, JSON.stringify(항목));
      return res.status(200).json({ id, ...항목 });
    }

    /* ---------- 지우기 ---------- */
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

    return res.status(400).json({ 오류: "무슨 작업인지 알 수 없습니다." });
  } catch (err) {
    // 학생 눈에는 안 보이지만, Vercel 쪽 로그에는 원인이 남습니다
    console.error("files-admin 오류:", err);
    return res.status(500).json({ 오류: "처리 중 문제가 생겼습니다." });
  }
};
