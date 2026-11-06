const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../js/spatial.js');
const context={console,FEMSSpatial:S};context.window=context;vm.createContext(context);
for(const file of ['vendor/three.js','js/floor-shadows.js','js/scene.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const T=context.THREE;
function fixture(){
  const state={buildings:[{id:'building',x:10,z:20,rotation:90}],floors:[{id:'floor',buildingId:'building',x:2,z:3,rotation:0,width:20,depth:16,height:1,elevation:8}],equipment:[{id:'inside',floorId:'floor'},{id:'outside'}]};
  const models=new Map(state.equipment.map(item=>{const group=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());mesh.castShadow=true;group.add(mesh);return [item.id,group];}));
  const scene=new T.Scene(),sun=new T.DirectionalLight();sun.position.set(-20,35,20);for(const m of models.values())scene.add(m);
  const shadows=new context.FEMSFloorShadows(scene,sun);
  const display=Object.create(context.FEMSScene.prototype);display.state=state;
  return {state,models,shadows,display};
}
test('층 선택에서는 층 설비만 공통 그림자에서 제외하고 층 내부·대지 이동 때 복원한다',()=>{
  const {state,models,display}=fixture(),inside=models.get('inside').children[0],outside=models.get('outside').children[0];
  display.styleSpatial(models.get('inside'),state.equipment[0]);display.styleSpatial(models.get('outside'),state.equipment[1]);
  assert.equal(inside.castShadow,false);assert.equal(inside.userData.spatialShadow,true);assert.equal(outside.castShadow,true);
  state.scopeFloorId='floor';display.styleSpatial(models.get('inside'),state.equipment[0]);assert.equal(inside.castShadow,true);
  state.scopeFloorId=null;display.styleSpatial(models.get('inside'),state.equipment[0]);display.styleSpatial(models.get('inside'),{id:'inside'});assert.equal(inside.castShadow,true);
});
test('층별 투영은 소속 층 높이·회전·경계를 사용하고 원본 모델 및 저장 상태를 변경하지 않는다',()=>{
  const {state,models,shadows,display}=fixture(),before=JSON.stringify(state),source=models.get('inside').children[0],original=source.material;
  display.styleSpatial(models.get('inside'),state.equipment[0]);shadows.sync(state,models);shadows.update('3d');
  assert.equal(shadows.records.size,1);const record=[...shadows.records.values()][0],u=record.materials[0].uniforms;
  assert.equal(u.floorHeight.value,8.08);assert.deepEqual(Array.from(u.floorCenter.value.toArray()),[13,18]);assert.deepEqual(Array.from(u.floorHalfSize.value.toArray()),[10,8]);
  assert.ok(Math.abs(u.floorRotation.value.y-1)<1e-9);assert.ok(u.lightSlope.value.x>0&&u.lightSlope.value.y<0);
  assert.equal(record.mesh.geometry,source.geometry);assert.equal(source.material,original);assert.equal(JSON.stringify(state),before);
  assert.equal(record.materials[0].stencilZPass,T.ReplaceStencilOp);assert.equal(record.materials[0].depthWrite,false);
  models.get('inside').position.set(5,8,9);shadows.update('3d');assert.equal(record.mesh.matrix.elements[12],5);
  shadows.update('plan');assert.equal(shadows.group.visible,false);shadows.update('3d');assert.equal(shadows.group.visible,true);
});
test('반복 갱신은 투영 재질을 재사용하고 층 진입·삭제 시 원본 형상을 폐기하지 않는다',()=>{
  const {state,models,shadows}=fixture();shadows.sync(state,models);const first=[...shadows.records.values()][0];
  shadows.sync(state,models);assert.equal([...shadows.records.values()][0],first);
  let geometryDisposed=false,materialDisposed=false;first.mesh.geometry.addEventListener('dispose',()=>geometryDisposed=true);first.materials[0].addEventListener('dispose',()=>materialDisposed=true);
  state.scopeFloorId='floor';shadows.sync(state,models);assert.equal(shadows.records.size,0);assert.equal(materialDisposed,true);assert.equal(geometryDisposed,false);
  state.scopeFloorId=null;shadows.sync(state,models);state.equipment=[];shadows.sync(state,models);assert.equal(shadows.records.size,0);assert.equal(shadows.group.children.length,0);
});
test('추가 GLB가 늦게 로드되면 새 형상에 투영을 적용하고 투명 마스크를 보존한다',()=>{
  const {state,models,shadows}=fixture();shadows.sync(state,models);const old=[...shadows.records.keys()][0],model=models.get('inside');
  model.remove(model.children[0]);const map=new T.Texture(),alphaMap=new T.Texture(),material=new T.MeshStandardMaterial({map,alphaMap,alphaTest:.5});
  const mesh=new T.Mesh(new T.BoxGeometry(),material);mesh.castShadow=true;model.add(mesh);shadows.sync(state,models);
  assert.equal(shadows.records.has(old),false);const projection=shadows.records.get(mesh.uuid).materials[0];
  assert.equal(projection.uniforms.map.value,map);assert.equal(projection.uniforms.alphaMap.value,alphaMap);assert.equal(projection.uniforms.alphaTest.value,.5);assert.equal(mesh.material,material);
});
