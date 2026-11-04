// Capture the versioned URL while currentScript is available (before the promise).
const startupURL=new URL(document.currentScript.src);
// Resolve the asset catalog before restoring drawings which reference it.
window.FEMSAssets.initialize().then(async message=>{
  window.FEMSAssetStartupMessage=message;
  window.FEMSDefaultAssets=window.FEMSDefaultLayout?.project?.assets||window.FEMSCatalog.catalog.filter(d=>d.custom);
  window.FEMSDefaultRevision=await window.FEMSProjectFile.revision(window.FEMSDefaultLayout,window.FEMSDefaultAssets);
  const appURL=new URL('app.js',startupURL);appURL.search=startupURL.search;
  const script=document.createElement('script');script.src=appURL;document.head.append(script);
});
