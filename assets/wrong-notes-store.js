
(function(){
  "use strict";
  const KEY="math-wrong-notes-v1";
  function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
  function write(items){try{localStorage.setItem(KEY,JSON.stringify(items.slice(0,200)));window.dispatchEvent(new CustomEvent("wrong-notes-change"));return true}catch{return false}}
  function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
  function idFor(data){return hash([data.source||"",data.sourceKey||"",data.prompt||""].join("|"))}
  function record(data,isCorrect){
    const items=read(),id=idFor(data),index=items.findIndex(x=>x.id===id),now=new Date().toISOString();
    if(isCorrect){
      if(index>=0){items[index]={...items[index],mastered:true,masteredAt:now,attempts:(items[index].attempts||0)+1};write(items)}
      return index>=0;
    }
    const note={
      id,source:data.source||"학습",sourceKey:data.sourceKey||"",sourceTitle:data.sourceTitle||data.subject||"수학",
      grade:data.grade||"",subject:data.subject||"",conceptId:data.conceptId||"",conceptName:data.conceptName||"",
      prompt:data.prompt||"",type:data.type||"text",choices:Array.isArray(data.choices)?data.choices:[],
      correctAnswer:String(data.correctAnswer??""),userAnswer:String(data.userAnswer??""),explanation:data.explanation||"",
      reviewHref:data.reviewHref||"",mastered:false,lastWrongAt:now,attempts:index>=0?(items[index].attempts||0)+1:1,
      createdAt:index>=0?items[index].createdAt:now
    };
    if(index>=0)items.splice(index,1);
    items.unshift(note);write(items);return true;
  }
  function attempt(id,isCorrect,userAnswer){
    const items=read(),index=items.findIndex(x=>x.id===id);if(index<0)return false;
    const now=new Date().toISOString();
    items[index]={...items[index],userAnswer:String(userAnswer??items[index].userAnswer),attempts:(items[index].attempts||0)+1,
      mastered:Boolean(isCorrect),masteredAt:isCorrect?now:"",lastWrongAt:isCorrect?items[index].lastWrongAt:now};
    write(items);return true;
  }
  function remove(id){write(read().filter(x=>x.id!==id))}
  function clearMastered(){write(read().filter(x=>!x.mastered))}
  function count(){const items=read();return{all:items.length,active:items.filter(x=>!x.mastered).length,mastered:items.filter(x=>x.mastered).length}}
  window.WrongNotes={all:read,record,attempt,remove,clearMastered,count,idFor};
})();
