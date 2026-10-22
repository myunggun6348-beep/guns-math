/* 기출 문제지 만들기 — 단원 검색 → 문항 고르기 → A4 문제지.
   문항 목록은 assets/exam-questions.json(최근 3년 EBSi 기출 전 문항의 시험·번호·쪽·배점·형식·과목·단원·유형·출제의도).
   선생님이 '분류 고치기' 로 바꾼 것은 /api/worksheet-tags 에 따로 있고, 그쪽이 이깁니다.
   문제 그림은 사이트에 저장하지 않고, 바로 풀기 화면처럼 EBSi 원본 PDF 를 열어 그 자리에서 오립니다.
   오리는 자리: 그 쪽 글자 중 단 왼쪽 끝에 있는 'N.' 을 찾아, 같은 단의 다음 번호 바로 위(없으면 쪽 아래)까지. */
import * as pdfjsLib from "./vendor/pdfjs/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.mjs";

const $ = id => document.getElementById(id);
const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const results = $("wsResults"), sheet = $("wsSheet"), query = $("wsQuery");
let exams = new Map(), rows = [], fixes = {}, found = [], picked = new Set();
const filter = { grade: "", pts: "", mc: "" };
const 많으면 = 20; // 이보다 많이 찾으면 처음엔 아무것도 고르지 않음 — 수십 문항짜리 문제지가 실수로 만들어지지 않게

// 과목은 2015·2022 교육과정 이름이 섞여 있어서 어느 이름으로 찾아도 나오게
const 다른이름 = { "수학Ⅰ": "대수 수학1 수1", "수학Ⅱ": "미적분Ⅰ 미적분1 수학2 수2", "미적분": "미적분Ⅱ 미적분2 미적", "확률과 통계": "확통", "공통수학1": "수학(상) 수학상", "공통수학2": "수학(하) 수학하", "중학 복습": "중학교 중3" };
const ord = new Map();

// '속도와 거리' → ['속도','거리'] : 낱말이 모두 들어 있으면 찾음(띄어쓰기 무시)
const words = text => text.split(/[\s,]+/).flatMap(w => w.split(/[와과](?=.)/)).map(w => w.replace(/[와과]$/, "")).filter(Boolean);
const flat = text => text.replace(/\s+/g, "").toLowerCase();
const tagOf = row => fixes[row.id] || row;

function examName(row) {
  const exam = exams.get(row.exam);
  return exam ? (exam.examYear ? exam.examYear + " " : "") + exam.title + (row.label ? " · " + row.label : "") : row.exam;
}

function index() {
  // 처음 화면: 과목마다 단원 칩
  const byCourse = new Map();
  rows.forEach(row => { const t = tagOf(row); if (!byCourse.has(t.c)) byCourse.set(t.c, new Set()); byCourse.get(t.c).add(t.u); });
  return '<p class="ws-hint">단원이나 유형을 넣으세요. 눌러서 바로 찾을 수도 있어요.</p>' + [...byCourse].sort((a, b) => (ord.get(a[0]) ?? 99) - (ord.get(b[0]) ?? 99)).map(([c, units]) =>
    '<div class="ws-course"><b>' + esc(c) + '</b><div class="ws-chips">' + [...units].map(u => '<button type="button" data-q="' + esc(u) + '">' + esc(u) + "</button>").join("") + "</div></div>").join("");
}

function search() {
  const ws = words(query.value.trim()).map(flat);
  if (!ws.length) { found = []; results.innerHTML = index(); return; }
  found = rows.filter(row => {
    const exam = exams.get(row.exam), t = tagOf(row);
    if (!exam || (filter.grade && exam.grade !== filter.grade) || (filter.pts && String(row.pts) !== filter.pts) || (filter.mc && String(row.mc) !== filter.mc)) return false;
    const hay = flat([t.c, 다른이름[t.c] || "", t.u, t.t, row.intent, examName(row)].join(" "));
    return ws.every(w => hay.includes(w));
  }).sort((a, b) => {
    const A = tagOf(a), B = tagOf(b), x = exams.get(a.exam), y = exams.get(b.exam);
    return (ord.get(A.c) ?? 99) - (ord.get(B.c) ?? 99) || A.u.localeCompare(B.u, "ko") || A.t.localeCompare(B.t, "ko") || x.grade.localeCompare(y.grade) || y.examDate.localeCompare(x.examDate) || a.number - b.number;
  });
  picked = found.length <= 많으면 ? new Set(found.map(r => r.id)) : new Set();
  draw();
}

function barText() {
  return "<b>" + found.length + "문항</b> 찾음 · " + picked.size + "개 고름" + (found.length > 많으면 && !picked.size ? " — 많아서 비워 뒀어요. 골라 주세요." : "");
}

function draw() {
  if (!found.length) {
    results.innerHTML = '<p class="ws-hint">맞는 기출을 찾지 못했어요. 더 짧게(예: ‘거리’) 넣어 보거나 학년·배점을 ‘전체’로 바꿔 보세요.</p>';
    return;
  }
  let group = "";
  results.innerHTML = '<div class="ws-bar"><span>' + barText() + '</span><span class="ws-bar-links"><button type="button" class="ws-link" data-all="1">모두 고르기</button><button type="button" class="ws-link" data-all="0">모두 빼기</button></span></div><ul class="ws-list">' +
    found.map(row => {
      const t = tagOf(row), g = t.c + " › " + t.u + " › " + t.t;
      const head = g !== group ? '<li class="ws-group">' + esc(g) + "</li>" : ""; group = g;
      return head + '<li data-row="' + esc(row.id) + '"><label><input type="checkbox" data-key="' + esc(row.id) + '"' + (picked.has(row.id) ? " checked" : "") + '><span><b>' + esc(row.intent || t.t) + '</b><small>' + esc(examName(row)) + " " + row.number + "번" + (row.pts ? " · " + row.pts + "점" : "") + " · " + (row.mc ? "객관식" : "단답형") + (fixes[row.id] ? " · 고친 분류" : "") + '</small></span></label><button type="button" class="ws-link ws-fix-open" data-fix="' + esc(row.id) + '">분류 고치기</button></li>';
    }).join("") +
    '</ul><button type="button" class="ws-make" id="wsMake"' + (picked.size ? "" : " disabled") + ">문제지 만들기 (" + picked.size + "문항)</button>";
}

/* ---------- 분류 고치기 (선생님 방 암호) ---------- */
const 암호열쇠 = "수학을보다-암호"; // 선생님 방·문항 관리와 같은 이름 — 거기서 기억해 뒀으면 다시 묻지 않음
const stored = () => { try { return localStorage.getItem(암호열쇠) || sessionStorage.getItem(암호열쇠) || ""; } catch { return ""; } };
const post = body => fetch("/api/worksheet-tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async r => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }));
async function password() {
  const saved = stored(); if (saved) return saved;
  const pw = prompt("분류를 고치려면 선생님 방 암호를 넣어 주세요."); if (!pw) return "";
  const r = await post({ password: pw, check: true });
  if (!r.ok) { alert(r.data.오류 || "암호를 확인하지 못했습니다."); return ""; }
  try { sessionStorage.setItem(암호열쇠, pw); } catch { /* 저장 못 해도 이번엔 씀 */ }
  return pw;
}
function openFix(id) {
  const li = results.querySelector('[data-row="' + CSS.escape(id) + '"]'); if (!li || li.querySelector(".ws-fix")) return;
  const row = rows.find(r => r.id === id), t = tagOf(row);
  li.insertAdjacentHTML("beforeend", '<form class="ws-fix"><label>과목<input name="c" list="wsCourses" value="' + esc(t.c) + '" maxlength="40" required></label><label>단원<input name="u" list="wsUnits" value="' + esc(t.u) + '" maxlength="40" required></label><label>유형<input name="t" list="wsTypes" value="' + esc(t.t) + '" maxlength="40" required></label><div class="ws-fix-actions"><button type="submit" class="ws-make">저장</button>' + (fixes[id] ? '<button type="button" class="ws-link" data-reset="1">원래 분류로</button>' : "") + '<button type="button" class="ws-link" data-close="1">닫기</button><span class="ws-note" role="status"></span></div></form>');
  const form = li.querySelector(".ws-fix"), note = form.querySelector(".ws-note");
  const send = async body => {
    const pw = await password(); if (!pw) return;
    note.textContent = "저장 중…";
    const r = await post({ password: pw, id, ...body });
    if (r.status === 401) { try { sessionStorage.removeItem(암호열쇠); } catch { /* 없음 */ } note.textContent = "암호가 맞지 않습니다. 다시 눌러 주세요."; return; }
    if (!r.ok) { note.textContent = r.data.오류 || "저장하지 못했습니다."; return; }
    if (body.reset) delete fixes[id]; else fixes[id] = r.data;
    draw();
  };
  form.onsubmit = e => { e.preventDefault(); send({ c: form.c.value.trim(), u: form.u.value.trim(), t: form.t.value.trim() }); };
  form.querySelector("[data-close]").onclick = () => form.remove();
  form.querySelector("[data-reset]")?.addEventListener("click", () => send({ reset: true }));
}

results.addEventListener("click", e => {
  const chip = e.target.closest("[data-q]");
  if (chip) { query.value = chip.dataset.q; search(); return; }
  const all = e.target.closest("[data-all]");
  if (all) { picked = all.dataset.all === "1" ? new Set(found.map(r => r.id)) : new Set(); draw(); return; }
  const fix = e.target.closest("[data-fix]");
  if (fix) { openFix(fix.dataset.fix); return; }
  if (e.target.id === "wsMake") make();
});
results.addEventListener("change", e => {
  const k = e.target.dataset.key; if (!k) return;
  e.target.checked ? picked.add(k) : picked.delete(k);
  // 다시 그리지 않고 숫자만 — 다시 그리면 펼쳐 둔 '분류 고치기' 가 닫힙니다
  results.querySelector(".ws-bar span").innerHTML = barText();
  const btn = $("wsMake"); btn.disabled = !picked.size; btn.textContent = "문제지 만들기 (" + picked.size + "문항)";
});
query.addEventListener("input", search);
$("wsSearch").addEventListener("submit", e => { e.preventDefault(); search(); });
document.querySelectorAll("[data-filter]").forEach(box => box.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  filter[box.dataset.filter] = b.dataset.v;
  box.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
  search();
}));

/* ---------- 오리기 ---------- */
const docs = new Map(), pages = new Map();
// 받다가 끊기면 기억해 둔 실패를 지워서 다음에 다시 받게 합니다(배포 뒤 시험에서 9문항 중 1문항이 한 번 끊겼습니다)
const getDoc = url => { if (!docs.has(url)) docs.set(url, pdfjsLib.getDocument({ url }).promise.catch(e => { docs.delete(url); throw e; })); return docs.get(url); };
const SCALE = 2.2;

async function pageInfo(url, no) {
  const id = url + "#" + no;
  if (!pages.has(id)) pages.set(id, (async () => {
    const page = await (await getDoc(url)).getPage(no), vp = page.getViewport({ scale: 1 }), W = vp.width, H = vp.height;
    const items = (await page.getTextContent()).items.map(i => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5], h: i.height, w: i.width }));
    // 문항 번호: 'N.' 이 단 왼쪽 끝(왼쪽 단 또는 가운데 바로 오른쪽)에 있고 글자가 가장 큰 것들
    const edge = i => i.x < W * .15 || (i.x > W * .48 && i.x < W * .58);
    let marks = items.filter(i => /^\d{1,2}\.$/.test(i.s) && edge(i));
    const big = Math.max(0, ...marks.map(m => m.h)); marks = marks.filter(m => m.h >= big - 1.5);
    // 마침표 없이 '27' 만 찍힌 시험지가 있습니다 — 다른 번호와 글자 크기가 같은 것만 번호로 칩니다
    // (쪽 번호는 더 크거나 작아서 빠집니다)
    if (big) marks.push(...items.filter(i => /^\d{1,2}$/.test(i.s) && edge(i) && Math.abs(i.h - big) <= 1).map(i => ({ ...i, s: i.s + "." })));
    return { page, W, H, marks, canvas: null };
  })());
  return pages.get(id);
}

async function cut(row, newNo) {
  const exam = exams.get(row.exam), url = exam?.sets.find(s => s.subject === row.subject)?.files?.problem?.url;
  if (!url) throw new Error("원본 없음");
  const doc = await getDoc(url), order = [row.page, ...Array.from({ length: doc.numPages }, (_, i) => i + 1).filter(p => p !== row.page)];
  let info, mark;
  for (const no of order) { info = await pageInfo(url, no); mark = info.marks.find(m => m.s === row.number + "."); if (mark) break; }
  if (!mark) throw new Error("번호를 찾지 못함");
  if (!info.canvas) {
    const vp = info.page.getViewport({ scale: SCALE }), c = document.createElement("canvas");
    c.width = vp.width; c.height = vp.height;
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    await info.page.render({ canvasContext: ctx, viewport: vp }).promise;
    info.canvas = c;
  }
  const { W, H } = info, left = mark.x < W / 2;
  const next = info.marks.filter(m => (m.x < W / 2) === left && m.y < mark.y - 1).sort((a, b) => b.y - a.y)[0];
  const x0 = mark.x - 8, x1 = left ? W / 2 - 3 : W * .915, top = mark.y + mark.h + 6, bottom = next ? next.y + next.h + 6 : H * .085;
  const sw = Math.round((x1 - x0) * SCALE); let sh = Math.round((top - bottom) * SCALE);
  const out = document.createElement("canvas"); out.width = sw; out.height = sh;
  const ctx = out.getContext("2d");
  ctx.drawImage(info.canvas, Math.round(x0 * SCALE), Math.round((H - top) * SCALE), sw, sh, 0, 0, sw, sh);
  // 위: 쪽 머리의 가로줄이 걸리면 지웁니다(가로로 절반 넘게 검은 줄).
  // 아래: 문제가 끝나고 빈 줄이 50pt 넘게 이어지면 거기서 자릅니다 — 쪽 맨 아래의 넘김 화살표(→) 같은 것이 따라오지 않게.
  // 단 사이 세로줄(위아래로 길게 이어진 검은 칸)은 먼저 지웁니다 — 남아 있으면 빈 줄을 못 찾습니다
  let px = ctx.getImageData(0, 0, sw, sh).data;
  ctx.fillStyle = "#fff";
  for (let x = 0; x < sw; x++) { let n = 0; for (let y = 0; y < sh; y += 2) if (px[(y * sw + x) * 4] < 170) n++; if (n > sh * .3) ctx.fillRect(x - 1, 0, 3, sh); }
  px = ctx.getImageData(0, 0, sw, sh).data;
  const dark = y => { let n = 0; for (let x = 0; x < sw; x += 2) if (px[(y * sw + x) * 4] < 170) n++; return n; };
  for (let y = 0; y < 10 * SCALE; y++) if (dark(y) > sw / 4) ctx.fillRect(0, y - 2, sw, 5);
  let last = 0, gap = 0;
  for (let y = 10 * SCALE; y < sh; y++) { if (dark(y)) { last = y; gap = 0; } else if (last && ++gap > 50 * SCALE) break; }
  sh = Math.max(20, Math.min(sh, last + 14));
  // 원래 번호를 지우고 새 번호를 그 자리에
  const nx = 8 * SCALE, nw = (mark.w + 4) * SCALE, nh = (mark.h + 4) * SCALE, ny = 6 * SCALE;
  ctx.fillStyle = "#fff"; ctx.fillRect(nx - 2, ny, nw, nh);
  ctx.fillStyle = "#111"; ctx.font = "700 " + Math.round(mark.h * SCALE) + "px Pretendard, sans-serif"; ctx.textBaseline = "top";
  ctx.fillText(newNo + ".", nx, ny + 2 * SCALE);
  const fin = document.createElement("canvas"); fin.width = sw; fin.height = sh;
  fin.getContext("2d").drawImage(out, 0, 0);
  return fin.toDataURL("image/png");
}

async function make() {
  const list = found.filter(row => picked.has(row.id));
  if (!list.length) return;
  const title = (query.value.trim() || "기출") + " 기출 문제지";
  // 정답 그림은 시험·과목마다 한 장
  const keys = new Map();
  list.forEach((row, i) => {
    const set = exams.get(row.exam).sets.find(s => s.subject === row.subject), id = row.exam + "|" + (row.label || row.subject);
    if (!keys.has(id)) keys.set(id, { name: examName(row), url: set?.files?.answer?.url, solution: set?.files?.solution?.url, nos: [] });
    keys.get(id).nos.push((i + 1) + "번 ← " + row.number + "번");
  });
  sheet.hidden = false; document.querySelector(".ws-tools").hidden = true;
  sheet.innerHTML = '<div class="ws-sheet-bar"><button type="button" class="ws-make" id="wsPrint" disabled>문제를 오리는 중…</button><button type="button" class="ws-link" id="wsBack">← 다시 고르기</button><span class="ws-note">제목은 눌러서 고칠 수 있어요. 인쇄 창에서 ‘PDF로 저장’을 고르면 파일로 남습니다.</span></div>' +
    '<article class="ws-paper"><header class="ws-paper-head"><h2 contenteditable="true" spellcheck="false">' + esc(title) + '</h2><p>학번 ________ 이름 ______________</p></header><ol class="ws-qs">' +
    list.map((row, i) => '<li class="ws-q" id="wsQ' + i + '"><div class="ws-q-wait">' + (i + 1) + '번 불러오는 중…</div><p class="ws-q-src">' + esc(examName(row)) + " " + row.number + "번</p></li>").join("") +
    '</ol></article><article class="ws-paper ws-answers"><header class="ws-paper-head"><h2>정답</h2></header><table><thead><tr><th>문제지</th><th>출처</th></tr></thead><tbody>' +
    list.map((row, i) => "<tr><td>" + (i + 1) + "번</td><td>" + esc(examName(row)) + " " + row.number + "번 · " + esc(row.intent || tagOf(row).t) + "</td></tr>").join("") +
    '</tbody></table><div class="ws-keys">' +
    [...keys.values()].map(k => '<figure><figcaption><b>' + esc(k.name) + "</b> 정답표<small>" + esc(k.nos.join(" · ")) + "</small></figcaption>" + (k.url ? '<img src="' + esc(k.url) + '" alt="' + esc(k.name) + ' 정답표" referrerpolicy="no-referrer">' : "") + (k.solution ? '<a class="ws-link ws-screen" target="_blank" rel="noopener" href="' + esc(k.solution) + '">해설 PDF 열기 →</a>' : "") + "</figure>").join("") +
    '</div><p class="ws-credit">문항 출처: EBSi 기출문제(한국교육과정평가원·시도교육청). 수업용으로만 쓰세요.</p></article>';
  $("wsBack").onclick = () => { sheet.hidden = true; document.querySelector(".ws-tools").hidden = false; };
  scrollTo(0, 0);
  let failed = 0;
  for (const [i, row] of list.entries()) {
    const li = $("wsQ" + i);
    try { const src = await cut(row, i + 1).catch(() => cut(row, i + 1)); li.querySelector(".ws-q-wait").outerHTML = '<img src="' + src + '" alt="' + (i + 1) + '번 문제">'; }
    catch { failed++; li.querySelector(".ws-q-wait").textContent = (i + 1) + "번은 원본에서 오리지 못했어요. 출처를 보고 원본을 확인해 주세요."; }
  }
  const btn = $("wsPrint"); btn.disabled = false; btn.textContent = "인쇄 · PDF 저장"; btn.onclick = () => print();
  if (failed) btn.insertAdjacentHTML("afterend", '<span class="ws-note">' + failed + "문항은 오리지 못했어요.</span>");
}

/* ---------- 시작 ---------- */
Promise.all([
  fetch("assets/exam-catalog.json").then(r => r.json()),
  fetch("assets/exam-questions.json").then(r => r.json()),
  fetch("/api/worksheet-tags").then(r => r.ok ? r.json() : {}).catch(() => ({})),
]).then(([catalog, bank, saved]) => {
  exams = new Map(catalog.items.map(x => [x.id, x]));
  bank.courses.forEach((c, i) => ord.set(c, i));
  rows = bank.items.map(q => ({ id: q.e + "|" + (q.l || q.s) + "|" + q.n, exam: q.e, subject: q.s, label: q.l || "", number: q.n, page: q.p, pts: q.pt, mc: q.mc, intent: q.i || "", c: q.c, u: q.u, t: q.t }));
  fixes = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  const list = (key, id) => { $(id).innerHTML = [...new Set(rows.map(r => tagOf(r)[key]))].sort((a, b) => a.localeCompare(b, "ko")).map(v => '<option value="' + esc(v) + '">').join(""); };
  list("c", "wsCourses"); list("u", "wsUnits"); list("t", "wsTypes");
  $("wsSuggest").innerHTML = [...new Set(rows.flatMap(r => [tagOf(r).u, tagOf(r).t]))].map(t => '<option value="' + esc(t) + '">').join("");
  const q = new URLSearchParams(location.search).get("q");
  if (q) query.value = q;
  search();
}).catch(() => { results.innerHTML = '<p class="ws-hint">기출 목록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>'; });
