const crypto = require("crypto");
const { 명령 } = require("./_redis");

function equal(left, right) {
  const a = Buffer.from(String(left || "")), b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const digest = (password, salt) => crypto.scryptSync(String(password), salt, 32).toString("hex");

async function passwordMatches(value) {
  const sent = String(value || "");
  if (!sent) return false;
  try {
    const changed = (await 명령("HGET", "설정", "암호")) || "";
    if (changed) {
      const [salt, hash] = changed.split(":");
      if (salt && hash && equal(digest(sent, salt), hash)) return true;
    }
  } catch { /* 환경 변수의 여벌 암호도 확인합니다. */ }
  return Boolean(process.env.ADMIN_PASSWORD) && equal(sent, process.env.ADMIN_PASSWORD);
}

module.exports = { passwordMatches };
