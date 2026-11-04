(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./model.js'):root.FEMSModel;
  const P=typeof module!=='undefined'&&module.exports?require('./project-file.js'):root.FEMSProjectFile;
  async function save(state,picker,readAsset){
    if(typeof picker!=='function')throw new Error('저장 위치 선택을 지원하는 Edge 또는 Chrome에서 프로젝트 저장을 사용하세요.');
    const snapshot=M.validate(state);
    const name='FEMS 프로젝트.fems';
    const handle=await picker({suggestedName:name,types:[{description:'FEMS 프로젝트 (도면 + 추가 에셋)',accept:{'application/octet-stream':['.fems']}}]});
    const packed=await P.encode(snapshot,readAsset);
    const writable=await handle.createWritable();
    try{await writable.write(packed.bytes);await writable.close();return packed;}
    catch(error){try{await writable.abort();}catch{}throw error;}
  }
  const api={save};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FEMSFiles=api;
})(typeof globalThis!=='undefined'?globalThis:this);
