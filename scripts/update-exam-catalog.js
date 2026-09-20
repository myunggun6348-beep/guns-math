/* =========================================================
   기출 목록 새로 받기 (EBSi) — assets/exam-catalog.json 을 다시 만듭니다.

   ▶ 쓰는 법: '기출 목록 새로 받기.bat' 을 더블클릭하면 됩니다.
     명령창에서 직접 돌리려면:
       node scripts/update-exam-catalog.js              (파일까지 내려받아 확인)
       node scripts/update-exam-catalog.js --skip-verify (목록만 빠르게)
       node scripts/update-exam-catalog.js --years 2024-2026

   ▶ 왜 자바스크립트인가
     예전에는 같은 일을 하는 update-exam-catalog.py 가 있었는데, 이 컴퓨터에는
     파이썬이 없어서 정작 기출을 갱신할 때 돌릴 수가 없었습니다. 이 사이트의
     다른 검사 도구들과 같은 Node 로 옮겼습니다(설치할 것 없음).

   하는 일: EBSi 기출 목록을 학년·과목·연도별로 받아 와서, 시험 한 회차에
   문제·정답·해설 주소를 묶어 assets/exam-catalog.json 에 적습니다.
   ========================================================= */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const 목록주소 = "https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperListAjax.ajax";
const 내려받기앞 = "https://wdown.ebsi.co.kr/W61001/01exam";
const 달들 = ["03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const 종류이름 = { P: "problem", J: "answer", J2: "answer", H: "solution" };
const 과목들 = {
  1: [["110001", "수학"]],
  2: [["140111", "수학"]],
  3: [["140119", "확률과 통계"], ["140120", "미적분"], ["140121", "기하"]],
};

const 기다리기 = ms => new Promise(r => setTimeout(r, ms));
const 태그빼기 = 글 => 글.replace(/<[^>]+>/g, " ")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();

/* EBSi 는 페이지마다 글자 저장 방식이 다릅니다(요즘 것은 utf-8, 예전 것은 cp949).
   utf-8 로 먼저 읽어 보고 깨지면 euc-kr 로 읽습니다. */
function 글자로(바이트) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(바이트); }
  catch { return new TextDecoder("euc-kr").decode(바이트); }
}

async function 받기(주소, 폼, 보낸곳) {
  const 머리 = { "User-Agent": "Mozilla/5.0" };
  if (보낸곳) 머리.Referer = 보낸곳;
  if (폼) {
    머리["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
    머리["X-Requested-With"] = "XMLHttpRequest";
  }
  const 응답 = await fetch(주소, {
    method: 폼 ? "POST" : "GET", headers: 머리, body: 폼,
    signal: AbortSignal.timeout(60000),
  });
  if (!응답.ok) throw new Error(`${응답.status} ${주소}`);
  return Buffer.from(await 응답.arrayBuffer());
}

const 파일주소 = 값 => (/^https?:\/\//.test(값) ? 값 : (값.startsWith("/") ? 내려받기앞 + 값 : 값));

function 시험이름(제목) {
  let 값 = 제목.replace(/^고[123]\s*/, "").replace(/\s*(수학|확률과 통계|미적분|기하)\s*$/, "").trim();
  if (값.includes("수능")) return "대학수학능력시험";
  if (값.includes("모평") || 값.includes("모의평가")) return "대학수학능력시험 모의평가";
  if (값.includes("학평") || 값.includes("전국연합")) {
    const 교육청 = 값.match(/\(([^)]+)\)/);
    return 교육청 ? `전국연합학력평가 · ${교육청[1]}` : "전국연합학력평가";
  }
  return 값 || "수학 시험";
}

// 파일 첫 몇 바이트로 진짜 PDF·그림인지 봅니다 (EBSi 가 오류 쪽지를 내려줄 때가 있어서)
function 파일종류(바이트) {
  if (바이트.subarray(0, 4).toString("latin1") === "%PDF") return "pdf";
  if (바이트.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (바이트[0] === 0xff && 바이트[1] === 0xd8) return "jpg";
  return null;
}

function 보낼폼(대상, 연도들, 과목번호) {
  const 칸 = new URLSearchParams();
  칸.append("targetCd", 대상);
  칸.append("yearList", 연도들.join(","));
  칸.append("monthList", 달들.join(","));
  칸.append("arOrd", "2");
  칸.append("subjIdList", 과목번호);
  칸.append("sort", "recent");
  칸.append("paperId", "");
  칸.append("paperNo", "");
  칸.append("lvl", "");
  칸.append("mathArOrd", "2");
  칸.append("sFormPartMath", 과목번호);
  칸.append("yearAll", "all");
  연도들.forEach(연 => 칸.append("year", String(연)));
  달들.forEach(달 => 칸.append("month", 달));
  return 칸.toString();
}

function 한학년읽기(쪽, 학년, 연도들, 과목번호, 과목이름) {
  const 덩어리들 = 쪽.match(/<div class="qus_box\b[\s\S]*?(?=<div class="qus_box\b|<!-- \/\/board_list -->)/g) || [];
  const 시험들 = new Map();
  for (const 덩어리 of 덩어리들) {
    const 제목칸 = 덩어리.match(/<div class="qus_tit">([\s\S]*?)<\/div>/);
    const 제목 = 제목칸 ? 태그빼기(제목칸[1]) : "";
    if (!new RegExp(`고\\s*${학년}\\b`).test(제목)) continue;

    for (const 부름 of 덩어리.matchAll(/goDownLoad(J2|[PJH])\(([\s\S]*?)\);/g)) {
      const 인자 = [...부름[2].matchAll(/'([^']*)'/g)].map(m => m[1]);
      if (!인자.length) continue;
      if (인자.length > 5 && 인자[5] && 인자[5] !== 과목번호) continue;

      const 주소 = 파일주소(인자[0]);
      const 날짜칸 = 주소.match(/\/(20\d{6})\//);
      if (!날짜칸) continue;
      const 날짜 = 날짜칸[1];
      const 연 = Number(날짜.slice(0, 4)), 달 = 날짜.slice(4, 6);
      if (!연도들.has(연)) continue;

      const 이름 = 시험이름(제목);
      const 열쇠 = `${날짜}|${이름}`;
      if (!시험들.has(열쇠)) {
        시험들.set(열쇠, {
          id: `ebsi-${학년}-${날짜}`,
          grade: String(학년),
          examYear: String(연),
          examMonth: String(Number(달)),
          examDate: `${날짜.slice(0, 4)}-${날짜.slice(4, 6)}-${날짜.slice(6)}`,
          examName: 이름,
          title: 제목.replace(/\s*(수학|확률과 통계|미적분|기하)\s*$/, ""),
          subject: "수학",
          kind: "모의고사",
          source: "EBSi",
          sourcePage: `https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs?targetCd=D${학년}00`,
          sets: [],
        });
      }
      const 항목 = 시험들.get(열쇠);
      let 과목묶음 = 항목.sets.find(s => s.subject === 과목이름);
      if (!과목묶음) { 과목묶음 = { subject: 과목이름, files: {} }; 항목.sets.push(과목묶음); }
      const 종류 = 종류이름[부름[1]];
      if (!(종류 in 과목묶음.files)) 과목묶음.files[종류] = { url: 주소 };
    }
  }
  // 파이썬 판과 같은 순서(날짜·제목 내림차순)로 돌려줍니다
  return [...시험들.values()].sort((a, b) =>
    (b.examDate + b.title).localeCompare(a.examDate + a.title));
}

/* 주소만 적어 두면 나중에 그 파일이 사라져도 모릅니다. 실제로 받아 보고
   크기·종류·지문(sha256)을 남겨 둡니다. 259개쯤 되므로 몇 분 걸립니다. */
async function 확인하기(목록, 쉼) {
  let 본것 = 0, 실패 = 0, 총바이트 = 0;
  for (const 시험 of 목록) {
    for (const 묶음 of 시험.sets) {
      for (const 파일 of Object.values(묶음.files)) {
        try {
          const 바이트 = await 받기(파일.url, null, 시험.sourcePage);
          const 종류 = 파일종류(바이트);
          Object.assign(파일, {
            format: 종류, size: 바이트.length,
            sha256: crypto.createHash("sha256").update(바이트).digest("hex"),
            verified: Boolean(종류 && 바이트.length > 1024),
          });
          총바이트 += 바이트.length;
        } catch (오류) {
          Object.assign(파일, { format: null, size: 0, sha256: null, verified: false });
        }
        본것++;
        if (!파일.verified) 실패++;
        await 기다리기(쉼);
      }
    }
  }
  return { checked: 본것, failed: 실패, totalBytes: 총바이트 };
}

// 파이썬 datetime.isoformat() 과 같은 모양: 2026-09-20T18:03:11+09:00
function 지금시각() {
  const d = new Date(), 두자리 = n => String(n).padStart(2, "0");
  const 분 = -d.getTimezoneOffset();
  const 부호 = 분 >= 0 ? "+" : "-";
  return `${d.getFullYear()}-${두자리(d.getMonth() + 1)}-${두자리(d.getDate())}` +
    `T${두자리(d.getHours())}:${두자리(d.getMinutes())}:${두자리(d.getSeconds())}` +
    `${부호}${두자리(Math.floor(Math.abs(분) / 60))}:${두자리(Math.abs(분) % 60)}`;
}

(async () => {
  const 인자 = process.argv.slice(2);
  const 값 = 이름 => { const i = 인자.indexOf(이름); return i >= 0 ? 인자[i + 1] : null; };
  const 올해 = new Date().getFullYear();
  const 연도글 = 값("--years");
  const [처음, 끝] = 연도글 ? 연도글.split("-").map(Number) : [올해 - 2, 올해];
  const 연도들 = [];
  for (let y = 처음; y <= 끝; y++) 연도들.push(y);
  const 나가는곳 = 값("--out") || "assets/exam-catalog.json";
  const 확인건너뛰기 = 인자.includes("--skip-verify");
  const 쉼 = Number(값("--pause") || 80);

  console.log(`기출 목록을 받는 중… (${연도들.join(", ")}년)`);
  const 모음 = new Map();
  for (const 학년 of [1, 2, 3]) {
    const 대상 = `D${학년}00`;
    const 보낸곳 = `https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs?targetCd=${대상}`;
    for (const [과목번호, 과목이름] of 과목들[학년]) {
      for (const 연 of 연도들) {
        const 쪽 = 글자로(await 받기(목록주소, 보낼폼(대상, [연], 과목번호), 보낸곳));
        for (const 항목 of 한학년읽기(쪽, 학년, new Set([연]), 과목번호, 과목이름)) {
          const 열쇠 = `${학년}|${항목.examDate}|${항목.examName}`;
          if (!모음.has(열쇠)) 모음.set(열쇠, 항목);
          else 모음.get(열쇠).sets.push(...항목.sets);
        }
      }
    }
    console.log(`  고${학년} 까지 ${모음.size}회`);
  }
  const 목록 = [...모음.values()].sort((a, b) =>
    (b.examDate + b.grade).localeCompare(a.examDate + a.grade));

  let 확인 = { checked: 0, failed: 0, totalBytes: 0 };
  if (!확인건너뛰기) {
    const 파일수 = 목록.reduce((n, e) => n + e.sets.reduce((m, s) => m + Object.keys(s.files).length, 0), 0);
    console.log(`파일 ${파일수}개를 실제로 받아 확인하는 중… (몇 분 걸립니다)`);
    확인 = await 확인하기(목록, 쉼);
  }

  const 꾸러미 = {
    generatedAt: 지금시각(),
    years: 연도들,
    source: "EBSi 기출문제",
    sourceUrl: "https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs?targetCd=D300",
    verification: 확인,
    count: 목록.length,
    items: 목록,
  };
  fs.mkdirSync(path.dirname(나가는곳), { recursive: true });
  fs.writeFileSync(나가는곳, JSON.stringify(꾸러미, null, 2) + "\n", "utf8");
  console.log(`시험 ${목록.length}회 · 파일 ${확인.checked}개 · 실패 ${확인.failed}개 → ${나가는곳}`);
  process.exitCode = 확인.failed ? 1 : 0;
})().catch(오류 => { console.error("실패:", 오류.message); process.exitCode = 1; });
