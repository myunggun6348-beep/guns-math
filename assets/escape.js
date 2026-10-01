(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const apiUrl = "/api/math-escape";
  const roomNames = ["복도의 자물쇠", "수학 준비실", "마지막 교실"];
  const roomStories = ["첫 단서를 풀면 보너스 단서가 열립니다.", "흩어진 식을 연결해 다음 문을 여세요.", "마지막 두 단서가 종이 울리기 전에 기다립니다."];
  const playerKey = localStorage.getItem("mathEscapePlayer") || (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}-${Math.random()}`);
  localStorage.setItem("mathEscapePlayer", playerKey);
  let run = null, currentQuestion = null, timerId = null, teacherPassword = sessionStorage.getItem("mathEscapeTeacher") || "";
  let strokes = [], redo = [], drawing = false, activeStroke = null, tool = "pen", inkRevision = 0;
  const canvas = $("#scratchCanvas"), ctx = canvas.getContext("2d");

  async function call(action, values = {}) {
    const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...values }) });
    let data = {}; try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.error || "잠시 후 다시 시도해 주세요.");
    return data;
  }
  function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); clearTimeout(el._timer); el._timer = setTimeout(() => el.classList.remove("show"), 2400); }
  function errorMessage(error) { toast(error.message || "잠시 후 다시 시도해 주세요."); }
  function show(id) { ["#lobby", "#game", "#finish"].forEach(x => $(x).hidden = x !== id); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function formatTime(ms) { const sec = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(sec / 60)).padStart(2,"0")}:${String(sec % 60).padStart(2,"0")}`; }
  function roomCode(value) { return String(value || "").trim().toUpperCase(); }
  function draftKey() { return run && currentQuestion ? `mathEscapeInk:${run.id}:${currentQuestion.id}` : ""; }

  /* 탭 두 개를 나란히 두면 학생이 '교사 운영'을 먼저 보게 됩니다. 이제
     학생 화면이 기본이고, 선생님은 아래 줄에서 넘어옵니다. */
  document.querySelectorAll("[data-role]").forEach(button => button.addEventListener("click", () => {
    const 학생쪽 = button.dataset.role === "student";
    $("#studentPanel").hidden = !학생쪽;
    $("#teacherPanel").hidden = 학생쪽;
    if (!학생쪽 && teacherPassword) { $("#teacherForm [name=password]").value = teacherPassword; loadRooms(); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));

  $("#studentForm").addEventListener("submit", async event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
    // 코드를 넣었는데 이름이 없으면 선생님이 누군지 알 수 없습니다
    if (roomCode(values.roomCode) && !String(values.student || "").trim()) {
      $("#codeBox").open = true;
      event.currentTarget.student.focus();
      return toast("수업 방에 들어가려면 이름이나 번호를 적어 주세요.");
    }
    try {
      const data = await call("start", { playerKey, student: values.student, code: roomCode(values.roomCode), course: values.course, difficulty: values.difficulty });
      run = data.run; localStorage.setItem("mathEscapeRun", run.id); renderGame();
    } catch (error) { errorMessage(error); }
  });
  $("#studentForm [name=roomCode]").addEventListener("input", event => {
    const joined = roomCode(event.target.value).length > 0;
    $("#studentForm [name=course]").disabled = joined; $("#studentForm [name=difficulty]").disabled = joined;
  });

  /* 주소에 방 코드가 붙어 오면(escape.html?code=ABC123) 학생은 이름만 적으면 됩니다.
     예전에는 코드를 칠판에 적어 주고 학생이 받아 적어야 했습니다. 이제 선생님이
     카톡으로 링크 하나만 보내면 됩니다.
     과목·난이도 칸은 숨깁니다 — 선생님이 이미 정해 둔 것이라 고를 것이 없고,
     놔두면 고1이 미적분을 고르는 일이 생깁니다. */
  {
    const 붙어온코드 = roomCode(new URLSearchParams(location.search).get("code"));
    if (붙어온코드) {
      const 폼 = $("#studentForm");
      폼.roomCode.value = 붙어온코드;
      폼.course.disabled = 폼.difficulty.disabled = true;
      $("#optionBox").hidden = true;                 // 선생님이 이미 정했습니다
      $("#codeBox").open = true;                     // 이름 칸이 보이도록 펼칩니다
      $("#codeBox").querySelector("summary").hidden = true;
      폼.roomCode.closest("label").hidden = true;    // 코드는 이미 채워져 있습니다
      $("#startButton").textContent = "탈출 시작 →";
      $("#studentPanelTitle").textContent = "수업 방 들어가기";
      $("#studentPanelLead").textContent =
        `선생님이 만든 방 ${붙어온코드} 입니다. 이름만 적으면 시작합니다.`;
      폼.student.focus();
    }
  }

  $("#teacherForm").addEventListener("submit", async event => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const data = await call("createRoom", values); teacherPassword = values.password; sessionStorage.setItem("mathEscapeTeacher", teacherPassword);
      const box = $("#roomResult"); box.hidden = false; box.replaceChildren();
      const intro = document.createElement("div"); intro.textContent = `${data.room.course} · ${difficultyLabel(data.room.difficulty)}`;
      const code = document.createElement("div"); code.className = "room-code"; code.textContent = data.room.code;

      /* 링크를 같이 줍니다. 코드를 칠판에 적고 학생이 받아 적는 것보다,
         카톡으로 링크 하나 보내는 편이 훨씬 빠르고 틀릴 일도 없습니다. */
      const 링크 = `${location.origin}${location.pathname}?code=${data.room.code}`;
      const 링크줄 = document.createElement("div"); 링크줄.className = "room-link";
      const 링크글 = document.createElement("code"); 링크글.textContent = 링크;
      const 복사 = document.createElement("button");
      복사.type = "button"; 복사.className = "escape-btn"; 복사.textContent = "링크 복사";
      복사.onclick = async () => {
        try { await navigator.clipboard.writeText(링크); 복사.textContent = "복사했습니다"; }
        catch { 링크글.focus?.(); toast("복사가 막혀 있습니다. 링크를 직접 선택해 복사해 주세요."); return; }
        setTimeout(() => (복사.textContent = "링크 복사"), 2000);
      };
      링크줄.append(링크글, 복사);

      const note = document.createElement("p");
      note.textContent = "링크를 보내면 학생은 이름만 적고 바로 시작합니다. 코드를 불러 줘도 됩니다. 35일 동안 쓸 수 있습니다.";
      box.append(intro, code, 링크줄, note); await loadRooms(data.room.code);
    } catch (error) { errorMessage(error); }
  });
  $("#refreshRooms").addEventListener("click", () => {
    teacherPassword = $("#teacherForm [name=password]").value; if (teacherPassword) sessionStorage.setItem("mathEscapeTeacher", teacherPassword); loadRooms();
  });
  function difficultyLabel(value) { return ({ basic:"기본", standard:"표준", advanced:"도전" })[value] || value; }
  async function loadRooms(selected) {
    if (!teacherPassword) return;
    try {
      const data = await call("teacherRooms", { password: teacherPassword, code: selected || "" });
      const root = $("#teacherRecords"); root.replaceChildren();
      if (!data.rooms.length) { root.textContent = "아직 만든 수업방이 없습니다."; return; }
      data.rooms.forEach(room => {
        const section = document.createElement("section"); section.className = "record-room";
        const title = document.createElement("h3"); title.textContent = `${room.code} · ${room.course}`;
        const info = document.createElement("p"); info.className = "muted"; info.textContent = `${difficultyLabel(room.difficulty)} · ${new Date(room.created).toLocaleString("ko-KR")}`;
        const button = document.createElement("button"); button.className = "escape-btn"; button.type = "button"; button.textContent = selected === room.code ? "새로고침" : "학생 기록 보기";
        button.addEventListener("click", () => loadRooms(room.code)); section.append(title, info, button);
        if (selected === room.code) renderRecords(section, data.records); root.append(section);
      });
    } catch (error) { errorMessage(error); }
  }
  function renderRecords(section, records) {
    if (!records.length) { const p = document.createElement("p"); p.textContent = "아직 참여한 학생이 없습니다."; section.append(p); return; }
    records.forEach(record => {
      const row = document.createElement("div"); row.className = "record";
      const info = document.createElement("div"), name = document.createElement("strong"), small = document.createElement("small");
      name.textContent = record.student; small.textContent = `${record.score}점 · ${record.solved.length}/6 해결 · ${record.escaped ? "탈출 성공" : record.done ? "종료" : "진행 중"}`; info.append(name, small);
      const button = document.createElement("button"); button.type = "button"; button.className = "escape-btn"; button.textContent = "풀이 보기"; button.addEventListener("click", () => reviewInk(record));
      row.append(info, button); section.append(row);
    });
  }
  async function reviewInk(record) {
    try {
      const data = await call("getInk", { id: record.id, password: teacherPassword });
      $("#reviewTitle").textContent = `${record.student} 학생 풀이`;
      const root = $("#reviewPages"); root.className = "review-pages"; root.replaceChildren();
      for (let id = 0; id < 6; id++) {
        const item = data.submissions.find(x => x.question === id), page = document.createElement("section"); page.className = "review-page";
        const head = document.createElement("strong"); head.textContent = `${id + 1}번 · ${record.questions[id]?.subject || "수학"}`; page.append(head);
        if (!item) { const p = document.createElement("p"); p.className = "muted"; p.textContent = "제출한 풀이가 없습니다."; page.append(p); }
        else { const c = document.createElement("canvas"); c.width = 1000; c.height = 650; page.append(c); drawTo(c.getContext("2d"), item.drawing, 1, 1); }
        root.append(page);
      }
      $("#reviewDialog").showModal();
    } catch (error) { errorMessage(error); }
  }

  function renderGame() {
    if (run.done) return renderFinish();
    show("#game"); $("#gameCourse").textContent = `${run.course} · ${difficultyLabel(run.difficulty)}`; $("#studentLabel").textContent = run.student; $("#score").textContent = run.score;
    $("#progressBar").style.width = `${run.solved.length / 6 * 100}%`; $("#roomNumber").textContent = `ROOM ${run.stage + 1}`; $("#roomTitle").textContent = roomNames[run.stage]; $("#roomStory").textContent = roomStories[run.stage];
    const root = $("#clueGrid"); root.replaceChildren();
    run.questions.slice(run.stage * 2, run.stage * 2 + 2).forEach((question, index) => {
      const locked = index === 1 && !run.solved.includes(question.id - 1), solved = run.solved.includes(question.id);
      const button = document.createElement("button"); button.type = "button"; button.className = `clue-card${locked ? " locked" : ""}${solved ? " solved" : ""}`; button.disabled = locked;
      const num = document.createElement("span"); num.className = "num"; num.textContent = `CLUE ${question.id + 1} · ${index ? "보너스" : "필수"}`;
      const state = document.createElement("span"); state.className = "state"; state.textContent = solved ? "해결 ✓" : locked ? "잠김" : "열기 →";
      const title = document.createElement("h3"); title.textContent = question.subject; const desc = document.createElement("p"); desc.textContent = `${question.topic} · ${question.format === "choice" ? "오지선다형" : "주관식"} · ${question.points}점`;
      button.append(num, state, title, desc); button.addEventListener("click", () => openQuestion(question)); root.append(button);
    });
    const oldNext = $("#nextRoom"); if (oldNext) oldNext.remove();
    if (run.solved.includes(run.stage * 2)) {
      const next = document.createElement("button"); next.id = "nextRoom"; next.className = "escape-btn primary"; next.type = "button"; next.textContent = run.stage === 2 ? "마지막 문 열기" : "다음 방으로"; next.addEventListener("click", advance); $(".game-actions").prepend(next);
    }
    startTimer();
  }
  function startTimer() {
    clearInterval(timerId); const tick = async () => {
      if (!run) return; const left = run.deadline - Date.now(); $("#timer").textContent = formatTime(left); $("#timer").classList.toggle("urgent", left <= 60000);
      if (left <= 0) { clearInterval(timerId); try { const data = await call("finish", { id: run.id, playerKey }); run = data.run; renderFinish(); } catch (error) { errorMessage(error); } }
    }; tick(); timerId = setInterval(tick, 1000);
  }
  async function advance() { try { const data = await call("next", { id: run.id, playerKey }); run = data.run; renderGame(); } catch (error) { errorMessage(error); } }
  function renderFinish() {
    clearInterval(timerId); show("#finish"); localStorage.removeItem("mathEscapeRun");
    $("#finishTitle").textContent = run.escaped ? "탈출 성공!" : "도전 종료"; $("#finishText").textContent = run.escaped ? "세 개의 교실을 모두 통과했습니다." : `푼 단서 ${run.solved.length}개. 다음 도전에서 기록을 넘어 보세요.`; $("#finalScore").textContent = run.score;
  }
  $("#restart").addEventListener("click", () => { run = null; show("#lobby"); });
  $("#leaveGame").addEventListener("click", () => { clearInterval(timerId); show("#lobby"); toast("이 기기에서 이어할 수 있도록 저장했습니다."); });

  async function openQuestion(question) {
    currentQuestion = question; $("#questionSubject").textContent = question.subject; $("#questionType").textContent = question.format === "choice" ? "오지선다형" : "주관식"; $("#questionTitle").textContent = question.topic;
    $("#questionPrompt").textContent = [question.prompt, question.formula, question.ask].filter(Boolean).join("\n");
    const area = $("#answerArea"); area.replaceChildren();
    if (question.format === "choice") { const list = document.createElement("div"); list.className = "choice-list"; question.choices.forEach((choice, index) => { const label = document.createElement("label"), input = document.createElement("input"), number = document.createTextNode(` ${index + 1}. `), value = document.createElement("span"); input.type = "radio"; input.name = "choice"; input.value = choice.id; value.dataset.math = ""; value.textContent = choice.label; label.append(input, number, value); list.append(label); }); area.append(list); }
    else { const input = document.createElement("input"); input.className = "short-answer"; input.id = "shortAnswer"; input.inputMode = "decimal"; input.placeholder = "정수, 소수 또는 분수로 입력"; area.append(input); }
    $("#hintText").textContent = question.hint || ""; $("#hintButton").hidden = Boolean(question.hint); $("#answerMessage").textContent = question.answer !== undefined ? `정답 ${question.answer} · ${question.explanation.join(" ")}` : ""; $("#answerMessage").className = "answer-message";
    window.MathView?.typeset($("#questionDialog"));
    $("#submitAnswer").disabled = question.answer !== undefined; $("#saveInk").hidden = !run.room; $("#inkStatus").textContent = run.room ? "작성한 풀이는 제출 버튼을 눌러야 저장됩니다." : "연습 모드는 이 기기에 임시 저장됩니다.";
    loadDraft(); inkRevision = 0; resizeCanvas();
    if (run.room) { try { const data = await call("getInk", { id: run.id, playerKey, question: question.id }); if (data.submissions[0]) { strokes = data.submissions[0].drawing; inkRevision = data.submissions[0].revision; saveDraft(); redraw(); $("#inkStatus").textContent = `제출본 ${inkRevision} 저장됨`; } } catch {} }
    $("#questionDialog").showModal();
  }
  $("#hintButton").addEventListener("click", async () => { try { const data = await call("hint", { id: run.id, playerKey, question: currentQuestion.id }); run = data.run; currentQuestion = run.questions[currentQuestion.id]; $("#hintText").textContent = currentQuestion.hint; $("#hintButton").hidden = true; $("#score").textContent = run.score; window.MathView?.typeset($("#hintText")); } catch (error) { errorMessage(error); } });
  $("#submitAnswer").addEventListener("click", async () => {
    const answer = currentQuestion.format === "choice" ? document.querySelector("input[name=choice]:checked")?.value : $("#shortAnswer")?.value;
    if (answer === undefined || answer === "") return toast("답을 먼저 입력하세요.");
    try { const data = await call("answer", { id: run.id, playerKey, question: currentQuestion.id, answer }); run = data.run; const solved = run.solved.includes(currentQuestion.id); $("#answerMessage").textContent = data.feedback; $("#answerMessage").className = `answer-message ${solved ? "good" : "bad"}`; window.MathView?.typeset($("#answerMessage")); if (solved) { $("#submitAnswer").disabled = true; setTimeout(() => { $("#questionDialog").close(); renderGame(); }, 750); } else $("#score").textContent = run.score; } catch (error) { errorMessage(error); }
  });
  $("#saveInk").addEventListener("click", async () => { try { const data = await call("submitInk", { id: run.id, playerKey, question: currentQuestion.id, drawing: strokes, revision: inkRevision }); inkRevision = data.submission.revision; $("#inkStatus").textContent = `제출본 ${inkRevision} 저장됨`; toast("풀이를 제출했습니다."); } catch (error) { errorMessage(error); } });

  function resizeCanvas() { const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr); redraw(); }
  function drawTo(target, list, sx, sy) {
    target.save(); target.lineCap = "round"; target.lineJoin = "round";
    list.forEach(stroke => { if (!stroke.points.length) return; target.beginPath(); target.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over"; target.strokeStyle = stroke.color; target.lineWidth = stroke.width * sx; const first = stroke.points[0]; target.moveTo(first.x * sx, first.y * sy); stroke.points.slice(1).forEach(p => target.lineTo(p.x * sx, p.y * sy)); target.stroke(); }); target.restore();
  }
  function redraw() { ctx.clearRect(0,0,canvas.width,canvas.height); drawTo(ctx, strokes, canvas.width / 1000, canvas.height / 650); }
  function point(event) { const r = canvas.getBoundingClientRect(); return { x: Math.max(0,Math.min(1000,(event.clientX-r.left)/r.width*1000)), y: Math.max(0,Math.min(650,(event.clientY-r.top)/r.height*650)) }; }
  canvas.addEventListener("pointerdown", event => { if (event.pointerType === "touch" && !$("#fingerDraw").checked) return; event.preventDefault(); canvas.setPointerCapture(event.pointerId); drawing = true; activeStroke = { color:"#19364a", width: tool === "eraser" ? 32 : 5, erase: tool === "eraser", points:[point(event)] }; strokes.push(activeStroke); redo = []; redraw(); });
  canvas.addEventListener("pointermove", event => { if (!drawing || !activeStroke) return; event.preventDefault(); activeStroke.points.push(point(event)); redraw(); });
  ["pointerup","pointercancel"].forEach(name => canvas.addEventListener(name, () => { if (!drawing) return; drawing = false; activeStroke = null; saveDraft(); }));
  document.querySelectorAll("[data-tool]").forEach(button => button.addEventListener("click", () => { tool = button.dataset.tool; document.querySelectorAll("[data-tool]").forEach(x => x.classList.toggle("on", x === button)); }));
  $("#undoInk").addEventListener("click", () => { if (strokes.length) redo.push(strokes.pop()); saveDraft(); redraw(); });
  $("#redoInk").addEventListener("click", () => { if (redo.length) strokes.push(redo.pop()); saveDraft(); redraw(); });
  $("#clearInk").addEventListener("click", () => { if (strokes.length) { redo = strokes; strokes = []; saveDraft(); redraw(); } });
  function saveDraft() { if (draftKey()) sessionStorage.setItem(draftKey(), JSON.stringify(strokes)); }
  function loadDraft() { try { strokes = JSON.parse(sessionStorage.getItem(draftKey()) || "[]"); if (!Array.isArray(strokes)) strokes = []; } catch { strokes = []; } redo = []; }
  window.addEventListener("resize", () => { if ($("#questionDialog").open) resizeCanvas(); });

  async function resume() { const id = localStorage.getItem("mathEscapeRun"); if (!id) return; try { const data = await call("resume", { id, playerKey }); run = data.run; renderGame(); } catch { localStorage.removeItem("mathEscapeRun"); } }
  resume();
})();
