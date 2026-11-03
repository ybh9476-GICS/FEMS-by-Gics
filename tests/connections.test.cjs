const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../js/model.js'),L=require('../js/connections.js');
function fixture(){let state=M.demo();const [a,b,c,d]=state.equipment;state=M.reparent(M.reparent(state,b.id,a.id),c.id,a.id);return {state,a,b,c,d};}
function orthogonal(points){for(let i=1;i<points.length;i++)assert.ok(points[i].x===points[i-1].x||points[i].z===points[i-1].z);}
test('기존 도면 보존, 계층 자동 생성, 공통 시작점과 최단 직각 거리',()=>{
  const {state,a,b,c}=fixture();assert.deepEqual(M.validate(state),state);
  const lines=L.routes(state);assert.equal(lines.length,2);
  assert.deepEqual(lines[0].points[0],lines[1].points[0]);
  for(const child of [b,c]){const r=L.route(state,child.id);orthogonal(r.points);assert.equal(r.diameter,.2);assert.equal(r.color,'#2563eb');const length=r.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-r.points[i].x,p.z-r.points[i].z),0);assert.equal(length,Math.abs(child.x-a.x)+Math.abs(child.z-a.z));}
  assert.equal(L.routes(M.reparent(state,b.id,null)).length,1);
});
test('선분 추가·중간 포인트 이동·삭제는 고정점과 직각을 보존한다',()=>{
  const {state,a,b,c}=fixture();const start=L.route(state,b.id),added=L.addPoint(state,b.id,0);
  assert.equal(L.route(added.state,b.id).points.length,start.points.length+1);
  const moved=L.movePoint(added.state,b.id,added.index,{x:-12,z:-2});orthogonal(L.route(moved.state,b.id).points);
  const deleted=L.deletePoint(moved.state,b.id,moved.index);orthogonal(L.route(deleted,b.id).points);assert.ok(!L.route(deleted,b.id).points.some(p=>p.x===-12&&p.z===-2));
  assert.throws(()=>L.movePoint(state,b.id,0,{x:a.x+1,z:a.z+1})); const branch=moved.state;
  assert.deepEqual(L.route(branch,b.id).points[0],L.route(branch,c.id).points[0]);
  for(const item of branch.equipment){const {connection,junction,...data}=item;assert.deepEqual(data,state.equipment.find(e=>e.id===item.id));}
});
test('설비 고정점 이동·삭제 차단, 기존 상대 위치와 잘못된 좌표 검증',()=>{
  const {state,b}=fixture(),line=L.route(state,b.id);
  assert.throws(()=>L.movePoint(state,b.id,line.points.length-1,{x:0,z:1})); const moved=L.storeRoute(state,b.id,[{x:-15,z:-6},{x:0,z:-6},{x:0,z:1}]);
  let next=M.clone(moved);next.equipment.find(e=>e.id===b.id).x+=1;
  assert.deepEqual(L.route(next,b.id).points.at(-1),{x:1,z:1});
  assert.throws(()=>L.movePoint(state,b.id,0,{x:NaN,z:0}));assert.throws(()=>L.movePoint(state,b.id,0,{x:1000,z:0}));
  const minimal=L.storeRoute(state,b.id,[{x:0,z:0},{x:1,z:0}]);assert.throws(()=>L.deletePoint(minimal,b.id,0));
  const withPoint=L.addPoint(minimal,b.id,0).state;assert.throws(()=>L.deletePoint(withPoint,b.id,0)); const removed=L.deletePoint(withPoint,b.id,1);assert.equal(L.route(removed,b.id).points.length,2);
});
test('10색·지름·포인트의 저장 복원, 잘못된 저장 데이터 차단, 변경 후 실행 취소',()=>{
  const {state,b}=fixture(),h=new M.History(state);assert.equal(L.palette.length,10);
  const edited=L.setStyle(L.addPoint(state,b.id,0).state,b.id,{diameter:.4,color:L.palette[6][1]});
  h.preview(edited);h.preview(L.movePoint(edited,b.id,1,{x:-8,z:-4}).state);h.finishEdit();assert.equal(h.past.length,1);
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(h.current))),h.current);h.undo();assert.deepEqual(h.current,state);h.redo();assert.equal(L.route(h.current,b.id).diameter,.4);
  for(const changes of [{diameter:0},{diameter:3},{color:'red'},{bends:[{x:NaN,z:0}]}])assert.throws(()=>M.validate(L.setStyle(state,b.id,changes)));
  const original=M.clone(h.current);h.preview(L.movePoint(h.current,b.id,1,{x:-10,z:0}).state);h.finishEdit(false);assert.deepEqual(h.current,original);
});
test('부모 변경·부모 삭제 시 연결선 편집 초기화, 최상위 분리 및 자동 경로 복원',()=>{
  const {state,a,b,c,d}=fixture(),edited=L.setStyle(L.addPoint(state,b.id,0).state,b.id,{diameter:.5});
  assert.equal(M.reparent(edited,b.id,d.id).equipment.find(e=>e.id===b.id).connection,undefined);
  const deleted=M.removeEquipment(edited,a.id);assert.equal(L.route(deleted,b.id),null);assert.equal(L.route(deleted,c.id),null);
  const restored=L.reset(edited,b.id);assert.deepEqual(L.route(restored,b.id).points,L.route(state,b.id).points);assert.equal(L.route(restored,b.id).diameter,.5);
});
const context={console,FEMSConnections:L,performance:{now:()=>1000}};context.window=context;vm.createContext(context);
test('포인트 최적화는 직선 중간점·중복점만 제거하고 고정점·코너·스타일·다른 연결선을 보존한다',()=>{
  const {state,b,c}=fixture();
  const points=[{x:-15,z:-6},{x:-12,z:-6},{x:-12,z:-6},{x:-7,z:-6},{x:-7,z:0},{x:-7,z:5}];
  const initial=L.setStyle(L.storeRoute(state,b.id,points),b.id,{diameter:.45,color:L.palette[7][1]});
  const h=new M.History(initial),next=L.optimize(initial,b.id),line=L.route(next,b.id);
  assert.deepEqual(line.points,[points[0],points[3],points[5]]);
  assert.equal(line.diameter,.45);assert.equal(line.color,L.palette[7][1]);
  assert.deepEqual(L.route(next,c.id),L.route(initial,c.id));
  for(const item of next.equipment){const {connection,junction,...data}=item;const {connection:oldConnection,junction:oldJunction,...oldData}=initial.equipment.find(e=>e.id===item.id);assert.deepEqual(data,oldData);}
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(next))),next);
  h.commit(next);h.undo();assert.deepEqual(h.current,initial);h.redo();assert.deepEqual(h.current,next);
  assert.deepEqual(L.optimize(next,b.id),next);
});

test('최적화는 되꺾이는 직선·루프·일치하는 양 끝 고정점을 유지한다',()=>{
  const {state,b}=fixture();
  for(const points of [
    [{x:0,z:0},{x:5,z:0},{x:2,z:0}],
    [{x:0,z:0},{x:5,z:0},{x:5,z:5},{x:0,z:5},{x:0,z:0}],
    [{x:0,z:0},{x:0,z:0}]
  ]){
    const initial=L.storeRoute(state,b.id,points);assert.deepEqual(L.optimize(initial,b.id),initial);
  }
  const initial=L.storeRoute(state,b.id,[{x:0,z:0},{x:0,z:0},{x:0,z:0}]);
  assert.deepEqual(L.route(L.optimize(initial,b.id),b.id).points,[{x:0,z:0},{x:0,z:0}]);
});

test('최적화할 점이 없으면 자동 경로에 저장 항목이나 실행 취소 기록을 추가하지 않는다',()=>{
  const {state,b}=fixture(),h=new M.History(state);
  assert.equal(h.commit(L.optimize(state,b.id)),false);assert.equal(h.past.length,0);
  assert.deepEqual(h.current,state);assert.throws(()=>L.optimize(state,'missing'));
});
for(const file of ['vendor/three.js','js/connection-view.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
test('실제 Three.js 선 지름과 흐름 거리, 평면도에서만 포인트·선분 선택',()=>{
  const {state,b}=fixture(),T=context.THREE,view=new context.FEMSConnectionView(new T.Scene());view.setState(state);
  const camera=new T.OrthographicCamera(-30,30,20,-20,.1,200);camera.position.set(0,100,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const rect={left:0,top:0,width:600,height:400};view.update(camera,400,'plan',false,null);
  const line=view.lines.find(e=>e.id===b.id);assert.equal(line.segments[0].geometry.parameters.radiusTop,.1);
  const p=view.project(line.points[0],line,camera,rect);assert.equal(view.pick({clientX:p.x,clientY:p.y},camera,rect).kind,'point');
  assert.equal(view.pick({clientX:p.x,clientY:p.y},camera,rect).locked,true);
  assert.equal(line.handles[0].dot.material.color.getHex(),0x111111);assert.equal(line.handles.at(-1).dot.material.color.getHex(),0x111111);
  const a=line.points[0],z=line.points[1],mid=view.project({x:(a.x+z.x)/2,z:(a.z+z.z)/2},line,camera,rect);assert.equal(view.pick({clientX:mid.x,clientY:mid.y},camera,rect).kind,'segment');
  const flow=line.segments[0].geometry.attributes.flowDistance;assert.ok(Math.max(...flow.array)>0);assert.equal(view.time.value,1);
  view.update(camera,400,'3d',false,null);assert.equal(view.pick({clientX:p.x,clientY:p.y},camera,rect),null);assert.ok(line.handles.every(h=>!h.dot.visible));
  const oldGeometry=line.segments[0].geometry;let disposed=false;oldGeometry.addEventListener('dispose',()=>disposed=true);view.setState(M.reparent(state,b.id,null));assert.equal(disposed,true);
});
context.FEMSModel=M;vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/scene.js'),'utf8'),context);
test('선분 선택은 해당 구간만 회색 테두리·양 끝으로 강조하고 중복점 인덱스와 보기 전환을 지킨다',()=>{
  const {state,b}=fixture(),T=context.THREE;
  const edited=L.storeRoute(state,b.id,[{x:-15,z:-6},{x:-10,z:-6},{x:-10,z:-6},{x:-10,z:5},{x:-7,z:5}]);
  const view=new context.FEMSConnectionView(new T.Scene());view.setState(edited);
  const camera=new T.OrthographicCamera(-30,30,20,-20,.1,200);
  const selected={id:b.id,kind:'segment',index:2},hover={id:b.id,kind:'segment',index:3};
  view.update(camera,400,'plan',false,selected,hover);
  const line=view.lines.find(line=>line.id===b.id);
  assert.equal(view.selectedSegment.visible,true);assert.equal(view.hoverSegment.visible,true);
  assert.equal(view.selectedSegment.children[1].material.color.getHex(),0xa3a3a3);
  assert.equal(view.hoverSegment.children[1].material.color.getHex(),0x14b8a6);
  assert.equal(view.selectedSegment.children[1].scale.y,11);
  assert.equal(line.segments.find(mesh=>mesh.userData.segmentIndex===2).renderOrder,8);
  assert.equal(line.segments.find(mesh=>mesh.userData.segmentIndex===0).renderOrder,0);
  assert.equal(line.handles[2].border.material,view.segmentEndMaterial);assert.equal(line.handles[3].border.material,view.segmentEndMaterial);
  assert.equal(line.handles[0].dot.material,view.lockedPointMaterial);
  view.update(camera,400,'plan',false,selected,selected);assert.equal(view.hoverSegment.visible,false);
  view.update(camera,400,'plan',false,{id:b.id,kind:'segment',index:1});assert.equal(view.selectedSegment.visible,false);
  for(const [mode,armed] of [['3d',false],['plan',true]]){
    view.update(camera,400,mode,armed,selected,hover);assert.equal(view.selectedSegment.visible,false);assert.equal(view.hoverSegment.visible,false);
  }
  view.update(camera,400,'plan',false,null);assert.equal(line.handles[2].border.material,view.pointBorderMaterial);
  assert.equal(line.material.uniforms.color.value.getHex(),0x2563eb);
});
function editorFixture(locked=false){
  const base=fixture(),b=base.b,state=L.addPoint(base.state,b.id,0).state,T=context.THREE,h=new M.History(state),listeners={},rect={left:0,top:0,width:600,height:400};
  const camera=new T.OrthographicCamera(-30,30,20,-20,.1,200);camera.position.set(0,100,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const view=new context.FEMSConnectionView(new T.Scene());view.setState(state);view.update(camera,400,'plan',false,null);
  const scene=Object.create(context.FEMSScene.prototype);let baseline,selection;
  Object.assign(scene,{state:h.current,mode:'plan',camera,connections:view,host:{style:{},getBoundingClientRect:()=>rect},ray:new T.Raycaster(),pointer:new T.Vector2(),floorPlane:new T.Plane(new T.Vector3(0,1,0),0),ghost:{},models:new Map(),footprints:new Map(),handlers:{
    connectionSelect(hit){selection=hit;scene.connectionSelection=hit;},connectionStart(){baseline=M.clone(h.current);},
    connectionPreview(pos){h.preview(L.movePoint(baseline,selection.id,selection.index,pos).state);scene.state=h.current;view.setState(h.current);},
    connectionEnd(ok){h.finishEdit(ok);scene.state=h.current;view.setState(h.current);},select(){throw new Error('포인트 편집 중 설비 선택이 실행됨');}
  },renderer:{domElement:{addEventListener(name,fn){listeners[name]=fn;},setPointerCapture(){},hasPointerCapture(){return false;}}}});
  scene.pick=()=>null;scene.pickGizmo=()=>null;scene.invalidate=()=>{};scene.bind();
  const line=view.lines.find(e=>e.id===b.id),p=view.project(line.points[locked?0:1],line,camera,rect);
  const event=(dx=0,dy=0)=>({button:0,pointerId:1,clientX:p.x+dx,clientY:p.y+dy,preventDefault(){}});
  return {h,state,listeners,event,scene};
}
test('평면도 실제 포인터 경로로 중간점 드래그를 한 번의 실행 취소로 복원한다',()=>{
  const {h,state,listeners,event}=editorFixture();listeners.pointerdown(event());listeners.pointermove(event(30,20));listeners.pointermove(event(40,20));assert.notDeepEqual(h.current,state);listeners.pointerup(event(40,20));assert.equal(h.past.length,1);h.undo();assert.deepEqual(h.current,state);
});
test('포인트 드래그 취소와 포인터 캡처 유실은 원래 연결선으로 복원한다',()=>{
  for(const cancel of ['pointercancel','lostpointercapture']){const {h,state,listeners,event}=editorFixture();listeners.pointerdown(event());listeners.pointermove(event(30,20));listeners[cancel]();assert.deepEqual(h.current,state);assert.equal(h.past.length,0);}
});
test('검은색 설비 고정점은 실제 드래그해도 변경 기록을 만들지 않는다',()=>{
  const {h,state,listeners,event}=editorFixture(true);listeners.pointerdown(event());listeners.pointermove(event(30,20));listeners.pointerup(event(30,20));assert.deepEqual(h.current,state);assert.equal(h.past.length,0);
});

test('L자 흰색 코너는 목표 좌표까지 이동하고 필요한 직각 코너를 자동 완성한다',()=>{
  const {state,b,c}=fixture(),initial=L.storeRoute(state,b.id,[{x:-15,z:-6},{x:-7,z:-6},{x:-7,z:5}]);
  const before=L.route(initial,b.id).points;
  for(const position of [{x:-10,z:2},{x:-7,z:2},{x:2,z:-4},{x:-15,z:-6}]){
    const moved=L.movePoint(initial,b.id,1,position),points=L.route(moved.state,b.id).points;
    assert.deepEqual(points[moved.index],position);orthogonal(points);
    assert.deepEqual(points[0],before[0]);assert.deepEqual(points.at(-1),before.at(-1));
    assert.ok(points.length<=before.length+2);
    assert.deepEqual(L.route(M.validate(JSON.parse(JSON.stringify(moved.state))),b.id).points,points);
    assert.deepEqual(L.route(moved.state,c.id),L.route(initial,c.id));
  }
  assert.deepEqual(L.movePoint(initial,b.id,1,before[1]).state,initial);
});

test('기존 포인트로 목표에 도달할 수 있으면 포인트 수를 유지하고 선택 인덱스도 보존한다',()=>{
  const {state,b}=fixture(),initial=L.storeRoute(state,b.id,[{x:-15,z:-6},{x:-10,z:-6},{x:-10,z:5},{x:-7,z:5}]);
  const moved=L.movePoint(initial,b.id,1,{x:-12,z:-6}),points=L.route(moved.state,b.id).points;
  assert.equal(points.length,4);assert.equal(moved.index,1);assert.deepEqual(points[1],{x:-12,z:-6});orthogonal(points);
});

function overlappingEquipment(scene,event,id){
  const T=context.THREE,p=scene.floor(event),mesh=new T.Mesh(new T.BoxGeometry(.4,.025,.4),new T.MeshBasicMaterial());
  mesh.position.set(p.x,.01,p.z);mesh.userData.equipmentId=id;mesh.updateMatrixWorld(true);
  scene.footprints.set(id,mesh);scene.pick=context.FEMSScene.prototype.pick;
}

test('포인트 이동은 인접 코너만 조정하고 먼 경로와 다른 분기를 보존한다',()=>{
  const {state,b,c}=fixture(),points=[{x:-20,z:-10},{x:-15,z:-10},{x:-15,z:-5},{x:-10,z:-5},{x:-10,z:0},{x:0,z:0},{x:0,z:10},{x:5,z:10}];
  const initial=L.storeRoute(state,b.id,points),result=L.movePoint(initial,b.id,3,{x:-12,z:-3}),next=L.route(result.state,b.id).points;
  assert.deepEqual(next[result.index],{x:-12,z:-3});orthogonal(next);
  assert.deepEqual(next.slice(0,2),points.slice(0,2));assert.deepEqual(next.slice(-3),points.slice(-3));
  assert.deepEqual(L.route(result.state,c.id),L.route(initial,c.id));
});

test('가로·세로 선분 이동은 끝점을 고정하고 한 방향으로만 이동하며 저장과 실행 취소가 가능하다',()=>{
  const {state,b,c}=fixture();
  for(const points of [[{x:-10,z:0},{x:10,z:0}],[{x:0,z:-10},{x:0,z:10}],[{x:-10,z:-5},{x:0,z:-5},{x:0,z:5},{x:10,z:5}]]){
    const initial=L.storeRoute(state,b.id,points),i=points.length===2?0:1;
    const result=L.moveSegment(initial,b.id,i,{x:3,z:4}),next=L.route(result.state,b.id).points;
    orthogonal(next);assert.deepEqual(next[0],points[0]);assert.deepEqual(next.at(-1),points.at(-1));
    const a=next[result.index],z=next[result.index+1],horizontal=points[i].z===points[i+1].z;
    assert.equal(horizontal?a.z:a.x,horizontal?4:3);assert.equal(horizontal?z.z:z.x,horizontal?4:3);
    assert.deepEqual(L.route(result.state,c.id),L.route(initial,c.id));
    assert.deepEqual(M.validate(JSON.parse(JSON.stringify(result.state))),result.state);
    const h=new M.History(initial);h.preview(result.state);h.finishEdit();assert.equal(h.past.length,1);h.undo();assert.deepEqual(h.current,initial);
  }
  assert.throws(()=>L.moveSegment(state,b.id,99,{x:1,z:2}));assert.throws(()=>L.moveSegment(state,b.id,0,{x:NaN,z:NaN}));assert.throws(()=>L.moveSegment(state,b.id,0,{x:1000,z:1000}));
});

test('코너 추가는 선택 선분 내부에만 꺾임을 만들고 원위치 복귀 미리보기는 변경을 남기지 않는다',()=>{
  const {state,b}=fixture(),points=[{x:-15,z:-6},{x:0,z:-6},{x:0,z:6}],initial=L.storeRoute(state,b.id,points);
  const r=L.moveSegment(initial,b.id,0,{x:20,z:-3},{corner:true}),path=L.route(r.state,b.id).points;
  assert.deepEqual(path,[points[0],{x:-10,z:-6},{x:-10,z:-3},{x:-5,z:-3},{x:-5,z:-6},points[1],points[2]]);assert.equal(r.index,2);
  assert.deepEqual(L.moveSegment(initial,b.id,0,{x:9,z:-6},{corner:true}).state,initial);
  const second=L.moveSegment(initial,b.id,0,{x:9,z:1},{corner:true});assert.equal(L.route(second.state,b.id).points.length,7);
});

test('정렬 보조는 6px 환산 거리에서 붙고 더 넓은 해제 범위로 흔들림을 방지하며 Shift로 해제한다',()=>{
  const points=[{x:0,z:0},{x:5,z:5},{x:10,z:10}];
  let result=L.snapPosition(points,[1],{x:.5,z:5.2},.6);
  assert.deepEqual(result.position,{x:0,z:5.2});assert.deepEqual(result.guides,{x:0});
  result=L.snapPosition(points,[1],{x:.8,z:5.2},.6,result.guides);assert.equal(result.position.x,0);
  assert.equal(L.snapPosition(points,[1],{x:1,z:5.2},.6,result.guides).position.x,1);
  assert.deepEqual(L.snapPosition(points,[1],{x:.5,z:5.2},0,result.guides).guides,{});
  assert.deepEqual(L.snapPosition(points,[1],{x:.5,z:9.5},.6,{},['z']).position,{x:.5,z:10});
  const {state,b}=fixture(),fractional=[{x:0,z:0},{x:1/3,z:0},{x:1/3,z:5},{x:10,z:5}],initial=L.storeRoute(state,b.id,fractional);
  const snapped=L.snapPosition(fractional,[2],{x:.4,z:3},.6),moved=L.movePoint(initial,b.id,2,snapped.position);
  assert.equal(L.route(moved.state,b.id).points[moved.index].x,1/3);
});

test('자동 정리는 이번에 생성한 중복·직선 포인트만 제거하고 수동 포인트는 보존한다',()=>{
  const {state,b}=fixture(),points=[{x:-15,z:-6},{x:-10,z:-6},{x:-5,z:-6},{x:0,z:-6},{x:0,z:6}];
  const result={state:L.storeRoute(state,b.id,points),index:3,generated:[2]};
  const cleaned=L.finishMove(result,b.id),next=L.route(cleaned.state,b.id).points;
  assert.deepEqual(next,[points[0],points[1],points[3],points[4]]);assert.equal(cleaned.index,2);
  assert.deepEqual(L.finishMove({...result,index:2},b.id).state,result.state);
});

test('선택 선분 네모 손잡이는 줌과 무관하게 선택되며 3D와 배치 모드에서는 숨는다',()=>{
  const {state,b}=fixture(),T=context.THREE,view=new context.FEMSConnectionView(new T.Scene());view.setState(state);
  const camera=new T.OrthographicCamera(-30,30,20,-20,.1,200);camera.position.set(0,100,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const rect={left:0,top:0,width:600,height:400},selection={id:b.id,kind:'segment',index:0};
  for(const zoom of [.5,1,3]){
    camera.zoom=zoom;camera.updateProjectionMatrix();view.update(camera,400,'plan',false,selection,null,{corner:true,guides:{x:0}});
    assert.equal(view.segmentHandle.visible,true);assert.equal(view.guides[0].visible,true);
    const line=view.lines.find(l=>l.id===b.id),p=view.project(view.segmentHandle.position,line,camera,rect);
    assert.equal(view.pickHandle({clientX:p.x+6,clientY:p.y},camera,rect).handle,true);
    assert.equal(view.pickHandle({clientX:p.x+8,clientY:p.y},camera,rect),null);
  }
  for(const [mode,armed] of [['3d',false],['plan',true]]){view.update(camera,400,mode,armed,selection);assert.equal(view.segmentHandle.visible,false);assert.equal(view.guides[0].visible,false);}
});

test('작은 설비 안 흰색 포인트는 선택·드래그되고 Alt 클릭은 설비를 선택한다',()=>{
  for(const altKey of [false,true]){
    const {h,state,listeners,event,scene}=editorFixture(),id=state.equipment[0].id,e={...event(),altKey};
    overlappingEquipment(scene,e,id);let selected=null;scene.handlers.select=value=>{selected=value;};
    listeners.pointerdown(e);
    if(altKey){assert.equal(scene.drag.id,id);assert.equal(scene.drag.connection,undefined);}
    else{assert.equal(scene.drag.connection.kind,'point');assert.equal(scene.drag.connection.locked,false);listeners.pointermove(event(20,20));assert.notDeepEqual(h.current,state);}
    listeners.pointerup(e);
    if(altKey){assert.equal(selected,id);assert.deepEqual(h.current,state);}else{assert.equal(h.past.length,1);h.undo();assert.deepEqual(h.current,state);}
  }
});

test('검은색 고정점·선분 위에서는 설비 우선, 기즈모 우선순위와 Alt 예외를 지킨다',()=>{
  for(const locked of [false,true]){
    const {h,state,listeners,event,scene}=editorFixture(locked),id=state.equipment[0].id,e=locked?event():event(12,0);
    overlappingEquipment(scene,e,id);let selected=null;scene.handlers.select=value=>{selected=value;};
    assert.equal(scene.connections.pick(e,scene.camera,scene.host.getBoundingClientRect()).kind,locked?'point':'segment');
    listeners.pointerdown(e);assert.equal(scene.drag.id,id);listeners.pointerup(e);assert.equal(selected,id);assert.deepEqual(h.current,state);
    scene.pickGizmo=()=> 'x';assert.equal(scene.pickTarget(e).axis,'x');assert.equal(scene.pickTarget({...e,altKey:true}).id,id);
  }
});

test('흰색 포인트 클릭 반경은 확대율과 무관한 6px이며 미리 강조도 같은 대상을 따른다',()=>{
  const {scene,event,state,listeners}=editorFixture(),rect=scene.host.getBoundingClientRect();
  const view=scene.connections,line=view.lines[0],id=state.equipment[0].id;
  for(const zoom of [.5,1,3]){
    scene.camera.zoom=zoom;scene.camera.updateProjectionMatrix();view.update(scene.camera,400,'plan',false,null);
    const p=view.project(line.points[1],line,scene.camera,rect),options={pointsOnly:true,movableOnly:true};
    assert.ok(view.pick({clientX:p.x+5.9,clientY:p.y},scene.camera,rect,options));
    assert.equal(view.pick({clientX:p.x+6.1,clientY:p.y},scene.camera,rect,options),null);
    const hit={id:line.id,kind:'point',index:1};view.update(scene.camera,400,'plan',false,null,hit);
    assert.equal(line.handles[1].border.material,view.hoverPointMaterial);
    assert.ok(Math.abs(line.handles[1].border.scale.x-.6/zoom)<1e-8);
  }
  scene.camera.zoom=1;scene.camera.updateProjectionMatrix();overlappingEquipment(scene,event(),id);
  listeners.pointermove(event());assert.equal(scene.hoverLink.kind,'point');assert.equal(scene.hovered,null);
  listeners.pointermove({...event(),altKey:true});assert.equal(scene.hovered,id);assert.equal(scene.hoverLink,null);
  scene.hoverBox=new context.THREE.Box3Helper(new context.THREE.Box3());scene.updateHoverVisual();assert.equal(scene.hoverBox.visible,true);
  listeners.pointerleave();scene.updateHoverVisual();assert.equal(scene.hoverBox.visible,false);assert.equal(scene.hoverLink,null);
});
