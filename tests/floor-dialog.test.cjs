const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),S=require('../js/spatial.js'),L=require('../js/connections.js');
function fixture(){
  const state=S.upgrade(L.enableShared(M.empty()));state.buildings.push({id:'building',type:'asset-building',name:'생산동',x:0,z:0,rotation:0,width:20,depth:16,height:12});
  const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',checked:false,dataset:{}});return elements.get(id);};
  const scenes=[];class Preview{constructor(){this.calls=[];scenes.push(this);}setState(...args){this.calls.push(args);this.state=args[0];}resize(){}fit(){this.fitted=true;}}
  const window={FEMSSpatial:S,FEMSModel:M,FEMSScene:Preview};vm.runInNewContext(fs.readFileSync('js/spatial-ui.js','utf8'),{window,document:{getElementById:get}});
  const ui=Object.create(window.FEMSSpatialUI.prototype);let refresh=0,fit=0;ui.api={state:()=>state,disarm(){},clearEquipment(){},refresh(){refresh++;},fit(){fit++;},toast(){}};
  ui.context={buildingId:'building'};ui.selected='building';ui.finish=()=>{};ui.renderSlots=()=>{};ui.registration={open:false,querySelector:()=>get('dialog-controls'),showModal(){this.open=true;},close(){this.open=false;}};
  return {ui,state,get,scenes,counts:()=>({refresh,fit})};
}
test('층 등록은 모달을 열고 독립 미리보기만 갱신하며 작업 화면·원본을 바꾸지 않는다',()=>{
  const {ui,state,scenes,counts}=fixture(),before=M.clone(state),context=M.clone(ui.context);ui.configure();
  assert.equal(ui.registration.open,true);assert.equal(scenes.length,1);assert.equal(scenes[0].state.equipment.length,2);assert.deepEqual(state,before);assert.deepEqual(ui.context,context);assert.equal(counts().fit,0);
  assert.deepEqual(ui.display(state).equipment,S.view(state,context).equipment);
});
test('층 슬롯 변경 미리보기는 전체 프로젝트에 커밋하지 않고 팝업 렌더러를 재사용한다',()=>{
  const {ui,state,get,scenes}=fixture();ui.configure();get('floors-above').value='3';get('floors-below').value='1';get('floors-roof').checked=true;ui.generate();
  assert.equal(scenes.length,1);assert.equal(scenes[0].state.equipment.length,5);assert.equal(state.floors.length,0);assert.equal(ui.draft.slots.length,4);
});
test('취소·재열기는 초안을 폐기하고 배경 공간과 카메라를 유지한다',()=>{
  const {ui,state,get,scenes,counts}=fixture();ui.configure();get('floors-above').value='4';ui.generate();const context=M.clone(ui.context);ui.cancelRegistration();
  assert.equal(ui.registration.open,false);assert.equal(ui.draft,null);assert.equal(state.floors.length,0);assert.deepEqual(ui.context,context);assert.equal(counts().fit,0);assert.equal(scenes[0].state.equipment.length,0);
  ui.configure();assert.equal(ui.draft.slots.length,1);assert.equal(scenes.length,1);
});

test('건물 투명도는 기본 30%이며 미리보기만 변경하고 층 초안·원본·카메라를 보존한다',()=>{
  const {ui,state,get,scenes}=fixture();state.floors=S.registerFloors(state,'building',S.slots(2,0,false,12)).floors;
  const before=M.clone(state);ui.configure();
  assert.equal(get('floors-building-transparency').value,'30');
  const scene=scenes[0],shell=scene.state.equipment.find(e=>e.buildingShell);
  assert.equal(shell.id,'building');assert.equal(shell.backdrop,true);assert.equal(shell.noGizmo,true);
  assert.equal(shell.x,0);assert.equal(shell.z,0);assert.equal(scene.state.hideGround,true);
  const draft=M.clone(ui.draft.slots),floors=scene.state.equipment.filter(e=>!e.buildingShell);
  scene.fitted=false;
  for(const value of [0,30,65,100]){get('floors-building-transparency').value=String(value);ui.previewRegistration(false);
    assert.equal(scene.state.equipment.find(e=>e.buildingShell).previewOpacity,1-value/100);
    assert.equal(get('floors-building-transparency-value').textContent,value+'%');
    assert.deepEqual(scene.state.equipment.filter(e=>!e.buildingShell),floors);assert.equal(scene.fitted,false);
  }
  assert.deepEqual(ui.draft.slots,draft);assert.deepEqual(state,before);
  ui.cancelRegistration();ui.configure();assert.equal(get('floors-building-transparency').value,'30');
});
test('잘못된 층 높이는 오류를 표시하고 마지막 미리보기와 프로젝트를 보존한다',()=>{
  const {ui,state,get,scenes}=fixture();ui.configure();const previous=scenes[0].state;ui.draft.slots[0].elevation=NaN;ui.previewRegistration();
  assert.ok(get('floor-register-error').textContent);assert.equal(scenes[0].state,previous);assert.equal(state.floors.length,0);
});

test('옥상 높이만 변경하면 간격을 재계산하고 겹침 입력은 초안·미리보기·원본을 보존한다',()=>{
  const {ui,state,get,scenes}=fixture();ui.configure();get('floors-above').value='5';get('floors-roof').checked=true;ui.generate();
  get('floors-roof-height').value='8';ui.generate(true);
  assert.equal(get('floors-spacing').textContent,'2 m');assert.equal(get('floors-apply').disabled,false);
  const roof=scenes[0].state.floors.find(f=>f.level==='R');assert.equal(roof.elevation+S.floorSurface(roof),8);
  const draft=M.clone(ui.draft.slots),preview=scenes[0].state;
  get('floors-roof-height').value='0.1';ui.generate(true);assert.equal(get('floors-apply').disabled,true);assert.ok(get('floor-register-error').textContent);assert.deepEqual(M.clone(ui.draft.slots),draft);assert.equal(scenes[0].state,preview);assert.equal(state.floors.length,0);
  ui.previewRegistration();assert.equal(get('floors-apply').disabled,true);
  get('floors-roof-height').value='8';ui.generate(true);assert.equal(get('floors-apply').disabled,false);
});

test('대지의 옥상 설비 선택은 해당 층으로 진입하고 원본을 변경하지 않는다',()=>{
  const {ui,state}=fixture();ui.context={};state.floors=S.registerFloors(state,'building',S.slots(3,0,true,12,10).map(s=>({...s,size:{width:20,depth:16,height:.2}}))).floors;
  const roof=state.floors.find(f=>f.level==='R'),pv={...M.create('solar',state),floorId:roof.id};state.equipment.push(pv);const before=M.clone(state);
  assert.equal(ui.choose(pv.id),false);assert.equal(ui.context.floorId,roof.id);ui.focusFloor(roof.id);assert.equal(ui.context.floorId,roof.id);assert.deepEqual(state,before);
});

test('건물 선택은 투명 외형과 층 선택 화면으로 진입하고 뒤로가기는 한 단계씩 복귀한다',()=>{
  const {ui,state,counts}=fixture();ui.context={};state.equipment.push(M.create('panel',state));
  state.floors.push({id:'floor',buildingId:'building',name:'1F',level:'1F',x:0,z:0,rotation:0,width:20,depth:16,height:.2,elevation:0});
  const before=M.clone(state);assert.equal(ui.choose('building'),true);
  assert.equal(ui.selected,'building');assert.deepEqual(ui.display(state).equipment.map(e=>e.id),[state.equipment[0].id,'building','floor']);assert.equal(counts().fit,1);
  assert.equal(ui.display(state).equipment[1].buildingShell,true);assert.equal(ui.display(state).equipment[2].floorSelector,true);
  ui.choose('floor',{billboard:true});assert.equal(ui.context.floorId,'floor');ui.back();assert.equal(ui.context.buildingId,'building');assert.equal(ui.context.floorId,undefined);
  ui.back();assert.equal(ui.context.buildingId,undefined);assert.deepEqual(ui.display(state).equipment.map(e=>e.id),[state.equipment[0].id,'building']);assert.deepEqual(state,before);
});

test('건물·층 진입은 각도 유지 확대를 요청하며 건물 복귀는 각도를 유지해 범위를 맞춘다',()=>{
  const {ui,state}=fixture(),options=[];ui.api.fit=value=>options.push(value);ui.context={};
  state.floors.push({id:'floor',buildingId:'building',name:'1F',level:'1F',x:0,z:0,rotation:0,width:20,depth:16,height:.2,elevation:0});
  ui.choose('building');assert.equal(options.at(-1).preserveAngle,true);assert.equal(options.at(-1).zoomInOnly,true);
  ui.choose('floor',{billboard:true});assert.equal(options.at(-1).preserveAngle,true);assert.equal(options.at(-1).zoomInOnly,true);
  ui.choose('floor');assert.equal(options.at(-1).preserveAngle,true);assert.equal(options.at(-1).zoomInOnly,true);
  ui.back();assert.equal(options.at(-1).preserveAngle,true);assert.equal(options.at(-1).zoomInOnly,false);
  ui.back();assert.equal(options.at(-1),undefined);
  delete state.floors[0].buildingId;ui.choose('floor',{billboard:true});assert.equal(options.at(-1).preserveAngle,true);assert.equal(options.at(-1).zoomInOnly,true);
});

test('빈 화면 클릭은 건물·층 선택을 유지하고 카메라와 데이터를 변경하지 않는다',()=>{
  const {ui,state,counts}=fixture();state.floors.push({id:'floor',buildingId:'building',name:'1F',x:0,z:0,rotation:0,width:20,depth:16,height:.2,elevation:0});
  const before=M.clone(state);
  for(const id of ['building','floor']){
    ui.choose(id,{billboard:true});const context=JSON.stringify(ui.context),calls=counts();
    assert.equal(ui.keepSelection(),true);assert.equal(ui.selected,id);assert.equal(JSON.stringify(ui.context),context);assert.deepEqual(counts(),calls);
    ui.clear();assert.equal(ui.keepSelection(),true);assert.equal(ui.selected,id);
    assert.equal(JSON.stringify(ui.context),context);assert.equal(counts().fit,calls.fit);
  }
  ui.choose('building');ui.choose('@site');assert.equal(ui.keepSelection(),false);assert.deepEqual(state,before);
  ui.selected='deleted-space';assert.equal(ui.keepSelection(),false);
});

test('설비·연결선 선택 해제 후 현재 공간 정보를 복구하고 카메라는 다시 맞추지 않는다',()=>{
  const {ui,state,counts}=fixture();state.floors.push({id:'floor',buildingId:'building',name:'1F',x:0,z:0,rotation:0,width:20,depth:16,height:.2,elevation:0});
  let equipmentSelected=true,connectionSelected=true;
  ui.api.clearEquipment=()=>{equipmentSelected=false;connectionSelected=false;};
  for(const context of [{buildingId:'building'},{buildingId:'building',floorId:'floor'},{floorId:'floor'}]){
    ui.context=context;ui.selected=null;equipmentSelected=connectionSelected=true;const fits=counts().fit,before=JSON.stringify(state);
    assert.equal(ui.keepSelection(),true);assert.equal(ui.selected,context.floorId||context.buildingId);
    assert.equal(equipmentSelected,false);assert.equal(connectionSelected,false);assert.equal(counts().fit,fits);assert.equal(JSON.stringify(state),before);
  }
  ui.selected=null;ui.context={buildingId:'deleted'};assert.equal(ui.keepSelection(),false);
});

test('건물에 연결되지 않은 층은 뒤로가기로 대지에 복귀한다',()=>{
  const {ui,state}=fixture();state.floors.push({id:'floor',name:'독립 층',x:0,z:0,rotation:0,width:20,depth:16,height:.2,elevation:0});
  ui.choose('floor',{billboard:true});assert.equal(ui.context.floorId,'floor');ui.back();assert.equal(ui.context.floorId,undefined);assert.equal(ui.selected,null);
});

test('층 모델·목록·다른 층 설비 선택은 진입하지 않고 빌보드만 층으로 진입한다',()=>{
  const {ui,state}=fixture();state.floors.push({id:'floor',buildingId:'building',name:'1F',x:0,z:0,rotation:0,width:20,depth:16,height:.2,elevation:0});
  const before=M.clone(state);ui.context={};ui.choose('floor');assert.equal(ui.selected,'floor');assert.equal(ui.context.floorId,undefined);assert.equal(ui.context.buildingId,'building');
  ui.enter('floor');assert.equal(ui.context.floorId,undefined);
  ui.choose('floor',{billboard:true});assert.equal(ui.context.floorId,'floor');
  ui.choose('floor');assert.equal(ui.context.floorId,'floor');
  ui.back();ui.focusFloor('floor');assert.equal(ui.context.floorId,undefined);assert.equal(ui.context.buildingId,'building');
  ui.focusFloor(null);assert.equal(ui.context.buildingId,undefined);assert.deepEqual(state,before);
});

test('미등록 건물 선택과 층 등록 취소 후에도 건물 외형이 표시된다',()=>{
  const {ui,state}=fixture();ui.choose('building');ui.configure();ui.cancelRegistration();
  assert.equal(ui.display(state).equipment[0].id,'building');assert.equal(state.floors.length,0);
});

test('층 수 변경은 자동 높이를 적용하고 기존 층 이름과 모델 선택을 보존한다',()=>{
  const {ui,get}=fixture();ui.configure();get('floors-above').value='4';get('floors-below').value='2';ui.generate();
  assert.deepEqual(Array.from(ui.draft.slots,s=>s.elevation),[9,6,3,0,-3,-6]);assert.equal(get('floors-spacing').textContent,'3 m');
  ui.draft.slots.find(s=>s.level==='2F').name='생산층';get('floors-roof').checked=true;ui.generate();
  const top=Number(get('floors-roof-height').value),step=top/3;
  assert.deepEqual(Array.from(ui.draft.slots,s=>s.elevation),[top,2*step,step,0,-step,-2*step]);assert.equal(ui.draft.slots.find(s=>s.level==='2F').name,'생산층');
  get('floors-above').value='2';ui.generate();get('floors-above').value='4';ui.generate();assert.equal(ui.draft.slots.find(s=>s.level==='2F').name,'생산층');
});

test('소수·음수·문자 입력을 거부하고 빈 값과 유효하지 않은 층 수로 등록할 수 없다',()=>{
  const {ui,get}=fixture();ui.configure();const input=get('floors-above');
  for(const value of ['1.5','-2','1e2','abc']){input.value=value;ui.changeCount(input);assert.equal(input.value,'1');}
  input.value='004';ui.changeCount(input);assert.equal(input.value,'4');assert.equal(ui.draft.slots.length,4);
  for(const value of ['','101','0']){input.value=value;ui.changeCount(input);ui.previewRegistration();assert.equal(get('floors-apply').disabled,true);}
});

test('기존 옥상은 총 지상층 수에 포함하며 최상층 전환 시 같은 층 ID를 유지한다',()=>{
  const {ui,state,get}=fixture();state.floors=S.registerFloors(state,'building',S.slots(4,0,false,12)).floors;
  const top=state.floors.find(f=>f.level==='4F');ui.configure();get('floors-roof').checked=true;ui.generate();
  assert.equal(ui.draft.slots.find(s=>s.level==='R').floorId,top.id);
  const changed=S.registerFloors(state,'building',ui.draft.slots);assert.equal(changed.floors.length,4);assert.equal(changed.floors.find(f=>f.id===top.id).level,'R');
  state.floors=changed.floors;ui.cancelRegistration();ui.configure();assert.equal(get('floors-above').value,'4');assert.equal(ui.draft.slots.length,4);
  get('floors-roof').checked=false;ui.generate();assert.equal(ui.draft.slots.find(s=>s.level==='4F').floorId,top.id);
});

test('층별 크기 초안은 층 수·옥상 전환에서 유지되고 취소하면 원본에 반영하지 않는다',()=>{
  const {ui,state,get}=fixture();ui.configure();get('floors-above').value='3';ui.generate();
  ui.draft.slots.find(s=>s.level==='3F').size={width:8,depth:6,height:.4};
  get('floors-roof').checked=true;ui.generate();assert.deepEqual({...ui.draft.slots.find(s=>s.level==='R').size},{width:8,depth:6,height:.4});
  ui.cancelRegistration();assert.equal(state.floors.length,0);
});

test('에셋 선택은 프로젝트의 층 에셋만 사용하며 배치 층과 에셋 목록을 늘리지 않는다',()=>{
  const {ui,state,get}=fixture();const asset={type:'asset-floor-existing',kind:'floor',name:'등록된 층 모델',width:10,depth:8,height:.3};
  state.project={assets:[asset,{...asset,type:'asset-building-other',kind:'building'},{...asset,type:'asset-equipment-other',kind:'equipment'}]};
  state.floors=S.registerFloors(state,'building',S.slots(2,0,false,12)).floors;const ids=state.floors.map(f=>f.id),before=M.clone(state);
  ui.configure();assert.deepEqual(ui.floorAssets(),[asset]);
  for(const level of ['2F','1F'])ui.setFloorAsset(ui.draft.slots.find(s=>s.level===level),asset.type);
  const applied=S.registerFloors(state,'building',ui.draft.slots);assert.deepEqual(applied.floors.map(f=>f.id),ids);assert.ok(applied.floors.every(f=>f.type===asset.type));assert.deepEqual(state,before);assert.deepEqual(applied.project.assets,before.project.assets);
  ui.setFloorAsset(ui.draft.slots[0],'');const basic=S.registerFloors(state,'building',ui.draft.slots);assert.equal(basic.floors[0].type,undefined);assert.equal(basic.floors[0].id,ids[0]);
  const draft=M.clone(ui.draft.slots);ui.setFloorAsset(ui.draft.slots[0],'asset-not-registered');assert.deepEqual(ui.draft.slots,draft);assert.match(get('floor-register-error').textContent,/먼저 등록/);
});

test('전체 층 위치 초안은 층 수·옥상 전환에 유지되고 새 층에도 적용된다',()=>{
  const {ui,state,get}=fixture();ui.configure();ui.draft.position={x:2,z:-3};ui.draft.slots[0].position={x:2,z:-3};
  get('floors-above').value='3';get('floors-roof').checked=true;ui.generate();
  assert.ok(ui.draft.slots.every(s=>s.position.x===2&&s.position.z===-3));ui.cancelRegistration();assert.equal(state.floors.length,0);
});

test('건물 크기는 소속 층 등록·해제·복원에 따라 잠기고 층 자체의 크기는 편집 가능하다',()=>{
  const {ui,state,get}=fixture();const inputs=Object.fromEntries(['width','depth','height'].map(name=>[name,{name}]));
  ui.host={elements:{namedItem:name=>inputs[name]}};
  const check=locked=>{ui.syncSizeAvailability();for(const input of Object.values(inputs))assert.equal(input.disabled,locked);assert.equal(get('space-lock').disabled,locked);};
  check(false);
  state.floors=S.registerFloors(state,'building',S.slots(1,0,false,12)).floors;check(true);
  const before=M.clone(state);let previews=0;ui.api.preview=()=>previews++;
  for(const input of Object.values(inputs)){input.valueAsNumber=999;ui.resize(input);assert.equal(input.value,state.buildings[0][input.name]);}
  assert.equal(previews,0);assert.deepEqual(state,before);
  const floor=state.floors[0];floor.buildingId=null;check(false);
  floor.buildingId='building';check(true);ui.selected=floor.id;check(false);
  ui.selected='building';check(true);state.floors=[];check(false);
});

test('층이 등록된 건물도 위치와 회전 편집은 유지한다',()=>{
  const {ui,state,get}=fixture();state.floors=S.registerFloors(state,'building',S.slots(1,0,false,12)).floors;
  ui.host={elements:{namedItem:name=>get(name)}};let preview;ui.api.preview=next=>preview=next;
  ui.resize({name:'x',valueAsNumber:4});assert.equal(preview.buildings[0].x,4);assert.equal(state.buildings[0].x,0);
  ui.edit=null;ui.resize({name:'rotation',valueAsNumber:90});assert.equal(preview.buildings[0].rotation,90);assert.equal(state.buildings[0].rotation,0);
});

test('층 정보창은 이름·위치·크기·회전·기즈모 변경을 차단한다',()=>{
  const {ui,state}=fixture();state.floors=S.registerFloors(state,'building',S.slots(2,0,false,12)).floors;
  ui.selected=state.floors[0].id;let changes=0;ui.api.commit=ui.api.preview=()=>changes++;
  const before=M.clone(state);ui.update({name:'변경'});ui.rotate();ui.gizmo(ui.selected,{x:99});
  for(const name of ['x','z','rotation','width','depth','height','elevation'])ui.resize({name,valueAsNumber:99});
  assert.equal(changes,0);assert.deepEqual(state,before);assert.ok(ui.display(state).equipment.filter(e=>S.kind(state,e.id)==='floor').every(e=>e.noGizmo));
});

test('층 삭제는 확인 전 데이터를 보존하고 확인 후 하나의 변경으로 처리하며 오래된 확인은 거부한다',()=>{
  const {ui,state,get}=fixture();Object.assign(state,S.registerFloors(state,'building',S.slots(3,0,false,12)));
  const floor=state.floors.find(f=>f.level==='2F');state.equipment.push({...M.create('panel',state),floorId:floor.id});
  ui.selected=floor.id;ui.deleteDialog={open:false,showModal(){this.open=true;},close(){this.open=false;}};
  let commits=0;ui.api.commit=next=>{commits++;Object.assign(state,next);return true;};
  const before=M.clone(state);ui.remove();assert.equal(ui.deleteDialog.open,true);assert.deepEqual(state,before);assert.equal(commits,0);
  assert.match(get('floor-delete-message').textContent,/설비 1개/);assert.match(get('floor-delete-message').textContent,/층 간격/);
  ui.deleteDialog.close();assert.deepEqual(state,before);
  ui.remove();state.buildings[0].name='다른 이름';ui.confirmFloorDelete();assert.equal(commits,0);assert.match(get('floor-delete-error').textContent,/변경/);
  ui.remove();ui.confirmFloorDelete();assert.equal(commits,1);assert.equal(state.equipment.length,0);assert.equal(state.floors.length,2);assert.equal(ui.selected,'building');assert.equal(ui.deleteDialog.open,false);
});

test('공간 드롭 안내는 설비 대상의 소속 공간과 허용 대상을 구분한다',()=>{
  const {ui,state}=fixture();state.floors=S.registerFloors(state,'building',S.slots(1,0,false,12)).floors;const floor=state.floors[0];
  const a=M.create('panel',state),b=M.create('ups',state);state.equipment.push(a,b);
  assert.equal(ui.dropInfo([a.id],floor.id).label,'생산동 > 1F로 이동');assert.equal(ui.dropInfo([a.id],'building').valid,false);
  assert.equal(ui.dropInfo([a.id],b.id).label,'대지 · '+b.name+' 하위로 이동');
  assert.equal(ui.dropInfo(['@site'],floor.id).valid,false);assert.equal(ui.dropInfo(['building'],floor.id).valid,false);
  assert.equal(ui.dropInfo([floor.id,a.id],'@site').valid,false);assert.equal(ui.dropInfo([floor.id],'@site').valid,true);
  state.buildings.push({...state.buildings[0],id:'other'});assert.equal(ui.dropInfo([floor.id],'other').valid,false);
  ui.draft={};assert.equal(ui.dropInfo([a.id],floor.id).valid,false);
});

test('계층의 다중 설비 공간 이동은 전력 부모를 유지하며 선택과 읽기 전용 소속 경로를 갱신한다',()=>{
  const {ui,state}=fixture();state.floors=S.registerFloors(state,'building',S.slots(1,0,false,12)).floors;const floor=state.floors[0];
  const a=M.create('panel',state,2,3),b=M.create('ups',state,5,7);b.parentId=a.id;state.equipment.push(a,b);
  Object.assign(state,L.enableShared(state));const before=M.clone(state),history=new M.History(state);ui.api.commit=next=>{history.commit(next);Object.assign(state,M.clone(history.current));return true;};let selection;ui.api.selectEquipment=(id,ids)=>selection=ids;
  assert.equal(ui.reparent([a.id,b.id],floor.id),true);assert.deepEqual(selection,[a.id,b.id]);assert.equal(ui.membershipText(selection),'생산동 > 1F');
  assert.equal(state.equipment[1].parentId,a.id);assert.equal(state.equipment[1].x-state.equipment[0].x,3);assert.equal(state.equipment[1].z-state.equipment[0].z,4);
  assert.equal(ui.reparent([a.id,b.id],null),true);assert.equal(ui.membershipText(selection),'대지');assert.equal(state.equipment[1].parentId,a.id);
  history.undo();assert.ok(history.current.equipment.every(e=>e.floorId===floor.id));history.undo();assert.deepEqual(history.current,before);
});

test('다른 층 설비 하위 이동은 내부 연결선·저장을 보존하고 한 번에 실행 취소한다',async()=>{
  const {ui,state}=fixture();state.floors=S.registerFloors(state,'building',S.slots(4,0,false,12)).floors;
  const third=state.floors.find(f=>f.level==='3F'),fourth=state.floors.find(f=>f.level==='4F');
  const parent={...M.create('panel',state,6,5),id:'destination',floorId:fourth.id};
  const compressor={...M.create('ups',state,2,3),id:'compressor',floorId:third.id,rotation:30};
  const child={...M.create('panel',state,5,7),id:'child',parentId:compressor.id,floorId:third.id};
  const remote={...M.create('panel',state,-4,-6),id:'remote',parentId:child.id};
  state.equipment.push(parent,compressor,child,remote);Object.assign(state,L.enableShared(state));
  for(const line of L.routes(state))Object.assign(state,L.addPoint(state,line.id,0).state);
  const P=require('../js/project-file.js'),F=require('../js/asset-format.js'),C=require('../js/catalog.js');
  const asset=F.metadata({type:'asset-building',kind:'building',name:'생산동',width:20,depth:16,height:12});
  C.register([asset]);Object.assign(state,P.attach(state,[asset]));
  const before=M.clone(state),history=new M.History(state);let commits=0,selection;
  ui.api.commit=next=>{commits++;history.commit(next);Object.assign(state,M.clone(history.current));return true;};
  ui.api.selectEquipment=(id,ids)=>selection=ids;
  assert.equal(ui.reparent(compressor.id,parent.id),true);assert.equal(commits,1);
  const moved=state.equipment.find(e=>e.id===compressor.id),movedChild=state.equipment.find(e=>e.id===child.id);
  assert.equal(moved.parentId,parent.id);assert.equal(moved.floorId,fourth.id);assert.equal(movedChild.floorId,fourth.id);
  assert.equal(movedChild.parentId,compressor.id);assert.equal(movedChild.x-moved.x,3);assert.equal(movedChild.z-moved.z,4);
  for(const key of ['width','depth','height','rotation'])assert.equal(moved[key],compressor[key]);
  assert.deepEqual(state.equipment.find(e=>e.id===remote.id),before.equipment.find(e=>e.id===remote.id));
  assert.equal(ui.context.floorId,undefined);assert.equal(ui.context.buildingId,fourth.buildingId);assert.deepEqual(Array.from(selection),[compressor.id]);
  assert.equal(ui.membershipText(selection),'생산동 > 4F');assert.ok(state.networks.length);assert.doesNotThrow(()=>M.validate(state));
  const spatialOnly=S.moveEquipment(before,[compressor.id,child.id],fourth.id,true);
  for(const id of [compressor.id,child.id])assert.deepEqual(state.networks.find(n=>n.parentId===id),spatialOnly.networks.find(n=>n.parentId===id));
  const after=M.clone(state);history.undo();assert.deepEqual(history.current,before);history.redo();assert.deepEqual(history.current,after);
  const saved=await P.encode(state,async()=>require('./helpers/glb.cjs').glb()),opened=await P.decode(saved.bytes);
  assert.deepEqual(opened.drawing.equipment,state.equipment);assert.deepEqual(opened.drawing.networks,state.networks);
  // Reject cycles without committing or clearing the current selection.
  let cleared=0;ui.api.clearEquipment=()=>cleared++;
  ui.reparent(parent.id,child.id);assert.equal(commits,1);assert.equal(cleared,0);assert.deepEqual(state,after);
});

test('설비 대상 다중 드롭은 같은 층의 좌표·순서를 유지하고 대지 대상으로도 이동한다',()=>{
  const {ui,state}=fixture();state.floors=S.registerFloors(state,'building',S.slots(1,0,false,12)).floors;
  const floor=state.floors[0];
  const parent={...M.create('panel',state,0,0),id:'parent',floorId:floor.id};
  const a={...M.create('ups',state,2,3),id:'a',floorId:floor.id};
  const b={...M.create('panel',state,4,6),id:'b',floorId:floor.id};
  const reference={...M.create('panel',state,8,9),id:'reference',parentId:parent.id,floorId:floor.id};
  const outdoor={...M.create('panel',state,15,15),id:'outdoor'};
  state.equipment.push(parent,a,b,reference,outdoor);Object.assign(state,L.enableShared(state));
  ui.api.commit=next=>{Object.assign(state,M.validate(next));return true;};
  ui.reparent([a.id,b.id],parent.id,reference.id,'before');
  for(const original of [a,b]){const e=state.equipment.find(e=>e.id===original.id);assert.equal(e.parentId,parent.id);assert.equal(e.x,original.x);assert.equal(e.z,original.z);}
  assert.ok(state.equipment.findIndex(e=>e.id===b.id)<state.equipment.findIndex(e=>e.id===reference.id));
  ui.reparent([a.id,b.id],outdoor.id);
  assert.ok(state.equipment.filter(e=>[a.id,b.id].includes(e.id)).every(e=>!e.floorId&&e.parentId===outdoor.id));
  assert.equal(ui.context.floorId,undefined);assert.equal(ui.membershipText([a.id,b.id]),'대지');
});

test('층을 건물에 드롭하면 슬롯 지정 후 기존 층 ID와 내부 설비를 유지하고 취소 시 원본을 보존한다',()=>{
  const {ui,state,get}=fixture();state.floors=S.registerFloors(state,'building',S.slots(2,0,false,12)).floors;
  const source={id:'loose',name:'가져온 층',x:30,z:20,width:8,depth:6,height:.3,rotation:0,elevation:0};state.floors.push(source);
  const equipment={...M.create('panel',state,1,1),floorId:source.id};state.equipment.push(equipment);const before=M.clone(state);
  assert.equal(ui.reparent(source.id,'building'),true);assert.equal(ui.draft.pendingFloorId,source.id);assert.equal(get('floors-apply').disabled,true);
  ui.assignDroppedFloor(ui.draft.slots.find(s=>s.level==='1F'));assert.equal(get('floors-apply').disabled,false);
  get('floors-above').value='3';ui.generate();ui.assignDroppedFloor(ui.draft.slots.find(s=>s.level==='3F'));
  const next=M.validate(S.registerFloors(state,'building',ui.draft.slots));const attached=next.floors.find(f=>f.id===source.id);
  assert.equal(attached.buildingId,'building');assert.equal(attached.level,'3F');assert.equal(next.floors.filter(f=>f.id===source.id).length,1);
  assert.deepEqual(next.equipment,state.equipment);assert.ok(next.floors.some(f=>f.id===before.floors[0].id));assert.deepEqual(state,before);
  ui.cancelRegistration();assert.deepEqual(state,before);
});
