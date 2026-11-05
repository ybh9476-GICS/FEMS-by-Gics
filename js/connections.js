(function(root){
  'use strict';
  const palette=[['파랑','#2563eb'],['하늘','#0ea5e9'],['청록','#0d9488'],['초록','#16a34a'],['연두','#84cc16'],['노랑','#eab308'],['주황','#f97316'],['빨강','#dc2626'],['보라','#9333ea'],['분홍','#db2777']];
  const copy=value=>JSON.parse(JSON.stringify(value));
  const same=(a,b)=>Math.abs(a.x-b.x)<1e-6&&Math.abs(a.z-b.z)<1e-6;
  function point(value,site,label){
    if(!value||!Number.isFinite(value.x)||!Number.isFinite(value.z)||Math.abs(value.x)>site.width||Math.abs(value.z)>site.depth)throw new Error(`${label}: 올바른 좌표가 필요합니다.`);
    return {x:value.x,z:value.z};
  }
  function clean(item,site){
    const result={};
    if(item.junction)result.junction=point(item.junction,site,'공통 분기점');
    if(item.connection!=null){
      const c=item.connection;
      if(!item.parentId)throw new Error('상위 설비가 없는 연결선입니다.');
      if(!Number.isFinite(c.diameter)||c.diameter<.02||c.diameter>2)throw new Error('연결선 지름은 0.02~2 m로 입력하세요.');
      if(!palette.some(([,color])=>color===c.color))throw new Error('연결선 팔레트의 색상을 선택하세요.');
      result.connection={diameter:c.diameter,color:c.color};
      if(c.bends!=null){
        if(!Array.isArray(c.bends)||c.bends.length>64)throw new Error('연결선 중간 포인트는 최대 64개입니다.');
        result.connection.bends=c.bends.map(p=>point(p,site,'연결선 포인트'));
      }
      if(c.end)result.connection.end=point(c.end,site,'연결선 끝점');
      if(c.segmentColors!=null){
        if(!Array.isArray(c.segmentColors)||!c.bends||c.segmentColors.length!==c.bends.length+1||c.segmentColors.some(color=>!palette.some(([,value])=>value===color)))throw new Error('선분별 색상과 포인트 수가 올바르지 않습니다.');
        result.connection.segmentColors=[...c.segmentColors];
      }
    }
    return result;
  }
  function style(item){return {diameter:.2,color:palette[0][1],...item.connection};}
  // An L path is shortest under the horizontal/vertical constraint. Keep explicit collinear handles.
  function orthogonal(points,avoid=null,keepDuplicates=false){
    const result=[];
    for(const p of points){
      const previous=result.at(-1);
      if(previous&&same(previous,p)){if(keepDuplicates)result.push({...p});continue;}
      if(previous&&Math.abs(previous.x-p.x)>1e-6&&Math.abs(previous.z-p.z)>1e-6){
        let elbow={x:p.x,z:previous.z};
        if(avoid&&same(elbow,avoid))elbow={x:previous.x,z:p.z};
        result.push(elbow);
      }
      result.push({...p});
    }
    return result;
  }
  function route(state,childId){
    const child=state.equipment.find(e=>e.id===childId),parent=state.equipment.find(e=>e.id===child?.parentId);
    if(!parent)return null;
    const c=style(child),j=parent.junction||{x:0,z:0},end=c.end||{x:0,z:0};
    const raw=[{x:parent.x+j.x,z:parent.z+j.z},...(c.bends||[]),{x:child.x+end.x,z:child.z+end.z}];
    const {points,segmentColors}=coloredPath(raw,c.segmentColors||raw.slice(1).map(()=>c.color),null,!!c.bends);
    return {id:child.id,parentId:parent.id,points,segmentColors,diameter:c.diameter,color:c.color,manual:!!c.bends};
  }
  // When a leg gains an automatic elbow, both resulting segments inherit its color.
  function coloredPath(raw,colors,avoid=null,keepDuplicates=true){
    const points=[{...raw[0]}],segmentColors=[];
    for(let i=1;i<raw.length;i++){
      const leg=orthogonal([points.at(-1),raw[i]],avoid,keepDuplicates);
      for(const p of leg.slice(1)){points.push(p);segmentColors.push(colors[i-1]);}
    }
    return {points,segmentColors};
  }
  function routes(state){return state.equipment.filter(e=>e.parentId).map(e=>route(state,e.id));}
  function setStyle(state,id,changes){const next=copy(state),child=next.equipment.find(e=>e.id===id);if(!child?.parentId)throw new Error('연결선을 찾을 수 없습니다.');child.connection={...style(child),...changes};clean(child,next.site);return next;}
  function setSegmentColor(state,id,index,color){
    const line=route(state,id);
    if(!Number.isInteger(index)||!line?.points[index+1])throw new Error('색상을 변경할 선분을 선택하세요.');
    if(!palette.some(([,value])=>value===color))throw new Error('연결선 팔레트의 색상을 선택하세요.');
    if(line.segmentColors[index]===color)return copy(state);
    const colors=[...line.segmentColors];colors[index]=color;
    return storeRoute(state,id,line.points,colors);
  }
  function storeRoute(state,id,points,colors=null){
    if(points.length<2)throw new Error('연결선에는 시작점과 끝점이 필요합니다.');
    if(points.length>66)throw new Error('연결선 포인트가 너무 많습니다.');
    const next=copy(state),child=next.equipment.find(e=>e.id===id),parent=next.equipment.find(e=>e.id===child?.parentId);
    if(!parent)throw new Error('연결선을 찾을 수 없습니다.');
    for(const p of points)if(Math.abs(p.x)>next.site.width/2||Math.abs(p.z)>next.site.depth/2)throw new Error('연결선 포인트는 부지 안에 놓으세요.');
    const first=points[0],last=points.at(-1);
    parent.junction={x:first.x-parent.x,z:first.z-parent.z};
    child.connection={...style(child),bends:points.slice(1,-1).map(p=>({...p})),end:{x:last.x-child.x,z:last.z-child.z}};
    const assigned=colors||route(state,id).segmentColors;
    if(child.connection.segmentColors||assigned.some(color=>color!==child.connection.color)){
      if(assigned.length!==points.length-1)throw new Error('변경된 경로의 선분별 색상이 필요합니다.');
      child.connection.segmentColors=[...assigned];
    }
    return next;
  }
  function movePoint(state,id,index,position){
    if(!Number.isFinite(position.x)||!Number.isFinite(position.z))throw new Error('포인트 좌표에 숫자를 입력하세요.');
    const line=route(state,id);if(!line||!line.points[index])throw new Error('이동할 포인트를 선택하세요.');
    if(index===0||index===line.points.length-1)throw new Error('설비에 연결된 검은색 고정점은 이동할 수 없습니다.');
    const points=line.points,target={x:position.x,z:position.z};
    if(Math.abs(target.x)>state.site.width/2||Math.abs(target.z)>state.site.depth/2)throw new Error('연결선 포인트는 부지 안에 놓으세요.');
    // Only the two neighbouring vertices may move; the rest of the route is anchored.
    const left=Math.max(0,index-2),right=Math.min(points.length-1,index+2),local=points.slice(left,right+1),selected=index-left;
    const original=local.slice(1).map((p,i)=>Math.abs(p.z-local[i].z)<1e-6?'h':'v');
    const candidates=Array.from({length:2**original.length},(_,mask)=>original.map((_,i)=>mask&(1<<i)?'h':'v'));
    if(same(points[index],target))return {state:copy(state),index};
    let best=null,bestScore=Infinity;
    for(const directions of candidates){
      const path=copy(local);let valid=true;
      for(const axis of ['x','z']){
        const joined=axis==='x'?'v':'h';let start=0;
        while(start<local.length){
          let end=start;while(end<directions.length&&directions[end]===joined)end++;
          const anchored=start===0||end===local.length-1;
          if(start===0&&end===local.length-1&&Math.abs(local[0][axis]-local.at(-1)[axis])>1e-6){valid=false;break;}
          const value=anchored?local[start===0?0:local.length-1][axis]:selected>=start&&selected<=end?target[axis]:local.slice(start,end+1).reduce((sum,p)=>sum+p[axis],0)/(end-start+1);
          for(let i=start;i<=end;i++)path[i][axis]=value;
          start=end+1;
        }
      }
      // A white handle must reach the requested position, never silently clamp to an anchor.
      if(!valid||!same(path[selected],target))continue;
      // Stable direction preference prevents gratuitous flips between equivalent paths.
      const score=path.reduce((sum,p,i)=>sum+(p.x-local[i].x)**2+(p.z-local[i].z)**2,0)+directions.reduce((sum,d,i)=>sum+(d!==original[i]?1:0),0);
      if(score<bestScore){bestScore=score;best=path;}
    }
    if(best)return {state:storeRoute(state,id,[...points.slice(0,left),...best,...points.slice(right+1)]),index,generated:[]};
    const nodes=points.map((p,i)=>({p:i===index?target:p,original:i,color:line.segmentColors[Math.max(0,i-1)]}));
    return stitched(state,id,nodes,index);
  }
  // Preserve every existing/manual point. Track new elbows only for this edit (no file-format change).
  function stitched(state,id,nodes,selected){
    const points=[],generated=[],colors=[];let index=0;
    for(const node of nodes){
      const previous=points.at(-1),p=node.p;
      if(previous&&Math.abs(previous.x-p.x)>1e-6&&Math.abs(previous.z-p.z)>1e-6){
        generated.push(points.length);points.push({x:p.x,z:previous.z});colors.push(node.color);
      }
      if(node.original===selected)index=points.length;
      if(node.generated)generated.push(points.length);
      if(points.length)colors.push(node.color);points.push({...p});
    }
    return {state:storeRoute(state,id,points,colors),index,generated};
  }
  function moveSegment(state,id,index,position,{corner=false}={}){
    const line=route(state,id),a=line?.points[index],b=line?.points[index+1];
    if(!a||!b||same(a,b))throw new Error('이동할 선분을 선택하세요.');
    const horizontal=Math.abs(a.z-b.z)<1e-6,axis=horizontal?'z':'x';
    if(!Number.isFinite(position[axis]))throw new Error('선분 좌표에 숫자를 입력하세요.');
    const value=position[axis];
    if(Math.abs(value-a[axis])<1e-6)return {state:copy(state),index,generated:[]};
    const points=line.points,node=(p,i,extra={})=>({p,color:line.segmentColors[Math.max(0,i-1)],...extra}),nodes=points.slice(0,index).map((p,i)=>node(p,i));
    if(corner){
      const c={x:a.x+(b.x-a.x)/3,z:a.z+(b.z-a.z)/3},d={x:a.x+(b.x-a.x)*2/3,z:a.z+(b.z-a.z)*2/3};
      nodes.push(node(a,index),node(c,index+1,{generated:true}),node({...c,[axis]:value},index+1,{original:index,generated:true}),node({...d,[axis]:value},index+1,{generated:true}),node(d,index+1,{generated:true}),node(b,index+1));
    }else{
      if(index===0)nodes.push(node(a,index));
      nodes.push(node({...a,[axis]:value},index,{original:index,generated:index===0}),node({...b,[axis]:value},index+1,{generated:index+1===points.length-1}));
      if(index+1===points.length-1)nodes.push(node(b,index+1));
    }
    nodes.push(...points.slice(index+2).map((p,i)=>node(p,index+2+i)));
    return stitched(state,id,nodes,index);
  }
  function finishMove(result,id,kind='point'){
    if(!result?.generated?.length)return result;
    const line=route(result.state,id),points=copy(line.points),colors=[...line.segmentColors],generated=new Set(result.generated);let index=result.index;
    // Remove only auto-created redundant vertices; old straight handles remain available.
    for(let i=points.length-2;i>0;i--){
      if(!generated.has(i)||(kind==='point'&&i===index)||colors[i-1]!==colors[i])continue;
      const a=points[i-1],b=points[i],c=points[i+1];
      if(((Math.abs(a.x-b.x)<1e-6&&Math.abs(b.x-c.x)<1e-6)||(Math.abs(a.z-b.z)<1e-6&&Math.abs(b.z-c.z)<1e-6))&&((b.x-a.x)*(c.x-b.x)+(b.z-a.z)*(c.z-b.z)>=0)){
        points.splice(i,1);colors.splice(i,1);if(i<=index)index=Math.max(0,index-1);
      }
    }
    return {state:storeRoute(result.state,id,points,colors),index:Math.min(index,points.length-(kind==='point'?1:2)),generated:[]};
  }
  function snapPosition(points,excluded,position,tolerance,held={},axes=['x','z']){
    const target={...position},guides={};
    if(!(tolerance>0))return {position:target,guides};
    for(const axis of axes){
      let nearest=held[axis];
      if(nearest==null||Math.abs(position[axis]-nearest)>tolerance*1.5){
        nearest=null;let distance=tolerance;
        points.forEach((p,i)=>{if(excluded.includes(i))return;const d=Math.abs(p[axis]-position[axis]);if(d<distance){nearest=p[axis];distance=d;}});
      }
      if(nearest!=null){target[axis]=nearest;guides[axis]=nearest;}
    }
    return {position:target,guides};
  }
  function addPoint(state,id,index){
    const line=route(state,id),a=line?.points[index],b=line?.points[index+1];if(!a||!b)throw new Error('포인트를 추가할 선분을 선택하세요.');
    const points=copy(line.points);points.splice(index+1,0,{x:Math.round((a.x+b.x)*5000)/10000,z:Math.round((a.z+b.z)*5000)/10000});
    const colors=[...line.segmentColors];colors.splice(index,0,colors[index]);
    return {state:storeRoute(state,id,points,colors),index:index+1};
  }
  function deletePoint(state,id,index){
    const line=route(state,id);if(!line?.points[index])throw new Error('삭제할 포인트를 선택하세요.');
    if(index===0||index===line.points.length-1)throw new Error('설비에 연결된 검은색 고정점은 삭제할 수 없습니다.');
    const points=copy(line.points),removed=points.splice(index,1)[0];
    const colors=[...line.segmentColors];colors.splice(index,1);
    const rebuilt=coloredPath(points,colors,removed,false);
    return storeRoute(state,id,rebuilt.points,rebuilt.segmentColors);
  }
  function reset(state,id){
    const next=copy(state),child=next.equipment.find(e=>e.id===id);if(!child?.parentId)return next;
    const c=style(child),old=route(state,id);
    child.connection={diameter:c.diameter,color:c.color};const parent=next.equipment.find(e=>e.id===child.parentId);delete parent.junction;
    if(!c.segmentColors)return next;
    // Preserve color bands by proportional distance on the restored shortest route.
    const lengths=old.points.slice(1).map((p,i)=>Math.hypot(p.x-old.points[i].x,p.z-old.points[i].z));
    const total=lengths.reduce((a,b)=>a+b,0),bands=[];let cursor=0;
    lengths.forEach((length,i)=>{if(length>1e-6){cursor+=length;const color=old.segmentColors[i];if(bands.at(-1)?.color===color)bands.at(-1).end=cursor/total;else bands.push({end:cursor/total,color});}});
    const shortest=route(next,id),distances=shortest.points.slice(1).map((p,i)=>Math.hypot(p.x-shortest.points[i].x,p.z-shortest.points[i].z)),distance=distances.reduce((a,b)=>a+b,0);
    if(!bands.length||distance<1e-6)return next;
    const points=[shortest.points[0]],colors=[];cursor=0;
    for(let i=0;i<distances.length;i++){
      const length=distances[i];if(length<1e-6)continue;
      const a=shortest.points[i],b=shortest.points[i+1],start=cursor,end=cursor+length;
      const cuts=[...bands.slice(0,-1).map(band=>band.end*distance).filter(d=>d>start+1e-6&&d<end-1e-6),end];
      for(const cut of cuts){
        const middle=(cursor+cut)/2/distance,color=bands.find(band=>middle<=band.end)?.color||bands.at(-1).color;
        points.push({x:a.x+(b.x-a.x)*(cut-start)/length,z:a.z+(b.z-a.z)*(cut-start)/length});colors.push(color);cursor=cut;
      }
    }
    return storeRoute(next,id,points,colors);
  }
  function optimize(state,id){
    const line=route(state,id);if(!line)throw new Error('연결선을 선택하세요.');
    const points=copy(line.points),colors=[...line.segmentColors];let i=1;
    while(i<points.length-1){
      const a=points[i-1],b=points[i],c=points[i+1];
      const straight=(Math.max(a.x,b.x,c.x)-Math.min(a.x,b.x,c.x)<1e-6)||(Math.max(a.z,b.z,c.z)-Math.min(a.z,b.z,c.z)<1e-6);
      const forward=(b.x-a.x)*(c.x-b.x)+(b.z-a.z)*(c.z-b.z)>=0;
      // A zero-length leg has no visible color: discard that leg's color, not its neighbor's.
      // Explicit optimization merges color boundaries using the incoming (parent-side) color.
      // Keep corners, reversals, and both endpoints. Automatic drag cleanup stays color-safe.
      const removeColor=same(a,b)?i-1:same(b,c)?i:straight&&forward?i:-1;
      if(removeColor>=0){points.splice(i,1);colors.splice(removeColor,1);i=Math.max(1,i-1);}else i++;
    }
    return points.length===line.points.length?copy(state):storeRoute(state,id,points,colors);
  }
  const api={palette,clean,style,orthogonal,route,routes,setStyle,setSegmentColor,storeRoute,movePoint,moveSegment,finishMove,snapPosition,addPoint,deletePoint,optimize,reset};
  // v4 separates the management tree from directed electrical links.
  api.powerLinks=state=>state.version>=4?state.powerLinks:state.equipment.filter(e=>e.parentId).map(e=>({from:e.parentId,to:e.id}));
  api.validatePowerLinks=(links,equipment)=>{
    if(!Array.isArray(links)||links.length>10000)throw new Error('전력 연결 목록이 올바르지 않습니다.');
    const ids=new Set(equipment.map(e=>e.id)),seen=new Set(),out=new Map();
    const result=links.map(link=>{
      if(!link||!ids.has(link.from)||!ids.has(link.to)||link.from===link.to)throw new Error('전력 연결의 출발·도착 설비가 올바르지 않습니다.');
      const key=JSON.stringify([link.from,link.to]);if(seen.has(key))throw new Error('이미 연결된 설비입니다.');seen.add(key);
      if(!out.has(link.from))out.set(link.from,[]);out.get(link.from).push(link.to);return {from:link.from,to:link.to};
    });
    const visiting=new Set(),done=new Set();const visit=id=>{if(visiting.has(id))throw new Error('순환하는 전력 연결은 추가할 수 없습니다.');if(done.has(id))return;visiting.add(id);for(const next of out.get(id)||[])visit(next);visiting.delete(id);done.add(id);};
    for(const id of ids)visit(id);return result;
  };
  api.upgradePower=state=>{
    if(state.version>=4)return copy(state);
    const next=api.enableShared(state);next.powerLinks=api.powerLinks(next);next.version=4;next.buildings??=[];next.floors??=[];return next;
  };
  api.changePowerLink=(state,from,to,connect=true)=>{
    const next=api.upgradePower(state);
    next.powerLinks=next.powerLinks.filter(link=>link.from!==from||link.to!==to);
    if(connect)next.powerLinks.push({from,to});
    next.powerLinks=api.validatePowerLinks(next.powerLinks,next.equipment);
    return api.reconcileNetworks(next);
  };
  // Editing scope follows equipment ancestry, including networks of nested parents.
  api.rootEquipmentId=(state,id)=>{
    if(state.version>=4)return state.equipment.some(e=>e.id===id)?id:null;
    const items=new Map(state.equipment.map(e=>[e.id,e])),seen=new Set();
    while(items.get(id)?.parentId&&!seen.has(id)){seen.add(id);id=items.get(id).parentId;}
    return items.has(id)?id:null;
  };
  api.editScope=(state,id)=>{
    const lines=api.routes(state),line=lines.find(r=>r.id===id);
    if(!line)return null;
    const rootId=api.rootEquipmentId(state,line.parentId),floorId=state.equipment.find(e=>e.id===line.parentId)?.floorId||null;
    const inSpace=r=>state.version<3||[r.parentId,...r.childIds||[r.id]].every(id=>(state.equipment.find(e=>e.id===id)?.floorId||null)===floorId);
    return {rootId,name:state.equipment.find(e=>e.id===rootId)?.name||'',ids:lines.filter(r=>api.rootEquipmentId(state,r.parentId)===rootId&&inSpace(r)).map(r=>r.id)};
  };
  api.resetScope=(state,id)=>{
    if(state.version>=4)return api.optimalNetwork(state,id);
    const scope=api.editScope(state,id);if(!scope)throw new Error('연결선을 선택하세요.');
    return scope.ids.reduce((next,edgeId)=>api.reset(next,edgeId),state);
  };
  api.isLocked=(line,index)=>line.pointKinds?line.pointKinds[index]==='equipment':index===0||index===line.points.length-1;
  api.canDeletePoint=(line,index)=>index>0&&index<line.points.length-1;
  api.installShared=factory=>{
    const legacy={...api},shared=factory(legacy);
    for(const name of ['route','routes','setStyle','setSegmentColor','storeRoute','movePoint','moveSegment','finishMove','addPoint','deletePoint','optimize','reset'])api[name]=(state,...args)=>{
      const document=name==='finishMove'?state?.state:state;
      return document?.version>=2?shared[name](state,...args):legacy[name](state,...args);
    };
    Object.assign(api,{enableShared:shared.enableShared,reconcileNetworks:shared.reconcile,validateNetworks:shared.validate,snapCandidates:shared.snapCandidates,optimalNetwork:shared.optimal});
  };
  if(typeof module!=='undefined'&&module.exports){module.exports=api;api.installShared(require('./shared-connections.js'));require('./external-connections.js')(api);require('./floor-connections.js')(api);}else root.FEMSConnections=api;
})(typeof globalThis!=='undefined'?globalThis:this);
