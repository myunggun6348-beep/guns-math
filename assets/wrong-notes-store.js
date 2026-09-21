
(function(){
  "use strict";
  const KEY="math-wrong-notes-v1",STATS_KEY="math-concept-stats-v1";
  function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
  function persist(items){localStorage.setItem(KEY,JSON.stringify(items));window.StudentSync?.changed();window.dispatchEvent(new CustomEvent("wrong-notes-change"));return true}
  function write(items){
    const saved=items.slice(0,200);try{return persist(saved)}catch{}
    for(let i=saved.length-1;i>=0;i--){if(saved[i].feedbackImage||saved[i].solutionImage){saved[i]={...saved[i],feedbackImage:"",solutionImage:""};try{return persist(saved)}catch{}}}
    return false;
  }
  function statKey(data){return data.conceptId||("name:"+(data.conceptName||"기타"))}
  function readStats(){
    try{
      const value=JSON.parse(localStorage.getItem(STATS_KEY)||"{}");
      if(value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length)return value;
    }catch{}
    const migrated={};
    read().forEach(note=>{
      const key=statKey(note),correct=note.mastered?1:0,attempts=Math.max(1,note.attempts||1),wrong=Math.max(1,attempts-correct);
      const row=migrated[key]||{key,conceptId:note.conceptId||"",name:note.conceptName||"기타",subject:note.subject||"",attempts:0,correct:0,wrong:0,lastAt:note.lastWrongAt||note.createdAt||""};
      row.attempts+=wrong+correct;row.correct+=correct;row.wrong+=wrong;migrated[key]=row;
    });
    if(Object.keys(migrated).length)writeStats(migrated);
    return migrated;
  }
  function writeStats(value){try{localStorage.setItem(STATS_KEY,JSON.stringify(value));window.StudentSync?.changed();return true}catch{return false}}
  function track(data,isCorrect){
    if(!data.conceptId&&!data.conceptName)return;
    const all=readStats(),key=statKey(data),row=all[key]||{key,conceptId:data.conceptId||"",name:data.conceptName||"기타",subject:data.subject||"",attempts:0,correct:0,wrong:0,lastAt:""};
    row.name=data.conceptName||row.name;row.subject=data.subject||row.subject;row.conceptId=data.conceptId||row.conceptId;
    row.attempts++;if(isCorrect)row.correct++;else row.wrong++;row.lastAt=new Date().toISOString();all[key]=row;writeStats(all);
  }
  function stats(){
    return Object.values(readStats()).map(row=>({...row,rate:row.attempts?Math.round(row.correct/row.attempts*100):0}))
      .sort((a,b)=>a.rate-b.rate||b.attempts-a.attempts||a.name.localeCompare(b.name,"ko"));
  }
  function performance(){
    const rows=stats(),attempts=rows.reduce((n,x)=>n+x.attempts,0),correct=rows.reduce((n,x)=>n+x.correct,0);
    return{concepts:rows.length,attempts,correct,wrong:attempts-correct,rate:attempts?Math.round(correct/attempts*100):0,weakest:rows[0]||null};
  }
  function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
  function idFor(data){return hash([data.source||"",data.sourceKey||"",data.prompt||""].join("|"))}
  function solutionImage(value){const image=String(value||"");return /^data:image\/(?:png|webp|jpeg);base64,/.test(image)&&image.length<350000?image:""}
  function record(data,isCorrect){
    track(data,isCorrect);
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
      solutionImage:solutionImage(data.solutionImage),
      reviewHref:data.reviewHref||"",mastered:false,lastWrongAt:now,attempts:index>=0?(items[index].attempts||0)+1:1,
      createdAt:index>=0?items[index].createdAt:now
    };
    if(index>=0)items.splice(index,1);
    items.unshift(note);write(items);return true;
  }
  function attempt(id,isCorrect,userAnswer){
    const items=read(),index=items.findIndex(x=>x.id===id);if(index<0)return false;
    const now=new Date().toISOString();
    track(items[index],isCorrect);
    items[index]={...items[index],userAnswer:String(userAnswer??items[index].userAnswer),attempts:(items[index].attempts||0)+1,
      mastered:Boolean(isCorrect),masteredAt:isCorrect?now:"",lastWrongAt:isCorrect?items[index].lastWrongAt:now};
    write(items);return true;
  }
  function updateSolution(id,value){
    const image=solutionImage(value),items=read(),index=items.findIndex(x=>x.id===id);if(!image||index<0)return false;
    items[index]={...items[index],feedbackImage:image,feedbackAt:new Date().toISOString()};return write(items);
  }
  function remove(id){write(read().filter(x=>x.id!==id))}
  function clearMastered(){write(read().filter(x=>!x.mastered))}
  function count(){const items=read();return{all:items.length,active:items.filter(x=>!x.mastered).length,mastered:items.filter(x=>x.mastered).length}}
  window.WrongNotes={all:read,record,attempt,updateSolution,remove,clearMastered,count,idFor,stats,performance};
})();
