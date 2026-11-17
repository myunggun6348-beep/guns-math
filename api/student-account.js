const { 준비됨, 명령 } = require("./_redis");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" || req.query?.migration !== "1") {
    return res.status(410).json({ error: "학생 계정 기능이 종료되었습니다." });
  }

  // 기존 브라우저의 캐시를 열어도 되는지만 확인합니다. 세션을 새로 만들거나 연장하지 않습니다.
  const token = String(req.headers.cookie || "").match(/(?:^|;\s*)math_student_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) return res.status(200).json({ owner: null });
  if (!준비됨) return res.status(503).json({ error: "기존 기록을 확인할 수 없습니다." });

  try {
    const session = await 명령("GET", `student:session:${token}`);
    if (!session) return res.status(200).json({ owner: null });
    const { id, version } = session.startsWith("{") ? JSON.parse(session) : { id: session };
    if (!/^[a-z0-9]{4,16}$/.test(id || "")) return res.status(200).json({ owner: null });
    const account = await 명령("GET", `student:account:${id}`);
    const verified = account && (version || "") === (JSON.parse(account).authVersion || "");
    return res.status(200).json({ owner: verified ? id : null });
  } catch {
    return res.status(503).json({ error: "기존 기록을 확인할 수 없습니다." });
  }
};
