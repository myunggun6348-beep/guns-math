const assert=require('assert/strict'),model=require('../assets/past-practice-model'),catalog=require('../assets/exam-catalog.json'),review=require('../assets/past-practice-review.json'),{TODAY_TRACKS}=require('../assets/today-data');
const before=JSON.stringify(review),rows=model.entries(review,catalog);
assert.equal(rows.length,review.items.length);assert.equal(new Set(rows.map(model.key)).size,rows.length);
assert.equal(new Set(rows.map(r=>r.concept)).size,19);
const questions=require('../assets/exam-questions.json').items;
for(const row of rows){
  const q=questions.find(q=>q.e===row.exam&&q.n===row.number&&(q.s===row.subject||row.exam.startsWith('ebsi-3-')&&row.number<=22));
  assert.ok(q,'카탈로그에 없는 문항 '+model.key(row));assert.equal(row.page,q.p,'문항의 PDF 쪽');
  assert.ok(row.reason.length>10&&row.topic.length>0);
}
for(const [exam,number,level] of [['ebsi-3-20260902',24,'basic'],['ebsi-3-20251014',30,'standard'],['ebsi-3-20260902',28,'challenge'],['ebsi-3-20240711',28,'standard'],['ebsi-3-20250710',30,'challenge']])assert.equal(rows.find(r=>r.exam===exam&&r.number===number&&r.subject==='확률과 통계').difficulty,level);
const base={grade:'3',track:'stats',concept:'prob',topic:'조건부확률'};
for(const difficulty of Object.keys(model.levels)){
  const choice={...base,difficulty},selected=model.select(rows,choice,Date.parse('2026-10-25T01:00:00+09:00'));
  assert.ok(selected.length>0&&selected.length<=3);assert.ok(selected.every(r=>r.topic===base.topic&&r.difficulty===difficulty));
  assert.deepEqual(selected,model.select(rows,choice,Date.parse('2026-10-25T23:59:59+09:00')),'한국 날짜 안에서 유지');
}
assert.equal(model.select(rows,{...base,concept:'vec',topic:'벡터의 내적',track:'geometry',difficulty:'standard'}).length,0,'없는 난도를 섞지 않음');
for(const choice of [{...base,track:'geometry',difficulty:'basic'},{...base,grade:'1',difficulty:'basic'},{...base,difficulty:'__proto__'}])assert.deepEqual(model.select(rows,choice),[]);
for(const [track,course] of Object.entries(TODAY_TRACKS))for(const concept of model.conceptIds(track))assert.ok(model.matching(rows,{grade:course.grades[0],track,concept}).length,'과목/개념의 검토 문항 '+track+'/'+concept);
assert.deepEqual(model.context(new URLSearchParams(),null,null),{grade:'',track:'',concept:'',topic:'',difficulty:'',explicit:false,reason:''},'고1 다항식 기본 진입 제거');
const profile={grade:'3',track:'stats'},rec={grade:'3',track:'stats',recommendation:{conceptId:'prob',level:'standard',reason:'조건 해석 연습'}};
assert.equal(model.context(new URLSearchParams(),profile,null,[rec]).difficulty,'standard');
assert.equal(model.context(new URLSearchParams('grade=3&concept=prob'),profile,null,[rec]).track,'stats');
assert.equal(model.context(new URLSearchParams('grade=1&concept=poly&difficulty=basic'),profile,null,[rec]).concept,'poly');
assert.equal(model.context(new URLSearchParams('grade=3&concept=unknown'),profile,null,[rec]).track,'');
assert.equal(model.context(new URLSearchParams(),null,{grade:'2',track:'calc1'}).concept,'','근거 없으면 개념을 임의 추천하지 않음');
assert.equal(JSON.stringify(review),before,'분류 데이터 읽기 전용');
console.log('기출 분류 검사 통과: '+rows.length+'문항, 19개 개념, 확정한 5문항, 과목 범위·난도 분리·빈 결과·직접/추천 진입·한국 날짜·읽기 전용');
