const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../js/model.js'),L=require('../js/connections.js');
function fixture(){
  const state=M.demo(),parent=state.equipment[0],child=state.equipment[1];child.parentId=parent.id;
  const initial=L.storeRoute(state,child.id,[{x:-15,z:-5},{x:0,z:-5},{x:0,z:5},{x:10,z:5}]),history=new M.History(initial),elements=new Map();
  const element=()=>({children:[],style:{setProperty(){}},dataset:{},listeners:{},attributes:{},addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},append(e){this.children.push(e);}});
  const document={body:{dataset:{}},createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
  const context={FEMSConnections:L,document,addEventListener(){}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/connection-editor.js'),'utf8'),context);
  let guides={},corner=false;
  const editor=new context.FEMSConnectionEditor({state:()=>history.current,commit:state=>history.commit(state),preview:state=>history.preview(state),finish:ok=>history.finishEdit(ok),guides:(g,c)=>{guides=g;corner=c;}});
  return {editor,history,initial,id:child.id,elements,document,getGuides:()=>guides,getCorner:()=>corner};
}
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
