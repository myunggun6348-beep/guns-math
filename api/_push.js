/* =========================================================
   새 질문 알림 (웹 푸시) — 손댈 일 없습니다.

   선생님 폰·컴퓨터로 "새 질문이 왔습니다" 알림을 보냅니다. 메일과 달리
   스팸함으로 가지 않고, 누르면 선생님 방의 그 질문 답 칸이 곧장 열립니다.

   ▶ 켜는 곳: 선생님 방(admin.html) → 받은 질문 → '이 기기에서 알림 받기'
   ▶ 따로 설정할 것이 없습니다
     푸시에는 서버의 '서명 열쇠'(VAPID) 한 쌍이 필요한데, 보통은 Vercel 에
     환경 변수로 넣습니다. 그 일을 선생님이 하지 않도록, 처음 알림을 켤 때
     열쇠를 만들어 질문 저장소(Redis)에 넣어 둡니다. 저장소 열쇠 자체가
     Vercel 에 숨겨져 있어 밖에서는 읽을 수 없습니다.

   알림 내용은 폰까지 가는 동안 암호화되어, 중간의 푸시 서버(구글·애플)도
   질문 내용을 볼 수 없습니다.
   ========================================================= */
const crypto = require("crypto");
const webpush = require("web-push");
const { 명령 } = require("./_redis");

const 열쇠자리 = "push:vapid";
const 기기자리 = "push:subs";
// 푸시 서버가 "누가 보냈는지" 연락처로 쓰는 주소 (메일 주소 대신 사이트 주소)
const 보내는곳 = "https://guns-math.vercel.app";

let 열쇠기억 = null;   // 같은 함수가 다시 불리면 저장소에 또 묻지 않도록

async function 서명열쇠() {
  if (열쇠기억) return 열쇠기억;
  let 저장된 = await 명령("GET", 열쇠자리);
  if (!저장된) {
    /* 처음 한 번만 만듭니다. NX(없을 때만 적기)라서, 두 사람이 동시에
       처음 켜더라도 먼저 적힌 한 쌍만 남고 둘 다 그걸 씁니다. */
    const 새열쇠 = webpush.generateVAPIDKeys();
    await 명령("SET", 열쇠자리, JSON.stringify(새열쇠), "NX");
    저장된 = await 명령("GET", 열쇠자리);
  }
  열쇠기억 = JSON.parse(저장된);
  return 열쇠기억;
}

// 기기마다 받는 주소(endpoint)가 길어서, 짧은 이름표로 바꿔 저장합니다
const 이름표 = 구독 => crypto.createHash("sha256").update(String(구독.endpoint)).digest("hex").slice(0, 24);

function 구독확인(구독) {
  return 구독 && typeof 구독.endpoint === "string" && /^https:\/\//.test(구독.endpoint)
    && 구독.keys && typeof 구독.keys.p256dh === "string" && typeof 구독.keys.auth === "string";
}

async function 기기추가(구독, 기기설명) {
  if (!구독확인(구독)) throw new Error("알림 주소가 올바르지 않습니다.");
  const 표 = 이름표(구독);
  await 명령("HSET", 기기자리, 표, JSON.stringify({
    sub: { endpoint: 구독.endpoint, keys: { p256dh: 구독.keys.p256dh, auth: 구독.keys.auth } },
    기기: String(기기설명 || "").slice(0, 60),
    켠날: new Date().toISOString().slice(0, 10),
  }));
  return 표;
}

async function 기기빼기(구독) {
  if (!구독 || !구독.endpoint) return;
  await 명령("HDEL", 기기자리, 이름표(구독));
}

async function 기기수() {
  return Number(await 명령("HLEN", 기기자리)) || 0;
}

async function 이기기켜졌나(구독) {
  if (!구독 || !구독.endpoint) return false;
  return Boolean(await 명령("HEXISTS", 기기자리, 이름표(구독)));
}

/* 알림 받는 기기 전부에 보냅니다.
   - 한 기기가 실패해도 나머지는 계속 보냅니다.
   - 폰을 바꿨거나 알림을 꺼서 더는 없는 주소(404·410)는 목록에서 지웁니다.
   - 학생이 질문을 올리고 기다리는 중이라, 오래 붙잡지 않도록 짧게 끊습니다.
   돌려주는 값: { 보냄, 실패 } */
async function 모두에게보내기(내용) {
  const 납작한 = (await 명령("HGETALL", 기기자리)) || [];
  if (!납작한.length) return { 보냄: 0, 실패: 0 };

  const { publicKey, privateKey } = await 서명열쇠();
  const 짐 = JSON.stringify(내용);
  let 보냄 = 0, 실패 = 0;

  const 일들 = [];
  for (let i = 0; i < 납작한.length; i += 2) {
    const 표 = 납작한[i];
    let 기록;
    try { 기록 = JSON.parse(납작한[i + 1]); } catch { continue; }
    일들.push(
      /* Promise.resolve().then 으로 감싸는 이유: web-push 는 저장된 주소가 망가져
         있으면 기다리지 않고 그 자리에서 오류를 던집니다. 그대로 두면 망가진
         기기 하나 때문에 나머지 기기에도 알림이 안 갑니다. */
      Promise.resolve().then(() => webpush.sendNotification(기록.sub, 짐, {
        vapidDetails: { subject: 보내는곳, publicKey, privateKey },
        TTL: 60 * 60 * 24,      // 폰이 꺼져 있어도 하루 동안은 기다렸다가 전합니다
        urgency: "high",
        timeout: 5000,
      }))
        .then(() => { 보냄++; })
        .catch(async 오류 => {
          실패++;
          if (오류 && (오류.statusCode === 404 || 오류.statusCode === 410)) {
            try { await 명령("HDEL", 기기자리, 표); } catch {}
          } else {
            console.error("알림 보내기 실패:", 오류 && (오류.statusCode || 오류.message));
          }
        })
    );
  }
  await Promise.all(일들);
  return { 보냄, 실패 };
}

module.exports = { 서명열쇠, 기기추가, 기기빼기, 기기수, 이기기켜졌나, 모두에게보내기 };
