const { 준비됨, 명령 } = require("./_redis");
const { passwordMatches } = require("./_admin-auth");
const crypto=require("crypto");
const {reviewSummary}=require('../assets/study-state');
const {summary:diagnosticSummary,weeklyPlan}=require('../assets/diagnostic-analysis');
const {새PIN문제,digest}=require("./_student-auth");

function input(req) { return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
function koreaDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()); }
function rate(row) {
  const attempts = Number(row?.attempts) || 0, correct = Number(row?.correct) || 0;
  return attempts ? Math.round(correct / attempts * 100) : 0;
}
function newest(...values) { return values.filter(Boolean).map(String).sort().reverse()[0] || ""; }
const reasonNames={concept:"개념 부족",reading:"조건 해석",calculation:"계산 실수",time:"시간 부족",unsure:"아직 모름",unrecorded:"미기록"};
const safeCount=value=>Number.isSafeInteger(value)&&value>=0?value:0;
function studyAnalysis(notes,stats){
  const reasons=Object.entries(reasonNames).map(([key,name])=>({key,name,count:notes.filter(note=>(Object.hasOwn(reasonNames,note.wrongReason)&&note.wrongReason!=="unrecorded"?note.wrongReason:"unrecorded")===key).length}));
  const hints=stats.reduce((sum,row)=>{["reviewAttempts","hintUsed","hintSteps","soloCorrect"].forEach(key=>sum[key]+=safeCount(row[key]));return sum},{reviewAttempts:0,hintUsed:0,hintSteps:0,soloCorrect:0});
  return{reasons,hints,savedHintNotes:notes.filter(note=>safeCount(note.hintsUsed)>0).length};
}

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
    if(received.action==="reset-password"){
      const id=String(received.id||"").trim().toLowerCase();
      if(!/^[a-z0-9]{4,16}$/.test(id))return res.status(400).json({error:"학생 아이디를 확인해 주세요."});
      const problem=새PIN문제(received.newPin);if(problem)return res.status(400).json({error:problem});
      const key=`student:account:${id}`,raw=await 명령("GET",key);
      if(!raw)return res.status(404).json({error:"해당 학생 계정이 없습니다."});
      const account=JSON.parse(raw),salt=crypto.randomBytes(16).toString("hex");
      const updated={...account,salt,hash:digest(received.newPin,salt),authVersion:crypto.randomBytes(16).toString("hex"),passwordResetAt:new Date().toISOString()};
      const script="if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); redis.call('DEL',KEYS[2]); return 1";
      if(!await 명령("EVAL",script,2,key,`student:rate:login-id:${id}`,raw,JSON.stringify(updated)))return res.status(409).json({error:"다른 창에서 계정이 변경됐습니다. 새로고침 후 다시 시도해 주세요."});
      return res.status(200).json({ok:true,id});
    }
    if(received.action&&received.action!=="list")return res.status(400).json({error:"지원하지 않는 작업입니다."});
    const keys = await accountIds(), today = koreaDate(), students = [],reviewNow=Date.now(),weekAgo=reviewNow-7*86400000,classConcepts=new Map();
    for (const key of keys) {
      const id = key.slice("student:account:".length);
      const [accountRaw, dataRaw] = await Promise.all([명령("GET", key), 명령("GET", `student:data:${id}`)]);
      if (!accountRaw) continue;
      const account = JSON.parse(accountRaw), data = dataRaw ? JSON.parse(dataRaw) : {};
      const records = Array.isArray(data.records) ? data.records : [];
      const notes = Array.isArray(data.notes) ? data.notes.filter(note=>note&&typeof note==="object") : [];
      const stats = data.stats && typeof data.stats === "object" ? Object.values(data.stats).filter(row=>row&&typeof row==="object") : [];
      const weak = stats.filter(row => Number(row.attempts) > 0).sort((a, b) => rate(a) - rate(b) || Number(b.attempts) - Number(a.attempts))[0] || null;
      const todayRecords = records.filter(row => row.date === today);
      const recent = records.slice().sort((a, b) => String(b.finishedAt || b.date).localeCompare(String(a.finishedAt || a.date)))[0];
      const totalQuestions = records.reduce((sum, row) => sum + (Number(row.total) || 5), 0);
      const totalCorrect = records.reduce((sum, row) => sum + (Number(row.correct) || 0), 0);
      const grade=String(data.profile?.grade||data.pref?.grade||""),className=String(data.profile?.className||""),groupKey=grade&&className?`${grade}-${className}`:"unset";
      const diagnostics=diagnosticSummary(data.profile,reviewNow,stats,notes),trackKey=String(data.profile?.track||data.pref?.track||'');
      const lastAt=newest(recent?.finishedAt,...stats.map(row=>row.lastAt),...notes.map(note=>note.masteredAt||note.lastWrongAt||note.createdAt),...diagnostics.map(row=>row.completedAt));
      const notStarted=!lastAt&&records.length===0&&!stats.some(row=>Number(row.attempts)>0)&&notes.length===0;
      const inactive7=Date.parse(account.createdAt)<weekAgo&&(!lastAt||Date.parse(lastAt)<weekAgo);
      const concepts=classConcepts.get(groupKey)||new Map(),seen=new Set();
      stats.filter(row=>Number(row.attempts)>0).forEach(row=>{
        const key=row.conceptId||row.key||`${row.subject||""}|${row.name||"기타"}`;if(seen.has(key))return;seen.add(key);
        const concept=concepts.get(key)||{key,name:row.name||"기타",students:0,weakStudents:0,rateSum:0};
        concept.students++;concept.rateSum+=rate(row);if(rate(row)<60)concept.weakStudents++;concepts.set(key,concept);
      });classConcepts.set(groupKey,concepts);
      students.push({
        id, name: account.name || "", grade, className, track: String(data.profile?.track || data.pref?.track || ""),
        joinedAt: account.createdAt || "", lastAt,notStarted,inactive7,
        studyCount: records.length, todayDone: todayRecords.length > 0, todayScore: todayRecords.length ? Math.max(...todayRecords.map(row => Number(row.correct) || 0)) : null,
        average: totalQuestions ? Math.round(totalCorrect / totalQuestions * 100) : null, activeWrong: notes.filter(note => !note.mastered).length, mastered: notes.filter(note => note.mastered).length,
        weakest: weak ? { name: weak.name || "기타", rate: rate(weak), attempts: Number(weak.attempts) || 0 } : null,
        analysis:studyAnalysis(notes,stats),review:reviewSummary(notes,reviewNow),diagnostics,weeklyPlan:weeklyPlan({grade,track:trackKey,diagnostics,notes,now:reviewNow}),
      });
    }
    students.sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)) || a.id.localeCompare(b.id));
    const groups = new Map();
    students.forEach(student => {
      const key = student.grade && student.className ? `${student.grade}-${student.className}` : "unset";
      const row = groups.get(key) || { key, grade: student.grade || "", className: student.className || "", students: 0, active7: 0, today: 0, activeWrong: 0, scoreSum: 0, scoreCount: 0,inactive7:0,notStarted:0,analysis:studyAnalysis([],[]) };
      row.students++; if (Date.parse(student.lastAt) >= weekAgo) row.active7++; if (student.todayDone) row.today++; row.activeWrong += student.activeWrong;
      if (student.average !== null) { row.scoreSum += student.average; row.scoreCount++; }
      if(student.inactive7)row.inactive7++;if(student.notStarted)row.notStarted++;
      row.analysis.reasons.forEach((reason,index)=>reason.count+=student.analysis.reasons[index].count);Object.keys(row.analysis.hints).forEach(key=>row.analysis.hints[key]+=student.analysis.hints[key]);row.analysis.savedHintNotes+=student.analysis.savedHintNotes;
      groups.set(key, row);
    });
    const classes = [...groups.values()].map(({ scoreSum, scoreCount, ...row }) => ({ ...row, average: scoreCount ? Math.round(scoreSum / scoreCount) : null,
      weakConcepts:row.key==="unset"?[]:[...(classConcepts.get(row.key)||new Map()).values()].filter(concept=>concept.students>=2&&concept.weakStudents>=2).map(({rateSum,...concept})=>({...concept,rate:Math.round(rateSum/concept.students)})).sort((a,b)=>b.weakStudents-a.weakStudents||a.rate-b.rate||a.name.localeCompare(b.name,"ko")).slice(0,3)
    }))
      .sort((a, b) => a.key === "unset" ? 1 : b.key === "unset" ? -1 : Number(a.grade) - Number(b.grade) || Number(a.className) - Number(b.className));
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      summary: { total: students.length, active7: students.filter(s => Date.parse(s.lastAt) >= weekAgo).length, today: students.filter(s => s.todayDone).length, activeWrong: students.reduce((sum, s) => sum + s.activeWrong, 0),inactive7:students.filter(s=>s.inactive7).length,notStarted:students.filter(s=>s.notStarted).length },
      classes, students,
    });
  } catch (error) {
    console.error("student admin error", error);
    return res.status(500).json({ error: "학생 학습 현황을 불러오지 못했습니다." });
  }
};
