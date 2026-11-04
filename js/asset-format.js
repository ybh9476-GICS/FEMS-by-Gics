(function(root){
  'use strict';
  const MAX_BYTES=25*1024*1024;
  const isId=value=>typeof value==='string'&&/^asset-[a-z0-9][a-z0-9-]{0,63}$/.test(value);
  function metadata(raw){
    if(!raw||!isId(raw.type))throw new Error('에셋 ID가 올바르지 않습니다.');
    const name=typeof raw.name==='string'?raw.name.trim():'';
    const en=typeof raw.en==='string'?raw.en.trim():'';
    if(!name||name.length>60||en.length>80)throw new Error('이름은 1~60자, 영문명은 80자 이하로 입력하세요.');
    const result={type:raw.type,name,en,custom:true,code:'',group:'추가 에셋',color:'#71869a',description:'프로젝트에 등록된 GLB 설비입니다.',model:`assets/equipment/${raw.type}/model.glb`};
    for(const key of ['width','depth','height']){
      const max=key==='height'?40:30,value=raw[key];
      if(typeof value!=='number'||!Number.isFinite(value)||value<.2||value>max)throw new Error(`설비 ${key==='width'?'가로':key==='depth'?'세로':'높이'}는 0.2~${max} m로 입력하세요.`);
      result[key]=value;
    }
    return result;
  }
  function manifest(raw){
    if(raw?.version!==1||!Array.isArray(raw.assets)||raw.assets.length>300)throw new Error('에셋 등록 목록을 읽을 수 없습니다.');
    const entries=raw.assets.map(metadata),ids=new Set(entries.map(e=>e.type));
    if(ids.size!==entries.length)throw new Error('에셋 ID가 중복되었습니다.');
    return entries;
  }
  function inspect(input){
    const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
    if(bytes.byteLength<20||bytes.byteLength>MAX_BYTES)throw new Error('25 MB 이하의 GLB 파일을 선택하세요.');
    const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    if(data.getUint32(0,true)!==0x46546c67||data.getUint32(4,true)!==2||data.getUint32(8,true)!==bytes.byteLength)throw new Error('올바른 GLB 2.0 파일이 아닙니다.');
    let json,offset=12,binLength=0;
    while(offset<bytes.length){
      if(offset+8>bytes.length)throw new Error('GLB 데이터가 잘렸습니다.');
      const length=data.getUint32(offset,true),kind=data.getUint32(offset+4,true);offset+=8;
      if(length%4||offset+length>bytes.length)throw new Error('GLB 데이터 길이가 올바르지 않습니다.');
      if(kind===0x4e4f534a){if(json||offset!==20)throw new Error('GLB JSON 구조가 올바르지 않습니다.');json=JSON.parse(new TextDecoder().decode(bytes.subarray(offset,offset+length)));}
      else if(kind===0x004e4942)binLength+=length;
      offset+=length;
    }
    if(json?.asset?.version!=='2.0'||!json.meshes?.length||!json.nodes?.length||!json.scenes?.length)throw new Error('설비 메시와 장면이 포함된 GLB가 필요합니다.');
    // Never resolve paths or network URLs supplied by an imported model.
    const scan=value=>{if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(key==='uri')throw new Error('텍스처와 버퍼를 모두 파일 안에 포함한 GLB로 내보내세요.');scan(item);}};scan(json);
    if((json.extensionsUsed||[]).some(e=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(e)))throw new Error('Draco·Meshopt·KTX2 압축을 끄고 GLB로 다시 내보내세요.');
    if(!Array.isArray(json.buffers)||json.buffers.length!==1||json.buffers[0].byteLength>binLength)throw new Error('GLB 내부 버퍼가 누락되었습니다.');
    for(const img of json.images||[])if(!Number.isInteger(img.bufferView)||!['image/png','image/jpeg'].includes(img.mimeType))throw new Error('PNG 또는 JPEG 텍스처를 GLB 안에 포함하세요.');
    return json;
  }
  const api={MAX_BYTES,isId,metadata,manifest,inspect};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FEMSAssetFormat=api;
})(typeof globalThis!=='undefined'?globalThis:this);
