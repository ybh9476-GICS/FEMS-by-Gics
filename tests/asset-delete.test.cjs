const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),P=require('../js/project-file.js'),C=require('../js/catalog.js');
const asset={type:'asset-delete-test',name:'삭제 검증',width:1,depth:1,height:1};
function state(){return P.attach(M.empty(),[asset]);}

test('추가 설비 삭제는 프로젝트 목록만 변경하고 한 번의 실행 취소·다시 실행 및 파일 저장에 반영된다',async()=>{
  const original=state(),h=new M.History(original);h.commit(M.removeAsset(h.current,asset.type));
  assert.equal(h.current.project.assets.length,0);assert.deepEqual(h.current.equipment,original.equipment);
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(h.current))),h.current);
  const packed=await P.encode(h.current,()=>{throw Error('삭제된 에셋은 읽으면 안 됩니다.');});
  assert.equal((await P.decode(packed.bytes)).drawing.project.assets.length,0);
  h.undo();assert.deepEqual(h.current,original);h.redo();assert.equal(h.current.project.assets.length,0);
  assert.equal(original.project.assets.length,1);
});
test('기본 설비는 목록 삭제를 차단한다',()=>{
  const s=state();C.replace(s.project.assets);s.equipment.push(M.create(asset.type,s));
  const before=M.clone(s);
  assert.throws(()=>M.removeAsset(s,'tower'),/추가 설비/);assert.equal(C.builtin.length,9);C.replace([]);
  assert.deepEqual(s,before);
});
test('추가 설비의 모든 배치를 함께 삭제하고 다른 종류의 자식과 연결망은 보존하며 한 번에 복원한다',()=>{
  const L=require('../js/connections.js'),s=state();C.replace(s.project.assets);
  function add(type,x,z,parent){const e=M.create(type,s);Object.assign(e,{x,z});if(parent)e.parentId=parent.id;s.equipment.push(e);return e;}
  const root=add('tower',-15,-10),a=add(asset.type,-5,-10,root),b=add(asset.type,5,-10,a),child=add('panel',15,-10,b);
  const other=add('receiving',-15,10);add('mcc',15,10,other);
  const original=M.validate(L.enableShared(s)),h=new M.History(original);
  const expected=M.removeEquipmentGroup(original,[a.id,b.id]);expected.project.assets=[];
  h.commit(M.removeAsset(h.current,asset.type));assert.deepEqual(h.current,expected);
  assert.equal(h.current.equipment.length,4);assert.equal(h.current.equipment.find(e=>e.id===child.id).parentId,root.id);
  assert.deepEqual(h.current.equipment.find(e=>e.id===other.id),other);
  assert.deepEqual(M.validate(h.current),h.current);
  const deleted=M.clone(h.current);h.undo();assert.deepEqual(h.current,original);h.redo();assert.deepEqual(h.current,deleted);
  assert.equal(original.equipment.length,6);C.replace([]);
});
function setup(){
  const nodes=new Map(),node=()=>({children:[],dataset:{},events:{},attrs:{},hidden:false,open:false,
    setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.events[k]=fn;},replaceChildren(...items){this.children=items;},append(child){this.children.push(child);},showModal(){this.open=true;},close(){this.open=false;this.events.close?.();}});
  const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
  const context={window:{FEMSCatalog:C,FEMSAssets:{load:async()=>({object:{}}),picture:()=>''},FEMSNumberScrub:{install(){}},addEventListener(){}},document:{getElementById:get,createElement:node}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/asset-library.js'),'utf8'),context);
  const h=new M.History(state());C.replace(h.current.project.assets);let removed=0,armed=0;
  const library=new context.window.FEMSAssetLibrary({icon:()=>'',arm(){armed++;},toast(){},state:()=>h.current,remove:type=>{removed++;return h.commit(M.removeAsset(h.current,type));}});
  return {get,h,library,get removed(){return removed;},get armed(){return armed;}};
}
test('썸네일 ×는 배치 버튼과 분리되고 팝업 확인 전·취소·Esc에는 삭제하지 않는다',async()=>{
  const f=setup();f.library.filter='custom';f.library.render(null);await f.library.queue;
  const tile=f.get('catalog').children[0],button=tile.children[0],remove=tile.children[1];
  assert.equal(remove.textContent,'×');assert.equal(remove.attrs['aria-label'],'삭제 검증 추가 설비 삭제');assert.equal(remove.attrs['aria-pressed'],undefined);
  let stopped=false;remove.events.click({stopPropagation(){stopped=true;}});assert.ok(stopped);assert.ok(f.get('asset-delete-dialog').open);assert.equal(f.removed,0);assert.equal(f.armed,1);
  f.get('asset-delete-cancel').events.click();assert.equal(f.removed,0);assert.equal(f.library.pendingRemove,null);
  f.library.askRemove(asset);f.get('asset-delete-dialog').close();assert.equal(f.removed,0);
  f.library.askRemove(asset);f.get('asset-delete-confirm').events.click();assert.equal(f.removed,1);assert.equal(f.h.current.project.assets.length,0);assert.equal(f.get('asset-delete-dialog').open,false);
  f.library.filter='builtin';f.library.render(null);assert.equal(f.get('catalog').children.length,9);assert.ok(f.get('catalog').children.every(n=>n.className==='equipment-thumbnail'));
  assert.equal(button.draggable,true);C.replace([]);
});
test('배치 수 경고 후 확인할 때만 함께 삭제하며 프로젝트가 바뀌면 차단한다',()=>{
  const f=setup(),s=M.clone(f.h.current);s.equipment.push(M.create(asset.type,s));f.h.commit(s);f.library.askRemove(asset);
  assert.equal(f.get('asset-delete-confirm').hidden,false);assert.match(f.get('asset-delete-message').textContent,/1개도 함께 삭제/);
  assert.equal(f.h.current.equipment.length,1);f.library.confirmRemove();assert.equal(f.h.current.project.assets.length,0);assert.equal(f.h.current.equipment.length,0);
  f.h.undo();f.library.askRemove(asset);const other=M.clone(f.h.current);other.project.id='different-project';f.h.commit(other);const attempts=f.removed;
  f.library.confirmRemove();assert.equal(f.removed,attempts);assert.match(f.get('asset-delete-error').textContent,/목록이 변경/);C.replace([]);
});
