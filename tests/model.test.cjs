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
test('배치·복제용 코드가 종류별로 유일하고 부지 경계를 준수한다',()=>{
  const state=M.empty();for(const def of C.catalog)for(let i=0;i<3;i++)state.equipment.push(M.create(def.type,state,100,-100));
  assert.equal(new Set(state.equipment.map(e=>e.code)).size,27);M.validate(state);
});
test('실행 취소·다시 실행은 생성·편집·삭제·새 도면을 복원한다',()=>{
  const h=new M.History(M.demo()),original=M.clone(h.current),next=M.clone(h.current);next.equipment[0].name='송전탑 수정';h.commit(next);h.commit(M.empty());
  assert.equal(h.current.equipment.length,0);h.undo();assert.equal(h.current.equipment[0].name,'송전탑 수정');h.undo();assert.deepEqual(h.current,original);h.redo();assert.equal(h.current.equipment[0].name,'송전탑 수정');
  h.commit(M.empty());assert.equal(h.redo(),false);
});
test('불량 파일·중복 코드·비정상 치수·부지 밖 좌표는 현재 도면을 바꾸지 않는다',()=>{
  const h=new M.History(M.demo()),original=M.clone(h.current);
  for(const mutate of [s=>s.format='wms',s=>s.version=2,s=>s.equipment[0].type='unknown',s=>s.equipment[0].width=-1,s=>s.equipment[0].height=Infinity,s=>s.equipment[0].x=100,s=>s.equipment[1].id=s.equipment[0].id,s=>s.equipment[1].code=s.equipment[0].code.toLowerCase(),s=>s.name='',s=>s.equipment[0]=null]){
    const bad=M.clone(original);mutate(bad);assert.throws(()=>h.commit(bad));assert.deepEqual(h.current,original);
  }
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
