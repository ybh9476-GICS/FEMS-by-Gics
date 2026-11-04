(function(root){
  'use strict';
  const T=root.THREE,C=root.FEMSCatalog,F=root.FEMSAssetFormat,templates=new Map();
  let loaderPromise,cloneModel;
  const loader=()=>loaderPromise??=Promise.all([import('../vendor/gltf/loaders/GLTFLoader.js'),import('../vendor/gltf/utils/SkeletonUtils.js')]).then(([{GLTFLoader},{clone}])=>{cloneModel=clone;return GLTFLoader;});
  function release(object){
    const geometries=new Set(),materials=new Set(),textures=new Set();
    object.traverse(part=>{if(part.geometry)geometries.add(part.geometry);for(const m of part.material?(Array.isArray(part.material)?part.material:[part.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.dispose();t.source?.data?.close?.();});
  }
  async function parse(buffer){
    F.inspect(buffer);
    const Loader=await loader(),manager=new T.LoadingManager();let textureFailed=false;
    manager.onError=()=>{textureFailed=true;};
    const gltf=await new Loader(manager).parseAsync(buffer,'');
    const object=gltf.scene;
    if(textureFailed){release(object);throw new Error('텍스처를 읽지 못했습니다. PNG/JPEG 텍스처를 확인하고 다시 내보내세요.');}
    // Import equipment only; scene cameras and lights must not affect the editor.
    const remove=[];object.traverse(part=>{if(part.isLight||part.isCamera)remove.push(part);if(part.isMesh){part.castShadow=true;part.receiveShadow=true;}});remove.forEach(part=>part.removeFromParent());
    object.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(object),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
    if(![size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>1e-6)){release(object);throw new Error('가로·세로·높이가 있는 입체 설비 모델이 필요합니다.');}
    const normalized=new T.Group(),offset=new T.Group();
    offset.position.set(-center.x,-bounds.min.y,-center.z);offset.add(object);normalized.add(offset);normalized.scale.set(1/size.x,1/size.y,1/size.z);
    return {object:normalized,size:{width:size.x,depth:size.z,height:size.y}};
  }
  async function load(type){
    if(!templates.has(type))templates.set(type,(async()=>{
      const def=C.get(type);if(!def||def.missing)throw new Error('에셋 등록 정보가 없습니다.');
      const response=await fetch(def.model);if(!response.ok)throw new Error('에셋 파일을 찾을 수 없습니다.');
      const length=Number(response.headers.get('content-length'));if(length>F.MAX_BYTES)throw new Error('에셋 파일이 25 MB를 초과합니다.');
      return parse(await response.arrayBuffer());
    })());
    return templates.get(type);
  }
  function make(type,onReady){
    const group=new T.Group(),placeholder=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:'#9eaca8',wireframe:true}));
    placeholder.position.y=.5;group.add(placeholder);group.userData.assetInstance=true;
    load(type).then(({object})=>{
      if(group.userData.disposed)return;
      group.remove(placeholder);placeholder.geometry.dispose();placeholder.material.dispose();
      // Mesh/material resources remain owned by the template cache, not each placement.
      const instance=cloneModel(object);group.add(instance);group.userData.assetLoaded=true;onReady?.(group);
    }).catch(error=>{if(group.userData.disposed)return;placeholder.material.color.set('#c65d42');group.userData.assetError=error.message;onReady?.(group);});
    return group;
  }
  function disposeInstance(group){
    group.userData.disposed=true;
    if(!group.userData.assetLoaded)release(group);
  }
  function picture(object,dimensions){
    const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(320,240);renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
    const scene=new T.Scene(),outer=new T.Group();outer.add(cloneModel(object));
    const factor=2.6/Math.max(dimensions.width,dimensions.depth,dimensions.height);
    outer.scale.set(dimensions.width*factor,dimensions.height*factor,dimensions.depth*factor);outer.position.y=-dimensions.height*factor/2;scene.add(outer);
    scene.add(new T.HemisphereLight('#ffffff','#758f88',3));const light=new T.DirectionalLight('#fff4e4',3);light.position.set(-3,6,5);scene.add(light);
    const camera=new T.OrthographicCamera(-2.15,2.15,1.65,-1.65,.01,40);camera.position.set(6,4,6);camera.lookAt(0,0,0);
    try{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');}finally{renderer.dispose();renderer.forceContextLoss();}
  }
  async function initialize(){
    try{const response=await fetch('assets/equipment/index.json');if(!response.ok)throw new Error('에셋 목록을 불러오지 못했습니다.');C.register(F.manifest(await response.json()));return '';}
    catch(error){return error.message+' 기본 설비는 사용할 수 있습니다.';}
  }
  root.FEMSAssets={initialize,parse,load,make,disposeInstance,picture,release};
})(window);
