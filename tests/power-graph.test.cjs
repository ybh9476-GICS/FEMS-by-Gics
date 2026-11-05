const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),L=require('../js/connections.js'),S=require('../js/spatial.js'),P=require('../js/project-file.js'),D=require('../js/defaults.js');
const ctx={window:{FEMSModel:M,FEMSSpatial:S,FEMSConnections:L}};vm.runInNewContext(fs.readFileSync('js/power-picker.js','utf8'),ctx);const Picker=ctx.window.FEMSPowerPicker;
function fixture(){
 const state=S.upgrade(L.enableShared(M.empty()));
 for(const [id,type,x,z,parentId] of [['transformer','transformer',-10,0],['panel','panel',5,0,'transformer'],['pump','panel',10,5,'panel'],['ess','ess',-10,10]])state.equipment.push({...M.create(type,state,x,z),id,name:id,...(parentId?{parentId}:{})});
 let legacy=M.validate(L.enableShared(state));const route=L.routes(legacy).find(l=>l.parentId==='transformer');legacy=L.setStyle(legacy,route.id,{diameter:.4});legacy=L.setSegmentColor(legacy,route.id,0,'#eab308');return M.validate(legacy);
}
test('v4 이전은 기존 계층·위치·수동 연결 경로·색상을 그대로 보존하고 반복 실행해도 동일하다',()=>{
 const before=fixture(),snapshot=M.clone(before),next=M.validate(L.upgradePower(before));
 assert.equal(next.version,4);assert.deepEqual(next.equipment,before.equipment);assert.deepEqual(next.networks,before.networks);assert.deepEqual(next.powerLinks,[{from:'transformer',to:'panel'},{from:'panel',to:'pump'}]);assert.deepEqual(before,snapshot);assert.deepEqual(L.upgradePower(next),next);
 assert.equal(S.upgrade(next).version,4);
});
test('ESS 하위에 기존 변압기 하위 배전반을 추가하고 개별 해제하며 계층은 유지한다',()=>{
 const before=M.validate(L.upgradePower(fixture())),history=new M.History(before);
 history.commit(Picker.change(before,['ess'],'panel','down'));const added=M.clone(history.current);
 assert.deepEqual(added.equipment,before.equipment);assert.equal(Picker.links(added,['panel'],'up').length,2);assert.equal(Picker.links(added,['ess'],'down')[0].to,'panel');assert.deepEqual(added.networks.find(n=>n.parentId==='transformer'),before.networks.find(n=>n.parentId==='transformer'));
 assert.equal(Picker.nodes(added,['ess'],'','down').find(n=>n.id==='panel').reason,'이미 연결됨');
 history.commit(Picker.change(added,['ess'],'panel','down',false));assert.deepEqual(history.current.powerLinks,before.powerLinks);assert.deepEqual(history.current.networks,before.networks);assert.deepEqual(history.current.equipment,before.equipment);
 history.undo();assert.deepEqual(history.current,added);history.redo();assert.deepEqual(history.current.powerLinks,before.powerLinks);
});
test('상위 추가도 같은 방향으로 저장하고 순환·자기 연결·손상 데이터는 거부한다',()=>{
 const original=fixture(),next=Picker.change(original,['panel'],'ess','up');
 assert.ok(next.powerLinks.some(l=>l.from==='ess'&&l.to==='panel'));
 assert.throws(()=>Picker.change(next,['pump'],'ess','down'),/순환/);assert.throws(()=>Picker.change(next,['ess'],'ess','down'));
 for(const links of [[{from:'missing',to:'panel'}],[{from:'ess',to:'panel'},{from:'ess',to:'panel'}],[{from:'panel',to:'ess'},{from:'ess',to:'panel'}]])assert.throws(()=>M.validate({...next,powerLinks:links}));
 assert.deepEqual(Picker.change(next,['panel'],'ess','up').powerLinks,next.powerLinks);
});
test('계층 이동은 전력 연결을 바꾸지 않고 삭제는 해당 설비 연결만 제거한다',()=>{
 const state=Picker.change(fixture(),['ess'],'panel','down'),moved=M.moveEquipment(state,'panel','ess');assert.equal(moved.equipment.find(e=>e.id==='panel').parentId,'ess');assert.deepEqual(moved.powerLinks,state.powerLinks);assert.deepEqual(moved.networks,state.networks);
 const removed=M.removeEquipment(state,'panel');assert.ok(removed.equipment.some(e=>e.id==='pump'));assert.equal(removed.powerLinks.length,0);assert.equal(removed.networks.length,0);
 const onlyEss=M.removeEquipmentGroup(state,['ess']);assert.deepEqual(onlyEss.powerLinks,L.powerLinks(fixture()));
});
test('추가 회로의 선 편집과 색상 변경은 기존 변압기 회로를 유지하며 fems·기본값에도 보존된다',async()=>{
 let state=Picker.change(fixture(),['ess'],'panel','down'),original=structuredClone(state.networks.find(n=>n.parentId==='transformer'));
 const route=L.routes(state).find(l=>l.parentId==='ess');state=L.setSegmentColor(state,route.id,0,'#dc2626');state=L.setStyle(state,route.id,{diameter:.5});
 const added=L.addPoint(state,route.id,0,{x:route.points[0].x,z:5});state=M.validate(added.state);assert.deepEqual(state.networks.find(n=>n.parentId==='transformer'),original);
 assert.ok(L.editScope(state,route.id).ids.every(id=>L.route(state,id).parentId==='ess'));
 const encoded=await P.encode(state),decoded=await P.decode(encoded.bytes);assert.deepEqual(decoded.drawing.powerLinks,state.powerLinks);assert.deepEqual(decoded.drawing.networks,state.networks);assert.deepEqual(decoded.drawing.equipment,state.equipment);
 const prepared=await P.prepareDefault(state);const env={window:{}};vm.runInNewContext(D.serialize(prepared),env);assert.deepEqual(M.validate(JSON.parse(JSON.stringify(env.window.FEMSDefaultLayout))),prepared);
});
test('v4 시작 변환은 먼저 백업하고 저장 실패·재시작 시 원문 백업을 보존한다',()=>{
 const source=fs.readFileSync('js/app.js','utf8'),code=source.slice(source.indexOf('  if(autosaveAllowed&&history.current.version<4)'),source.indexOf('  let propertyEdit'));
 const original=fixture(),raw=JSON.stringify(original),key=M.STORAGE_KEY+'-before-power-v4';
 for(const failAt of [null,key,M.STORAGE_KEY]){
  const storage=new Map([[M.STORAGE_KEY,raw]]),writes=[],context={M,window:{FEMSConnections:L},history:{current:original},autosaveAllowed:true,startupMessage:'',localStorage:{getItem:k=>storage.get(k),setItem(k,v){writes.push(k);if(k===failAt)throw Error('quota');storage.set(k,v);}}};
  vm.runInNewContext(code,context);
  if(failAt){assert.deepEqual(context.history.current,original);assert.equal(storage.get(M.STORAGE_KEY),raw);assert.equal(context.autosaveAllowed,false);}else{assert.deepEqual(writes,[key,M.STORAGE_KEY]);assert.equal(storage.get(key),raw);assert.equal(context.history.current.version,4);writes.length=0;vm.runInNewContext(code,context);assert.deepEqual(writes,[]);}
 }
});
