(function(root){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const uid=prefix=>prefix+'-'+(root.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));
  const all=state=>[...(state.buildings||[]),...(state.floors||[])];
  const get=(state,id)=>all(state).find(item=>item.id===id);
  const kind=(state,id)=>state.buildings?.some(b=>b.id===id)?'building':state.floors?.some(f=>f.id===id)?'floor':null;
  function number(v,min,max,label){if(!Number.isFinite(v)||v<min||v>max)throw new Error(label+': '+min+'~'+max+' 범위로 입력하세요.');return v;}
  function text(v,label){if(typeof v!=='string'||!v.trim()||v.length>80)throw new Error(label+': 1~80자로 입력하세요.');return v.trim();}
  function validate(raw,result){
    const ids=new Set(result.equipment.map(e=>e.id));
    for(const key of ['buildings','floors']){
      if(!Array.isArray(raw[key])||raw[key].length>300)throw new Error('건물과 층은 각각 최대 300개입니다.');
      result[key]=raw[key].map(item=>{
        const out={id:text(item.id,'공간 ID'),name:text(item.name,'이름')};
        if(ids.has(out.id)||out.id==='@site')throw new Error('공간 ID가 중복되었습니다.');ids.add(out.id);
        if(item.type!=null){if(!/^asset-[a-z0-9][a-z0-9-]{0,63}$/.test(item.type))throw new Error('건물·층 GLB 에셋이 올바르지 않습니다.');out.type=item.type;}
        if(key==='buildings'&&!out.type)throw new Error('건물 GLB가 필요합니다.');
        for(const field of ['x','z'])out[field]=number(item[field],-100000,100000,field);
        out.rotation=number(item.rotation,0,359.999,'회전');
        for(const field of ['width','depth','height'])out[field]=number(item[field],.01,100000,field);
        if(key==='floors'){
          out.elevation=number(item.elevation,-100000,100000,'층 배치 높이');
          if(item.buildingId!=null)out.buildingId=text(item.buildingId,'건물 ID');
          if(item.level!=null)out.level=text(item.level,'층 번호');
        }
        return out;
      });
    }
    const slots=new Set();
    for(const floor of result.floors){
      if(floor.buildingId&&!result.buildings.some(b=>b.id===floor.buildingId))throw new Error('층의 건물이 없습니다.');
      const slot=floor.buildingId+':'+floor.level;
      if(floor.buildingId&&floor.level){if(slots.has(slot))throw new Error('같은 건물에 층 번호가 중복되었습니다.');slots.add(slot);}
    }
    for(const item of result.equipment)if(item.floorId&&!result.floors.some(f=>f.id===item.floorId))throw new Error('설비가 소속된 층을 찾을 수 없습니다.');
  }
  function upgrade(state){const next=copy(state);next.version=Math.max(3,next.version);next.buildings??=[];next.floors??=[];return next;}
  function create(state,def,x=0,z=0){
    const node={id:uid(def.kind),type:def.type,name:def.name,x,z,rotation:0,width:def.width,depth:def.depth,height:def.height};
    const names=new Set(all(state).map(n=>n.name));let i=1;while(names.has(node.name))node.name=def.name+'('+i+++')';
    if(def.kind==='floor')node.elevation=0;
    return node;
  }
  function transform(point,frame,inverse=false){
    const a=frame.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    if(inverse){const x=point.x-frame.x,z=point.z-frame.z;return {x:c*x-s*z,z:s*x+c*z};}
    return {x:frame.x+c*point.x+s*point.z,z:frame.z-s*point.x+c*point.z};
  }
  function worldFrame(state,floorId){
    const floor=state.floors?.find(f=>f.id===floorId);if(!floor)return {x:0,z:0,rotation:0,elevation:0};
    const building=state.buildings.find(b=>b.id===floor.buildingId);
    return building?{...transform(floor,building),rotation:(floor.rotation+building.rotation)%360,elevation:floor.elevation}:floor;
  }
  function moveEquipment(state,ids,floorId,centerOnFloor=false){
    const next=copy(state),frame=worldFrame(next,floorId);
    if(floorId&&!next.floors?.some(f=>f.id===floorId))throw new Error('이동할 층을 선택하세요.');
    for(const item of next.equipment.filter(e=>ids.includes(e.id))){
      const old=worldFrame(state,item.floorId),world=transform(item,old);
      Object.assign(item,transform(world,frame,true));item.rotation=((item.rotation+old.rotation-frame.rotation)%360+360)%360;
      if(floorId)item.floorId=floorId;else delete item.floorId;
    }
    const moved=next.equipment.filter(e=>ids.includes(e.id)),offset={x:0,z:0};
    if(centerOnFloor&&floorId&&moved.length&&state.equipment.some(e=>ids.includes(e.id)&&e.floorId!==floorId)){
      const boxes=moved.map(e=>{const a=e.rotation*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));return {x:e.x,z:e.z,w:(c*e.width+s*e.depth)/2,d:(s*e.width+c*e.depth)/2};});
      offset.x=-(Math.min(...boxes.map(e=>e.x-e.w))+Math.max(...boxes.map(e=>e.x+e.w)))/2;
      offset.z=-(Math.min(...boxes.map(e=>e.z-e.d))+Math.max(...boxes.map(e=>e.z+e.d)))/2;
      for(const item of moved){item.x+=offset.x;item.z+=offset.z;}
    }
    for(const net of next.networks||[]){
      const terminals=net.nodes.filter(n=>n.equipmentId).map(n=>state.equipment.find(e=>e.id===n.equipmentId));
      if(!terminals.every(e=>ids.includes(e.id))||!terminals.every(e=>(e.floorId||null)===(terminals[0].floorId||null)))continue;
      const old=worldFrame(state,terminals[0].floorId),convert=p=>{const result=transform(transform(p,old),frame,true);return {x:result.x+offset.x,z:result.z+offset.z};};
      for(const node of net.nodes){if(!node.equipmentId)Object.assign(node,convert(node));else if(node.offset){const a=(old.rotation-frame.rotation)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),p=node.offset;node.offset={x:c*p.x+s*p.z,z:-s*p.x+c*p.z};}}
      for(const edge of net.edges)edge.bends=edge.bends.map(convert);
    }
    // Electrical parent IDs and network paths remain intact. Cross-space links are represented by portals.
    return next;
  }
  function slots(above,below,roof,height){
    for(const n of [above,below])if(!Number.isInteger(n)||n<0||n>100)throw new Error('층 수는 0~100의 정수로 입력하세요.');
    number(height,.01,100000,'건물 높이');if(!above&&!below)throw new Error('한 개 이상의 층을 설정하세요.');
    if(roof&&above<2)throw new Error('옥상은 지상 2층 이상일 때 사용할 수 있습니다.');
    const spacing=height/Math.max(1,above-(roof?1:0));
    const out=[];
    if(roof)out.push({level:'R',name:'옥상',elevation:height});
    for(let i=above-(roof?1:0);i>=1;i--)out.push({level:i+'F',name:i+'F',elevation:(i-1)*spacing});
    for(let i=1;i<=below;i++)out.push({level:'B'+i,name:'B'+i,elevation:-i*spacing});
    return out;
  }
  function registerFloors(state,buildingId,entries){
    const next=upgrade(state),building=next.buildings.find(b=>b.id===buildingId),used=new Set();
    if(!building)throw new Error('건물을 찾을 수 없습니다.');
    const old=next.floors.filter(f=>f.buildingId===buildingId);
    const registered=entries.map(slot=>{
      if(slot.floorId&&used.has(slot.floorId))throw new Error('하나의 층 오브젝트를 여러 슬롯에 등록할 수 없습니다.');
      if(slot.floorId)used.add(slot.floorId);
      const source=next.floors.find(f=>f.id===slot.floorId),existing=old.find(f=>slot.targetId?f.id===slot.targetId:f.level===slot.level);
      if(slot.floorId&&!source)throw new Error('등록할 층을 찾을 수 없습니다.');
      if(source?.buildingId&&source.buildingId!==buildingId)throw new Error('다른 건물에 등록된 층입니다. 먼저 연결을 해제하세요.');
      const item={...(source||existing||{id:uid('floor'),width:building.width,depth:building.depth,height:.2,x:0,z:0,rotation:0})};
      // Changing a model updates the same floor, preserving equipment and connection scope.
      if(slot.floorId===null){delete item.type;Object.assign(item,{width:building.width,depth:building.depth,height:.2});}
      if(slot.model)Object.assign(item,{type:slot.model.type,width:slot.model.width,depth:slot.model.depth,height:slot.model.height});
      if(slot.size)Object.assign(item,slot.size);
      return {...item,buildingId,level:slot.level,name:slot.name||slot.level,elevation:slot.level==='R'&&slot.size?building.height-item.height:slot.elevation,...(!item.buildingId?{x:0,z:0,rotation:0}:{}),...(slot.position||{})};
    });
    if(entries.some(s=>s.size))for(const floor of registered){
      const a=floor.rotation*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
      if(c*floor.width+s*floor.depth>building.width-2*Math.abs(floor.x)+1e-8||s*floor.width+c*floor.depth>building.depth-2*Math.abs(floor.z)+1e-8)throw new Error(floor.name+': 건물 크기를 초과했습니다.');
      const ceiling=Math.min(building.height,...registered.filter(f=>f.elevation>floor.elevation).map(f=>f.elevation));
      if(!Number.isFinite(floor.elevation)||floor.height>building.height||floor.elevation+floor.height>ceiling+1e-8||registered.some(f=>f!==floor&&Math.abs(f.elevation-floor.elevation)<1e-8))throw new Error(floor.name+': 다른 층과 겹치거나 건물 높이를 초과했습니다.');
    }
    // Unregistered/replaced slots are detached, never silently deleted with their equipment.
    for(const floor of old)if(!registered.some(f=>f.id===floor.id)){
      const frame=worldFrame(state,floor.id);Object.assign(floor,frame);delete floor.buildingId;delete floor.level;
    }
    const replacing=new Set(registered.map(f=>f.id));next.floors=next.floors.filter(f=>!replacing.has(f.id)).concat(registered);
    if(replacing.size!==registered.length)throw new Error('같은 층을 여러 슬롯에 사용할 수 없습니다.');
    return next;
  }
  function floorDraftItem(state,buildingId,slot){
    const b=get(state,buildingId),source=state.floors.find(f=>f.id===slot.floorId)||state.floors.find(f=>f.buildingId===buildingId&&(slot.targetId?f.id===slot.targetId:f.level===slot.level));
    const item={width:b.width,depth:b.depth,height:.2,...source};
    if(slot.floorId===null)Object.assign(item,{width:b.width,depth:b.depth,height:.2});
    if(slot.model)Object.assign(item,slot.model);
    if(slot.size)Object.assign(item,slot.size);
    return {...item,...(source?.buildingId===buildingId?{}:{x:0,z:0,rotation:0}),...(slot.position||{})};
  }
  function moveFloorSlots(state,buildingId,entries,axis,delta){
    if(!['x','z'].includes(axis)||!Number.isFinite(delta))throw new Error('층 위치를 숫자로 입력하세요.');
    const building=get(state,buildingId),half=building[axis==='x'?'width':'depth']/2;
    let min=-Infinity,max=Infinity;
    for(const slot of entries){
      const item=floorDraftItem(state,buildingId,slot),a=item.rotation*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
      const extent=(axis==='x'?c*item.width+s*item.depth:s*item.width+c*item.depth)/2;
      min=Math.max(min,-half+extent-item[axis]);max=Math.min(max,half-extent-item[axis]);
    }
    if(min>max+1e-8)throw new Error('층 크기를 줄인 뒤 이동하세요.');
    const applied=Math.max(min,Math.min(max,delta));
    return {delta:applied,slots:entries.map(slot=>{const item=floorDraftItem(state,buildingId,slot);return {...copy(slot),position:{x:item.x,z:item.z,[axis]:item[axis]+applied}};})};
  }
  function floorSizeLimits(state,buildingId,entries,slot){
    const b=get(state,buildingId),item=floorDraftItem(state,buildingId,slot);
    let height;
    if(slot.level==='R'){
      const previous=entries.filter(s=>s!==slot&&s.elevation<b.height).sort((a,b)=>b.elevation-a.elevation)[0];
      height=b.height-(previous?previous.elevation+floorDraftItem(state,buildingId,previous).height:0);
    }else{
      const tops=entries.filter(s=>s!==slot&&s.elevation>slot.elevation).map(s=>s.level==='R'?b.height-floorDraftItem(state,buildingId,s).height:s.elevation);
      height=Math.min(b.height,...tops)-slot.elevation;
    }
    return {width:b.width-2*Math.abs(item.x),depth:b.depth-2*Math.abs(item.z),height:Math.min(b.height,height),rotation:item.rotation};
  }
  function fitFloorSize(size,limits,axis=null,value=null,locked=false){
    const keys=['width','depth','height'],next=Object.fromEntries(keys.map(k=>[k,number(size[k],.01,100000,'층 크기')]));
    const a=limits.rotation*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
    if(axis){
      number(value,.01,100000,'층 크기');
      if(locked){
        const lower=Math.max(...keys.map(k=>.01/next[k]));
        const upper=Math.min(limits.width/(c*next.width+s*next.depth),limits.depth/(s*next.width+c*next.depth),limits.height/next.height);
        if(upper<lower-1e-10)throw new Error('층을 배치할 공간이 부족합니다. 층 수나 건물 크기를 조정하세요.');
        const ratio=Math.max(lower,Math.min(value/next[axis],upper));for(const k of keys)next[k]*=ratio;
      }else{
        let max=limits.height;
        if(axis==='width')max=Math.min(c>1e-10?(limits.width-s*next.depth)/c:Infinity,s>1e-10?(limits.depth-c*next.depth)/s:Infinity);
        if(axis==='depth')max=Math.min(s>1e-10?(limits.width-c*next.width)/s:Infinity,c>1e-10?(limits.depth-s*next.width)/c:Infinity);
        if(max<.01-1e-10)throw new Error('층을 배치할 공간이 부족합니다.');
        next[axis]=Math.min(value,max);
      }
    }else{
      const ratio=Math.min(1,limits.width/(c*next.width+s*next.depth),limits.depth/(s*next.width+c*next.depth));
      next.width*=ratio;next.depth*=ratio;next.height=Math.min(next.height,limits.height);
    }
    for(const k of keys){if(next[k]<.01-1e-10||!Number.isFinite(next[k]))throw new Error('층을 배치할 공간이 부족합니다. 층 수나 건물 크기를 조정하세요.');next[k]=Math.max(.01,next[k]);}
    return next;
  }
  function fitFloorSlots(state,buildingId,entries){
    const result=copy(entries),b=get(state,buildingId);
    // Fit the roof first, reserving the minimum thickness for the storey below.
    const roof=result.find(s=>s.level==='R');
    if(roof){
      const previous=result.filter(s=>s!==roof&&s.elevation<b.height).sort((a,b)=>b.elevation-a.elevation)[0];
      const limits={...floorSizeLimits(state,buildingId,result,roof),height:Math.min(b.height,b.height-(previous?previous.elevation+.01:0))};
      roof.size=fitFloorSize(floorDraftItem(state,buildingId,roof),limits);
    }
    for(const slot of result)if(slot!==roof)slot.size=fitFloorSize(floorDraftItem(state,buildingId,slot),floorSizeLimits(state,buildingId,result,slot));
    return result;
  }
  function detachFloor(state,id){const next=copy(state),floor=next.floors.find(f=>f.id===id);if(!floor)return next;Object.assign(floor,worldFrame(state,id));delete floor.buildingId;delete floor.level;return next;}
  function remove(state,id){
    let next=copy(state);
    if(kind(state,id)==='building'){
      for(const f of state.floors.filter(f=>f.buildingId===id))next=detachFloor(next,f.id);
      next.buildings=next.buildings.filter(b=>b.id!==id);
    }else{
      next=moveEquipment(next,next.equipment.filter(e=>e.floorId===id).map(e=>e.id),null);
      next.floors=next.floors.filter(f=>f.id!==id);
    }
    return next;
  }
  function treeState(state){
    const equipment=state.equipment.map(e=>{const parent=state.equipment.find(p=>p.id===e.parentId);return {...e,parentId:parent&&(parent.floorId||null)===(e.floorId||null)?parent.id:e.floorId||'@site'};});
    return {...state,equipment:[{id:'@site',name:'대지',code:'',type:'space-floor'},...(state.buildings||[]).map(b=>({...b,parentId:'@site',code:''})),...(state.floors||[]).slice().sort((a,b)=>b.elevation-a.elevation).map(f=>({...f,type:f.type||'space-floor',parentId:f.buildingId||'@site',code:''})),...equipment]};
  }
  function view(state,context={}){
    const floor=state.floors?.find(f=>f.id===context.floorId),building=state.buildings?.find(b=>b.id===context.buildingId);
    let equipment=[],site=state.site,focusBounds=null,connectionFrames=null,connectionSurfaceY=0;
    const surface=f=>f.type&&f.type!=='space-floor'?0:f.height*.08;
    if(floor){
      connectionSurfaceY=surface(floor);
      equipment=state.equipment.filter(e=>e.floorId===floor.id).map(e=>({...e,y:connectionSurfaceY}));
      equipment=[{...floor,type:floor.type||'space-floor',x:0,z:0,rotation:0,y:0,backdrop:true},...equipment];
      site={width:floor.width,depth:floor.depth};
    }else if(building&&context.preview){
      equipment=state.floors.filter(f=>f.buildingId===building.id).map(f=>({...f,type:f.type||'space-floor',y:f.elevation,floorSelector:true,noGizmo:true}));
      site={width:Math.max(building.width,...equipment.map(f=>Math.abs(f.x)*2+f.width)),depth:Math.max(building.depth,...equipment.map(f=>Math.abs(f.z)*2+f.depth))};
      equipment.unshift({...building,x:0,z:0,rotation:0,y:0,backdrop:true,buildingShell:true,noGizmo:true});
    }else {
      equipment=[...state.equipment.filter(e=>!e.floorId),...(state.buildings||[]),...(state.floors||[]).filter(f=>!f.buildingId).map(f=>({...f,type:f.type||'space-floor',y:f.elevation}))];
      if(building){
        equipment=equipment.map(e=>e.id===building.id?{...e,backdrop:true,buildingShell:true,noGizmo:true}:e);
        const floors=state.floors.filter(f=>f.buildingId===building.id).map(f=>({...f,...worldFrame(state,f.id),type:f.type||'space-floor',y:f.elevation,floorSelector:true,noGizmo:true}));
        equipment.push(...floors);
        connectionFrames={};
        for(const f of floors){
          const frame={...worldFrame(state,f.id),elevation:f.y+surface(f)};connectionFrames[f.id]=frame;
          equipment.push(...state.equipment.filter(e=>e.floorId===f.id).map(e=>({...e,...transform(e,frame),rotation:(e.rotation+frame.rotation)%360,y:frame.elevation,noGizmo:true})));
        }
        const bounds=[building,...floors].map(e=>{const a=e.rotation*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));return {x:e.x,z:e.z,hw:(c*e.width+s*e.depth)/2,hd:(s*e.width+c*e.depth)/2};});
        const left=Math.min(...bounds.map(e=>e.x-e.hw)),right=Math.max(...bounds.map(e=>e.x+e.hw)),near=Math.min(...bounds.map(e=>e.z-e.hd)),far=Math.max(...bounds.map(e=>e.z+e.hd));
        focusBounds={x:(left+right)/2,z:(near+far)/2,width:right-left,depth:far-near,low:Math.min(0,...floors.map(f=>f.y)),high:Math.max(building.height,...floors.map(f=>f.y+f.height))};
      }
    }
    const visible=new Set(equipment.filter(e=>!e.backdrop).map(e=>e.id));
    // Preserve the full document for connection editing; only rendering is scoped.
    return {...state,site,focusBounds,equipment,connectionSource:state,connectionFrames,connectionSurfaceY,visibleEquipment:visible,scopeFloorId:floor?.id||null,hideConnections:!!context.preview};
  }
  function warnings(state){
    const result=[];
    const outside=(item,box)=>{const a=item.rotation*Math.PI/180,x=(Math.abs(Math.cos(a))*item.width+Math.abs(Math.sin(a))*item.depth)/2,z=(Math.abs(Math.sin(a))*item.width+Math.abs(Math.cos(a))*item.depth)/2;return Math.abs(item.x)+x>box.width/2+.002||Math.abs(item.z)+z>box.depth/2+.002;};
    for(const b of state.buildings||[])if(outside(b,state.site))result.push(b.name+': 대지 영역 밖');
    for(const f of state.floors||[]){const b=state.buildings.find(b=>b.id===f.buildingId);if(outside(f,b||state.site))result.push(f.name+': '+(b?'건물':'대지')+' 영역 밖');}
    for(const e of state.equipment){const f=state.floors?.find(f=>f.id===e.floorId);if(f&&outside(e,f))result.push(e.name+': 층 영역 밖');}
    return result;
  }
  const api={all,get,kind,validate,upgrade,create,transform,worldFrame,moveEquipment,slots,registerFloors,floorDraftItem,floorSizeLimits,fitFloorSize,fitFloorSlots,moveFloorSlots,detachFloor,remove,treeState,view,warnings};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FEMSSpatial=api;
})(typeof globalThis!=='undefined'?globalThis:this);
