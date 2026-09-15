(() => {
  const root = document.getElementById("풀이목록"), summary = document.getElementById("풀이요약"), inside = document.getElementById("안쪽");
  if (!root || !summary || !inside) return;
  const passwordKey = "수학을보다-암호";
  let loaded = false, submissions = [];
  const safe = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  const password = () => { try { return localStorage.getItem(passwordKey) || sessionStorage.getItem(passwordKey) || ""; } catch { return ""; } };
  const when = value => new Intl.DateTimeFormat("ko-KR", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" }).format(new Date(value));
  const duration = milliseconds => {
    const total = Math.round((Number(milliseconds) || 0) / 60000), hour = Math.floor(total / 60), minute = total % 60;
    return hour ? hour + "시간 " + minute + "분" : minute + "분";
  };

  function draw() {
    summary.textContent = submissions.length ? "최근 90일 · " + submissions.length + "개 제출" : "아직 제출된 풀이가 없습니다.";
    summary.classList.toggle("on", submissions.length > 0);
    if (!submissions.length) { root.innerHTML = '<p class="empty">학생이 풀이를 제출하면 여기에 나타납니다.</p>'; return; }
    root.innerHTML = '<div class="submission-list">' + submissions.map(item => {
      const pages = (item.writtenPages || []).join(", ") + "쪽";
      const timed = (item.limitMinutes ? "제한 " + item.limitMinutes + "분 · " : "") + "풀이 " + duration(item.elapsedMs);
      return '<article class="submission-row" data-id="' + safe(item.id) + '">' +
        '<div class="submission-student"><strong>' + safe(item.student) + '</strong><span>' + safe(when(item.submittedAt)) + '</span></div>' +
        '<div class="submission-main"><b>' + safe(item.examTitle) + '</b><span>' + safe(item.grade + "학년 · " + item.subject + " · 필기 " + pages) + '</span>' +
        '<span>' + safe(timed) + (item.note ? " · “" + safe(item.note) + "”" : "") + '</span></div>' +
        '<div class="submission-actions"><a href="review.html?id=' + encodeURIComponent(item.id) + '">풀이 보기 →</a>' +
        '<button type="button" class="adm-del" data-delete="' + safe(item.id) + '">지우기</button></div></article>';
    }).join("") + "</div>";
  }

  async function load(force = false) {
    if (inside.hidden || (loaded && !force)) return;
    loaded = true; root.innerHTML = '<p class="empty">풀이를 불러오는 중…</p>';
    try {
      const response = await fetch("/api/solutions", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"list", password:password() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "목록을 불러오지 못했습니다.");
      submissions = result.submissions || []; draw();
    } catch (error) { loaded = false; root.innerHTML = '<p class="empty">' + safe(error.message || "목록을 불러오지 못했습니다.") + '</p>'; }
  }

  root.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete]");
    if (!button || !confirm("이 제출본을 지울까요? 되돌릴 수 없습니다.")) return;
    button.disabled = true;
    try {
      const response = await fetch("/api/solutions", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"delete", password:password(), id:button.dataset.delete }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "지우지 못했습니다.");
      submissions = submissions.filter(item => item.id !== button.dataset.delete); draw();
    } catch (error) { alert(error.message || "지우지 못했습니다."); button.disabled = false; }
  });
  document.getElementById("풀이새로고침")?.addEventListener("click", () => load(true));
  new MutationObserver(() => { if (!inside.hidden) load(); }).observe(inside, { attributes:true, attributeFilter:["hidden"] });
  if (!inside.hidden) load();
})();
