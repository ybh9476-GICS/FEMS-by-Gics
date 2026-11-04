const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const release=require('../scripts/version-assets.cjs');
test('배포 HTML의 모든 스타일·스크립트 주소는 현재 코드의 버전을 사용한다',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.equal(html,release.expected(),'배포 전 npm run version:assets를 실행하세요.');
  const urls=[...html.matchAll(/(?:src|href)="((?:js|css|vendor)\/[^" ]+\.(?:js|css)(?:\?[^" ]*)?)"/g)].map(match=>match[1]);
  assert.ok(urls.length>20);
  for(const url of urls)assert.ok(url.endsWith('?v='+release.version()),url);
  assert.equal(release.stamp(html,release.version()),html);
});
test('비동기 에셋 초기화 후에도 app.js는 시작 스크립트와 같은 버전으로 요청한다',async()=>{
  for(const base of ['https://example.github.io/FEMS-by-Gics/','http://127.0.0.1:4175/']){
    let resolve;const appended=[];
    const context={URL,window:{FEMSCatalog:{catalog:[]},FEMSProjectFile:{revision:async()=> 'a'.repeat(64)},FEMSAssets:{initialize:()=>new Promise(done=>{resolve=done;})}},document:{currentScript:{src:base+'js/startup.js?v=abc123'},createElement:()=>({}),head:{append:script=>appended.push(script)}}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/startup.js'),'utf8'),context);
    assert.equal(appended.length,0);
    context.document.currentScript=null;resolve('');await new Promise(done=>setImmediate(done));
    assert.equal(appended.length,1);assert.equal(String(appended[0].src),base+'js/app.js?v=abc123');
  }
});
