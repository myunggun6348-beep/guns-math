(function(){
  "use strict";
  const pages=new Map();
  let observer=null;
  let settings={tool:"pen",color:"#172033",size:4,finger:false};

  function markup(){
    return '<section class="game-scratch" aria-label="문제 풀이 공간"><div class="scratch-heading"><div><strong>풀이 공간</strong><span>태블릿 펜으로 바로 계산해 보세요.</span></div><span class="scratch-hint">손바닥과 손가락은 화면 이동</span></div><div class="scratch-toolbar" role="toolbar" aria-label="필기 도구"><div class="scratch-tool-group"><button type="button" class="scratch-tool active" data-scratch-tool="pen" aria-pressed="true">✎ 펜</button><button type="button" class="scratch-tool" data-scratch-tool="eraser" aria-pressed="false">지우개</button></div><div class="scratch-tool-group scratch-colors" aria-label="펜 색상"><button type="button" class="scratch-color active" data-scratch-color="#172033" aria-label="검정색" aria-pressed="true"></button><button type="button" class="scratch-color blue" data-scratch-color="#2563eb" aria-label="파란색" aria-pressed="false"></button><button type="button" class="scratch-color red" data-scratch-color="#dc2626" aria-label="빨간색" aria-pressed="false"></button></div><label class="scratch-size">굵기 <input type="range" id="scratchSize" min="2" max="10" step="2" value="4" aria-label="펜 굵기"></label><div class="scratch-tool-group"><button type="button" class="scratch-icon" id="scratchUndo" aria-label="되돌리기" title="되돌리기">↶</button><button type="button" class="scratch-icon" id="scratchRedo" aria-label="다시 실행" title="다시 실행">↷</button><button type="button" class="scratch-clear" id="scratchClear">전체 지우기</button></div><label class="scratch-finger"><input type="checkbox" id="scratchFinger"> 손가락 필기</label></div><div class="scratch-paper"><canvas id="scratchCanvas" aria-label="필기용 풀이판"></canvas><span class="scratch-placeholder">식을 세우고 계산 과정을 적어 보세요</span></div></section>';
  }
  function pageFor(key){if(!pages.has(key))pages.set(key,{strokes:[],undo:[],redo:[]});return pages.get(key)}
  function mount(key){
    if(observer){observer.disconnect();observer=null}
    const canvas=document.getElementById("scratchCanvas");if(!canvas)return;
    const paper=canvas.parentElement,page=pageFor(key),ctx=canvas.getContext("2d"),undoBtn=document.getElementById("scratchUndo"),redoBtn=document.getElementById("scratchRedo"),clearBtn=document.getElementById("scratchClear"),sizeInput=document.getElementById("scratchSize"),fingerInput=document.getElementById("scratchFinger");
    let drawing=false,changed=false,before=null,activeStroke=null;
    const clone=strokes=>strokes.map(s=>({color:s.color,width:s.width,points:s.points.map(p=>({...p}))}));
    function updateState(){paper.classList.toggle("has-ink",page.strokes.length>0);undoBtn.disabled=page.undo.length===0;redoBtn.disabled=page.redo.length===0}
    function fit(){const r=canvas.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*ratio));canvas.height=Math.max(1,Math.round(r.height*ratio));ctx.setTransform(ratio,0,0,ratio,0,0);redraw()}
    function line(stroke){if(!stroke.points.length)return;ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle=stroke.color;ctx.lineWidth=stroke.width;ctx.beginPath();const first=stroke.points[0];ctx.moveTo(first.x*canvas.clientWidth,first.y*canvas.clientHeight);if(stroke.points.length===1)ctx.lineTo(first.x*canvas.clientWidth+.01,first.y*canvas.clientHeight+.01);for(let i=1;i<stroke.points.length;i++){const p=stroke.points[i];ctx.lineTo(p.x*canvas.clientWidth,p.y*canvas.clientHeight)}ctx.stroke();ctx.restore()}
    function redraw(){ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);page.strokes.forEach(line);updateState()}
    function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
    function distanceToSegment(p,a,b){const w=canvas.clientWidth,h=canvas.clientHeight,px=p.x*w,py=p.y*h,ax=a.x*w,ay=a.y*h,bx=b.x*w,by=b.y*h,dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l)):0;return Math.hypot(px-(ax+t*dx),py-(ay+t*dy))}
    function eraseAt(p){const old=page.strokes.length;page.strokes=page.strokes.filter(s=>{if(s.points.length===1)return distanceToSegment(p,s.points[0],s.points[0])>16;for(let i=1;i<s.points.length;i++)if(distanceToSegment(p,s.points[i-1],s.points[i])<=16)return false;return true});if(page.strokes.length!==old){changed=true;redraw()}}
    const allowed=e=>e.pointerType!=="touch"||settings.finger;
    function down(e){if(!allowed(e))return;e.preventDefault();canvas.setPointerCapture(e.pointerId);drawing=true;changed=false;before=clone(page.strokes);const p=point(e);if(settings.tool==="eraser")eraseAt(p);else{activeStroke={color:settings.color,width:settings.size,points:[p]};page.strokes.push(activeStroke);changed=true;redraw()}}
    function move(e){if(!drawing||!allowed(e))return;e.preventDefault();const p=point(e);if(settings.tool==="eraser")eraseAt(p);else{activeStroke.points.push(p);redraw()}}
    function up(e){if(!drawing)return;if(allowed(e))e.preventDefault();drawing=false;activeStroke=null;if(changed){page.undo.push(before);if(page.undo.length>30)page.undo.shift();page.redo=[]}updateState()}
    function setTool(tool){settings.tool=tool;document.querySelectorAll("[data-scratch-tool]").forEach(btn=>{const on=btn.dataset.scratchTool===tool;btn.classList.toggle("active",on);btn.setAttribute("aria-pressed",String(on))});canvas.classList.toggle("eraser",tool==="eraser")}
    document.querySelectorAll("[data-scratch-tool]").forEach(btn=>btn.addEventListener("click",()=>setTool(btn.dataset.scratchTool)));
    document.querySelectorAll("[data-scratch-color]").forEach(btn=>btn.addEventListener("click",()=>{settings.color=btn.dataset.scratchColor;setTool("pen");document.querySelectorAll("[data-scratch-color]").forEach(x=>{const on=x===btn;x.classList.toggle("active",on);x.setAttribute("aria-pressed",String(on))})}));
    sizeInput.value=String(settings.size);sizeInput.addEventListener("input",()=>{settings.size=Number(sizeInput.value)});
    fingerInput.checked=settings.finger;fingerInput.addEventListener("change",()=>{settings.finger=fingerInput.checked;canvas.classList.toggle("finger-draw",settings.finger)});
    undoBtn.addEventListener("click",()=>{if(!page.undo.length)return;page.redo.push(clone(page.strokes));page.strokes=page.undo.pop();redraw()});
    redoBtn.addEventListener("click",()=>{if(!page.redo.length)return;page.undo.push(clone(page.strokes));page.strokes=page.redo.pop();redraw()});
    clearBtn.addEventListener("click",()=>{if(!page.strokes.length)return;page.undo.push(clone(page.strokes));page.redo=[];page.strokes=[];redraw()});
    canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);
    canvas.classList.toggle("finger-draw",settings.finger);setTool(settings.tool);document.querySelectorAll("[data-scratch-color]").forEach(btn=>{const on=btn.dataset.scratchColor===settings.color;btn.classList.toggle("active",on);btn.setAttribute("aria-pressed",String(on))});observer=new ResizeObserver(fit);observer.observe(paper);fit();updateState();
  }
  function reset(){pages.clear();if(observer){observer.disconnect();observer=null}}
  function destroy(){if(observer){observer.disconnect();observer=null}}
  window.GameScratch={markup,mount,reset,destroy};
})();
