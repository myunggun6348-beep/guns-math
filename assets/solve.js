import * as pdfjsLib from "./vendor/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.mjs";

const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const state = {
  pdf: null,
  item: null,
  subjectSet: null,
  page: 1,
  pageCount: 0,
  zoom: 1,
  tool: "pen",
  penColor: "#19364a",
  highlighterColor: "#ffd928",
  penSize: 2,
  highlighterSize: 3,
  showGrid: false,
  showAxes: false,
  snapToGrid: false,
  pages: {},
  undo: {},
  redo: {},
  drawing: false,
  activeStroke: null,
  actionBefore: null,
  renderTask: null,
  renderSerial: 0,
  saveTimer: null,
  clearTimer: null,
  timerElapsed: 0,
  timerStartedAt: 0,
  timerId: null,
  timerLimit: 100,
  timerEnded: false,
  timerOvertime: false,
  db: null,
  docKey: ""
};

try {
  const toolPrefs = JSON.parse(localStorage.getItem("math-solve-tool-prefs") || "{}");
  if (/^#[0-9a-f]{6}$/i.test(toolPrefs.penColor || "")) state.penColor = toolPrefs.penColor;
  if (/^#[0-9a-f]{6}$/i.test(toolPrefs.highlighterColor || "")) state.highlighterColor = toolPrefs.highlighterColor;
  if ([1,2,3,4,5].includes(toolPrefs.penSize)) state.penSize = toolPrefs.penSize;
  if ([1,2,3,4,5].includes(toolPrefs.highlighterSize)) state.highlighterSize = toolPrefs.highlighterSize;
  state.showGrid = Boolean(toolPrefs.showGrid);
  state.showAxes = Boolean(toolPrefs.showAxes);
  state.snapToGrid = Boolean(toolPrefs.snapToGrid);
} catch {}
const paper = $("#paper");
const area = $("#documentArea");
const pdfCanvas = $("#pdfCanvas");
const inkCanvas = $("#inkCanvas");
const pdfContext = pdfCanvas.getContext("2d", { alpha: false });
const inkContext = inkCanvas.getContext("2d");

function toast(message) {
  const node = $("#solveToast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove("show"), 1800);
}

function setLoading(title, detail = "", error = false) {
  const card = $("#loadingCard");
  card.hidden = false;
  card.classList.toggle("error", error);
  $("#loadingTitle").textContent = title;
  $("#loadingDetail").textContent = detail;
}

function setSaveState(text, mode = "") {
  const node = $("#saveState");
  node.textContent = text;
  node.className = "save-state" + (mode ? " " + mode : "");
}

function safeFileName(value) {
  return String(value || "기출문제").replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pageStrokes() {
  const key = String(state.page);
  if (!Array.isArray(state.pages[key])) state.pages[key] = [];
  return state.pages[key];
}

function pageHistory(bucket) {
  const key = String(state.page);
  if (!Array.isArray(bucket[key])) bucket[key] = [];
  return bucket[key];
}

function openDatabase() {
  return new Promise(resolve => {
    if (!("indexedDB" in window)) return resolve(null);
    const request = indexedDB.open("math-solve-notes", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("notes")) request.result.createObjectStore("notes", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function loadNotes() {
  state.db = await openDatabase();
  let record = null;
  if (state.db) {
    record = await new Promise(resolve => {
      const request = state.db.transaction("notes", "readonly").objectStore("notes").get(state.docKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }
  if (!record) {
    try { record = JSON.parse(localStorage.getItem("math-solve:" + state.docKey) || "null"); } catch {}
  }
  if (record && record.pages && typeof record.pages === "object") state.pages = record.pages;
}

async function persistNotes() {
  clearTimeout(state.saveTimer);
  const record = { key: state.docKey, version: 1, pages: state.pages, updatedAt: new Date().toISOString() };
  setSaveState("저장 중…", "saving");
  let saved = false;
  if (state.db) {
    saved = await new Promise(resolve => {
      const request = state.db.transaction("notes", "readwrite").objectStore("notes").put(record);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }
  if (!saved) {
    try { localStorage.setItem("math-solve:" + state.docKey, JSON.stringify(record)); saved = true; } catch {}
  }
  setSaveState(saved ? "저장됨" : "저장 실패", saved ? "" : "error");
}

function scheduleSave() {
  setSaveState("저장 대기", "saving");
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(persistNotes, 450);
}

function canvasPoint(event) {
  const rect = inkCanvas.getBoundingClientRect();
  let x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  let y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  if (state.snapToGrid && ["line", "rect", "ellipse"].includes(state.tool)) {
    const step = .04;
    x = Math.max(0, Math.min(1, Math.round(x / step) * step));
    y = Math.max(0, Math.min(1, Math.round(y / step) * step));
  }
  return { x, y, p: event.pressure > 0 ? event.pressure : .5 };
}
function drawStroke(ctx, stroke, width, height) {
  const points = stroke.points || [];
  if (!points.length) return;
  const baseWidth = (stroke.width || .004) * width;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color || "#19364a";
  ctx.fillStyle = stroke.color || "#19364a";
  ctx.globalAlpha = stroke.tool === "highlighter" ? .34 : 1;
  if (["rect", "ellipse"].includes(stroke.tool) && points.length >= 2) {
    const a = points[0], b = points[points.length - 1];
    const x = Math.min(a.x, b.x) * width, y = Math.min(a.y, b.y) * height;
    const w = Math.abs(b.x - a.x) * width, h = Math.abs(b.y - a.y) * height;
    ctx.lineWidth = baseWidth;
    ctx.beginPath();
    if (stroke.tool === "rect") ctx.rect(x, y, w, h);
    else ctx.ellipse(x + w / 2, y + h / 2, Math.max(.5, w / 2), Math.max(.5, h / 2), 0, 0, Math.PI * 2);
    ctx.stroke(); ctx.restore(); return;
  }
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x * width, points[0].y * height, baseWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1], b = points[i];
      ctx.lineWidth = stroke.tool === "pen" ? baseWidth * (.75 + (b.p || .5) * .5) : baseWidth;
      ctx.beginPath();
      ctx.moveTo(a.x * width, a.y * height);
      ctx.lineTo(b.x * width, b.y * height);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawGuides(ctx, width, height) {
  if (!state.showGrid && !state.showAxes) return;
  const spacing = Math.max(24, Math.min(42, width / 20));
  ctx.save();
  if (state.showGrid) {
    ctx.strokeStyle = "rgba(33, 112, 190, .16)"; ctx.lineWidth = 1;
    for (let x = width / 2 % spacing; x < width; x += spacing) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = height / 2 % spacing; y < height; y += spacing) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  }
  if (state.showAxes) {
    const cx = width / 2, cy = height / 2;
    ctx.strokeStyle = "rgba(22, 67, 105, .62)"; ctx.fillStyle = "rgba(22, 67, 105, .72)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(8, cy); ctx.lineTo(width - 9, cy); ctx.moveTo(cx, height - 8); ctx.lineTo(cx, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(width - 9, cy); ctx.lineTo(width - 18, cy - 5); ctx.lineTo(width - 18, cy + 5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, 9); ctx.lineTo(cx - 5, 18); ctx.lineTo(cx + 5, 18); ctx.closePath(); ctx.fill();
    ctx.font = "12px sans-serif"; ctx.fillText("x", width - 23, cy - 9); ctx.fillText("y", cx + 9, 22);
    for (let x = cx + spacing; x < width - 12; x += spacing) { ctx.beginPath(); ctx.moveTo(x, cy - 4); ctx.lineTo(x, cy + 4); ctx.stroke(); }
    for (let x = cx - spacing; x > 12; x -= spacing) { ctx.beginPath(); ctx.moveTo(x, cy - 4); ctx.lineTo(x, cy + 4); ctx.stroke(); }
    for (let y = cy + spacing; y < height - 12; y += spacing) { ctx.beginPath(); ctx.moveTo(cx - 4, y); ctx.lineTo(cx + 4, y); ctx.stroke(); }
    for (let y = cy - spacing; y > 12; y -= spacing) { ctx.beginPath(); ctx.moveTo(cx - 4, y); ctx.lineTo(cx + 4, y); ctx.stroke(); }
  }
  ctx.restore();
}
function redrawInk() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = inkCanvas.width / ratio;
  const height = inkCanvas.height / ratio;
  inkContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  inkContext.clearRect(0, 0, width, height);
  drawGuides(inkContext, width, height);
  pageStrokes().forEach(stroke => drawStroke(inkContext, stroke, width, height));
}

function segmentDistance(point, a, b, width, height) {
  const px = point.x * width, py = point.y * height;
  const ax = a.x * width, ay = a.y * height, bx = b.x * width, by = b.y * height;
  const dx = bx - ax, dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function eraseAt(point) {
  const rect = inkCanvas.getBoundingClientRect();
  const radius = Math.max(14, rect.width * .018);
  const strokes = pageStrokes();
  state.pages[String(state.page)] = strokes.filter(stroke => {
    const points = stroke.points || [];
    if (stroke.tool === "rect" && points.length >= 2) {
      const a = points[0], b = points[points.length - 1];
      const corners = [{x:a.x,y:a.y},{x:b.x,y:a.y},{x:b.x,y:b.y},{x:a.x,y:b.y},{x:a.x,y:a.y}];
      for (let i = 1; i < corners.length; i += 1) {
        if (segmentDistance(point, corners[i - 1], corners[i], rect.width, rect.height) <= radius) return false;
      }
      return true;
    }
    if (stroke.tool === "ellipse" && points.length >= 2) {
      const a = points[0], b = points[points.length - 1], cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2, ring = [];
      for (let i = 0; i <= 32; i += 1) {
        const angle = i / 32 * Math.PI * 2;
        ring.push({x:cx + Math.cos(angle) * rx,y:cy + Math.sin(angle) * ry});
      }
      for (let i = 1; i < ring.length; i += 1) {
        if (segmentDistance(point, ring[i - 1], ring[i], rect.width, rect.height) <= radius) return false;
      }
      return true;
    }
    if (points.length === 1) return segmentDistance(point, points[0], points[0], rect.width, rect.height) > radius;
    for (let i = 1; i < points.length; i += 1) {
      if (segmentDistance(point, points[i - 1], points[i], rect.width, rect.height) <= radius) return false;
    }
    return true;
  });
}

function beginAction() {
  state.actionBefore = JSON.stringify(pageStrokes());
}

function finishAction() {
  if (state.actionBefore === null) return;
  const current = JSON.stringify(pageStrokes());
  if (current !== state.actionBefore) {
    const history = pageHistory(state.undo);
    history.push(state.actionBefore);
    if (history.length > 40) history.shift();
    state.redo[String(state.page)] = [];
    scheduleSave();
  }
  state.actionBefore = null;
  updateEditButtons();
}

function updateEditButtons() {
  $("#undoButton").disabled = pageHistory(state.undo).length === 0;
  $("#redoButton").disabled = pageHistory(state.redo).length === 0;
  $("#clearButton").disabled = pageStrokes().length === 0;
}

function undo() {
  const history = pageHistory(state.undo);
  if (!history.length) return;
  pageHistory(state.redo).push(JSON.stringify(pageStrokes()));
  state.pages[String(state.page)] = JSON.parse(history.pop());
  redrawInk(); updateEditButtons(); scheduleSave();
}

function redo() {
  const history = pageHistory(state.redo);
  if (!history.length) return;
  pageHistory(state.undo).push(JSON.stringify(pageStrokes()));
  state.pages[String(state.page)] = JSON.parse(history.pop());
  redrawInk(); updateEditButtons(); scheduleSave();
}

function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll("[data-tool]").forEach(button => {
    const active = button.dataset.tool === tool;
    button.classList.toggle("on", active);
    button.setAttribute("aria-pressed", String(active));
  });
  inkCanvas.classList.toggle("hand", tool === "hand");
  updateInkSettings();
}

const PEN_WIDTHS = [0, .0025, .0034, .0042, .0055, .007];
const HIGHLIGHT_WIDTHS = [0, .012, .017, .022, .028, .036];

function saveToolPrefs() {
  try {
    localStorage.setItem("math-solve-tool-prefs", JSON.stringify({
      penColor: state.penColor, highlighterColor: state.highlighterColor,
      penSize: state.penSize, highlighterSize: state.highlighterSize,
      showGrid: state.showGrid, showAxes: state.showAxes, snapToGrid: state.snapToGrid
    }));
  } catch {}
}

function activeInkColor() {
  return state.tool === "highlighter" ? state.highlighterColor : state.penColor;
}

function activeInkWidth() {
  return state.tool === "highlighter" ? HIGHLIGHT_WIDTHS[state.highlighterSize] : PEN_WIDTHS[state.penSize];
}

function updateInkSettings() {
  const highlighter = state.tool === "highlighter";
  const editable = ["pen", "line", "rect", "ellipse", "highlighter"].includes(state.tool);
  const color = activeInkColor(), size = highlighter ? state.highlighterSize : state.penSize;
  document.querySelector(".ink-settings")?.classList.toggle("disabled", !editable);
  document.querySelectorAll("[data-ink-color]").forEach(button => {
    const on = button.dataset.inkColor.toLowerCase() === color.toLowerCase();
    button.classList.toggle("on", on);
    button.setAttribute("aria-pressed", String(on));
  });
  const slider = $("#strokeSize"), output = $("#strokeSizeValue");
  if (slider) { slider.value = String(size); slider.disabled = !editable; }
  if (output) output.textContent = String(size);
  const penDot = document.querySelector(".pen-dot"), highlighterDot = document.querySelector(".highlighter-dot");
  if (penDot) penDot.style.background = state.penColor;
  if (highlighterDot) highlighterDot.style.background = state.highlighterColor;
}
inkCanvas.addEventListener("pointerdown", event => {
  if (state.tool === "hand" || (event.pointerType === "touch" && !$("#fingerDraw").checked)) return;
  event.preventDefault();
  inkCanvas.setPointerCapture(event.pointerId);
  state.drawing = true;
  beginAction();
  const point = canvasPoint(event);
  if (state.tool === "eraser") eraseAt(point);
  else {
    state.activeStroke = {
      tool: state.tool,
      color: activeInkColor(),
      width: activeInkWidth(),
      points: state.tool === "line" ? [point, point] : [point]
    };
    pageStrokes().push(state.activeStroke);
  }
  redrawInk();
});

inkCanvas.addEventListener("pointermove", event => {
  if (!state.drawing) return;
  event.preventDefault();
  const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
  events.forEach(sample => {
    const point = canvasPoint(sample);
    if (state.tool === "eraser") eraseAt(point);
    else if (state.activeStroke && ["line", "rect", "ellipse"].includes(state.tool)) state.activeStroke.points[1] = point;
    else if (state.activeStroke) state.activeStroke.points.push(point);
  });
  redrawInk();
});

function endPointer(event) {
  if (!state.drawing) return;
  if (event) event.preventDefault();
  state.drawing = false;
  state.activeStroke = null;
  finishAction();
}
["pointerup", "pointercancel", "lostpointercapture"].forEach(name => inkCanvas.addEventListener(name, endPointer));

async function renderPage() {
  if (!state.pdf) return;
  const serial = ++state.renderSerial;
  if (state.renderTask) {
    try { state.renderTask.cancel(); } catch {}
  }
  const page = await state.pdf.getPage(state.page);
  if (serial !== state.renderSerial) return;
  const base = page.getViewport({ scale: 1 });
  const fitWidth = Math.max(260, area.clientWidth - (innerWidth < 600 ? 12 : 40));
  const fitScale = Math.min(2.2, fitWidth / base.width);
  const scale = fitScale * state.zoom;
  const viewport = page.getViewport({ scale });
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(viewport.width), height = Math.round(viewport.height);

  paper.style.width = width + "px";
  paper.style.height = height + "px";
  [pdfCanvas, inkCanvas].forEach(canvas => {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
  });
  paper.hidden = false;
  $("#loadingCard").hidden = true;
  pdfContext.setTransform(1, 0, 0, 1, 0, 0);
  state.renderTask = page.render({ canvasContext: pdfContext, viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] });
  try { await state.renderTask.promise; } catch (error) { if (error?.name !== "RenderingCancelledException") throw error; }
  if (serial !== state.renderSerial) return;
  redrawInk();
  $("#pageNumber").value = state.page;
  $("#prevPage").disabled = state.page <= 1;
  $("#nextPage").disabled = state.page >= state.pageCount;
  $("#zoomFit").textContent = state.zoom === 1 ? "맞춤" : Math.round(state.zoom * 100) + "%";
  updateEditButtons();
}

async function goToPage(number) {
  const next = Math.max(1, Math.min(state.pageCount, Number(number) || 1));
  if (next === state.page) { $("#pageNumber").value = state.page; return; }
  state.page = next;
  area.scrollTo({ top: 0, left: 0 });
  await renderPage();
}

function changeZoom(delta) {
  state.zoom = Math.max(.55, Math.min(2.5, Math.round((state.zoom + delta) * 10) / 10));
  renderPage().catch(showRenderError);
}

function showRenderError(error) {
  console.error(error);
  setLoading("문제지를 열지 못했습니다.", "잠시 후 다시 시도하거나 자료실에서 원본 문제를 열어 주세요.", true);
}

function setupDocument(item, subjectSet) {
  const exam = [item.examYear && item.examYear + "년", item.examMonth && item.examMonth + "월", item.examName].filter(Boolean).join(" ");
  $("#examTitle").textContent = item.title;
  $("#examMeta").textContent = [item.grade + "학년", subjectSet.subject, exam].filter(Boolean).join(" · ");
  document.title = item.title + " · 기출문제 풀기";
  $("#backLink").href = "files.html?grade=" + encodeURIComponent(item.grade);
  const links = [];
  if (subjectSet.files.answer) links.push(`<a href="${subjectSet.files.answer.url}" target="_blank" rel="noopener">정답 확인 <span>↗</span></a>`);
  if (subjectSet.files.solution) links.push(`<a href="${subjectSet.files.solution.url}" target="_blank" rel="noopener">해설 확인 <span>↗</span></a>`);
  $("#checkLinks").innerHTML = links.length ? links.join("") : "<span>등록된 정답·해설이 없습니다.</span>";
}

async function start() {
  const id = params.get("id"), subject = params.get("subject");
  if (!id || !subject) throw new Error("missing-selection");
  const response = await fetch("/assets/exam-catalog.json");
  if (!response.ok) throw new Error("catalog-load-failed");
  const catalog = await response.json();
  const item = (catalog.items || []).find(row => row.id === id);
  const subjectSet = item?.sets?.find(row => row.subject === subject);
  if (!item || !subjectSet?.files?.problem?.url) throw new Error("problem-not-found");
  state.item = item;
  state.subjectSet = subjectSet;
  state.docKey = item.id + ":" + subjectSet.subject;
  setupDocument(item, subjectSet);
  await loadNotes();
  const task = pdfjsLib.getDocument({ url: subjectSet.files.problem.url });
  task.onProgress = ({ loaded, total }) => {
    if (total) $("#loadingDetail").textContent = "PDF " + Math.min(100, Math.round(loaded / total * 100)) + "%";
  };
  state.pdf = await task.promise;
  state.pageCount = state.pdf.numPages;
  $("#pageCount").textContent = state.pageCount;
  await renderPage();
  setSaveState(Object.keys(state.pages).length ? "필기 불러옴" : "자동 저장");
}

document.querySelectorAll("[data-tool]").forEach(button => button.addEventListener("click", () => setTool(button.dataset.tool)));
document.querySelectorAll("[data-ink-color]").forEach(button => button.addEventListener("click", () => {
  if (!["pen", "line", "rect", "ellipse", "highlighter"].includes(state.tool)) return;
  if (state.tool === "highlighter") state.highlighterColor = button.dataset.inkColor;
  else state.penColor = button.dataset.inkColor;
  saveToolPrefs(); updateInkSettings();
}));
$("#strokeSize").addEventListener("input", event => {
  const value = Number(event.target.value);
  if (state.tool === "highlighter") state.highlighterSize = value;
  else state.penSize = value;
  saveToolPrefs(); updateInkSettings();
});
function updateGuideControls() {
  const grid = $("#gridToggle"), axes = $("#axesToggle"), snap = $("#snapToGrid");
  grid.classList.toggle("on", state.showGrid); grid.setAttribute("aria-pressed", String(state.showGrid));
  axes.classList.toggle("on", state.showAxes); axes.setAttribute("aria-pressed", String(state.showAxes));
  snap.checked = state.snapToGrid;
}
function updateFingerMode() {
  inkCanvas.classList.toggle("finger-draw", $("#fingerDraw").checked);
}
$("#fingerDraw").addEventListener("change", updateFingerMode);
updateFingerMode();
updateInkSettings();
updateGuideControls();
$("#gridToggle").addEventListener("click", () => {
  state.showGrid = !state.showGrid; saveToolPrefs(); updateGuideControls(); redrawInk();
});
$("#axesToggle").addEventListener("click", () => {
  state.showAxes = !state.showAxes; saveToolPrefs(); updateGuideControls(); redrawInk();
});
$("#snapToGrid").addEventListener("change", event => {
  state.snapToGrid = event.target.checked; saveToolPrefs(); updateGuideControls();
});
$("#undoButton").addEventListener("click", undo);
$("#redoButton").addEventListener("click", redo);
$("#prevPage").addEventListener("click", () => goToPage(state.page - 1));
$("#nextPage").addEventListener("click", () => goToPage(state.page + 1));
$("#pageNumber").addEventListener("change", event => goToPage(event.target.value));
$("#zoomOut").addEventListener("click", () => changeZoom(-.1));
$("#zoomIn").addEventListener("click", () => changeZoom(.1));
$("#zoomFit").addEventListener("click", () => { state.zoom = 1; renderPage().catch(showRenderError); });

$("#clearButton").addEventListener("click", event => {
  const button = event.currentTarget;
  if (!button.classList.contains("confirm")) {
    button.classList.add("confirm");
    button.textContent = "한 번 더 눌러 지우기";
    clearTimeout(state.clearTimer);
    state.clearTimer = setTimeout(() => { button.classList.remove("confirm"); button.textContent = "현재 쪽 지우기"; }, 2600);
    return;
  }
  clearTimeout(state.clearTimer);
  beginAction();
  state.pages[String(state.page)] = [];
  finishAction();
  redrawInk();
  button.classList.remove("confirm");
  button.textContent = "현재 쪽 지우기";
  toast("현재 쪽 필기를 지웠습니다.");
});

$("#fullscreenButton").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch { toast("이 브라우저에서는 전체 화면을 사용할 수 없습니다."); }
});

$("#saveImageButton").addEventListener("click", () => {
  if (!state.pdf) return;
  const output = document.createElement("canvas");
  output.width = pdfCanvas.width; output.height = pdfCanvas.height;
  const context = output.getContext("2d");
  context.fillStyle = "#fff"; context.fillRect(0, 0, output.width, output.height);
  context.drawImage(pdfCanvas, 0, 0); context.drawImage(inkCanvas, 0, 0);
  output.toBlob(blob => {
    if (!blob) return toast("이미지를 만들지 못했습니다.");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = safeFileName(state.item.title + "_" + state.subjectSet.subject + "_" + state.page + "쪽") + ".png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast("현재 쪽을 이미지로 저장했습니다.");
  }, "image/png");
});

function timerText(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor(total % 3600 / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return h + ":" + m + ":" + s;
}
function elapsedNow() {
  return state.timerElapsed + (state.timerStartedAt ? Date.now() - state.timerStartedAt : 0);
}
function beep() {
  try {
    const audio = new AudioContext(), oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(.08, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .55);
    oscillator.start(); oscillator.stop(audio.currentTime + .55);
  } catch {}
}
function timeUp() {
  const limit = state.timerLimit * 60000;
  state.timerElapsed = limit; state.timerStartedAt = 0; state.timerEnded = true;
  clearInterval(state.timerId);
  $("#timerToggle").textContent = "계속";
  beep();
  if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
  if (!$("#timeUpDialog").open) $("#timeUpDialog").showModal();
}
function drawTimer() {
  const elapsed = elapsedNow(), value = $("#timerValue"), limit = state.timerLimit * 60000;
  value.classList.remove("warning", "overtime");
  if (!state.timerLimit) value.textContent = timerText(elapsed);
  else if (state.timerOvertime) {
    value.textContent = "+" + timerText(elapsed - limit);
    value.classList.add("overtime");
  } else {
    const remaining = Math.max(0, limit - elapsed);
    value.textContent = timerText(remaining);
    if (remaining <= 5 * 60000) value.classList.add("warning");
    if (remaining <= 0 && state.timerStartedAt && !state.timerEnded) timeUp();
  }
}
function stopTimer() {
  if (!state.timerStartedAt) return;
  state.timerElapsed += Date.now() - state.timerStartedAt;
  state.timerStartedAt = 0;
  clearInterval(state.timerId);
}
try {
  const savedLimit = Number(localStorage.getItem("math-solve-timer-limit"));
  if ([0,10,20,30,40,50,80,100].includes(savedLimit)) state.timerLimit = savedLimit;
} catch {}
$("#timerLimit").value = String(state.timerLimit);
drawTimer();
$("#timerLimit").addEventListener("change", event => {
  state.timerLimit = Number(event.target.value) || 0;
  state.timerElapsed = 0; state.timerEnded = false; state.timerOvertime = false;
  try { localStorage.setItem("math-solve-timer-limit", String(state.timerLimit)); } catch {}
  drawTimer();
});
$("#timerToggle").addEventListener("click", event => {
  if (state.timerStartedAt) {
    stopTimer();
    event.currentTarget.textContent = "계속";
  } else {
    if (state.timerEnded) state.timerOvertime = true;
    state.timerStartedAt = Date.now();
    state.timerId = setInterval(drawTimer, 250);
    $("#timerLimit").disabled = true;
    event.currentTarget.textContent = "멈춤";
  }
  drawTimer();
});
$("#timerReset").addEventListener("click", () => {
  clearInterval(state.timerId);
  state.timerElapsed = 0; state.timerStartedAt = 0; state.timerEnded = false; state.timerOvertime = false;
  $("#timerLimit").disabled = false;
  $("#timerToggle").textContent = "시작";
  drawTimer();
});
$("#continueOvertime").addEventListener("click", () => {
  $("#timeUpDialog").close();
  state.timerEnded = false; state.timerOvertime = true; state.timerStartedAt = Date.now();
  state.timerId = setInterval(drawTimer, 250);
  $("#timerToggle").textContent = "멈춤";
  drawTimer();
});

function writtenPageCount() {
  return Object.values(state.pages).filter(strokes => Array.isArray(strokes) && strokes.length).length;
}
function submissionClientId(student) {
  const key = "math-solve-client:" + state.docKey + ":" + student;
  let id = "";
  try { id = localStorage.getItem(key) || ""; } catch {}
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(id)) {
    id = crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(20)), x => x.toString(16).padStart(2, "0")).join("");
    try { localStorage.setItem(key, id); } catch {}
  }
  return id;
}
function openSubmission() {
  const count = writtenPageCount();
  if (!count) return toast("문제지에 풀이를 작성한 뒤 제출해 주세요.");
  const dialog = $("#submissionDialog"), form = $("#submissionForm");
  dialog.classList.remove("submitted");
  $("#submissionStatus").textContent = "";
  $("#submissionStatus").className = "dialog-status";
  form.querySelector('button[type="submit"]').disabled = false;
  try { form.student.value = localStorage.getItem("math-solve-student") || ""; } catch {}
  $("#submissionSummary").textContent = state.item.title + " · " + state.subjectSet.subject + " · 필기 " + count + "쪽 · 풀이 " + timerText(elapsedNow());
  if (!dialog.open) dialog.showModal();
}
$("#submitSolutionButton").addEventListener("click", openSubmission);
$("#timeUpSubmit").addEventListener("click", () => { $("#timeUpDialog").close(); openSubmission(); });
document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));
$("#submissionForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget, student = form.student.value.trim(), status = $("#submissionStatus"), button = form.querySelector('button[type="submit"]');
  if (student.length < 2) { status.textContent = "학번이나 이름을 두 글자 이상 입력해 주세요."; return; }
  if (!writtenPageCount()) { status.textContent = "문제지에 풀이를 작성한 뒤 제출해 주세요."; return; }
  button.disabled = true; status.textContent = "선생님께 보내는 중…"; status.className = "dialog-status";
  try {
    await persistNotes();
    const response = await fetch("/api/solutions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", clientId: submissionClientId(student), student, note: form.note.value.trim(),
        examId: state.item.id, subject: state.subjectSet.subject, pageCount: state.pageCount, pages: clone(state.pages),
        elapsedMs: elapsedNow(), limitMinutes: state.timerLimit })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "제출하지 못했습니다.");
    try { localStorage.setItem("math-solve-student", student); } catch {}
    status.textContent = result.updated ? "기존 제출본을 최신 풀이로 바꿨습니다." : "선생님께 풀이를 제출했습니다.";
    status.className = "dialog-status success";
    $("#submissionDialog").classList.add("submitted");
    toast("풀이를 제출했습니다.");
  } catch (error) {
    status.textContent = error.message || "제출하지 못했습니다.";
    button.disabled = false;
  }
});
document.addEventListener("keydown", event => {
  if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
  } else if (event.key === "ArrowLeft") goToPage(state.page - 1);
  else if (event.key === "ArrowRight") goToPage(state.page + 1);
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderPage().catch(showRenderError), 180);
});
document.addEventListener("visibilitychange", () => { if (document.hidden && state.docKey) persistNotes(); });
window.addEventListener("pagehide", () => { if (state.docKey) persistNotes(); });

updateEditButtons();
start().catch(error => {
  console.error(error);
  setLoading("문제지를 찾지 못했습니다.", "자료실에서 풀 문제를 다시 선택해 주세요.", true);
  $("#examTitle").textContent = "문제 선택이 필요합니다";
  $("#examMeta").textContent = "자료실의 ‘바로 풀기’를 이용해 주세요.";
});
