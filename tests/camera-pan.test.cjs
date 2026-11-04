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
