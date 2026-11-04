const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../js/catalog.js');
test('동일 ID의 다른 프로젝트 모델은 늦게 도착한 썸네일과 실행 취소 후에도 섞이지 않는다',async()=>{
  const nodes=new Map();
  const node=()=>({children:[],dataset:{},setAttribute(){},addEventListener(){},replaceChildren(...children){this.children=children;},append(child){this.children.push(child);}});
  const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
  let resolveFirst,firstStarted;
  const started=new Promise(resolve=>firstStarted=resolve),first=new Promise(resolve=>resolveFirst=resolve);
  const ctx={window:{FEMSCatalog:C,FEMSAssets:{load:async type=>{const hash=C.get(type).sha256;if(hash==='a'.repeat(64)){firstStarted();await first;}return {object:hash};},picture:object=>object}},document:{getElementById:get,createElement:node}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/asset-library.js'),'utf8'),ctx);
  const library=Object.assign(Object.create(ctx.window.FEMSAssetLibrary.prototype),{filter:'custom',signature:'',images:{},imageJobs:new Set(),queue:Promise.resolve(),handlers:{icon:()=>'',arm(){}}});
  const a={type:'asset-same',name:'A',width:1,depth:1,height:1,sha256:'a'.repeat(64)},b={...a,name:'B',sha256:'b'.repeat(64)};
  C.replace([a]);library.render(null);await started;
  C.replace([b]);library.render(null);resolveFirst();await library.queue;
  assert.equal(get('catalog').children[0].children[0].src,b.sha256);
  C.replace([a]);library.render(null);await library.queue;
  assert.equal(get('catalog').children[0].children[0].src,a.sha256);
  // A job skipped before loading must be retried when that project returns.
  const c={...a,type:'asset-skipped',sha256:'c'.repeat(64)};
  C.replace([c]);library.render(null);C.replace([]);library.render(null);await library.queue;
  C.replace([c]);library.render(null);await library.queue;
  assert.equal(get('catalog').children[0].children[0].src,c.sha256);C.replace([]);
});
