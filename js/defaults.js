(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./model.js'):root.FEMSModel;
  function seed(bundled){return bundled?M.validate(bundled):M.demo();}
  function serialize(state){
    const snapshot=M.validate(state);
    return '// Shared startup drawing. Exported from FEMS by Gics.\nwindow.FEMSDefaultLayout = '+JSON.stringify(snapshot,null,2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+';\n';
  }
  const api={seed,serialize};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FEMSDefaults=api;
})(typeof globalThis!=='undefined'?globalThis:this);
