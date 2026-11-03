const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const M=require('../js/model.js'), C=require('../js/catalog.js');

test('9종 예시 도면이 겹침 없이 유효하고 저장·복원된다',()=>{
  const state=M.demo();assert.equal(state.equipment.length,9);assert.equal(new Set(state.equipment.map(e=>e.type)).size,9);
  assert.equal(M.overlaps(state).size,0);assert.deepEqual(M.validate(JSON.parse(JSON.stringify(state))),state);
});
test('새 설비는 빈 코드와 고유 ID를 가지며 부지 경계를 준수한다',()=>{
  const state=M.empty();for(const def of C.catalog)for(let i=0;i<3;i++)state.equipment.push(M.create(def.type,state,100,-100));
  assert.equal(new Set(state.equipment.map(e=>e.id)).size,27);assert.ok(state.equipment.every(e=>e.code===''));M.validate(state);
});
test('실행 취소·다시 실행은 생성·편집·삭제·새 도면을 복원한다',()=>{
  const h=new M.History(M.demo()),original=M.clone(h.current),next=M.clone(h.current);next.equipment[0].name='송전탑 수정';h.commit(next);h.commit(M.empty());
  assert.equal(h.current.equipment.length,0);h.undo();assert.equal(h.current.equipment[0].name,'송전탑 수정');h.undo();assert.deepEqual(h.current,original);h.redo();assert.equal(h.current.equipment[0].name,'송전탑 수정');
  h.commit(M.empty());assert.equal(h.redo(),false);
});

test('새 배치 이름은 기존 이름을 보존하고 중복되지 않는 괄호 번호를 붙인다',()=>{
  const state=M.empty();
  for(let i=0;i<4;i++)state.equipment.push(M.create('transformer',state));
  assert.deepEqual(state.equipment.map(e=>e.name),['변압기','변압기(1)','변압기(2)','변압기(3)']);
  state.equipment.splice(1,1);const before=M.clone(state);
  assert.equal(M.create('transformer',state).name,'변압기(1)');assert.deepEqual(state,before);
  state.equipment[0].name='사용자 변압기';assert.equal(M.create('transformer',state).name,'변압기');
  state.equipment.push({...M.create('panel',state),name:'변압기'});
  assert.equal(M.create('transformer',state).name,'변압기(1)');
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(state))),state);
});
test('불량 파일·중복 코드·비정상 치수·부지 밖 좌표는 현재 도면을 바꾸지 않는다',()=>{
  const initial=M.demo();initial.equipment[0].code='API-01';
  const h=new M.History(initial),original=M.clone(h.current);
  for(const mutate of [s=>s.format='wms',s=>s.version=2,s=>s.equipment[0].type='unknown',s=>s.equipment[0].width=-1,s=>s.equipment[0].height=Infinity,s=>s.equipment[0].x=100,s=>s.equipment[1].id=s.equipment[0].id,s=>s.equipment[1].code=s.equipment[0].code.toLowerCase(),s=>s.name='',s=>s.equipment[0]=null]){
    const bad=M.clone(original);mutate(bad);assert.throws(()=>h.commit(bad));assert.deepEqual(h.current,original);
  }
});

test('복제 이름은 원본 이름을 유지하며 기존 번호·빈 번호·사용자 이름·최대 길이를 처리한다',()=>{
  const state=M.empty(),item=M.create('transformer',state);state.equipment.push(item);
  for(const name of ['변압기(1)','변압기(2)']){assert.equal(M.duplicateName(state,state.equipment.at(-1).name),name);state.equipment.push({...item,name,id:name});}
  state.equipment.splice(1,1);assert.equal(M.duplicateName(state,'변압기(2)'),'변압기(1)');
  state.equipment.push({...item,name:'공장 A 변압기',id:'custom'});assert.equal(M.duplicateName(state,'공장 A 변압기'),'공장 A 변압기(1)');
  assert.equal(M.duplicateName(state,'공장 A 변압기(7)'),'공장 A 변압기(1)');
  const long='가'.repeat(80);state.equipment.push({...item,name:long,id:'long'});
  const name=M.duplicateName(state,long);assert.equal(name.length,80);assert.ok(name.endsWith('(1)'));
  state.equipment.push({...item,name,id:'long-copy'});assert.ok(M.duplicateName(state,long).endsWith('(2)'));
});

test('속성 패널 복제 처리는 원본 이름을 덮어쓰지 않고 새 번호·빈 코드·치수와 실행 취소를 유지한다',()=>{
  const initial=M.demo(),original=initial.equipment.find(e=>e.type==='transformer');original.name='사용자 변압기';original.code='API-01';
  const history=new M.History(initial),source=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  const start=source.indexOf('  function duplicate()'),end=source.indexOf('  function graphicsError',start);assert.ok(start>=0&&end>start);
  const context={M,history,selected:original.id,commit:next=>history.commit(next),toast:message=>assert.fail(message)};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
  for(const name of ['사용자 변압기(1)','사용자 변압기(2)']){
    vm.runInContext('duplicate()',context);const copy=history.current.equipment.at(-1);
    assert.equal(copy.name,name);assert.equal(copy.code,'');assert.notEqual(copy.id,original.id);
    for(const key of ['width','height','depth','rotation','type'])assert.equal(copy[key],original[key]);
    assert.equal(history.current.equipment.find(e=>e.id===original.id).name,'사용자 변압기');
  }
  history.undo();assert.equal(history.current.equipment.at(-1).name,'사용자 변압기(1)');history.redo();assert.equal(history.current.equipment.at(-1).name,'사용자 변압기(2)');
});

test('빈 설비 코드는 여러 개 저장하고 지정된 코드는 중복·길이·자료형을 검증한다',()=>{
  const state=M.demo();state.equipment[0].code='   ';delete state.equipment[1].code;
  const cleaned=M.validate(state);assert.ok(cleaned.equipment.every(e=>e.code===''));
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(cleaned))),cleaned);
  const assigned=M.clone(cleaned);assigned.equipment[0].code=' SERVER-001 ';assert.equal(M.validate(assigned).equipment[0].code,'SERVER-001');
  assigned.equipment[1].code='server-001';assert.throws(()=>M.validate(assigned),/중복/);
  for(const code of [123,'x'.repeat(33)]){const bad=M.clone(cleaned);bad.equipment[0].code=code;assert.throws(()=>M.validate(bad),/설비 코드/);}
  const hierarchy=M.reparent(cleaned,cleaned.equipment[1].id,cleaned.equipment[0].id);
  assert.equal(hierarchy.equipment[1].parentId,cleaned.equipment[0].id);
  const h=new M.History(hierarchy),next=M.clone(hierarchy);next.equipment[0].code='API-001';h.commit(next);h.undo();assert.deepEqual(h.current,hierarchy);h.redo();assert.equal(h.current.equipment[0].code,'API-001');
});
test('회전한 설비 경계와 겹침을 검사하며 경계 접촉은 겹침이 아니다',()=>{
  const state=M.empty(),a=M.create('ess',state),b=M.create('ess',state);b.code='ESS-02';a.width=b.width=4;a.depth=b.depth=2;b.x=4;state.equipment=[a,b];
  assert.equal(M.overlaps(state).size,0);b.x=3;assert.equal(M.overlaps(state).size,2);a.rotation=b.rotation=90;assert.equal(M.overlaps(state).size,0);
  a.rotation=45;Object.assign(a,M.clampPosition(a,30,20,state.site));M.validate(state);a.x+=.1;assert.throws(()=>M.validate(state),/경계/);
});
test('300개 배치 한도와 과대 파일의 설비 목록을 거부한다',()=>{
  const state=M.empty();for(let i=0;i<300;i++)state.equipment.push(M.create('panel',state));M.validate(state);assert.throws(()=>M.create('panel',state),/300/);
  state.equipment.push({...state.equipment[0],id:'overflow',code:'overflow'});assert.throws(()=>M.validate(state),/300/);
});
test('9종 실제 3D 모델의 치수가 선언한 크기에 맞고 모든 정점이 유한하다',()=>{
  const root=path.resolve(__dirname,'..'),context={console};context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'vendor/three.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(path.join(root,'js/equipment-3d.js'),'utf8'),context);
  for(const def of C.catalog){const model=context.FEMSEquipment.make(def.type);model.scale.set(def.width,def.height,def.depth);const bounds=new context.THREE.Box3().setFromObject(model),size=bounds.getSize(new context.THREE.Vector3());
    assert.ok(Math.abs(size.x-def.width)<1e-6,def.type+' width');assert.ok(Math.abs(size.y-def.height)<1e-6,def.type+' height');assert.ok(Math.abs(size.z-def.depth)<1e-6,def.type+' depth');assert.ok(Math.abs(bounds.min.y)<1e-6);
    let parts=0;model.traverse(part=>{if(part.isMesh){parts++;for(const n of part.geometry.attributes.position.array)assert.ok(Number.isFinite(n));}});assert.ok(parts>10,def.type);context.FEMSEquipment.dispose(model);
  }
});
