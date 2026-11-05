const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../js/model.js');
const context = { console, FEMSModel: M, FEMSCatalog: require('../js/catalog.js') };
context.window = context;vm.createContext(context);
for (const file of ['vendor/three.js', 'js/transform-gizmo.js', 'js/scene.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
const T = context.THREE;
function setup(yaw = .6, pitch = .77, plan = false) {
  const labels = { ownerDocument: { createElement: () => ({ style: {}, dataset: {} }) }, appendChild() {} };
  const gizmo = new context.FEMSTransformGizmo(new T.Scene(), labels, {style:{},hidden:true});
  const camera = plan ? new T.OrthographicCamera(-30,30,70/3,-70/3,.1,600) : new T.PerspectiveCamera(38, 900 / 700, .1, 600);
  if(plan){camera.position.set(0,100,0);camera.up.set(0,0,-1);}
  else camera.position.set(60*Math.sin(yaw)*Math.cos(pitch),60*Math.sin(pitch),60*Math.cos(yaw)*Math.cos(pitch));
  camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const item = M.demo().equipment[2];
  gizmo.update(item, new T.Vector3(item.x,0,item.z), camera,700,true);
  const rayAt = point => { const ray=new T.Raycaster();const p=point.clone().project(camera);ray.setFromCamera(new T.Vector2(p.x,p.y),camera);return ray; };
  const handleAt = axis => gizmo.axes.get(axis).direction.clone().multiplyScalar(.75).applyMatrix4(gizmo.group.matrixWorld);
  return { gizmo, camera, item, rayAt, handleAt };
}

test('실제 3D 화살표를 선택하며 선택 해제·배치 중에는 이동·회전 기즈모를 숨긴다', () => {
  const { gizmo, camera, item, rayAt, handleAt }=setup();
  assert.deepEqual(Array.from(gizmo.group.position.toArray()), [item.x, 0, item.z]);
  for(const axis of ['x','z'])assert.equal(gizmo.pick(rayAt(handleAt(axis))),axis);
  gizmo.updateLabels(camera,900,700);
  assert.equal(gizmo.rotateButton.hidden,false);
  for(const axis of gizmo.axes.values())assert.equal(axis.label.hidden,false);
  gizmo.update(item,new T.Vector3(),camera,700,false);
  assert.equal(gizmo.pick(rayAt(new T.Vector3())),null);
  assert.equal(gizmo.rotateButton.hidden,true);
  for(const axis of gizmo.axes.values())assert.equal(axis.label.hidden,true);
  gizmo.update(null,null,camera,700,true);assert.equal(gizmo.group.visible,false);
});

test('여러 시점에서 양·음 방향으로 드래그해도 선택한 세계 좌표 축만 이동한다', () => {
  for(const yaw of [0,.6,Math.PI/2,Math.PI,-1.2])for(const pitch of [.15,.77,1.5])for(const axis of ['x','z']) {
    const { gizmo,camera,item,rayAt,handleAt }=setup(yaw,pitch);
    const start=handleAt(axis), drag=gizmo.begin(axis,rayAt(start).ray,camera,item);
    assert.ok(drag);
    for(const delta of [-3,0,2.35]) {
      const end=start.clone();end[axis]+=delta;
      const pos=gizmo.positionFor(drag,rayAt(end).ray,{width:60,depth:40});
      assert.ok(Math.abs(pos[axis]-(item[axis]+delta))<1e-6);
      const other=axis==='x'?'z':'x';assert.equal(pos[other],item[other]);
    }
  }
});

test('회전한 설비도 부지 경계를 지키고 반대 좌표를 보존한다', () => {
  const { gizmo,camera,item,rayAt,handleAt }=setup();item.rotation=37;item.z=3.811234;
  const start=handleAt('x'),drag=gizmo.begin('x',rayAt(start).ray,camera,item);
  const end=start.clone();end.x+=100;
  const pos=gizmo.positionFor(drag,rayAt(end).ray,{width:60,depth:40});
  assert.ok(Math.abs(pos.x-(30-M.extents(item).x))<.001);assert.equal(pos.z,item.z);
});

function sceneFixture(plan = false, axis = 'x') {
  const {gizmo,camera,rayAt,handleAt}=setup(.6,.77,plan);
  const scene=Object.create(context.FEMSScene.prototype), h=new M.History(M.demo()), id=h.current.equipment[2].id;
  const listeners={}, previews=[];
  Object.assign(scene,{gizmo,camera,selected:id,state:h.current,mode:plan?'plan':'3d',armed:null,move:false,
    host:{style:{}},ray:new T.Raycaster(),models:new Map(),handlers:{
      gizmoStart(){},gizmoPreview(itemId,pos){const next=M.clone(h.current);Object.assign(next.equipment.find(e=>e.id===itemId),pos);h.preview(next);scene.state=h.current;previews.push(pos);},
      gizmoEnd(commit){h.finishEdit(commit);scene.state=h.current;},select(){throw new Error('기즈모 조작 중 선택이 변경됨');}},
    renderer:{domElement:{addEventListener(name,fn){listeners[name]=fn;},setPointerCapture(){},hasPointerCapture(){return false;}}},
    invalidate(){},updateGizmo(){},pick(){return null;},floor(){return new T.Vector3();},
    setPointer(e){this.ray=rayAt(e.world);}});
  scene.bind();return {scene,h,listeners,previews,start:axis==='xz'?gizmo.planeHandle.getWorldPosition(new T.Vector3()):handleAt(axis)};
}

test('XZ 평면 핸들은 여러 시점과 확대율에서 두 좌표를 함께 이동하며 시작점이 튀지 않는다',()=>{
  for(const plan of [false,true])for(const yaw of [0,.6,Math.PI/2,-1.2])for(const zoom of [.5,1,3]){
    const {gizmo,camera,item,rayAt}=setup(yaw,.77,plan);camera.zoom=zoom;camera.updateProjectionMatrix();
    gizmo.update(item,new T.Vector3(item.x,0,item.z),camera,700,true);
    const start=gizmo.planeHandle.getWorldPosition(new T.Vector3());assert.equal(gizmo.pick(rayAt(start)),'xz');
    const drag=gizmo.begin('xz',rayAt(start).ray,camera,item);
    for(const [dx,dz] of [[0,0],[2.35,-1.27],[-3,4]]){
      const pos=gizmo.positionFor(drag,rayAt(start.clone().add(new T.Vector3(dx,0,dz))).ray,{width:60,depth:40});
      assert.ok(Math.abs(pos.x-item.x-dx)<1e-6);assert.ok(Math.abs(pos.z-item.z-dz)<1e-6);
    }
    item.rotation=37;const bounded=gizmo.begin('xz',rayAt(start).ray,camera,item);
    const boundaryRay=new T.Ray(start.clone().add(new T.Vector3(100,100,-100)),new T.Vector3(0,-1,0));
    const pos=gizmo.positionFor(bounded,boundaryRay,{width:60,depth:40});
    assert.ok(Math.abs(pos.x-(30-M.extents(item).x))<.001);assert.ok(Math.abs(pos.z-(-20+M.extents(item).z))<.001);
    gizmo.highlight('xz');assert.equal(gizmo.planeHandle.material.opacity,.75);
    gizmo.update(null,null,camera,700,true);assert.equal(gizmo.pick(rayAt(start)),null);
  }
});

test('XZ 드래그는 3D·평면도에서 한 번에 실행 취소하고 취소·캡처 유실 시 두 좌표를 복원한다',()=>{
  for(const plan of [false,true])for(const action of ['commit','cancelDrag','pointercancel','lostpointercapture','click']){
    const {scene,h,listeners,start}=sceneFixture(plan,'xz'),before=M.clone(h.current);
    scene.connections={pick(){throw new Error('평면 핸들 아래 연결선이 선택됨');}};
    listeners.pointerdown({button:0,pointerId:1,clientX:100,clientY:100,world:start});assert.equal(scene.drag.axis,'xz');
    if(action!=='click')listeners.pointermove({pointerId:1,clientX:130,clientY:120,world:start.clone().add(new T.Vector3(2,0,3))});
    if(action==='commit'||action==='click')listeners.pointerup({button:0,pointerId:1});
    else if(action==='cancelDrag')scene.cancelDrag();else listeners[action]();
    if(action==='commit'){
      assert.equal(h.current.equipment[2].x,before.equipment[2].x+2);assert.equal(h.current.equipment[2].z,before.equipment[2].z+3);
      assert.equal(h.past.length,1);h.undo();assert.deepEqual(h.current,before);
    }else{assert.deepEqual(h.current,before);assert.equal(h.past.length,0);}
  }
});

test('이동 모드를 켜지 않아도 기즈모 드래그가 실시간 반영되고 한 번의 실행 취소로 복원된다', () => {
  const {scene,h,listeners,previews,start}=sceneFixture(), before=M.clone(h.current);
  listeners.pointerdown({button:0,pointerId:1,clientX:100,clientY:100,world:start});
  assert.equal(scene.drag.axis,'x');assert.equal(scene.host.style.cursor,'default');
  for(const delta of [1,2,3])listeners.pointermove({pointerId:1,clientX:100+delta*10,clientY:100,world:start.clone().add(new T.Vector3(delta,0,0))});
  assert.equal(previews.length,3);assert.equal(h.current.equipment[2].x,3);assert.equal(h.past.length,0);
  listeners.pointerup({button:0,pointerId:1});assert.equal(h.past.length,1);
  h.undo();assert.deepEqual(h.current,before);h.redo();assert.equal(h.current.equipment[2].x,3);
});

test('평면도에서 확대율과 관계없이 두 축을 드래그하고 회전 버튼을 표시한다', () => {
  const {gizmo,camera,item,rayAt,handleAt}=setup(.6,.77,true);
  for(const zoom of [.5,1,3]) {
    camera.zoom=zoom;camera.updateProjectionMatrix();
    gizmo.update(item,new T.Vector3(item.x,0,item.z),camera,700,true);
    gizmo.updateLabels(camera,900,700);
    assert.equal(gizmo.rotateButton.hidden,false);
    assert.ok(Math.abs(gizmo.group.scale.x-6/zoom)<1e-8);
    for(const axis of ['x','z']) {
      const start=handleAt(axis);assert.equal(gizmo.pick(rayAt(start)),axis);
      const drag=gizmo.begin(axis,rayAt(start).ray,camera,item);
      const end=start.clone();end[axis]+=2.35;
      const pos=gizmo.positionFor(drag,rayAt(end).ray,{width:60,depth:40});
      assert.ok(Math.abs(pos[axis]-item[axis]-2.35)<1e-8);
      const other=axis==='x'?'z':'x';assert.equal(pos[other],item[other]);
    }
  }
});

test('평면도 기즈모가 겹친 연결선보다 우선하고 이동은 한 번에 실행 취소된다', () => {
  const {scene,h,listeners,start}=sceneFixture(true),before=M.clone(h.current);
  scene.connections={pick(){throw new Error('기즈모 아래 연결선을 선택함');}};
  listeners.pointerdown({button:0,pointerId:1,clientX:100,clientY:100,world:start});
  assert.equal(scene.drag.axis,'x');
  listeners.pointermove({pointerId:1,clientX:120,clientY:100,world:start.clone().add(new T.Vector3(2,0,0))});
  listeners.pointerup({button:0,pointerId:1});
  assert.equal(h.current.equipment[2].x,2);assert.equal(h.past.length,1);
  h.undo();assert.deepEqual(h.current,before);
});

test('Scene은 두 보기에서 선택 기즈모를 표시하고 배치 중·선택 해제 시 숨긴다', () => {
  const {scene}=sceneFixture(true),item=scene.state.equipment[2];
  scene.models.set(item.id,{position:new T.Vector3(item.x,0,item.z)});scene.height=700;
  for(const mode of ['plan','3d']) {
    scene.mode=mode;context.FEMSScene.prototype.updateGizmo.call(scene);
    assert.equal(scene.gizmo.group.visible,true);
  }
  scene.armed='transformer';context.FEMSScene.prototype.updateGizmo.call(scene);
  assert.equal(scene.gizmo.group.visible,false);
  scene.armed=null;scene.selected=null;context.FEMSScene.prototype.updateGizmo.call(scene);
  assert.equal(scene.gizmo.group.visible,false);
});

test('기즈모 취소·포인터 취소·캡처 유실은 시작 위치를 복원하며 클릭만 하면 기록을 남기지 않는다', () => {
  for(const action of ['cancelDrag','pointercancel','lostpointercapture','click']) {
    const {scene,h,listeners,start}=sceneFixture(), before=M.clone(h.current);
    listeners.pointerdown({button:0,pointerId:1,clientX:100,clientY:100,world:start});
    if(action==='click')listeners.pointerup({button:0,pointerId:1});
    else {
      listeners.pointermove({pointerId:1,clientX:120,clientY:100,world:start.clone().add(new T.Vector3(2,0,0))});
      if(action==='cancelDrag')scene.cancelDrag();else listeners[action]();
    }
    assert.deepEqual(h.current,before);assert.equal(h.past.length,0);assert.equal(scene.drag,null);
  }
});

test('외부 경로 기즈모는 XYZ 축으로 움직이고 평면도에서 숨긴 Y축은 선택하지 않는다',()=>{
 const {camera,rayAt}=setup(),labels={ownerDocument:{createElement:()=>({style:{},dataset:{}})},appendChild(){}};
 const gizmo=new context.FEMSTransformGizmo(new T.Scene(),labels,null,{vertical:true}),point={x:2,y:8,z:3};gizmo.update(point,point,camera,700,true);
 for(const axis of ['x','y','z']){
  const handle=gizmo.axes.get(axis).direction.clone().multiplyScalar(.75).applyMatrix4(gizmo.group.matrixWorld),ray=rayAt(handle);
  assert.equal(gizmo.pick(ray),axis);const drag=gizmo.begin(axis,ray.ray,camera,point),target=handle.clone();target[axis]+=2;
  const result=gizmo.positionForPoint(drag,rayAt(target).ray);assert.equal(result[axis],point[axis]+2);
  for(const other of ['x','y','z'].filter(k=>k!==axis))assert.equal(result[other],point[other]);
 }
 gizmo.axes.get('y').arrow.visible=false;gizmo.updateLabels(camera,900,700);assert.equal(gizmo.axes.get('y').label.hidden,true);
});
