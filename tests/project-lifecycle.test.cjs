const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),P=require('../js/project-file.js'),C=require('../js/catalog.js'),F=require('../js/files.js');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/app.js'),'utf8');
function fixture(){
  const nodes=new Map(),storage=new Map(),history=new M.History(P.attach(M.demo(),[],'new','a'.repeat(64)));
  const ctx={M,P,C,crypto,history,defaultRevision:'a'.repeat(64),defaultBackupKey:'backup',bundled:P.attach(M.empty(),[],'new','a'.repeat(64)),needsDefaultUpdate:true,autosaveAllowed:true,
    window:{FEMSFiles:F,FEMSAssets:{readBytes:async()=>{},importBlobs:async()=>{}},showSaveFilePicker:async()=>({createWritable:async()=>({write:async()=>{},close:async()=>{}})})},
    localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
    $:id=>{if(!nodes.has(id))nodes.set(id,{handlers:{},value:'',addEventListener(type,fn){this.handlers[type]=fn;},close(){this.open=false;},showModal(){this.open=true;},click(){}});return nodes.get(id);},
    finishPropertyEdit(){},links:null,saveLocal(){ctx.saves=(ctx.saves||0)+1;},render(){ctx.replaceVisible=history.current.project.kind==='new';},toast(message){ctx.message=message;},
    switchProject(next){history.commit(next);ctx.render();return true;}};
  return {ctx,history,nodes,storage,run:start=>vm.runInNewContext(start,ctx),call:(id,type='click')=>nodes.get(id).handlers[type]()};
}
test('저장 취소·쓰기 실패는 새 도면 상태를 유지하고 성공한 뒤에만 기본 도면 교체를 숨긴다',async()=>{
  const f=fixture();f.run(source.slice(source.indexOf('  let fileBusy=false;'),source.indexOf("  document.addEventListener('keydown'")));
  const initial=M.clone(f.history.current);
  f.ctx.window.showSaveFilePicker=async()=>{const e=Error('cancel');e.name='AbortError';throw e;};await f.call('save');assert.deepEqual(f.history.current,initial);
  f.ctx.window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async()=>{throw Error('disk full');},abort:async()=>{}})});await f.call('save');assert.deepEqual(f.history.current,initial);
  f.history.commit({...M.clone(initial),name:'변경 이름'});
  f.ctx.window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async()=>{},close:async()=>{}})});await f.call('save');
  assert.equal(f.ctx.replaceVisible,false);assert.equal(f.history.current.project.kind,'file');f.history.undo();assert.equal(f.history.current.project.kind,'file');
});
test('모델 보관 실패는 기존 도면을 유지하고 파일 열기 성공 후에만 파일 프로젝트로 전환한다',async()=>{
  const f=fixture();f.run(source.slice(source.indexOf('  let fileBusy=false;'),source.indexOf("  document.addEventListener('keydown'")));
  const packet=await P.encode(P.attach(M.empty(),[]));const file={name:'project.fems',size:packet.bytes.length,arrayBuffer:async()=>packet.bytes};
  const before=M.clone(f.history.current);f.nodes.get('file').files=[file];f.ctx.window.FEMSAssets.importBlobs=async()=>{throw Error('quota');};await f.call('file','change');assert.deepEqual(f.history.current,before);
  f.ctx.window.FEMSAssets.importBlobs=async()=>{};await f.call('file','change');assert.equal(f.history.current.equipment.length,0);assert.equal(f.ctx.replaceVisible,false);f.history.undo();assert.deepEqual(f.history.current,before);
});
test('기본 도면 갱신은 기존 작업 유지·백업 실패·백업 후 전환·실행 취소를 구분한다',()=>{
  const f=fixture();f.run(source.slice(source.indexOf("  $('default-update-dialog').addEventListener"),source.lastIndexOf('})();')));
  assert.equal(f.nodes.get('default-update-dialog').open,true);const before=M.clone(f.history.current);
  f.ctx.localStorage.setItem=()=>{throw Error('quota');};f.call('default-update-load');assert.deepEqual(f.history.current,before);assert.equal(f.nodes.get('default-update-dialog').open,true);
  f.ctx.localStorage.setItem=(key,value)=>f.storage.set(key,value);f.call('default-update-load');assert.deepEqual(JSON.parse(f.storage.get('backup')),before);assert.equal(f.history.current.equipment.length,0);f.history.undo();assert.deepEqual(f.history.current,before);
  f.call('default-update-keep');assert.equal(f.history.current.project.baseRevision,f.ctx.defaultRevision);assert.equal(f.nodes.get('default-update-dialog').open,false);
});
