const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),F=require('../js/files.js'),P=require('../js/project-file.js');
const source=fs.readFileSync('js/app.js','utf8');
function fixture(){
  const history=new M.History(M.demo()),nodes=new Map();
  const ctx={M,history,$:id=>{if(!nodes.has(id))nodes.set(id,{value:'',handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},removeAttribute(){this.invalid=false;},setAttribute(){this.invalid=true;}});return nodes.get(id);},commit(next){history.commit(next);return true;}};
  vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('  let propertyEdit ='),source.indexOf('  function cancelNameEdit()'))+'\nprojectSelected=true;',ctx);
  vm.runInContext(source.slice(source.indexOf("  $('project-properties').addEventListener('input'"),source.indexOf("  document.addEventListener('pointerdown',event=>{if(event.target")),ctx);
  const input=ctx.$('project-title');
  return {history,input,edit(value){input.value=value;ctx.$('project-properties').handlers.input();},key(key,extra={}){input.handlers.keydown({key,preventDefault(){},stopPropagation(){},...extra});}};
}
test('프로젝트 이름은 Enter로만 적용하며 Esc·포커스 이탈은 취소하고 실행 취소로 복원한다',()=>{
  const f=fixture(),before=M.clone(f.history.current);
  f.edit('프로젝트 A');assert.deepEqual(f.history.current,before);
  f.key('Enter',{isComposing:true});assert.deepEqual(f.history.current,before);
  f.key('Enter');assert.equal(f.history.current.name,'프로젝트 A');assert.deepEqual(f.history.current.equipment,before.equipment);
  f.edit('취소');f.key('Escape');assert.equal(f.input.value,'프로젝트 A');
  f.edit('다른 곳 클릭');f.input.handlers.blur();assert.equal(f.input.value,'프로젝트 A');assert.equal(f.history.past.length,1);
  f.history.undo();assert.deepEqual(f.history.current,before);f.history.redo();assert.equal(f.history.current.name,'프로젝트 A');
});
test('프로젝트 이름 공백·길이 오류는 원본을 보존하고 수정 후 다시 적용할 수 있다',()=>{
  const f=fixture(),name=f.history.current.name;
  for(const invalid of [' ', '가'.repeat(81)]){f.edit(invalid);f.key('Enter');assert.equal(f.input.invalid,true);assert.equal(f.history.current.name,name);}
  f.edit('  정상 이름  ');f.key('Enter');assert.equal(f.history.current.name,'정상 이름');assert.equal(f.input.invalid,false);
});
test('프로젝트 이름과 저장 파일명은 독립적이며 파일을 다시 읽어도 내부 이름을 유지한다',async()=>{
  const f=fixture();f.edit('공장 프로젝트');f.key('Enter');let bytes;
  const picker=async options=>{assert.equal(options.suggestedName,'FEMS 프로젝트.fems');return {name:'고객에게 전달할 파일.fems',createWritable:async()=>({write:async value=>bytes=value,close:async()=>{}})};};
  await F.save(f.history.current,picker);assert.equal((await P.decode(bytes)).drawing.name,'공장 프로젝트');
  f.edit('이름 변경');f.key('Enter');await F.save(f.history.current,picker);assert.equal((await P.decode(bytes)).drawing.name,'이름 변경');
});
