(() => {
  "use strict";
  const idleTime = 10 * 60 * 1000;
  const pages = new Set([
    "/", "/index.html", "/today.html", "/wrong-notes.html", "/past-practice.html",
    "/solve.html", "/files.html", "/map.html", "/library.html", "/games.html",
    "/quick-game.html", "/escape.html", "/ask.html"
  ]);
  const supportedPage = url => url.origin === location.origin &&
    (pages.has(url.pathname) || /^\/demos\/[a-z0-9-]+\.html$/.test(url.pathname));
  const byId = id => document.getElementById(id);
  const entry = byId("sharedEntry");
  const run = byId("sharedRun");
  const actions = document.querySelector(".shared-session-actions");
  const openDialog = byId("sharedOpenDialog");
  const endDialog = byId("sharedEndDialog");
  const openForm = byId("sharedOpenForm");
  const saveForm = byId("sharedSaveForm");
  const discard = byId("sharedDiscard");
  const savedStatus = byId("sharedSaved");
  let session = null;
  let lastActivity = 0;
  let idleTimer;
  let openAttempt = 0;
  let saveAttempt = 0;

  function noteActivity() {
    if (!session || checkIdle()) return;
    lastActivity = Date.now();
  }

  function checkIdle() {
    if (!session || Date.now() - lastActivity < idleTime) return false;
    endSession("10분 동안 활동이 없어 학습을 끝냈습니다. 다시 시작하거나 저장한 파일을 열어 주세요.");
    return true;
  }

  function hideSession() {
    if (session) session.frame.style.visibility = document.hidden ? "hidden" : "";
    if (!document.hidden) checkIdle();
  }

  function navigate(event, child) {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const url = new URL(link.href);
    const inside = supportedPage(url);
    if (inside && event.type === "click" && !event.ctrlKey && !event.metaKey &&
        !event.shiftKey && !event.altKey && !link.target && !link.hasAttribute("download")) return;
    event.preventDefault();
    if (inside) child.location.assign(url.href);
    else if (url.protocol === "https:" && !url.username && !url.password &&
      (url.origin !== location.origin || url.pathname.startsWith("/files/"))) {
      window.open(url.href, "_blank", "noopener,noreferrer");
    }
  }

  function connectPage(frame) {
    if (session?.frame !== frame) return;
    const child = frame.contentWindow;
    try {
      const url = new URL(child.location.href);
      if (!supportedPage(url)) {
        frame.src = "index.html";
        return;
      }
      const doc = child.document;
      for (const event of ["keydown", "pointerdown", "wheel", "touchmove", "input"]) {
        doc.addEventListener(event, noteActivity, { capture: true, passive: true });
      }
      doc.addEventListener("pointermove", event => {
        if (event.buttons) noteActivity();
      }, { passive: true });
      for (const event of ["click", "auxclick"]) {
        doc.addEventListener(event, click => navigate(click, child), true);
      }
    } catch {
      frame.src = "index.html";
    }
  }

  function startSession(entries = []) {
    const data = new Map(entries);
    const frame = document.createElement("iframe");
    frame.title = "공용 컴퓨터 학습 화면";
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
    frame.referrerPolicy = "no-referrer";
    const active = () => session?.frame === frame;
    const storage = Object.freeze({
      get length() { return active() ? data.size : 0; },
      key(index) { return active() ? [...data.keys()][index] ?? null : null; },
      getItem(key) { return active() ? data.get(String(key)) ?? null : null; },
      setItem(key, value) {
        if (!active()) throw new DOMException("학습이 끝났습니다.", "InvalidStateError");
        data.set(String(key), String(value));
      },
      removeItem(key) { if (active()) data.delete(String(key)); }
    });
    session = { frame, data, storage };
    lastActivity = Date.now();
    idleTimer = setInterval(checkIdle, 1000);
    byId("sharedStatus").textContent = "";
    entry.hidden = true;
    actions.hidden = false;
    run.hidden = false;
    frame.addEventListener("load", () => connectPage(frame));
    frame.src = "index.html";
    run.append(frame);
    byId("sharedEnd").focus();
  }

  Object.defineProperty(window, "attachSharedStudy", {
    value(child) {
      if (!session || session.frame.contentWindow !== child || !supportedPage(new URL(child.location.href))) return null;
      return session.storage;
    }
  });

  function resetForm(form) {
    form.reset();
    form.querySelector(".shared-error").textContent = "";
    form.querySelector('[type="submit"]').disabled = false;
  }

  function endSession(message = "", focus = true) {
    clearInterval(idleTimer);
    const ending = session;
    session = null;
    ending?.data.clear();
    run.replaceChildren();
    run.hidden = true;
    actions.hidden = true;
    entry.hidden = false;
    if (openDialog.open) openDialog.close();
    if (endDialog.open) endDialog.close();
    openAttempt++;
    resetForm(openForm);
    resetForm(saveForm);
    byId("sharedStatus").textContent = message;
    if (focus) byId("sharedStart").focus();
  }

  function flush(current) {
    const child = current.frame.contentWindow;
    child.dispatchEvent(new child.Event("shared-study-flush"));
  }

  byId("sharedStart").addEventListener("click", () => startSession());
  byId("sharedOpen").addEventListener("click", () => {
    resetForm(openForm);
    openDialog.showModal();
  });
  openForm.addEventListener("submit", async event => {
    event.preventDefault();
    const attempt = ++openAttempt;
    const submit = event.submitter;
    const password = openForm.elements.password.value;
    const file = openForm.elements.file.files[0];
    openForm.elements.password.value = "";
    const status = openForm.querySelector(".shared-error");
    status.textContent = "";
    submit.disabled = true;
    try {
      const entries = await SharedStudyFile.decrypt(file, password);
      if (attempt !== openAttempt || !openDialog.open) return;
      openDialog.close();
      startSession(entries);
    } catch {
      if (attempt === openAttempt && openDialog.open) status.textContent = "파일을 열 수 없습니다. 학습 파일과 파일 암호를 확인해 주세요.";
    } finally {
      if (attempt === openAttempt) submit.disabled = false;
    }
  });
  openDialog.addEventListener("close", () => { openAttempt++; resetForm(openForm); });

  byId("sharedEnd").addEventListener("click", () => {
    if (!session || checkIdle()) return;
    resetForm(saveForm);
    savedStatus.hidden = true;
    discard.textContent = "저장 없이 끝내기";
    endDialog.showModal();
  });
  saveForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!session || checkIdle()) return;
    const status = saveForm.querySelector(".shared-error");
    const password = saveForm.elements.password.value;
    if (password !== saveForm.elements.confirmPassword.value) {
      status.textContent = "두 파일 암호가 서로 다릅니다.";
      return;
    }
    const current = session;
    const attempt = ++saveAttempt;
    const submit = event.submitter;
    resetForm(saveForm);
    submit.disabled = true;
    try {
      flush(current);
      const encrypted = await SharedStudyFile.encrypt([...current.data], password);
      if (attempt !== saveAttempt || session !== current || !endDialog.open) return;
      const url = URL.createObjectURL(encrypted);
      const link = document.createElement("a");
      link.href = url;
      link.download = "수학을보다-내학습.mathstudy";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      savedStatus.hidden = false;
      discard.textContent = "학습 끝내기";
    } catch {
      if (attempt === saveAttempt && session === current && endDialog.open) status.textContent = "학습 파일을 만들지 못했습니다. 암호와 파일 크기를 확인해 주세요.";
    } finally {
      if (attempt === saveAttempt && session === current) submit.disabled = false;
    }
  });
  discard.addEventListener("click", () => endSession("학습을 끝냈습니다."));
  endDialog.addEventListener("close", () => { saveAttempt++; resetForm(saveForm); });
  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  for (const event of ["keydown", "pointerdown", "input"]) document.addEventListener(event, noteActivity);
  document.addEventListener("visibilitychange", hideSession);
  window.addEventListener("pagehide", () => endSession("", false));
})();
