const crypto = require("crypto");
const { 준비됨, 명령 } = require("./_redis");
const { 모두에게보내기 } = require("./_push");
const catalog = require("../assets/exam-catalog.json");

const keepSeconds = 90 * 24 * 60 * 60;
const maxBodyBytes = 850000;
const maxPoints = 30000;
const maxStrokes = 2500;

function passwordMatches(value) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const a = Buffer.from(String(value || "")), b = Buffer.from(expected);
  return Boolean(expected) && a.length === b.length && crypto.timingSafeEqual(a, b);
}
function json(value) { try { return JSON.parse(value); } catch { return null; } }
function clean(value, maximum) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum); }
function clientAddress(req) { return String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim(); }
async function limited(req) {
  const key = `solve:limit:${clientAddress(req)}`;
  const count = await 명령("INCR", key);
  if (count === 1) await 명령("EXPIRE", key, 3600);
  return count > 12;
}
function examSet(examId, subject) {
  const item = catalog.items.find(row => row.id === examId);
  const set = item?.sets?.find(row => row.subject === subject);
  return item && set ? { item, set } : null;
}
function validatedPages(value, pageCount) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("제출할 필기를 확인해 주세요.");
  let points = 0, strokes = 0;
  const pages = {};
  for (const [pageKey, rawStrokes] of Object.entries(value)) {
    const page = Number(pageKey);
    if (!Number.isInteger(page) || page < 1 || page > Math.min(50, pageCount || 50) || !Array.isArray(rawStrokes)) continue;
    const safeStrokes = [];
    for (const stroke of rawStrokes) {
      if (!stroke || !["pen", "highlighter"].includes(stroke.tool) || !Array.isArray(stroke.points) || !stroke.points.length) throw new Error("필기 형식을 확인해 주세요.");
      const width = Number(stroke.width);
      if (!Number.isFinite(width) || width < .001 || width > .04) throw new Error("필기 굵기를 확인해 주세요.");
      const color = stroke.tool === "highlighter" ? "#ffd928" : "#19364a";
      const safePoints = stroke.points.map(point => {
        points += 1;
        if (points > maxPoints) throw new Error("필기가 너무 많습니다. 필요한 풀이만 남겨 주세요.");
        const x = Number(point?.x), y = Number(point?.y), p = Number(point?.p || .5);
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) throw new Error("필기 좌표를 확인해 주세요.");
        return { x: Math.round(x * 100000) / 100000, y: Math.round(y * 100000) / 100000, p: Math.max(.1, Math.min(1, Math.round(p * 100) / 100)) };
      });
      strokes += 1;
      if (strokes > maxStrokes) throw new Error("필기 횟수가 너무 많습니다. 필요한 풀이만 남겨 주세요.");
      safeStrokes.push({ tool: stroke.tool, color, width: Math.round(width * 100000) / 100000, points: safePoints });
    }
    if (safeStrokes.length) pages[String(page)] = safeStrokes;
  }
  if (!Object.keys(pages).length) throw new Error("문제지에 풀이를 작성한 뒤 제출해 주세요.");
  return pages;
}
function summary(record) {
  return { id: record.id, student: record.student, note: record.note, examId: record.examId, examTitle: record.examTitle, grade: record.grade,
    subject: record.subject, submittedAt: record.submittedAt, createdAt: record.createdAt, elapsedMs: record.elapsedMs,
    limitMinutes: record.limitMinutes, pageCount: record.pageCount, writtenPages: Object.keys(record.pages || {}).map(Number).sort((a, b) => a - b) };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!준비됨) return res.status(503).json({ error: "풀이 제출 저장소가 아직 준비되지 않았습니다." });
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "지원하지 않는 방식입니다." }); }
  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
  catch { return res.status(400).json({ error: "요청 형식을 확인해 주세요." }); }
  if (Buffer.byteLength(JSON.stringify(body)) > maxBodyBytes) return res.status(413).json({ error: "필기가 너무 많습니다. 필요한 풀이만 남겨 주세요." });

  try {
    if (body.action === "submit") {
      if (await limited(req)) return res.status(429).json({ error: "풀이를 너무 자주 제출했습니다. 잠시 뒤 다시 시도해 주세요." });
      const student = clean(body.student, 30), note = clean(body.note, 120);
      if (student.length < 2) return res.status(400).json({ error: "학번이나 이름을 두 글자 이상 입력해 주세요." });
      const examId = clean(body.examId, 80), subject = clean(body.subject, 30), found = examSet(examId, subject);
      if (!found) return res.status(400).json({ error: "기출문제 정보를 확인해 주세요." });
      const clientId = clean(body.clientId, 80);
      if (!/^[a-zA-Z0-9-]{20,80}$/.test(clientId)) return res.status(400).json({ error: "제출 기기 정보를 다시 확인해 주세요." });
      const pages = validatedPages(body.pages, Number(body.pageCount));
      const mapKey = `solve:client:${clientId}`;
      const previousId = await 명령("GET", mapKey);
      const previous = previousId ? json(await 명령("GET", `solve:submission:${previousId}`)) : null;
      const id = previous?.id || crypto.randomUUID(), now = Date.now();
      const record = { id, clientId, student, note, examId, examTitle: found.item.title, grade: found.item.grade, subject,
        sourceUrl: found.set.files.problem.url, pageCount: Math.max(1, Math.min(50, Number(body.pageCount) || 1)), pages,
        elapsedMs: Math.max(0, Math.min(12 * 60 * 60 * 1000, Number(body.elapsedMs) || 0)),
        limitMinutes: Math.max(0, Math.min(300, Number(body.limitMinutes) || 0)), createdAt: previous?.createdAt || now, submittedAt: now, version: 1 };
      await 명령("SET", `solve:submission:${id}`, JSON.stringify(record), "EX", keepSeconds);
      await 명령("SET", mapKey, id, "EX", keepSeconds);
      await 명령("ZADD", "solve:submissions", now, id);
      try {
        await 모두에게보내기({ title: `새 풀이 제출 (${student})`, body: `${record.examTitle} · ${subject}`, url: `/admin.html#풀이제출`, tag: `solve-${id}` });
      } catch (error) { console.error("풀이 제출 알림 실패:", error?.message); }
      return res.status(200).json({ submission: summary(record), updated: Boolean(previous) });
    }

    if (!["list", "get", "delete"].includes(body.action) || !passwordMatches(body.password)) return res.status(401).json({ error: "관리자 암호가 맞지 않습니다." });
    if (body.action === "list") {
      const ids = (await 명령("ZREVRANGE", "solve:submissions", 0, 199)) || [], records = [], stale = [];
      for (const id of ids) { const record = json(await 명령("GET", `solve:submission:${id}`)); if (record) records.push(summary(record)); else stale.push(id); }
      if (stale.length) await 명령("ZREM", "solve:submissions", ...stale);
      return res.status(200).json({ submissions: records });
    }
    const id = clean(body.id, 80), record = json(await 명령("GET", `solve:submission:${id}`));
    if (!record) return res.status(404).json({ error: "제출한 풀이를 찾지 못했습니다." });
    if (body.action === "get") return res.status(200).json({ submission: record });
    await 명령("DEL", `solve:submission:${id}`);
    await 명령("DEL", `solve:client:${record.clientId}`);
    await 명령("ZREM", "solve:submissions", id);
    return res.status(200).json({ deleted: true });
  } catch (error) {
    console.error("solutions", error);
    const expected = /확인|입력|필기|문제지|너무 많/.test(error?.message || "");
    return res.status(expected ? 400 : 500).json({ error: error?.message || "풀이 저장소에 문제가 생겼습니다." });
  }
};
