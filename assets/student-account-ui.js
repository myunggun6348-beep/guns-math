(function(){
  "use strict";
  const sync=window.StudentSync;if(!sync)return;
  const button=document.createElement("button");button.type="button";button.className="student-account-button";button.textContent="학생 로그인";
  const nav=document.querySelector(".nav-right");if(nav)nav.insertBefore(button,nav.firstChild);
  const dialog=document.createElement("dialog");dialog.className="student-account-dialog";document.body.append(dialog);
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  function signedIn(state){
    dialog.innerHTML='<form method="dialog" class="student-account-card"><button class="student-dialog-close" aria-label="닫기">×</button><span class="eyebrow">SYNC ON</span><h2>'+esc(state.student.name||state.student.id)+'의 학습 계정</h2><p><b>'+esc(state.student.id)+'</b>로 로그인했습니다. 오늘의 학습과 오답 기록이 이 계정에 자동 저장됩니다.</p><div class="student-sync-status">'+(state.syncing?'기록을 맞추는 중…':state.error?esc(state.error):'이 기기의 기록과 동기화됨')+'</div><button type="button" class="btn btn-primary" id="studentSyncNow">지금 동기화</button><button type="button" class="student-logout" id="studentLogout">로그아웃</button></form>';
    dialog.querySelector("#studentSyncNow").onclick=()=>sync.sync();dialog.querySelector("#studentLogout").onclick=async()=>{await sync.logout();dialog.close()};
  }
  function signedOut(){
    dialog.innerHTML='<div class="student-account-card"><form method="dialog"><button class="student-dialog-close" aria-label="닫기">×</button></form><span class="eyebrow">STUDENT ACCOUNT</span><h2>학습 기록 이어 보기</h2><p>이메일 없이 학생 코드와 PIN으로 태블릿·휴대폰·PC의 기록을 이어서 볼 수 있습니다.</p><div class="student-tabs"><button type="button" class="on" data-mode="login">로그인</button><button type="button" data-mode="register">처음 만들기</button></div><form id="studentAccountForm" class="student-account-form"><label class="student-name" hidden>이름 또는 별명<input name="name" maxlength="20" autocomplete="nickname"></label><label>학생 코드<input name="id" required minlength="4" maxlength="16" pattern="[a-z0-9]+" autocomplete="username" autocapitalize="none" placeholder="영문 소문자·숫자"></label><label>PIN<input name="pin" required type="password" inputmode="numeric" minlength="4" maxlength="8" pattern="[0-9]+" autocomplete="current-password" placeholder="숫자 4~8자리"></label><p class="student-account-help">학생 코드와 PIN은 다른 기기에서도 똑같이 입력해야 합니다.</p><p class="student-account-error" role="status"></p><button class="btn btn-primary" type="submit">로그인 →</button></form></div>';
    let mode="login";const form=dialog.querySelector("#studentAccountForm"),error=dialog.querySelector(".student-account-error");
    dialog.querySelectorAll("[data-mode]").forEach(tab=>tab.onclick=()=>{mode=tab.dataset.mode;dialog.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("on",x===tab));form.querySelector(".student-name").hidden=mode!=="register";form.elements.pin.autocomplete=mode==="register"?"new-password":"current-password";form.querySelector("button[type=submit]").textContent=mode==="register"?"계정 만들기 →":"로그인 →";error.textContent=""});
    form.onsubmit=async event=>{event.preventDefault();const submit=form.querySelector("button[type=submit]");submit.disabled=true;error.textContent="";try{await sync[mode]({id:form.elements.id.value,pin:form.elements.pin.value,name:form.elements.name.value});dialog.close()}catch(e){error.textContent=e.message}finally{submit.disabled=false}};
  }
  function render(state=sync.getState()){button.textContent=state.signedIn?(state.student.name||state.student.id)+" · 동기화":"학생 로그인";button.classList.toggle("signed-in",state.signedIn);if(dialog.open)(state.signedIn?signedIn:signedOut)(state)}
  button.onclick=()=>{const state=sync.getState();(state.signedIn?signedIn:signedOut)(state);dialog.showModal()};
  window.addEventListener("student-account-change",event=>render(event.detail));render();
})();
