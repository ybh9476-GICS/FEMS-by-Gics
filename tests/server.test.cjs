const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {createServer}=require('../scripts/local-server.cjs');
test('로컬 서버는 앱 파일만 읽고 쓰기·외부 호스트·숨김 경로를 거부한다',async()=>{
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
  function request(url,options={}){return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path:url,...options},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.end();});}
  try{const index=await request('/');assert.equal(index.status,200);assert.match(index.body,/FEMS by Gics/);assert.equal(index.headers['cache-control'],'no-store');
    assert.equal((await request('/js/catalog.js')).status,200);assert.equal((await request('/vendor/three.js')).status,200);
    assert.equal((await request('/',{method:'POST'})).status,405);assert.equal((await request('/',{headers:{Host:'example.com'}})).status,403);
    assert.equal((await request('/%2e%2e/package.json')).status,403);assert.equal((await request('/.git/config')).status,403);assert.equal((await request('/package.json')).status,404);
    assert.equal((await request('/js/%5c..%5cindex.html')).status,403);assert.equal((await request('/',{method:'HEAD'})).body,'');
  }finally{await new Promise(resolve=>server.close(resolve));}
});
