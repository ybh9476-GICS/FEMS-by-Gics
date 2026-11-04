const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../js/model.js'),L=require('../js/connections.js'),D=require('../js/defaults.js');
const blue='#2563eb',red='#dc2626',gold='#eab308';
function fixture(){
  let state=M.demo();const [parent,a,b]=state.equipment;
  Object.assign(parent,{x:-15,z:0});Object.assign(a,{x:0,z:-10});Object.assign(b,{x:12,z:10});
  state=M.reparent(M.reparent(state,a.id,parent.id),b.id,parent.id);
  state=L.storeRoute(state,a.id,[{x:-15,z:0},{x:0,z:0},{x:0,z:-10}]);
  state=L.storeRoute(state,b.id,[{x:-15,z:0},{x:5,z:0},{x:5,z:10},{x:12,z:10}]);
  state=L.setStyle(state,a.id,{color:red});state=L.setStyle(state,b.id,{color:gold});
  return {legacy:state,state:M.validate(L.enableShared(state)),parent:parent.id,a:a.id,b:b.id};
}
const fork=state=>L.routes(state).find(r=>r.childIds.length===2);

test('공유 구간 최적화는 직선 색상 경계를 제거하고 노드·다른 가지·실행 취소를 보존한다',()=>{
  const {state}=fixture(),trunk=fork(state),added=L.addPoint(state,trunk.id,0).state;
  const h=new M.History(added),next=L.optimize(added,trunk.id);h.commit(next);
  assert.equal(L.route(next,trunk.id).points.length,2);assert.deepEqual(next.networks[0].nodes,state.networks[0].nodes);
  for(const line of L.routes(state).filter(r=>r.id!==trunk.id))assert.deepEqual(L.route(next,line.id),line);
  assert.deepEqual(M.validate(next),next);h.undo();assert.deepEqual(h.current,added);
  const colored=L.setSegmentColor(added,trunk.id,1,red),history=new M.History(colored);
  assert.equal(history.commit(L.optimize(colored,trunk.id)),true);assert.equal(history.past.length,1);
  assert.deepEqual(L.route(history.current,trunk.id).segmentColors,[gold]);
  assert.deepEqual(history.current.networks[0].nodes,colored.networks[0].nodes);
  for(const line of L.routes(colored).filter(r=>r.id!==trunk.id))assert.deepEqual(L.route(history.current,line.id),line);
  history.undo();assert.deepEqual(history.current,colored);history.redo();assert.equal(L.route(history.current,trunk.id).points.length,2);
  // A no-op must not persist automatically inserted elbows into the stored bends.
  const diagonal=M.clone(state),edge=diagonal.networks[0].edges.find(e=>e.id===trunk.id);
  edge.bends=[{x:-7,z:2}];edge.segmentColors=[gold,red];
  const optimized=L.optimize(diagonal,trunk.id);assert.deepEqual(optimized,diagonal);
});
test('겹친 공통 구간은 실제 단일 선과 분기점으로 변환되고 설비·원본은 보존된다',()=>{
  const {state,legacy,parent}=fixture(),lines=L.routes(state),trunk=fork(state);
  assert.equal(state.version,2);assert.equal(lines.length,3);assert.deepEqual(state.equipment,legacy.equipment);
  assert.deepEqual(trunk.points,[{x:-15,z:0},{x:0,z:0}]);assert.deepEqual(trunk.segmentColors,[gold]);
  const network=state.networks.find(n=>n.parentId===parent),junction=network.nodes.find(n=>!n.equipmentId);
  assert.equal(network.nodes.filter(n=>!n.equipmentId).length,1);
  assert.equal(network.edges.filter(e=>e.to===junction.id).length,1);assert.equal(network.edges.filter(e=>e.from===junction.id).length,2);
  assert.equal(legacy.version,1);assert.equal(legacy.networks,undefined);
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(state))),state);
});
test('분기점 이동은 같은 노드를 공유하는 모든 가지를 연결하고 한 번에 실행 취소한다',()=>{
  const {state}=fixture(),trunk=fork(state),index=trunk.points.length-1,h=new M.History(state);
  assert.equal(L.isLocked(trunk,index),false);assert.equal(L.isLocked(trunk,0),true);
  const result=L.movePoint(state,trunk.id,index,{x:2,z:3});h.preview(result.state);h.finishEdit();
  const node=trunk.nodeIds[index],refs=L.routes(h.current).flatMap(r=>r.points.filter((p,i)=>r.nodeIds[i]===node));
  assert.equal(refs.length,3);for(const p of refs)assert.deepEqual(p,{x:2,z:3});
  // A vertical child leg keeps leaving vertically; the horizontal branch's first
  // corner follows the junction, so it does not go up and immediately back down.
  const branches=L.routes(h.current).filter(r=>r.nodeIds[0]===node);
  assert.deepEqual(branches[0].points,[{x:2,z:3},{x:2,z:-10},{x:0,z:-10}]);
  assert.deepEqual(branches[1].points,[{x:2,z:3},{x:5,z:3},{x:5,z:10},{x:12,z:10}]);
  assert.equal(h.past.length,1);h.undo();assert.deepEqual(h.current,state);h.redo();assert.deepEqual(h.current,result.state);
  assert.throws(()=>L.movePoint(state,trunk.id,0,{x:1,z:1}));assert.throws(()=>L.deletePoint(state,trunk.id,index));
});

function migrateBoot(saved,{failAt=null,previous=null}={}){
  const key=M.STORAGE_KEY,backupKey=key+'-before-shared-branches',storage=new Map([[key,saved]]),writes=[];
  if(previous)storage.set(backupKey,previous);
  const context={window:{FEMSCatalog:require("../js/catalog.js"),FEMSProjectFile:require("../js/project-file.js"),FEMSDefaultAssets:[],FEMSDefaultRevision:"a".repeat(64),FEMSModel:M,FEMSConnections:L,FEMSDefaults:D,FEMSDefaultLayout:M.empty()},document:{},localStorage:{
    getItem:key=>storage.get(key)||null,setItem(key,value){writes.push(key);if(key===failAt)throw new Error('quota');storage.set(key,value);}
  }};
  const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  const end=app.indexOf('  let propertyEdit');assert.ok(end>0,'시작 시 도면 복원 코드의 끝을 찾아야 합니다.');
  vm.runInNewContext(app.slice(0,end)+'window.result={state:history.current,autosaveAllowed,startupMessage,branchMigrationMessage};})();',context);
  return {...JSON.parse(JSON.stringify(context.window.result)),storage,writes,backupKey};
}
test('시작 시 v1 원문을 먼저 백업하고 v2를 저장하며 재시작해도 백업을 보존한다',()=>{
  const saved=JSON.stringify(fixture().legacy,null,2),result=migrateBoot(saved);
  assert.equal(result.storage.get(result.backupKey),saved);assert.equal(result.state.version,2);
  assert.deepEqual(result.writes,[result.backupKey,M.STORAGE_KEY]);assert.ok(result.branchMigrationMessage);
  const reopened=migrateBoot(result.storage.get(M.STORAGE_KEY),{previous:saved});
  assert.equal(reopened.state.version,2);assert.deepEqual(reopened.writes,[]);assert.equal(reopened.storage.get(result.backupKey),saved);
});
test('백업 또는 변환본 저장 실패 시 기존 도면·저장 원문을 유지하고 자동 저장을 중지한다',()=>{
  const saved=JSON.stringify(fixture().legacy);
  for(const failAt of [M.STORAGE_KEY+'-before-shared-branches',M.STORAGE_KEY]){
    const result=migrateBoot(saved,{failAt});assert.equal(result.state.version,1);assert.equal(result.storage.get(M.STORAGE_KEY),saved);
    assert.equal(result.autosaveAllowed,false);assert.ok(result.startupMessage);assert.equal(result.branchMigrationMessage,'');
  }
});
test('다른 변환 전 백업이 있으면 이전 백업도 별도 키로 보존하고 손상된 원문은 덮어쓰지 않는다',()=>{
  const saved=JSON.stringify(fixture().legacy),result=migrateBoot(saved,{previous:'older backup'});
  assert.equal(result.storage.get(result.backupKey),saved);
  assert.ok([...result.storage].some(([key,value])=>key.startsWith(result.backupKey+'-')&&value==='older backup'));
  const corrupt=migrateBoot('{broken');assert.equal(corrupt.storage.get(M.STORAGE_KEY),'{broken');assert.equal(corrupt.autosaveAllowed,false);assert.deepEqual(corrupt.writes,[]);
});
test('공통 구간 색상·지름은 한 번만 저장되고 개별 가지 색상과 경로는 유지된다',()=>{
  const {state}=fixture(),trunk=fork(state),before=L.routes(state),next=L.setStyle(L.setSegmentColor(state,trunk.id,0,blue),trunk.id,{diameter:.4});
  const after=L.routes(M.validate(next));assert.equal(after.find(r=>r.id===trunk.id).diameter,.4);assert.deepEqual(after.find(r=>r.id===trunk.id).segmentColors,[blue]);
  for(const line of before.filter(r=>r.id!==trunk.id))assert.deepEqual(after.find(r=>r.id===line.id).points,line.points);
  for(const line of before.filter(r=>r.id!==trunk.id))assert.deepEqual(after.find(r=>r.id===line.id).segmentColors,line.segmentColors);
  const context={window:{}};vm.runInNewContext(D.serialize(next),context);assert.deepEqual(JSON.parse(JSON.stringify(context.window.FEMSDefaultLayout)),next);
});
test('A 코너를 삭제해도 연결이 공유 분기점 B에서 출발하며 설비로 되돌아가지 않는다',()=>{
  const {state,b}=fixture(),branch=L.routes(state).find(r=>r.childIds.length===1&&r.childIds[0]===b);
  assert.deepEqual(branch.points,[{x:0,z:0},{x:5,z:0},{x:5,z:10},{x:12,z:10}]);
  const next=L.route(L.deletePoint(state,branch.id,1),branch.id);
  assert.deepEqual(next.points,[{x:0,z:0},{x:0,z:10},{x:5,z:10},{x:12,z:10}]);
  assert.equal(next.pointKinds[0],'junction');
});
test('부모의 위·아래 자식은 각각 반대 방향으로 출발하고 억지 공통 구간을 만들지 않는다',()=>{
  let state=M.demo();const [p,a,b]=state.equipment;Object.assign(p,{x:0,z:0});Object.assign(a,{x:0,z:-10});Object.assign(b,{x:0,z:10});
  state=L.enableShared(M.reparent(M.reparent(state,a.id,p.id),b.id,p.id));M.validate(state);
  const lines=L.routes(state);assert.equal(lines.length,2);assert.ok(lines.every(r=>r.pointKinds[0]==='equipment'));
  assert.deepEqual(lines.map(r=>r.points[1].z).sort((a,b)=>a-b),[-10,10]);
});
test('같은 방향의 세 자식과 일직선 설비도 공통 선을 중복 생성하지 않는다',()=>{
  let state=M.demo();const [p,a,b,c]=state.equipment;Object.assign(p,{x:-15,z:0});Object.assign(a,{x:-5,z:0});Object.assign(b,{x:5,z:0});Object.assign(c,{x:15,z:0});
  for(const child of [a,b,c])state=M.reparent(state,child.id,p.id);
  state=L.enableShared(state);M.validate(state);
  const lines=L.routes(state),nonzero=lines.flatMap(r=>r.points.slice(1).map((p,i)=>[r.points[i],p])).filter(([a,b])=>Math.hypot(a.x-b.x,a.z-b.z)>1e-6);
  assert.equal(nonzero.reduce((sum,[a,b])=>sum+Math.hypot(a.x-b.x,a.z-b.z),0),30);
});
test('설비 위치 변경은 접속점만 따라가고 공유 분기점과 다른 설비 위치는 유지된다',()=>{
  const {state,parent,a}=fixture(),next=M.clone(state),junction=state.networks[0].nodes.find(n=>!n.equipmentId);
  next.equipment.find(e=>e.id===parent).x-=2;next.equipment.find(e=>e.id===a).z-=2;M.validate(next);
  assert.deepEqual(next.networks[0].nodes.find(n=>n.id===junction.id),junction);
  const lines=L.routes(next),trunk=fork(next);assert.equal(trunk.points[0].x,-17);
  assert.equal(lines.find(r=>r.childIds.length===1&&r.childIds[0]===a).points.at(-1).z,-12);
});
test('부모 변경·설비 삭제·새 자식 추가 후에도 살아남은 경로와 색상을 유지한다',()=>{
  const {state,parent,a,b}=fixture(),trunk=fork(state),colored=L.setSegmentColor(state,trunk.id,0,blue);
  const detached=M.reparent(colored,a,null);M.validate(detached);assert.equal(L.routes(detached).length,1);assert.equal(L.routes(detached)[0].childIds[0],b);assert.equal(L.routes(detached)[0].segmentColors[0],blue);
  const removed=M.removeEquipment(colored,parent);M.validate(removed);assert.equal(L.routes(removed).length,0);
  const newChild=colored.equipment.find(e=>!e.parentId&&e.id!==parent),added=M.reparent(colored,newChild.id,parent);M.validate(added);assert.equal(added.networks[0].nodes.filter(n=>n.equipmentId).length,4);
});
test('공유 경로에서 포인트·선분·코너 편집 및 최단 복원은 연결·색상을 유지한다',()=>{
  const {state,b}=fixture(),branch=L.routes(state).find(r=>r.childIds.length===1&&r.childIds[0]===b);
  const added=L.addPoint(state,branch.id,0);M.validate(added.state);
  const moved=L.movePoint(added.state,branch.id,added.index,{x:1,z:2});M.validate(moved.state);M.validate(L.finishMove(moved,branch.id).state);
  const segment=L.moveSegment(state,branch.id,0,{x:1,z:2},{corner:true});M.validate(segment.state);M.validate(L.finishMove(segment,branch.id,'segment').state);
  const optimized=L.optimize(added.state,branch.id);assert.deepEqual(L.route(optimized,branch.id).points,branch.points);
  const reset=L.reset(state,branch.id);M.validate(reset);assert.deepEqual(L.route(reset,branch.id).points[0],branch.points[0]);
});
test('누락·순환·중복·잘못된 좌표의 공유 그래프는 저장 전에 거부한다',()=>{
  const {state}=fixture();
  for(const change of [s=>s.networks=[],s=>s.networks[0].edges[0].to=s.networks[0].root,s=>s.networks[0].nodes[1].x=NaN,s=>s.networks[0].edges[0].segmentColors=[],s=>s.networks[0].edges[1].id=s.networks[0].edges[0].id]){
    const invalid=M.clone(state);change(invalid);assert.throws(()=>M.validate(invalid));
  }
});
test('실제 렌더러는 분기점 하나를 표시하고 움직일 수 있는 포인트로 선택한다',()=>{
  const context={FEMSConnections:L,performance:{now:()=>1000}};context.window=context;vm.createContext(context);
  for(const file of ['vendor/three.js','js/connection-view.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  const {state}=fixture(),T=context.THREE,view=new context.FEMSConnectionView(new T.Scene()),trunk=fork(state);view.setState(state);
  const camera=new T.OrthographicCamera(-30,30,20,-20,.1,200);camera.position.set(0,100,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  view.update(camera,400,'plan',false,{id:trunk.id,kind:'segment',index:0});const rect={left:0,top:0,width:600,height:400},line=view.lines.find(r=>r.id===trunk.id),index=line.points.length-1;
  const p=view.project(line.points[index],line,camera,rect),hit=view.pick({clientX:p.x,clientY:p.y},camera,rect,{pointsOnly:true,movableOnly:true});assert.equal(hit.locked,false);
  const node=line.nodeIds[index],visible=view.lines.flatMap(r=>r.handles.filter((h,i)=>r.nodeIds[i]===node&&h.dot.visible));assert.equal(visible.length,1);
  const outgoing=view.lines.filter(r=>r.nodeIds[0]===node);assert.ok(outgoing.every(r=>r.distanceOffset===15));
});
