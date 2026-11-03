(function(root){
  'use strict';
  const T=root.THREE,L=root.FEMSConnections;
  class ConnectionView {
    constructor(scene){
      this.group=new T.Group();scene.add(this.group);this.lines=[];this.selection=null;this.mode='3d';
      this.time={value:0};this.pointGeometry=new T.SphereGeometry(1,12,8);
      this.pointMaterial=new T.MeshBasicMaterial({color:'#ffffff',depthTest:false});
      this.lockedPointMaterial=new T.MeshBasicMaterial({color:'#111111',depthTest:false});
      this.selectedPointMaterial=new T.MeshBasicMaterial({color:'#f59e0b',depthTest:false});
      this.hoverPointMaterial=new T.MeshBasicMaterial({color:'#14b8a6',depthTest:false});
      this.pointBorderMaterial=new T.MeshBasicMaterial({color:'#2563eb',depthTest:false});
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
      const routes=L.routes(state),key=JSON.stringify(routes);
      if(key===this.key)return;
      this.key=key;this.clear();
      for(const route of routes){
        const material=new T.ShaderMaterial({uniforms:{time:this.time,color:{value:new T.Color(route.color)},selected:{value:0}},
          vertexShader:'attribute float flowDistance; varying float distanceOnLine; varying vec3 surfaceNormal; void main(){distanceOnLine=flowDistance;surfaceNormal=normalMatrix*normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
          fragmentShader:'uniform float time; uniform vec3 color; uniform float selected; varying float distanceOnLine; varying vec3 surfaceNormal; void main(){float dash=1.0-step(0.68,mod(distanceOnLine-time*1.4,1.2));vec3 base=mix(vec3(0.86,0.91,0.96),color,0.35+0.65*dash);base=mix(base,vec3(1.0,0.66,0.13),selected*0.2);float light=0.8+0.2*abs(normalize(surfaceNormal).z);gl_FragColor=vec4(base*light,1.0);}'
        });
        const line={...route,material,segments:[],handles:[],height:.08+route.diameter/2};let distance=0;
        for(let i=0;i<route.points.length-1;i++){
          const a=route.points[i],b=route.points[i+1],length=Math.hypot(b.x-a.x,b.z-a.z);if(length<1e-6)continue;
          const geometry=new T.CylinderGeometry(route.diameter/2,route.diameter/2,length,10,1,false);
          const positions=geometry.attributes.position,flow=new Float32Array(positions.count);
          for(let j=0;j<positions.count;j++)flow[j]=distance+positions.getY(j)+length/2;
          geometry.setAttribute('flowDistance',new T.BufferAttribute(flow,1));
          const segmentMaterial=material.clone();segmentMaterial.uniforms.time=this.time;
          segmentMaterial.uniforms.color.value.set(route.segmentColors[i]);
          const mesh=new T.Mesh(geometry,segmentMaterial);mesh.position.set((a.x+b.x)/2,line.height,(a.z+b.z)/2);
          mesh.userData.segmentIndex=i;
          mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(b.x-a.x,0,b.z-a.z).normalize());
          this.group.add(mesh);line.segments.push(mesh);distance+=length;
        }
        for(let i=0;i<route.points.length;i++){
          const p=route.points[i],border=new T.Mesh(this.pointGeometry,this.pointBorderMaterial),dot=new T.Mesh(this.pointGeometry,this.pointMaterial);
          border.position.set(p.x,line.height+.02,p.z);dot.position.copy(border.position);border.renderOrder=10;dot.renderOrder=11;
          this.group.add(border,dot);line.handles.push({border,dot});
        }
        this.lines.push(line);
      }
    }
    update(camera,height,mode,armed,selection,hover=null,options={}){
      this.time.value=performance.now()/1000;this.mode=mode;this.selection=selection;
      const perPixel=camera.isOrthographicCamera?(camera.top-camera.bottom)/camera.zoom/height:1;
      const editing=mode==='plan'&&!armed;
      this.updateSegmentOverlay(this.selectedSegment,editing?selection:null,perPixel,true);
      const selectedLine=this.lines.find(line=>line.id===selection?.id),a=selectedLine?.points[selection?.index],b=selectedLine?.points[selection?.index+1];
      this.segmentHandle.visible=!!(editing&&selection?.kind==='segment'&&a&&b&&Math.hypot(b.x-a.x,b.z-a.z)>perPixel*24);
      if(this.segmentHandle.visible){
        this.segmentHandle.position.set((a.x+b.x)/2,selectedLine.height+.04,(a.z+b.z)/2);
        this.segmentHandle.children[0].scale.setScalar(perPixel*12);this.segmentHandle.children[1].scale.setScalar(perPixel*8);
        this.segmentHandle.children[1].material.color.set(options.corner?'#0d9488':'#657b76');
      }
      this.guides.forEach((line,i)=>{
        const axis=i===0?'x':'z',value=options.guides?.[axis];line.visible=editing&&value!=null;if(!line.visible)return;
        const site=options.site||{width:60,depth:40},p=line.geometry.attributes.position;
        p.setXYZ(0,i===0?value:-site.width/2,.5,i===0?-site.depth/2:value);p.setXYZ(1,i===0?value:site.width/2,.5,i===0?site.depth/2:value);p.needsUpdate=true;line.geometry.computeBoundingSphere();line.computeLineDistances();
      });
      const sameSegment=selection?.kind==='segment'&&hover?.id===selection.id&&hover?.index===selection.index;
      this.updateSegmentOverlay(this.hoverSegment,editing&&!sameSegment?hover:null,perPixel,false);
      for(const line of this.lines){
        line.material.uniforms.selected.value=0;
        for(const mesh of line.segments)mesh.renderOrder=editing&&((selection?.kind==='segment'&&selection.id===line.id&&selection.index===mesh.userData.segmentIndex)||(hover?.kind==='segment'&&hover.id===line.id&&hover.index===mesh.userData.segmentIndex))?8:0;
        line.handles.forEach(({border,dot},index)=>{
          border.visible=dot.visible=mode==='plan'&&!armed;
          const hovered=hover?.id===line.id&&hover.kind==='point'&&hover.index===index;
          const segmentEnd=selection?.id===line.id&&selection.kind==='segment'&&(selection.index===index||selection.index+1===index);
          border.scale.setScalar(perPixel*(segmentEnd?7:hovered?6:5));dot.scale.setScalar(perPixel*3.3);
          const locked=index===0||index===line.points.length-1;
          border.material=segmentEnd?this.segmentEndMaterial:hovered?this.hoverPointMaterial:locked?this.lockedPointMaterial:this.pointBorderMaterial;
          dot.material=locked?this.lockedPointMaterial:selection?.id===line.id&&selection.kind==='point'&&selection.index===index?this.selectedPointMaterial:this.pointMaterial;
        });
      }
    }
    updateSegmentOverlay(overlay,hit,perPixel,selected){
      const line=hit?.kind==='segment'?this.lines.find(line=>line.id===hit.id):null;
      const segment=line?.segments.find(mesh=>mesh.userData.segmentIndex===hit.index);
      overlay.visible=!!segment;if(!segment)return;
      overlay.position.copy(segment.position);overlay.quaternion.copy(segment.quaternion);
      const radius=Math.max(line.diameter/2,perPixel*1.5),extra=selected?3:1.5;
      overlay.children[0].scale.set(radius+perPixel*(extra+1.5),segment.geometry.parameters.height,radius+perPixel*(extra+1.5));
      overlay.children[1].scale.set(radius+perPixel*extra,segment.geometry.parameters.height,radius+perPixel*extra);
    }
    project(p,line,camera,rect){const v=new T.Vector3(p.x,line.height,p.z).project(camera);return {x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};}
    pickHandle(event,camera,rect){
      if(this.mode!=='plan'||!this.segmentHandle.visible||this.selection?.kind!=='segment')return null;
      const line=this.lines.find(line=>line.id===this.selection.id);if(!line)return null;
      const position=this.segmentHandle.position,p=this.project({x:position.x,z:position.z},line,camera,rect);
      return Math.abs(event.clientX-p.x)<=7&&Math.abs(event.clientY-p.y)<=7?{...this.selection,handle:true}:null;
    }
    pick(event,camera,rect,{pointsOnly=false,movableOnly=false}={}){
      if(this.mode!=='plan')return null;
      // Points take precedence. Prefer the selected connection at shared junctions.
      const ordered=[...this.lines].sort((a,b)=>(b.id===this.selection?.id)-(a.id===this.selection?.id));
      let best=null,nearest=6;
      for(const line of ordered)for(let i=0;i<line.points.length;i++){
        if(movableOnly&&(i===0||i===line.points.length-1))continue;
        const p=this.project(line.points[i],line,camera,rect),distance=Math.hypot(event.clientX-p.x,event.clientY-p.y);
        if(distance<nearest){nearest=distance;best={id:line.id,kind:'point',index:i,locked:i===0||i===line.points.length-1};}
      }
      if(best||pointsOnly)return best;
      nearest=Infinity;
      for(const line of ordered)for(let i=0;i<line.points.length-1;i++){
        const a=this.project(line.points[i],line,camera,rect),b=this.project(line.points[i+1],line,camera,rect);
        const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((event.clientX-a.x)*dx+(event.clientY-a.y)*dy)/(dx*dx+dy*dy||1)));
        const distance=Math.hypot(event.clientX-a.x-t*dx,event.clientY-a.y-t*dy),tolerance=Math.max(7,line.diameter*rect.height/(camera.top-camera.bottom)/2);
        if(distance<tolerance&&distance<nearest){nearest=distance;best={id:line.id,kind:'segment',index:i};}
      }
      return best;
    }
    get active(){return this.lines.some(line=>line.segments.length);}
  }
  root.FEMSConnectionView=ConnectionView;
})(window);
