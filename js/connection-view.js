(function(root){
  'use strict';
  const T=root.THREE,L=root.FEMSConnections;
  class ConnectionView {
    static buildingEntryRoutes(state){
      if(state.hideConnections||state.scopeFloorId||state.focusBounds)return [];
      const source=state.connectionSource||state,byId=new Map(source.equipment.map(e=>[e.id,e]));
      const visible=state.visibleEquipment||new Set(state.equipment.map(e=>e.id));
      return L.external.links(source).flatMap(link=>{
        const from=byId.get(link.from),to=byId.get(link.to);
        if(visible.has(from.id)&&visible.has(to.id))return [];
        if(!!from.floorId===!!to.floorId)return [];
        const incoming=!from.floorId,site=incoming?from:to,inside=incoming?to:from;
        const floor=source.floors?.find(f=>f.id===inside.floorId),building=source.buildings?.find(b=>b.id===floor?.buildingId);
        if(!building||!visible.has(site.id)||!visible.has(building.id))return [];
        const line=L.external.route(source,L.external.idFor(link.from,link.to));
        const points=incoming?line.points:[...line.points].reverse(),colors=incoming?line.segmentColors:[...line.segmentColors].reverse();
        const angle=building.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
        const local=p=>({x:c*(p.x-building.x)-s*(p.z-building.z),z:s*(p.x-building.x)+c*(p.z-building.z)});
        const start=local(points[0]),half={x:building.width/2,z:building.depth/2};
        // A site object already within the footprint has no exterior leg to show.
        if(Math.abs(start.x)<=half.x&&Math.abs(start.z)<=half.z)return [];
        const clipped=[points[0]],segmentColors=[];
        for(let i=1;i<points.length;i++){
          const a=points[i-1],b=points[i],p=local(a),q=local(b);let enter=0,leave=1;
          for(const axis of ['x','z']){
            const delta=q[axis]-p[axis];
            if(Math.abs(delta)<1e-9){if(Math.abs(p[axis])>half[axis]+1e-9){enter=2;break;}continue;}
            const low=(-half[axis]-p[axis])/delta,high=(half[axis]-p[axis])/delta;
            enter=Math.max(enter,Math.min(low,high));leave=Math.min(leave,Math.max(low,high));
          }
          if(enter<=leave&&enter<=1&&leave>=0){
            if(enter>1e-9){clipped.push({x:a.x+(b.x-a.x)*enter,y:a.y+(b.y-a.y)*enter,z:a.z+(b.z-a.z)*enter});segmentColors.push(colors[i-1]);}
            if(clipped.length<2)return [];
            const length=ps=>ps.slice(1).reduce((sum,p,j)=>sum+Math.hypot(p.x-ps[j].x,p.y-ps[j].y,p.z-ps[j].z),0);
            return [{...line,points:incoming?clipped:clipped.reverse(),segmentColors:incoming?segmentColors:segmentColors.reverse(),distanceOffset:incoming?0:length(line.points)-length(clipped),readOnly:true,buildingEntry:true}];
          }
          clipped.push(b);segmentColors.push(colors[i-1]);
        }
        return [];
      });
    }
    static externalFloorRoutes(state){
      if(!state.scopeFloorId||state.hideConnections)return [];
      return L.floor.routes(state.connectionSource||state,state.scopeFloorId).map(line=>({...line,elevation:state.connectionSurfaceY||0}));
    }
    static crossingGaps(routes){
      const gaps=new Map(),segments=[];
      for(let r=0;r<routes.length;r++){const line=routes[r];if(line.crossSpace)continue;
        for(let i=0;i<line.points.length-1;i++){const a=line.points[i],b=line.points[i+1];if(Math.hypot(a.x-b.x,a.z-b.z)<1e-6)continue;segments.push({r,i,a,b,line,h:Math.abs(a.z-b.z)<1e-6});}}
      for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
        const a=segments[i],b=segments[j];if(a.h===b.h||Math.abs((a.line.elevation||0)-(b.line.elevation||0))>1e-4)continue;
        const p=a.h?{x:b.a.x,z:a.a.z}:{x:a.a.x,z:b.a.z},axis=a.h?'x':'z',other=b.h?'x':'z';
        const ta=(p[axis]-a.a[axis])/(a.b[axis]-a.a[axis]),tb=(p[other]-b.a[other])/(b.b[other]-b.a[other]);
        if(ta<=1e-6||ta>=1-1e-6||tb<=1e-6||tb>=1-1e-6)continue;
        const key=b.r+':'+b.i,half=(a.line.diameter/2+b.line.diameter/2+.15)/Math.hypot(b.b.x-b.a.x,b.b.z-b.a.z);
        if(!gaps.has(key))gaps.set(key,[]);gaps.get(key).push([Math.max(0,tb-half),Math.min(1,tb+half)]);
      }
      return gaps;
    }
    static crossSpaceRoutes(state){
      if(state.hideConnections||!state.connectionFrames||state.scopeFloorId)return [];
      const source=state.connectionSource||state,shown=new Set(state.equipment.map(e=>e.id));
      return L.external.links(source).filter(l=>shown.has(l.from)&&shown.has(l.to)).map(l=>L.external.route(source,L.external.idFor(l.from,l.to)));
    }
    constructor(scene){
      this.group=new T.Group();scene.add(this.group);this.lines=[];this.selection=null;this.mode='3d';
      this.time={value:0};this.pointGeometry=new T.SphereGeometry(1,12,8);
      this.pointMaterial=new T.MeshBasicMaterial({color:'#ffffff',depthTest:false});
      this.lockedPointMaterial=new T.MeshBasicMaterial({color:'#111111',depthTest:false});
      this.selectedPointMaterial=new T.MeshBasicMaterial({color:'#f59e0b',depthTest:false});
      this.hoverPointMaterial=new T.MeshBasicMaterial({color:'#14b8a6',depthTest:false});
      this.pointBorderMaterial=new T.MeshBasicMaterial({color:'#2563eb',depthTest:false});
      this.junctionMaterial=new T.MeshBasicMaterial({color:'#365b54'});
      this.segmentGeometry=new T.CylinderGeometry(1,1,1,12);
      this.emphasis=new T.Group();scene.add(this.emphasis);
      const overlay=color=>{
        const group=new T.Group();
        for(const [index,tint] of ['#ffffff',color].entries()){
          const mesh=new T.Mesh(this.segmentGeometry,new T.MeshBasicMaterial({color:tint,depthTest:false,depthWrite:false}));
          mesh.renderOrder=4+index;group.add(mesh);
        }
        group.visible=false;this.emphasis.add(group);return group;
      };
      this.hoverSegment=overlay('#14b8a6');this.selectedSegment=overlay('#a3a3a3');
      this.segmentEndMaterial=new T.MeshBasicMaterial({color:'#a3a3a3',depthTest:false});
      this.segmentHandle=new T.Group();this.emphasis.add(this.segmentHandle);
      for(const color of ['#ffffff','#657b76']){const mesh=new T.Mesh(new T.BoxGeometry(1,.1,1),new T.MeshBasicMaterial({color,depthTest:false,depthWrite:false}));mesh.renderOrder=12+this.segmentHandle.children.length;this.segmentHandle.add(mesh);}
      this.segmentHandle.visible=false;
      this.guides=['x','z'].map(()=>{const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);const line=new T.Line(geometry,new T.LineDashedMaterial({color:'#0d9488',dashSize:.3,gapSize:.2,depthTest:false,depthWrite:false}));line.renderOrder=9;line.visible=false;this.emphasis.add(line);return line;});
    }
    clear(){
      for(const line of this.lines){for(const mesh of line.segments){mesh.geometry.dispose();mesh.material.dispose();}line.material.dispose();}
      this.group.clear();this.lines=[];
      this.hoverSegment.visible=this.selectedSegment.visible=false;
      this.segmentHandle.visible=false;
    }
    setState(state){
      const source=state.connectionSource||state;
      const byId=new Map(source.equipment.map(e=>[e.id,e]));
      const routes=L.routes(source).filter(line=>{
        if(state.hideConnections)return false;
        if(!state.visibleEquipment)return true;
        const scope=byId.get(line.parentId)?.floorId||null;
        return state.visibleEquipment.has(line.parentId)&&(line.childIds||[line.id]).some(id=>state.visibleEquipment.has(id)&&(byId.get(id)?.floorId||null)===scope);
      }).map(line=>{
        const frame=state.connectionFrames?.[byId.get(line.parentId)?.floorId];
        const result={...line,rootId:L.rootEquipmentId(source,line.parentId),elevation:state.connectionSurfaceY||0};
        if(frame){const a=frame.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);result.points=line.points.map(p=>({x:frame.x+c*p.x+s*p.z,z:frame.z-s*p.x+c*p.z}));result.elevation=frame.elevation;result.readOnly=true;}
        return result;
      }).concat(ConnectionView.crossSpaceRoutes(state),ConnectionView.externalFloorRoutes(state),ConnectionView.buildingEntryRoutes(state)),key=JSON.stringify(routes);
      if(key===this.key)return;
      this.key=key;this.clear();
      const crossingGaps=ConnectionView.crossingGaps(routes),junctions=new Set();
      for(const [routeIndex,route] of routes.entries()){
        const material=new T.ShaderMaterial({toneMapped:false,uniforms:{time:this.time,color:{value:new T.Color(route.color)}},
          vertexShader:`
            attribute float flowDistance;
            varying float distanceOnLine;
            void main(){
              distanceOnLine=flowDistance;
              gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
            }`,
          fragmentShader:`
            uniform float time;
            uniform vec3 color;
            varying float distanceOnLine;
            void main(){
              // Keep 80% of each cycle in the exact palette color; white pulses show flow.
              float pulse=1.0-step(0.24,mod(distanceOnLine-time*1.4,1.2));
              gl_FragColor=vec4(mix(color,vec3(1.0),pulse),1.0);
              // THREE.Color stores linear RGB; match the palette's CSS sRGB on output.
              #include <colorspace_fragment>
            }`
        });
        const line={...route,material,segments:[],handles:[],height:route.elevation+.08+route.diameter/2};let distance=route.distanceOffset||0;
        for(let i=0;i<route.points.length-1;i++){
          const a=route.points[i],b=route.points[i+1],ay=a.y??line.height,by=b.y??line.height,length=Math.hypot(b.x-a.x,by-ay,b.z-a.z);if(length<1e-6)continue;
          const cuts=(crossingGaps.get(routeIndex+':'+i)||[]).sort((a,b)=>a[0]-b[0]),pieces=[];let cursor=0;
          for(const [low,high] of cuts){if(low>cursor)pieces.push([cursor,low]);cursor=Math.max(cursor,high);}if(cursor<1)pieces.push([cursor,1]);
          for(const [low,high] of pieces){
          const partLength=length*(high-low),middle=(low+high)/2;
          const geometry=new T.CylinderGeometry(route.diameter/2,route.diameter/2,partLength,10,1,false);
          const positions=geometry.attributes.position,flow=new Float32Array(positions.count);
          for(let j=0;j<positions.count;j++)flow[j]=distance+length*low+positions.getY(j)+partLength/2;
          geometry.setAttribute('flowDistance',new T.BufferAttribute(flow,1));
          const segmentMaterial=material.clone();segmentMaterial.uniforms.time=this.time;
          segmentMaterial.uniforms.color.value.set(route.segmentColors[i]);
          const mesh=new T.Mesh(geometry,segmentMaterial);mesh.position.set(a.x+(b.x-a.x)*middle,ay+(by-ay)*middle,a.z+(b.z-a.z)*middle);
          mesh.userData.segmentIndex=i;
          mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(b.x-a.x,by-ay,b.z-a.z).normalize());
          this.group.add(mesh);line.segments.push(mesh);
          }distance+=length;
        }
        for(let i=0;i<route.points.length;i++){
          const p=route.points[i],border=new T.Mesh(this.pointGeometry,this.pointBorderMaterial),dot=new T.Mesh(this.pointGeometry,this.pointMaterial);
          border.position.set(p.x,(p.y??line.height)+.02,p.z);dot.position.copy(border.position);border.renderOrder=10;dot.renderOrder=11;
          this.group.add(border,dot);line.handles.push({border,dot});
          const nodeId=route.nodeIds?.[i];
          if(route.pointKinds?.[i]==='junction'&&nodeId&&!junctions.has(nodeId)){
            junctions.add(nodeId);const marker=new T.Mesh(this.pointGeometry,this.junctionMaterial);marker.position.copy(border.position);marker.scale.setScalar(route.diameter*.8);this.group.add(marker);
          }
        }
        this.lines.push(line);
      }
    }
    update(camera,height,mode,armed,selection,hover=null,options={}){
      this.time.value=performance.now()/1000;this.mode=mode;this.selection=selection;
      const perPixel=camera.isOrthographicCamera?(camera.top-camera.bottom)/camera.zoom/height:1;
      const editing=(mode==='plan'||mode==='3d')&&!armed;
      const selecting=(mode==='plan'||mode==='3d')&&!armed;
      const hitPixel=hit=>{const line=this.lines.find(l=>l.id===hit?.id),segment=line?.segments.find(m=>m.userData.segmentIndex===hit?.index);return segment?this.pixelSize(camera,height,segment.position):perPixel;};
      this.updateSegmentOverlay(this.selectedSegment,selecting?selection:null,hitPixel(selection),true);
      const selectedLine=this.lines.find(line=>line.id===selection?.id),a=selectedLine?.points[selection?.index],b=selectedLine?.points[selection?.index+1];
      const handlePixel=hitPixel(selection);
      this.segmentHandle.visible=!!(editing&&!selectedLine?.readOnly&&selection?.kind==='segment'&&a&&b&&Math.hypot(b.x-a.x,(b.y??selectedLine.height)-(a.y??selectedLine.height),b.z-a.z)>handlePixel*24);
      if(this.segmentHandle.visible){
        this.segmentHandle.position.set((a.x+b.x)/2,((a.y??selectedLine.height)+(b.y??selectedLine.height))/2+.04,(a.z+b.z)/2);
        this.segmentHandle.children[0].scale.setScalar(handlePixel*12);this.segmentHandle.children[1].scale.setScalar(handlePixel*8);
        // Keep the square facing the camera so it remains usable at shallow angles.
        this.segmentHandle.quaternion.copy(camera.quaternion).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
        this.segmentHandle.children[1].material.color.set(options.corner?'#0d9488':'#657b76');
      }
      this.guides.forEach((line,i)=>{
        const axis=i===0?'x':'z',value=options.guides?.[axis];line.visible=editing&&value!=null;if(!line.visible)return;
        const site=options.site||{width:60,depth:40},p=line.geometry.attributes.position;
        p.setXYZ(0,i===0?value:-site.width/2,.5,i===0?-site.depth/2:value);p.setXYZ(1,i===0?value:site.width/2,.5,i===0?site.depth/2:value);p.needsUpdate=true;line.geometry.computeBoundingSphere();line.computeLineDistances();
      });
      const sameSegment=selection?.kind==='segment'&&hover?.id===selection.id&&hover?.index===selection.index;
      this.updateSegmentOverlay(this.hoverSegment,selecting&&!sameSegment?hover:null,hitPixel(hover),false);
      const drawnNodes=new Set(),selectedNode=selection?.kind==='point'?selectedLine?.nodeIds?.[selection.index]:null;
      for(const line of this.lines){
        const active=editing&&!line.readOnly&&!!selectedLine&&line.rootId===selectedLine.rootId;
        for(const mesh of line.segments)mesh.renderOrder=selecting&&((selection?.kind==='segment'&&selection.id===line.id&&selection.index===mesh.userData.segmentIndex)||(hover?.kind==='segment'&&hover.id===line.id&&hover.index===mesh.userData.segmentIndex))?8:0;
        line.handles.forEach(({border,dot},index)=>{
          const nodeId=line.nodeIds?.[index],duplicate=nodeId&&drawnNodes.has(nodeId);if(active&&nodeId)drawnNodes.add(nodeId);
          border.visible=dot.visible=active&&!duplicate;
          const hovered=hover?.id===line.id&&hover.kind==='point'&&hover.index===index;
          const segmentEnd=selection?.id===line.id&&selection.kind==='segment'&&(selection.index===index||selection.index+1===index);
          const pointPixel=this.pixelSize(camera,height,border.position);
          border.scale.setScalar(pointPixel*(segmentEnd?7:hovered?6:5));dot.scale.setScalar(pointPixel*3.3);
          const locked=L.isLocked(line,index),pointSelected=selection?.kind==='point'&&((selection.id===line.id&&selection.index===index)||(selectedNode&&nodeId===selectedNode));
          border.material=segmentEnd?this.segmentEndMaterial:hovered?this.hoverPointMaterial:locked?this.lockedPointMaterial:this.pointBorderMaterial;
          dot.material=locked?this.lockedPointMaterial:pointSelected?this.selectedPointMaterial:this.pointMaterial;
        });
      }
    }
    updateSegmentOverlay(overlay,hit,perPixel,selected){
      const line=hit?.kind==='segment'?this.lines.find(line=>line.id===hit.id):null;
      const segment=line?.segments.find(mesh=>mesh.userData.segmentIndex===hit.index);
      overlay.visible=!!segment;if(!segment)return;
      const a=line.points[hit.index],b=line.points[hit.index+1],ay=a.y??line.height,by=b.y??line.height,length=Math.hypot(b.x-a.x,by-ay,b.z-a.z);
      overlay.position.set((a.x+b.x)/2,(ay+by)/2,(a.z+b.z)/2);overlay.quaternion.copy(segment.quaternion);
      const radius=Math.max(line.diameter/2,perPixel*1.5),extra=selected?3:1.5;
      overlay.children[0].scale.set(radius+perPixel*(extra+1.5),length,radius+perPixel*(extra+1.5));
      overlay.children[1].scale.set(radius+perPixel*extra,length,radius+perPixel*extra);
    }
    pixelSize(camera,height,position){
      if(camera.isOrthographicCamera)return (camera.top-camera.bottom)/camera.zoom/height;
      const depth=-position.clone().applyMatrix4(camera.matrixWorldInverse).z;
      return 2*Math.max(camera.near,depth)*Math.tan(camera.fov*Math.PI/360)/camera.zoom/height;
    }
    project(p,line,camera,rect){const v=new T.Vector3(p.x,p.y??line.height,p.z).project(camera);return {x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2,depth:v.z};}
    pickHandle(event,camera,rect){
      if(!this.segmentHandle.visible||this.selection?.kind!=='segment')return null;
      const line=this.lines.find(line=>line.id===this.selection.id);if(!line||line.readOnly)return null;
      const p=this.project(this.segmentHandle.position,line,camera,rect);if(p.depth< -1||p.depth>1)return null;
      return Math.abs(event.clientX-p.x)<=7&&Math.abs(event.clientY-p.y)<=7?{...this.selection,handle:true}:null;
    }
    pick(event,camera,rect,{pointsOnly=false,movableOnly=false}={}){
      if(this.mode!=='plan'&&this.mode!=='3d')return null;
      // Points take precedence. Prefer the selected connection at shared junctions.
      const ordered=this.lines.filter(line=>!line.readOnly).sort((a,b)=>(b.id===this.selection?.id)-(a.id===this.selection?.id));
      let best=null,nearest=6;
      for(const line of ordered)for(let i=0;i<line.points.length;i++){
        if(!line.handles[i].border.visible)continue;
        if(movableOnly&&L.isLocked(line,i))continue;
        const p=this.project(line.handles[i].border.position,line,camera,rect);if(p.depth< -1||p.depth>1)continue;
        const distance=Math.hypot(event.clientX-p.x,event.clientY-p.y);
        if(distance<nearest){nearest=distance;best={id:line.id,kind:'point',index:i,locked:L.isLocked(line,i)};}
      }
      if(best||pointsOnly)return best;
      nearest=Infinity;
      for(const line of ordered)for(let i=0;i<line.points.length-1;i++){
        const a=this.project(line.points[i],line,camera,rect),b=this.project(line.points[i+1],line,camera,rect);
        if(this.mode==='3d'&&(a.depth< -1||a.depth>1||b.depth< -1||b.depth>1))continue;
        const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((event.clientX-a.x)*dx+(event.clientY-a.y)*dy)/(dx*dx+dy*dy||1)));
        const midpoint=new T.Vector3((line.points[i].x+line.points[i+1].x)/2,((line.points[i].y??line.height)+(line.points[i+1].y??line.height))/2,(line.points[i].z+line.points[i+1].z)/2);
        const distance=Math.hypot(event.clientX-a.x-t*dx,event.clientY-a.y-t*dy),tolerance=Math.max(7,line.diameter/this.pixelSize(camera,rect.height,midpoint)/2);
        if(distance<tolerance&&distance<nearest){nearest=distance;best={id:line.id,kind:'segment',index:i};}
      }
      return best;
    }
    get active(){return this.lines.some(line=>line.segments.length);}
  }
  root.FEMSConnectionView=ConnectionView;
})(window);
