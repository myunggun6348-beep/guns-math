const { 준비됨, 명령 } = require("./_redis");
const { passwordMatches } = require("./_admin-auth");

function input(req) { return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
function koreaDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()); }
function rate(row) {
  const attempts = Number(row?.attempts) || 0, correct = Number(row?.correct) || 0;
  return attempts ? Math.round(correct / attempts * 100) : 0;
}
function newest(...values) { return values.filter(Boolean).map(String).sort().reverse()[0] || ""; }

async function accountIds() {
  let cursor = "0", keys = [], rounds = 0;
  do {
    const result = await 명령("SCAN", cursor, "MATCH", "student:account:*", "COUNT", 200);
    cursor = String(result?.[0] || "0");
    keys.push(...(result?.[1] || []));
    rounds++;
  } while (cursor !== "0" && rounds < 20 && keys.length < 1000);
  return [...new Set(keys)].slice(0, 1000);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "지원하지 않는 방식입니다." });
  if (!준비됨) return res.status(503).json({ error: "학생 계정 저장소를 준비하고 있습니다." });
  try {
    const received = input(req);
    if (!(await passwordMatches(received.password))) return res.status(401).json({ error: "선생님 방 암호가 맞지 않습니다." });
    const keys = await accountIds(), today = koreaDate(), students = [];
    for (const key of keys) {
      const id = key.slice("student:account:".length);
      const [accountRaw, dataRaw] = await Promise.all([명령("GET", key), 명령("GET", `student:data:${id}`)]);
      if (!accountRaw) continue;
      const account = JSON.parse(accountRaw), data = dataRaw ? JSON.parse(dataRaw) : {};
      const records = Array.isArray(data.records) ? data.records : [];
      const notes = Array.isArray(data.notes) ? data.notes : [];
      const stats = data.stats && typeof data.stats === "object" ? Object.values(data.stats) : [];
      const weak = stats.filter(row => Number(row.attempts) > 0).sort((a, b) => rate(a) - rate(b) || Number(b.attempts) - Number(a.attempts))[0] || null;
      const todayRecords = records.filter(row => row.date === today);
      const recent = records.slice().sort((a, b) => String(b.finishedAt || b.date).localeCompare(String(a.finishedAt || a.date)))[0];
      const totalQuestions = records.reduce((sum, row) => sum + (Number(row.total) || 5), 0);
      const totalCorrect = records.reduce((sum, row) => sum + (Number(row.correct) || 0), 0);
      students.push({
        id, name: account.name || "", grade: String(data.profile?.grade || data.pref?.grade || ""), className: String(data.profile?.className || ""), track: String(data.profile?.track || data.pref?.track || ""),
        joinedAt: account.createdAt || "", lastAt: newest(recent?.finishedAt, ...stats.map(row => row.lastAt), ...notes.map(note => note.masteredAt || note.lastWrongAt || note.createdAt)),
        studyCount: records.length, todayDone: todayRecords.length > 0, todayScore: todayRecords.length ? Math.max(...todayRecords.map(row => Number(row.correct) || 0)) : null,
        average: totalQuestions ? Math.round(totalCorrect / totalQuestions * 100) : null, activeWrong: notes.filter(note => !note.mastered).length, mastered: notes.filter(note => note.mastered).length,
        weakest: weak ? { name: weak.name || "기타", rate: rate(weak), attempts: Number(weak.attempts) || 0 } : null,
      });
    }
    students.sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)) || a.id.localeCompare(b.id));
    const weekAgo = Date.now() - 7 * 86400000;
    const groups = new Map();
    students.forEach(student => {
      const key = student.grade && student.className ? `${student.grade}-${student.className}` : "unset";
      const row = groups.get(key) || { key, grade: student.grade || "", className: student.className || "", students: 0, active7: 0, today: 0, activeWrong: 0, scoreSum: 0, scoreCount: 0 };
      row.students++; if (Date.parse(student.lastAt) >= weekAgo) row.active7++; if (student.todayDone) row.today++; row.activeWrong += student.activeWrong;
      if (student.average !== null) { row.scoreSum += student.average; row.scoreCount++; }
      groups.set(key, row);
    });
    const classes = [...groups.values()].map(({ scoreSum, scoreCount, ...row }) => ({ ...row, average: scoreCount ? Math.round(scoreSum / scoreCount) : null }))
      .sort((a, b) => a.key === "unset" ? 1 : b.key === "unset" ? -1 : Number(a.grade) - Number(b.grade) || Number(a.className) - Number(b.className));
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      summary: { total: students.length, active7: students.filter(s => Date.parse(s.lastAt) >= weekAgo).length, today: students.filter(s => s.todayDone).length, activeWrong: students.reduce((sum, s) => sum + s.activeWrong, 0) },
      classes, students,
    });
  } catch (error) {
    console.error("student admin error", error);
    return res.status(500).json({ error: "학생 학습 현황을 불러오지 못했습니다." });
  }
};
