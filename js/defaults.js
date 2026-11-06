(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./model.js'):root.FEMSModel;
  function seed(bundled){return bundled?M.validate(bundled):M.demo();}
  function serialize(state){
    const snapshot=M.validate(state);
    return '// Shared startup drawing. Exported from FEMS by Gics.\nwindow.FEMSDefaultLayout = '+JSON.stringify(snapshot,null,2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+';\n';
  }
  function saveError(status,detail=''){
    const messages={400:'프로젝트 데이터 또는 추가 에셋을 확인하지 못했습니다. 로컬 서버를 다시 시작한 뒤 재시도하세요.',403:'저장 요청의 주소 또는 파일 경로가 허용되지 않았습니다. 프로젝트 로컬 서버에서 열어주세요.',404:'기본 프로젝트 저장 기능을 찾지 못했습니다. 로컬 서버를 다시 시작하세요.',405:'현재 서버는 기본 프로젝트 저장을 지원하지 않습니다. 프로젝트의 npm run dev로 실행하세요.',409:'다른 저장이 진행 중입니다. 잠시 후 다시 시도하세요.',413:'도면 데이터가 서버의 2 MB 제한을 초과했습니다.',415:'저장 요청 형식이 올바르지 않습니다. 화면을 새로 고친 뒤 재시도하세요.',500:'서버에서 파일 저장에 실패했습니다. 서버 로그와 파일 쓰기 권한을 확인하세요.'};
    // Only display explicit diagnostics from our server, never an HTML error page.
    const diagnostic=detail.startsWith('저장 오류: ')?' '+detail.slice(0,500):'';
    return (messages[status]||'로컬 서버 응답을 확인하지 못했습니다.')+diagnostic+` (HTTP ${status})`;
  }
  const api={seed,serialize,saveError};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FEMSDefaults=api;
})(typeof globalThis!=='undefined'?globalThis:this);
