(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./model.js'):root.FEMSModel;
  async function save(state,picker){
    if(typeof picker!=='function')throw new Error('저장 위치 선택을 지원하는 Edge 또는 Chrome에서 도면 저장을 사용하세요.');
    const snapshot=M.validate(state),contents=JSON.stringify(snapshot,null,2);
    const name=snapshot.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'.fems';
    const handle=await picker({suggestedName:name,types:[{description:'FEMS 배치 도면',accept:{'application/json':['.fems']}}]});
    const writable=await handle.createWritable();
    try{await writable.write(contents);await writable.close();}
    catch(error){try{await writable.abort();}catch{}throw error;}
  }
  const api={save};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FEMSFiles=api;
})(typeof globalThis!=='undefined'?globalThis:this);
