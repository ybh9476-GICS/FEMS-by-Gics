(function(root,factory){
  if(typeof module!=='undefined'&&module.exports)module.exports=factory;
  else factory(root.FEMSConnections);
})(typeof globalThis!=='undefined'?globalThis:this,function(L){
  'use strict';
  const base={...L},copy=v=>JSON.parse(JSON.stringify(v));
  const idFor=(from,to,floorId)=>'portal:'+JSON.stringify([from,to,floorId]);
  const isPortal=id=>typeof id==='string'&&id.startsWith('portal:');
  function defaults(state,floorId){
    if(!state.floors?.some(f=>f.id===floorId))return [];
      const source=state,items=new Map(source.equipment.map(e=>[e.id,e])),edges=L.routes(source),used=[],routes=[];
      const floor=state.floors.find(f=>f.id===floorId),half={x:floor.width/2,z:floor.depth/2},clamp=(v,h)=>Math.max(-h,Math.min(h,v));
      const spacing=Math.min(2,Math.min(floor.width,floor.depth)/(L.powerLinks(source).length+1));
      for(const link of L.powerLinks(source).slice().sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))){
        const parent=items.get(link.from),child=items.get(link.to);
        if(!parent||!child||(parent.floorId||null)===(child.floorId||null))continue;
        const local=[parent,child].find(e=>e.floorId===floorId);if(!local)continue;
        const other=local===parent?child:parent,edge=edges.find(l=>l.parentId===parent.id&&(l.childIds||[l.id]).includes(child.id)),style=L.external.route(state,L.external.idFor(parent.id,child.id))||edge||L.style(child),candidates=[];
        for(const axis of ['x','z'])for(const sign of [-1,1]){
          const across=axis==='x'?'z':'x',base=clamp(local[across],half[across]),side=axis+sign;
          for(let n=0;n<=used.length;n++)for(const direction of n?[-1,1]:[1]){
            const lane=clamp(base+n*spacing*direction,half[across]);
            if(used.some(p=>p.side===side&&Math.abs(p.lane-lane)<spacing*.95))continue;
            const end={[axis]:sign*(half[axis]+3),[across]:lane};
            candidates.push({axis,side,lane,end,cost:Math.abs(end[axis]-local[axis])+Math.abs(lane-local[across])+used.filter(p=>p.side===side).length*Math.max(floor.width,floor.depth)*2});
          }
        }
        candidates.sort((a,b)=>a.cost-b.cost);const chosen=candidates[0];if(!chosen)continue;used.push(chosen);
        const {axis,end}=chosen,start={x:local.x,z:local.z},lead={...start,[axis]:end[axis]};
        const points=[start,lead,end].filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.z-a[i-1].z)>1e-6);
        if(local!==parent)points.reverse();
        const otherFloor=source.floors?.find(f=>f.id===other.floorId),building=source.buildings?.find(b=>b.id===otherFloor?.buildingId);
        const path=[building?.name,otherFloor?.name||'대지',other.name].filter(Boolean).join(' › ');
        routes.push({id:idFor(parent.id,child.id,floorId),parentId:parent.id,childIds:[child.id],rootId:idFor(parent.id,child.id,floorId),points,segmentColors:points.slice(1).map(()=>style.color),diameter:style.diameter,color:style.color,elevation:0,externalFloor:true,floorId,label:parent.name+' → '+child.name,portal:{targetId:other.id,name:other.name,path,point:end}});
      }
      return routes;
  }
  function box(line,floor){
    const a=line.points[0],b=line.points.at(-1);
    return {site:{width:floor.width+6,depth:floor.depth+6},equipment:[{id:'from',x:a.x,z:a.z},{id:'to',parentId:'from',x:b.x,z:b.z,connection:{diameter:line.diameter,color:line.color,bends:line.points.slice(1,-1),segmentColors:line.segmentColors,end:{x:0,z:0}}}]};
  }
  function withSaved(state,line){
    const saved=state.floorRoutes?.find(r=>idFor(r.from,r.to,r.floorId)===line.id);if(!saved)return line;
    const raw=copy(saved.points),remoteFirst=line.portal.targetId===line.parentId;
    if(remoteFirst)raw[raw.length-1]=line.points.at(-1);else raw[0]=line.points[0];
    const adapted=base.route(box({...line,points:raw,segmentColors:saved.segmentColors},state.floors.find(f=>f.id===line.floorId)),'to');
    return {...line,points:adapted.points,segmentColors:adapted.segmentColors,manual:true};
  }
  function routes(state,floorId){return defaults(state,floorId).map(line=>{
    const result=withSaved(state,line),last=result.points.length-1,portalIndex=result.portal.targetId===result.parentId?0:last;
    return {...result,pointKinds:result.points.map((p,i)=>i===portalIndex?'portal':i===0||i===last?'equipment':'bend'),portal:{...result.portal,point:{...result.points[portalIndex]}}};
  });}
  function route(state,id){
    if(!isPortal(id))return null;let parts;try{parts=JSON.parse(id.slice(7));}catch{return null;}
    return routes(state,parts[2]).find(line=>line.id===id)||null;
  }
  function validate(raw,state){
    if(!Array.isArray(raw)||raw.length>10000)throw Error('층별 연결선 목록이 올바르지 않습니다.');
    const items=new Map(state.equipment.map(e=>[e.id,e])),links=new Set(L.powerLinks(state).map(l=>JSON.stringify([l.from,l.to]))),seen=new Set(),result=[];
    for(const r of raw){
      if(!r||['from','to','floorId'].some(k=>typeof r[k]!=='string'))throw Error('층별 연결선의 설비·층 정보가 올바르지 않습니다.');
      const id=idFor(r.from,r.to,r.floorId);if(seen.has(id))throw Error('층별 연결선이 중복되었습니다.');seen.add(id);
      if(!Array.isArray(r.points)||r.points.length<2||r.points.length>66)throw Error('층별 연결선 포인트는 2~66개까지 지원합니다.');
      const points=r.points.map(p=>{if(!p||['x','z'].some(k=>!Number.isFinite(p[k])||Math.abs(p[k])>100003))throw Error('층별 연결선 좌표가 올바르지 않습니다.');return {x:p.x,z:p.z};});
      for(let i=1;i<points.length;i++)if(Math.abs(points[i].x-points[i-1].x)>1e-6&&Math.abs(points[i].z-points[i-1].z)>1e-6)throw Error('층별 연결선은 직각으로 연결하세요.');
      if(!Array.isArray(r.segmentColors)||r.segmentColors.length!==points.length-1||r.segmentColors.some(c=>!L.palette.some(([,value])=>value===c)))throw Error('층별 연결선 색상이 올바르지 않습니다.');
      const a=items.get(r.from),b=items.get(r.to),floor=state.floors?.find(f=>f.id===r.floorId);
      if(floor&&a&&b&&(a.floorId||null)!==(b.floorId||null)&&(a.floorId===r.floorId||b.floorId===r.floorId)&&links.has(JSON.stringify([r.from,r.to])))result.push({from:r.from,to:r.to,floorId:r.floorId,points,segmentColors:[...r.segmentColors]});
    }
    return result;
  }
  function store(state,id,line){
    const original=route(state,id);if(!original)throw Error('층별 연결선을 찾을 수 없습니다.');
    const floor=state.floors.find(f=>f.id===original.floorId);
    if(line.points.some(p=>Math.abs(p.x)>floor.width/2+3+.00001||Math.abs(p.z)>floor.depth/2+3+.00001))throw Error('포인트는 층 경계 3m 이내에 놓으세요.');
    const next=copy(state);next.floorRoutes=(next.floorRoutes||[]).filter(r=>idFor(r.from,r.to,r.floorId)!==id);
    next.floorRoutes.push({from:original.parentId,to:original.childIds[0],floorId:original.floorId,points:copy(line.points),segmentColors:[...line.segmentColors]});
    next.floorRoutes=validate(next.floorRoutes,next);return next;
  }
  function apply(state,id,name,args,returnsResult=false){
    const line=route(state,id);if(!line)throw Error('층별 연결선을 선택하세요.');
    const sandbox=box(line,state.floors.find(f=>f.id===line.floorId)),result=base[name](sandbox,'to',...args),next=returnsResult?result.state:result;
    const updated=base.route(next,'to');
    if(JSON.stringify(line.points)===JSON.stringify(updated.points)&&JSON.stringify(line.segmentColors)===JSON.stringify(updated.segmentColors))return returnsResult?{...result,state:copy(state)}:copy(state);
    const stored=store(state,id,updated);return returnsResult?{...result,state:stored}:stored;
  }
  function finishMove(result,id,kind){
    if(!result)return result;
    const line=route(result.state,id),sandbox=box(line,result.state.floors.find(f=>f.id===line.floorId));
    const cleaned=base.finishMove({...result,state:sandbox},'to',kind);
    if(JSON.stringify(cleaned.state)===JSON.stringify(sandbox))return {...result,index:cleaned.index,kind:cleaned.kind};
    return {...cleaned,state:store(result.state,id,base.route(cleaned.state,'to'))};
  }
  function movePoint(state,id,index,position){
    const line=route(state,id);
    if(line?.pointKinds[index]!=='portal')return apply(state,id,'movePoint',[index,position],true);
    if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z))throw Error('포인트 좌표에 숫자를 입력하세요.');
    const points=copy(line.points),old=points[index],target={x:position.x,z:position.z};
    if(old.x===target.x&&old.z===target.z)return {state:copy(state),index};
    const neighbor=index===0?1:index-1;
    // Slide the neighbouring bend with the billboard, keeping equipment anchors fixed.
    if(neighbor>0&&neighbor<points.length-1){
      if(Math.abs(points[neighbor].z-old.z)<1e-6)points[neighbor].z=target.z;
      else points[neighbor].x=target.x;
    }
    points[index]=target;
    const updated=base.route(box({...line,points},state.floors.find(f=>f.id===line.floorId)),'to');
    return {state:store(state,id,updated),index:index===0?0:updated.points.length-1,generated:[]};
  }
  function reset(state,id){
    const line=route(state,id);if(!line)throw Error('층별 연결선을 선택하세요.');
    const next=copy(state);next.floorRoutes=(next.floorRoutes||[]).filter(r=>idFor(r.from,r.to,r.floorId)!==id);return next;
  }
  function setStyle(state,id,changes){
    const line=route(state,id);if(!line)throw Error('층별 연결선을 선택하세요.');
    return base.setStyle(state,L.external.idFor(line.parentId,line.childIds[0]),changes);
  }
  function backupBeforeEdit(previous,next,storage,key){
    if(!next.floorRoutes?.length||previous.floorRoutes?.length)return;
    const backupKey=key+'-before-floor-routes-'+(previous.project?.id||'drawing');
    if(!storage.getItem(backupKey))storage.setItem(backupKey,JSON.stringify(previous));
  }
  const api={idFor,isPortal,routes,route,validate,store,reset,setStyle,finishMove,movePoint,backupBeforeEdit};
  for(const name of ['moveSegment','addPoint'])api[name]=(state,id,...args)=>apply(state,id,name,args,true);
  for(const name of ['setSegmentColor','deletePoint','optimize'])api[name]=(state,id,...args)=>apply(state,id,name,args);
  L.floor=api;
  for(const name of ['route','setStyle','setSegmentColor','movePoint','moveSegment','addPoint','deletePoint','optimize','reset'])L[name]=(state,id,...args)=>isPortal(id)?api[name](state,id,...args):base[name](state,id,...args);
  L.finishMove=(result,id,...args)=>isPortal(id)?finishMove(result,id,...args):base.finishMove(result,id,...args);
  L.followEquipment=(previous,state)=>{
    let next=base.followEquipment(previous,state);
    for(const saved of previous.floorRoutes||[]){
      const id=idFor(saved.from,saved.to,saved.floorId),old=route(previous,id),current=route(next,id);if(!old||!current)continue;
      const first=old.pointKinds[0]==='equipment',index=first?0:old.points.length-1,target=first?current.points[0]:current.points.at(-1);
      if(Math.hypot(target.x-old.points[index].x,target.z-old.points[index].z)<1e-6)continue;
      const moved=L.followPath(old.points,old.segmentColors,first?target:old.points[0],first?old.points.at(-1):target),rebuilt=L.coloredPath(moved.points,moved.segmentColors),cleaned=L.compactPath(rebuilt.points,rebuilt.segmentColors);
      next=store(next,id,cleaned);
    }
    return next;
  };
  L.editScope=(state,id)=>isPortal(id)?{rootId:id,name:route(state,id)?.label||'',ids:[id]}:base.editScope(state,id);
  L.resetScope=(state,id)=>isPortal(id)?reset(state,id):base.resetScope(state,id);
  L.snapCandidates=(state,id)=>{
    if(!isPortal(id))return base.snapCandidates(state,id);
    const floorId=route(state,id)?.floorId,items=new Map(state.equipment.map(e=>[e.id,e]));
    const internal=base.routes(state).filter(r=>items.get(r.parentId)?.floorId===floorId&&(r.childIds||[r.id]).some(child=>items.get(child)?.floorId===floorId));
    return [...routes(state,floorId),...internal].flatMap(r=>r.points);
  };
  return api;
});
