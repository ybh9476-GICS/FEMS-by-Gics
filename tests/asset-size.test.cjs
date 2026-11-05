const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js');
function setup(){
  const elements={'asset-kind':{value:'equipment'},'asset-lock-ratio':{checked:true},'asset-size-error':{textContent:''},'asset-name':{value:'펌프'},'asset-en':{value:''}};
  for(const [name,value] of Object.entries({width:2,depth:4,height:3}))elements['asset-'+name]={name,value,min:'.2',max:name==='height'?'40':'30',get valueAsNumber(){return this.value===''?NaN:Number(this.value);},setCustomValidity(message){this.error=message;},setAttribute(){},removeAttribute(){}};
  const window={FEMSModel:M};vm.runInNewContext(fs.readFileSync(require.resolve('../js/asset-library.js'),'utf8'),{window,document:{getElementById:id=>elements[id]},setTimeout:()=>0,clearTimeout(){}});
  const library=Object.create(window.FEMSAssetLibrary.prototype);library.dimensions={width:2,depth:4,height:3};library.updatePicture=()=>{};
  const edit=(name,value)=>{const input=elements['asset-'+name];input.value=value;library.resize(input);};
  return {library,elements,edit};
}
test('에셋 치수 입력은 같은 편집 기준으로 비율을 유지하고 등록 값에 반영된다',()=>{
  const {library,edit}=setup();edit('width','3');edit('width','4');library.finishResize();
  assert.deepEqual(JSON.parse(JSON.stringify(library.values())),{kind:'equipment',name:'펌프',en:'',width:4,depth:8,height:6});
});
test('에셋 비율 고정 해제는 한 축만 변경한다',()=>{
  const {library,elements,edit}=setup();elements['asset-lock-ratio'].checked=false;edit('depth','5');library.finishResize();
  assert.equal(library.values().width,2);assert.equal(library.values().depth,5);assert.equal(library.values().height,3);
});
test('드래그 취소는 연동된 세 치수를 함께 복원한다',()=>{
  const {library,edit}=setup();edit('height','6');library.finishResize(false);
  assert.equal(library.values().width,2);assert.equal(library.values().depth,4);assert.equal(library.values().height,3);
});
test('비율 연동 범위 초과와 빈 값은 마지막 유효 치수를 보존한다',()=>{
  const {library,elements,edit}=setup();edit('width','20');assert.ok(elements['asset-width'].error);library.finishResize();
  assert.equal(library.values().width,2);assert.equal(library.values().depth,4);
  edit('height','');assert.ok(elements['asset-height'].error);library.finishResize();assert.equal(library.values().height,3);
});
