(function(root){
  'use strict';
  const T=root.THREE;
  // Project each equipment silhouette onto its own floor, never into the shared sun map.
  // Stencil coverage blends overlapping triangles only once; opaque scene depth still occludes it.
  class FloorShadows{
    constructor(scene,sun){this.sun=sun;this.group=new T.Group();scene.add(this.group);this.records=new Map();}
    sync(state,models){
      const active=new Set(),floors=new Map((state.floors||[]).map(f=>[f.id,f]));
      if(!state.scopeFloorId)for(const item of state.equipment){
        const floor=floors.get(item.floorId),model=models.get(item.id);
        if(!floor||!model)continue;
        const frame=root.FEMSSpatial.worldFrame(state,floor.id),height=floor.elevation+root.FEMSSpatial.floorSurface(floor);
        model.traverse(source=>{
          if(!source.isMesh||!(source.userData.spatialShadow??source.castShadow))return;
          active.add(source.uuid);
          let record=this.records.get(source.uuid);
          if(!record){
            const materials=[].concat(source.userData.spatialOriginal||source.material).map(original=>this.material(original,!!source.geometry.attributes.uv));
            const mesh=new T.Mesh(source.geometry,Array.isArray(source.material)?materials:materials[0]);
            mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;mesh.renderOrder=1;
            this.group.add(mesh);record={source,mesh,materials};this.records.set(source.uuid,record);
          }
          for(const material of record.materials){
            material.uniforms.floorCenter.value.set(frame.x,frame.z);
            material.uniforms.floorHalfSize.value.set(floor.width/2,floor.depth/2);
            const angle=frame.rotation*Math.PI/180;
            material.uniforms.floorRotation.value.set(Math.cos(angle),Math.sin(angle));
            material.uniforms.floorHeight.value=height;
          }
        });
      }
      for(const [id,record] of this.records)if(!active.has(id)){
        this.group.remove(record.mesh);record.materials.forEach(m=>m.dispose());this.records.delete(id);
        // Geometry belongs to the original model and must not be disposed here.
      }
    }
    material(original,hasUV){
      const map=hasUV?original.map:null,alphaMap=hasUV?original.alphaMap:null;
      if(map?.matrixAutoUpdate)map.updateMatrix();if(alphaMap?.matrixAutoUpdate)alphaMap.updateMatrix();
      return new T.ShaderMaterial({
        transparent:true,depthWrite:false,side:T.DoubleSide,
        stencilWrite:true,stencilRef:1,stencilFunc:T.NotEqualStencilFunc,stencilFuncMask:1,stencilWriteMask:1,stencilZPass:T.ReplaceStencilOp,
        defines:{...(map?{USE_MAP:1}:{}),...(alphaMap?{USE_ALPHA_MAP:1}:{})},
        uniforms:{floorCenter:{value:new T.Vector2()},floorHalfSize:{value:new T.Vector2()},floorRotation:{value:new T.Vector2(1,0)},floorHeight:{value:0},
          lightSlope:{value:new T.Vector2()},shadowColor:{value:new T.Color('#637b72')},map:{value:map},mapTransform:{value:map?.matrix||new T.Matrix3()},
          alphaMap:{value:alphaMap},alphaMapTransform:{value:alphaMap?.matrix||new T.Matrix3()},alphaTest:{value:Math.max(original.alphaTest||0,.05)},opacity:{value:original.opacity??1}},
        vertexShader:`
          uniform vec2 floorCenter, floorRotation, lightSlope;
          uniform float floorHeight;
          varying vec2 floorPoint;
          #if defined(USE_MAP) || defined(USE_ALPHA_MAP)
          varying vec2 shadowUv;
          #endif
          void main(){
            vec4 world=modelMatrix*vec4(position,1.0);
            world.xz+=lightSlope*max(0.0,world.y-floorHeight);
            vec2 delta=world.xz-floorCenter;
            floorPoint=vec2(floorRotation.x*delta.x-floorRotation.y*delta.y,floorRotation.y*delta.x+floorRotation.x*delta.y);
            world.y=floorHeight+0.015;
            #if defined(USE_MAP) || defined(USE_ALPHA_MAP)
            shadowUv=uv;
            #endif
            gl_Position=projectionMatrix*viewMatrix*world;
          }`,
        fragmentShader:`
          uniform vec2 floorHalfSize;
          uniform vec3 shadowColor;
          uniform float alphaTest, opacity;
          varying vec2 floorPoint;
          #if defined(USE_MAP) || defined(USE_ALPHA_MAP)
          varying vec2 shadowUv;
          #endif
          #ifdef USE_MAP
          uniform sampler2D map;
          uniform mat3 mapTransform;
          #endif
          #ifdef USE_ALPHA_MAP
          uniform sampler2D alphaMap;
          uniform mat3 alphaMapTransform;
          #endif
          void main(){
            if(any(greaterThan(abs(floorPoint),floorHalfSize)))discard;
            float alpha=opacity;
            #ifdef USE_MAP
            alpha*=texture2D(map,(mapTransform*vec3(shadowUv,1.0)).xy).a;
            #endif
            #ifdef USE_ALPHA_MAP
            alpha*=texture2D(alphaMap,(alphaMapTransform*vec3(shadowUv,1.0)).xy).g;
            #endif
            if(alpha<alphaTest)discard;
            gl_FragColor=vec4(shadowColor,0.24*alpha);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`
      });
    }
    update(mode){
      this.group.visible=mode==='3d';if(!this.group.visible)return;
      const light=this.sun.position.clone().sub(this.sun.target.position),height=Math.max(.001,light.y);
      for(const {source,mesh,materials} of this.records.values()){
        source.updateWorldMatrix(true,false);mesh.matrix.copy(source.matrixWorld);
        let visible=true;for(let node=source;node;node=node.parent)if(!node.visible){visible=false;break;}
        mesh.visible=visible;
        for(const material of materials)material.uniforms.lightSlope.value.set(-light.x/height,-light.z/height);
      }
    }
    dispose(){this.group.removeFromParent();for(const r of this.records.values())r.materials.forEach(m=>m.dispose());this.records.clear();}
  }
  root.FEMSFloorShadows=FloorShadows;
})(window);
