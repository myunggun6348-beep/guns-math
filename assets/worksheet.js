/* 기출 문제지 만들기 — 단원 검색 → 문항 고르기 → A4 문제지.
   문항 목록은 개념별 기출 연습과 같은 window.PAST_PRACTICE(시험·과목·번호·쪽·유형)를 씁니다.
   문제 그림은 사이트에 저장하지 않고, 바로 풀기 화면처럼 EBSi 원본 PDF 를 열어 그 자리에서 오립니다.
   오리는 자리: 그 쪽 글자 중 단 왼쪽 끝에 있는 'N.' 을 찾아, 같은 단의 다음 번호 바로 위(없으면 쪽 아래)까지. */
import * as pdfjsLib from "./vendor/pdfjs/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.mjs";

const $ = id => document.getElementById(id);
const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const concepts = window.TODAY_CONCEPTS || {}, bank = window.PAST_PRACTICE || {};
const results = $("wsResults"), sheet = $("wsSheet"), query = $("wsQuery");
let exams = new Map(), grade = "", found = [], picked = new Set();

// 모든 문항을 한 줄로 — 검색할 글은 단원 이름·유형·과목
const rows = Object.entries(bank).flatMap(([key, list]) => list.map(row => ({ ...row, key, concept: concepts[key]?.name || "" })));
const keyOf = row => row.exam + "|" + row.subject + "|" + row.number;

// '속도와 거리' → ['속도','거리'] : 낱말이 모두 들어 있으면 찾음(띄어쓰기 무시)
const words = text => text.split(/[\s,]+/).flatMap(w => w.split(/[와과](?=.)/)).map(w => w.replace(/[와과]$/, "")).filter(Boolean);
const flat = text => text.replace(/\s+/g, "").toLowerCase();

function examName(row) {
  const exam = exams.get(row.exam);
  return exam ? (exam.examYear ? exam.examYear + " " : "") + exam.title + (exam.grade === "3" ? " · " + row.subject : "") : row.exam;
}

function search() {
  const ws = words(query.value.trim()).map(flat);
  if (!ws.length) {
    results.innerHTML = '<p class="ws-hint">단원 이름을 넣으세요. 눌러서 바로 찾을 수도 있어요.</p><div class="ws-chips">' +
      Object.keys(bank).filter(k => concepts[k]).map(k => '<button type="button" data-q="' + esc(concepts[k].name) + '">' + esc(concepts[k].name) + "</button>").join("") + "</div>";
    return;
  }
  const seen = new Set();
  found = rows.filter(row => {
    const exam = exams.get(row.exam);
    if (!exam || (grade && exam.grade !== grade) || seen.has(keyOf(row))) return false;
    const hay = flat(row.concept + row.intent + row.subject);
    if (!ws.every(w => hay.includes(w))) return false;
    seen.add(keyOf(row)); return true;
  }).sort((a, b) => {
    const A = exams.get(a.exam), B = exams.get(b.exam);
    return A.grade.localeCompare(B.grade) || B.examDate.localeCompare(A.examDate) || a.number - b.number;
  });
  picked = new Set(found.map(keyOf));
  draw();
}

function draw() {
  if (!found.length) {
    results.innerHTML = '<p class="ws-hint">맞는 기출을 아직 찾지 못했어요. 더 짧게(예: ‘거리’) 넣어 보거나 학년을 ‘전체’로 바꿔 보세요.<br><small>지금은 분류해 둔 ' + rows.length + "문항 안에서 찾습니다.</small></p>";
    return;
  }
  results.innerHTML = '<div class="ws-bar"><span><b>' + found.length + "문항</b> 찾음 · " + picked.size + '개 고름</span><span class="ws-bar-links"><button type="button" class="ws-link" data-all="1">모두 고르기</button><button type="button" class="ws-link" data-all="0">모두 빼기</button></span></div><ul class="ws-list">' +
    found.map(row => { const k = keyOf(row); return '<li><label><input type="checkbox" data-key="' + esc(k) + '"' + (picked.has(k) ? " checked" : "") + '><span><b>' + esc(row.intent) + '</b><small>' + esc(examName(row)) + " " + row.number + "번</small></span></label></li>"; }).join("") +
    '</ul><button type="button" class="ws-make" id="wsMake"' + (picked.size ? "" : " disabled") + ">문제지 만들기 (" + picked.size + "문항)</button>";
}

results.addEventListener("click", e => {
  const chip = e.target.closest("[data-q]");
  if (chip) { query.value = chip.dataset.q; search(); return; }
  const all = e.target.closest("[data-all]");
  if (all) { picked = all.dataset.all === "1" ? new Set(found.map(keyOf)) : new Set(); draw(); return; }
  if (e.target.id === "wsMake") make();
});
results.addEventListener("change", e => {
  const k = e.target.dataset.key; if (!k) return;
  e.target.checked ? picked.add(k) : picked.delete(k);
  draw();
});
query.addEventListener("input", search);
$("wsSearch").addEventListener("submit", e => { e.preventDefault(); search(); });
$("wsGrades").addEventListener("click", e => {
  const b = e.target.closest("[data-grade]"); if (!b) return;
  grade = b.dataset.grade;
  $("wsGrades").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
  search();
});

/* ---------- 오리기 ---------- */
const docs = new Map(), pages = new Map();
const getDoc = url => { if (!docs.has(url)) docs.set(url, pdfjsLib.getDocument({ url }).promise); return docs.get(url); };
const SCALE = 2.2;

async function pageInfo(url, no) {
  const id = url + "#" + no;
  if (!pages.has(id)) pages.set(id, (async () => {
    const page = await (await getDoc(url)).getPage(no), vp = page.getViewport({ scale: 1 }), W = vp.width, H = vp.height;
    const items = (await page.getTextContent()).items.map(i => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5], h: i.height, w: i.width }));
    // 문항 번호: 'N.' 이 단 왼쪽 끝(왼쪽 단 또는 가운데 바로 오른쪽)에 있고 글자가 가장 큰 것들
    let marks = items.filter(i => /^\d{1,2}\.$/.test(i.s) && (i.x < W * .15 || (i.x > W * .48 && i.x < W * .58)));
    const big = Math.max(0, ...marks.map(m => m.h)); marks = marks.filter(m => m.h >= big - 1.5);
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
  const list = found.filter(row => picked.has(keyOf(row)));
  if (!list.length) return;
  const title = (query.value.trim() || "기출") + " 기출 문제지";
  // 정답 그림은 시험·과목마다 한 장
  const keys = new Map();
  list.forEach((row, i) => {
    const set = exams.get(row.exam).sets.find(s => s.subject === row.subject), id = row.exam + "|" + row.subject;
    if (!keys.has(id)) keys.set(id, { name: examName(row), url: set?.files?.answer?.url, solution: set?.files?.solution?.url, nos: [] });
    keys.get(id).nos.push((i + 1) + "번 ← " + row.number + "번");
  });
  sheet.hidden = false; document.querySelector(".ws-tools").hidden = true;
  sheet.innerHTML = '<div class="ws-sheet-bar"><button type="button" class="ws-make" id="wsPrint" disabled>문제를 오리는 중…</button><button type="button" class="ws-link" id="wsBack">← 다시 고르기</button><span class="ws-note">제목은 눌러서 고칠 수 있어요. 인쇄 창에서 ‘PDF로 저장’을 고르면 파일로 남습니다.</span></div>' +
    '<article class="ws-paper"><header class="ws-paper-head"><h2 contenteditable="true" spellcheck="false">' + esc(title) + '</h2><p>학번 ________ 이름 ______________</p></header><ol class="ws-qs">' +
    list.map((row, i) => '<li class="ws-q" id="wsQ' + i + '"><div class="ws-q-wait">' + (i + 1) + '번 불러오는 중…</div><p class="ws-q-src">' + esc(examName(row)) + " " + row.number + "번</p></li>").join("") +
    '</ol></article><article class="ws-paper ws-answers"><header class="ws-paper-head"><h2>정답</h2></header><table><thead><tr><th>문제지</th><th>출처</th></tr></thead><tbody>' +
    list.map((row, i) => "<tr><td>" + (i + 1) + "번</td><td>" + esc(examName(row)) + " " + row.number + "번 · " + esc(row.intent) + "</td></tr>").join("") +
    '</tbody></table><div class="ws-keys">' +
    [...keys.values()].map(k => '<figure><figcaption><b>' + esc(k.name) + "</b> 정답표<small>" + esc(k.nos.join(" · ")) + "</small></figcaption>" + (k.url ? '<img src="' + esc(k.url) + '" alt="' + esc(k.name) + ' 정답표" referrerpolicy="no-referrer">' : "") + (k.solution ? '<a class="ws-link ws-screen" target="_blank" rel="noopener" href="' + esc(k.solution) + '">해설 PDF 열기 →</a>' : "") + "</figure>").join("") +
    '</div><p class="ws-credit">문항 출처: EBSi 기출문제(한국교육과정평가원·시도교육청). 수업용으로만 쓰세요.</p></article>';
  $("wsBack").onclick = () => { sheet.hidden = true; document.querySelector(".ws-tools").hidden = false; };
  scrollTo(0, 0);
  let failed = 0;
  for (const [i, row] of list.entries()) {
    const li = $("wsQ" + i);
    try { const src = await cut(row, i + 1); li.querySelector(".ws-q-wait").outerHTML = '<img src="' + src + '" alt="' + (i + 1) + '번 문제">'; }
    catch { failed++; li.querySelector(".ws-q-wait").textContent = (i + 1) + "번은 원본에서 오리지 못했어요. 출처를 보고 원본을 확인해 주세요."; }
  }
  const btn = $("wsPrint"); btn.disabled = false; btn.textContent = "인쇄 · PDF 저장"; btn.onclick = () => print();
  if (failed) btn.insertAdjacentHTML("afterend", '<span class="ws-note">' + failed + "문항은 오리지 못했어요.</span>");
}

/* ---------- 시작 ---------- */
document.getElementById("wsSuggest").innerHTML = [...new Set(rows.flatMap(r => [r.concept, r.intent]).filter(Boolean))].map(t => '<option value="' + esc(t) + '">').join("");
fetch("assets/exam-catalog.json").then(r => r.json()).then(data => {
  exams = new Map(data.items.map(x => [x.id, x]));
  const q = new URLSearchParams(location.search).get("q");
  if (q) query.value = q;
  search();
}).catch(() => { results.innerHTML = '<p class="ws-hint">기출 목록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>'; });
