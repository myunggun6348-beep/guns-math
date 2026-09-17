(function(){
  "use strict";
  const store=window.WrongNotes;
  const imageValue=value=>/^data:image\/(?:png|webp|jpeg);base64,/.test(String(value||""))?String(value):"";
  const noteFor=id=>store.all().find(note=>note.id===id);
  const message=text=>window.dispatchEvent(new CustomEvent("wrong-work-message",{detail:text}));

  function fileName(note){
    const date=new Date().toISOString().slice(0,10);
    const concept=(note.conceptName||"수학-오답").replace(/[\\/:*?"<>|]/g,"-");
    return date+"-"+concept+"-풀이.png";
  }
  function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src})}
  async function pngBlob(note){
    const src=imageValue(note.feedbackImage)||imageValue(note.solutionImage);if(!src)throw new Error("저장된 풀이가 없습니다.");
    const image=await loadImage(src),canvas=document.createElement("canvas");canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext("2d").drawImage(image,0,0);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("이미지를 만들 수 없습니다.")),"image/png"));
  }
  async function download(id,quiet=false){
    const note=noteFor(id);if(!note)return;
    try{const blob=await pngBlob(note),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=fileName(note);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);if(!quiet)message("풀이 이미지를 PNG로 저장했습니다.")}catch{message("풀이 이미지를 저장하지 못했습니다.")}
  }
  async function share(id){
    const note=noteFor(id);if(!note)return;
    try{
      const blob=await pngBlob(note),file=new File([blob],fileName(note),{type:"image/png"});
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:"수학 오답 풀이",text:(note.conceptName||"수학")+" 오답 풀이입니다.",files:[file]});message("제출할 앱으로 풀이 이미지를 전달했습니다.")}
      else{await download(id,true);message("공유 기능을 지원하지 않아 제출용 PNG를 저장했습니다.")}
    }catch(error){if(error?.name!=="AbortError")message("제출용 이미지를 준비하지 못했습니다.")}
  }
  function open(id,onSave){
    const note=noteFor(id);if(!note)return;
    const original=imageValue(note.solutionImage),current=imageValue(note.feedbackImage)||original;if(!current)return;
    const overlay=document.createElement("div");overlay.className="work-editor";overlay.innerHTML='<section class="work-editor-panel" role="dialog" aria-modal="true" aria-labelledby="workEditorTitle"><header><div><span>풀이 첨삭</span><h2 id="workEditorTitle">'+String(note.conceptName||"오답 풀이").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))+'</h2></div><button type="button" class="work-editor-close" aria-label="첨삭 닫기">×</button></header><div class="work-editor-tools" role="toolbar" aria-label="첨삭 도구"><button type="button" class="work-pen active" data-tool="pen" aria-pressed="true">✎ 펜</button><button type="button" class="work-pen" data-tool="eraser" aria-pressed="false">지우개</button><button type="button" class="work-color black active" data-color="#172033" aria-label="검정색"></button><button type="button" class="work-color red" data-color="#dc2626" aria-label="빨간색"></button><button type="button" class="work-color blue" data-color="#2563eb" aria-label="파란색"></button><label>굵기 <input type="range" class="work-size" min="2" max="14" step="2" value="5"></label><button type="button" class="work-undo" disabled>↶ 되돌리기</button><button type="button" class="work-redo" disabled>↷ 다시 실행</button><button type="button" class="work-clear">이번 첨삭 지우기</button><button type="button" class="work-original">원본으로</button></div><div class="work-editor-scroll"><div class="work-editor-stage"><img alt="첨삭할 학생 풀이"><canvas aria-label="풀이 첨삭 필기판"></canvas></div></div><footer><p>태블릿 펜이나 손가락으로 첨삭할 수 있습니다.</p><div><button type="button" class="wrong-button work-cancel">취소</button><button type="button" class="wrong-button primary work-save">첨삭 저장</button></div></footer></section>';
    document.body.appendChild(overlay);document.body.classList.add("work-editor-open");
    const image=overlay.querySelector("img"),canvas=overlay.querySelector("canvas"),ctx=canvas.getContext("2d"),undoBtn=overlay.querySelector(".work-undo"),redoBtn=overlay.querySelector(".work-redo");
    let baseSource=current,tool="pen",color="#172033",width=5,drawing=false,active=null,strokes=[],redo=[];
    function close(){document.body.classList.remove("work-editor-open");overlay.remove();document.removeEventListener("keydown",onKey)}
    function update(){undoBtn.disabled=!strokes.length;redoBtn.disabled=!redo.length}
    function drawStroke(stroke){if(!stroke.points.length)return;ctx.save();ctx.globalCompositeOperation=stroke.tool==="eraser"?"destination-out":"source-over";ctx.strokeStyle=stroke.color;ctx.lineWidth=stroke.width;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(stroke.points[0].x,stroke.points[0].y);for(let i=1;i<stroke.points.length;i++)ctx.lineTo(stroke.points[i].x,stroke.points[i].y);if(stroke.points.length===1)ctx.lineTo(stroke.points[0].x+.01,stroke.points[0].y+.01);ctx.stroke();ctx.restore()}
    function redraw(){ctx.clearRect(0,0,canvas.width,canvas.height);strokes.forEach(drawStroke);update()}
    function setBase(src){baseSource=src;image.onload=()=>{canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;strokes=[];redo=[];redraw()};image.src=src}
    function point(event){const r=canvas.getBoundingClientRect(),scale=canvas.width/r.width;return{x:(event.clientX-r.left)*scale,y:(event.clientY-r.top)*scale}}
    function down(event){event.preventDefault();canvas.setPointerCapture(event.pointerId);drawing=true;active={tool,color,width:width*canvas.width/canvas.clientWidth,points:[point(event)]};strokes.push(active);redo=[];redraw()}
    function move(event){if(!drawing)return;event.preventDefault();active.points.push(point(event));redraw()}
    function up(event){if(!drawing)return;event.preventDefault();drawing=false;active=null;update()}
    function selectTool(value){tool=value;overlay.querySelectorAll("[data-tool]").forEach(button=>{const on=button.dataset.tool===tool;button.classList.toggle("active",on);button.setAttribute("aria-pressed",String(on))})}
    function onKey(event){if(event.key==="Escape")close()}
    overlay.querySelectorAll("[data-tool]").forEach(button=>button.addEventListener("click",()=>selectTool(button.dataset.tool)));
    overlay.querySelectorAll("[data-color]").forEach(button=>button.addEventListener("click",()=>{color=button.dataset.color;selectTool("pen");overlay.querySelectorAll("[data-color]").forEach(x=>x.classList.toggle("active",x===button))}));
    overlay.querySelector(".work-size").addEventListener("input",event=>{width=Number(event.target.value)});
    undoBtn.addEventListener("click",()=>{if(!strokes.length)return;redo.push(strokes.pop());redraw()});redoBtn.addEventListener("click",()=>{if(!redo.length)return;strokes.push(redo.pop());redraw()});
    overlay.querySelector(".work-clear").addEventListener("click",()=>{redo=strokes.slice();strokes=[];redraw()});overlay.querySelector(".work-original").addEventListener("click",()=>setBase(original));
    overlay.querySelector(".work-save").addEventListener("click",async()=>{const base=await loadImage(baseSource),out=document.createElement("canvas");out.width=base.naturalWidth;out.height=base.naturalHeight;const outCtx=out.getContext("2d");outCtx.drawImage(base,0,0);outCtx.drawImage(canvas,0,0);const result=out.toDataURL("image/webp",.8);if(store.updateSolution(id,result)){close();onSave?.();message("첨삭한 풀이를 저장했습니다.")}else message("첨삭 이미지를 저장하지 못했습니다.")});
    overlay.querySelector(".work-editor-close").addEventListener("click",close);overlay.querySelector(".work-cancel").addEventListener("click",close);overlay.addEventListener("click",event=>{if(event.target===overlay)close()});
    canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);document.addEventListener("keydown",onKey);setBase(current);overlay.querySelector(".work-editor-close").focus();
  }
  window.WrongWorkTools={open,download,share};
})();
