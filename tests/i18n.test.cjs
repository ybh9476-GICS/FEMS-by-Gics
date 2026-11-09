const test=require('node:test'),assert=require('node:assert/strict');
const entries=require('../js/locales.js'),I=require('../js/i18n.js');

test('파일 선택·배치 알림·분기점·공간 검사 오류를 두 외국어로 번역한다',()=>{
  const phrases=['파일 선택','선택된 파일 없음','모델 파일 선택','파일을 선택하세요.','값을 입력하거나 선택하세요.','올바른 숫자를 입력하세요.','10 이하의 값을 입력하세요.','1 이상의 값을 입력하세요.','분기점 · 3개 설비','Pump을(를) 배치했습니다.'];
  for(const label of ['설비 ID','상위 설비 ID','공간 ID','건물 ID','층 ID','프로젝트 ID','층 번호','이름'])phrases.push(label+': 1~80자로 입력하세요.');
  for(const label of ['회전','건물 높이','옥상 바닥 높이','층 배치 높이','층 크기','width'])phrases.push(label+': 0.01~100000 범위로 입력하세요.');
  for(const text of phrases){assert.equal(I.translate(text,'ko'),text);for(const language of ['en','ja'])assert.ok(!/[가-힣]/.test(I.translate(text,language)),language+': '+text);}
  for(const language of ['en','ja'])assert.ok(I.translate('수전반(3)을(를) 배치했습니다.',language).includes('수전반(3)'));
});
test('모든 번역은 영어·일본어와 동일한 치환 인자를 갖고 키가 중복되지 않는다',()=>{
  const keys=new Set();for(const row of entries){assert.equal(row.length,3,row[0]);assert.ok(!keys.has(row[0]),'duplicate: '+row[0]);keys.add(row[0]);
    const slots=s=>[...s.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();
    for(const value of row.slice(1)){assert.ok(value.trim(),row[0]);assert.deepEqual(slots(value),slots(row[0]),row[0]);assert.ok(!/[가-힣]/.test(value),row[0]);}
  }
});
test('한국어 원문·미등록 고유명사·문장 속 설비 이름과 경로를 그대로 보존한다',()=>{
  const names=['설정','수전반(3)','ENG','変圧器Ａ','A < B & "C"','이름 연결 해제','내 설비 → 대상'];
  for(const name of names){const s=`${name}: 설비가 부지 경계를 벗어납니다.`;assert.equal(I.translate(s,'ko'),s);for(const locale of ['en','ja'])assert.ok(I.translate(s,locale).startsWith(name+':'));}
  assert.equal(I.translate('FEMS by impix','ja'),'FEMS by impix');assert.equal(I.translate('사용자 프로젝트 이름','en'),'사용자 프로젝트 이름');
  assert.equal(I.translate('선택한 대상 → 수전반(3)','en'),'Selected target → 수전반(3)');
  assert.equal(I.translate('설정 배치','en',true),'Place 설정');
});
test('동적 숫자·중첩 오류·여러 줄 안내와 공백을 보존한다',()=>{
  assert.equal(I.translate('  설비는 최대 300개까지 배치할 수 있습니다.  ','en'),'  Up to 300 equipment items can be placed.  ');
  assert.equal(I.translate('대지 가로: 0.1~100000 범위의 숫자가 필요합니다.','en'),'Site width: enter a number from 0.1 to 100000.');
  assert.equal(I.translate('파일을 열지 못했습니다: 프로젝트 파일이 손상되었습니다.','en'),'Unable to open file: Project file is corrupted.');
  const s='원본 파일은 보관됩니다.\n실행 취소로 복원할 수 있습니다.';assert.ok(!/[가-힣]/.test(I.translate(s,'ja')));assert.equal(I.translate(s,'en').split('\n').length,2);
});
