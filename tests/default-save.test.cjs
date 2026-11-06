const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {createServer}=require('../scripts/local-server.cjs');
const M=require('../js/model.js'),D=require('../js/defaults.js');
const L=require('../js/connections.js');

test('기본 도면 저장은 동일 출처의 검증된 데이터만 고정 파일에 원자적으로 기록한다',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'fems-default-'));
  await fs.mkdir(path.join(root,'js'));
  const target=path.join(root,'js/default-layout.js');
  await fs.writeFile(target,'original');
  const server=createServer(root);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port,origin=`http://127.0.0.1:${port}`;
  function request(body,headers={},url='/api/default-layout'){
    return new Promise((resolve,reject)=>{
      const req=http.request({hostname:'127.0.0.1',port,path:url,method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers}},res=>{
        let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,text}));
      });req.on('error',reject);req.end(body);
    });
  }
  try{
    const demo=M.demo(),parent=demo.equipment[0],child=demo.equipment[1];
    const state=L.enableShared(L.setSegmentColor(M.reparent(demo,child.id,parent.id),child.id,0,'#dc2626')),body=JSON.stringify(state);
    for(const [headers,status] of [[{Origin:'https://example.com'},403],[{Origin:'null'},403],[{Origin:''},403],[{'Sec-Fetch-Site':'cross-site'},403],[{'Content-Type':'text/plain'},415],[{Host:'example.com'},403],[{Host:'127.0.0.1:1',Origin:'http://127.0.0.1:1'},403]]){
      assert.equal((await request(body,headers)).status,status);
      assert.equal(await fs.readFile(target,'utf8'),'original');
    }
    for(const invalid of ['{broken','{}',JSON.stringify({...state,equipment:[{id:'bad'}]})]){
      const rejected=await request(invalid);assert.equal(rejected.status,400);assert.match(rejected.text,/^저장 오류: /);
      assert.equal(await fs.readFile(target,'utf8'),'original');
    }
    assert.equal((await request(' '.repeat(2*1024*1024+1))).status,413);
    assert.equal((await request(body,{},'/api/default-layout?path=other.js')).status,405);
    assert.equal(await fs.readFile(target,'utf8'),'original');
    assert.equal((await request(body)).status,200);
    assert.equal(await fs.readFile(target,'utf8'),D.serialize(state));
    assert.deepEqual(await fs.readdir(path.join(root,'js')),['default-layout.js']);
    // A missing target must not silently create or redirect the fixed file.
    await fs.rename(target,target+'.backup');
    const missing=await request(body);assert.equal(missing.status,500);assert.match(missing.text,/파일 또는 저장 폴더가 없습니다/);
    assert.equal(await fs.readFile(target+'.backup','utf8'),D.serialize(state));
  }finally{
    await new Promise(resolve=>server.close(resolve));
    for(const file of await fs.readdir(path.join(root,'js')))await fs.unlink(path.join(root,'js',file));
    await fs.rmdir(path.join(root,'js'));await fs.rmdir(root);
  }
});
