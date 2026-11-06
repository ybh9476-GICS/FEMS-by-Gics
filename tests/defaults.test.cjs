const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../js/model.js'),D=require('../js/defaults.js'),P=require('../js/project-file.js');
const source=fs.readFileSync(path.join(__dirname,'../js/default-layout.js'),'utf8');
const revision='a'.repeat(64),key=M.STORAGE_KEY,applied=key+'-applied-default',backup=key+'-before-default-update';
function bundled(){const context={window:{}};vm.runInNewContext(source,context);return JSON.parse(JSON.stringify(context.window.FEMSDefaultLayout));}
function boot(storage=new Map(),failWrite=()=>false,failRead=false){
  const context={window:{FEMSCatalog:require('../js/catalog.js'),FEMSProjectFile:P,FEMSDefaultAssets:[],FEMSDefaultRevision:revision,FEMSModel:M,FEMSDefaults:D,FEMSDefaultLayout:bundled()},
    localStorage:{getItem:k=>{if(failRead)throw Error('blocked');return storage.get(k)||null;},setItem(k,v){if(failWrite(k))throw Error('quota');storage.set(k,v);}},document:{}};
  const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  vm.runInNewContext(app.slice(0,app.indexOf('  const branchBackupKey='))+'window.result={initial,autosaveAllowed,startupMessage,history};})();',context);
  return context.window.result;
}
const plain=value=>JSON.parse(JSON.stringify(value));
test('기본 프로젝트 저장 오류는 HTTP 원인과 서버 진단을 구분한다',()=>{
  assert.match(D.saveError(400,'Invalid FEMS drawing.'),/로컬 서버를 다시 시작/);
  assert.match(D.saveError(400,'저장 오류: 추가 에셋 파일을 찾을 수 없습니다.'),/추가 에셋 파일을 찾을 수 없습니다/);
  assert.match(D.saveError(413),/2 MB/);
  assert.match(D.saveError(500,'저장 오류: 저장 공간이 부족합니다.'),/저장 공간이 부족합니다/);
  assert.match(D.saveError(409),/다른 저장/);
  assert.match(D.saveError(404),/HTTP 404/);
  assert.doesNotMatch(D.saveError(500,'<html>error</html>'),/<html>/);
});
function expected(){const result=bundled();result.project.baseRevision=revision;result.project.kind='new';return result;}
function saved(kind='new'){return P.attach({...M.empty(),name:'기존 작업'},[],kind,'b'.repeat(64));}

test('교체 가능한 기본 도면은 저장 검증과 직렬화 왕복에서 모든 설비·경로를 보존한다',()=>{
  const state=bundled();assert.deepEqual(M.validate(state),state);
  const context={window:{}};vm.runInNewContext(D.serialize(state),context);assert.deepEqual(plain(context.window.FEMSDefaultLayout),state);
});
test('첫 방문은 배포 기본값과 에셋을 불러오며 원본은 수정하지 않는다',()=>{
  const original=bundled(),storage=new Map(),r=boot(storage);assert.deepEqual(plain(r.initial),expected());assert.equal(r.autosaveAllowed,true);assert.equal(storage.get(applied),revision);
  r.initial.site.width+=1;assert.deepEqual(bundled(),original);assert.equal(r.history.past.length,0);
});
test('새 기본값은 이전 빈 작업과 기존 작업 유지 기록보다 우선하고 백업·실행 취소를 제공한다',()=>{
  for(const oldRevision of ['b'.repeat(64),revision]){
    const old=saved();old.project.baseRevision=oldRevision;const raw=JSON.stringify(old),storage=new Map([[key,raw],[backup,'older backup']]);
    const r=boot(storage);assert.deepEqual(plain(r.initial),expected());assert.equal(storage.get(backup),raw);assert.ok([...storage].some(([k,v])=>k.startsWith(backup+'-')&&v==='older backup'));
    assert.deepEqual(JSON.parse(storage.get(key)),expected());assert.equal(storage.get(applied),revision);
    r.history.undo();assert.deepEqual(plain(r.history.current),old);r.history.redo();assert.deepEqual(plain(r.history.current),expected());
  }
});
test('같은 기본값에서는 편집 작업과 새 빈 프로젝트를 유지하고 파일 프로젝트는 갱신하지 않는다',()=>{
  for(const state of [saved(),P.attach(M.demo(),[],'new'),saved('file')]){
    const raw=JSON.stringify(state),storage=new Map([[key,raw],[applied,revision]]),r=boot(storage);
    assert.deepEqual(plain(r.initial),state);assert.equal(storage.get(key),raw);assert.equal(storage.has(backup),false);
  }
  const state=saved('file'),storage=new Map([[key,JSON.stringify(state)]]);assert.deepEqual(plain(boot(storage).initial),state);assert.equal(storage.has(applied),false);
});
test('기본값이 다시 변경되면 최신값을 적용하고 이전 백업도 보존한다',()=>{
  const state=saved(),raw=JSON.stringify(state),storage=new Map([[key,raw],[applied,'c'.repeat(64)],[backup,'older']]);
  assert.deepEqual(plain(boot(storage).initial),expected());assert.equal(storage.get(backup),raw);assert.ok([...storage.values()].includes('older'));
});
test('백업·자동 저장 쓰기 실패는 이전 작업을 보존하고 적용 완료 기록을 남기지 않는다',()=>{
  for(const failKey of [backup,key]){
    const state=saved(),raw=JSON.stringify(state),storage=new Map([[key,raw]]),r=boot(storage,k=>k===failKey);
    assert.deepEqual(plain(r.initial),state);assert.equal(storage.get(key),raw);assert.equal(storage.has(applied),false);assert.equal(r.autosaveAllowed,false);assert.ok(r.startupMessage);
  }
});
test('적용 기록 쓰기가 실패해도 이전 작업 백업과 불러온 기본값을 보존한다',()=>{
  const raw=JSON.stringify(saved()),storage=new Map([[key,raw]]),r=boot(storage,k=>k===applied);
  assert.equal(storage.get(backup),raw);assert.deepEqual(plain(r.initial),expected());assert.deepEqual(JSON.parse(storage.get(key)),expected());assert.equal(r.autosaveAllowed,false);
});
test('손상된 자동 저장 또는 읽기 실패는 자동으로 덮어쓰지 않는다',()=>{
  for(const failRead of [false,true]){const storage=new Map([[key,'{invalid']]),r=boot(storage,()=>false,failRead);assert.equal(r.autosaveAllowed,false);assert.ok(r.startupMessage);assert.equal(storage.get(key),'{invalid');assert.equal(storage.has(applied),false);}
});
