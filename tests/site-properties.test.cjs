const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),S=require('../js/spatial.js'),L=require('../js/connections.js'),P=require('../js/project-file.js'),G=require('../js/schematic-layout.js');
test('기존 대지는 이름 없이 호환되며 이름 변경은 배치·연결·계통 경로·파일 저장에 안전하다',async()=>{
  const before=M.validate(L.upgradePower(S.upgrade(L.enableShared(M.demo()))));
  assert.equal(before.site.name,undefined);assert.equal(S.treeState(before).equipment[0].name,'대지');
  const h=new M.History(before),renamed=M.renameSite(before,'  공장 A  ');h.commit(renamed);
  assert.equal(renamed.site.name,'공장 A');assert.deepEqual(renamed.equipment,before.equipment);assert.deepEqual(renamed.networks,before.networks);
  assert.equal(S.treeState(renamed).equipment[0].name,'공장 A');assert.ok(G.graph(renamed).nodes.every(n=>n.space==='공장 A'));
  const resized=M.resizeSite(renamed,100,80);assert.equal(resized.site.name,'공장 A');h.commit(resized);
  const encoded=await P.encode(resized),decoded=await P.decode(encoded.bytes);assert.deepEqual(decoded.drawing.site,resized.site);
  h.undo();assert.deepEqual(h.current,renamed);h.undo();assert.deepEqual(h.current,before);h.redo();assert.deepEqual(h.current,renamed);
  for(const name of ['', '  ', '가'.repeat(81),null,123])assert.throws(()=>M.renameSite(before,name),/대지 이름/);
  assert.equal(M.validate(before).site.name,undefined);assert.deepEqual(M.validate(before),before);
});
function fixture(){
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',hidden:false,handlers:{},attrs:{},get valueAsNumber(){return this.value===''?NaN:Number(this.value);},addEventListener(key,fn){this.handlers[key]=fn;},setAttribute(key,value){this.attrs[key]=value;},removeAttribute(key){delete this.attrs[key];}});return nodes.get(id);};
  const window={FEMSModel:M},history=new M.History(M.demo());let selected=true;
  vm.runInNewContext(fs.readFileSync('js/site-properties.js','utf8'),{window,document:{getElementById:get}});
  const ui=new window.FEMSSiteProperties({state:()=>history.current,selected:()=>selected,commit(next){history.commit(next);ui.render();return true;}});ui.render();
  const event=(id,key,extra={})=>get(id).handlers[key]({preventDefault(){},stopPropagation(){},...extra});
  return {ui,get,history,event,select(value){selected=value;ui.render();}};
}

test('대지 크기는 두 자리로 표시하며 미수정 축과 적용 시 원본 정밀도를 유지한다',()=>{
  const {ui,get,history,event}=fixture(),next=M.clone(history.current);
  next.site.width=60.123456;next.site.depth=40.654321;history.commit(next);ui.render();
  assert.equal(get('site-width').value,60.12);assert.equal(get('site-depth').value,40.65);
  event('site-form','submit');assert.deepEqual(history.current.site,next.site);
  get('site-width').value='70.123456';event('site-form','input');event('site-form','submit');
  assert.equal(history.current.site.width,70.123456);assert.equal(history.current.site.depth,40.654321);
  assert.equal(get('site-width').value,70.12);
});
test('대지 패널 이름 Enter·IME·Esc·포커스 이탈과 크기 적용·취소·실행 취소를 검증한다',()=>{
  const {ui,get,history,event,select}=fixture(),before=M.clone(history.current);
  assert.equal(get('site-properties').hidden,false);assert.equal(get('properties').hidden,true);assert.equal(get('site-area').textContent,'2,400 m²');
  get('site-name').value='대지 A';event('site-name','input');event('site-name','keydown',{key:'Enter',isComposing:true});assert.deepEqual(history.current,before);
  event('site-name','keydown',{key:'Enter'});assert.equal(history.current.site.name,'대지 A');
  get('site-name').value='취소';event('site-name','input');event('site-name','keydown',{key:'Escape'});assert.equal(get('site-name').value,'대지 A');
  get('site-name').value='포커스 이탈';event('site-name','input');event('site-name','blur');assert.equal(get('site-name').value,'대지 A');
  get('site-width').value='100';get('site-depth').value='80';event('site-form','input');assert.equal(get('site-area').textContent,'8,000 m²');assert.equal(history.current.site.width,60);
  event('site-form','submit');assert.equal(history.current.site.width,100);assert.equal(history.current.site.name,'대지 A');assert.deepEqual(history.current.equipment,before.equipment);
  get('site-width').value='150';event('site-form','input');event('site-cancel','click');assert.equal(get('site-width').value,100);
  history.undo();ui.render();assert.equal(get('site-width').value,60);history.redo();ui.render();assert.equal(get('site-width').value,100);
  get('site-width').value='120';event('site-form','input');select(false);select(true);assert.equal(get('site-width').value,100);
  get('site-name').value=' ';event('site-name','input');event('site-name','keydown',{key:'Enter'});assert.equal(history.current.site.name,'대지 A');assert.equal(get('site-name').attrs['aria-invalid'],'true');
});
test('대지 축소 오류는 원본과 히스토리를 유지하며 입력 중 전역 삭제·실행 취소를 차단한다',()=>{
  const {get,history,event}=fixture(),before=M.clone(history.current);
  get('site-width').value='1';get('site-depth').value='1';event('site-form','input');event('site-form','submit');
  assert.match(get('site-error').textContent,/대지 밖/);assert.deepEqual(history.current,before);assert.equal(history.past.length,0);
  for(const key of ['Delete','r','Escape','z','s']){let stopped=false,prevented=false;event('site-properties','keydown',{key,ctrlKey:['z','s'].includes(key),stopPropagation(){stopped=true;},preventDefault(){prevented=true;}});assert.ok(stopped);if(['z','s'].includes(key))assert.ok(prevented);}
});
