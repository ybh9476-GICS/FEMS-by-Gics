const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={};context.window=context;vm.createContext(context);
for(const file of ['vendor/three.js','js/equipment-tree.js','js/scene.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const Tree=context.FEMSEquipmentTree;
const choose=(current,anchor,visible,id,event={})=>JSON.parse(JSON.stringify(Tree.nextSelection(current,anchor,visible,id,event)));

test('일반 클릭은 단일 선택, Ctrl·Command 클릭은 독립 선택 추가와 해제를 지원한다',()=>{
  const visible=['a','b','c','d'];
  assert.deepEqual(choose(['a','b'],'a',visible,'c'),{ids:['c'],anchor:'c'});
  assert.deepEqual(choose(['a'],'a',visible,'c',{ctrlKey:true}).ids,['a','c']);
  assert.deepEqual(choose(['a','c'],'c',visible,'a',{ctrlKey:true}).ids,['c']);
  assert.deepEqual(choose(['a'],'a',visible,'a',{ctrlKey:true}).ids,[]);
  assert.deepEqual(choose(['a'],'a',visible,'d',{metaKey:true}).ids,['a','d']);
});
test('Shift는 기준점을 유지하며 양방향 범위를 선택하고 Ctrl+Shift는 기존 선택에 더한다',()=>{
  const visible=['a','b','c','d','e'];
  const range=choose(['b'],'b',visible,'e',{shiftKey:true});
  assert.deepEqual(range,{ids:['b','c','d','e'],anchor:'b'});
  assert.deepEqual(choose(range.ids,range.anchor,visible,'a',{shiftKey:true}).ids,['a','b']);
  assert.deepEqual(choose(['a','e'],'b',visible,'d',{ctrlKey:true,shiftKey:true}).ids,['a','e','b','c','d']);
});
test('범위 선택은 접힌 항목·검색 밖 항목을 제외하고 숨겨진 기준점은 클릭한 항목으로 다시 시작한다',()=>{
  assert.deepEqual(choose(['a'],'a',['a','d'],'d',{shiftKey:true}).ids,['a','d']);
  assert.deepEqual(choose(['b'],'b',['a','d'],'d',{shiftKey:true}),{ids:['d'],anchor:'d'});
  assert.deepEqual(choose(['b'],'b',['a','d'],'d',{ctrlKey:true,shiftKey:true}).ids,['b','d']);
});
test('실제 목록 선택 처리에서 연속 Ctrl·Shift 선택 결과와 기준점을 전달한다',()=>{
  const tree=Object.create(Tree.prototype),visible=['a','b','c','d'];
  Object.assign(tree,{selectedIds:[],anchor:null,host:{querySelectorAll:()=>visible.map(id=>({dataset:{id}}))},focus(){},handlers:{select(id,ids){tree.selectedIds=[...ids];}}});
  tree.choose('a',{});tree.choose('c',{ctrlKey:true});assert.deepEqual(Array.from(tree.selectedIds),['a','c']);
  tree.choose('d',{shiftKey:true});assert.deepEqual(Array.from(tree.selectedIds),['c','d']);assert.equal(tree.anchor,'c');
  tree.choose('a',{shiftKey:true});assert.deepEqual(Array.from(tree.selectedIds),['a','b','c']);assert.equal(tree.selecting,false);
});

test('도면 최상위 항목은 Shift 범위 선택에 설비 ID로 포함되지 않는다',()=>{
  const tree=Object.create(Tree.prototype);
  Object.assign(tree,{selectedIds:['a'],anchor:'a',host:{querySelectorAll:()=>[{dataset:{}},{dataset:{id:'a'}},{dataset:{id:'b'}}]},focus(){},handlers:{select(id,ids){tree.selectedIds=ids;}}});
  tree.choose('b',{shiftKey:true});assert.deepEqual(Array.from(tree.selectedIds),['a','b']);
});

test('도면 행에 드롭하면 최상위 부모(null)로 이동하며 계층 데이터는 조회 중 변경하지 않는다',()=>{
  const tree=Object.create(Tree.prototype),row={getBoundingClientRect:()=>({top:10,bottom:40})};
  Object.assign(tree,{documentRow:row,host:{parentElement:{getBoundingClientRect:()=>({left:0,right:250,top:0,bottom:400})}},state:{equipment:[{id:'a',parentId:'b'},{id:'b'}]}});
  const target=tree.dropTarget({clientX:100,clientY:25});assert.equal(target.parentId,null);assert.equal(target.position,'inside');assert.equal(target.element,row);
  assert.equal(tree.state.equipment[0].parentId,'b');assert.equal(tree.dropTarget({clientX:300,clientY:25}),null);
});

test('계층 드롭은 공간 대상 검증과 기존 순환 방지를 함께 적용한다',()=>{
  const tree=Object.create(Tree.prototype);Object.assign(tree,{dragged:'a',draggedIds:['a'],state:{equipment:[{id:'a'},{id:'b',parentId:'a'}]},handlers:{dropInfo:(ids,id)=>id==='building'?{valid:false,label:'층을 선택하세요.'}:null}});
  assert.equal(tree.allowed('building'),false);assert.equal(tree.allowed('b'),false);assert.equal(tree.allowed('floor'),true);assert.equal(tree.allowed(null),true);
});
test('수정 키 클릭은 선택만 하고 선택된 항목 드래그는 전체 선택을 전달한다',()=>{
  const tree=Object.create(Tree.prototype),listeners={},classes=new Set(),row={dataset:{id:'a'},classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},remove(name){classes.delete(name);}},addEventListener:(key,fn)=>listeners[key]=fn,setPointerCapture(){},hasPointerCapture:()=>false};
  const moves=[];Object.assign(tree,{selectedIds:['a','b'],state:{equipment:[{id:'a'},{id:'b'},{id:'c'},{id:'child',parentId:'b'}]},collapsed:new Set(['c']),host:{querySelectorAll:()=>[row],parentElement:{getBoundingClientRect:()=>({top:0,bottom:200})}},clearTarget(){},showTarget(){},dropTarget:()=>({parentId:'c',position:'inside'}),handlers:{error:message=>assert.fail(message),reparent:(...args)=>moves.push(args)}});
  tree.bindDrag(row,'a');const down={button:0,target:{closest:()=>null},pointerId:1,clientX:0,clientY:50,preventDefault(){}};
  for(const key of ['ctrlKey','metaKey','shiftKey']){listeners.pointerdown({...down,[key]:true});assert.equal(tree.pointer,undefined);}
  listeners.pointerdown(down);listeners.pointermove({...down,clientX:20});
  assert.equal(tree.allowed('child'),false);assert.equal(tree.allowed(null,'b'),false);assert.equal(tree.allowed('c'),true);
  listeners.pointerup({...down,clientX:20});assert.deepEqual(JSON.parse(JSON.stringify(moves)),[[['a','b'],'c',null,'inside']]);
  assert.equal(tree.pointer,null);assert.equal(tree.skipClick,true);assert.equal(tree.collapsed.has('c'),false);assert.equal(classes.size,0);
  tree.selectedIds=['b','c'];listeners.pointerdown(down);listeners.pointermove({...down,clientX:20});listeners.pointerup({...down,clientX:20});assert.equal(moves[1][0],'a');
  listeners.pointerdown(down);listeners.pointermove({...down,clientX:20});listeners.pointercancel();assert.equal(moves.length,2);assert.equal(tree.draggedIds,null);
});

test('여러 설비의 3D·평면도 윤곽선을 개별 표시하고 단일 선택 복귀 시 자원을 정리한다',()=>{
  const T=context.THREE,scene=Object.create(context.FEMSScene.prototype),models=new Map(),footprints=new Map();
  for(const id of ['a','b']){const model=new T.Mesh(new T.BoxGeometry(2,4,2),new T.MeshBasicMaterial());model.position.x=id==='a'?-5:5;model.updateMatrixWorld();models.set(id,model);const footprint=model.clone();footprint.scale.y=.01;footprint.updateMatrixWorld();footprints.set(id,footprint);}
  Object.assign(scene,{scene:new T.Scene(),state:{equipment:[{id:'a'},{id:'b'}]},models,footprints,selection:new T.Box3Helper(new T.Box3()),selected:null,selectedIds:['a','b'],mode:'3d'});
  scene.updateSelection();assert.equal(scene.selection.visible,false);assert.equal(scene.multipleBoxes.size,2);
  assert.equal(scene.multipleBoxes.get('a').box.getSize(new T.Vector3()).y,4.18);
  scene.mode='plan';scene.updateSelection();assert.ok(scene.multipleBoxes.get('a').box.getSize(new T.Vector3()).y<.3);
  let disposed=0;for(const box of scene.multipleBoxes.values())box.geometry.addEventListener('dispose',()=>disposed++);
  scene.selected='a';scene.selectedIds=['a'];scene.updateSelection();assert.equal(scene.selection.visible,true);assert.equal(scene.multipleBoxes.size,0);assert.equal(disposed,2);
});
