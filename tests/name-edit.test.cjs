const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js');
function fixture(){
  const history=new M.History(M.demo()),item=history.current.equipment[0],fields=new Map();
  const input={name:'name',value:item.name,disabled:false,removeAttribute(){this.invalid=false;},setAttribute(){this.invalid=true;}};
  const context={M,history,selected:item.id,selectedIds:[item.id],saveLocal(){context.saves++;},saves:0,render(){},
    $:id=>{if(!fields.has(id))fields.set(id,{});return fields.get(id);},
    commit(next){const changed=history.commit(next);if(changed)context.saves++;return true;}};
  vm.createContext(context);const source=fs.readFileSync('js/app.js','utf8');
  vm.runInContext(source.slice(source.indexOf('  let propertyEdit ='),source.indexOf('  const icons='))+'\nthis.edit={updateProperty,cancelNameEdit,applyNameEdit,finishPropertyEdit};',context);
  context.$('properties').addEventListener=(name,fn)=>{context.keydown=fn;};
  const start=source.indexOf("  $('properties').addEventListener('keydown'");
  vm.runInContext(source.slice(start,source.indexOf("  window.addEventListener('blur'",start)),context);
  return {context,history,input,edit:context.edit,item};
}
test('이름 입력은 도면·자동 저장·실행 취소 기록을 바꾸지 않고 확정 시 한 번만 반영한다',()=>{
  const {context,history,input,edit,item}=fixture(),before=M.clone(history.current);
  for(const value of ['새','새 이름']){input.value=value;edit.updateProperty(input);}
  assert.deepEqual(history.current,before);assert.equal(context.saves,0);assert.equal(history.past.length,0);
  edit.applyNameEdit();assert.equal(history.current.equipment[0].name,'새 이름');assert.equal(context.saves,1);assert.equal(history.past.length,1);
  history.undo();assert.equal(history.current.equipment[0].name,item.name);history.redo();assert.equal(history.current.equipment[0].name,'새 이름');
});
test('Esc 취소와 다른 편집으로 전환할 때 이름 초안을 버리고 기존 값을 복원한다',()=>{
  for(const finish of ['cancelNameEdit','finishPropertyEdit']){const {context,history,input,edit,item}=fixture();input.value='취소할 이름';edit.updateProperty(input);edit[finish]();assert.equal(input.value,item.name);assert.equal(history.past.length,0);assert.equal(context.saves,0);}
});
test('빈 이름은 확정되지 않으며 수정 후 재확정하거나 원래 이름으로 취소할 수 있다',()=>{
  const {history,input,edit,item}=fixture();input.value=' ';edit.updateProperty(input);edit.applyNameEdit();
  assert.equal(input.invalid,true);assert.equal(history.current.equipment[0].name,item.name);assert.equal(history.past.length,0);
  edit.cancelNameEdit();assert.equal(input.value,item.name);assert.equal(input.invalid,false);
  input.value=' 수정 이름 ';edit.updateProperty(input);edit.applyNameEdit();assert.equal(history.current.equipment[0].name,'수정 이름');
});
test('한글 조합 중 Enter는 확정하지 않고 조합 종료 후 Enter만 이름을 적용한다',()=>{
  const {context,history,input,edit}=fixture();input.value='한글 설비';edit.updateProperty(input);
  const event={target:input,key:'Enter',preventDefault(){},stopPropagation(){}};
  context.keydown({...event,isComposing:true});context.keydown({...event,keyCode:229});assert.equal(history.past.length,0);
  context.keydown(event);assert.equal(history.current.equipment[0].name,'한글 설비');assert.equal(history.past.length,1);
});
