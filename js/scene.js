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
      this.connectionSelection=null;
      root.document?.addEventListener('visibilitychange',()=>this.invalidate());
      const ghostGeometry=new T.PlaneGeometry(1,1);this.ghost=new T.Mesh(ghostGeometry,new T.MeshBasicMaterial({color:'#4caa86',opacity:.25,transparent:true,side:T.DoubleSide,depthWrite:false}));this.ghost.rotation.x=-Math.PI/2;this.ghost.visible=false;this.scene.add(this.ghost);
      this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
      this.bind();this.resize();
    }
    setState(state, selected, warnings) {
      this.state=state;this.selected=selected;this.warnings=warnings;
      const siteKey=JSON.stringify(state.site);
      if(siteKey!==this.siteKey){this.siteKey=siteKey;if(this.ground){this.scene.remove(this.ground);root.FEMSEquipment.dispose(this.ground);}
        this.ground=new T.Group();
        const floor=new T.Mesh(new T.BoxGeometry(state.site.width,.12,state.site.depth),new T.MeshStandardMaterial({color:'#e0e8e7',roughness:1}));floor.position.y=-.09;floor.receiveShadow=true;this.ground.add(floor);
        const points=[];
        for(let x=-state.site.width/2;x<=state.site.width/2;x++)points.push(x,-.022,-state.site.depth/2,x,-.022,state.site.depth/2);
        for(let z=-state.site.depth/2;z<=state.site.depth/2;z++)points.push(-state.site.width/2,-.022,z,state.site.width/2,-.022,z);
        const grid=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.LineBasicMaterial({color:'#c4d3d1',transparent:true,opacity:.6}));this.ground.add(grid);
        const edge=new T.LineSegments(new T.EdgesGeometry(floor.geometry),new T.LineBasicMaterial({color:'#aec4bc'}));edge.position.copy(floor.position);this.ground.add(edge);this.scene.add(this.ground);
      }
      const active=new Set(state.equipment.map(e=>e.id));
      for(const [id,model] of this.models)if(!active.has(id)||state.equipment.find(item=>item.id===id)?.type!==model.userData.equipmentType) {this.scene.remove(model);root.FEMSEquipment.dispose(model);this.models.delete(id);this.labels.get(id).remove();this.labels.delete(id);const footprint=this.footprints.get(id);this.scene.remove(footprint);root.FEMSEquipment.dispose(footprint);this.footprints.delete(id);}
      for(const item of state.equipment){
        let model=this.models.get(item.id);
        if(!model){model=root.FEMSEquipment.make(item.type);model.userData.equipmentType=item.type;model.traverse(part=>part.userData.equipmentId=item.id);this.models.set(item.id,model);this.scene.add(model);
          const label=document.createElement('span');label.className='object-label';this.labelHost.appendChild(label);this.labels.set(item.id,label);
          const footprint=new T.Mesh(new T.BoxGeometry(1,.025,1),new T.MeshBasicMaterial({color:root.FEMSCatalog.get(item.type).color}));footprint.userData.equipmentId=item.id;this.footprints.set(item.id,footprint);this.scene.add(footprint);}
        model.scale.set(item.width,item.height,item.depth);model.position.set(item.x,0,item.z);model.rotation.y=item.rotation*Math.PI/180;model.visible=this.mode==='3d';
        const footprint=this.footprints.get(item.id);footprint.scale.set(item.width,1,item.depth);footprint.position.set(item.x,.01,item.z);footprint.rotation.y=model.rotation.y;footprint.visible=this.mode==='plan';footprint.material.color.set(item.id===selected?'#37886d':root.FEMSCatalog.get(item.type).color);
        const label=this.labels.get(item.id);label.className='object-label'+(item.id===selected?' selected':'')+(warnings.has(item.id)?' warning':'');
      }
      this.connections?.setState(state);this.updateSelection();this.updateCursor();this.invalidate();
    }
    updateSelection() {const item=this.state?.equipment.find(e=>e.id===this.selected);this.selection.visible=!!item;if(item){this.selection.box.setFromObject(this.mode==='plan'?this.footprints.get(item.id):this.models.get(item.id));this.selection.box.expandByScalar(.09);}}
    setMode(mode){if(this.drag?.axis||this.drag?.connection)this.cancelDrag();this.setHover();this.lastPointer=null;this.mode=mode;if(mode==='plan')this.planYaw=0;this.camera=mode==='plan'?this.ortho:this.perspective;this.models.forEach(m=>m.visible=mode==='3d');this.footprints.forEach(m=>m.visible=mode==='plan');this.resize();this.updateSelection();}
    setArmed(type){if(this.drag?.axis||this.drag?.connection)this.cancelDrag();this.setHover();this.armed=type;this.ghost.visible=false;this.updateCursor();this.invalidate();}
    updateGizmo(){
      if(!this.gizmo)return;
      const item=this.state?.equipment.find(e=>e.id===this.selected);
      this.gizmo.update(item, this.models.get(this.selected)?.position, this.camera, this.height, !this.armed);
      if(this.gizmo.rotateButton)this.gizmo.rotateButton.disabled=!!this.drag;
      this.gizmo.highlight(this.drag?.axis||this.hoverAxis);
    }
    pickGizmo(event){if(!this.gizmo)return null;this.updateGizmo();this.setPointer(event);return this.gizmo.pick(this.ray);}
    pickTarget(event){
      if(this.armed)return {};
      // Alt is an explicit equipment override, including an overlapping gizmo.
      if(event.altKey){const id=this.pick(event);if(id)return {id};}
      const axis=this.pickGizmo(event);if(axis)return {axis};
      const id=this.pick(event);
      if(this.mode==='plan'&&this.connections){
        const rect=this.host.getBoundingClientRect();
        const point=this.connections.pick(event,this.camera,rect,{pointsOnly:true,movableOnly:true});
        if(point)return {link:point};
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
    updateCamera(){const aspect=(this.width||1)/(this.height||1);this.ortho.left=-this.radius*aspect/2;this.ortho.right=this.radius*aspect/2;this.ortho.top=this.radius/2;this.ortho.bottom=-this.radius/2;this.ortho.updateProjectionMatrix();this.ortho.position.set(this.target.x,100,this.target.z);this.ortho.up.set(-Math.sin(this.planYaw),0,-Math.cos(this.planYaw));this.ortho.lookAt(this.target);
      this.perspective.position.set(this.target.x+this.radius*Math.sin(this.yaw)*Math.cos(this.pitch),this.radius*Math.sin(this.pitch),this.target.z+this.radius*Math.cos(this.yaw)*Math.cos(this.pitch));this.perspective.lookAt(this.target);this.camera.updateMatrixWorld();this.invalidate();}
    fit(){this.target.set(0,0,0);this.yaw=.6;this.planYaw=0;this.pitch=.77;const width=this.state?.site.width||60,depth=this.state?.site.depth||40;const aspect=(this.width||1)/(this.height||1);this.radius=this.mode==='plan'?Math.max(depth*1.25,width/aspect*1.25):Math.max(depth*1.6,width/aspect*1.5,55);this.radius=Math.min(500,this.radius);this.updateCamera();}
    zoom(direction){this.radius=Math.max(7,Math.min(500,this.radius*direction));this.updateCamera();}
    pan(dx, dy) {
      const factor = this.radius / (this.height || 600) * .8;
      const yaw = this.mode === 'plan' ? this.planYaw : this.yaw;
      // Move the camera opposite the drag so the scene follows the pointer.
      this.target.x += (-dx * Math.cos(yaw) - dy * Math.sin(yaw)) * factor;
      this.target.z += (dx * Math.sin(yaw) - dy * Math.cos(yaw)) * factor;
      this.target.x = Math.max(-120, Math.min(120, this.target.x));
      this.target.z = Math.max(-120, Math.min(120, this.target.z));
    }
    floor(event){this.setPointer(event);const hit=new T.Vector3();return this.ray.ray.intersectPlane(this.floorPlane,hit);}
    setPointer(event){const rect=this.host.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);}
    pick(event){this.setPointer(event);return this.ray.intersectObjects(Array.from((this.mode==='plan'?this.footprints:this.models).values()),true)[0]?.object.userData.equipmentId;}
    bind(){const canvas=this.renderer.domElement;
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
          const p=this.floor(e),points=root.FEMSConnections.route(this.state,link.id)?.points;
          const source=link.handle?{x:(points[link.index].x+points[link.index+1].x)/2,z:(points[link.index].z+points[link.index+1].z)/2}:points?.[link.index];
          this.drag={connection:link,button:0,pointerId:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,offset:p&&source?{x:source.x-p.x,z:source.z-p.z}:{x:0,z:0}};
          canvas.setPointerCapture(e.pointerId);this.host.style.cursor='default';return;
        }
        const point=this.floor(e);this.drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,button:e.button,pointerId:e.pointerId,id,moved:false};
        if(id&&this.move&&e.button===0&&point){this.handlers.select(id);const item=this.state.equipment.find(v=>v.id===id);this.drag.item=M.clone(item);this.drag.offset={x:item.x-point.x,z:item.z-point.z};}
        this.updateCursor();canvas.setPointerCapture(e.pointerId);});
      canvas.addEventListener('pointermove',e=>{
        this.lastPointer={clientX:e.clientX,clientY:e.clientY,altKey:e.altKey};
        if(this.drag?.connection){
          const d=this.drag;if(e.pointerId!==d.pointerId)return;
          if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>3)d.moved=true;
          if(!d.moved)return;
          if(d.connection.kind==='point'||d.connection.handle){if(d.connection.locked)return;const p=this.floor(e);if(p)this.handlers.connectionPreview({x:Math.max(-this.state.site.width/2,Math.min(this.state.site.width/2,p.x+d.offset.x)),z:Math.max(-this.state.site.depth/2,Math.min(this.state.site.depth/2,p.z+d.offset.z))},{tolerance:e.shiftKey?0:(this.camera.top-this.camera.bottom)/this.camera.zoom/this.host.getBoundingClientRect().height*6});}
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
        if(this.armed&&point&&this.state){const def=root.FEMSCatalog.get(this.armed);const temp={...def,rotation:0};const pos=M.clampPosition(temp,Math.round(point.x*2)/2,Math.round(point.z*2)/2,this.state.site);this.ghost.scale.set(def.width,def.depth,1);this.ghost.position.set(pos.x,.04,pos.z);this.ghost.visible=true;this.invalidate();}
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
        else if(!d.moved&&e.button===0){if(this.armed){const point=this.floor(e);if(point&&Math.abs(point.x)<=this.state.site.width/2&&Math.abs(point.z)<=this.state.site.depth/2)this.handlers.place(this.armed,Math.round(point.x*2)/2,Math.round(point.z*2)/2);}else this.handlers.select(d.id||null);}});
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
    invalidate(){if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;if(!this.host.clientHeight||!this.host.clientWidth||root.document?.hidden)return;this.updateGizmo();this.updateHoverVisual();this.connections?.update(this.camera,this.height,this.mode,this.armed,this.connectionSelection,this.drag?null:this.hoverLink,{guides:this.connectionGuides,corner:this.cornerMode,site:this.state?.site});this.renderer.render(this.scene,this.camera);this.updateLabels();this.gizmo?.updateLabels(this.camera,this.width,this.height);if(this.connections?.active)this.invalidate();});}
    updateLabels(){if(!this.state)return;const v=new T.Vector3();for(const item of this.state.equipment){const model=this.models.get(item.id);v.set(model.position.x,this.mode==='plan'?.1:item.height+.3,model.position.z).project(this.camera);const label=this.labels.get(item.id);const text=this.mode==='3d'?item.name:`${item.code} · ${item.name}`;if(label.textContent!==text)label.textContent=text;label.hidden=!this.showLabels||v.z>1||v.z< -1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1;label.style.left=((v.x+1)/2*this.width)+'px';label.style.top=((-v.y+1)/2*this.height)+'px';}}
  }
  root.FEMSScene=Scene;
})(window);
