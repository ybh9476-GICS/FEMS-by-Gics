(function (root) {
  'use strict';
  const T=root.THREE, M=root.FEMSModel;
  class Scene {
    constructor(host, labels, handlers, rotateButton = null) {
      this.host=host;this.labelHost=labels;this.handlers=handlers;this.models=new Map();this.labels=new Map();this.footprints=new Map();
      this.selected=null;this.mode='3d';this.armed=null;this.move=false;this.showLabels=true;this.radius=48;this.yaw=.6;this.planYaw=0;this.pitch=.77;this.target=new T.Vector3(0,0,0);
      this.renderer=new T.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(root.devicePixelRatio||1,2));this.renderer.setClearColor('#eef2f3');
      this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;host.appendChild(this.renderer.domElement);
      this.scene=new T.Scene();this.scene.add(new T.HemisphereLight('#faffff','#839d96',2.7));
      const sun=new T.DirectionalLight('#fff6e7',3);sun.position.set(-20,35,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-38;sun.shadow.camera.right=38;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.normalBias=.06;this.scene.add(sun);
      this.perspective=new T.PerspectiveCamera(38,1,.1,600);this.ortho=new T.OrthographicCamera(-30,30,20,-20,.1,600);this.camera=this.perspective;
      this.ray=new T.Raycaster();this.floorPlane=new T.Plane(new T.Vector3(0,1,0),0);this.pointer=new T.Vector2();
      this.selection=new T.Box3Helper(new T.Box3(), '#32826a');this.selection.visible=false;this.scene.add(this.selection);
      this.hoverBox=new T.Box3Helper(new T.Box3(), '#e99a24');this.hoverBox.visible=false;this.hoverBox.material.depthTest=false;this.hoverBox.renderOrder=900;this.scene.add(this.hoverBox);
      this.gizmo=new root.FEMSTransformGizmo(this.scene, this.labelHost, rotateButton);
      this.connections=root.FEMSConnectionView?new root.FEMSConnectionView(this.scene):null;
      this.connectionGizmo=new root.FEMSTransformGizmo(this.scene,this.labelHost,null,{vertical:true});
      this.connectionSelection=null;
      root.document?.addEventListener('visibilitychange',()=>this.invalidate());
      const ghostGeometry=new T.PlaneGeometry(1,1);this.ghost=new T.Mesh(ghostGeometry,new T.MeshBasicMaterial({color:'#4caa86',opacity:.25,transparent:true,side:T.DoubleSide,depthWrite:false}));this.ghost.rotation.x=-Math.PI/2;this.ghost.visible=false;this.scene.add(this.ghost);
      this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
      this.bind();this.resize();
    }
    styleSpatial(model,item){
      // GLB instances share cached materials: clone only the display overrides, never mutate the asset.
      const opaqueFloor=!!(item&&(item.type==='space-floor'||this.state?.floors?.some(f=>f.id===item.id)));
      model.traverse(part=>{if(!part.material)return;
        if(item?.buildingShell||item?.floorSelector){if(part.userData.spatialShadow===undefined)part.userData.spatialShadow=part.castShadow;part.castShadow=false;}
        else if(part.userData.spatialShadow!==undefined){part.castShadow=part.userData.spatialShadow;delete part.userData.spatialShadow;}
        const faded=item?.preview||item?.backdrop||item?.floorSelector;
        if((opaqueFloor||faded)&&!part.userData.spatialOriginal){part.userData.spatialOriginal=part.material;part.material=Array.isArray(part.material)?part.material.map(m=>m.clone()):part.material.clone();}
        if(part.userData.spatialOriginal){
          if(!opaqueFloor&&!faded){for(const m of [].concat(part.material))m.dispose();part.material=part.userData.spatialOriginal;delete part.userData.spatialOriginal;}
          else for(const m of [].concat(part.material)){m.opacity=opaqueFloor?1:item.buildingShell?(item.previewOpacity??.08):item.floorSelector?.3:item.backdrop?.3:.5;m.transparent=m.opacity<1;m.depthWrite=m.opacity===1;}
        }
      });
    }
    setState(state, selected, warnings, selectedIds=selected?[selected]:[]) {
      this.state=state;this.selected=selected;this.selectedIds=selectedIds;this.warnings=warnings;
      const groundSite=state.site,siteKey=JSON.stringify(groundSite);
      if(siteKey!==this.siteKey){this.siteKey=siteKey;if(this.ground){this.scene.remove(this.ground);root.FEMSEquipment.dispose(this.ground);}
        this.ground=new T.Group();
        const floor=new T.Mesh(new T.BoxGeometry(groundSite.width,.12,groundSite.depth),new T.MeshStandardMaterial({color:'#e0e8e7',roughness:1}));floor.position.y=-.09;floor.receiveShadow=true;this.ground.add(floor);
        const points=[],step=M.siteGridStep(groundSite);
        for(let x=-groundSite.width/2;x<=groundSite.width/2;x+=step)points.push(x,-.022,-groundSite.depth/2,x,-.022,groundSite.depth/2);
        for(let z=-groundSite.depth/2;z<=groundSite.depth/2;z+=step)points.push(-groundSite.width/2,-.022,z,groundSite.width/2,-.022,z);
        const grid=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.LineBasicMaterial({color:'#c4d3d1',transparent:true,opacity:.6}));this.ground.add(grid);
        const edge=new T.LineSegments(new T.EdgesGeometry(floor.geometry),new T.LineBasicMaterial({color:'#aec4bc'}));edge.position.copy(floor.position);this.ground.add(edge);this.scene.add(this.ground);
      }
      const active=new Set(state.equipment.map(e=>e.id));
      this.ground.visible=!state.hideGround;
      const assetKey=item=>item?.type+':'+(root.FEMSCatalog.get(item?.type)?.sha256||'')+(item?.type==='space-floor'?':'+item.width+':'+item.depth:'');
      for(const [id,model] of this.models)if(!active.has(id)||assetKey(state.equipment.find(item=>item.id===id))!==model.userData.assetKey) {this.styleSpatial(model,null);this.scene.remove(model);root.FEMSEquipment.dispose(model);this.models.delete(id);this.labels.get(id).remove();this.labels.delete(id);const footprint=this.footprints.get(id);this.scene.remove(footprint);root.FEMSEquipment.dispose(footprint);this.footprints.delete(id);}
      for(const item of state.equipment){
        let model=this.models.get(item.id);
        if(!model){model=root.FEMSEquipment.make(item.type,loaded=>{if(this.models.get(item.id)!==loaded)return;loaded.traverse(part=>part.userData.equipmentId=item.id);this.styleSpatial(loaded,this.state.equipment.find(e=>e.id===item.id));this.labels.get(item.id).title=loaded.userData.assetError||'';this.updateSelection();this.invalidate();},item);model.userData.equipmentType=item.type;model.userData.assetKey=assetKey(item);model.traverse(part=>part.userData.equipmentId=item.id);this.models.set(item.id,model);this.scene.add(model);
          const label=document.createElement('span');label.className='object-label';this.labelHost.appendChild(label);this.labels.set(item.id,label);
          const footprint=new T.Mesh(new T.BoxGeometry(1,.025,1),new T.MeshBasicMaterial({color:root.FEMSCatalog.get(item.type).color}));footprint.userData.equipmentId=item.id;this.footprints.set(item.id,footprint);this.scene.add(footprint);}
        model.scale.set(item.width,item.height,item.depth);model.position.set(item.x,item.y||0,item.z);model.rotation.y=item.rotation*Math.PI/180;model.visible=this.mode==='3d';
        this.styleSpatial(model,item);
        const footprint=this.footprints.get(item.id);footprint.scale.set(item.width,1,item.depth);footprint.position.set(item.x,(item.y||0)+.01,item.z);footprint.rotation.y=model.rotation.y;footprint.visible=this.mode==='plan';footprint.material.color.set(selectedIds.includes(item.id)?'#37886d':root.FEMSCatalog.get(item.type).color);
        footprint.material.transparent=!!item.backdrop||!!item.preview||!!item.floorSelector;footprint.material.opacity=item.buildingShell?.06:item.backdrop||item.floorSelector?.12:item.preview?.5:1;footprint.material.depthWrite=!item.backdrop&&!item.floorSelector;
        const label=this.labels.get(item.id);label.className='object-label'+(selectedIds.includes(item.id)?' selected':'')+(warnings.has(item.id)?' warning':'');
      }
      this.previewGroup=state.equipment.some(e=>e.preview);this.connections?.setState(state);this.syncPortalLabels();this.updateSelection();this.updateCursor();this.invalidate();
    }
    syncPortalLabels(){
      this.labelHost.removeAttribute('aria-hidden');
      this.portalLabels??=new Map();
      const routes=(this.connections?.lines||[]).filter(line=>line.portal),active=new Set(routes.map(line=>line.id));
      for(const [id,label] of this.portalLabels)if(!active.has(id)){label.remove();this.portalLabels.delete(id);}
      for(const line of routes){
        let label=this.portalLabels.get(line.id);
        if(!label){label=document.createElement('button');label.type='button';label.className='object-label external-label';
          label.addEventListener('click',()=>{if(!this.armed&&!this.drag)this.handlers.navigateEquipment?.(label.dataset.targetId);});
          this.labelHost.appendChild(label);this.portalLabels.set(line.id,label);}
        label.dataset.targetId=line.portal.targetId;label.textContent=line.portal.name+' ↗';label.title=line.portal.path+' · 클릭하여 이동';label.setAttribute('aria-label',label.title);
      }
    }
    updateSelection() {
      const item=this.state?.equipment.find(e=>e.id===this.selected);this.selection.visible=!!item;
      if(item){this.selection.box.setFromObject(this.mode==='plan'?this.footprints.get(item.id):this.models.get(item.id));this.selection.box.expandByScalar(.09);}
      this.multipleBoxes??=new Map();
      const ids=(this.selectedIds||[]).filter(id=>id!==this.selected);
      for(const [id,box] of this.multipleBoxes)if(!ids.includes(id)){this.scene.remove(box);box.geometry.dispose();box.material.dispose();this.multipleBoxes.delete(id);}
      for(const id of ids){const object=this.mode==='plan'?this.footprints.get(id):this.models.get(id);if(!object)continue;
        let box=this.multipleBoxes.get(id);if(!box){box=new T.Box3Helper(new T.Box3(),'#32826a');this.multipleBoxes.set(id,box);this.scene.add(box);}
        box.box.setFromObject(object);box.box.expandByScalar(.09);
      }
    }
    setMode(mode){if(this.drag?.axis||this.drag?.connection)this.cancelDrag();this.setHover();this.lastPointer=null;this.mode=mode;if(mode==='plan')this.planYaw=0;this.camera=mode==='plan'?this.ortho:this.perspective;this.models.forEach(m=>m.visible=mode==='3d');this.footprints.forEach(m=>m.visible=mode==='plan');this.resize();this.updateSelection();}
    setArmed(type){if(this.drag?.axis||this.drag?.connection)this.cancelDrag();this.setHover();this.armed=type;this.ghost.visible=false;this.updateCursor();this.invalidate();}
    updateGizmo(){
      if(!this.gizmo)return;
      const item=this.state?.equipment.find(e=>e.id===this.selected);
      this.gizmo.update(item, this.models.get(this.selected)?.position, this.camera, this.height, !this.armed&&!item?.backdrop&&!item?.noGizmo);
      if(this.gizmo.rotateButton)this.gizmo.rotateButton.disabled=!!this.drag;
      this.gizmo.highlight(this.drag?.axis||this.hoverAxis);
      if(this.connectionGizmo){
        const selection=this.connectionSelection,line=root.FEMSConnections.external?.isExternal(selection?.id)?root.FEMSConnections.route(this.state.connectionSource||this.state,selection.id):null;
        const a=line?.points[selection?.index],b=line?.points[selection?.index+1];
        const point=!line?.crossSpace?null:selection.kind==='point'?(!root.FEMSConnections.isLocked(line,selection.index)?a:null):b?Object.fromEntries(['x','y','z'].map(k=>[k,(a[k]+b[k])/2])):null;
        this.connectionGizmo.axes.get('y').arrow.visible=this.mode!=='plan';
        this.connectionGizmo.update(point,point,this.camera,this.height,!this.armed);
        this.connectionGizmo.highlight(this.drag?.connection?.axis||this.hoverLink?.axis);
      }
    }
    pickGizmo(event){if(!this.gizmo)return null;this.updateGizmo();this.setPointer(event);return this.gizmo.pick(this.ray);}
    pickTarget(event){
      if(this.armed)return {};
      // Alt is an explicit equipment override, including an overlapping gizmo.
      if(event.altKey){const label=this.pickLabel(event),id=label||this.pick(event);if(id)return {id,label:!!label};}
      const axis=this.pickGizmo(event);if(axis)return {axis};
      const labelId=this.pickLabel(event);if(labelId)return {id:labelId,label:true};
      const id=this.pick(event);
      if((this.mode==='plan'||this.mode==='3d')&&this.connections){
        const rect=this.host.getBoundingClientRect();
        const point=this.connections.pick(event,this.camera,rect,{pointsOnly:true,movableOnly:true});
        if(point)return {link:point};
        const connectionAxis=this.connectionGizmo?.pick(this.ray);if(connectionAxis)return {link:{...this.connectionSelection,axis:connectionAxis,handle:this.connectionSelection.kind==='segment'}};
        const handle=this.connections.pickHandle(event,this.camera,rect);if(handle)return {link:handle};
        if(id)return {id};
        return {link:this.connections.pick(event,this.camera,rect)};
      }
      return {id};
    }
    setHover(target={}){
      this.hoverAxis=target.axis||null;this.hovered=target.id||null;this.hoverLink=target.link||null;
      this.renderer.domElement.title=target.axis?`${target.axis.toUpperCase()}축 이동`:target.id?'설비 선택':target.link?.handle?(this.cornerMode?'코너 추가: 네모 드래그':'선분 이동: 네모 드래그'):target.link?.kind==='point'?(target.link.locked?'설비 고정점':'포인트 이동 · Alt+클릭: 겹친 설비 선택'):target.link?'연결선 선택':'';
      this.updateCursor();this.invalidate();
    }
    updateHoverVisual(){
      if(!this.hoverBox)return;
      const object=!this.armed&&!this.drag&&this.hovered?(this.mode==='plan'?this.footprints:this.models).get(this.hovered):null;
      this.hoverBox.visible=!!object;
      if(object){this.hoverBox.box.setFromObject(object);this.hoverBox.box.expandByScalar(.08);}
    }
    cancelDrag(){
      const d=this.drag;this.drag=null;this.hoverAxis=null;
      if(d?.connection)this.handlers.connectionEnd(false);
      else if(d?.axis)this.handlers.gizmoEnd(false);
      else if(d?.item&&this.state)this.setState(this.state,this.selected,this.warnings);
      const canvas=this.renderer.domElement;
      if(d&&canvas.hasPointerCapture(d.pointerId))canvas.releasePointerCapture(d.pointerId);
      this.updateCursor();this.invalidate();
    }
    updateCursor(){this.host.style.cursor=this.drag?.item?'default':this.drag?.moved&&(this.drag.button===2||!this.armed)?'grabbing':this.armed?'crosshair':this.move||this.selected||this.connectionSelection||this.hovered||this.hoverLink||this.hoverAxis?'default':'grab';}
    resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.width=w;this.height=h;this.renderer.setSize(w,h);this.perspective.aspect=w/h;this.perspective.updateProjectionMatrix();this.updateCamera();}
    updateCamera(){this.perspective.far=Math.max(600,this.radius*4+Math.hypot(this.state?.site.width||60,this.state?.site.depth||40)*2);this.perspective.near=Math.max(.01,this.radius/10000);this.perspective.updateProjectionMatrix();const aspect=(this.width||1)/(this.height||1);this.ortho.left=-this.radius*aspect/2;this.ortho.right=this.radius*aspect/2;this.ortho.top=this.radius/2;this.ortho.bottom=-this.radius/2;const levels=this.state?.equipment||[],top=Math.max(0,...levels.map(e=>(e.y||0)+e.height)),bottom=Math.min(0,...levels.map(e=>e.y||0));this.ortho.near=.01;this.ortho.far=Math.max(600,top-bottom+200);this.ortho.updateProjectionMatrix();this.ortho.position.set(this.target.x,Math.max(100,top+100),this.target.z);this.ortho.up.set(-Math.sin(this.planYaw),0,-Math.cos(this.planYaw));this.ortho.lookAt(this.target);
      this.perspective.position.set(this.target.x+this.radius*Math.sin(this.yaw)*Math.cos(this.pitch),this.target.y+this.radius*Math.sin(this.pitch),this.target.z+this.radius*Math.cos(this.yaw)*Math.cos(this.pitch));this.perspective.lookAt(this.target);this.camera.updateMatrixWorld();this.invalidate();}
    fit({preserveAngle=false,zoomInOnly=false}={}){
      const items=this.state?.equipment||[],focus=this.state?.focusBounds;
      const low=focus?.low??Math.min(0,...items.map(e=>e.y||0)),high=focus?.high??Math.max(0,...items.map(e=>(e.y||0)+e.height));
      this.target.set(focus?.x||0,(low+high)/2,focus?.z||0);
      if(!preserveAngle){this.yaw=.6;this.planYaw=0;this.pitch=.77;}
      const margin=this.state?.scopeFloorId?8:0,width=(focus?.width||this.state?.site.width||60)+margin,depth=(focus?.depth||this.state?.site.depth||40)+margin,aspect=(this.width||1)/(this.height||1);
      const halfFov=Math.atan(Math.tan(19*Math.PI/180)*Math.min(1,aspect));
      const c=Math.abs(Math.cos(this.planYaw)),s=Math.abs(Math.sin(this.planYaw));
      const radius=this.mode==='plan'?Math.max((c*depth+s*width)*1.25,(c*width+s*depth)/aspect*1.25):Math.hypot(width,depth,high-low)/2/Math.sin(halfFov)*1.1;
      this.radius=zoomInOnly?Math.min(this.radius,radius):radius;this.updateCamera();
    }
    zoom(direction){const size=Math.max(this.state?.site.width||60,this.state?.site.depth||40),aspect=(this.width||1)/(this.height||1);this.radius=Math.max(Math.min(7,size/2),Math.min(Math.max(500,size*10/Math.min(1,aspect)),this.radius*direction));this.updateCamera();}
    pan(dx, dy) {
      const factor = this.radius / (this.height || 600) * .8;
      const yaw = this.mode === 'plan' ? this.planYaw : this.yaw;
      // Move the camera opposite the drag so the scene follows the pointer.
      this.target.x += (-dx * Math.cos(yaw) - dy * Math.sin(yaw)) * factor;
      this.target.z += (dx * Math.sin(yaw) - dy * Math.cos(yaw)) * factor;
      this.target.x = Math.max(-Math.max(120,this.state?.site.width||60), Math.min(Math.max(120,this.state?.site.width||60), this.target.x));
      this.target.z = Math.max(-Math.max(120,this.state?.site.depth||40), Math.min(Math.max(120,this.state?.site.depth||40), this.target.z));
    }
    floor(event,height=0){this.setPointer(event);const hit=new T.Vector3();return this.ray.ray.intersectPlane(height?new T.Plane(new T.Vector3(0,1,0),-height):this.floorPlane,hit);}
    connectionTolerance(event,height){
      const p=this.floor(event,height);if(!p)return 0;
      const x=this.floor({...event,clientX:event.clientX+6,clientY:event.clientY},height),z=this.floor({...event,clientX:event.clientX,clientY:event.clientY+6},height);
      return Math.max(x?p.distanceTo(x):0,z?p.distanceTo(z):0);
    }
    setPointer(event){const rect=this.host.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);}
    pick(event){
      this.setPointer(event);
      // Floor geometry is display-only for pointer picking. Its billboard still
      // returns the same ID, preserving the floor's hover and selection visuals.
      const floors=new Set((this.state.floors||[]).map(f=>f.id));
      return this.ray.intersectObjects(Array.from((this.mode==='plan'?this.footprints:this.models).values()),true).find(hit=>{
        const id=hit.object.userData.equipmentId,item=this.state.equipment.find(e=>e.id===id);
        return item&&!item.backdrop&&!item.preview&&!item.floorSelector&&!floors.has(id);
      })?.object.userData.equipmentId;
    }
    pickLabel(event){
      // Labels stay pointer-transparent so camera drags and wheel zoom still reach the canvas.
      // Reverse DOM order matches the label painted on top when labels overlap.
      for(const [id,label] of Array.from(this.labels||[]).reverse()){
        const item=this.state.equipment.find(e=>e.id===id);
        if(label.hidden||item?.backdrop||(!this.showLabels&&!item?.floorSelector&&!this.state.floors?.some(f=>f.id===id)))continue;
        const r=label.getBoundingClientRect();
        if(event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom)return id;
      }
      return null;
    }
    placementPoint(event){
      if(!this.armed||!this.state)return null;
      const point=this.floor(event);
      return point&&Math.abs(point.x)<=this.state.site.width/2&&Math.abs(point.z)<=this.state.site.depth/2?point:null;
    }
    previewPlacement(point){
      this.ghost.visible=!!point;
      if(point){const def=root.FEMSCatalog.get(this.armed),pos=M.clampPosition({...def,rotation:0},Math.round(point.x*2)/2,Math.round(point.z*2)/2,this.state.site);
        this.ghost.scale.set(def.width,def.depth,1);this.ghost.position.set(pos.x,.04,pos.z);}
      this.invalidate();
    }
    bind(){const canvas=this.renderer.domElement;
      const equipmentDrag=e=>this.armed&&Array.from(e.dataTransfer?.types||[]).includes('application/x-fems-equipment');
      canvas.addEventListener('dragover',e=>{
        if(!equipmentDrag(e))return;
        e.preventDefault();const point=this.placementPoint(e);e.dataTransfer.dropEffect=point?'copy':'none';this.previewPlacement(point);
      });
      canvas.addEventListener('dragleave',()=>{if(this.armed)this.previewPlacement(null);});
      canvas.addEventListener('drop',e=>{
        if(!equipmentDrag(e))return;
        e.preventDefault();const type=e.dataTransfer.getData('application/x-fems-equipment'),point=this.placementPoint(e);
        this.previewPlacement(null);
        if(type===this.armed&&point)this.handlers.place(type,Math.round(point.x*2)/2,Math.round(point.z*2)/2);
      });
      canvas.addEventListener('contextmenu',e=>e.preventDefault());
      canvas.addEventListener('wheel',e=>{e.preventDefault();if(!this.drag?.axis&&!this.drag?.connection)this.zoom(Math.exp(Math.sign(e.deltaY)*.09));},{passive:false});
      canvas.addEventListener('pointerdown',e=>{if(this.drag||(e.button!==0&&e.button!==2)||(this.mode==='plan'&&e.button===2))return;
        const target=e.button===0?this.pickTarget(e):{id:this.armed?null:this.pick(e)};
        this.setHover();
        const {axis,id,link}=target;
        if(axis){
          this.handlers.gizmoStart();
          const item=this.state.equipment.find(v=>v.id===this.selected);
          const axisDrag=this.gizmo.begin(axis,this.ray.ray,this.camera,item);
          if(!axisDrag)return;
          this.drag={...axisDrag,id:item.id,button:0,pointerId:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
          this.updateCursor();this.invalidate();canvas.setPointerCapture(e.pointerId);return;
        }
        if(link){
          this.handlers.connectionSelect(link);this.handlers.connectionStart(link);
          const route=root.FEMSConnections.route(this.state.connectionSource||this.state,link.id),points=route.points;
          const source=link.handle?Object.fromEntries(['x','y','z'].map(k=>[k,((points[link.index][k]||0)+(points[link.index+1][k]||0))/2])):points?.[link.index];
          const height=route.crossSpace?source.y:(this.state.connectionSurfaceY||0)+.08+route.diameter/2+(link.handle?.04:.02);
          const p=this.floor(e,height);this.setPointer(e);
          const connectionAxis=link.axis?this.connectionGizmo.begin(link.axis,this.ray.ray,this.camera,source):null;
          const snapPoints=(route.crossSpace||route.externalFloor)?this.connections.lines.filter(l=>l.id!==link.id).flatMap(l=>l.points.map(p=>({...p,y:p.y??l.height}))):undefined;
          this.drag={connection:link,snapPoints,connectionAxis,crossSpace:route.crossSpace,portal:route.externalFloor,height,button:0,pointerId:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,offset:p&&source?{x:source.x-p.x,z:source.z-p.z}:{x:0,z:0}};
          canvas.setPointerCapture(e.pointerId);this.host.style.cursor='default';return;
        }
        const point=this.floor(e);this.drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button,pointerId:e.pointerId,id,label:target.label,moved:false};
        if(id&&this.move&&e.button===0&&point){this.handlers.select(id);const item=this.state.equipment.find(v=>v.id===id);this.drag.item=M.clone(item);this.drag.offset={x:item.x-point.x,z:item.z-point.z};}
        this.updateCursor();canvas.setPointerCapture(e.pointerId);});
      canvas.addEventListener('pointermove',e=>{
        this.lastPointer={clientX:e.clientX,clientY:e.clientY,altKey:e.altKey};
        if(this.drag?.connection){
          const d=this.drag;if(e.pointerId!==d.pointerId)return;
          if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>3)d.moved=true;
          if(!d.moved)return;
          if(d.connection.kind==='point'||d.connection.handle){
            if(d.connection.locked)return;
            if(d.connectionAxis){this.setPointer(e);const p=this.connectionGizmo.positionForPoint(d.connectionAxis,this.ray.ray);if(p)this.handlers.connectionPreview(p,{axis:d.connection.axis,tolerance:e.shiftKey?0:this.connectionTolerance(e,d.height),snapPoints:d.snapPoints});}
            else{const p=this.floor(e,d.height);if(p)this.handlers.connectionPreview(d.crossSpace?{x:p.x+d.offset.x,y:d.height,z:p.z+d.offset.z}:{x:Math.max(-this.state.site.width/2-(d.portal?3:0),Math.min(this.state.site.width/2+(d.portal?3:0),p.x+d.offset.x)),z:Math.max(-this.state.site.depth/2-(d.portal?3:0),Math.min(this.state.site.depth/2+(d.portal?3:0),p.z+d.offset.z))},{tolerance:e.shiftKey?0:this.connectionTolerance(e,d.height),snapPoints:d.snapPoints});}
          }
          else{this.pan(e.clientX-d.lastX,e.clientY-d.lastY);this.updateCamera();}
          d.lastX=e.clientX;d.lastY=e.clientY;return;
        }
        if(this.drag?.axis){
          const d=this.drag;if(e.pointerId!==d.pointerId)return;
          if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>3)d.moved=true;
          if(!d.moved)return;
          this.setPointer(e);const pos=this.gizmo.positionFor(d,this.ray.ray,this.state.site);
          if(pos)this.handlers.gizmoPreview(d.id,pos);
          return;
        }
        const point=this.floor(e);
        if(this.armed&&this.state)this.previewPlacement(this.placementPoint(e));
        const d=this.drag;if(!d){this.setHover(this.pickTarget(e));return;}const dx=e.clientX-d.lastX,dy=e.clientY-d.lastY;d.lastX=e.clientX;d.lastY=e.clientY;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>4)d.moved=true;
        this.updateCursor();
        if(!d.moved)return;
        if(d.item&&point){const pos=M.clampPosition(d.item,Math.round((point.x+d.offset.x)*2)/2,Math.round((point.z+d.offset.z)*2)/2,this.state.site);d.position=pos;this.models.get(d.id).position.set(pos.x,0,pos.z);this.footprints.get(d.id).position.set(pos.x,.01,pos.z);this.connections?.setState({...this.state,equipment:this.state.equipment.map(item=>item.id===d.id?{...item,...pos}:item)});this.updateSelection();this.invalidate();}
        else if(d.button===2||!this.armed){if(d.button===0){this.pan(dx,dy);}else if(this.mode==='3d'){this.yaw-=dx*.006;this.pitch=Math.max(.15,Math.min(1.5,this.pitch+dy*.005));}this.updateCamera();}
      });
      canvas.addEventListener('pointerup',e=>{const d=this.drag;if(!d||e.button!==d.button)return;this.drag=null;this.setHover();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
        if(d.axis){this.handlers.gizmoEnd(true);this.invalidate();return;}
        if(d.connection){this.handlers.connectionEnd(true);this.invalidate();return;}
        if(d.item&&d.position)this.handlers.move(d.id,d.position);
        else if(!d.moved&&e.button===0){if(this.armed){const point=this.floor(e);if(point&&Math.abs(point.x)<=this.state.site.width/2&&Math.abs(point.z)<=this.state.site.depth/2)this.handlers.place(this.armed,Math.round(point.x*2)/2,Math.round(point.z*2)/2);}else if(d.label&&this.handlers.selectLabel)this.handlers.selectLabel(d.id);else this.handlers.select(d.id||null);}});
      canvas.addEventListener('pointercancel',()=>this.cancelDrag());
      canvas.addEventListener('lostpointercapture',()=>{if(this.drag)this.cancelDrag();});
      root.addEventListener?.('blur',()=>{if(this.drag)this.cancelDrag();this.lastPointer=null;this.setHover();});
      canvas.addEventListener('pointerleave',()=>{this.lastPointer=null;this.setHover();this.ghost.visible=false;});
      for(const type of ['keydown','keyup'])root.addEventListener?.(type,e=>{
        if(e.key==='Alt'&&this.lastPointer&&!this.drag&&!root.document?.querySelector('dialog[open]')){
          this.lastPointer.altKey=type==='keydown';this.setHover(this.pickTarget(this.lastPointer));
        }
      });
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.handlers.error('3D 그래픽 연결이 중단되었습니다. 도면을 저장한 뒤 브라우저를 새로고침하세요. 설비 목록에서 편집·저장할 수 있습니다.');});
      canvas.addEventListener('webglcontextrestored',()=>this.handlers.error('그래픽 연결이 복구되었습니다. 저장 후 새로고침하여 화면을 다시 열어 주세요.'));
    }
    invalidate(){if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;if(!this.host.clientHeight||!this.host.clientWidth||root.document?.hidden)return;this.updateGizmo();this.updateHoverVisual();this.connections?.update(this.camera,this.height,this.mode,this.armed,this.connectionSelection,this.drag?null:this.hoverLink,{guides:this.connectionGuides,corner:this.cornerMode,site:this.state?.site});this.renderer.render(this.scene,this.camera);this.updateLabels();this.gizmo?.updateLabels(this.camera,this.width,this.height);this.connectionGizmo?.updateLabels(this.camera,this.width,this.height);if(this.connections?.active)this.invalidate();});}
    updateLabels(){
      if(!this.state)return;
      const v=new T.Vector3(),corner=new T.Vector3(),floorLabels=[];
      for(const item of this.state.equipment){
        const model=this.models.get(item.id);
        v.set(model.position.x,(model.position.y||0)+(this.mode==='plan'?.1:item.height+.3),model.position.z).project(this.camera);
        if(this.mode==='plan'){
          // Anchor the label bottom to the screen's upper footprint edge, including rotation and live movement.
          const cos=Math.cos(model.rotation.y),sin=Math.sin(model.rotation.y);
          for(const x of [-item.width/2,item.width/2])for(const z of [-item.depth/2,item.depth/2]){
            corner.set(model.position.x+x*cos+z*sin,(model.position.y||0)+.1,model.position.z-x*sin+z*cos).project(this.camera);
            v.y=Math.max(v.y,corner.y);
          }
        }
        if(item.floorSelector){
          // Keep floor navigation beside the footprint, clear of equipment labels in its interior.
          const cos=Math.cos(model.rotation.y),sin=Math.sin(model.rotation.y);let left=1;
          for(const x of [-item.width/2,item.width/2])for(const z of [-item.depth/2,item.depth/2]){
            corner.set(model.position.x+x*cos+z*sin,(model.position.y||0)+item.height,model.position.z-x*sin+z*cos).project(this.camera);left=Math.min(left,corner.x);
          }
          v.x=Math.max(-.92,left-.04);
        }
        const label=this.labels.get(item.id),text=item.name;
        if(label.textContent!==text)label.textContent=text;
        label.hidden=!!item.backdrop||(!this.showLabels&&!item.floorSelector&&!this.state.floors?.some(f=>f.id===item.id))||v.z>1||v.z< -1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1;
        label.style.left=((v.x+1)/2*this.width)+'px';
        label.style.top=((-v.y+1)/2*this.height-(this.mode==='plan'?4:0))+'px';
        if(item.floorSelector&&!label.hidden)floorLabels.push({label,y:parseFloat(label.style.top),elevation:item.y||0});
      }
      // Stacked floors share the same plan footprint. Keep their navigation labels individually clickable.
      if(this.mode==='plan'&&floorLabels.length){const top=Math.min(...floorLabels.map(entry=>entry.y));floorLabels.sort((a,b)=>b.elevation-a.elevation);floorLabels.forEach((entry,index)=>entry.y=top+index*28);}
      else floorLabels.sort((a,b)=>a.y-b.y||b.elevation-a.elevation);
      let bottom=0;
      for(const entry of floorLabels){entry.y=Math.max(entry.y,bottom+28);bottom=entry.y;}
      const overflow=Math.max(0,bottom-(this.height-12));
      for(const entry of floorLabels)entry.label.style.top=(entry.y-overflow)+'px';
      for(const line of this.connections?.lines||[]){
        if(!line.portal)continue;const label=this.portalLabels?.get(line.id);if(!label)continue;
        const p=line.portal.point;v.set(p.x,line.height,p.z).project(this.camera);
        label.hidden=!this.showLabels||v.z>1||v.z< -1||Math.abs(v.x)>1||Math.abs(v.y)>1;label.disabled=!!this.armed||!!this.drag;
        label.style.left=((v.x+1)/2*this.width)+'px';label.style.top=((1-v.y)/2*this.height)+'px';
      }
    }
  }
  root.FEMSScene=Scene;
})(window);
