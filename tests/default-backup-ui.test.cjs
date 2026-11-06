const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),D=require('../js/defaults.js');
const app=fs.readFileSync(require('node:path').join(__dirname,'../js/app.js'),'utf8');
const defaultKey=M.STORAGE_KEY+'-before-default-update',branchKey=M.STORAGE_KEY+'-before-shared-branches',spatialKey=M.STORAGE_KEY+'-before-spatial-v3';
function setup(entries){
  const storage=new Map(entries),elements=new Map(),downloads=[],saves=[],blobs=[];
  function $(id){if(!elements.has(id))elements.set(id,{hidden:false,options:[],value:'',addEventListener(type,fn){this[type]=fn;},replaceChildren(){this.options=[];},append(option){this.options.push(option);},showModal(){}});return elements.get(id);}
  const context={$,M,defaultBackupKey:defaultKey,branchBackupKey:branchKey,defaultSnapshot:null,spaces:null,links:null,finishPropertyEdit(){},history:{current:M.empty()},
    localStorage:{getItem:key=>storage.get(key)||null},toast(){},setTimeout:fn=>fn(),Blob,
    URL:{createObjectURL(blob){blobs.push(blob);return 'blob:test';},revokeObjectURL(){}},
    document:{createElement:tag=>tag==='option'?{}:{click(){downloads.push(this.download);}}},
    window:{FEMSDefaults:D,FEMSConnections:{routes:()=>[]},FEMSFiles:{save:async state=>saves.push(state)},FEMSAssets:{readBytes(){}}}};
  vm.runInNewContext(app.slice(app.indexOf("  $('export-default').addEventListener"),app.indexOf("  $('default-close').addEventListener")),context);
  vm.runInNewContext(app.slice(app.indexOf("  $('project-backup-save').addEventListener"),app.indexOf('  if(defaultLoaded&&!startupMessage)')),context);
  return {$,storage,downloads,saves,blobs};
}
test('한 개의 백업 UI가 존재하는 복구 시점만 표시하고 저장소를 변경하지 않는다',()=>{
  const entries=[[defaultKey,JSON.stringify(M.empty())],[branchKey,'original branch'],[spatialKey,JSON.stringify(M.demo())]],r=setup(entries);
  r.$('export-default').click();
  assert.deepEqual(r.$('project-backup-kind').options.map(o=>o.value),entries.map(([key])=>key));
  assert.equal(r.$('project-backups').hidden,false);assert.deepEqual([...r.storage],entries);
  const empty=setup([]);empty.$('export-default').click();assert.equal(empty.$('project-backups').hidden,true);
});
test('통합 백업 버튼은 선택한 도면만 저장하고 공유 분기 백업 원문을 보존한다',async()=>{
  const first=M.empty(),second=M.demo(),raw='{"legacy":"원문 보존"}',entries=[[defaultKey,JSON.stringify(first)],[branchKey,raw],[spatialKey,JSON.stringify(second)]],r=setup(entries);
  for(const key of [defaultKey,spatialKey,branchKey]){r.$('project-backup-kind').value=key;await r.$('project-backup-save').click();}
  assert.deepEqual(r.saves,[M.validate(first),M.validate(second)]);
  assert.deepEqual(r.downloads,['공유분기-변환전-백업.fems']);assert.equal(await r.blobs[0].text(),raw);
  assert.deepEqual([...r.storage],entries);
});
