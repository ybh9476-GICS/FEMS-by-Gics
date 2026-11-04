// Resolve the asset catalog before restoring drawings which reference it.
window.FEMSAssets.initialize().then(message=>{
  window.FEMSAssetStartupMessage=message;
  const script=document.createElement('script');script.src=new URL('app.js',document.currentScript?.src||new URL('js/startup.js',document.baseURI));document.head.append(script);
});
