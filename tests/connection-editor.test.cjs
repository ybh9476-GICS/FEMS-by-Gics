const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../js/model.js'),L=require('../js/connections.js');
function fixture(){
  const state=M.demo(),parent=state.equipment[0],child=state.equipment[1];child.parentId=parent.id;
  const initial=L.storeRoute(state,child.id,[{x:-15,z:-5},{x:0,z:-5},{x:0,z:5},{x:10,z:5}]),history=new M.History(initial),elements=new Map();
  const element=()=>({showModal(){},children:[],style:{setProperty(){}},dataset:{},listeners:{},attributes:{},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},append(e){this.children.push(e);}});
  const document={body:{dataset:{}},createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
  const context={FEMSConnections:L,document,addEventListener(){}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/connection-editor.js'),'utf8'),context);
  let guides={},corner=false;
  const editor=new context.FEMSConnectionEditor({state:()=>history.current,commit:state=>history.commit(state),preview:state=>history.preview(state),finish:ok=>history.finishEdit(ok),guides:(g,c)=>{guides=g;corner=c;}});
  return {editor,history,initial,id:child.id,elements,document,getGuides:()=>guides,getCorner:()=>corner};
}

function confirmOptimization(elements){elements.get('connection-optimize').listeners.click();const dialog=elements.get('connection-optimize-dialog');dialog.returnValue='optimize';dialog.listeners.close();}

test('최적화 경고는 확인 전 편집하지 않고 취소·Esc·선택 변경은 보존하며 확인 후 색상까지 실행 취소된다',()=>{
  for(const view of ['3d','plan']){
    const {editor,history,id,elements}=fixture();
    const colored=L.storeRoute(history.current,id,[{x:-15,z:-5},{x:-10,z:-5},{x:0,z:-5},{x:0,z:5}],[L.palette[0][1],L.palette[7][1],L.palette[2][1]]);
    history.commit(colored);const count=history.past.length;
    editor.select({id,kind:'point',index:1});editor.render(view);
    const button=elements.get('connection-optimize'),dialog=elements.get('connection-optimize-dialog');
    for(const answer of ['cancel','']){
      button.listeners.click();assert.deepEqual(history.current,colored);assert.equal(history.past.length,count);
      assert.match(elements.get('connection-optimize-target').textContent,/대상 구간:/);
      dialog.returnValue=answer;dialog.listeners.close();assert.deepEqual(history.current,colored);
    }
    button.listeners.click();editor.clear();dialog.returnValue='optimize';dialog.listeners.close();assert.deepEqual(history.current,colored);
    editor.select({id,kind:'segment',index:0});confirmOptimization(elements);
    assert.equal(history.past.length,count+1);assert.deepEqual(L.route(history.current,id).segmentColors,[L.palette[0][1],L.palette[2][1]]);
    history.undo();assert.deepEqual(history.current,colored);
  }
});

test('복원 팝업은 최상위 부모를 명시하고 취소는 보존, 확인은 연결망 전체를 한 기록으로 복원한다',()=>{
  const {editor,history,id,elements}=fixture();
  const shared=L.enableShared(history.current);history.commit(shared);
  const selected=L.routes(shared).find(r=>r.childIds.includes(id)).id;
  editor.select({id:selected,kind:'point',index:1});editor.render('plan');
  const dialog=elements.get('connection-reset-dialog');dialog.showModal=()=>{};
  elements.get('connection-reset').listeners.click();
  assert.ok(elements.get('connection-reset-target').textContent.includes(L.editScope(shared,selected).name));
  dialog.returnValue='cancel';dialog.listeners.close();assert.deepEqual(history.current,shared);
  elements.get('connection-reset').listeners.click();dialog.returnValue='restore';dialog.listeners.close();
  assert.deepEqual(history.current,L.resetScope(shared,selected));assert.equal(editor.selection.index,0);
  history.undo();assert.deepEqual(history.current,shared);
});
test('실제 편집 컨트롤러: 반복 선분 미리보기는 단일 기록이며 취소하면 경로와 정렬선을 복원한다',()=>{
  for(const commit of [true,false]){
    const {editor,history,initial,id,getGuides}=fixture(),hit={id,kind:'segment',index:1,handle:true};
    editor.select(hit);editor.start(hit);editor.preview({x:3,z:0},{tolerance:.6});editor.preview({x:4,z:0},{tolerance:.6});editor.finish(commit);
    assert.equal(history.past.length,commit?1:0);assert.deepEqual({...getGuides()},{});
    if(commit){assert.equal(L.route(history.current,id).points[editor.selection.index].x,4);history.undo();}
    assert.deepEqual(history.current,initial);
  }
});
test('코너 추가 버튼은 다음 손잡이 드래그에만 적용되고 모드 취소·선택 변경은 도면을 바꾸지 않는다',()=>{
  const {editor,history,initial,id,elements,getCorner}=fixture(),hit={id,kind:'segment',index:1,handle:true};
  editor.select(hit);elements.get('connection-corner').listeners.click();assert.equal(getCorner(),true);
  editor.select(hit);editor.start(hit);editor.preview({x:3,z:0});editor.preview({x:4,z:0});editor.finish(true);
  assert.equal(L.route(history.current,id).points.length,8);assert.equal(history.past.length,1);assert.equal(getCorner(),false);
  history.undo();assert.deepEqual(history.current,initial);
  editor.select(hit);elements.get('connection-corner').listeners.click();editor.start(hit);editor.finish(false);assert.equal(getCorner(),false);assert.deepEqual(history.current,initial);
  elements.get('connection-corner').listeners.click();editor.select({id,kind:'point',index:1});assert.equal(getCorner(),false);
});
test('흰색 포인트는 정렬 후 정확히 선택되고 원위치 복귀는 기록을 만들지 않는다',()=>{
  const {editor,history,initial,id}=fixture(),hit={id,kind:'point',index:1};
  editor.select(hit);editor.start(hit);editor.preview({x:.4,z:-2},{tolerance:.6});
  assert.deepEqual(L.route(history.current,id).points[editor.selection.index],{x:0,z:-2});
  editor.preview({x:0,z:-5},{tolerance:0});editor.finish(true);assert.deepEqual(history.current,initial);assert.equal(history.past.length,0);
});
test('3D 속성 패널은 지름·선분 색상을 편집하고 포인트·경로 조작도 표시한다',()=>{
  const {editor,history,initial,id,elements}=fixture();editor.select({id,kind:'segment',index:1});
  assert.equal(editor.render('3d'),true);assert.equal(elements.get('inspector-title').textContent,'PROPERTIES');
  for(const action of ['corner','add','delete','optimize','reset'])assert.equal(elements.get('connection-'+action).hidden,false);
  editor.changeStyle({color:'#dc2626'});assert.deepEqual(L.route(history.current,id).segmentColors,['#2563eb','#dc2626','#2563eb']);
  const input=elements.get('connection-diameter');input.id='connection-diameter';input.valueAsNumber=.4;editor.previewNumeric(input);editor.finishNumeric(true);
  assert.equal(L.route(history.current,id).diameter,.4);history.undo();assert.equal(L.route(history.current,id).diameter,.2);history.undo();assert.deepEqual(history.current,initial);
  editor.render('plan');for(const action of ['corner','add','delete','optimize','reset'])assert.equal(elements.get('connection-'+action).hidden,false);
  assert.equal(editor.render('list'),false);
});

test('3D 경로 버튼은 코너 추가·포인트 추가·삭제·최적화를 실행하고 한 번씩 취소할 수 있다',()=>{
  const {editor,history,initial,id,elements}=fixture(),hit={id,kind:'segment',index:1,handle:true};
  editor.select(hit);editor.render('3d');elements.get('connection-corner').listeners.click();assert.equal(editor.view,'3d');
  editor.start(hit);editor.preview({x:3,z:0},{tolerance:0});editor.finish(true);
  assert.equal(L.route(history.current,id).points.length,8);history.undo();assert.deepEqual(history.current,initial);
  editor.select(hit);elements.get('connection-add').listeners.click();editor.render('3d');
  assert.equal(editor.selection.kind,'point');assert.equal(elements.get('connection-point-fields').hidden,false);
  assert.equal(elements.get('connection-delete').disabled,false);assert.equal(L.route(history.current,id).points.length,5);
  elements.get('connection-delete').listeners.click();assert.equal(L.route(history.current,id).points.length,4);history.undo();
  editor.select(hit);confirmOptimization(elements);assert.equal(L.route(history.current,id).points.length,4);
  history.undo();assert.equal(L.route(history.current,id).points.length,5);
});

test('팔레트는 선택된 선분만 수정하고 포인트 선택 시 비활성화된다',()=>{
  const {editor,history,initial,id,elements}=fixture();
  editor.select({id,kind:'segment',index:1});editor.render('plan');
  const buttons=elements.get('connection-palette').children,red=buttons.find(b=>b.dataset.color==='#dc2626');
  red.listeners.click();editor.render('plan');
  assert.deepEqual(L.route(history.current,id).segmentColors,['#2563eb','#dc2626','#2563eb']);
  assert.equal(red.attributes['aria-pressed'],'true');assert.equal(history.past.length,1);
  editor.select({id,kind:'point',index:1});editor.render('plan');assert.ok(buttons.every(b=>b.disabled));
  buttons[0].listeners.click();assert.equal(history.past.length,1);
  history.undo();assert.deepEqual(history.current,initial);
});

test('최적화 결과는 제거 개수 또는 보존 이유를 표시하고 변경이 없으면 선택·실행 취소를 유지한다',()=>{
  for(const view of ['plan','3d']){
    const {editor,history,initial,id,elements}=fixture();editor.select({id,kind:'segment',index:1});editor.render(view);
    confirmOptimization(elements);
    assert.match(elements.get('connection-feedback').textContent,/정리할 포인트가 없습니다/);
    assert.equal(editor.selection.index,1);assert.equal(history.past.length,0);assert.deepEqual(history.current,initial);
    elements.get('connection-add').listeners.click();const withPoint=M.clone(history.current);
    confirmOptimization(elements);
    assert.match(elements.get('connection-feedback').textContent,/1개를 제거/);
    history.undo();assert.deepEqual(history.current,withPoint);
    editor.clear();assert.equal(elements.get('connection-feedback').textContent,'');
  }
});

test('외부 포인트 Y 수치 입력·드래그·취소·복원은 같은 선택을 유지한다',()=>{
 const S=require('../js/spatial.js'),{editor,history,elements}=fixture();let state=S.upgrade(L.enableShared(M.empty()));
 state.floors=[{id:'f',name:'층',x:0,z:0,rotation:0,width:20,depth:20,height:1,elevation:8}];state.equipment=[{...M.create('panel',state,-20,0),id:'from'},{...M.create('panel',state,2,3),id:'to',floorId:'f'}];state=L.changePowerLink(L.upgradePower(state),'from','to');history.commit(state);
 const id=L.external.idFor('from','to'),hit={id,kind:'point',index:1};editor.select(hit);editor.render('3d');assert.equal(elements.get('connection-y-field').hidden,false);
 const input=elements.get('connection-y');input.id='connection-y';input.valueAsNumber=5;editor.previewNumeric(input);editor.finishNumeric(true);
 assert.equal(L.route(history.current,id).points[editor.selection.index].y,5);
 const before=M.clone(history.current);editor.start(editor.selection);editor.preview({...L.route(before,id).points[editor.selection.index],y:6},{axis:'y'});editor.finish(false);assert.deepEqual(history.current,before);
 const dialog=elements.get('connection-reset-dialog');elements.get('connection-reset').listeners.click();assert.equal(elements.get('connection-reset-external-description').hidden,false);assert.equal(elements.get('connection-reset-description').hidden,true);dialog.returnValue='restore';dialog.listeners.close();assert.equal(editor.selection.id,id);assert.equal(editor.selection.index,0);assert.deepEqual(history.current,L.resetScope(before,id));
});

test('건물 외부 포인트는 보이는 다른 연결선에 스냅하고 축 제한·Shift 해제·실행 취소를 유지한다',()=>{
 const S=require('../js/spatial.js');
 for(const portal of [false,true]){
  const {editor,history}=fixture();let state=S.upgrade(L.enableShared(M.empty()));
  state.floors=[{id:'f',name:'층',x:0,z:0,rotation:0,width:20,depth:20,height:1,elevation:8}];
  state.equipment=[{...M.create('panel',state,-20,0),id:'from'},{...M.create('panel',state,2,3),id:'to',floorId:'f'}];
  state=L.changePowerLink(L.upgradePower(state),'from','to');history.commit(state);
  const id=portal?L.floor.idFor('from','to','f'):L.external.idFor('from','to'),line=L.route(state,id),index=portal?line.pointKinds.indexOf('portal'):1,hit={id,kind:'point',index};
  const target={x:4.127,z:6.283,y:line.points[index].y??0},near={...target,x:target.x+.13,z:target.z-.11},snapPoints=[target];
  editor.select(hit);editor.start(hit);editor.preview(near,{tolerance:.3,snapPoints});
  let p=L.route(history.current,id).points[editor.selection.index];assert.equal(p.x,target.x);assert.equal(p.z,target.z);
  editor.finish(true);history.undo();assert.deepEqual(history.current,state);history.redo();assert.equal(L.route(history.current,id).points[editor.selection.index].x,target.x);
  history.undo();editor.select(hit);editor.start(hit);editor.preview(near,{tolerance:0,snapPoints});p=L.route(history.current,id).points[editor.selection.index];assert.equal(p.x,4.26);assert.equal(p.z,6.17);editor.finish(false);assert.deepEqual(history.current,state);
  if(!portal){editor.select(hit);editor.start(hit);editor.preview({...line.points[index],y:5.12},{axis:'y',tolerance:.3,snapPoints:[{x:99,y:5.234,z:99}]});p=L.route(history.current,id).points[editor.selection.index];assert.equal(p.y,5.234);assert.equal(p.x,line.points[index].x);assert.equal(p.z,line.points[index].z);editor.finish(false);}
 }
});
