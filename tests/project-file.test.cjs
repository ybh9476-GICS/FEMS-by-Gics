const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/model.js'),C=require('../js/catalog.js'),P=require('../js/project-file.js'),F=require('../js/files.js');
const {glb}=require('./helpers/glb.cjs');
function project(){
  const assets=['asset-pump-a','asset-pump-b','asset-unused'].map(type=>({type,name:type,en:'',width:1,depth:1,height:1}));
  C.register(assets);const state=P.attach(M.demo(),assets);
  state.equipment.push(M.create(assets[0].type,state),M.create(assets[0].type,state),M.create(assets[1].type,state));
  return M.validate(state);
}
test('압축 프로젝트는 미배치 에셋까지 포함하고 동일 모델 바이트는 한 번만 저장한다',async()=>{
  const state=project(),before=M.clone(state),model=glb();
  const packed=await P.encode(state,async()=>model),restored=await P.decode(packed.bytes);
  assert.equal(packed.assetCount,3);assert.equal(packed.uniqueModels,1);assert.equal(restored.blobs.size,1);
  assert.deepEqual(restored.drawing.equipment,state.equipment);assert.deepEqual(restored.drawing.site,state.site);
  assert.equal(restored.drawing.project.kind,'file');assert.equal(restored.drawing.project.assets.length,3);
  assert.deepEqual([...restored.blobs.values()][0],new Uint8Array(model));assert.deepEqual(state,before);
  C.replace([]); // Models are recoverable without the original server catalog.
  const again=await P.encode(restored.drawing,entry=>restored.blobs.get(entry.sha256));
  assert.deepEqual((await P.decode(again.bytes)).drawing,restored.drawing);
});
test('구형 JSON 도면도 읽고 손상·누락·변조된 압축 모델은 적용 전에 거부한다',async()=>{
  const state=project(),packed=await P.encode(state,async()=>glb());
  const legacy=await P.decode(new TextEncoder().encode(JSON.stringify(M.demo())));assert.equal(legacy.legacy,true);
  await assert.rejects(()=>P.decode(packed.bytes.slice(0,packed.bytes.length-5)));
  const inflate=require('node:zlib').gunzipSync(packed.bytes),n=inflate.readUInt32LE(0),manifest=JSON.parse(inflate.subarray(4,4+n));
  manifest.drawing.project.assets[0].sha256='0'.repeat(64);
  const header=Buffer.from(JSON.stringify(manifest)),prefix=Buffer.alloc(4);prefix.writeUInt32LE(header.length);
  await assert.rejects(()=>P.decode(require('node:zlib').gzipSync(Buffer.concat([prefix,header,inflate.subarray(4+n)]))),/누락|다릅니다/);
  const corrupt=Buffer.from(inflate);corrupt[corrupt.length-1]^=1;
  await assert.rejects(()=>P.decode(require('node:zlib').gzipSync(corrupt)),/검증|GLB/);
});
test('누락된 추가 설비·모델 읽기 실패 시 불완전한 프로젝트를 저장하지 않는다',async()=>{
  const state=project();let writes=0;
  await assert.rejects(()=>F.save(state,async()=>({createWritable:async()=>{writes++;}}),async()=>{throw Error('missing model');}),/missing model/);
  assert.equal(writes,0);
  state.project.assets=[];await assert.rejects(()=>P.encode(state),/원본이 없습니다/);
});
test('새 도면은 도면·에셋 목록만 초기화하며 실행 취소·다시 실행과 저장 복원에 함께 포함된다',()=>{
  const state=project(),h=new M.History(state),empty=P.attach(M.empty(),[],'new','a'.repeat(64));
  h.commit(empty);C.replace(h.current.project.assets);assert.equal(C.catalog.length,9);assert.equal(h.current.equipment.length,0);
  h.undo();C.replace(h.current.project.assets);assert.equal(C.catalog.length,12);assert.deepEqual(h.current,state);
  h.redo();assert.deepEqual(M.validate(JSON.parse(JSON.stringify(h.current))),empty);
});
test('기본값 지문은 도면이나 추가 에셋 구성이 바뀔 때 달라진다',async()=>{
  const state=project(),a=await P.revision(state,state.project.assets),next=M.clone(state);next.site.width+=1;
  assert.notEqual(await P.revision(next,state.project.assets),a);
  assert.notEqual(await P.revision(state,[]),a);assert.equal(await P.revision(M.clone(state),state.project.assets),a);
});
