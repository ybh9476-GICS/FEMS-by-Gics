const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),L=require('../js/connections.js');
function fixture(){
  let state=M.demo();const [a,b,c,d,e,f,g]=state.equipment;
  state=M.reparent(state,b.id,a.id);state=M.reparent(state,c.id,b.id);state=M.reparent(state,e.id,d.id);state=M.reparent(state,g.id,f.id);
  return {state:L.enableShared(state),a,b,c,d,e,f,g};
}
test('다중 이동은 부모·자식 내부 계층과 좌표를 유지하고 최상위 선택만 대상 아래로 이동한다',()=>{
  const {state,a,b,c,d,e}=fixture(),before=M.clone(state);
  const next=M.moveEquipmentGroup(state,[e.id,c.id,b.id],d.id);
  assert.equal(next.equipment.find(i=>i.id===b.id).parentId,d.id);assert.equal(next.equipment.find(i=>i.id===c.id).parentId,b.id);
  assert.deepEqual(next.equipment.filter(i=>i.parentId===d.id).map(i=>i.id),[b.id,e.id]);
  for(const item of next.equipment)for(const key of ['x','z','width','height','depth','rotation','name','code'])assert.equal(item[key],state.equipment.find(i=>i.id===item.id)[key]);
  assert.deepEqual(state,before);assert.deepEqual(M.validate(next),next);
});
test('다중 순서 삽입은 선택 순서 대신 목록 순서를 유지하며 앞·뒤·최상위 이동을 지원한다',()=>{
  const {state,a,b,c,d,e,f}=fixture();
  for(const position of ['before','after']){
    const next=M.moveEquipmentGroup(state,[e.id,c.id,b.id],null,f.id,position);
    const roots=next.equipment.filter(i=>!i.parentId).map(i=>i.id),index=roots.indexOf(f.id);
    assert.deepEqual(position==='before'?roots.slice(index-2,index):roots.slice(index+1,index+3),[b.id,e.id]);
    assert.equal(next.equipment.find(i=>i.id===c.id).parentId,b.id);
  }
  const next=M.moveEquipmentGroup(state,[e.id,b.id],null);
  assert.deepEqual(next.equipment.filter(i=>!i.parentId).slice(-2).map(i=>i.id),[b.id,e.id]);
});
test('다중 순환·없는 설비·잘못된 기준 이동은 원본과 기록을 변경하지 않는다',()=>{
  const {state,a,b,c,d,e}=fixture(),h=new M.History(state);
  for(const run of [()=>M.moveEquipmentGroup(state,[b.id,e.id],c.id),()=>M.moveEquipmentGroup(state,[a.id,e.id],a.id),()=>M.moveEquipmentGroup(state,['missing',b.id],d.id),()=>M.moveEquipmentGroup(state,[b.id,e.id],'missing'),()=>M.moveEquipmentGroup(state,[b.id,e.id],null,c.id,'before')])assert.throws(()=>h.commit(run()));
  assert.equal(h.past.length,0);assert.deepEqual(h.current,state);
  assert.equal(h.commit(M.moveEquipmentGroup(state,[b.id,c.id],a.id,b.id,'before')),false);
});
test('공유 연결선은 일괄 이동 후 한 번 재구성하고 내부·무관한 경로 및 실행 취소·저장을 보존한다',()=>{
  let {state,a,b,c,d,e,f}=fixture();
  for(const line of L.routes(state))state=L.addPoint(state,line.id,0).state;
  const internal=state.networks.find(n=>n.parentId===b.id),unrelated=state.networks.find(n=>n.parentId===f.id),h=new M.History(state);
  const next=M.moveEquipmentGroup(state,[b.id,c.id,e.id],d.id);h.commit(next);
  assert.deepEqual(next.networks.find(n=>n.parentId===b.id),internal);assert.deepEqual(next.networks.find(n=>n.parentId===f.id),unrelated);
  assert.equal(next.networks.some(n=>n.parentId===a.id),false);assert.equal(h.past.length,1);
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(next))),next);h.undo();assert.deepEqual(h.current,state);h.redo();assert.deepEqual(h.current,next);
});
test('실제 앱 계층 이동은 다중 선택을 유지하고 한 번 커밋하며 실패 시 선택을 복구한다',()=>{
  const {state,b,c,d,e}=fixture(),history=new M.History(state),source=fs.readFileSync('js/app.js','utf8');
  const start=source.indexOf('  function reparent('),end=source.indexOf('  function add(',start);assert.ok(start>=0&&end>start);
  let commits=0;const context={M,history,spaces:null,selected:null,selectedIds:[b.id,c.id,e.id],groupFrame:{x:0},links:{clear(){}},finishPropertyEdit(){},render(){},toast:message=>assert.fail(message),commit(next){commits++;return history.commit(next);}};
  vm.createContext(context);vm.runInContext(source.slice(start,end),context);context.ids=[b.id,c.id,e.id];context.target=d.id;
  vm.runInContext("reparent(ids,target,null,'inside')",context);assert.equal(commits,1);assert.deepEqual(Array.from(context.selectedIds),context.ids);assert.equal(context.selected,null);assert.equal(context.groupFrame,null);
  history.undo();assert.deepEqual(history.current,state);
  context.selected=b.id;context.selectedIds=[b.id];context.commit=()=>false;
  vm.runInContext("reparent(ids,target,null,'inside')",context);assert.equal(context.selected,b.id);assert.deepEqual(Array.from(context.selectedIds),[b.id]);
});
