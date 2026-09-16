/* =========================================================
   파일(PDF·HWP·HWPX) 자체를 담아 두는 곳에 말을 거는 부분입니다.
   손댈 일 없습니다. (질문/답이 담기는 곳은 _redis.js 로 따로 있습니다)

   Vercel에 Blob 저장소를 연결하면 BLOB_STORE_ID 가 자동으로 생기고,
   실제 열쇠는 (요즘 방식대로) 매 요청마다 Vercel이 잠깐만 쓰는 OIDC
   토큰으로 대신합니다 — 그래서 옛날처럼 BLOB_READ_WRITE_TOKEN 이라는
   긴 고정 열쇠는 안 보일 수 있습니다. 둘 중 하나라도 있으면 연결된
   것으로 봅니다. 아무것도 없으면 준비됨 이 false 가 되어, 자료실
   업로드가 막히는 대신 "준비 중" 안내만 보이게 됩니다.
   ========================================================= */
const { del, head, issueSignedToken, presignUrl, put } = require("@vercel/blob");

const 준비됨 = Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

module.exports = { 준비됨, del, head, issueSignedToken, presignUrl, put };
