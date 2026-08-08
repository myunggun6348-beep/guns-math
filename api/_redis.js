/* =========================================================
   질문 저장소에 말을 거는 부분입니다. 손댈 일 없습니다.

   질문과 답을 어딘가에 적어 둬야 다음 사람도 볼 수 있는데, 그 '어딘가'가
   Vercel에 연결한 Upstash Redis 라는 저장소입니다. 설치할 것도, 내려받을
   것도 없이 주소로 말을 걸면 되게 되어 있어서 여기서는 fetch 만 씁니다.

   주소와 열쇠는 Vercel이 알아서 넣어 줍니다(환경 변수). 저장소를 아직 안
   만들었으면 둘 다 비어 있고, 그때는 준비됨 이 false 가 되어서 페이지가
   깨지는 대신 "준비 중" 안내만 보이게 됩니다.
   ========================================================= */

// 저장소를 만드는 방법에 따라 이름이 조금씩 다르게 들어와서 아는 이름을 다 봅니다
const 주소 = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const 열쇠 = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

const 준비됨 = Boolean(주소 && 열쇠);

async function 명령(...조각) {
  const 응답 = await fetch(주소, {
    method: "POST",
    headers: { Authorization: `Bearer ${열쇠}`, "Content-Type": "application/json" },
    body: JSON.stringify(조각),
  });
  const 결과 = await 응답.json();
  if (!응답.ok || 결과.error) throw new Error(결과.error || `저장소 오류 ${응답.status}`);
  return 결과.result;
}

module.exports = { 준비됨, 명령 };
