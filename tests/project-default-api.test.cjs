const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const M=require('../js/model.js'),P=require('../js/project-file.js');
const {store}=require('../scripts/asset-store.cjs'),{createServer}=require('../scripts/local-server.cjs'),{glb}=require('./helpers/glb.cjs');

test('기본 도면 API는 프로젝트 에셋 목록을 보존하고 파일 모드·누락 원본·다른 원본은 덮어쓰기 전에 거부한다',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'fems-project-default-'));
  await fs.mkdir(path.join(root,'js'));
  const model=glb(),entry=await store(root,{name:'펌프',width:1,depth:1,height:1,glb:model.toString('base64')});
  const server=createServer(root);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`,target=path.join(root,'js/default-layout.js');
  await fs.writeFile(target,'original');
  const post=state=>fetch(origin+'/api/default-layout',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(state)});
  try{
    const state=P.attach(M.demo(),[{...entry,sha256:await P.hash(model)}],'new','a'.repeat(64));
    assert.equal((await post(state)).status,200);
    const source=await fs.readFile(target,'utf8'),context={window:{}};vm.runInNewContext(source,context);
    assert.deepEqual(JSON.parse(JSON.stringify(context.window.FEMSDefaultLayout)),state);
    for(const change of [s=>s.project.kind='file',s=>s.project.assets[0].sha256='0'.repeat(64),s=>s.project.assets[0].type='asset-absent']){
      const invalid=M.clone(state);change(invalid);assert.equal((await post(invalid)).status,400);assert.equal(await fs.readFile(target,'utf8'),source);
    }
  }finally{
    await new Promise(resolve=>server.close(resolve));
    await fs.unlink(target).catch(()=>{});await fs.rmdir(path.join(root,'js'));
    await fs.unlink(path.join(root,entry.model));await fs.rmdir(path.dirname(path.join(root,entry.model)));
    await fs.unlink(path.join(root,'assets/equipment/index.json'));await fs.rmdir(path.join(root,'assets/equipment'));await fs.rmdir(path.join(root,'assets'));await fs.rmdir(root);
  }
});
