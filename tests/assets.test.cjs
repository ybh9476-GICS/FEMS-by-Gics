const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const F=require('../js/asset-format.js'),C=require('../js/catalog.js'),M=require('../js/model.js'),D=require('../js/defaults.js');
const {glb}=require('./helpers/glb.cjs'),{createServer}=require('../scripts/local-server.cjs');

test('GLB 내부 텍스처 검증 및 외부 경로·압축·손상 차단',()=>{
  assert.equal(F.inspect(glb()).images[0].mimeType,'image/png');
  for(const edit of [j=>({...j,images:[{uri:'https://example.com/texture.png'}]}),j=>({...j,buffers:[{uri:'../other.bin'}]}),j=>({...j,extensionsUsed:['KHR_draco_mesh_compression']})])assert.throws(()=>F.inspect(glb(edit)));
  const broken=glb();broken.writeUInt32LE(1,8);assert.throws(()=>F.inspect(broken));assert.throws(()=>F.inspect(Buffer.alloc(10)));
  assert.throws(()=>F.metadata({type:'../escape',name:'test',width:1,depth:1,height:1}));
});
test('추가 에셋 등록·도면 저장·누락 에셋·기본 예시 호환',()=>{
  const before=M.demo().equipment.map(e=>e.type),def=F.metadata({type:'asset-unit-test',name:'테스트 설비',en:'Test',width:2,depth:6,height:4});C.register([def]);
  let state=M.empty();state.equipment.push(M.create(def.type,state));state.equipment.push(M.create(def.type,state,8,0));
  assert.equal(state.equipment[1].name,'테스트 설비(1)');assert.equal(state.equipment[0].code,'');
  state=M.reparent(state,state.equipment[1].id,state.equipment[0].id);assert.deepEqual(M.validate(JSON.parse(JSON.stringify(state))),state);
  assert.match(D.serialize(state),/asset-unit-test/);assert.deepEqual(M.demo().equipment.map(e=>e.type),before);
  state.equipment[0].type='asset-not-present';assert.deepEqual(M.validate(state),state);assert.equal(C.get('asset-not-present').missing,true);
  assert.throws(()=>M.validate({...state,equipment:[{...state.equipment[0],type:'arbitrary'}]}));
});
test('에셋 API는 동일 출처에서만 등록하고 재시작·정적 배포용 파일을 보존한다',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'fems-assets-')),server=createServer(root);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  const bytes=glb(),body=JSON.stringify({name:'검증 설비',en:'Asset',width:2,depth:6,height:4,glb:bytes.toString('base64'),model:'../../outside.glb'});
  const post=(payload=body,headers={})=>fetch(origin+'/api/assets',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:payload});
  try{
    assert.equal((await post(body,{Origin:'https://evil.example'})).status,403);
    assert.equal((await post(body,{'Content-Type':'text/plain'})).status,415);
    assert.equal((await post('{}')).status,400);
    const response=await post();assert.equal(response.status,201);const entry=await response.json();assert.ok(F.isId(entry.type));
    assert.deepEqual(await fs.readFile(path.join(root,entry.model)),bytes);
    const manifest=await (await fetch(origin+'/assets/equipment/index.json')).json();assert.equal(manifest.assets[0].type,entry.type);assert.equal(F.manifest(manifest).length,1);
    const model=await fetch(origin+'/'+entry.model);assert.equal(model.headers.get('content-type'),'model/gltf-binary');assert.deepEqual(Buffer.from(await model.arrayBuffer()),bytes);
    assert.equal((await fetch(origin+'/assets/equipment/../../outside.glb')).status,404);
    const second=await post();assert.equal(second.status,201);assert.equal((await second.json()).name,entry.name);
    assert.equal(JSON.parse(await fs.readFile(path.join(root,'assets/equipment/index.json'),'utf8')).assets.length,2);
  }finally{
    await new Promise(resolve=>server.close(resolve));
    // Only remove files created in this test's newly allocated directory.
    const directory=path.join(root,'assets/equipment');
    for(const name of await fs.readdir(directory).catch(()=>[])){const target=path.join(directory,name);if(name.startsWith('asset-')){await fs.unlink(path.join(target,'model.glb'));await fs.rmdir(target);}else await fs.unlink(target);}
    await fs.rmdir(directory).catch(()=>{});await fs.rmdir(path.join(root,'assets')).catch(()=>{});await fs.rmdir(root);
  }
});
