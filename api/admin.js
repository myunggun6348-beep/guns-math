/* =========================================================
   선생님 쪽 창구입니다. 손댈 일 없습니다.

   답을 달거나 질문을 지울 때 페이지가 여기로 옵니다. 아무나 못 하도록
   암호를 함께 보내야 합니다. 암호는 이 파일에 없습니다 — Vercel에 넣어 둔
   ADMIN_PASSWORD 이거나, 선생님 방에서 바꾼 암호(저장소에 지문만)입니다.
   그래서 이 코드가 GitHub에 공개돼도 암호는 새어 나가지 않습니다.
   ========================================================= */
const crypto = require("crypto");
const { 준비됨, 명령 } = require("./_redis");
const 푸시 = require("./_push");
const { 한국날짜 } = require("./hit");
const { del } = require("./_blob");

const 열쇠이름 = "qna";
const 설정열쇠 = "설정";
const 공지열쇠 = "notices";
const 암호열쇠 = "암호";       // 설정 해시 안. 선생님 방에서 바꾼 암호의 지문이 들어갑니다
const 암호최소 = 8;
const 답변최대 = 2000;
const 공지제목최대 = 120;
const 공지내용최대 = 1000;

// 글자를 하나씩 비교하면 '몇 글자까지 맞았는지'가 걸린 시간으로 새어 나갑니다.
// timingSafeEqual 은 어디서 틀렸든 늘 같은 시간이 걸리게 비교해 줍니다.
function 같나(이것, 저것) {
  const a = Buffer.from(String(이것 || ""));
  const b = Buffer.from(String(저것 || ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* 바꾼 암호는 글자 그대로 저장하지 않습니다. 소금(아무 글자)을 섞어 한 방향으로
   뭉갠 지문만 남깁니다 — 저장소를 누가 들여다봐도 암호를 되돌릴 수 없습니다. */
const 지문만들기 = (암호, 소금) => crypto.scryptSync(String(암호), 소금, 32).toString("hex");

async function 바꾼암호읽기() {
  try { return (await 명령("HGET", 설정열쇠, 암호열쇠)) || ""; } catch { return ""; }
}

/* 두 개를 다 받아 줍니다.
   1) 선생님 방에서 바꾼 암호
   2) Vercel 에 넣어 둔 처음 암호 — 여벌 열쇠. 바꾼 암호를 잊어버려도
      잠겨 버리지 않게 늘 열어 둡니다. 여벌까지 막으려면 Vercel 에서
      ADMIN_PASSWORD 값을 바꾸면 됩니다. */
async function 암호맞나(보낸것) {
  const 보낸 = String(보낸것 || "");
  if (!보낸) return false;

  const 적힌 = await 바꾼암호읽기();
  if (적힌) {
    const [소금, 지문] = 적힌.split(":");
    if (소금 && 지문 && 같나(지문만들기(보낸, 소금), 지문)) return true;
  }

  const 여벌 = process.env.ADMIN_PASSWORD || "";
  return Boolean(여벌) && 같나(보낸, 여벌);
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

  if (!(await 암호맞나(받은.암호))) {
    return res.status(401).json({ 오류: "암호가 맞지 않습니다." });
  }

  /* ---- 질문 하나를 고르지 않는 작업들 — id 를 따지기 전에 먼저 처리 ---- */
  try {
    // 암호만 확인하는 용도 — 로그인 단추가 이걸 씁니다.
    // '바꾼암호' 는 암호 칸에 무엇을 보여 줄지 정하는 데 씁니다.
    if (받은.작업 === "확인") {
      return res.status(200).json({ 좋음: true, 바꾼암호: Boolean(await 바꾼암호읽기()) });
    }

    /* ---- 암호 바꾸기 ----
       여기까지 왔다는 건 지금 암호를 이미 맞혔다는 뜻입니다(위 관문).
       그래서 '지금 암호'를 또 묻지 않습니다. */
    if (받은.작업 === "암호바꾸기") {
      const 새암호 = String(받은.새암호 || "");
      if (새암호.length < 암호최소) {
        return res.status(400).json({ 오류: `새 암호는 ${암호최소}자 이상이어야 합니다.` });
      }
      if (새암호.length > 200) {
        return res.status(400).json({ 오류: "새 암호가 너무 깁니다." });
      }
      const 소금 = crypto.randomBytes(16).toString("hex");
      await 명령("HSET", 설정열쇠, 암호열쇠, `${소금}:${지문만들기(새암호, 소금)}`);
      return res.status(200).json({ 좋음: true, 바꾼암호: true });
    }

    // 바꾼 암호를 지웁니다 — Vercel 에 넣어 둔 처음 암호만 남습니다
    if (받은.작업 === "암호되돌리기") {
      await 명령("HDEL", 설정열쇠, 암호열쇠);
      return res.status(200).json({ 좋음: true, 바꾼암호: false });
    }

    // 선생님 방의 질문 목록. 학생용(/api/questions)과 달리 '확인 대기 중'인
    // 것까지 전부 돌려줍니다 — 선생님은 그걸 봐야 공개할지 정할 수 있습니다.
    if (받은.작업 === "목록") {
      const 납작한 = (await 명령("HGETALL", 열쇠이름)) || [];
      const 목록 = [];
      for (let i = 0; i < 납작한.length; i += 2) {
        try { 목록.push({ id: 납작한[i], ...JSON.parse(납작한[i + 1]) }); } catch {}
      }
      목록.sort((a, b) => Number(b.id) - Number(a.id));
      const 검토 = (await 명령("HGET", 설정열쇠, "검토")) === "1";
      return res.status(200).json({ 목록, 검토 });
    }

    // '확인 후 공개' 스위치 켜고 끄기
    if (받은.작업 === "검토스위치") {
      const 켬 = 받은.켬 ? "1" : "0";
      await 명령("HSET", 설정열쇠, "검토", 켬);
      return res.status(200).json({ 검토: 켬 === "1" });
    }

    /* ---- 방문 (api/hit.js 가 센 것) ----
       지난 N일(오늘 포함)을 날짜별 합계와 페이지별 합계로 묶어 돌려줍니다. */
    if (받은.작업 === "방문통계") {
      const 기간 = Math.min(90, Math.max(1, Math.floor(Number(받은.기간) || 7)));
      const 날짜들 = [];
      for (let i = 기간 - 1; i >= 0; i--) 날짜들.push(한국날짜(Date.now() - i * 86400000));

      const 날마다 = await Promise.all(날짜들.map(날 => 명령("HGETALL", `views:${날}`)));
      const 페이지합 = {};
      const 일별 = 날짜들.map((날짜, i) => {
        const 납작한 = 날마다[i] || [];
        let 합 = 0;
        for (let j = 0; j < 납작한.length; j += 2) {
          const 수 = Number(납작한[j + 1]) || 0;
          합 += 수;
          페이지합[납작한[j]] = (페이지합[납작한[j]] || 0) + 수;
        }
        return { 날짜, 합 };
      });
      const 페이지 = Object.entries(페이지합)
        .map(([p, 수]) => ({ p, 수 }))
        .sort((a, b) => b.수 - a.수 || a.p.localeCompare(b.p));
      return res.status(200).json({ 기간, 일별, 페이지, 합계: 일별.reduce((s, d) => s + d.합, 0) });
    }

    /* ---- 새 질문 알림 (웹 푸시) ----
       자세한 설명은 api/_push.js 에 있습니다. */
    if (받은.작업 === "알림상태") {
      // 기기가 켜기 전에 필요한 공개 열쇠 + 지금 이 기기가 켜져 있는지 + 모두 몇 대인지
      const { publicKey } = await 푸시.서명열쇠();
      return res.status(200).json({
        공개열쇠: publicKey,
        이기기: await 푸시.이기기켜졌나(받은.구독),
        기기수: await 푸시.기기수(),
      });
    }

    if (받은.작업 === "알림켜기") {
      try {
        await 푸시.기기추가(받은.구독, 받은.기기);
      } catch (err) {
        return res.status(400).json({ 오류: err.message });
      }
      return res.status(200).json({ 이기기: true, 기기수: await 푸시.기기수() });
    }

    if (받은.작업 === "알림끄기") {
      await 푸시.기기빼기(받은.구독);
      return res.status(200).json({ 이기기: false, 기기수: await 푸시.기기수() });
    }

    if (받은.작업 === "알림시험") {
      const 결과 = await 푸시.모두에게보내기({
        title: "알림 시험",
        body: "이 알림이 보이면 새 질문 알림이 제대로 옵니다.",
        url: "/admin.html",
        tag: "시험",
      });
      return res.status(200).json({ ...결과, 기기수: await 푸시.기기수() });
    }

    /* ---- 공지 ----
       질문과 달리 공지는 선생님이 쓰는 글이라 검토 절차가 없습니다.
       쓰면 곧바로 홈 맨 위에 올라갑니다. */
    if (받은.작업 === "공지목록") {
      const 납작한 = (await 명령("HGETALL", 공지열쇠)) || [];
      const 목록 = [];
      for (let i = 0; i < 납작한.length; i += 2) {
        try { 목록.push({ id: 납작한[i], ...JSON.parse(납작한[i + 1]) }); } catch {}
      }
      목록.sort((a, b) => Number(b.id) - Number(a.id));
      return res.status(200).json({ 목록 });
    }

    if (받은.작업 === "공지쓰기" || 받은.작업 === "공지고치기") {
      const 제목 = String(받은.제목 || "").trim().slice(0, 공지제목최대);
      if (!제목) return res.status(400).json({ 오류: "제목을 입력해 주세요." });

      const 항목 = {
        date: new Date().toISOString().slice(0, 10),
        tag: String(받은.구분 || "").trim().slice(0, 20) || "안내",
        title: 제목,
        body: String(받은.내용 || "").trim().slice(0, 공지내용최대),
      };

      let id;
      if (받은.작업 === "공지고치기") {
        id = String(받은.공지id || "");
        if (!id) return res.status(400).json({ 오류: "어느 공지인지 알 수 없습니다." });
        const 원본 = await 명령("HGET", 공지열쇠, id);
        if (!원본) return res.status(404).json({ 오류: "그 공지가 없습니다." });
        /* 처음 쓴 날짜는 그대로 둡니다 — 오탈자 하나 고쳤다고 오래된
           공지가 오늘 쓴 새 공지처럼 보이면 안 되니까요. */
        try { 항목.date = JSON.parse(원본).date || 항목.date; } catch {}
      } else {
        /* 번호는 '쓴 시각'입니다. 같은 밀리초에 둘이 들어오면 번호가 겹쳐
           뒤엣것이 앞엣것을 소리 없이 덮어쓰므로 뒤에 세 자리를 더 붙입니다.
           여전히 숫자라서 시간순 정렬은 그대로입니다. */
        id = String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
      }

      await 명령("HSET", 공지열쇠, id, JSON.stringify(항목));
      return res.status(200).json({ id, ...항목 });
    }

    if (받은.작업 === "공지지우기") {
      const id = String(받은.공지id || "");
      if (!id) return res.status(400).json({ 오류: "어느 공지인지 알 수 없습니다." });
      await 명령("HDEL", 공지열쇠, id);
      return res.status(200).json({ 좋음: true });
    }
  } catch (err) {
    return res.status(500).json({ 오류: "저장소에 문제가 생겼습니다." });
  }

  const id = String(받은.id || "");
  if (!id) return res.status(400).json({ 오류: "어느 질문인지 알 수 없습니다." });

  try {
    if (받은.작업 === "삭제") {
      const 원본 = await 명령("HGET", 열쇠이름, id);
      if (원본) {
        try { const 항목 = JSON.parse(원본); if (항목.img) await del(항목.img); } catch {}
      }
      await 명령("HDEL", 열쇠이름, id);
      return res.status(200).json({ 좋음: true });
    }

    if (받은.작업 === "답변") {
      const 원본 = await 명령("HGET", 열쇠이름, id);
      if (!원본) return res.status(404).json({ 오류: "그 질문이 없습니다." });
      const 항목 = JSON.parse(원본);
      const 새답 = String(받은.답변 || "").trim().slice(0, 답변최대);

      /* 답을 '처음 단 날'만 적어 둡니다(at). 홈에서 '새로 답한 질문'을
         고르는 데 씁니다. 나중에 답을 고쳐 써도 날짜를 새로 찍지 않는 이유:
         오래된 질문이 오탈자 하나 고쳤다고 다시 새 글로 올라오면 안 되니까요. */
      if (새답 && !항목.a) 항목.at = new Date().toISOString().slice(0, 10);
      if (!새답) delete 항목.at;          // 답을 지우면 날짜도 지웁니다
      항목.a = 새답;

      await 명령("HSET", 열쇠이름, id, JSON.stringify(항목));
      return res.status(200).json({ id, ...항목 });
    }

    // 확인 대기 중이던 질문을 학생들에게 보이게 합니다
    if (받은.작업 === "공개") {
      const 원본 = await 명령("HGET", 열쇠이름, id);
      if (!원본) return res.status(404).json({ 오류: "그 질문이 없습니다." });
      const 항목 = JSON.parse(원본);
      delete 항목.h;
      await 명령("HSET", 열쇠이름, id, JSON.stringify(항목));
      return res.status(200).json({ id, ...항목 });
    }

    return res.status(400).json({ 오류: "무슨 작업인지 알 수 없습니다." });
  } catch (err) {
    return res.status(500).json({ 오류: "저장소에 문제가 생겼습니다." });
  }
};
