const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../js/model.js'),D=require('../js/defaults.js');
const source=fs.readFileSync(path.join(__dirname,'../js/default-layout.js'),'utf8');
function bundled(){const context={window:{}};vm.runInNewContext(source,context);return JSON.parse(JSON.stringify(context.window.FEMSDefaultLayout));}
function boot(read){
  const context={window:{FEMSCatalog:{},FEMSModel:M,FEMSDefaults:D,FEMSDefaultLayout:bundled()},localStorage:{getItem:read},document:{}};
  const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  vm.runInNewContext(app.slice(0,app.indexOf('  const history='))+'window.result={initial,autosaveAllowed,startupMessage};})();',context);
  return JSON.parse(JSON.stringify(context.window.result));
}
test('현재 공유 도면은 설비 10개·연결선 5개와 편집 포인트를 포함하고 v1 저장 검증을 통과한다',()=>{
  const state=bundled();assert.deepEqual(M.validate(state),state);assert.equal(state.equipment.length,10);
  assert.equal(state.equipment.filter(e=>e.parentId).length,5);assert.ok(state.equipment.some(e=>e.connection?.bends?.length));
  const context={window:{}};vm.runInNewContext(D.serialize(state),context);assert.deepEqual(JSON.parse(JSON.stringify(context.window.FEMSDefaultLayout)),state);
});
test('처음 방문하면 공유 도면을 복제해 열고 편집해도 기본 원본은 변하지 않는다',()=>{
  const original=bundled(),result=boot(()=>null);assert.deepEqual(result.initial,original);assert.equal(result.autosaveAllowed,true);
  const seed=D.seed(original);seed.equipment[0].x+=1;assert.notEqual(seed.equipment[0].x,original.equipment[0].x);
});
test('기존 저장 도면과 빈 도면은 공유 도면보다 우선하고 손상된 저장 데이터는 자동 덮어쓰지 않는다',()=>{
  for(const saved of [M.empty(),M.demo()])assert.deepEqual(boot(()=>JSON.stringify(saved)).initial,saved);
  for(const read of [()=>'{invalid',()=>{throw new Error('storage blocked');}]){const result=boot(read);assert.equal(result.autosaveAllowed,false);assert.ok(result.startupMessage);assert.deepEqual(result.initial,bundled());}
});
