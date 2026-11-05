const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = { console, FEMSCatalog: require('../js/catalog.js'), FEMSModel: require('../js/model.js') };
context.window = context;
vm.createContext(context);
for (const file of ['vendor/three.js', 'js/scene.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
const T = context.THREE, Scene = context.FEMSScene;
test('건물 확대는 현재 3D·평면도 회전각을 유지하고 가까이 있을 때 축소하지 않는다',()=>{
  for(const mode of ['3d','plan'])for(const yaw of [-1.2,2.4]){
    const {scene}=fixture(mode);Object.assign(scene,{yaw,planYaw:yaw,pitch:.35,radius:200});scene.updateCamera();
    const direction=scene.camera.getWorldDirection(new T.Vector3());
    scene.state.focusBounds={x:30,z:-20,width:20,depth:16,low:0,high:12};
    scene.fit({preserveAngle:true,zoomInOnly:true});
    assert.equal(scene.yaw,yaw);assert.equal(scene.planYaw,yaw);assert.equal(scene.pitch,.35);assert.ok(scene.radius<200);
    assert.ok(direction.distanceTo(scene.camera.getWorldDirection(new T.Vector3()))<1e-6);
    assert.deepEqual([scene.target.x,scene.target.y,scene.target.z],[30,6,-20]);
    for(const x of [20,40])for(const z of [-28,-12])for(const y of [0,12]){const p=new T.Vector3(x,y,z).project(scene.camera);assert.ok(Math.abs(p.x)<=1&&Math.abs(p.y)<=1);}
    scene.radius=10;scene.fit({preserveAngle:true,zoomInOnly:true});assert.equal(scene.radius,10);
    scene.fit();assert.equal(scene.yaw,.6);assert.equal(scene.pitch,.77);assert.equal(scene.planYaw,0);
  }
});
test('외부 연결 빌보드는 끝점에 투영되고 클릭·숨김·공간 변경을 처리한다',()=>{
  const original=context.document;
  context.document={createElement(){return {style:{},dataset:{},events:{},addEventListener(k,fn){this.events[k]=fn;},setAttribute(){},remove(){this.removed=true;}};}};
  try{for(const mode of ['plan','3d']){
    const {scene}=fixture(mode);scene.state.equipment=[];scene.labels=new Map();scene.showLabels=true;
    scene.labelHost={appendChild(){},removeAttribute(){}};
    scene.connections={lines:[{id:'portal',height:.2,portal:{targetId:'remote',name:'다른 층 설비',path:'건물 › 2F › 다른 층 설비',point:{x:10,z:2}}}]};
    const visits=[];scene.handlers.navigateEquipment=id=>visits.push(id);scene.syncPortalLabels();scene.updateLabels();
    const label=scene.portalLabels.get('portal'),point=new T.Vector3(10,.2,2).project(scene.camera);
    assert.equal(label.hidden,false);assert.ok(Math.abs(parseFloat(label.style.left)-(point.x+1)/2*scene.width)<1e-8);
    assert.ok(Math.abs(parseFloat(label.style.top)-(1-point.y)/2*scene.height)<1e-8);
    label.events.click();assert.deepEqual(visits,['remote']);
    scene.armed='panel';scene.updateLabels();assert.equal(label.disabled,true);label.events.click();assert.equal(visits.length,1);
    scene.armed=null;scene.showLabels=false;scene.updateLabels();assert.equal(label.hidden,true);
    scene.connections.lines=[];scene.syncPortalLabels();assert.equal(label.removed,true);assert.equal(scene.portalLabels.size,0);
  }}finally{context.document=original;}
});

test('높은 건물과 지하층도 평면도 카메라의 표시 범위에 포함된다',()=>{
  const {scene}=fixture('plan');scene.state.equipment=[{x:0,z:0,y:-1000,height:.2},{x:0,z:0,y:1000,height:200}];scene.fit();
  for(const y of [-1000,1200]){const p=new T.Vector3(0,y,0).project(scene.camera);assert.ok(Math.abs(p.z)<=1);}
});

test('대지와 다른 객체를 유지해도 포커싱은 선택 건물 범위만 사용한다',()=>{
  for(const mode of ['3d','plan']){
    const {scene}=fixture(mode);scene.state.site={width:1000,depth:1000};
    scene.state.equipment.push({x:-400,z:-400,y:0,height:200});
    scene.state.focusBounds={x:30,z:-20,width:20,depth:16,low:-4,high:12};scene.fit();
    assert.deepEqual([scene.target.x,scene.target.y,scene.target.z],[30,4,-20]);assert.ok(scene.radius<100);
    for(const x of [20,40])for(const z of [-28,-12])for(const y of [-4,12]){
      const point=new T.Vector3(x,y,z).project(scene.camera);assert.ok(Math.abs(point.x)<=1&&Math.abs(point.y)<=1);
    }
    scene.state.focusBounds=null;scene.fit();assert.equal(scene.target.x,0);assert.ok(scene.radius>1000);
  }
});

test('큰 바닥의 전체 보기·줌·이동은 기존 500m·120m 제한을 넘고 모서리가 화면에 들어온다',()=>{
  for(const mode of ['plan','3d'])for(const size of [.1,100000]) {
    const {scene}=fixture(mode);scene.state.site={width:size,depth:size};scene.fit();
    for(const x of [-size/2,size/2])for(const z of [-size/2,size/2]) {
      const p=new T.Vector3(x,0,z).project(scene.camera);
      assert.ok(Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&Math.abs(p.z)<=1,JSON.stringify({mode,size,p}));
    }
    if(size>500){const radius=scene.radius;scene.zoom(1.18);assert.ok(scene.radius>radius);scene.pan(400,400);assert.ok(Math.abs(scene.target.x)>120||Math.abs(scene.target.z)>120);}
  }
});

function fixture(mode) {
  const listeners = {}, scene = Object.create(Scene.prototype);
  const item = { id: 'test', x: 0, z: 0, width: 2, depth: 2, height: 2, rotation: 0 };
  Object.assign(scene, { mode, yaw: .6, planYaw: 0, pitch: .77, radius: 64, width: 900, height: 700,
    host: { style: {} }, target: new T.Vector3(), armed: null, move: false,
    perspective: new T.PerspectiveCamera(38, 900 / 700, .1, 600), ortho: new T.OrthographicCamera(),
    models: new Map([['test', new T.Object3D()]]), footprints: new Map([['test', new T.Object3D()]]),
    state: { site: { width: 60, depth: 40 }, equipment: [item] },
    renderer: { domElement: { addEventListener(name, fn) { listeners[name] = fn; },
      setPointerCapture() {}, hasPointerCapture() { return false; } } },
    pick: () => null, floor: e => new T.Vector3((e.clientX - 200) / 20, 0, (e.clientY - 200) / 20),
    invalidate() {}, updateSelection() {},
    handlers: { select(id) { scene.selected = id; scene.updateCursor(); },
      move(id, position) { scene.committedMove = { id, ...position }; } } });
  scene.camera = mode === 'plan' ? scene.ortho : scene.perspective;
  scene.updateCamera();scene.bind();
  return { scene, listeners };
}

test('평면도 이름표는 회전·줌·이동 중에도 설비 상단과 4px 간격을 유지하고 3D 위치는 유지된다',()=>{
  const {scene}=fixture('plan'),item=scene.state.equipment[0],model=scene.models.get('test');
  Object.assign(item,{width:6,depth:2,name:'설비'});
  const label={style:{}};scene.labels=new Map([['test',label]]);scene.showLabels=true;
  const geometry=new T.BoxGeometry(item.width,0,item.depth);
  for(const radius of [20,64])for(const rotation of [0,Math.PI/4,Math.PI/2])for(const planYaw of [0,.7]){
    scene.radius=radius;scene.planYaw=planYaw;scene.updateCamera();
    model.position.set(3,0,-2);model.rotation.y=rotation;model.updateMatrixWorld();
    scene.updateLabels();
    const vertices=geometry.attributes.position;let top=Infinity;
    for(let i=0;i<vertices.count;i++){
      const p=new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(model.matrixWorld);p.y=.1;p.project(scene.camera);
      top=Math.min(top,(1-p.y)/2*scene.height);
    }
    const center=new T.Vector3(3,.1,-2).project(scene.camera);
    assert.ok(Math.abs(parseFloat(label.style.top)-(top-4))<1e-8);
    assert.ok(Math.abs(parseFloat(label.style.left)-(center.x+1)/2*scene.width)<1e-8);
    assert.ok(top<(1-center.y)/2*scene.height);
    assert.equal(label.hidden,false);
  }
  geometry.dispose();scene.mode='3d';scene.camera=scene.perspective;scene.updateCamera();scene.updateLabels();
  const anchor=new T.Vector3(3,item.height+.3,-2).project(scene.camera);
  assert.ok(Math.abs(parseFloat(label.style.top)-(1-anchor.y)/2*scene.height)<1e-8);
});

for (const mode of ['plan', '3d']) {
  test(`${mode}: 썸네일 드롭은 한 번 배치하고 화면 밖·외부 파일은 배치하지 않는다`,()=>{
    const {scene,listeners}=fixture(mode),placed=[];
    scene.armed='tower';scene.ghost=new T.Object3D();scene.handlers.place=(...args)=>placed.push(args);
    const event={clientX:240,clientY:260,preventDefault(){this.prevented=true;},dataTransfer:{types:['application/x-fems-equipment'],getData:()=> 'tower'}};
    listeners.dragover(event);assert.equal(event.dataTransfer.dropEffect,'copy');assert.equal(scene.ghost.visible,true);
    listeners.drop(event);assert.deepEqual(placed,[['tower',2,3]]);assert.equal(scene.ghost.visible,false);
    listeners.dragover({...event,clientX:9999});assert.equal(event.dataTransfer.dropEffect,'none');assert.equal(scene.ghost.visible,false);
    listeners.drop({...event,clientX:9999});listeners.drop({...event,dataTransfer:{types:['Files']}});assert.equal(placed.length,1);
    listeners.dragover(event);listeners.dragleave();assert.equal(scene.ghost.visible,false);
    // Existing click-to-place remains available without the placement help overlay.
    const click={button:0,pointerId:1,clientX:240,clientY:260};listeners.pointerdown(click);listeners.pointerup(click);
    assert.equal(placed.length,2);
  });
  test(`${mode}: 이름표 클릭은 설비 선택, 드래그는 화면 이동이며 숨긴 이름표는 선택하지 않는다`, () => {
    const {scene,listeners}=fixture(mode), label={hidden:false,textContent:'',style:{},getBoundingClientRect:()=>({left:180,right:220,top:180,bottom:220})};
    scene.showLabels=true;scene.labels=new Map([['test',label]]);
    scene.state.equipment[0].name='설비 이름';scene.state.equipment[0].code='CODE-01';
    scene.updateLabels();assert.equal(label.textContent,'설비 이름');
    const e={button:0,pointerId:1,clientX:200,clientY:200};
    listeners.pointerdown(e);listeners.pointerup(e);assert.equal(scene.selected,'test');
    scene.selected=null;listeners.pointerdown(e);listeners.pointermove({...e,clientX:260});listeners.pointerup({...e,clientX:260});
    assert.equal(scene.selected,null);assert.ok(scene.target.length()>0);
    scene.pickGizmo=()=> 'x';assert.equal(scene.pickTarget(e).axis,'x');scene.pickGizmo=()=>null;
    label.hidden=true;assert.equal(scene.pickLabel(e),null);label.hidden=false;scene.showLabels=false;assert.equal(scene.pickLabel(e),null);
    scene.showLabels=true;scene.armed='tower';assert.equal(scene.pickTarget(e).id,undefined);
  });
  test(`${mode}: 우클릭은 3D에서만 회전하고 평면도에서는 무시한다`, () => {
    const { scene, listeners } = fixture(mode);
    const before = scene.camera.quaternion.clone();
    listeners.pointerdown({ button: 2, pointerId: 1, clientX: 200, clientY: 200 });
    listeners.pointermove({ clientX: 260, clientY: 230 });
    if(mode === 'plan')assert.ok(before.equals(scene.camera.quaternion));else assert.ok(before.angleTo(scene.camera.quaternion) > .1);
    assert.equal(scene.target.length(), 0);
    if(mode === '3d')assert.equal(scene.host.style.cursor, 'grabbing');
    if (mode === 'plan') assert.ok(scene.camera.getWorldDirection(new T.Vector3()).distanceTo(new T.Vector3(0, -1, 0)) < 1e-6);
    listeners.pointerup({ button: 2, pointerId: 1, clientX: 260, clientY: 230 });
    assert.equal(scene.host.style.cursor, 'grab');
  });
  test(`${mode}: 선택·객체 이동은 화살표이고 객체 위 우클릭은 3D에서만 회전한다`, () => {
    const { scene, listeners } = fixture(mode);
    scene.pick = () => 'test';
    listeners.pointermove({ clientX: 200, clientY: 200 });
    assert.equal(scene.host.style.cursor, 'default');
    listeners.pointerdown({ button: 0, pointerId: 1, clientX: 200, clientY: 200 });
    listeners.pointerup({ button: 0, pointerId: 1, clientX: 200, clientY: 200 });
    assert.equal(scene.selected, 'test');assert.equal(scene.host.style.cursor, 'default');
    scene.move = true;
    const before = scene.camera.quaternion.clone();
    listeners.pointerdown({ button: 0, pointerId: 1, clientX: 200, clientY: 200 });
    listeners.pointermove({ clientX: 260, clientY: 240 });
    assert.equal(scene.host.style.cursor, 'default');
    assert.ok(before.equals(scene.camera.quaternion));assert.equal(scene.target.length(), 0);
    listeners.pointerup({ button: 0, pointerId: 1, clientX: 260, clientY: 240 });
    assert.deepEqual(scene.committedMove, { id: 'test', x: 3, z: 2 });
    scene.committedMove = null;
    listeners.pointerdown({ button: 2, pointerId: 1, clientX: 200, clientY: 200 });
    listeners.pointermove({ clientX: 260, clientY: 240 });
    listeners.pointerup({ button: 2, pointerId: 1, clientX: 260, clientY: 240 });
    assert.equal(scene.target.length(), 0);if(mode === 'plan')assert.ok(before.equals(scene.camera.quaternion));else assert.ok(before.angleTo(scene.camera.quaternion) > .1);assert.equal(scene.committedMove, null);
    assert.equal(scene.selected, 'test');assert.equal(scene.host.style.cursor, 'default');
  });
}

for (const mode of ['plan', '3d']) {
  test(`${mode}: 실제 카메라 투영에서 도면이 상하·좌우 좌클릭 드래그 방향을 따른다`, () => {
    for (const yaw of [0, .6, Math.PI / 2, Math.PI, -1.2]) {
      for (const [dx, dy] of [[0, 60], [0, -60], [60, 0], [-60, 0]]) {
        const scene = Object.create(Scene.prototype);
        Object.assign(scene, { mode, yaw, planYaw: yaw, host: { style: {} }, pitch: .77, radius: 64, width: 900, height: 700,
          target: new T.Vector3(), perspective: new T.PerspectiveCamera(38, 900 / 700, .1, 600),
          ortho: new T.OrthographicCamera(), invalidate() {} });
        scene.camera = mode === 'plan' ? scene.ortho : scene.perspective;
        scene.updateCamera();
        const before = new T.Vector3(0, 0, 0).project(scene.camera);
        const listeners = {};
        const canvas = { addEventListener(name, callback) { listeners[name] = callback; },
          setPointerCapture() {}, hasPointerCapture() { return false; } };
        Object.assign(scene, { renderer: { domElement: canvas }, armed: null, move: false,
          pick: () => null, floor: () => new T.Vector3(), handlers: { select() {} } });
        scene.bind();
        const button = 0;
        listeners.pointerdown({ button, pointerId: 1, clientX: 200, clientY: 200 });
        listeners.pointermove({ pointerId: 1, clientX: 200 + dx, clientY: 200 + dy });
        listeners.pointerup({ button, pointerId: 1 });
        const after = new T.Vector3(0, 0, 0).project(scene.camera);
        const screenX = after.x - before.x, screenY = before.y - after.y;
        if (dx) { assert.ok(screenX * dx > 0); assert.ok(Math.abs(screenY) < 1e-6); }
        if (dy) { assert.ok(screenY * dy > 0); assert.ok(Math.abs(screenX) < 1e-6); }
      }
    }
  });
}


for(const mode of ['3d','plan'])test(`${mode}: 빌보드 클릭만 진입 콜백을 호출하고 모델 클릭·드래그는 호출하지 않는다`,()=>{
  const {scene,listeners}=fixture(mode),events=[];scene.showLabels=true;scene.pick=()=> 'test';
  scene.labels=new Map([['test',{hidden:false,getBoundingClientRect:()=>({left:180,right:220,top:180,bottom:220})}]]);
  scene.handlers.select=id=>events.push(['select',id]);scene.handlers.selectLabel=id=>events.push(['label',id]);
  const e={button:0,pointerId:1,clientX:200,clientY:200};
  listeners.pointerdown(e);listeners.pointerup(e);assert.deepEqual(events.pop(),['label','test']);
  listeners.pointerdown({...e,altKey:true});listeners.pointerup(e);assert.deepEqual(events.pop(),['label','test']);
  listeners.pointerdown({...e,clientX:250});listeners.pointerup({...e,clientX:250});assert.deepEqual(events.pop(),['select','test']);
  listeners.pointerdown(e);listeners.pointermove({...e,clientX:260});listeners.pointerup({...e,clientX:260});assert.equal(events.length,0);
  scene.state.floors=[{id:'test'}];scene.showLabels=false;assert.equal(scene.pickLabel(e),'test');
});

for(const mode of ['3d','plan'])test(`${mode}: 층 형상은 호버·선택에서 제외하고 빌보드는 층 강조와 진입을 유지한다`,()=>{
  const {scene,listeners}=fixture(mode),events=[],floor=scene.state.equipment[0];
  scene.state.floors=[{id:floor.id}];scene.showLabels=true;
  scene.pick=Scene.prototype.pick;scene.setPointer=()=>{};
  let hits=[{object:{userData:{equipmentId:floor.id}}}];scene.ray={intersectObjects:()=>hits};
  scene.labels=new Map([[floor.id,{hidden:false,getBoundingClientRect:()=>({left:180,right:220,top:180,bottom:220})}]]);
  scene.hoverBox={visible:false,box:new T.Box3()};
  scene.handlers.select=id=>events.push(['select',id]);scene.handlers.selectLabel=id=>events.push(['label',id]);
  const modelEvent={button:0,pointerId:1,clientX:300,clientY:300},labelEvent={...modelEvent,clientX:200,clientY:200};
  listeners.pointermove(modelEvent);scene.updateHoverVisual();assert.equal(scene.hovered,null);assert.equal(scene.hoverBox.visible,false);assert.equal(scene.renderer.domElement.title,'');
  for(const altKey of [false,true]){listeners.pointerdown({...modelEvent,altKey});listeners.pointerup(modelEvent);assert.deepEqual(events.pop(),['select',null]);}
  listeners.pointermove(labelEvent);scene.updateHoverVisual();assert.equal(scene.hovered,floor.id);assert.equal(scene.hoverBox.visible,true);
  listeners.pointerdown(labelEvent);listeners.pointerup(labelEvent);assert.deepEqual(events.pop(),['label',floor.id]);
  listeners.pointermove(modelEvent);scene.updateHoverVisual();assert.equal(scene.hoverBox.visible,false);
  scene.state.equipment.push({...floor,id:'equipment'});hits.push({object:{userData:{equipmentId:'equipment'}}});
  assert.equal(scene.pick(modelEvent),'equipment');
  scene.state.floors=[];floor.floorSelector=true;assert.equal(scene.pick(modelEvent),'equipment');
});

test('건물 투명 표시는 공유 GLB 재질과 그림자 원본을 보존하고 복원한다',()=>{
  const {scene}=fixture('3d'),material=new T.MeshStandardMaterial(),mesh=new T.Mesh(new T.BoxGeometry(),material);mesh.castShadow=true;
  scene.styleSpatial(mesh,{backdrop:true,buildingShell:true});assert.notEqual(mesh.material,material);assert.equal(material.opacity,1);assert.equal(mesh.material.opacity,.08);assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.castShadow,false);
  scene.styleSpatial(mesh,null);assert.equal(mesh.material,material);assert.equal(mesh.castShadow,true);material.dispose();mesh.geometry.dispose();
});
test('평면도의 겹친 층 이름표는 분리되고 이름 숨김 상태에서도 층 진입이 가능하다',()=>{
  const {scene}=fixture('plan');scene.showLabels=false;scene.labels=new Map();scene.state.equipment=[];scene.models=new Map();
  for(let i=0;i<4;i++){const id='floor'+i,model=new T.Object3D();model.position.y=i*3;scene.models.set(id,model);scene.state.equipment.push({id,name:(i+1)+'F',x:0,z:0,y:i*3,width:20,depth:16,height:.2,rotation:0,floorSelector:true});
    const label={hidden:false,textContent:'',style:{},getBoundingClientRect(){return {left:parseFloat(this.style.left)-20,right:parseFloat(this.style.left)+20,top:parseFloat(this.style.top)-24,bottom:parseFloat(this.style.top)};}};scene.labels.set(id,label);}
  scene.updateLabels();const labels=[...scene.labels.values()],tops=labels.map(l=>parseFloat(l.style.top)).sort((a,b)=>a-b);
  for(let i=1;i<tops.length;i++)assert.ok(tops[i]-tops[i-1]>=28);
  for(const [id,label] of scene.labels){assert.equal(label.hidden,false);const r=label.getBoundingClientRect();assert.equal(scene.pickLabel({clientX:(r.left+r.right)/2,clientY:(r.top+r.bottom)/2}),id);}
});
