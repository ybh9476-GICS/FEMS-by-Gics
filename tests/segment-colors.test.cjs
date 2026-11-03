const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../js/model.js'),L=require('../js/connections.js'),D=require('../js/defaults.js');
const blue='#2563eb',red='#dc2626',green='#16a34a';
function fixture(){
  let state=M.demo();const [parent,child,other]=state.equipment;
  state=M.reparent(M.reparent(state,child.id,parent.id),other.id,parent.id);
  state=L.storeRoute(state,child.id,[{x:-15,z:-5},{x:0,z:-5},{x:0,z:5},{x:10,z:5}]);
  return {state,id:child.id,other:other.id};
}
test('선택 선분만 색상 변경, 저장·기본 도면·실행 취소 복원 및 기존 단색 도면 호환',()=>{
  const {state,id,other}=fixture(),history=new M.History(state),next=L.setSegmentColor(state,id,1,red);
  assert.deepEqual(L.route(next,id).segmentColors,[blue,red,blue]);
  assert.deepEqual(L.route(next,id).points,L.route(state,id).points);
  assert.deepEqual(L.route(next,other),L.route(state,other));
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(next))),next);
  const context={window:{}};vm.runInNewContext(D.serialize(next),context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.FEMSDefaultLayout)),next);
  history.commit(next);history.undo();assert.deepEqual(history.current,state);history.redo();assert.deepEqual(history.current,next);
  assert.deepEqual(L.setSegmentColor(next,id,1,red),next);
  assert.throws(()=>L.setSegmentColor(state,id,10,red));assert.throws(()=>L.setSegmentColor(state,id,1,'red'));
  for(const colors of [[red],['bad',red,blue],null]){
    const invalid=M.clone(next);invalid.equipment.find(e=>e.id===id).connection.segmentColors=colors;
    if(colors)assert.throws(()=>M.validate(invalid));
  }
  assert.deepEqual(L.route(state,id).segmentColors,[blue,blue,blue]);
});
test('포인트 추가와 코너 생성은 원래 선분 색상을 계승하고 먼 선분은 보존한다',()=>{
  const {state,id}=fixture(),colored=L.setSegmentColor(state,id,1,red);
  const added=L.addPoint(colored,id,1);assert.deepEqual(L.route(added.state,id).segmentColors,[blue,red,red,blue]);
  assert.deepEqual(L.route(L.deletePoint(added.state,id,added.index),id).segmentColors,[blue,red,blue]);
  const result=L.moveSegment(colored,id,1,{x:3,z:0},{corner:true}),line=L.route(result.state,id);
  assert.deepEqual(line.segmentColors,[blue,red,red,red,red,red,blue]);
  const moved=L.moveSegment(colored,id,1,{x:3,z:0});assert.deepEqual(L.route(moved.state,id).segmentColors,[blue,red,blue]);
  assert.deepEqual(M.validate(L.finishMove(result,id,'segment').state),L.finishMove(result,id,'segment').state);
  const bent=L.movePoint(colored,id,1,{x:3,z:-2});
  assert.equal(L.route(bent.state,id).segmentColors[0],blue);assert.equal(L.route(bent.state,id).segmentColors.at(-1),blue);
  assert.ok(L.route(bent.state,id).segmentColors.includes(red));
});
test('설비 이동으로 자동 생성되는 직각은 해당 끝 선분 색상을 유지한다',()=>{
  const {state,id}=fixture(),colored=L.setSegmentColor(state,id,2,green);
  colored.equipment.find(e=>e.id===id).z+=1;
  assert.deepEqual(L.route(colored,id).segmentColors,[blue,blue,green,green]);
  const changed=L.setSegmentColor(colored,id,3,red);
  assert.deepEqual(L.route(changed,id).segmentColors,[blue,blue,green,red]);
  assert.deepEqual(M.validate(changed),changed);
});
test('명시적 최적화는 직선 색상 경계를 부모 쪽 색상으로 합치고 드래그 정리는 색상 경계를 유지한다',()=>{
  const {state,id}=fixture();let line=L.storeRoute(state,id,[{x:-15,z:-5},{x:-10,z:-5},{x:-5,z:-5},{x:0,z:-5}]);
  line=L.setSegmentColor(line,id,1,red);
  assert.deepEqual(L.route(L.optimize(line,id),id).segmentColors,[blue]);
  assert.equal(L.route(L.optimize(line,id),id).points.length,2);
  const result=L.finishMove({state:line,index:0,generated:[1,2]},id,'segment');assert.deepEqual(result.state,line);
  const removed=L.deletePoint(line,id,1);assert.deepEqual(L.route(removed,id).segmentColors,[blue,blue]);
  line=L.setSegmentColor(line,id,2,red);const optimized=L.route(L.optimize(line,id),id);
  assert.deepEqual(optimized.segmentColors,[blue]);assert.equal(optimized.points.length,2);
});
test('최단 경로 복원은 색상 순서와 비율을 보존하면서 직선·직각 최단 거리를 만든다',()=>{
  const {state,id}=fixture(),colored=L.setSegmentColor(L.setSegmentColor(state,id,1,red),id,2,green),reset=L.reset(colored,id),line=L.route(reset,id);
  assert.deepEqual([...new Set(line.segmentColors)],[blue,red,green]);
  const length=line.points.slice(1).reduce((sum,p,i)=>{const a=line.points[i];assert.ok(p.x===a.x||p.z===a.z);return sum+Math.hypot(p.x-a.x,p.z-a.z);},0);
  assert.ok(Math.abs(length-Math.abs(line.points[0].x-line.points.at(-1).x)-Math.abs(line.points[0].z-line.points.at(-1).z))<1e-6);
  assert.deepEqual(M.validate(reset),reset);
});

test('최적화는 계산 오차가 있는 직선점·길이 없는 구간·실제 색상 경계를 제거한다',()=>{
  const {state,id}=fixture();
  const nearlyStraight=L.storeRoute(state,id,[{x:-10,z:0},{x:-5,z:1e-12},{x:0,z:0},{x:0,z:5}]);
  assert.equal(L.route(L.optimize(nearlyStraight,id),id).points.length,3);
  for(const points of [
    [{x:-10,z:0},{x:-10,z:0},{x:0,z:0}],
    [{x:-10,z:0},{x:0,z:0},{x:0,z:0}]
  ]){
    const initial=L.storeRoute(state,id,points,[red,blue]);
    const next=L.optimize(initial,id),line=L.route(next,id);
    assert.deepEqual(line.points,[points[0],points.at(-1)]);
    assert.deepEqual(line.segmentColors,[points[0].x===points[1].x?blue:red]);
    assert.deepEqual(M.validate(next),next);assert.deepEqual(L.optimize(next,id),next);
  }
  const boundary=L.storeRoute(state,id,[{x:-10,z:0},{x:-5,z:0},{x:0,z:0}],[red,blue]);
  const optimized=L.route(L.optimize(boundary,id),id);
  assert.deepEqual(optimized.points,[{x:-10,z:0},{x:0,z:0}]);assert.deepEqual(optimized.segmentColors,[red]);
});
test('실제 Three.js 선분마다 색상을 적용하고 점선 시간은 공유하며 GPU 재료를 정리한다',()=>{
  const context={FEMSConnections:L,performance:{now:()=>1000}};context.window=context;vm.createContext(context);
  for(const file of ['vendor/three.js','js/connection-view.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  const {state,id}=fixture(),T=context.THREE,view=new context.FEMSConnectionView(new T.Scene());
  view.setState(L.setSegmentColor(state,id,1,red));const line=view.lines.find(l=>l.id===id);
  assert.deepEqual(Array.from(line.segments,m=>m.material.uniforms.color.value.getHexString()),['2563eb','dc2626','2563eb']);
  let disposed=0;for(const mesh of line.segments){assert.equal(mesh.material.uniforms.time,view.time);mesh.material.addEventListener('dispose',()=>disposed++);}
  view.setState(state);assert.equal(disposed,3);
});
