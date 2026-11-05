(function(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const M=node?require('./model.js'):root.FEMSModel,F=node?require('./asset-format.js'):root.FEMSAssetFormat;
  const MAX_BYTES=256*1024*1024,HEADER_LIMIT=2*1024*1024;
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  function attach(state,assets=[],kind='new',baseRevision=''){
    const next=M.clone(state);
    next.project??={id:crypto.randomUUID(),kind,baseRevision,assets};
    return M.validate(next);
  }
  async function revision(state,assets){return hash(new TextEncoder().encode(JSON.stringify({drawing:state,assets})));}
  async function collect(stream,limit){
    const reader=stream.getReader(),chunks=[];let size=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new Error('프로젝트는 압축 해제 기준 256 MB까지 지원합니다.');chunks.push(value);}}
    catch(error){await reader.cancel().catch(()=>{});throw error;}
    const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
  }
  async function encode(state,readAsset){
    const drawing=attach(state),assets=drawing.project.assets,blobs=new Map();let size=0;
    drawing.project.kind='file';
    for(const entry of assets){
      if(typeof readAsset!=='function')throw new Error('추가 에셋 파일을 읽을 수 없습니다.');
      const bytes=new Uint8Array(await readAsset(entry));F.inspect(bytes);
      const digest=await hash(bytes);if(entry.sha256&&entry.sha256!==digest)throw new Error(entry.name+': 모델 파일이 변경되었습니다.');
      entry.sha256=digest;
      if(!blobs.has(digest)){size+=bytes.length;if(size>MAX_BYTES-HEADER_LIMIT)throw new Error('추가 에셋 합계가 256 MB를 초과합니다.');blobs.set(digest,bytes);}
    }
    for(const item of [...drawing.equipment,...drawing.buildings||[],...drawing.floors||[]])if(F.isId(item.type)&&!assets.some(a=>a.type===item.type))throw new Error(item.name+': 추가 에셋 원본이 없습니다. 원본 프로젝트에서 다시 저장하세요.');
    const header=new TextEncoder().encode(JSON.stringify({format:'gics-fems-project',version:1,drawing,blobs:[...blobs].map(([sha256,bytes])=>({sha256,size:bytes.length}))}));
    if(header.length>HEADER_LIMIT)throw new Error('도면 정보가 너무 큽니다.');
    const prefix=new Uint8Array(4);new DataView(prefix.buffer).setUint32(0,header.length,true);
    const packed=new Blob([prefix,header,...blobs.values()]);
    const bytes=await collect(packed.stream().pipeThrough(new CompressionStream('gzip')),MAX_BYTES);
    return {bytes,drawing,assetCount:assets.length,uniqueModels:blobs.size};
  }
  async function decode(input){
    const bytes=new Uint8Array(input);if(bytes.length>MAX_BYTES)throw new Error('256 MB 이하의 프로젝트를 선택하세요.');
    if(bytes[0]!==0x1f||bytes[1]!==0x8b){
      if(bytes.length>HEADER_LIMIT)throw new Error('기존 JSON 도면은 2 MB 이하만 지원합니다.');
      return {drawing:M.validate(JSON.parse(new TextDecoder().decode(bytes))),blobs:new Map(),legacy:true};
    }
    const data=await collect(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),MAX_BYTES);
    if(data.length<4)throw new Error('프로젝트 파일이 손상되었습니다.');
    const length=new DataView(data.buffer).getUint32(0,true);if(length>HEADER_LIMIT||length+4>data.length)throw new Error('프로젝트 정보가 손상되었습니다.');
    const manifest=JSON.parse(new TextDecoder().decode(data.subarray(4,4+length)));
    if(manifest.format!=='gics-fems-project'||manifest.version!==1||!Array.isArray(manifest.blobs)||manifest.blobs.length>300)throw new Error('지원하지 않는 프로젝트 파일입니다.');
    const drawing=M.validate(manifest.drawing),blobs=new Map();let offset=4+length;
    if(!drawing.project)throw new Error('프로젝트 에셋 목록이 없습니다.');
    for(const entry of manifest.blobs){
      if(!/^[a-f0-9]{64}$/.test(entry.sha256)||blobs.has(entry.sha256)||!Number.isSafeInteger(entry.size)||entry.size<20||entry.size>F.MAX_BYTES||offset+entry.size>data.length)throw new Error('모델 데이터가 손상되었습니다.');
      const model=data.slice(offset,offset+entry.size);offset+=entry.size;F.inspect(model);
      if(await hash(model)!==entry.sha256)throw new Error('모델 파일 검증에 실패했습니다.');blobs.set(entry.sha256,model);
    }
    const referenced=new Set(drawing.project.assets.map(a=>a.sha256));
    if(offset!==data.length||referenced.size!==blobs.size||[...referenced].some(key=>!blobs.has(key)))throw new Error('추가 에셋 파일이 누락되었거나 목록과 다릅니다.');
    for(const item of [...drawing.equipment,...drawing.buildings||[],...drawing.floors||[]])if(F.isId(item.type)&&!drawing.project.assets.some(a=>a.type===item.type))throw new Error('설비의 추가 에셋 정보가 없습니다.');
    return {drawing,blobs,legacy:false};
  }
  async function prepareDefault(state,readAsset,ensureLocal){
    const drawing=attach(state);drawing.project.kind='new';
    const types=new Map();
    for(let i=0;i<drawing.project.assets.length;i++){
      const entry=drawing.project.assets[i],bytes=new Uint8Array(await readAsset(entry));F.inspect(bytes);
      const sha256=await hash(bytes);if(entry.sha256&&entry.sha256!==sha256)throw new Error(entry.name+': 에셋 원본이 다릅니다.');
      const local=F.metadata(await ensureLocal({...entry,sha256},bytes));
      if(local.sha256!==sha256)throw new Error('로컬 에셋 검증에 실패했습니다.');
      types.set(entry.type,local.type);drawing.project.assets[i]=local;
    }
    for(const item of [...drawing.equipment,...drawing.buildings||[],...drawing.floors||[]])if(F.isId(item.type)){
      if(!types.has(item.type))throw new Error(item.name+': 에셋 원본이 없습니다.');item.type=types.get(item.type);
    }
    return M.validate(drawing);
  }
  const api={MAX_BYTES,attach,revision,hash,encode,decode,prepareDefault};if(node)module.exports=api;else root.FEMSProjectFile=api;
})(typeof globalThis!=='undefined'?globalThis:this);
