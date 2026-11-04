const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const F=require('../js/asset-format.js');

// All destinations are generated here; clients cannot choose a filesystem path.
async function store(root,raw){
  const entry=F.metadata({...raw,type:'asset-'+randomUUID()});
  if(typeof raw.glb!=='string'||raw.glb.length>Math.ceil(F.MAX_BYTES/3)*4||raw.glb.length%4||/[^A-Za-z0-9+/=]/.test(raw.glb))throw new Error('GLB 데이터가 올바르지 않습니다.');
  const buffer=Buffer.from(raw.glb,'base64');if(buffer.toString('base64')!==raw.glb)throw new Error('GLB 데이터가 올바르지 않습니다.');F.inspect(buffer);
  const base=await fs.realpath(root);
  for(const relative of ['assets','assets/equipment']){
    const folder=path.join(base,relative);await fs.mkdir(folder).catch(error=>{if(error.code!=='EEXIST')throw error;});
    if(await fs.realpath(folder)!==folder)throw new Error('연결된 폴더에는 에셋을 저장할 수 없습니다.');
  }
  const directory=path.join(base,'assets/equipment'),index=path.join(directory,'index.json');
  let old={version:1,assets:[]};
  try{if(await fs.realpath(index)!==index)throw new Error('연결된 등록 목록은 수정할 수 없습니다.');old=JSON.parse(await fs.readFile(index,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const entries=F.manifest(old);if(entries.length>=300)throw new Error('추가 에셋은 최대 300개까지 등록할 수 있습니다.');
  const assetDir=path.join(directory,entry.type),temp=path.join(directory,`.index-${randomUUID()}.tmp`);
  await fs.mkdir(assetDir);
  try{
    await fs.writeFile(path.join(assetDir,'model.glb'),buffer,{flag:'wx'});
    await fs.writeFile(temp,JSON.stringify({version:1,assets:[...entries,entry]},null,2)+'\n',{flag:'wx'});
    await fs.rename(temp,index);
  }catch(error){
    await fs.unlink(temp).catch(()=>{});await fs.unlink(path.join(assetDir,'model.glb')).catch(()=>{});await fs.rmdir(assetDir).catch(()=>{});throw error;
  }
  return entry;
}
module.exports={store};
