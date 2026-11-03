const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../js/model.js'),L=require('../js/connections.js');
function fixture(){
  let state=M.demo();state.equipment=state.equipment.slice(0,6);
  const [a,b,c,d,e,f]=state.equipment;
  for(const [item,x,z,parent] of [[a,-20,-10,null],[b,-5,-10,a],[c,-5,0,b],[d,10,5,null],[e,20,5,d],[f,-15,-18,a]])Object.assign(item,{x,z,parentId:parent?.id||null});
  state=L.enableShared(state);
  // Detour every edge so restoring the whole tree can be distinguished from one edge.
  for(const line of L.routes(state)){
    const start=line.points[0],end=line.points.at(-1),middle={x:(start.x+end.x)/2,z:Math.max(start.z,end.z)+2};
    const points=L.orthogonal([start,middle,end],null,true);
    state=L.storeRoute(state,line.id,points,points.slice(1).map(()=>line.color));
  }
  return {state:M.validate(state),a,b,c,d};
}
test('최상위 부모 범위에는 하위 부모의 연결망도 포함하고 다른 루트는 제외한다',()=>{
  const {state,a,b,c,d}=fixture(),nested=L.routes(state).find(r=>r.parentId===b.id);
  const scope=L.editScope(state,nested.id);assert.equal(scope.rootId,a.id);
  assert.equal(L.rootEquipmentId(state,c.id),a.id);
  assert.deepEqual(new Set(scope.ids),new Set(L.routes(state).filter(r=>r.parentId!==d.id).map(r=>r.id)));
  assert.equal(L.editScope(state,'missing'),null);assert.throws(()=>L.resetScope(state,'missing'));
});
test('범위 복원은 선택한 트리 전체를 최단화하고 다른 트리·노드·스타일·단일 실행 취소를 보존한다',()=>{
  const {state,a,b,d}=fixture(),selected=L.routes(state).find(r=>r.parentId===b.id),h=new M.History(state);
  const next=L.resetScope(state,selected.id);h.commit(next);assert.deepEqual(M.validate(next),next);
  assert.deepEqual(next.equipment,state.equipment);assert.deepEqual(next.networks.find(n=>n.parentId===d.id),state.networks.find(n=>n.parentId===d.id));
  for(const net of next.networks){
    const old=state.networks.find(n=>n.parentId===net.parentId);assert.deepEqual(net.nodes,old.nodes);
    for(const edge of net.edges){const before=old.edges.find(e=>e.id===edge.id);assert.equal(edge.diameter,before.diameter);assert.equal(edge.color,before.color);}
  }
  for(const line of L.routes(next).filter(r=>L.rootEquipmentId(next,r.parentId)===a.id)){
    const points=line.points,start=points[0],end=points.at(-1);
    const distance=points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.z-points[i].z),0);
    assert.ok(Math.abs(distance-Math.abs(end.x-start.x)-Math.abs(end.z-start.z))<1e-6);
    assert.notDeepEqual(points,L.route(state,line.id).points);
  }
  assert.equal(h.past.length,1);h.undo();assert.deepEqual(h.current,state);h.redo();assert.deepEqual(h.current,next);
});
test('두 보기 모두 선택한 트리만 포인트를 표시하고 숨은 포인트는 선택되지 않으며 다른 선분으로 전환한다',()=>{
  const context={FEMSConnections:L,performance:{now:()=>1000}};context.window=context;vm.createContext(context);
  for(const file of ['vendor/three.js','js/connection-view.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  const {state,a,d}=fixture(),T=context.THREE,view=new context.FEMSConnectionView(new T.Scene());view.setState(state);
  const rect={left:0,top:0,width:600,height:400},camera=new T.OrthographicCamera(-30,30,20,-20,.1,200);
  camera.position.set(0,100,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const first=view.lines.find(r=>r.rootId===a.id),other=view.lines.find(r=>r.rootId===d.id);
  for(const mode of ['plan','3d']){
    view.update(camera,400,mode,false,null);assert.ok(view.lines.every(r=>r.handles.every(h=>!h.dot.visible)));
    view.update(camera,400,mode,false,{id:first.id,kind:'point',index:1});
    assert.ok(view.lines.filter(r=>r.rootId===a.id).every(r=>r.handles.some(h=>h.dot.visible)));
    assert.ok(other.handles.every(h=>!h.dot.visible));
    const p=view.project(other.handles[1].border.position,other,camera,rect);
    assert.equal(view.pick({clientX:p.x,clientY:p.y},camera,rect,{pointsOnly:true}),null);
    const hit=view.pick({clientX:p.x,clientY:p.y},camera,rect);assert.equal(hit.id,other.id);assert.equal(hit.kind,'segment');
    view.update(camera,400,mode,false,hit);assert.ok(other.handles.some(h=>h.dot.visible));assert.ok(first.handles.every(h=>!h.dot.visible));
    view.update(camera,400,mode,true,hit);assert.ok(view.lines.every(r=>r.handles.every(h=>!h.dot.visible)));
  }
});
