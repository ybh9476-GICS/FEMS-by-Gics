const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),S=require('../js/spatial.js'),L=require('../js/connections.js'),P=require('../js/project-file.js'),F=require('../js/asset-format.js'),C=require('../js/catalog.js');
const context={window:{FEMSModel:M,FEMSSpatial:S,FEMSConnections:L}};vm.runInNewContext(fs.readFileSync('js/power-picker.js','utf8'),context);const Picker=context.window.FEMSPowerPicker;
function fixture(){
  const asset=F.metadata({type:'asset-power-building',kind:'building',name:'건물',width:20,depth:16,height:12});C.register([asset]);
  let state=P.attach(S.upgrade(L.enableShared(M.empty())),[asset]);
  state.buildings=['A','B'].map((id,i)=>({id,name:id+'동',type:asset.type,x:i*20,z:0,rotation:i*90,width:20,depth:16,height:12}));
  state.floors=['A','B'].map(id=>({id:id+'-floor',buildingId:id,name:'2F',level:'2F',x:0,z:0,elevation:4,rotation:0,width:20,depth:16,height:1}));
  const add=(id,floorId,x,parentId)=>state.equipment.push({...M.create('panel',state,x,1),id,name:id,...(floorId?{floorId}:{}),...(parentId?{parentId}:{}),code:id==='target'?'P-01':''});
  add('source','A-floor',1);add('child','A-floor',3,'source');add('target','B-floor',2);add('outdoor',null,-3);add('unrelated',null,-5,'outdoor');
  return M.validate(L.enableShared(state));
}
test('대지·건물·층 경로를 표시하고 이름·코드 검색에서도 상위 계층을 유지한다',()=>{
  const state=fixture(),before=M.clone(state),nodes=Picker.nodes(state,['source']);
  assert.equal(nodes.find(n=>n.id==='target').path,'대지 > B동 > 2F > target');
  assert.equal(nodes.find(n=>n.id==='outdoor').path,'대지 > outdoor');
  for(const query of ['target','p-01','B동'])assert.deepEqual(Array.from(Picker.nodes(state,['source'],query),n=>n.id),['@site','B','B-floor','target']);
  assert.equal(Picker.nodes(state,['source'],'없는설비').length,0);assert.deepEqual(state,before);
});
test('자신·하위 설비·공간 노드는 연결 대상으로 사용할 수 없다',()=>{
  const state=fixture(),before=M.clone(state),nodes=Picker.nodes(state,['source']);
  assert.equal(nodes.find(n=>n.id==='source').blocked,true);assert.equal(nodes.find(n=>n.id==='child').blocked,true);
  for(const target of ['source','child','@site','B','B-floor','missing'])assert.throws(()=>Picker.change(state,['source'],target));
  assert.throws(()=>Picker.change(state,['source','target'],'child'));assert.deepEqual(state,before);
});
test('다른 건물·대지 연결과 해제는 공간·치수·배치를 유지하며 undo/redo와 fems에 보존된다',async()=>{
  const state=fixture(),before=M.clone(state),h=new M.History(state);
  h.commit(Picker.change(h.current,['source'],'target'));const changed=h.current;
  assert.equal(Picker.current(changed,['source']),'대지 > B동 > 2F > target');
  for(const item of changed.equipment){const old=before.equipment.find(e=>e.id===item.id);for(const key of ['x','z','floorId','rotation','width','depth','height'])assert.equal(item[key],old[key]);}
  for(const parentId of ['source','outdoor'])assert.deepEqual(changed.networks.find(n=>n.parentId===parentId),before.networks.find(n=>n.parentId===parentId));
  const saved=await P.encode(changed,async()=>require('./helpers/glb.cjs').glb()),opened=await P.decode(saved.bytes);assert.deepEqual(opened.drawing.equipment,changed.equipment);assert.deepEqual(opened.drawing.networks,changed.networks);
  h.undo();assert.deepEqual(h.current,before);h.redo();assert.deepEqual(h.current,changed);
  h.commit(Picker.change(h.current,['source'],'outdoor'));assert.equal(Picker.links(h.current,['source']).length,2);
  h.commit(Picker.change(h.current,['source'],'outdoor','up',false));assert.equal(Picker.current(h.current,['source']),'대지 > B동 > 2F > target');assert.equal(h.current.equipment.find(e=>e.id==='child').parentId,'source');
  h.undo();assert.equal(Picker.links(h.current,['source']).length,2);assert.equal(h.current.equipment.find(e=>e.id==='source').parentId,undefined);
});
test('다중 연결은 선택된 하위 관계를 유지하고 실패 시 팝업과 원본을 보존한다',()=>{
  const state=fixture(),changed=Picker.change(state,['source','child'],'target');assert.equal(changed.equipment.find(e=>e.id==='child').parentId,'source');
  assert.equal(Picker.links(changed,['source','child']).length,3);
  const picker=Object.create(Picker.prototype);let commits=0,closed=0;
  picker.api={state:()=>state,commit:()=>{commits++;return false;},toast(){}};picker.dialog={open:true,close(){closed++;}};picker.error={textContent:''};picker.update=()=>{};picker.draft={ids:['source'],target:'target'};
  picker.apply('target',['source']);assert.equal(commits,1);assert.equal(closed,0);assert.ok(picker.error.textContent);assert.ok(picker.draft);
  picker.apply('child',['source']);assert.equal(commits,1);assert.equal(closed,0);picker.close();assert.equal(closed,1);assert.equal(picker.draft,null);
});
