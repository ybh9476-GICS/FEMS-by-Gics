const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),C=require('../js/catalog.js'),L=require('../js/connections.js'),P=require('../js/project-file.js');

function fixture(){
  const state=M.demo();state.equipment[0].x=-1.1999999999999993;state.equipment[0].z=1.8550000000000002;
  const history=new M.History(state),item=history.current.equipment[0],nodes=new Map();
  const get=name=>{if(!nodes.has(name))nodes.set(name,{name,value:'',checked:true,matches:()=>true,get valueAsNumber(){return Number(this.value);},removeAttribute(){},setAttribute(){}});return nodes.get(name);};
  get('properties').elements={namedItem:get};
  const context={M,C,history,selected:item.id,selectedIds:[item.id],$:get,window:{FEMSConnections:L},icon:()=>'',spaces:null,groupGizmoEdit:null,singleGizmoState:null,saveLocal(){},render(){},toast(){}};
  vm.createContext(context);const source=fs.readFileSync('js/app.js','utf8');
  vm.runInContext(source.slice(source.indexOf('  let propertyEdit ='),source.indexOf('  const icons='))+
    source.slice(source.indexOf('  function renderInspector()'),source.indexOf('  function render(preserveInputs'))+
    source.slice(source.indexOf('  function startGizmo()'),source.indexOf("  $('gizmo-rotate').addEventListener"))+
    '\nthis.edit={renderInspector,updateProperty,finishPropertyEdit,syncGroup,startGizmo,previewGizmo,finishGizmo};',context);
  return {history,item,get,context,edit:context.edit};
}

test('좌표 선택 표시는 계산 오차를 숨기고 저장·불러오기 정밀도를 보존한다',async()=>{
  const {history,get,edit}=fixture(),before=M.clone(history.current);
  edit.renderInspector();assert.equal(get('x').value,-1.2);assert.equal(get('z').value,1.86);
  assert.deepEqual(history.current,before);assert.equal(history.past.length,0);
  const decoded=await P.decode((await P.encode(history.current)).bytes);
  assert.deepEqual(decoded.drawing.equipment,before.equipment);
  assert.equal(String(M.displayCoordinate(-0.00000000001)),'0');
});

test('좌표 입력 중에는 정밀도를 유지하고 확정·취소·실행 취소 시 표시만 정리한다',()=>{
  const {history,get,edit,item}=fixture(),input=get('x');
  input.value='2.123456789';edit.updateProperty(input);
  assert.equal(input.value,'2.123456789');assert.equal(history.current.equipment[0].x,2.123456789);
  edit.finishPropertyEdit();assert.equal(input.value,2.12);assert.equal(history.current.equipment[0].x,2.123456789);
  history.undo();edit.renderInspector();assert.equal(input.value,-1.2);assert.equal(history.current.equipment[0].x,item.x);
  history.redo();edit.renderInspector();assert.equal(input.value,2.12);assert.equal(history.current.equipment[0].x,2.123456789);
  input.value='3.987654321';edit.updateProperty(input);edit.finishPropertyEdit(false);
  assert.equal(input.value,2.12);assert.equal(history.current.equipment[0].x,2.123456789);
});

test('기즈모 이동·확정·취소 후 좌표 표시와 실제 좌표가 분리된다',()=>{
  const {history,get,edit,item}=fixture();edit.startGizmo();
  edit.previewGizmo(item.id,{x:-8.715000000000002,z:2.123456789});
  assert.equal(get('x').value,-8.72);assert.equal(get('z').value,2.12);
  edit.finishGizmo(true);assert.equal(history.current.equipment[0].z,2.123456789);
  edit.startGizmo();edit.previewGizmo(item.id,{x:4.111111111,z:5});edit.finishGizmo(false);
  assert.equal(get('x').value,-8.72);assert.equal(history.current.equipment[0].x,-8.715000000000002);
  history.undo();assert.equal(history.current.equipment[0].x,item.x);
});

test('공간 좌표와 높이 표시도 정리하되 편집 중인 입력은 유지한다',()=>{
  const fields=new Map(),get=name=>{if(!fields.has(name))fields.set(name,{value:''});return fields.get(name);};
  const item={name:'공장',x:-1.1999999999999993,z:1.8550000000000002,elevation:3.0000000000000004,width:10.123456789};
  const document={getElementById:get,activeElement:get('z')},window={FEMSModel:M,FEMSSpatial:{get:()=>item}};
  vm.runInNewContext(fs.readFileSync('js/spatial-ui.js','utf8'),{window,document});
  const ui=Object.create(window.FEMSSpatialUI.prototype);ui.api={state:()=>({})};ui.host={elements:{namedItem:get}};
  get('z').value='1.8550000000000002';ui.fill();
  assert.equal(get('x').value,-1.2);assert.equal(get('elevation').value,3);assert.equal(get('z').value,'1.8550000000000002');
  assert.equal(get('width').value,10.12);assert.equal(item.x,-1.1999999999999993);
  document.activeElement=null;ui.fill();assert.equal(get('z').value,1.86);
});

test('크기 비율 편집과 다중 선택도 두 자리로 표시하며 원본 크기를 보존한다',()=>{
  const {history,get,edit,context}=fixture(),input=get('width');
  input.value='3.123456';edit.updateProperty(input);
  assert.equal(input.value,'3.123456');
  const actual=M.clone(history.current);
  for(const name of ['depth','height'])assert.equal(get(name).value,M.displayCoordinate(actual.equipment[0][name]));
  edit.finishPropertyEdit();assert.equal(input.value,3.12);assert.deepEqual(history.current,actual);
  edit.renderInspector();assert.equal(input.value,3.12);assert.deepEqual(history.current,actual);
  context.selected=null;context.selectedIds=actual.equipment.slice(0,2).map(e=>e.id);
  edit.syncGroup();const bounds=M.groupBounds(history.current,context.selectedIds);
  for(const name of ['x','z','width','depth','height'])assert.equal(get(name).value,M.displayCoordinate(bounds[name]));
  assert.deepEqual(history.current,actual);
});
