(() => {
  "use strict";
  const encoder = new TextEncoder();
  const marker = encoder.encode("MATHSTUDY1");
  const saltBytes = 16;
  const ivBytes = 12;
  const tagBytes = 16;
  const headerBytes = marker.length + saltBytes + ivBytes;
  const maxBytes = 32 * 1024 * 1024;
  const iterations = 600000;
  const fixedKeys = new Set([
    "math-home-profile-v1", "today-study-pref", "today-study-records", "math-wrong-notes-v1",
    "math-concept-stats-v1", "math-wrong-deletions-v1", "math-study-journeys-v1"
  ]);
  const draftKey = /^math-study-draft-v1:guest:(?:(?:daily|practice|diagnostic)-[123]-[a-z0-9-]{1,100}|similar-[a-z0-9-]{1,80})$/;
  const paperKey = /^math-solve:[a-z0-9_-]{1,100}:[가-힣a-zA-Z0-9ⅠⅡⅢ ()·-]{1,70}$/;
  const allowedKey = key => typeof key === "string" && (fixedKeys.has(key) || draftKey.test(key) || paperKey.test(key));
  const object = value => value && typeof value === "object" && !Array.isArray(value);
  const validImage = value => typeof value === "string" && /^data:image\/(?:png|webp|jpeg);base64,[a-z0-9+/=]+$/i.test(value);
  const validText = value => typeof value === "string";
  const validId = value => typeof value === "string" && /^[a-z0-9-]{1,80}$/.test(value);
  const validCourse = value => object(value) && /^[123]$/.test(String(value.grade)) && validId(value.track);

  function parse(text) {
    return JSON.parse(text, (key, value) => {
      if (key === "__proto__" || key === "prototype" || key === "constructor") throw new Error("invalid key");
      return value;
    });
  }

  function cleanNotes(value) {
    if (!Array.isArray(value)) throw new Error("invalid notes");
    return value.filter(note => object(note) && validId(note.id) && validText(note.prompt)).slice(0, 200).map(note => {
      const choices = Array.isArray(note.choices) ? note.choices.filter(validText) : [];
      const studyLink = /^(?:\/)?(?:today|quick-game|solve)\.html\?[^\s]*$/;
      const reviewHref = typeof note.reviewHref === "string" && studyLink.test(note.reviewHref) ? note.reviewHref : "";
      return {
        ...note,
        type: note.type === "choice" && choices.length > 1 ? "choice" : "text",
        choices,
        acceptedAnswers: Array.isArray(note.acceptedAnswers) ? note.acceptedAnswers.filter(validText) : [],
        reviewHref,
        solutionImage: validImage(note.solutionImage) ? note.solutionImage : "",
        feedbackImage: validImage(note.feedbackImage) ? note.feedbackImage : ""
      };
    });
  }

  function checkValue(key, text) {
    const value = parse(text);
    if (draftKey.test(key)) {
      if (!globalThis.StudyDraft.valid(value) || !value.questions.every(question => validId(question.concept))) throw new Error("invalid draft");
      return value;
    }
    if (paperKey.test(key)) {
      if (!object(value) || !object(value.pages) || !Object.entries(value.pages).every(([page, strokes]) =>
        /^[1-9]\d{0,3}$/.test(page) && Array.isArray(strokes) && strokes.every(stroke => object(stroke) &&
          Array.isArray(stroke.points) && stroke.points.every(point => object(point) && Number.isFinite(point.x) && Number.isFinite(point.y))))) {
        throw new Error("invalid pen strokes");
      }
      return value;
    }
    if (key === "math-wrong-notes-v1") return cleanNotes(value);
    if (key === "math-home-profile-v1" || key === "today-study-pref") {
      if (!validCourse(value)) throw new Error("invalid course");
      return { ...value, grade: String(value.grade) };
    }
    if (key === "today-study-records") return globalThis.StudyState.safeState({ records: value }).records;
    if (key === "math-study-journeys-v1") return globalThis.StudyState.safeState({ journeys: value }).journeys;
    if (key === "math-wrong-deletions-v1") return globalThis.StudyState.safeState({ deletedNotes: value }).deletedNotes;
    return globalThis.StudyState.safeState({ stats: value }).stats;
  }

  async function keyFor(password, salt, usage) {
    if (typeof password !== "string" || password.length < 12 || password.length > 128) throw new Error("invalid password");
    const base = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      base, { name: "AES-GCM", length: 256 }, false, [usage]
    );
  }

  async function encrypt(entries, password) {
    const payload = encoder.encode(JSON.stringify(entries.filter(([key]) => allowedKey(key))));
    if (payload.length + headerBytes + tagBytes > maxBytes) throw new Error("file too large");
    const salt = crypto.getRandomValues(new Uint8Array(saltBytes));
    const iv = crypto.getRandomValues(new Uint8Array(ivBytes));
    const key = await keyFor(password, salt, "encrypt");
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: marker }, key, payload);
    return new Blob([marker, salt, iv, encrypted], { type: "application/octet-stream" });
  }

  async function decrypt(file, password) {
    if (file.size < headerBytes + tagBytes || file.size > maxBytes) throw new Error("invalid file size");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!marker.every((byte, index) => bytes[index] === byte)) throw new Error("invalid file format");
    const salt = bytes.slice(marker.length, marker.length + saltBytes);
    const iv = bytes.slice(marker.length + saltBytes, headerBytes);
    const key = await keyFor(password, salt, "decrypt");
    const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: marker }, key, bytes.slice(headerBytes));
    const entries = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
    if (!Array.isArray(entries) || entries.length > 2000) throw new Error("invalid entries");
    return entries.map(entry => {
      if (!Array.isArray(entry) || entry.length !== 2 || !allowedKey(entry[0]) || typeof entry[1] !== "string") throw new Error("invalid entry");
      return [entry[0], JSON.stringify(checkValue(...entry))];
    });
  }

  globalThis.SharedStudyFile = { encrypt, decrypt };
})();
