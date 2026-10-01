/* =========================================================
   학생 계정 창 — 손대지 않아도 됩니다.

   문은 홈 첫 화면에 둘뿐입니다: '가입하고 시작' / '그냥 둘러보기'.
   이 파일은 그중 '가입하고 시작'을 눌렀을 때 뜨는 창과, 로그인한 뒤
   오른쪽 위에 생기는 계정 단추를 맡습니다.

   가입 안 한 학생도 그대로 공부할 수 있습니다 — 기록이 이 기기에만
   남을 뿐입니다. 그래서 '가입 없이 쓰기' 같은 문을 따로 두지 않습니다.
   둘러보기가 곧 그 길입니다.
   ========================================================= */
(function () {
  "use strict";
  const 맞춤 = window.StudentSync;
  if (!맞춤) return;

  const 과목들 = window.TODAY_TRACKS || {};
  const 안전하게 = 값 => String(값 ?? "").replace(/[&<>"']/g, 글 => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[글]));

  /* 오른쪽 위 계정 단추. 로그인하기 전에는 아예 안 보입니다 —
     첫 화면에서 고를 것을 둘로 줄이려고 그렇게 했습니다. */
  const 단추 = document.createElement("button");
  단추.type = "button";
  단추.className = "student-account-button";
  단추.hidden = true;
  document.querySelector(".nav-right")?.prepend(단추);

  const 창 = document.createElement("dialog");
  창.className = "student-account-dialog";
  document.body.append(창);

  /* ---------- 로그인한 뒤 ---------- */
  function 들어온뒤(형편) {
    창.innerHTML =
      '<form method="dialog" class="student-account-card">' +
        '<button class="student-dialog-close" aria-label="닫기">×</button>' +
        '<span class="eyebrow">SYNC ON</span>' +
        '<h2>' + 안전하게(형편.student.name || 형편.student.id) + '의 학습 계정</h2>' +
        '<p><b>' + 안전하게(형편.student.id) + '</b> 로 로그인했습니다. 오늘의 학습과 오답노트가 이 계정에 저장되어, 다른 기기에서도 이어 볼 수 있습니다.</p>' +
        '<div class="student-sync-status">' +
          (형편.syncing ? '기록을 맞추는 중…' : 형편.error ? 안전하게(형편.error) : '이 기기의 기록과 맞춰졌습니다') +
        '</div>' +
        '<button type="button" class="btn btn-primary" id="studentSyncNow">지금 맞추기</button>' +
        '<button type="button" class="student-logout" id="studentLogout">로그아웃</button>' +
      '</form>';
    창.querySelector("#studentSyncNow").onclick = () => 맞춤.sync();
    창.querySelector("#studentLogout").onclick = async () => { await 맞춤.logout(); 창.close(); };
  }

  /* ---------- 가입 / 로그인 ---------- */
  /* 서버(api/student-account.js)의 새PIN문제() 와 같은 규칙입니다.
     한쪽만 고치면 "되는데 안 된다"는 말이 나오므로 함께 고쳐야 합니다. */
  function 새비밀번호문제(값) {
    const v = String(값 || "");
    if (!/^\d{6,12}$/.test(v)) return "비밀번호는 숫자 6~12자리로 만들어 주세요.";
    if (/^(\d)\1+$/.test(v)) return "같은 숫자만 쓰면 너무 쉽게 뚫립니다. 다르게 만들어 주세요.";
    const 차이 = [...v].slice(1).map((글, i) => Number(글) - Number(v[i]));
    if (차이.every(d => d === 1) || 차이.every(d => d === -1)) {
      return "1234 처럼 이어지는 숫자는 쓸 수 없습니다. 다르게 만들어 주세요.";
    }
    return "";
  }

  /* 과목은 가입할 때 묻지 않습니다. 처음 온 학생에게 '공통수학2 와 대수 중
     무엇을 주로 하느냐'는 답하기 어려운 질문이고, 나중에 홈의 '학년·반·과목
     변경'에서 언제든 바꿀 수 있습니다. 학년에 맞는 첫 과목으로 시작합니다. */
  function 기본과목(학년) {
    const 맞는것 = Object.entries(과목들).find(([, 과목]) => 과목.grades.includes(String(학년)));
    return 맞는것 ? 맞는것[0] : "";
  }

  function 들어가기전(모드) {
    const 만드나 = 모드 !== "login";
    창.innerHTML =
      '<div class="student-account-card">' +
        '<form method="dialog"><button class="student-dialog-close" aria-label="닫기">×</button></form>' +
        '<span class="eyebrow">MY STUDY</span>' +
        '<h2 id="studentEntryTitle">' + (만드나 ? '학습 계정 만들기' : '로그인') + '</h2>' +
        '<p id="studentEntryHelp">' + (만드나
          ? '폰에서 풀고 학교 컴퓨터에서 이어 볼 수 있습니다. 기기를 바꿔도 오답노트가 그대로 남습니다.'
          : '전에 만든 아이디와 숫자 비밀번호를 넣어 주세요.') + '</p>' +
        '<form id="studentAccountForm" class="student-account-form">' +
          '<label class="student-name"' + (만드나 ? '' : ' hidden') + '>이름 또는 별명 <span>(선택)</span>' +
            '<input name="name" maxlength="20" autocomplete="nickname" placeholder="예: 민수"></label>' +
          '<label class="student-grade"' + (만드나 ? '' : ' hidden') + '>학년' +
            '<select name="grade"><option value="1">고1</option><option value="2">고2</option><option value="3">고3</option></select></label>' +
          '<label>아이디<input name="id" required minlength="4" maxlength="16" pattern="[a-z0-9]+" autocomplete="username" autocapitalize="none" placeholder="영문 소문자·숫자 4~16자"></label>' +
          '<label>비밀번호<input name="pin" required type="password" inputmode="numeric" ' +
            'minlength="' + (만드나 ? 6 : 4) + '" maxlength="12" pattern="[0-9]+" ' +
            'autocomplete="' + (만드나 ? 'new-password' : 'current-password') + '" ' +
            'placeholder="' + (만드나 ? '숫자 6자리 이상' : '숫자 비밀번호') + '"></label>' +
          '<label class="student-confirm"' + (만드나 ? '' : ' hidden') + '>비밀번호 다시' +
            '<input name="confirm" type="password" inputmode="numeric" minlength="6" maxlength="12" pattern="[0-9]+" autocomplete="new-password" placeholder="같은 숫자를 다시"></label>' +
          /* 숨길 일이 아닙니다. 나중에 알게 되는 편이 훨씬 나쁩니다. */
          (만드나
            ? '<p class="student-account-help">비밀번호는 숫자 6자리 이상. 1111 이나 1234 처럼 뻔한 것은 쓸 수 없습니다.<br>' +
              '아이디와 비밀번호를 꼭 기억하세요 — 잊어버리면 되찾을 수 없습니다.<br>' +
              '선생님은 학습 기록(오늘의 학습·오답노트)을 봅니다. 질문은 그대로 익명입니다.</p>'
            : '<p class="student-account-help">계정이 없어도 창을 닫고 그냥 둘러볼 수 있습니다.</p>') +
          '<p class="student-account-error" role="status"></p>' +
          '<button class="btn btn-primary" type="submit">' + (만드나 ? '계정 만들기 →' : '로그인 →') + '</button>' +
        '</form>' +
        '<button type="button" class="student-text-action" id="studentSwap">' +
          (만드나 ? '이미 계정이 있어요 · 로그인' : '계정 만들기') + '</button>' +
      '</div>';

    const 폼 = 창.querySelector("#studentAccountForm");
    const 오류 = 창.querySelector(".student-account-error");
    창.querySelector("#studentSwap").onclick = () => 들어가기전(만드나 ? "login" : "register");


    폼.onsubmit = async 사건 => {
      사건.preventDefault();
      if (만드나) {
        /* 서버도 같은 것을 다시 봅니다(그쪽이 진짜 관문입니다).
           여기서 먼저 보는 건 학생이 왜 안 되는지 바로 알게 하려는 것입니다. */
        const 문제 = 새비밀번호문제(폼.elements.pin.value);
        if (문제) { 오류.textContent = 문제; return; }
        if (폼.elements.pin.value !== 폼.elements.confirm.value) {
          오류.textContent = "비밀번호가 서로 다릅니다.";
          return;
        }
      }
      const 보내기단추 = 폼.querySelector("button[type=submit]");
      보내기단추.disabled = true;
      오류.textContent = "";
      try {
        /* 학년·과목을 먼저 이 기기에 적어 둡니다. 가입 직후 맞추기가 돌면서
           그대로 계정에 올라가, 다른 기기에서 로그인해도 따라옵니다. */
        if (만드나) {
          window.HomeProfile?.저장({
            name: 폼.elements.name.value,
            grade: 폼.elements.grade.value,
            className: "",
            track: 기본과목(폼.elements.grade.value),
          });
        }
        await 맞춤[만드나 ? "register" : "login"]({
          id: 폼.elements.id.value,
          pin: 폼.elements.pin.value,
          name: 폼.elements.name.value,
        });
        창.close();
      } catch (e) {
        오류.textContent = e.message;
      } finally {
        보내기단추.disabled = false;
      }
    };
  }

  function 그리기(형편 = 맞춤.getState()) {
    단추.hidden = !형편.signedIn;
    if (형편.signedIn) {
      단추.textContent = (형편.student.name || 형편.student.id) + " · 내 기록";
      단추.classList.add("signed-in");
      if (창.open) 들어온뒤(형편);
    }
  }

  단추.onclick = () => { 들어온뒤(맞춤.getState()); 창.showModal(); };

  // 홈의 '가입하고 시작' 단추가 이걸 부릅니다
  window.StudentAccountUI = {
    열기(모드) {
      const 형편 = 맞춤.getState();
      if (형편.signedIn) 들어온뒤(형편); else 들어가기전(모드 || "register");
      창.showModal();
    },
  };

  window.addEventListener("student-account-change", 사건 => 그리기(사건.detail));
  그리기();
})();
