(function(){
  "use strict";
  const sync=window.StudentSync;if(!sync)return;
  const button=document.createElement("button");button.type="button";button.className="student-account-button";button.textContent="내 기록";
  const nav=document.querySelector(".nav-right");if(nav)nav.insertBefore(button,nav.firstChild);
  const dialog=document.createElement("dialog");dialog.className="student-account-dialog";document.body.append(dialog);
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  function signedIn(state){
    dialog.innerHTML='<form method="dialog" class="student-account-card"><button class="student-dialog-close" aria-label="닫기">×</button><span class="eyebrow">SYNC ON</span><h2>'+esc(state.student.name||state.student.id)+'의 학습 계정</h2><p><b>'+esc(state.student.id)+'</b>로 로그인했습니다. 오늘의 학습과 오답 기록이 이 계정에 자동 저장됩니다.</p><div class="student-sync-status">'+(state.syncing?'기록을 맞추는 중…':state.error?esc(state.error):'이 기기의 기록과 동기화됨')+'</div><button type="button" class="btn btn-primary" id="studentSyncNow">지금 동기화</button><button type="button" class="student-logout" id="studentLogout">로그아웃</button></form>';
    dialog.querySelector("#studentSyncNow").onclick=()=>sync.sync();dialog.querySelector("#studentLogout").onclick=async()=>{await sync.logout();dialog.close()};
  }
  function signedOut(){
    dialog.innerHTML='<div class="student-account-card"><form method="dialog"><button class="student-dialog-close" aria-label="닫기">×</button></form><span class="eyebrow">MY STUDY</span><div class="student-guest" id="studentGuest"><h2>바로 공부할 수 있어요</h2><p>가입하지 않아도 문제를 풀고 오답노트를 사용할 수 있습니다. 기록은 지금 쓰는 기기에 저장됩니다.</p><button type="button" class="btn btn-primary" id="studentGuestStart">가입 없이 공부하기 →</button><button type="button" class="student-secondary-action" data-mode="register">다른 기기에서도 기록 이어 보기</button><button type="button" class="student-text-action" data-mode="login">이미 계정이 있어요 · 로그인</button></div><div class="student-account-entry" id="studentEntry" hidden><button type="button" class="student-back" id="studentBack">← 선택으로 돌아가기</button><h2 id="studentEntryTitle"></h2><p id="studentEntryHelp"></p><form id="studentAccountForm" class="student-account-form"><label class="student-name" hidden>이름 또는 별명 <span>(선택)</span><input name="name" maxlength="20" autocomplete="nickname" placeholder="예: 민수"></label><label>아이디<input name="id" required minlength="4" maxlength="16" pattern="[a-z0-9]+" autocomplete="username" autocapitalize="none" placeholder="영문 소문자·숫자 4~16자"></label><label>숫자 비밀번호<input name="pin" required type="password" inputmode="numeric" minlength="4" maxlength="8" pattern="[0-9]+" autocomplete="current-password" placeholder="숫자 4~8자리"></label><label class="student-confirm" hidden>숫자 비밀번호 다시 입력<input name="confirm" type="password" inputmode="numeric" minlength="4" maxlength="8" pattern="[0-9]+" autocomplete="new-password" placeholder="같은 숫자를 다시 입력"></label><p class="student-account-help" id="studentFormHelp"></p><p class="student-account-error" role="status"></p><button class="btn btn-primary" type="submit"></button></form></div></div>';
    const form=dialog.querySelector("#studentAccountForm"),error=dialog.querySelector(".student-account-error");let mode="";
    dialog.querySelector("#studentGuestStart").onclick=()=>{dialog.close();document.getElementById("homePersonal")?.scrollIntoView({behavior:"smooth",block:"start"})};
    dialog.querySelector("#studentBack").onclick=()=>{dialog.querySelector("#studentEntry").hidden=true;dialog.querySelector("#studentGuest").hidden=false;mode=""};
    dialog.querySelectorAll("[data-mode]").forEach(link=>link.onclick=()=>{
      mode=link.dataset.mode;const creating=mode==="register";
      dialog.querySelector("#studentGuest").hidden=true;dialog.querySelector("#studentEntry").hidden=false;
      dialog.querySelector("#studentEntryTitle").textContent=creating?"학습 계정 만들기":"기존 계정으로 로그인";
      dialog.querySelector("#studentEntryHelp").textContent=creating?"다른 기기에서도 같은 기록을 보려면 계정을 만드세요.":"전에 만든 아이디와 숫자 비밀번호를 입력하세요.";
      form.querySelector(".student-name").hidden=!creating;form.querySelector(".student-confirm").hidden=!creating;
      form.elements.confirm.required=creating;form.elements.pin.autocomplete=creating?"new-password":"current-password";
      dialog.querySelector("#studentFormHelp").textContent=creating?"아이디와 숫자 비밀번호를 기억해 주세요. 현재 비밀번호 복구 기능은 없습니다.":"계정이 없어도 선택으로 돌아가 가입 없이 공부할 수 있습니다.";
      form.querySelector("button[type=submit]").textContent=creating?"계정 만들고 기록 연결하기 →":"로그인 →";error.textContent="";
    });
    form.onsubmit=async event=>{event.preventDefault();if(mode==="register"&&form.elements.pin.value!==form.elements.confirm.value){error.textContent="숫자 비밀번호가 서로 다릅니다.";return}const submit=form.querySelector("button[type=submit]");submit.disabled=true;error.textContent="";try{await sync[mode]({id:form.elements.id.value,pin:form.elements.pin.value,name:form.elements.name.value});dialog.close()}catch(e){error.textContent=e.message}finally{submit.disabled=false}};
  }
  function render(state=sync.getState()){button.textContent=state.signedIn?(state.student.name||state.student.id)+" · 동기화":"내 기록";button.classList.toggle("signed-in",state.signedIn);if(dialog.open&&state.signedIn)signedIn(state)}
  button.onclick=()=>{const state=sync.getState();(state.signedIn?signedIn:signedOut)(state);dialog.showModal()};
  window.addEventListener("student-account-change",event=>render(event.detail));render();
})();
