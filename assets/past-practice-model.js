(function(root,factory){
  if(typeof module!=="undefined"&&module.exports)module.exports=factory(require('./today-data'));
  else root.PastPracticeModel=factory({TODAY_TRACKS:root.TODAY_TRACKS,TODAY_CONCEPTS:root.TODAY_CONCEPTS});
})(typeof window!=="undefined"?window:globalThis,function(data){
  "use strict";
  const tracks=data.TODAY_TRACKS,concepts=data.TODAY_CONCEPTS;
  const levels={basic:'기초',standard:'표준',challenge:'도전'};
  const validCourse=(grade,track)=>['1','2','3'].includes(String(grade))&&Object.hasOwn(tracks,track)&&tracks[track].grades.includes(String(grade));
  const conceptIds=track=>Object.hasOwn(tracks,track)?[...new Set(tracks[track].questions.map(q=>q.concept))]:[];
  const key=row=>[row.exam,row.subject,row.number].join('|');
  function entries(review,catalog){
    const exams=new Map((catalog?.items||[]).map(exam=>[exam.id,exam])),seen=new Set();
    return (review?.items||[]).filter(row=>{
      if(!row||!Object.hasOwn(concepts,row.concept)||!Object.hasOwn(levels,row.difficulty)||!row.topic||!row.reason||!row.reviewedAt||!Number.isInteger(row.number)||row.number<1||!Number.isInteger(row.page)||row.page<1)return false;
      const exam=exams.get(row.exam),set=exam?.sets?.find(s=>s.subject===row.subject),id=key(row);
      if(!set?.files?.problem?.url||seen.has(id))return false;
      seen.add(id);return true;
    });
  }
  function context(params,profile,pref,recommendations=[]){
    const explicit=['grade','subject','concept','topic','difficulty'].some(k=>params.has(k));
    const saved=[profile,pref].find(p=>p&&validCourse(p.grade,p.track));
    let grade=params.has('grade')?params.get('grade'):explicit?'':String(saved?.grade||'');
    let track=params.has('subject')?params.get('subject'):explicit?'':saved?.track||'';
    const requested=params.get('concept')||'';
    if(!track&&requested){const candidates=Object.keys(tracks).filter(id=>validCourse(grade,id)&&conceptIds(id).includes(requested));if(candidates.length===1)track=candidates[0]}
    const recommendation=validCourse(grade,track)?recommendations.find(r=>r.grade===grade&&r.track===track)?.recommendation:null;
    const usable=rec=>rec&&conceptIds(track).includes(rec.conceptId);
    const concept=requested||(!explicit&&usable(recommendation)?recommendation.conceptId:'');
    const difficulty=params.has('difficulty')?params.get('difficulty'):usable(recommendation)&&recommendation.conceptId===concept?recommendation.level:'';
    return{grade,track,concept,topic:params.get('topic')||'',difficulty,explicit,reason:!explicit&&usable(recommendation)?recommendation.reason:''};
  }
  function matching(rows,choice){
    if(!validCourse(choice.grade,choice.track)||!conceptIds(choice.track).includes(choice.concept))return[];
    return rows.filter(row=>row.concept===choice.concept&&(!choice.topic||row.topic===choice.topic));
  }
  function select(rows,choice,now=Date.now()){
    if(!Object.hasOwn(levels,choice.difficulty))return[];
    const pool=matching(rows,choice).filter(row=>row.difficulty===choice.difficulty);
    if(!pool.length)return[];
    // 같은 시험에서만 고르지 않고, 선택한 난도 안에서 하루 최대 세 문제를 순환합니다.
    const groups=new Map();pool.forEach(row=>{if(!groups.has(row.exam))groups.set(row.exam,[]);groups.get(row.exam).push(row)});
    const ordered=[],buckets=[...groups.values()];for(let i=0;ordered.length<pool.length;i++)buckets.forEach(g=>{if(g[i])ordered.push(g[i])});
    const day=Math.floor((now+9*3600000)/86400000),count=Math.min(3,ordered.length);
    let hash=2166136261;for(const c of [choice.grade,choice.track,choice.concept,choice.topic,choice.difficulty].join('|')){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)}
    const start=((day*count+(hash>>>0))%ordered.length+ordered.length)%ordered.length;
    return Array.from({length:count},(_,i)=>ordered[(start+i)%ordered.length]);
  }
  return{levels,validCourse,conceptIds,key,entries,context,matching,select};
});
