(function(root){
  "use strict";
  function shuffle(items,text){
    let seed=2166136261;for(let i=0;i<text.length;i++){seed^=text.charCodeAt(i);seed=Math.imul(seed,16777619)}seed>>>=0;
    const random=()=>{seed+=0x6D2B79F5;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
    const result=items.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result;
  }
  function select({questions,trackKey,date,grade,stats=[],notes=[],diagnostic=[],record,now=Date.now()}){
    const pool=[...new Map(questions.map(q=>[q.prompt,q])).values()],ids=[...new Set(pool.map(q=>q.concept))];
    if(Array.isArray(record?.questionPrompts)&&record.questionPrompts.length===5){
      const saved=record.questionPrompts.map(prompt=>pool.find(q=>q.prompt===prompt));
      if(saved.every(Boolean)&&new Set(saved.map(q=>q.prompt)).size===5)return{questions:saved,focus:(Array.isArray(record.focusConcepts)?record.focusConcepts:[]).filter(id=>ids.includes(id)),reused:true};
    }
    const original=()=>{
      const picked=ids.map(id=>shuffle(pool.filter(q=>q.concept===id),date+"|"+trackKey+"|"+id)[0]);
      const rest=shuffle(pool.filter(q=>!picked.includes(q)),date+"|"+trackKey+"|rest");while(picked.length<5&&rest.length)picked.push(rest.shift());
      return{questions:shuffle(picked.slice(0,5),date+"|"+trackKey+"|order"),focus:[],reused:Boolean(record)};
    };
    // shortcut: 이전 기록에는 문항 목록이 없다. 같은 날 재풀이는 기존 날짜별 선정 방식을 유지한다.
    if(record&&!record.questionPrompts)return original();
    const due=notes.filter(note=>!note.mastered&&String(note.grade)===String(grade)&&ids.includes(note.conceptId)&&(!note.nextReviewAt||Date.parse(note.nextReviewAt)<=now)).sort((a,b)=>(Date.parse(a.nextReviewAt||a.lastWrongAt)||0)-(Date.parse(b.nextReviewAt||b.lastWrongAt)||0));
    const weak=stats.filter(row=>ids.includes(row.conceptId||row.key)&&Number(row.attempts)>0&&Number(row.correct)/Number(row.attempts)<.6).sort((a,b)=>a.correct/a.attempts-b.correct/b.attempts||b.attempts-a.attempts);
    const focus=[...new Set([...due.map(note=>note.conceptId),...weak.map(row=>row.conceptId||row.key),...diagnostic.filter(id=>ids.includes(id))])].slice(0,3);
    if(!focus.length)return original();
    const picked=[],add=q=>{if(q&&!picked.includes(q))picked.push(q)};
    focus.forEach(id=>{const exact=due.find(note=>note.conceptId===id&&pool.some(q=>q.prompt===note.prompt));add(exact?pool.find(q=>q.prompt===exact.prompt):shuffle(pool.filter(q=>q.concept===id),date+"|"+trackKey+"|weak|"+id)[0])});
    const extra=shuffle(pool.filter(q=>focus.includes(q.concept)&&!picked.includes(q)),date+"|"+trackKey+"|weak-rest");while(picked.length<3&&extra.length)add(extra.shift());
    ids.filter(id=>!focus.includes(id)).forEach(id=>{if(picked.length<5)add(shuffle(pool.filter(q=>q.concept===id),date+"|"+trackKey+"|balanced|"+id)[0])});
    const rest=shuffle(pool.filter(q=>!picked.includes(q)),date+"|"+trackKey+"|rest");while(picked.length<5&&rest.length)add(rest.shift());
    return{questions:shuffle(picked.slice(0,5),date+"|"+trackKey+"|order"),focus,reused:false};
  }
  const api={select};if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.DailySelection=api;
})(typeof window!=="undefined"?window:globalThis);
