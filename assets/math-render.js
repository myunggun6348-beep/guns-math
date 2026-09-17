(function(){
  "use strict";

  const SUP={"⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","⁺":"+","⁻":"-","ˣ":"x"};
  const SUB={"₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9","₊":"+","₋":"-"};
  const RUN=/[A-Za-zΑ-Ωα-ω0-9πθ∞ΔΣ∫√₀-₉₊₋⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ˣ′°+\-−±×÷=<>≤≥≠≈→∪∩()[\]{},.|/·\s]+/g;

  function looksLikeMath(value){
    const s=value.trim();
    if(!s)return false;
    return /[=<>≤≥≠≈→∪∩∫Σ√∞±×÷⁰¹²³⁴⁵⁶⁷⁸⁹₀-₉′°/]/.test(s)
      || /\b(?:lim|sin|cos|tan|log|ln|exp)\b/.test(s)
      || /[A-Za-zΑ-Ωα-ω]\s*[+−-]\s*(?:\d|[A-Za-zΑ-Ωα-ω])/.test(s)
      || /^\(\s*[−-]?\d+(?:\.\d+)?\s*,\s*[−-]?\d+(?:\.\d+)?(?:\s*,\s*[−-]?\d+(?:\.\d+)?)?\s*\)$/.test(s);
  }

  function script(value,map,mark,operator){
    return value.replace(mark,chars=>operator+"{"+[...chars].map(ch=>map[ch]||ch).join("")+"}");
  }

  function fractions(value){
    let s=value;
    s=s.replace(/\b(sin|cos|tan)\s+([A-Za-zΑ-Ωα-ω0-9πθ∞⁰-⁹₀-₉]+)\s*\/\s*(\|[^|]+\||[A-Za-zΑ-Ωα-ω0-9πθ∞⁰-⁹₀-₉]+)/g,"\\frac{$1 $2}{$3}");
    s=s.replace(/\(([^()]*)\)\s*\/\s*\(([^()]*)\)/g,"\\frac{$1}{$2}");
    s=s.replace(/([A-Za-zΑ-Ωα-ω0-9πθ∞⁰-⁹₀-₉]+)\s*\/\s*\(([^()]*)\)/g,"\\frac{$1}{$2}");
    s=s.replace(/\(([^()]*)\)\s*\/\s*(\|[^|]+\||[A-Za-zΑ-Ωα-ω0-9πθ∞⁰-⁹₀-₉]+)/g,"\\frac{$1}{$2}");
    for(let i=0;i<3;i++){
      const next=s.replace(/([A-Za-zΑ-Ωα-ω0-9πθ∞⁰-⁹₀-₉]+)\s*\/\s*(\|[^|]+\||[A-Za-zΑ-Ωα-ω0-9πθ∞⁰-⁹₀-₉]+)/g,"\\frac{$1}{$2}");
      if(next===s)break;s=next;
    }
    return s;
  }

  function toTex(value){
    let s=value.trim();
    s=s.replace(/lim\s*\(\s*([A-Za-z])\s*→\s*([^)]+)\)/g,"\\lim_{$1\\to $2}");
    s=s.replace(/∫([₀-₉₊₋]*)([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]*)/g,(_,lo,hi)=>"\\int"+(lo?"_{"+[...lo].map(ch=>SUB[ch]||ch).join("")+"}":"")+(hi?"^{"+[...hi].map(ch=>SUP[ch]||ch).join("")+"}":""));
    s=s.replace(/√\(([^()]*)\)/g,"\\sqrt{$1}").replace(/√([A-Za-zΑ-Ωα-ω0-9πθ∞⁰-⁹₀-₉]+)/g,"\\sqrt{$1}");
    s=fractions(s);
    s=s.replace(/(\d+)\s*P\s*(\d+)/g,"{}_$1\\mathrm{P}_$2").replace(/(\d+)\s*C\s*(\d+)/g,"{}_$1\\mathrm{C}_$2");
    s=script(s,SUP,/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ˣ]+/g,"^");
    s=script(s,SUB,/[₀-₉₊₋]+/g,"_");
    s=s.replace(/−/g,"-").replace(/×/g,"\\times ").replace(/÷/g,"\\div ").replace(/→/g,"\\to ")
      .replace(/≤/g,"\\le ").replace(/≥/g,"\\ge ").replace(/≠/g,"\\ne ").replace(/≈/g,"\\approx ")
      .replace(/∪/g,"\\cup ").replace(/∩/g,"\\cap ").replace(/∞/g,"\\infty ").replace(/Σ/g,"\\sum ")
      .replace(/π/g,"\\pi ").replace(/θ/g,"\\theta ").replace(/Δ/g,"\\Delta ").replace(/°/g,"^{\\circ}").replace(/′/g,"'");
    s=s.replace(/\b(sin|cos|tan|log|ln|exp)(?![A-Za-z])/g,"\\$1");
    return s;
  }

  function renderTextNode(node){
    const text=node.nodeValue;
    if(!text||!looksLikeMath(text))return;
    RUN.lastIndex=0;
    let match,last=0,changed=false;
    const fragment=document.createDocumentFragment();
    while((match=RUN.exec(text))){
      const raw=match[0],lead=raw.match(/^\s*/)[0],tail=raw.match(/\s*$/)[0],core=raw.slice(lead.length,raw.length-tail.length);
      if(!looksLikeMath(core))continue;
      if(match.index>last)fragment.append(document.createTextNode(text.slice(last,match.index)));
      if(lead)fragment.append(document.createTextNode(lead));
      const span=document.createElement("span");span.className="math-expression";span.dataset.source=core;
      try{window.katex.render(toTex(core),span,{throwOnError:true,strict:"ignore",output:"htmlAndMathml"})}
      catch{span.textContent=core;span.classList.add("math-fallback")}
      fragment.append(span);
      if(tail)fragment.append(document.createTextNode(tail));
      last=match.index+raw.length;changed=true;
    }
    if(!changed)return;
    if(last<text.length)fragment.append(document.createTextNode(text.slice(last)));
    node.replaceWith(fragment);
  }

  function typeset(root=document){
    if(!window.katex)return;
    const targets=[];
    if(root.nodeType===1&&root.matches("[data-math]"))targets.push(root);
    root.querySelectorAll?.("[data-math]").forEach(el=>targets.push(el));
    targets.forEach(target=>{
      const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT,{acceptNode(node){
        const parent=node.parentElement;
        return !parent||parent.closest(".katex,script,style,textarea,input,[data-no-math]")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
      }});
      const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(renderTextNode);
      target.dataset.mathReady="true";
    });
  }

  window.MathView={typeset,toTex};
})();




