const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../js/model.js');

test('항목 사이 이동은 양방향 순서와 저장·복원·실행 취소를 지원한다',()=>{
  const state=M.demo(),[a,b,c]=state.equipment,h=new M.History(state);
  h.commit(M.moveEquipment(h.current,c.id,null,a.id,'before'));
  assert.deepEqual(h.current.equipment.slice(0,3).map(e=>e.id),[c.id,a.id,b.id]);
  h.commit(M.moveEquipment(h.current,c.id,null,b.id,'after'));
  assert.deepEqual(h.current,state);
  h.undo();assert.equal(h.current.equipment[0].id,c.id);
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(h.current))),h.current);
  h.undo();assert.deepEqual(h.current,state);h.redo();assert.equal(h.current.equipment[0].id,c.id);
});

test('계층 사이 삽입과 목록 끝 분리는 하위 관계·설비 값을 보존한다',()=>{
  let state=M.demo();const [a,b,c,d]=state.equipment;
  state=M.reparent(M.reparent(state,b.id,a.id),c.id,b.id);
  const next=M.moveEquipment(state,b.id,null,d.id,'before');
  assert.equal(next.equipment.find(e=>e.id===b.id).parentId,undefined);
  assert.equal(next.equipment.find(e=>e.id===c.id).parentId,b.id);
  assert.equal(next.equipment.findIndex(e=>e.id===d.id),next.equipment.findIndex(e=>e.id===b.id)+1);
  const nested=M.moveEquipment(next,d.id,b.id,c.id,'before');
  assert.deepEqual(nested.equipment.filter(e=>e.parentId===b.id).map(e=>e.id),[d.id,c.id]);
  const end=M.moveEquipment(nested,d.id,null);
  assert.equal(end.equipment.at(-1).id,d.id);assert.equal(end.equipment.at(-1).parentId,undefined);
  for(const item of end.equipment){const {parentId,...values}=item;const {parentId:oldParent,...oldValues}=state.equipment.find(e=>e.id===item.id);assert.deepEqual(values,oldValues);}
});

test('잘못된 삽입 기준과 순환 이동은 거부하고 자기 위치 삽입은 기록하지 않는다',()=>{
  let state=M.demo();const [a,b,c]=state.equipment;
  state=M.reparent(M.reparent(state,b.id,a.id),c.id,b.id);
  const h=new M.History(state);
  assert.throws(()=>h.commit(M.moveEquipment(h.current,a.id,b.id,c.id,'before')));
  assert.throws(()=>h.commit(M.moveEquipment(h.current,c.id,null,b.id,'after')));
  assert.throws(()=>h.commit(M.moveEquipment(h.current,c.id,null,'missing','before')));
  assert.equal(h.commit(M.moveEquipment(h.current,b.id,a.id,b.id,'before')),false);
  assert.deepEqual(h.current,state);assert.equal(h.past.length,0);
});

test('기존 v1 도면은 최상위 설비로 보존하고 계층 도면은 저장·복원한다',()=>{
  const old=M.demo();assert.ok(old.equipment.every(e=>!('parentId' in e)));
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(old))),old);
  const [a,b,c]=old.equipment;
  const next=M.reparent(M.reparent(old,b.id,a.id),c.id,b.id);
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(next))),next);
  assert.equal(next.equipment[2].parentId,b.id);
  assert.deepEqual(next.equipment.map(({parentId,...rest})=>rest),old.equipment);
});

test('계층 드래그는 하위 관계를 유지하고 최상위 분리도 단일 실행 취소로 복원한다',()=>{
  let state=M.demo();const [a,b,c,d]=state.equipment;
  state=M.reparent(M.reparent(state,b.id,a.id),c.id,b.id);
  const h=new M.History(state);
  h.commit(M.reparent(h.current,b.id,d.id));assert.equal(h.current.equipment[2].parentId,b.id);
  assert.equal(h.current.equipment[1].parentId,d.id);
  h.undo();assert.deepEqual(h.current,state);h.redo();
  const moved=M.clone(h.current);h.commit(M.reparent(h.current,b.id,null));
  assert.equal(h.current.equipment[1].parentId,undefined);assert.equal(h.current.equipment[2].parentId,b.id);
  h.undo();assert.deepEqual(h.current,moved);
});

test('자기 자신·하위 설비·없는 상위 설비·순환 파일은 현재 도면을 바꾸지 않는다',()=>{
  let state=M.demo();const [a,b,c]=state.equipment;
  state=M.reparent(M.reparent(state,b.id,a.id),c.id,b.id);
  const h=new M.History(state);
  for(const parent of [a.id,b.id,c.id,'missing'])assert.throws(()=>h.commit(M.reparent(h.current,a.id,parent)));
  for(const mutate of [s=>s.equipment[0].parentId=c.id,s=>s.equipment[0].parentId=123,s=>s.equipment[0].parentId='missing']){
    const bad=M.clone(state);mutate(bad);assert.throws(()=>h.commit(bad));assert.deepEqual(h.current,state);
  }
  assert.equal(h.past.length,0);
});

test('상위 설비 삭제는 직계 하위만 한 단계 올리고 나머지 관계·좌표를 유지한다',()=>{
  let state=M.demo();const [a,b,c,d]=state.equipment;
  state=M.reparent(M.reparent(M.reparent(state,b.id,a.id),c.id,b.id),d.id,c.id);
  const next=M.removeEquipment(state,b.id);
  assert.equal(next.equipment.length,state.equipment.length-1);
  const child=next.equipment.find(e=>e.id===c.id),grandchild=next.equipment.find(e=>e.id===d.id);
  assert.equal(child.parentId,a.id);assert.equal(grandchild.parentId,c.id);
  assert.deepEqual([child.x,child.z,child.width,child.height],[c.x,c.z,c.width,c.height]);
  const removedRoot=M.removeEquipment(next,a.id);assert.equal(removedRoot.equipment.find(e=>e.id===c.id).parentId,undefined);
  const h=new M.History(state);h.commit(next);h.undo();assert.deepEqual(h.current,state);
});

test('300단계 계층 검증 및 동일 부모 재지정은 불필요한 변경 기록을 만들지 않는다',()=>{
  const state=M.empty();
  for(let i=0;i<300;i++){const item=M.create('panel',state);if(i)item.parentId=state.equipment[i-1].id;state.equipment.push(item);}
  const valid=M.validate(state),h=new M.History(valid);
  assert.equal(h.commit(M.reparent(h.current,valid.equipment[299].id,valid.equipment[298].id)),false);
  assert.equal(h.past.length,0);assert.throws(()=>M.reparent(valid,valid.equipment[0].id,valid.equipment[299].id));
});
