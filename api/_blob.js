/* =========================================================
   파일(PDF·HWP·HWPX) 자체를 담아 두는 곳에 말을 거는 부분입니다.
   손댈 일 없습니다. (질문/답이 담기는 곳은 _redis.js 로 따로 있습니다)

   Vercel에 Blob 저장소를 연결하면 BLOB_READ_WRITE_TOKEN 이 자동으로
   생깁니다. 아직 안 만들었으면 준비됨 이 false 가 되어, 자료실 업로드가
   막히는 대신 "준비 중" 안내만 보이게 됩니다.
   ========================================================= */
const { put, del } = require("@vercel/blob");

const 준비됨 = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

module.exports = { 준비됨, put, del };
