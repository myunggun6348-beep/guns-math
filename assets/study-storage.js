(() => {
  if (window.parent === window) return;
  let attach;
  try { attach = window.parent.attachSharedStudy; }
  catch { return; }
  if (typeof attach !== "function") return;
  const storage = attach(window);
  if (!storage) return;
  Object.defineProperty(window, "StudyStorage", { value: storage });
  document.documentElement.classList.add("shared-study-frame");
  const policy = document.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = "script-src 'self' 'unsafe-inline'; script-src-attr 'none'; object-src 'none'; base-uri 'none'; form-action 'self'";
  document.head.append(policy);
})();
