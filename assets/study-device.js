(() => {
  "use strict";
  const ownerKey = "math-student-data-owner";
  const draftOwnerKey = "math-device-draft-owner-v1";
  const fields = {
    profile: "math-home-profile-v1",
    pref: "today-study-pref",
    records: "today-study-records",
    notes: "math-wrong-notes-v1",
    stats: "math-concept-stats-v1",
    deletedNotes: "math-wrong-deletions-v1",
    journeys: "math-study-journeys-v1"
  };
  const studyKeys = new Set(Object.values(fields));
  const blank = { profile: null, pref: {}, records: [], notes: [], stats: {}, deletedNotes: {}, journeys: [] };
  let readable = false;

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
    catch { return fallback; }
  }

  function restoreDeviceRecords(owner) {
    const entries = Object.entries(fields);
    const active = Object.fromEntries(entries.map(([field, key]) => [field, localStorage.getItem(key)]));
    const previousDraftOwner = localStorage.getItem(draftOwnerKey);
    const guest = read("math-student-guest-data-v1", {});
    const archive = Object.fromEntries(entries.map(([field, key]) => [field, read(key, blank[field])]));
    // 기존 학생 기록과 예전에 로그인하지 않고 풀었던 기록을 섞지 않습니다.
    localStorage.setItem("math-student-backup:" + owner, JSON.stringify(archive));
    try {
      for (const [field, key] of entries) localStorage.setItem(key, JSON.stringify(guest[field] ?? blank[field]));
      localStorage.removeItem(draftOwnerKey);
      localStorage.removeItem(ownerKey);
    } catch (error) {
      for (const [field, key] of entries) {
        if (active[field] === null) localStorage.removeItem(key);
        else localStorage.setItem(key, active[field]);
      }
      if (previousDraftOwner !== null) localStorage.setItem(draftOwnerKey, previousDraftOwner);
      throw error;
    }
  }

  async function migrate() {
    const owner = localStorage.getItem(ownerKey);
    if (!owner) return;
    const response = await fetch("/api/student-account?migration=1", {
      credentials: "same-origin",
      signal: globalThis.AbortSignal?.timeout?.(5000)
    });
    if (!response.ok) throw new Error("기기 기록을 아직 준비하지 못했습니다.");
    const { owner: verifiedOwner } = await response.json();
    if (localStorage.getItem(ownerKey) !== owner) return;
    if (verifiedOwner === owner && /^[a-z0-9]{4,16}$/.test(owner)) {
      // 활성 세션이 확인된 경우 필기와 임시 풀이의 기존 저장 위치를 그대로 사용합니다.
      localStorage.setItem(draftOwnerKey, "student-" + owner);
      localStorage.removeItem(ownerKey);
    } else {
      restoreDeviceRecords(owner);
    }
  }

  const ready = (async () => {
    try {
      if (localStorage.getItem(ownerKey)) {
        if (navigator.locks) await navigator.locks.request("math-study-device-migration", migrate);
        else await migrate();
      }
      readable = !localStorage.getItem(ownerKey);
    } catch {
      // 이전 기록을 확인할 수 없는 경우 해당 기록을 읽거나 덮어쓰지 않습니다.
    }
  })();

  window.StudyDevice = {
    ready,
    canUseLocal: () => readable,
    draftOwner() {
      if (!readable) return "";
      const owner = localStorage.getItem(draftOwnerKey);
      return /^student-[a-z0-9]{4,16}$/.test(owner || "") ? owner : "guest";
    }
  };
  window.addEventListener("storage", event => {
    if (event.key === ownerKey || event.key === null) readable = !localStorage.getItem(ownerKey);
    if (event.key === ownerKey || event.key === null || studyKeys.has(event.key)) {
      window.dispatchEvent(new Event("study-device-change"));
    }
  });
})();
