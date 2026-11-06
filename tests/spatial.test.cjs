const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/model.js'),S=require('../js/spatial.js'),L=require('../js/connections.js'),P=require('../js/project-file.js'),F=require('../js/asset-format.js'),C=require('../js/catalog.js'),D=require('../js/defaults.js');
const {glb}=require('./helpers/glb.cjs');
const building=F.metadata({type:'asset-building-test',kind:'building',name:'생산동',width:40,depth:30,height:12});
const floorAsset=F.metadata({type:'asset-floor-test',kind:'floor',name:'생산층',width:30,depth:20,height:.2});
function fixture(){
  C.register([building,floorAsset]);const s=P.attach(S.upgrade(L.enableShared(M.empty())),[building,floorAsset]);s.site={width:100,depth:100};
  s.buildings.push({...S.create(s,building),id:'building-1'});
  s.floors.push({...S.create(s,floorAsset,30,20),id:'floor-1'});
  return M.validate(s);
}
test('기존 도면의 전력 구조·경로를 변경하지 않고 v3 공간 구조로 전환한다',()=>{
  const before=L.enableShared(M.demo()),next=M.validate(S.upgrade(before));
  assert.equal(next.version,3);assert.deepEqual(next.equipment,before.equipment);assert.deepEqual(next.networks,before.networks);assert.deepEqual(next.buildings,[]);assert.deepEqual(next.floors,[]);assert.equal(before.version,2);
  assert.deepEqual(L.enableShared(next),next);
});

test('옥상 바닥 높이로 지상·지하층을 계산하고 저장·취소·옥상 설비의 월드 배치를 보존한다',async()=>{
  let state=fixture();state.buildings[0].height=20;
  const entries=S.slots(5,2,true,20,12).map(s=>({...s,size:{width:20,depth:16,height:.5}}));
  state=M.validate(S.registerFloors(state,'building-1',entries));
  const roof=state.floors.find(f=>f.level==='R');assert.equal(roof.elevation+S.floorSurface(roof),12);
  assert.deepEqual(state.floors.filter(f=>f.buildingId&&f.level!=='R').map(f=>f.elevation),[9,6,3,0,-3,-6]);
  const pv={...M.create('solar',state,2,3),floorId:roof.id};state.equipment.push(pv);
  const history=new M.History(state),old=M.clone(state);
  const revised=S.slots(5,2,true,20,10).map(s=>({...s,size:{width:20,depth:16,height:.5}}));history.commit(S.registerFloors(state,'building-1',revised));
  assert.equal(history.current.equipment[0].floorId,roof.id);history.undo();assert.deepEqual(history.current,old);history.redo();assert.equal(history.current.buildings[0].roofElevation,10);
  const encoded=await P.encode(state,async()=>glb()),decoded=await P.decode(encoded.bytes);assert.deepEqual(decoded.drawing.buildings,state.buildings);assert.deepEqual(decoded.drawing.floors,state.floors);
  for(const rotation of [0,37,90]){
    const changed=M.clone(state);Object.assign(changed.buildings[0],{rotation,x:7,z:-5});const view=S.view(changed),shown=view.equipment.find(e=>e.id===pv.id),expected=S.transform(pv,S.worldFrame(changed,roof.id));
    assert.equal(shown.x,expected.x);assert.equal(shown.z,expected.z);assert.equal(shown.y,12);assert.ok(shown.rooftop);assert.ok(shown.noGizmo);assert.ok(!view.equipment.some(e=>e.id===roof.id));
    assert.equal(S.view(changed,{buildingId:'building-1'}).equipment.filter(e=>e.id===pv.id).length,1);
    const inside=S.view(changed,{floorId:roof.id});assert.ok(inside.equipment.some(e=>e.id===roof.id));assert.equal(inside.equipment.find(e=>e.id===pv.id).y,S.floorSurface(roof));
  }
  assert.deepEqual(state,old);
  const resized=M.clone(state);resized.floors.find(f=>f.id===roof.id).height=.8;
  const normalized=M.validate(resized),updatedRoof=normalized.floors.find(f=>f.id===roof.id);assert.equal(updatedRoof.elevation+S.floorSurface(updatedRoof),12);
  const tooTall=M.clone(state);tooTall.floors.find(f=>f.level==='3F').height=10;assert.throws(()=>M.validate(tooTall),/겹치/);
  assert.throws(()=>S.registerFloors(state,'building-1',S.slots(5,0,true,20,1).map(s=>({...s,size:{width:20,depth:16,height:.5}}))),/겹치/);
  assert.throws(()=>S.slots(5,0,true,20,21),/옥상 바닥/);
});

test('층 중앙 배치는 설비 간격·회전·크기와 함께 내부 연결 경로를 이동하고 같은 층 재드롭은 유지한다',()=>{
  let state=fixture();const a=M.create('panel',state,10,5),b=M.create('panel',state,14,9);state.equipment.push(a,b);state=M.reparent(state,b.id,a.id);
  const ids=[a.id,b.id],before=M.clone(state),base=S.moveEquipment(state,ids,'floor-1'),next=M.validate(S.moveEquipment(state,ids,'floor-1',true));
  assert.equal(next.equipment[0].x,-2);assert.equal(next.equipment[0].z,-2);assert.equal(next.equipment[1].x,2);assert.equal(next.equipment[1].z,2);
  const dx=next.equipment[0].x-base.equipment[0].x,dz=next.equipment[0].z-base.equipment[0].z;
  for(let i=0;i<next.equipment.length;i++)for(const key of ['width','depth','height','rotation','parentId'])assert.equal(next.equipment[i][key],base.equipment[i][key]);
  for(let i=0;i<next.networks.length;i++){
    for(let j=0;j<next.networks[i].nodes.length;j++){const n=next.networks[i].nodes[j],old=base.networks[i].nodes[j];if(!n.equipmentId){assert.equal(n.x,old.x+dx);assert.equal(n.z,old.z+dz);}}
    for(let j=0;j<next.networks[i].edges.length;j++)assert.deepEqual(next.networks[i].edges[j].bends,base.networks[i].edges[j].bends.map(p=>({x:p.x+dx,z:p.z+dz})));
  }
  assert.deepEqual(S.moveEquipment(next,ids,'floor-1',true),next);assert.deepEqual(state,before);
});
test('건물·층 에셋은 큰 실제 치수와 얇은 층을 저장하고 설비 한도는 유지한다',()=>{
  assert.equal(F.metadata({...building,width:500,height:250}).width,500);assert.equal(F.metadata({...floorAsset,height:.01}).height,.01);
  assert.throws(()=>F.metadata({...building,kind:'equipment',width:500}));assert.throws(()=>F.metadata({...building,kind:'other'}));
});
test('건물 높이로 층간 간격을 계산하고 옥상은 지상층 수에 포함한다',()=>{
  assert.deepEqual(S.slots(4,2,false,12).map(s=>[s.level,s.elevation]),[['4F',9],['3F',6],['2F',3],['1F',0],['B1',-3],['B2',-6]]);
  assert.deepEqual(S.slots(4,2,true,12).map(s=>[s.level,s.elevation]),[['R',12],['3F',8],['2F',4],['1F',0],['B1',-4],['B2',-8]]);
  assert.equal(S.slots(1,0,false,12)[0].elevation,0);
  for(const args of [[1.2,0,false,4],[1,0,false,0],[0,0,false,4],[1,0,true,4],[101,0,false,4]])assert.throws(()=>S.slots(...args));
});
test('층 등록은 원본을 건드리지 않고 중심 정렬하며 한 번의 undo로 복구된다',()=>{
  const s=fixture(),old=M.clone(s),h=new M.History(s),slots=S.slots(2,1,true,3.6);slots.find(s=>s.level==='1F').floorId='floor-1';
  h.commit(S.registerFloors(s,'building-1',slots));const f=h.current.floors.find(f=>f.id==='floor-1');
  assert.equal(f.buildingId,'building-1');assert.equal(f.x,0);assert.equal(f.z,0);assert.equal(f.elevation,0);assert.equal(h.current.floors.length,3);
  assert.deepEqual(s,old);h.undo();assert.deepEqual(h.current,old);h.redo();assert.equal(h.current.floors.length,3);
});
test('층을 다른 건물에 중복 등록하거나 여러 슬롯에 재사용하면 거부한다',()=>{
  const s=fixture(),slots=S.slots(2,0,false,4).map(slot=>({...slot,floorId:'floor-1'}));assert.throws(()=>S.registerFloors(s,'building-1',slots));
  s.buildings.push({...s.buildings[0],id:'building-2'});s.floors[0].buildingId='building-2';assert.throws(()=>S.registerFloors(s,'building-1',[slots[0]]));
});
test('층 수를 줄이거나 슬롯을 바꿔도 기존 층과 설비를 삭제하지 않는다',()=>{
  let s=fixture();s=S.registerFloors(s,'building-1',S.slots(2,0,false,4));const second=s.floors.find(f=>f.level==='2F');
  const e=M.create('panel',s);e.floorId=second.id;s.equipment.push(e);const next=M.validate(S.registerFloors(s,'building-1',S.slots(1,0,false,4)));
  assert.equal(next.floors.find(f=>f.id===second.id).buildingId,undefined);assert.equal(next.equipment[0].floorId,second.id);
});
test('건물 이동·회전은 층과 설비의 월드 위치를 함께 바꾸고 모델 크기는 독립적이다',()=>{
  const s=fixture();s.floors[0].buildingId='building-1';s.floors[0].x=2;s.floors[0].z=3;const before=S.worldFrame(s,'floor-1');
  s.buildings[0].x=10;s.buildings[0].z=20;s.buildings[0].rotation=90;const frame=S.worldFrame(s,'floor-1');
  assert.ok(Math.abs(frame.x-13)<1e-8);assert.ok(Math.abs(frame.z-18)<1e-8);assert.notDeepEqual(frame,before);
  const old=M.clone(s.floors);s.buildings[0].width=70;assert.deepEqual(s.floors,old);
});
test('설비 공간 이동은 월드 배치와 전력 부모를 보존하고 같은 공간 경로를 변환한다',()=>{
  let s=fixture();s.floors[0].x=10;s.floors[0].z=10;const a=M.create('panel',s,12,12),b=M.create('ups',s,15,15);s.equipment.push(a,b);s=M.reparent(s,b.id,a.id);
  const moved=M.validate(S.moveEquipment(s,[a.id,b.id],'floor-1'));assert.equal(moved.equipment[1].parentId,a.id);assert.equal(moved.equipment[0].x,2);assert.equal(moved.equipment[0].z,2);
  assert.equal(moved.equipment[0].floorId,'floor-1');assert.deepEqual(S.transform(moved.equipment[0],S.worldFrame(moved,'floor-1')),{x:12,z:12});
  const old=L.routes(s),lines=L.routes(moved);for(let i=0;i<old.length;i++){assert.equal(lines[i].points[0].x,old[i].points[0].x-10);assert.deepEqual(lines[i].segmentColors,old[i].segmentColors);}
});
test('바닥·건물·층 뷰는 별도 투영이며 전체 프로젝트를 변경하지 않는다',()=>{
  let s=fixture();s=S.registerFloors(s,'building-1',[{level:'1F',name:'1F',elevation:0,floorId:'floor-1'}]);const e=M.create('panel',s);e.floorId='floor-1';s.equipment.push(e);const snapshot=M.clone(s);
  assert.deepEqual(S.view(s).equipment.map(e=>e.id),['building-1']);assert.deepEqual(S.view(s,{buildingId:'building-1'}).equipment.map(e=>e.id),['building-1','floor-1',e.id]);
  const inside=S.view(s,{buildingId:'building-1'});assert.equal(inside.equipment[0].backdrop,true);assert.equal(inside.equipment[0].buildingShell,true);assert.equal(inside.equipment[0].x,0);assert.equal(inside.equipment[0].rotation,0);assert.equal(inside.equipment[1].floorSelector,true);assert.equal(inside.visibleEquipment.has('building-1'),false);
  const view=S.view(s,{buildingId:'building-1',floorId:'floor-1'});assert.equal(view.equipment[0].backdrop,true);assert.equal(view.equipment[1].id,e.id);assert.deepEqual(s,snapshot);
});
test('건물 선택은 대지 전체 배치를 유지하고 선택 건물의 층만 월드 좌표로 펼친다',()=>{
  const s=fixture(),b=s.buildings[0];Object.assign(b,{x:17,z:-23,rotation:37});
  s.buildings.push({...b,id:'other',x:-30});
  s.floors.push({...s.floors[0],id:'inside',buildingId:b.id,x:2,z:3,rotation:15,elevation:4});
  const outdoor=M.create('panel',s,-20,10);s.equipment.push(outdoor);
  const snapshot=M.clone(s),inside=S.view(s,{buildingId:b.id}),byId=id=>inside.equipment.find(e=>e.id===id);
  assert.deepEqual(inside.site,s.site);assert.deepEqual(byId(outdoor.id),outdoor);
  assert.deepEqual(byId('other'),s.buildings[1]);assert.equal(byId('floor-1').floorSelector,undefined);
  assert.equal(byId(b.id).buildingShell,true);assert.equal(byId(b.id).x,b.x);assert.equal(byId(b.id).rotation,b.rotation);
  const world=S.worldFrame(s,'inside');assert.equal(byId('inside').x,world.x);assert.equal(byId('inside').z,world.z);assert.equal(byId('inside').rotation,52);assert.equal(byId('inside').y,4);
  assert.equal(inside.hideConnections,false);assert.equal(inside.visibleEquipment.has(outdoor.id),true);
  assert.equal(S.view(s,{floorId:'inside'}).focusBounds,null);assert.equal(S.view(s).focusBounds,null);
  const preview=S.view(s,{buildingId:b.id,preview:true});assert.equal(preview.equipment.length,2);assert.equal(preview.equipment[0].x,0);assert.equal(preview.hideConnections,true);
  assert.deepEqual(s,snapshot);
});

test('공간 계층은 전력 부모와 분리되고 검색에 필요한 상위 구조를 보존한다',()=>{
  const s=fixture(),a=M.create('panel',s),b=M.create('ups',s,4,4);a.floorId='floor-1';b.parentId=a.id;s.equipment.push(a,b);
  const tree=S.treeState(s),tb=tree.equipment.find(e=>e.id===b.id);assert.equal(tb.parentId,'@site');assert.equal(s.equipment[1].parentId,a.id);assert.equal(tree.equipment.find(e=>e.id===a.id).parentId,'floor-1');
});
test('건물·층 삭제는 하위 데이터를 보존하고 바닥으로 이동한다',()=>{
  let s=fixture();s=S.registerFloors(s,'building-1',[{level:'1F',elevation:0,floorId:'floor-1'}]);s.buildings[0].x=10;const e=M.create('panel',s,2,3);e.floorId='floor-1';s.equipment.push(e);
  const noBuilding=M.validate(S.remove(s,'building-1'));assert.equal(noBuilding.floors.length,1);assert.equal(noBuilding.floors[0].buildingId,undefined);assert.equal(noBuilding.floors[0].x,10);
  const noFloor=M.validate(S.remove(noBuilding,'floor-1'));assert.equal(noFloor.equipment[0].floorId,undefined);assert.equal(noFloor.equipment[0].x,12);assert.equal(noFloor.equipment[0].z,3);
});
test('층 밖 설비는 모델 축소 후에도 보존하고 경고한다',()=>{
  const s=fixture(),e=M.create('panel',s,10,5);e.floorId='floor-1';s.equipment.push(e);s.floors[0].width=5;
  const valid=M.validate(s);assert.equal(valid.equipment.length,1);assert.ok(S.warnings(valid).some(s=>s.includes('층 영역 밖')));
});

test('층 명시 삭제는 소속 설비와 연결만 제거하고 남은 층을 재배치하며 한 번에 복원된다',async()=>{
  let s=fixture();s.floors=[];s=L.upgradePower(S.registerFloors(s,'building-1',S.slots(5,2,true,12,10).map(slot=>({...slot,size:{width:20,depth:16,height:.2}}))));
  const removed=s.floors.find(f=>f.level==='2F'),kept=s.floors.find(f=>f.level==='3F');kept.name='생산실';
  const a={...M.create('panel',s),floorId:removed.id};s.equipment.push(a);
  const b={...M.create('ups',s),floorId:removed.id,parentId:a.id};s.equipment.push(b);
  const c={...M.create('panel',s),floorId:kept.id};s.equipment.push(c);
  const site=M.create('tower',s);s.equipment.push(site);
  s=M.validate(s);s=L.changePowerLink(s,site.id,a.id,true);s=L.changePowerLink(s,site.id,c.id,true);
  const before=M.clone(s),history=new M.History(s);history.commit(S.removeFloor(s,removed.id));const next=history.current;
  assert.deepEqual(s,before);assert.deepEqual(next.equipment.map(e=>e.id),[c.id,site.id]);
  assert.ok(next.powerLinks.every(l=>![a.id,b.id].includes(l.from)&&![a.id,b.id].includes(l.to)));assert.ok(next.powerLinks.some(l=>l.from===site.id&&l.to===c.id));
  assert.equal(next.floors.find(f=>f.id===kept.id).name,'생산실');assert.equal(next.floors.find(f=>f.id===kept.id).level,'2F');
  assert.equal(next.floors.find(f=>f.id===kept.id).elevation,10/3);assert.equal(next.floors.find(f=>f.level==='B2').elevation,-20/3);
  assert.equal(next.buildings[0].roofElevation,10);assert.deepEqual(next.project.assets,before.project.assets);
  assert.deepEqual(next.equipment.find(e=>e.id===c.id),before.equipment.find(e=>e.id===c.id));
  const encoded=await P.encode(next,async()=>glb()),decoded=await P.decode(encoded.bytes);assert.deepEqual(decoded.drawing.floors,next.floors);
  history.undo();assert.deepEqual(history.current,before);history.redo();assert.deepEqual(history.current,next);
});

test('옥상·지하층·마지막 층 삭제와 독립 층 삭제는 층 슬롯과 에셋을 일관되게 유지한다',()=>{
  let s=fixture();s.floors=[];s=M.validate(S.registerFloors(s,'building-1',S.slots(4,2,true,12,10).map(slot=>({...slot,size:{width:20,depth:16,height:.2}}))));
  let next=S.removeFloor(s,s.floors.find(f=>f.level==='R').id);
  assert.equal(next.buildings[0].roofElevation,undefined);assert.deepEqual(next.floors.filter(f=>!f.level.startsWith('B')).map(f=>f.elevation),[8,4,0]);
  next=S.removeFloor(next,next.floors.find(f=>f.level==='B1').id);assert.equal(next.floors.find(f=>f.level==='B1').elevation,-4);assert.ok(!next.floors.some(f=>f.level==='B2'));
  for(const f of [...next.floors])next=S.removeFloor(next,f.id);assert.equal(next.floors.length,0);assert.equal(next.buildings.length,1);
  const pair=M.validate(S.registerFloors(next,'building-1',S.slots(2,0,true,12,10).map(slot=>({...slot,size:{width:20,depth:16,height:.2}}))));
  const last=S.removeFloor(pair,pair.floors.find(f=>f.level==='1F').id);assert.equal(last.floors[0].level,'1F');assert.equal(last.floors[0].elevation,0);assert.equal(last.buildings[0].roofElevation,undefined);
  const free=fixture(),e={...M.create('panel',free),floorId:'floor-1'};free.equipment.push(e);
  const empty=S.removeFloor(free,'floor-1');assert.equal(empty.equipment.length,0);assert.equal(empty.floors.length,0);assert.deepEqual(empty.project.assets,free.project.assets);
});
test('손상된 공간 참조·ID·층 번호·치수는 거부한다',()=>{
  const s=fixture();for(const mutate of [s=>s.floors[0].buildingId='missing',s=>s.floors[0].id=s.buildings[0].id,s=>s.buildings[0].height=NaN,s=>s.floors[0].elevation=Infinity,s=>s.equipment.push({...M.create('panel',s),floorId:'missing'})]){const bad=M.clone(s);mutate(bad);assert.throws(()=>M.validate(bad));}
});
test('.fems는 건물·층·설비와 미배치 에셋을 모두 저장하며 중복 GLB는 한 번만 저장한다',async()=>{
  const s=fixture(),bytes=glb();s.floors[0].buildingId='building-1';const result=await P.encode(s,async()=>bytes),decoded=await P.decode(result.bytes);
  assert.equal(result.assetCount,2);assert.equal(result.uniqueModels,1);assert.deepEqual(decoded.drawing.buildings,s.buildings);assert.deepEqual(decoded.drawing.floors,s.floors);assert.equal(decoded.drawing.project.assets[0].kind,'building');assert.equal(decoded.drawing.project.assets[1].kind,'floor');assert.equal(decoded.blobs.size,1);
});
test('기본 프로젝트 교체는 건물·층 모델의 로컬 참조를 함께 갱신한다',async()=>{
  const s=fixture(),bytes=glb(),hash=await P.hash(bytes);const ready=await P.prepareDefault(s,async()=>bytes,async entry=>({...entry,type:entry.type+'-local',sha256:hash}));
  assert.equal(ready.buildings[0].type,building.type+'-local');assert.equal(ready.floors[0].type,floorAsset.type+'-local');assert.equal(s.buildings[0].type,building.type);assert.ok(D.serialize(ready).includes('"buildings"'));
});
test('층 에셋 누락은 .fems와 기본값 저장을 거부하고 원본은 유지한다',async()=>{
  const s=fixture();s.project.assets=s.project.assets.filter(a=>a.type!==floorAsset.type);await assert.rejects(P.encode(s,async()=>glb()),/원본/);await assert.rejects(P.prepareDefault(s,async()=>glb(),async entry=>entry),/원본/);assert.equal(s.floors.length,1);
});

test('바닥 축소는 실내 연결선에 영향을 주지 않고 층 기준으로 경로를 편집한다',()=>{
  let s=fixture();s.floors[0].width=100;s.floors[0].depth=100;
  const a={...M.create('panel',s,20,10),floorId:'floor-1'},b={...M.create('ups',s,30,20),floorId:'floor-1'};s.equipment.push(a,b);s=M.reparent(s,b.id,a.id);
  s=M.resizeSite(s,10,10);const line=L.routes(s)[0];
  const edited=L.addPoint(s,line.id,0);assert.ok(L.route(edited.state||edited,line.id));assert.deepEqual(s.site,{width:10,depth:10});
});

test('기본 바닥으로 교체해도 기존 층 ID·설비·연결선을 유지하고 중복 층을 만들지 않는다',()=>{
  let s=fixture();s=S.registerFloors(s,'building-1',[{level:'1F',name:'1F',elevation:0,floorId:'floor-1'}]);
  const e={...M.create('panel',s),floorId:'floor-1'},child={...M.create('ups',s,3,4),floorId:'floor-1',parentId:e.id};s.equipment.push(e,child);s=L.enableShared(s);
  const before=M.clone(s),history=new M.History(s);
  const next=M.validate(S.registerFloors(s,'building-1',[{level:'1F',name:'1F',elevation:0,floorId:null}]));
  assert.equal(next.floors.length,s.floors.length);assert.equal(next.floors[0].id,'floor-1');assert.equal(next.floors[0].buildingId,'building-1');assert.equal(next.floors[0].type,undefined);
  assert.equal(next.floors[0].width,s.buildings[0].width);assert.deepEqual(next.equipment,s.equipment);assert.deepEqual(next.networks,s.networks);assert.deepEqual(s,before);
  history.commit(next);history.undo();assert.deepEqual(history.current,before);history.redo();assert.deepEqual(history.current,next);
});

test('층 GLB 초안 교체는 같은 층에 적용하고 옥상 전환도 ID를 유지한다',()=>{
  let s=fixture();s=S.registerFloors(s,'building-1',[{level:'2F',name:'작업층',elevation:6,floorId:'floor-1'}]);
  const before=M.clone(s),model={...floorAsset,width:25,depth:15,height:.3};
  const next=M.validate(S.registerFloors(s,'building-1',[{level:'R',name:'옥상',elevation:12,targetId:'floor-1',floorId:null,model}]));
  assert.equal(next.floors.length,1);assert.equal(next.floors[0].id,'floor-1');assert.equal(next.floors[0].level,'R');assert.equal(next.floors[0].type,model.type);assert.equal(next.floors[0].width,25);assert.deepEqual(s,before);
});

test('공간 변환은 원문 백업 후 저장하며 저장 실패 시 기존 상태를 유지한다',()=>{
  const source=require('node:fs').readFileSync('js/app.js','utf8'),vm=require('node:vm');
  const code=source.slice(source.indexOf('  if(S&&autosaveAllowed&&history.current.version<3)'),source.indexOf('  if(autosaveAllowed&&history.current.version<4)'));
  for(const fail of [false,true]){
    const original=L.enableShared(M.demo()),raw=JSON.stringify(original),storage=new Map([[M.STORAGE_KEY,raw]]);
    const ctx={S,M,history:{current:original},autosaveAllowed:true,startupMessage:'',localStorage:{getItem:key=>storage.get(key),setItem(key,value){if(fail&&key===M.STORAGE_KEY)throw Error('quota');storage.set(key,value);}}};
    vm.runInNewContext(code,ctx);assert.equal(storage.get(M.STORAGE_KEY+'-before-spatial-v3'),raw);
    assert.equal(ctx.history.current.version,fail?2:3);assert.equal(ctx.autosaveAllowed,!fail);if(fail)assert.equal(storage.get(M.STORAGE_KEY),raw);
  }
});

test('실제 앱 계층 드롭은 공간 이동을 먼저 처리하고 전력 계층 이동을 중복 실행하지 않는다',()=>{
  const source=require('node:fs').readFileSync('js/app.js','utf8'),vm=require('node:vm');let calls=0;
  const ctx={spaces:{reparent(ids,target){assert.deepEqual(ids,['a']);assert.equal(target,'floor-1');calls++;return true;}}};
  vm.runInNewContext(source.slice(source.indexOf('  function reparent('),source.indexOf('  function add(')),ctx);
  ctx.reparent(['a'],'floor-1');assert.equal(calls,1);
});

test('층 크기는 건물 폭·깊이와 층간격으로 제한하고 옥상 윗면을 건물 꼭대기에 맞춘다',()=>{
  const s=fixture(),b=s.buildings[0];
  const entries=S.slots(4,2,true,b.height).map(slot=>({...slot,size:{width:100,depth:75,height:10}}));
  const fitted=S.fitFloorSlots(s,b.id,entries),next=M.validate(S.registerFloors(s,b.id,fitted));
  const floors=next.floors.filter(f=>f.buildingId===b.id).sort((a,b)=>a.elevation-b.elevation);
  for(const [i,f] of floors.entries()){
    assert.ok(f.width<=b.width+1e-8);assert.ok(f.depth<=b.depth+1e-8);assert.ok(f.elevation+f.height<=b.height+1e-8);
    if(i)assert.ok(floors[i-1].elevation+floors[i-1].height<=f.elevation+1e-8);
  }
  const roof=floors.find(f=>f.level==='R');assert.equal(roof.elevation+roof.height,b.height);
  assert.equal(floors.find(f=>f.level==='1F').elevation,0);assert.equal(floors.find(f=>f.level==='B2').elevation,-8);
  assert.equal(entries[0].size.width,100);
});

test('층 개별 치수와 비율 고정은 높이·가로 한도를 모두 지키며 다른 층은 바꾸지 않는다',()=>{
  const s=fixture(),b=s.buildings[0],slots=S.fitFloorSlots(s,b.id,S.slots(4,0,true,b.height));
  const slot=slots.find(f=>f.level==='3F'),before=M.clone(slots),limits=S.floorSizeLimits(s,b.id,slots,slot);
  const unlocked=S.fitFloorSize(slot.size,limits,'height',99,false);assert.ok(Math.abs(unlocked.height-3.8)<1e-8);assert.equal(unlocked.width,slot.size.width);
  const locked=S.fitFloorSize({width:10,depth:5,height:1},limits,'height',99,true);
  assert.ok(Math.abs(locked.height-3.8)<1e-8);assert.equal(locked.width/locked.height,10);assert.equal(locked.depth/locked.height,5);
  assert.deepEqual(slots,before);
  const roof=slots.find(f=>f.level==='R');assert.ok(Math.abs(S.floorSizeLimits(s,b.id,slots,roof).height-3.8)<1e-8);
});

test('회전·편심이 있는 층도 건물 범위를 넘지 않으며 잘못된 크기는 등록을 막는다',()=>{
  const s=fixture(),b=s.buildings[0],f=s.floors[0];Object.assign(f,{buildingId:b.id,x:3,z:2,rotation:35,level:'1F'});
  const slots=S.fitFloorSlots(s,b.id,[{level:'1F',elevation:0,floorId:f.id,size:{width:100,depth:100,height:99}}]);
  const next=M.validate(S.registerFloors(s,b.id,slots));assert.ok(!S.warnings(next).some(v=>v.includes('건물 영역 밖')));
  const bad=M.clone(slots);bad[0].size.height=13;assert.throws(()=>S.registerFloors(s,b.id,bad),/높이/);
  bad[0].size.height=1;bad[0].size.width=100;assert.throws(()=>S.registerFloors(s,b.id,bad),/크기/);
  assert.throws(()=>S.fitFloorSize(slots[0].size,S.floorSizeLimits(s,b.id,slots,slots[0]),'width',NaN,false));
});

test('층간격이 최소 모델 두께보다 작으면 등록하지 않고 원본을 보존한다',()=>{
  const s=fixture(),before=M.clone(s);s.buildings[0].height=.01;
  assert.throws(()=>S.fitFloorSlots(s,'building-1',S.slots(2,0,true,.01)),/공간이 부족/);
  assert.equal(s.floors.length,before.floors.length);
});

test('층 크기 등록은 설비·연결선·층 ID를 보존하고 undo와 fems 왕복 저장을 지원한다',async()=>{
  let s=fixture();s=S.registerFloors(s,'building-1',[{level:'1F',name:'1F',elevation:0,floorId:'floor-1'}]);
  const a={...M.create('panel',s),floorId:'floor-1'},b={...M.create('ups',s,3,4),floorId:'floor-1',parentId:a.id};s.equipment.push(a,b);s=L.enableShared(s);
  const h=new M.History(s),slots=S.fitFloorSlots(s,'building-1',[{level:'1F',name:'1F',elevation:0,floorId:'floor-1',size:{width:10,depth:8,height:2}}]);
  const next=M.validate(S.registerFloors(s,'building-1',slots));assert.deepEqual(next.equipment,s.equipment);assert.deepEqual(next.networks,s.networks);assert.equal(next.floors[0].id,'floor-1');
  h.commit(next);h.undo();assert.deepEqual(h.current,s);h.redo();assert.deepEqual(h.current,next);
  const saved=await P.encode(next,async()=>glb()),opened=await P.decode(saved.bytes);assert.deepEqual(opened.drawing.floors,next.floors);
});

test('전체 층 이동은 상대 위치·크기·설비와 연결선을 보존하고 건물 경계에서 제한한다',async()=>{
  let state=fixture();const building=state.buildings[0];
  let slots=S.slots(2,0,false,12).map((s,i)=>({...s,size:{width:10,depth:8,height:.2},position:{x:i?2:-2,z:1}}));
  state=M.validate(S.registerFloors(state,building.id,slots));
  const f=state.floors.find(f=>f.level==='1F'),a={...M.create('panel',state),floorId:f.id},b={...M.create('ups',state,3,4),floorId:f.id,parentId:a.id};state.equipment.push(a,b);state=L.enableShared(state);
  slots=state.floors.filter(f=>f.buildingId===building.id).map(f=>({level:f.level,elevation:f.elevation,floorId:f.id,size:{width:f.width,depth:f.depth,height:f.height},position:{x:f.x,z:f.z}}));
  const original=M.clone(state),moved=S.moveFloorSlots(state,building.id,slots,'x',99);assert.equal(moved.delta,13);
  assert.deepEqual(moved.slots.map(s=>s.position.x),[11,15]);assert.deepEqual(moved.slots.map(s=>s.size),slots.map(s=>s.size));
  const next=M.validate(S.registerFloors(state,building.id,moved.slots));assert.deepEqual(next.equipment,state.equipment);assert.deepEqual(next.networks,state.networks);assert.deepEqual(state,original);
  const history=new M.History(state);history.commit(next);history.undo();assert.deepEqual(history.current,state);history.redo();assert.deepEqual(history.current,next);
  const encoded=await P.encode(next,async()=>glb()),decoded=await P.decode(encoded.bytes);assert.deepEqual(decoded.drawing.floors,next.floors);
  assert.throws(()=>S.moveFloorSlots(state,building.id,slots,'x',NaN),/숫자/);
});

test('회전한 층의 전체 이동도 실제 외곽 폭·깊이로 제한한다',()=>{
  const state=fixture(),f=state.floors[0];Object.assign(f,{buildingId:'building-1',x:0,z:0,rotation:90,level:'1F',width:10,depth:20});
  const entries=[{level:'1F',elevation:0,floorId:f.id,size:{width:10,depth:20,height:.2}}];
  const moved=S.moveFloorSlots(state,'building-1',entries,'z',-100);assert.ok(Math.abs(moved.delta+10)<1e-8);
  assert.ok(!S.warnings(S.registerFloors(state,'building-1',moved.slots)).some(s=>s.includes('건물 영역 밖')));
});
